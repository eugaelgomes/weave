import { ptBR } from "./locales/pt-br";
import { enUS } from "./locales/en-us";
import { esES } from "./locales/es-es";

export const locales = {
  "pt-br": ptBR,
  "en-us": enUS,
  "es-es": esES,
};

export type LocaleKey = keyof typeof locales;
export type NavigationTranslations = typeof ptBR;

// Simple custom hook or utility for translations
export function getTranslations(locale: LocaleKey): NavigationTranslations {
  return locales[locale] || locales["pt-br"];
}
