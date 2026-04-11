import { appConfig } from "../config/env.js";
import type { Locale } from "../types/analysis.js";

export const defaultLocale: Locale = appConfig.i18n.defaultLocale;

export function resolveLocale(locale?: string): Locale {
  return locale === "de" ? "de" : defaultLocale;
}

export function text<T>(locale: Locale, translations: { en: T; de: T }): T {
  return locale === "de" ? translations.de : translations.en;
}
