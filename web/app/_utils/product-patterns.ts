import { useAuth } from "@/app/_contexts/auth-context";
import { useLanguage } from "@/app/_contexts/language-context";
import type { UserPreferences } from "@/types/user-preferences";

export type LocaleType = "pt-BR" | "en-US" | "es-ES";

/**
 * Formata a DATA de acordo com o local e preferência.
 */
export const dateFormat = (dateString: string | Date, locale: LocaleType = "pt-BR"): string => {
  const date = typeof dateString === "string" ? new Date(dateString) : dateString;

  if (isNaN(date.getTime())) return "--/--/----";

  return new Intl.DateTimeFormat(locale, {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
};

/**
 * Formata hora de acordo com o local e preferência de 12h ou 24h.
 */
export const timeFormat = (
  dateString: string | Date,
  timeFormat: "12h" | "24h" = "24h",
  locale: LocaleType = "pt-BR"
): string => {
  const date = typeof dateString === "string" ? new Date(dateString) : dateString;
  if (isNaN(date.getTime())) return "--:--";

  return date.toLocaleTimeString(locale, {
    hour: "2-digit",
    minute: "2-digit",
    hour12: timeFormat === "12h",
  });
};

export function useFormatters() {
  const { locale } = useLanguage();

  const { user } = useAuth();
  const prefs = (user?.usage_preference as UserPreferences) || {};
  const timePref = prefs.language?.timeFormat || "24h";

  return {
    dateFormat: (date: string | Date) => dateFormat(date, locale as LocaleType),
    timeFormat: (date: string | Date) => timeFormat(date, timePref, locale as LocaleType),
  };
}
