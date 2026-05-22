import { formatDate } from "@/app/_utils/format";
import type { UsageMetrics } from "@/app/_services/plans-service/plan-usage-service";

export const USAGE_METRIC_META: Array<{
  key: keyof UsageMetrics;
  label: string;
  unit?: string;
}> = [
  { key: "notes_total", label: "Notas criadas" },
  { key: "projects_total", label: "Projetos ativos" },
  { key: "team_members_total", label: "Membros da equipe" },
  { key: "exports_notes_monthly", label: "Exportações de notas" },
  { key: "backups_monthly", label: "Backups mensais" },
  { key: "weave_ai_messages_monthly", label: "Mensagens Weave AI" },
  { key: "storage_uploaded_mb_monthly", label: "Upload mensal", unit: "MB" },
];

export function formatMetricValue(value: number, unit?: string): string {
  if (unit === "MB") return `${value.toFixed(1)} MB`;
  return value.toLocaleString("pt-BR");
}

export function formatLimit(limit: number | null, unit?: string): string {
  if (limit === null) return "Ilimitado";
  if (unit === "MB") return `${limit.toFixed(1)} MB`;
  return limit.toLocaleString("pt-BR");
}

export function formatPercentage(value: number | null | undefined): string {
  if (value === null || value === undefined) return "—";
  return `${value.toFixed(1)}%`;
}

export function formatPeriodLabel(
  start: string | null | undefined,
  end: string | null | undefined
): string {
  if (!start && !end) return "Período não definido";
  return `${formatDate(start ?? "")} – ${formatDate(end ?? "")}`;
}
