"use client";

import React, { createContext, useContext, useMemo, useCallback, useEffect, useState } from "react";
import { useAuth } from "./auth-context";
import { locales, type SupportedLocale, type TranslationKeys } from "@/app/_i18n";
import type { UserPreferences } from "@/types/user-preferences";

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
  const { user, updateUser } = useAuth();
  const prefs = (user?.usage_preference as UserPreferences) || {};

  const userLocale = prefs.language?.interface as SupportedLocale | undefined;

  // Use a stable initial state (SSR safe) to prevent hydration mismatches.
  // The server always returns 'pt-BR' when navigator is undefined.
  const [locale, setLocaleState] = useState<SupportedLocale>(userLocale || "pt-BR");

  useEffect(() => {
    if (userLocale) {
      if (userLocale !== locale) setLocaleState(userLocale);
    } else {
      // If no user preference, fallback to browser locale after hydration
      const browserLocale = detectBrowserLocale();
      if (locale !== browserLocale) setLocaleState(browserLocale);
    }
  }, [userLocale]);

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  const setLocale = useCallback(
    (newLocale: SupportedLocale) => {
      setLocaleState(newLocale);
      if (user) {
        const currentPrefs = (user.usage_preference as UserPreferences) || {};
        updateUser({
          usage_preference: {
            ...currentPrefs,
            language: { ...currentPrefs.language, interface: newLocale },
          },
        }).catch((err) => console.error("Erro ao salvar idioma:", err));
      }
    },
    [user, updateUser]
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
