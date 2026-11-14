import { isRecord, readJson, writeJson, type KeyValueStore } from './storage';

/**
 * Anonymous player identity for the world ranking: a random id plus a
 * display name chosen by the player. No email, no account, no personal data.
 */
export interface Player {
  id: string;
  name: string;
}

export const PLAYER_KEY = 'perfecteye.player';

function randomHex(bytes: number): string {
  const a = new Uint8Array(bytes);
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) crypto.getRandomValues(a);
  else for (let i = 0; i < bytes; i++) a[i] = Math.floor(Math.random() * 256);
  return Array.from(a, (b) => b.toString(16).padStart(2, '0')).join('');
}

export function loadPlayer(store: KeyValueStore, defaultNamePrefix: string): Player {
  const raw = readJson(store, PLAYER_KEY);
  if (
    isRecord(raw) &&
    typeof raw.id === 'string' &&
    /^[0-9a-f]{16,32}$/.test(raw.id) &&
    typeof raw.name === 'string' &&
    raw.name.length >= 2 &&
    raw.name.length <= 20
  ) {
    return { id: raw.id, name: raw.name };
  }
  const player = {
    id: randomHex(12),
    name: `${defaultNamePrefix} ${1000 + Math.floor(Math.random() * 9000)}`,
  };
  writeJson(store, PLAYER_KEY, player);
  return player;
}

export function savePlayerName(store: KeyValueStore, player: Player, name: string): Player {
  const next = { ...player, name };
  writeJson(store, PLAYER_KEY, next);
  return next;
}
