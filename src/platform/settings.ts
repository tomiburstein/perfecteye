import { isLang, type Lang } from '../i18n';
import { isRecord, readJson, writeJson, type KeyValueStore } from './storage';

export type Theme = 'light' | 'dark';

export interface Settings {
  lang: Lang | null;
  theme: Theme | null;
}

/** Shared by all games of the platform. Also read by public/theme-init.js. */
export const SETTINGS_KEY = 'perfecteye.settings';

export function loadSettings(store: KeyValueStore): Settings {
  const raw = readJson(store, SETTINGS_KEY);
  if (!isRecord(raw)) return { lang: null, theme: null };
  return {
    lang: isLang(raw.lang) ? raw.lang : null,
    theme: raw.theme === 'light' || raw.theme === 'dark' ? raw.theme : null,
  };
}

export function saveSettings(store: KeyValueStore, settings: Settings): void {
  writeJson(store, SETTINGS_KEY, settings);
}
