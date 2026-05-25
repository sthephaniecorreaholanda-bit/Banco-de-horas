import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useGetSummary,
  useGetMissingDays,
  useCreateRecord,
  getListRecordsQueryKey,
  getGetSummaryQueryKey,
  getGetMonthlyEvolutionQueryKey,
  getGetMissingDaysQueryKey,
} from "@/lib/api-local";
import { RecordForm } from "@/components/RecordForm";
import { EvolutionChart } from "@/components/EvolutionChart";
import {
  formatMinutes,
  getBalanceColor,
  getBalanceBg,
  currentTime,
  todayISO,
} from "@/lib/time";
import {
  Briefcase,
  UmbrellaOff,
  CalendarX2,
  Clock,
  LogIn,
  LogOut,
  AlertTriangle,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

function SummaryCard({
  icon: Icon,
  label,
  value,
  colorClass,
  bgClass,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  colorClass?: string;
  bgClass?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-2xl border p-4 flex flex-col gap-3 shadow-sm transition-shadow hover:shadow-md",
        bgClass ?? "bg-card border-card-border"
      )}
    >
      <div className="flex items-center gap-2">
        <Icon size={16} className={colorClass ?? "text-muted-foreground"} />
        <span className="text-xs font-medium text-muted-foreground">{label}</span>
      </div>
      <p
        data-testid={`text-${label.toLowerCase().replace(/\s/g, "-")}`}
        className={cn("text-2xl font-bold tracking-tight", colorClass ?? "text-foreground")}
      >
        {value}
      </p>
    </div>
  );
}

export default function Dashboard() {
  const { data: summary, isLoading: summaryLoading } = useGetSummary();
  const { data: missingDays } = useGetMissingDays();
  const [dismissedAlert, setDismissedAlert] = useState(false);
  const [prefillEntry, setPrefillEntry] = useState<string | undefined>();
  const [prefillExit, setPrefillExit] = useState<string | undefined>();
  const qc = useQueryClient();
  const { toast } = useToast();
  const createRecord = useCreateRecord();

  function invalidateAll() {
    qc.invalidateQueries({ queryKey: getListRecordsQueryKey() });
    qc.invalidateQueries({ queryKey: getGetSummaryQueryKey() });
    qc.invalidateQueries({ queryKey: getGetMonthlyEvolutionQueryKey() });
    qc.invalidateQueries({ queryKey: getGetMissingDaysQueryKey() });
  }

  function handleQuickEntry() {
    const now = currentTime();
    setPrefillEntry(now);
    setPrefillExit(undefined);
    // scroll to form
    document.getElementById("record-form")?.scrollIntoView({ behavior: "smooth" });
    toast({ title: "Horário de entrada capturado", description: `${now} pré-preenchido no formulário.` });
  }

  function handleQuickExit() {
    const now = currentTime();
    setPrefillExit(now);
    // Quick-register exit: create record with today's date and computed exit
    createRecord.mutate(
      { data: { date: todayISO(), type: "WORK_DAY", entryTime: prefillEntry ?? "08:00", exitTime: now } },
      {
        onSuccess: () => {
          toast({ title: "Saída registrada", description: `Saída às ${now} salva com sucesso.` });
          setPrefillEntry(undefined);
          setPrefillExit(undefined);
          invalidateAll();
        },
        onError: (err: unknown) => {
          const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error ?? "Erro ao registrar saída.";
          toast({ title: "Erro", description: msg, variant: "destructive" });
        },
      }
    );
  }

  const balance = summary?.totalBalanceMinutes ?? 0;
  const balanceColor = getBalanceColor(balance);
  const balanceBg = getBalanceBg(balance);

  const hasMissing = !dismissedAlert && missingDays && missingDays.length > 0;

  return (
    <div className="space-y-5 pt-1">
      {/* Missing days alert */}
      {hasMissing && (
        <div className="flex items-start gap-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-2xl p-4 text-sm">
          <AlertTriangle size={16} className="text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
          <div className="flex-1">
            <p className="font-medium text-amber-800 dark:text-amber-300">
              {missingDays!.length} dia{missingDays!.length > 1 ? "s" : ""} sem registro
            </p>
            <p className="text-amber-700 dark:text-amber-400 text-xs mt-0.5">
              {missingDays!.slice(0, 3).map((d) => `${d.dayOfWeek} ${d.date}`).join(", ")}
              {missingDays!.length > 3 ? ` e mais ${missingDays!.length - 3}...` : ""}
            </p>
          </div>
          <button
            data-testid="button-dismiss-alert"
            onClick={() => setDismissedAlert(true)}
            className="text-amber-600 dark:text-amber-400 hover:opacity-70 transition"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* Quick entry/exit buttons */}
      <div className="grid grid-cols-2 gap-3">
        <button
          data-testid="button-quick-entry"
          onClick={handleQuickEntry}
          className="flex items-center justify-center gap-2 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white text-sm font-medium shadow-sm transition"
        >
          <LogIn size={16} /> Registrar Entrada
        </button>
        <button
          data-testid="button-quick-exit"
          onClick={handleQuickExit}
          className="flex items-center justify-center gap-2 py-3 rounded-2xl bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white text-sm font-medium shadow-sm transition"
        >
          <LogOut size={16} /> Registrar Saída
        </button>
      </div>

      {/* Summary cards */}
      {summaryLoading ? (
        <div className="grid grid-cols-2 gap-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-card border border-card-border rounded-2xl p-4 h-24 animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2">
            <SummaryCard
              icon={Clock}
              label="Saldo Total Acumulado"
              value={formatMinutes(balance)}
              colorClass={balanceColor}
              bgClass={`${balanceBg} col-span-2`}
            />
          </div>
          <SummaryCard
            icon={Briefcase}
            label="Dias Trabalhados"
            value={String(summary?.daysWorked ?? 0)}
          />
          <SummaryCard
            icon={UmbrellaOff}
            label="Folgas Compensadas"
            value={String(summary?.compensatedLeaves ?? 0)}
          />
          <SummaryCard
            icon={CalendarX2}
            label="Feriados / Folgas"
            value={String(summary?.holidays ?? 0)}
          />
          <SummaryCard
            icon={Clock}
            label="Ajuste Manual"
            value={formatMinutes(summary?.manualAdjustmentMinutes ?? 0)}
            colorClass={getBalanceColor(summary?.manualAdjustmentMinutes ?? 0)}
          />
        </div>
      )}

      {/* Evolution chart */}
      <EvolutionChart />

      {/* Record form */}
      <div id="record-form">
        <RecordForm prefillEntry={prefillEntry} prefillExit={prefillExit} />
      </div>
    </div>
  );
}
