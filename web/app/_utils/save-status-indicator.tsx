import { CheckCircle2, Loader2, AlertCircle } from "lucide-react";

export type SaveStatus = "idle" | "saving" | "saved" | "error";

interface SaveStatusIndicatorProps {
  status: SaveStatus;
  savingLabel?: string;
  savedLabel?: string;
  errorLabel?: string;
  className?: string;
}

export function SaveStatusIndicator({
  status,
  savingLabel = "Salvando...",
  savedLabel = "Salvo",
  errorLabel = "Erro ao salvar",
  className = "",
}: SaveStatusIndicatorProps) {
  if (status === "idle") return null;

  if (status === "saving") {
    return (
      <div
        className={`inline-flex items-center gap-1.5 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 ${className}`}
      >
        <Loader2 size={12} className="animate-spin" />
        {savingLabel}
      </div>
    );
  }

  if (status === "saved") {
    return (
      <div
        className={`inline-flex animate-pulse items-center gap-1.5 text-[10px] font-semibold text-emerald-600 transition-all duration-200 dark:text-emerald-400 ${className}`}
      >
        <CheckCircle2 size={12} />
        {savedLabel}
      </div>
    );
  }

  return (
    <div
      className={`inline-flex items-center gap-1.5 text-[10px] font-semibold text-red-500 dark:text-red-400 ${className}`}
    >
      <AlertCircle size={12} />
      {errorLabel}
    </div>
  );
}
