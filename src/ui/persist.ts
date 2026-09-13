import { del, get, set } from 'idb-keyval';
import { LEGACY_SAVE_KEY, SAVE_KEY, deserialize, type GameState } from '../engine';

const BACKUP_KEY = `${SAVE_KEY}/backup`;
const LEGACY_BACKUP_KEY = `${LEGACY_SAVE_KEY}/backup`;

/**
 * Lädt den Spielstand, notfalls die Rückfallkopie. Findet auch Stände aus der Zeit,
 * als das Spiel «Linie Null» hiess, und schreibt sie beim ersten Mal um.
 */
export async function loadSave(): Promise<GameState | null> {
  for (const key of [SAVE_KEY, BACKUP_KEY, LEGACY_SAVE_KEY, LEGACY_BACKUP_KEY]) {
    try {
      const json = await get<string>(key);
      if (!json) continue;
      const state = deserialize(json);
      if (key === LEGACY_SAVE_KEY || key === LEGACY_BACKUP_KEY) {
        await set(SAVE_KEY, json);
        await del(LEGACY_SAVE_KEY);
        await del(LEGACY_BACKUP_KEY);
      }
      return state;
    } catch (error) {
      console.warn(`Spielstand unter ${key} nicht lesbar`, error);
    }
  }
  return null;
}

/** Schreibt den Spielstand und behält den vorherigen als Rückfallkopie. */
export async function storeSave(json: string): Promise<void> {
  try {
    const previous = await get<string>(SAVE_KEY);
    if (previous && previous !== json) await set(BACKUP_KEY, previous);
    await set(SAVE_KEY, json);
  } catch (error) {
    console.warn('Spielstand konnte nicht gespeichert werden', error);
  }
}

export async function clearSave(): Promise<void> {
  try {
    await del(SAVE_KEY);
    await del(BACKUP_KEY);
    await del(LEGACY_SAVE_KEY);
    await del(LEGACY_BACKUP_KEY);
  } catch (error) {
    console.warn('Spielstand konnte nicht gelöscht werden', error);
  }
}
