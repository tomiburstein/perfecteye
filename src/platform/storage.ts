/**
 * Minimal key/value storage abstraction.
 *
 * The app talks to this interface instead of `localStorage` directly, so a
 * future optional account (cloud sync) can be added by writing another
 * implementation without touching game code.
 */
export interface KeyValueStore {
  get(key: string): string | null;
  set(key: string, value: string): void;
  remove(key: string): void;
}

/** In-memory store, used in tests and as a fallback when storage is blocked. */
export function createMemoryStore(): KeyValueStore {
  const map = new Map<string, string>();
  return {
    get: (k) => (map.has(k) ? (map.get(k) as string) : null),
    set: (k, v) => void map.set(k, v),
    remove: (k) => void map.delete(k),
  };
}

let storageAvailable = true;
export const isPersistentStorageAvailable = () => storageAvailable;

/** localStorage wrapper that never throws (private mode, quota, disabled). */
export function createBrowserStore(): KeyValueStore {
  let ls: Storage | null = null;
  try {
    ls = window.localStorage;
    const probe = '__pe_probe__';
    ls.setItem(probe, '1');
    ls.removeItem(probe);
  } catch {
    ls = null;
  }
  if (!ls) {
    storageAvailable = false;
    return createMemoryStore();
  }
  const store = ls;
  return {
    get(k) {
      try {
        return store.getItem(k);
      } catch {
        return null;
      }
    },
    set(k, v) {
      try {
        store.setItem(k, v);
      } catch {
        storageAvailable = false;
      }
    },
    remove(k) {
      try {
        store.removeItem(k);
      } catch {
        /* ignore */
      }
    },
  };
}

export function readJson(store: KeyValueStore, key: string): unknown {
  const raw = store.get(key);
  if (raw === null) return null;
  try {
    return JSON.parse(raw) as unknown;
  } catch {
    return null;
  }
}

export function writeJson(store: KeyValueStore, key: string, value: unknown): void {
  store.set(key, JSON.stringify(value));
}

export const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);
