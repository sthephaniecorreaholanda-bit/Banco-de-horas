import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useGetMissingDays,
  useCreateRecord,
  useBulkGenerateMonth,
  getListRecordsQueryKey,
  getGetSummaryQueryKey,
  getGetMonthlyEvolutionQueryKey,
  getGetMissingDaysQueryKey,
} from "@workspace/api-client-react";
import { RecordForm } from "@/components/RecordForm";
import { currentTime, todayISO } from "@/lib/time";
import {
  LogIn,
  LogOut,
  AlertTriangle,
  X,
  ClipboardEdit,
  CalendarCheck,
  Loader2,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function RegistrarPonto() {
  const { data: missingDays } = useGetMissingDays();
  const [dismissedAlert, setDismissedAlert] = useState(false);
  const [prefillEntry, setPrefillEntry] = useState<string | undefined>();
  const [prefillExit, setPrefillExit] = useState<string | undefined>();
  const qc = useQueryClient();
  const { toast } = useToast();
  const createRecord = useCreateRecord();
  const bulkGenerate = useBulkGenerateMonth();

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
    document.getElementById("record-form")?.scrollIntoView({ behavior: "smooth" });
    toast({
      title: "Horário de entrada capturado",
      description: `${now} pré-preenchido no formulário.`,
    });
  }

  function handleQuickExit() {
    const now = currentTime();
    setPrefillExit(now);
    createRecord.mutate(
      {
        data: {
          date: todayISO(),
          type: "WORK_DAY",
          entryTime: prefillEntry ?? "08:00",
          exitTime: now,
        },
      },
      {
        onSuccess: () => {
          toast({ title: "Saída registrada", description: `Saída às ${now} salva com sucesso.` });
          setPrefillEntry(undefined);
          setPrefillExit(undefined);
          invalidateAll();
        },
        onError: (err: unknown) => {
          const msg =
            (err as { response?: { data?: { error?: string } } })?.response?.data?.error ??
            "Erro ao registrar saída.";
          toast({ title: "Erro", description: msg, variant: "destructive" });
        },
      }
    );
  }

  function handleBulkGenerate() {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;

    bulkGenerate.mutate(
      { data: { year, month } },
      {
        onSuccess: (result) => {
          invalidateAll();
          toast({
            title: "Mês padrão gerado",
            description:
              result.created === 0
                ? "Todos os dias já estavam preenchidos."
                : `${result.created} dia${result.created !== 1 ? "s" : ""} criado${result.created !== 1 ? "s" : ""} com 08:00–16:10. ${result.skipped} pulado${result.skipped !== 1 ? "s" : ""} (dom./feriados/existentes).`,
          });
        },
        onError: () => {
          toast({
            title: "Erro ao gerar mês",
            variant: "destructive",
          });
        },
      }
    );
  }

  const hasMissing = !dismissedAlert && missingDays && missingDays.length > 0;
  const now = new Date();
  const monthNames = [
    "Janeiro","Fevereiro","Março","Abril","Maio","Junho",
    "Julho","Agosto","Setembro","Outubro","Novembro","Dezembro",
  ];
  const currentMonthName = monthNames[now.getMonth()];

  return (
    <div className="space-y-5">
      <h1 className="font-semibold text-lg flex items-center gap-2">
        <ClipboardEdit size={20} className="text-primary" />
        Registrar Ponto
      </h1>

      {/* Missing days alert */}
      {hasMissing && (
        <div className="flex items-start gap-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-2xl p-4 text-sm">
          <AlertTriangle
            size={16}
            className="text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0"
          />
          <div className="flex-1">
            <p className="font-medium text-amber-800 dark:text-amber-300">
              {missingDays!.length} dia{missingDays!.length > 1 ? "s" : ""} sem registro
            </p>
            <p className="text-amber-700 dark:text-amber-400 text-xs mt-0.5">
              {missingDays!
                .slice(0, 3)
                .map((d) => `${d.dayOfWeek} ${d.date}`)
                .join(", ")}
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

      {/* Quick buttons */}
      <div className="grid grid-cols-2 gap-3">
        <button
          data-testid="button-quick-entry"
          onClick={handleQuickEntry}
          className="flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white text-sm font-semibold shadow-sm transition"
        >
          <LogIn size={17} /> Registrar Entrada
        </button>
        <button
          data-testid="button-quick-exit"
          onClick={handleQuickExit}
          className="flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white text-sm font-semibold shadow-sm transition"
        >
          <LogOut size={17} /> Registrar Saída
        </button>
      </div>

      {prefillEntry && (
        <p className="text-xs text-muted-foreground text-center -mt-2">
          Entrada capturada:{" "}
          <span className="font-mono font-medium text-foreground">{prefillEntry}</span>
          {" — "}clique em <strong>Registrar Saída</strong> quando terminar ou preencha o formulário
          abaixo.
        </p>
      )}

      {/* Bulk generate */}
      <div className="bg-card border border-card-border rounded-2xl p-4 shadow-sm flex items-center gap-4">
        <div className="flex-1">
          <p className="text-sm font-semibold">Gerar Mês Padrão</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Preenche todos os dias úteis de{" "}
            <span className="font-medium text-foreground">{currentMonthName}</span> com 08:00 → 16:10
            (saldo zero). Pula domingos, feriados e dias já registrados.
          </p>
        </div>
        <button
          data-testid="button-bulk-generate"
          onClick={handleBulkGenerate}
          disabled={bulkGenerate.isPending}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 active:opacity-80 transition disabled:opacity-60 shadow-sm flex-shrink-0"
        >
          {bulkGenerate.isPending ? (
            <Loader2 size={15} className="animate-spin" />
          ) : (
            <CalendarCheck size={15} />
          )}
          Gerar
        </button>
      </div>

      {/* Full record form */}
      <div id="record-form">
        <RecordForm prefillEntry={prefillEntry} prefillExit={prefillExit} />
      </div>
    </div>
  );
}
