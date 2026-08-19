import type { Locale } from "./translations";
import { translations } from "./translations";

function lookup(dict: unknown, key: string): unknown {
  const parts = key.split(".");
  let value: unknown = dict;
  for (const part of parts) {
    if (value && typeof value === "object" && part in value) {
      value = (value as Record<string, unknown>)[part];
    } else {
      return undefined;
    }
  }
  return value;
}

/** Get a translation by dot-notation key (e.g. "nav.dashboard") */
export function t(locale: Locale, key: string): string {
  const value = lookup(translations[locale], key);
  if (typeof value === "string") return value;
  const fallback = lookup(translations.en, key);
  return typeof fallback === "string" ? fallback : key;
}

export { translations, LOCALE_OPTIONS, parseLocale } from "./translations";
export type { Locale } from "./translations";
