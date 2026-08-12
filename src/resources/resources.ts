import type { Locale, Resources } from "./types";
import { en } from "./en";
import { es } from "./es";

const resources: Record<Locale, Resources> = { en, es };

let currentLocale: Locale = "en";

function getBrowserLocale(): Locale {
  if (typeof navigator === "undefined") return "en";
  const lang = navigator.language ?? "en";
  const primary = lang.split("-")[0].toLowerCase();
  return primary === "es" ? "es" : "en";
}

export function detectBrowserLocale(): Locale {
  return getBrowserLocale();
}

export function setLocale(locale: Locale): void {
  currentLocale = locale in resources ? locale : "en";
}

export function getLocale(): Locale {
  return currentLocale;
}

export function getResources(): Resources {
  return resources[currentLocale];
}

export function t(key: keyof Resources, params?: Record<string, string>): string {
  const value = resources[currentLocale][key];
  if (value === undefined) return key;
  if (!params) return value;
  return value.replace(/\{\{(\w+)\}\}/g, (_, name) => params[name] ?? "");
}

setLocale(getBrowserLocale());
