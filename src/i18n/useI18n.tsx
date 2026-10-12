import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { translate, type Locale, type TranslationKey } from "./translations";

const I18nContext = createContext<{
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: TranslationKey) => string;
} | null>(null);

export function getInitialLocale(savedLocale: string | null): Locale {
  return savedLocale === "fr" || savedLocale === "en" ? savedLocale : "en";
}

export function getLocaleToggleLabel(locale: Locale) {
  return locale === "fr" ? "EN" : "FR";
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(() => getInitialLocale(localStorage.getItem("locale")));
  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  const value = useMemo(() => ({
    locale,
    setLocale(next: Locale) {
      localStorage.setItem("locale", next);
      setLocaleState(next);
    },
    t(key: TranslationKey) {
      return translate(locale, key);
    }
  }), [locale]);
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const context = useContext(I18nContext);
  if (!context) throw new Error("useI18n must be used inside I18nProvider");
  return context;
}
