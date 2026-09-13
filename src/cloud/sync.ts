import type { GameState } from '../engine';

/** Was in Firestore liegt, ohne den Spielstand zu entpacken. */
export interface CloudSave {
  json: string;
  playedSeconds: number;
  km: number;
  version: number;
  /** Wanduhr in Millisekunden beim Hochladen */
  aktualisiert: number;
  geraet: string;
}

export type SyncDecision =
  | { kind: 'nichts' }
  | { kind: 'hochladen'; grund: 'cloud_leer' | 'lokal_weiter' }
  | { kind: 'herunterladen'; grund: 'lokal_leer' }
  | { kind: 'fragen'; lokal: { playedSeconds: number; km: number }; cloud: { playedSeconds: number; km: number } };

/**
 * Wer ist weiter? Verglichen wird die Spielzeit, nicht die Wanduhr: Sie wächst nur
 * durch Spielen und lügt nicht, wenn ein Gerät falsch gestellt ist.
 * Erst ab einer Minute Unterschied gilt ein Stand als weiter.
 */
export const SYNC_TOLERANCE_SECONDS = 60;

export function decideSync(local: GameState | null, cloud: CloudSave | null): SyncDecision {
  if (!local && !cloud) return { kind: 'nichts' };
  if (!cloud) return { kind: 'hochladen', grund: 'cloud_leer' };
  if (!local) return { kind: 'herunterladen', grund: 'lokal_leer' };

  const diff = cloud.playedSeconds - local.playedSeconds;
  if (diff > SYNC_TOLERANCE_SECONDS) {
    return {
      kind: 'fragen',
      lokal: { playedSeconds: local.playedSeconds, km: local.km },
      cloud: { playedSeconds: cloud.playedSeconds, km: cloud.km },
    };
  }
  if (diff < -SYNC_TOLERANCE_SECONDS) return { kind: 'hochladen', grund: 'lokal_weiter' };
  return { kind: 'nichts' };
}

/**
 * Baut das Dokument, das in Firestore landet. Als eigene Funktion, damit der Regeltest
 * genau das schreibt, was die App schreibt, und nicht eine Nachbildung davon.
 */
export function buildCloudSave(json: string, state: GameState, now = Date.now(), geraet = deviceName()): CloudSave {
  return {
    json,
    playedSeconds: Math.round(state.playedSeconds),
    km: Number(state.km.toFixed(2)),
    version: state.version,
    aktualisiert: now,
    geraet,
  };
}

/** Kurzer Name des Geräts, damit der Bericht sagen kann, woher ein Stand kommt. */
export function deviceName(): string {
  if (typeof navigator === 'undefined') return 'unbekannt';
  const ua = navigator.userAgent;
  if (/android/i.test(ua)) return 'Android';
  if (/iphone|ipad|ipod/i.test(ua)) return 'iPhone oder iPad';
  if (/macintosh/i.test(ua)) return 'Mac';
  if (/windows/i.test(ua)) return 'Windows';
  if (/linux/i.test(ua)) return 'Linux';
  return 'Browser';
}
