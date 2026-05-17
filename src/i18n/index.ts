import es from './es.json';
import en from './en.json';

export const locales = ['es', 'en'] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = 'es';

const dictionaries = { es, en } as const;

export type TranslationKey = keyof typeof es;

export function isLocale(value: string): value is Locale {
  return (locales as readonly string[]).includes(value);
}

export function useTranslations(locale: Locale) {
  const dict = dictionaries[locale] as Record<string, string>;
  return function t(key: TranslationKey, fallback?: string): string {
    return dict[key] ?? fallback ?? key;
  };
}

export function getLocaleFromUrl(url: URL | string): Locale {
  const pathname = typeof url === 'string' ? url : url.pathname;
  const segments = pathname.replace(/^\/galeria/, '').split('/').filter(Boolean);
  const first = segments[0];
  return first && isLocale(first) ? first : defaultLocale;
}
