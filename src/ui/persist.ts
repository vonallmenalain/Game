import { del, get, set } from 'idb-keyval';
import { SAVE_KEY, deserialize, type GameState } from '../engine';

const BACKUP_KEY = `${SAVE_KEY}/backup`;
const EXPORT_KEY = `${SAVE_KEY}/lastExport`;

/** Lädt den Spielstand, notfalls die Rückfallkopie. null, wenn nichts Brauchbares da ist. */
export async function loadSave(): Promise<GameState | null> {
  for (const key of [SAVE_KEY, BACKUP_KEY]) {
    try {
      const json = await get<string>(key);
      if (json) return deserialize(json);
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
  } catch (error) {
    console.warn('Spielstand konnte nicht gelöscht werden', error);
  }
}

/** Wanduhr des letzten Exports in Millisekunden, 0 wenn nie exportiert wurde. */
export async function lastExportAt(): Promise<number> {
  try {
    return (await get<number>(EXPORT_KEY)) ?? 0;
  } catch {
    return 0;
  }
}

export async function noteExport(at: number): Promise<void> {
  try {
    await set(EXPORT_KEY, at);
  } catch (error) {
    console.warn('Export-Zeitpunkt konnte nicht gemerkt werden', error);
  }
}
