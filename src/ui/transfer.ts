import { deserialize, type GameState } from '../engine';
import { formatDecimal } from '../lib/format';

/** Dateiname mit Kilometerstand und Datum, damit mehrere Sicherungen unterscheidbar sind. */
export function exportFileName(state: GameState, now = new Date()): string {
  const pad = (n: number) => n.toString().padStart(2, '0');
  const date = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}`;
  const km = formatDecimal(state.km, 1).replace(',', '-').replace('’', '');
  return `loco-km${km}-${date}.json`;
}

/** Bietet den Spielstand als Datei an. Nutzt Teilen, wo es geht, sonst einen Download. */
export async function exportSave(json: string, fileName: string): Promise<'geteilt' | 'geladen'> {
  const file = new File([json], fileName, { type: 'application/json' });
  const shareData = { files: [file], title: 'Loco', text: 'Spielstand Loco' };
  if (typeof navigator !== 'undefined' && navigator.canShare?.(shareData) && navigator.share) {
    try {
      await navigator.share(shareData);
      return 'geteilt';
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') throw error;
      console.warn('Teilen ging nicht, Datei wird heruntergeladen', error);
    }
  }
  const url = URL.createObjectURL(file);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
  return 'geladen';
}

export class ImportError extends Error {}

/** Liest eine Spielstand-Datei. Wirft ImportError mit einem Satz, der erklärt, was fehlt. */
export async function importSave(file: File): Promise<{ state: GameState; json: string }> {
  if (file.size > 8_000_000) throw new ImportError('Die Datei ist zu gross für einen Spielstand.');
  let json: string;
  try {
    json = await file.text();
  } catch {
    throw new ImportError('Die Datei liess sich nicht lesen.');
  }
  let state: GameState;
  try {
    state = deserialize(json);
  } catch {
    throw new ImportError('Das ist kein Spielstand von Loco.');
  }
  return { state, json };
}
