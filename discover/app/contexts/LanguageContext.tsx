"use client";

import React, { createContext, useContext, useMemo, useCallback, useEffect, useState } from "react";
import { locales, type SupportedLocale, type TranslationKeys } from "../_i18n";

interface LanguageContextType {
  locale: SupportedLocale;
  setLocale: (locale: SupportedLocale) => void;
  t: TranslationKeys;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

function detectBrowserLocale(): SupportedLocale {
  if (typeof navigator === "undefined") return "pt-BR";
  const lang = navigator.language;
  if (lang.startsWith("en")) return "en-US";
  if (lang.startsWith("es")) return "es-ES";
  return "pt-BR";
}

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<SupportedLocale>(detectBrowserLocale());

  useEffect(() => {
    const savedLocale = localStorage.getItem("weave-blog-locale") as SupportedLocale;
    if (savedLocale && locales[savedLocale]) {
      setLocaleState(savedLocale);
    }
  }, []);

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  const setLocale = useCallback(
    (newLocale: SupportedLocale) => {
      setLocaleState(newLocale);
      localStorage.setItem("weave-blog-locale", newLocale);
    },
    []
  );

  const t = useMemo(() => locales[locale] || locales["pt-BR"], [locale]);

  return (
    <LanguageContext.Provider value={{ locale, setLocale, t }}>{children}</LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }
  return context;
}
