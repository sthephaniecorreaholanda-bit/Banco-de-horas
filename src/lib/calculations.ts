import { isHoliday, isSunday, isWorkday } from "./holidays";
import type {
  MissingDay,
  MonthlyEvolution,
  Settings,
  Summary,
  TimeRecord,
  TimeRecordInput,
} from "./types";

const SHORT_MONTHS = [
  "Jan", "Fev", "Mar", "Abr", "Mai", "Jun",
  "Jul", "Ago", "Set", "Out", "Nov", "Dez",
];

const SHORT_DAYS = ["dom.", "seg.", "ter.", "qua.", "qui.", "sex.", "sáb."];

export function hhmmToMin(hhmm: string | null | undefined): number | null {
  if (!hhmm) return null;
  const [h, m] = hhmm.split(":").map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return null;
  return h * 60 + m;
}

export function computeWorkedMinutes(
  entryTime: string | null | undefined,
  exitTime: string | null | undefined,
  _lunchBreakMinutes: number,
): number {
  const e = hhmmToMin(entryTime);
  const x = hhmmToMin(exitTime);
  if (e === null || x === null) return 0;
  // Decisão de produto (replit.md): "08:00–16:10 = saldo zero" implica que o
  // almoço já está embutido no cálculo: worked = exit - entry, sem deduzir.
  // A jornada padrão (430 min) já representa o tempo líquido esperado.
  return Math.max(0, x - e);
}

export function computeBalanceForRecord(
  input: TimeRecordInput,
  settings: Settings,
): { workedMinutes: number; balanceMinutes: number } {
  if (input.type === "WORK_DAY") {
    const worked = computeWorkedMinutes(
      input.entryTime ?? null,
      input.exitTime ?? null,
      settings.lunchBreakMinutes,
    );
    return {
      workedMinutes: worked,
      balanceMinutes: worked - settings.dailyTargetMinutes,
    };
  }
  if (input.type === "COMPENSATED_LEAVE") {
    return {
      workedMinutes: 0,
      balanceMinutes: -settings.dailyTargetMinutes,
    };
  }
  // HOLIDAY: neutro
  return { workedMinutes: 0, balanceMinutes: 0 };
}

export function computeSummary(
  records: TimeRecord[],
  settings: Settings,
): Summary {
  let totalBalance = 0;
  let daysWorked = 0;
  let compensatedLeaves = 0;
  let holidays = 0;

  for (const r of records) {
    totalBalance += r.balanceMinutes;
    if (r.type === "WORK_DAY") daysWorked += 1;
    else if (r.type === "COMPENSATED_LEAVE") compensatedLeaves += 1;
    else if (r.type === "HOLIDAY") holidays += 1;
  }

  totalBalance += settings.manualAdjustmentMinutes;

  return {
    totalBalanceMinutes: totalBalance,
    daysWorked,
    compensatedLeaves,
    holidays,
    manualAdjustmentMinutes: settings.manualAdjustmentMinutes,
  };
}

export function filterByMonth(
  records: TimeRecord[],
  month?: number,
  year?: number,
): TimeRecord[] {
  if (!month && !year) return [...records].sort(byDateAsc);
  return records
    .filter((r) => {
      const [yStr, mStr] = r.date.split("-");
      const y = Number(yStr);
      const m = Number(mStr);
      if (year && y !== year) return false;
      if (month && m !== month) return false;
      return true;
    })
    .sort(byDateAsc);
}

function byDateAsc(a: TimeRecord, b: TimeRecord): number {
  return a.date.localeCompare(b.date);
}

export function computeMonthlyEvolution(
  records: TimeRecord[],
): MonthlyEvolution[] {
  const byMonth = new Map<string, { year: number; month: number; total: number }>();
  for (const r of records) {
    const [yStr, mStr] = r.date.split("-");
    const y = Number(yStr);
    const m = Number(mStr);
    const key = `${y}-${String(m).padStart(2, "0")}`;
    const acc = byMonth.get(key);
    if (acc) acc.total += r.balanceMinutes;
    else byMonth.set(key, { year: y, month: m, total: r.balanceMinutes });
  }

  const sorted = Array.from(byMonth.values()).sort((a, b) =>
    a.year !== b.year ? a.year - b.year : a.month - b.month,
  );

  let cumulative = 0;
  return sorted.map((entry) => {
    cumulative += entry.total;
    return {
      month: entry.month,
      year: entry.year,
      label: `${SHORT_MONTHS[entry.month - 1]}/${entry.year}`,
      cumulativeBalanceMinutes: cumulative,
      monthBalanceMinutes: entry.total,
    };
  });
}

export function computeMissingDays(records: TimeRecord[]): MissingDay[] {
  const recorded = new Set(records.map((r) => r.date));
  const today = new Date();
  const todayIso = today.toISOString().slice(0, 10);

  // Olhamos os últimos 14 dias corridos, exclui o dia de hoje (ainda em curso).
  const result: MissingDay[] = [];
  for (let i = 1; i <= 14; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const iso = d.toISOString().slice(0, 10);
    if (iso >= todayIso) continue;
    if (!isWorkday(iso)) continue;
    if (recorded.has(iso)) continue;
    result.push({ date: iso, dayOfWeek: SHORT_DAYS[d.getDay()] });
  }
  return result.sort((a, b) => a.date.localeCompare(b.date));
}

export function recordsToCsv(records: TimeRecord[]): string {
  const header = [
    "Data",
    "Tipo",
    "Entrada",
    "Saida",
    "Minutos Trabalhados",
    "Saldo Minutos",
    "Observacao",
  ].join(";");

  const sorted = [...records].sort(byDateAsc);
  const lines = sorted.map((r) =>
    [
      r.date,
      r.type,
      r.entryTime ?? "",
      r.exitTime ?? "",
      String(r.workedMinutes),
      String(r.balanceMinutes),
      (r.note ?? "").replace(/[\r\n;]+/g, " "),
    ].join(";"),
  );

  return [header, ...lines].join("\n");
}

export function defaultExportFilename(): string {
  const d = new Date();
  const iso = d.toISOString().slice(0, 10);
  return `banco-horas-${iso}.csv`;
}

export function bulkGenerateInputs(
  year: number,
  month: number,
  existingDates: Set<string>,
): { toCreate: TimeRecordInput[]; skipped: number } {
  const daysInMonth = new Date(year, month, 0).getDate();
  const toCreate: TimeRecordInput[] = [];
  let skipped = 0;

  for (let day = 1; day <= daysInMonth; day++) {
    const iso = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    if (existingDates.has(iso)) {
      skipped += 1;
      continue;
    }
    if (isSunday(iso) || isHoliday(iso)) {
      skipped += 1;
      continue;
    }
    toCreate.push({
      date: iso,
      type: "WORK_DAY",
      entryTime: "08:00",
      exitTime: "16:10",
      note: null,
    });
  }

  return { toCreate, skipped };
}
