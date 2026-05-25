import { useState, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useCreateRecord,
  getListRecordsQueryKey,
  getGetSummaryQueryKey,
  getGetMonthlyEvolutionQueryKey,
  getGetMissingDaysQueryKey,
} from "@workspace/api-client-react";
import { todayISO, currentTime } from "@/lib/time";
import { cn } from "@/lib/utils";
import { Calendar, Clock, ChevronDown, Loader2, MessageSquare } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const TYPES = [
  { value: "WORK_DAY", label: "Dia Comum de Trabalho" },
  { value: "COMPENSATED_LEAVE", label: "Folga Compensada" },
  { value: "HOLIDAY", label: "Feriado / Folga" },
];

export function RecordForm({
  prefillEntry,
  prefillExit,
}: {
  prefillEntry?: string;
  prefillExit?: string;
}) {
  const [date, setDate] = useState(todayISO());
  const [type, setType] = useState("WORK_DAY");
  const [entryTime, setEntryTime] = useState(prefillEntry ?? "08:00");
  const [exitTime, setExitTime] = useState(prefillExit ?? "16:10");
  const [note, setNote] = useState("");
  const qc = useQueryClient();
  const { toast } = useToast();
  const createRecord = useCreateRecord();

  useEffect(() => {
    if (prefillEntry) setEntryTime(prefillEntry);
  }, [prefillEntry]);

  useEffect(() => {
    if (prefillExit) setExitTime(prefillExit);
  }, [prefillExit]);

  const isWork = type === "WORK_DAY";

  function invalidateAll() {
    qc.invalidateQueries({ queryKey: getListRecordsQueryKey() });
    qc.invalidateQueries({ queryKey: getGetSummaryQueryKey() });
    qc.invalidateQueries({ queryKey: getGetMonthlyEvolutionQueryKey() });
    qc.invalidateQueries({ queryKey: getGetMissingDaysQueryKey() });
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    createRecord.mutate(
      {
        data: {
          date,
          type: type as "WORK_DAY" | "COMPENSATED_LEAVE" | "HOLIDAY",
          entryTime: isWork ? entryTime : null,
          exitTime: isWork ? exitTime : null,
          note: note.trim() || null,
        },
      },
      {
        onSuccess: () => {
          toast({ title: "Registro salvo", description: "Dia registrado com sucesso." });
          setDate(todayISO());
          setType("WORK_DAY");
          setEntryTime("08:00");
          setExitTime("16:10");
          setNote("");
          invalidateAll();
        },
        onError: (err: unknown) => {
          const msg =
            (err as { response?: { data?: { error?: string } } })?.response?.data?.error ??
            "Erro ao salvar registro.";
          toast({ title: "Erro", description: msg, variant: "destructive" });
        },
      }
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-card border border-card-border rounded-2xl p-5 shadow-sm space-y-4"
    >
      <h2 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider">
        Registrar Dia
      </h2>

      <div className="grid grid-cols-2 gap-3">
        {/* Date */}
        <div className="col-span-2 sm:col-span-1 flex flex-col gap-1.5">
          <label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
            <Calendar size={13} /> Data
          </label>
          <input
            data-testid="input-date"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            required
            className="w-full px-3 py-2 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring transition"
          />
        </div>

        {/* Type */}
        <div className="col-span-2 sm:col-span-1 flex flex-col gap-1.5">
          <label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
            <ChevronDown size={13} /> Tipo de Dia
          </label>
          <select
            data-testid="select-type"
            value={type}
            onChange={(e) => setType(e.target.value)}
            className="w-full px-3 py-2 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring transition appearance-none"
          >
            {TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </div>

        {/* Entry / Exit */}
        <div className={cn("flex flex-col gap-1.5", !isWork && "opacity-40 pointer-events-none")}>
          <label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
            <Clock size={13} /> Entrada
          </label>
          <input
            data-testid="input-entry"
            type="time"
            value={entryTime}
            onChange={(e) => setEntryTime(e.target.value)}
            disabled={!isWork}
            className="w-full px-3 py-2 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring transition"
          />
        </div>

        <div className={cn("flex flex-col gap-1.5", !isWork && "opacity-40 pointer-events-none")}>
          <label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
            <Clock size={13} /> Saída
          </label>
          <input
            data-testid="input-exit"
            type="time"
            value={exitTime}
            onChange={(e) => setExitTime(e.target.value)}
            disabled={!isWork}
            className="w-full px-3 py-2 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring transition"
          />
        </div>
      </div>

      {/* Note */}
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
          <MessageSquare size={13} /> Observações{" "}
          <span className="font-normal opacity-60">(opcional)</span>
        </label>
        <textarea
          data-testid="textarea-note"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Ex: saí mais cedo para consulta médica"
          rows={2}
          className="w-full px-3 py-2 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring transition resize-none"
        />
      </div>

      <button
        data-testid="button-save-record"
        type="submit"
        disabled={createRecord.isPending}
        className="w-full py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium flex items-center justify-center gap-2 hover:opacity-90 active:opacity-80 transition disabled:opacity-60"
      >
        {createRecord.isPending ? <Loader2 size={16} className="animate-spin" /> : null}
        Salvar Registro
      </button>
    </form>
  );
}
