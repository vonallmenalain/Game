import type { GameState } from '../engine';

/** Was in Firestore liegt, ohne den Spielstand zu entpacken. */
export interface CloudSave {
  json: string;
  playedSeconds: number;
  km: number;
  version: number;
  /**
   * Wanduhr in Millisekunden beim Hochladen. Jedes Schreiben vergibt einen neuen Wert,
   * darum taugt er auch als Kennung des Dokuments: Trägt die Cloud einen anderen als den,
   * den dieses Gerät zuletzt gesehen hat, hat inzwischen ein anderes Gerät geschrieben.
   */
  aktualisiert: number;
  geraet: string;
}

/**
 * Der Merkzettel eines Geräts zum letzten Abgleich. Er sagt, worauf der lokale Stand aufbaut.
 * `stamp` ist das `aktualisiert` des Cloud-Dokuments, mit dem der lokale Stand zuletzt
 * übereinstimmte (null: die Cloud war leer). `playedSeconds` ist die Spielzeit in diesem
 * Moment. `catchUpSeconds` ist die Nachsimulation seither: Sie zählt nicht als Spielen,
 * denn jeder andere Stand bekäme für dieselbe Abwesenheit seine eigene.
 */
export interface SyncMark {
  stamp: number | null;
  playedSeconds: number;
  catchUpSeconds: number;
}

/** Ein Stand in der Rückfrage, so weit die Anzeige ihn braucht. */
export interface SaveSummary {
  playedSeconds: number;
  km: number;
  /** Wanduhr des letzten Speicherns, 0 = unbekannt */
  savedAt: number;
  geraet: string;
}

export type SyncDecision =
  | { kind: 'nichts' }
  | { kind: 'hochladen'; grund: 'cloud_leer' | 'lokal_weiter' | 'lokal_neu' }
  | { kind: 'herunterladen'; grund: 'lokal_leer' | 'cloud_neuer' | 'lokal_zurueck' }
  | { kind: 'fragen'; lokal: SaveSummary; cloud: SaveSummary; empfehlung: 'lokal' | 'cloud' };

/** Erst ab einer Minute Unterschied gilt ein Stand als weiter oder als gespielt. */
export const SYNC_TOLERANCE_SECONDS = 60;

/**
 * Entscheidet, welcher Stand gilt. Die Frage ist nicht «wer hat mehr Spielzeit», sondern
 * «worauf baut der lokale Stand auf». Ein Gerät, das nach Tagen wieder aufwacht, holt seine
 * Abwesenheit nach und sieht danach so weit aus wie die Cloud; trotzdem fehlt ihm alles,
 * was inzwischen auf einem anderen Gerät gespielt wurde. Darum:
 *
 * - Trägt die Cloud noch den Stempel vom letzten Abgleich, baut der lokale Stand darauf
 *   auf. Was hier weiterging, darf hochgeladen werden.
 * - Trägt sie einen anderen, hat ein anderes Gerät geschrieben. Wurde hier seither nichts
 *   gespielt (Nachsimulation zählt nicht), gilt die Cloud ohne Rückfrage. Sonst haben beide
 *   Seiten etwas, das der anderen fehlt, und die Spielerin entscheidet.
 */
export function decideSync(local: GameState | null, cloud: CloudSave | null, mark: SyncMark | null): SyncDecision {
  if (!local && !cloud) return { kind: 'nichts' };
  if (!cloud) return { kind: 'hochladen', grund: 'cloud_leer' };
  if (!local) return { kind: 'herunterladen', grund: 'lokal_leer' };

  if (mark && mark.stamp === cloud.aktualisiert) {
    // Der lokale Stand ist hinter den Merkzettel zurückgefallen: Der Spielstand auf dem
    // Gerät ist verloren gegangen oder eine ältere Kopie geladen. Die Cloud hat das Original.
    if (local.playedSeconds < mark.playedSeconds - SYNC_TOLERANCE_SECONDS) return { kind: 'herunterladen', grund: 'lokal_zurueck' };
    const diff = local.playedSeconds - cloud.playedSeconds;
    if (diff > SYNC_TOLERANCE_SECONDS) return { kind: 'hochladen', grund: 'lokal_weiter' };
    // Hinter der Cloud, aber nicht hinter dem Merkzettel: Das gibt es nur nach «Neu anfangen».
    if (diff < -SYNC_TOLERANCE_SECONDS) return { kind: 'hochladen', grund: 'lokal_neu' };
    return { kind: 'nichts' };
  }

  const playedHere = mark ? local.playedSeconds - mark.playedSeconds - mark.catchUpSeconds : local.playedSeconds;
  if (playedHere <= SYNC_TOLERANCE_SECONDS) return { kind: 'herunterladen', grund: 'cloud_neuer' };

  const lokal = summarizeLocal(local);
  const cloudSummary = summarizeCloud(cloud);
  return {
    kind: 'fragen',
    lokal,
    cloud: cloudSummary,
    empfehlung: cloudSummary.playedSeconds >= lokal.playedSeconds ? 'cloud' : 'lokal',
  };
}

export function summarizeLocal(state: GameState, geraet = deviceName()): SaveSummary {
  return { playedSeconds: state.playedSeconds, km: state.km, savedAt: state.lastSavedAt, geraet };
}

export function summarizeCloud(cloud: CloudSave): SaveSummary {
  return { playedSeconds: cloud.playedSeconds, km: cloud.km, savedAt: cloud.aktualisiert, geraet: cloud.geraet };
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
