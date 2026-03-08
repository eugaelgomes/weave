import ptBR, { type TranslationKeys } from "./locales/pt-BR";
import enUS from "./locales/en-US";
import esES from "./locales/es-ES";

export type SupportedLocale = "pt-BR" | "en-US" | "es-ES";

export const locales: Record<SupportedLocale, TranslationKeys> = {
  "pt-BR": ptBR,
  "en-US": enUS,
  "es-ES": esES,
};

export const localeLabels: Record<SupportedLocale, string> = {
  "pt-BR": "Português (Brasil)",
  "en-US": "English (US)",
  "es-ES": "Español",
};

export { type TranslationKeys };
