import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { en, type MessageKey, type Messages } from './en';
import { es } from './es';

export type Lang = 'en' | 'es';
export const LANGS: readonly Lang[] = ['en', 'es'];
export const DICTIONARIES: Record<Lang, Messages> = { en, es };

export const isLang = (v: unknown): v is Lang => v === 'en' || v === 'es';

/** Pick a language from the browser preferences, defaulting to English. */
export function detectLang(languages: readonly string[]): Lang {
  for (const l of languages) {
    const base = l.toLowerCase().split('-')[0];
    if (isLang(base)) return base;
  }
  return 'en';
}

export type Params = Record<string, string | number>;

export function translate(lang: Lang, key: MessageKey, params?: Params): string {
  const template = DICTIONARIES[lang][key] ?? en[key] ?? key;
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (m, name: string) =>
    name in params ? String(params[name]) : m,
  );
}

export interface I18n {
  lang: Lang;
  t: (key: MessageKey, params?: Params) => string;
  /** Locale-aware number formatting. */
  num: (value: number, decimals?: number) => string;
}

export function createI18n(lang: Lang): I18n {
  const formatters = new Map<number, Intl.NumberFormat>();
  return {
    lang,
    t: (key, params) => translate(lang, key, params),
    num: (value, decimals = 0) => {
      let f = formatters.get(decimals);
      if (!f) {
        f = new Intl.NumberFormat(lang, {
          minimumFractionDigits: decimals,
          maximumFractionDigits: decimals,
        });
        formatters.set(decimals, f);
      }
      return f.format(value);
    },
  };
}

const I18nContext = createContext<I18n>(createI18n('en'));

export function I18nProvider({ lang, children }: { lang: Lang; children: ReactNode }) {
  const value = useMemo(() => createI18n(lang), [lang]);
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export const useI18n = () => useContext(I18nContext);
export type { MessageKey };
