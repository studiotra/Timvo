import type { Locale } from "./translations";
import { translations } from "./translations";

/** Get a translation by dot-notation key (e.g. "nav.dashboard") */
export function t(locale: Locale, key: string): string {
  const parts = key.split(".");
  let value: unknown = translations[locale];
  for (const part of parts) {
    if (value && typeof value === "object" && part in value) {
      value = (value as Record<string, unknown>)[part];
    } else {
      return key; // Fallback to key if not found
    }
  }
  return typeof value === "string" ? value : key;
}

export { translations } from "./translations";
export type { Locale } from "./translations";
