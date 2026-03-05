import i18n from "i18next";
import { initReactI18next } from "react-i18next";

import en from "./locales/en.json";
import ru from "./locales/ru.json";
import uz from "./locales/uz.json";
import kaa from "./locales/kaa.json";

type Language = "ru" | "en" | "uz" | "kaa";

const STORAGE_KEY = "nodex_lang";

export const LANGUAGES: Array<{ code: Language; label: string }> = [
  { code: "ru", label: "RU" },
  { code: "uz", label: "UZ" },
  { code: "kaa", label: "QA" },
  { code: "en", label: "EN" },
];

function getTelegramLanguage(): string | null {
  if (typeof window === "undefined") return null;
  const tg = (window as unknown as { Telegram?: { WebApp?: { initDataUnsafe?: { user?: { language_code?: string } } } } }).Telegram;
  return tg?.WebApp?.initDataUnsafe?.user?.language_code ?? null;
}

function normalizeLanguage(code: string | null | undefined): Language | null {
  if (!code) return null;
  const normalized = code.toLowerCase();
  if (normalized.startsWith("ru")) return "ru";
  if (normalized.startsWith("uz")) return "uz";
  if (normalized.startsWith("kaa") || normalized.startsWith("kk")) return "kaa";
  if (normalized.startsWith("en")) return "en";
  return null;
}

export function detectLanguage(): Language {
  const stored = normalizeLanguage(localStorage.getItem(STORAGE_KEY));
  if (stored) return stored;
  const tg = normalizeLanguage(getTelegramLanguage());
  if (tg) return tg;
  const browser = normalizeLanguage(typeof navigator !== "undefined" ? navigator.language : "ru");
  return browser ?? "ru";
}

export function initI18n() {
  if (i18n.isInitialized) return i18n;
  const lng = detectLanguage();
  i18n
    .use(initReactI18next)
    .init({
      resources: { en: { translation: en }, ru: { translation: ru }, uz: { translation: uz }, kaa: { translation: kaa } },
      lng,
      fallbackLng: "ru",
      interpolation: { escapeValue: false },
      returnNull: false,
    });
  return i18n;
}

export function setLanguage(lang: Language) {
  i18n.changeLanguage(lang);
  localStorage.setItem(STORAGE_KEY, lang);
}

export function getLanguage(): Language {
  return (i18n.language as Language) || "ru";
}

export function t(key: string, options?: Record<string, unknown>) {
  return i18n.t(key, options) as string;
}

export function formatDate(value: string | number | Date) {
  const date = value instanceof Date ? value : new Date(value);
  return new Intl.DateTimeFormat(getLanguage()).format(date);
}

export function formatDateTime(value: string | number | Date) {
  const date = value instanceof Date ? value : new Date(value);
  return new Intl.DateTimeFormat(getLanguage(), {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export function formatNumber(value: number) {
  return new Intl.NumberFormat(getLanguage()).format(value);
}

export function formatCurrency(value: number) {
  return new Intl.NumberFormat(getLanguage(), {
    style: "currency",
    currency: "UZS",
    maximumFractionDigits: 0,
  }).format(value);
}

export function translateStatus(status: string) {
  return t(`status.${status}`, { defaultValue: status });
}

export function translatePayment(method: string) {
  return t(`payment.${method}`, { defaultValue: method });
}

export function translateFulfillment(value: string) {
  return t(`fulfillment.${value}`, { defaultValue: value });
}

