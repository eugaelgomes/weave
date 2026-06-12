import type { TranslationKeys } from "@/app/_i18n/locales/pt-BR";

type ReasoningTypesMap = TranslationKeys["home"]["engine"]["reasoningTypes"];

/**
 * Human-readable label for a reasoning_type slug.
 * @param type - API reasoning_type value
 * @param types - Locale map from t.home.engine.reasoningTypes
 * @returns Display label
 */
export function getReasoningTypeLabel(type: string, types: ReasoningTypesMap): string {
  const key = type as keyof ReasoningTypesMap;
  if (key in types && types[key]) return types[key];
  return type.replace(/_/g, " ");
}

/**
 * Relative time phrase for feed context (e.g. "há 2 h").
 * @param dateString - ISO date
 * @param locale - BCP 47 locale
 * @returns Short relative label or null
 */
export function formatRelativeTime(dateString?: string | null, locale = "pt-BR"): string | null {
  if (!dateString) return null;
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return null;

  const diffMs = Date.now() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) {
    return locale.startsWith("en") ? "just now" : locale.startsWith("es") ? "ahora" : "agora";
  }
  if (diffMin < 60) {
    return locale.startsWith("en")
      ? `${diffMin}m ago`
      : locale.startsWith("es")
        ? `hace ${diffMin} min`
        : `há ${diffMin} min`;
  }
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) {
    return locale.startsWith("en")
      ? `${diffH}h ago`
      : locale.startsWith("es")
        ? `hace ${diffH} h`
        : `há ${diffH} h`;
  }
  const diffD = Math.floor(diffH / 24);
  if (diffD < 7) {
    return locale.startsWith("en")
      ? `${diffD}d ago`
      : locale.startsWith("es")
        ? `hace ${diffD} d`
        : `há ${diffD} d`;
  }
  return date.toLocaleDateString(locale, { day: "2-digit", month: "short" });
}

/**
 * Replace `{key}` placeholders in i18n templates.
 * @param template - String with `{name}` tokens
 * @param vars - Values to inject
 */
export function interpolate(template: string, vars: Record<string, string | number>): string {
  return Object.entries(vars).reduce(
    (acc, [key, value]) => acc.replace(new RegExp(`\\{${key}\\}`, "g"), String(value)),
    template
  );
}
