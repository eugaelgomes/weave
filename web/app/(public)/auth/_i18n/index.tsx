import { ptBR } from "./locales/pt-BR";
import { enUS } from "./locales/en-US";
import { esES } from "./locales/es-ES";

export const locales = {
  "pt-br": ptBR,
  "en-us": enUS,
  "es-es": esES,
};

export type LocaleKey = keyof typeof locales;
export type NavigationTranslations = typeof ptBR;

export function getTranslations(locale: LocaleKey): NavigationTranslations {
  return locales[locale] || locales["en-us"];
}
