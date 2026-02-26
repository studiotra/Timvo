"use client";

import {
  createContext,
  useContext,
  useMemo,
  type ReactNode,
} from "react";
import { t, type Locale } from "@/lib/i18n";

type LocaleContextValue = {
  locale: Locale;
  t: (key: string) => string;
};

const LocaleContext = createContext<LocaleContextValue | null>(null);

export function LocaleProvider({
  locale,
  children,
}: {
  locale: Locale;
  children: ReactNode;
}) {
  const value = useMemo(
    () => ({
      locale,
      t: (key: string) => t(locale, key),
    }),
    [locale]
  );
  return (
    <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>
  );
}

export function useLocale(): Locale {
  const ctx = useContext(LocaleContext);
  return ctx?.locale ?? "en";
}

export function useTranslations(): (key: string) => string {
  const ctx = useContext(LocaleContext);
  return ctx?.t ?? ((key: string) => key);
}
