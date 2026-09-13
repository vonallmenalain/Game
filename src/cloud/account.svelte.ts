import { deserialize, type GameState } from '../engine';
import { SAVE_COLLECTION } from './config';
import { describeAuthError, loadFirebase } from './firebase';
import { decideSync, deviceName, type CloudSave, type SyncDecision } from './sync';

/** Merkt, dass jemand angemeldet war, damit das SDK beim Start gleich mitlädt. */
const HINT_KEY = 'linie-null/konto';

export type AccountStatus = 'abgemeldet' | 'laedt' | 'angemeldet';
export type SyncStatus = 'ruht' | 'laeuft' | 'fehler' | 'fertig';

export interface Conflict {
  lokal: { playedSeconds: number; km: number };
  cloud: { playedSeconds: number; km: number };
}

function rememberSignedIn(on: boolean): void {
  try {
    if (on) localStorage.setItem(HINT_KEY, 'ja');
    else localStorage.removeItem(HINT_KEY);
  } catch {
    // Gesperrter Speicher: dann lädt das SDK eben erst beim Antippen
  }
}

export function wasSignedIn(): boolean {
  try {
    return localStorage.getItem(HINT_KEY) === 'ja';
  } catch {
    return false;
  }
}

class Account {
  status = $state<AccountStatus>('abgemeldet');
  name = $state<string | null>(null);
  email = $state<string | null>(null);
  uid = $state<string | null>(null);
  sync = $state<SyncStatus>('ruht');
  /** Wanduhr des letzten erfolgreichen Hochladens */
  syncedAt = $state(0);
  error = $state<string | null>(null);
  conflict = $state<Conflict | null>(null);

  /** Wird gesetzt, wenn ein Cloud-Stand übernommen werden soll. */
  onAdopt: ((state: GameState) => Promise<void>) | null = null;
  /** Liefert den aktuellen Spielstand als JSON, für das Hochladen. */
  getSnapshot: (() => { json: string; state: GameState }) | null = null;

  private watching = false;
  private pendingCloud: CloudSave | null = null;

  get signedIn(): boolean {
    return this.status === 'angemeldet';
  }

  /** Hört auf An- und Abmeldungen. Lädt das SDK, ohne das Spiel zu blockieren. */
  async watch(): Promise<void> {
    if (this.watching) return;
    this.watching = true;
    this.status = 'laedt';
    try {
      const { auth, api } = await loadFirebase();
      api.onAuthStateChanged(auth, (user) => {
        if (user) {
          this.uid = user.uid;
          this.name = user.displayName ?? user.email ?? 'Angemeldet';
          this.email = user.email;
          this.status = 'angemeldet';
          rememberSignedIn(true);
          void this.reconcile();
        } else {
          this.uid = null;
          this.name = null;
          this.email = null;
          this.status = 'abgemeldet';
          this.sync = 'ruht';
          rememberSignedIn(false);
        }
      });
    } catch (error) {
      this.watching = false;
      this.status = 'abgemeldet';
      this.error = describeAuthError(error);
    }
  }

  private async run<T>(action: () => Promise<T>): Promise<T | null> {
    this.error = null;
    try {
      return await action();
    } catch (error) {
      this.error = describeAuthError(error);
      console.warn('Konto-Aktion fehlgeschlagen', error);
      return null;
    }
  }

  async signInWithEmail(email: string, password: string): Promise<boolean> {
    const result = await this.run(async () => {
      const { auth, api } = await loadFirebase();
      await api.signInWithEmailAndPassword(auth, email.trim(), password);
      return true;
    });
    return result === true;
  }

  async registerWithEmail(email: string, password: string): Promise<boolean> {
    const result = await this.run(async () => {
      const { auth, api } = await loadFirebase();
      await api.createUserWithEmailAndPassword(auth, email.trim(), password);
      return true;
    });
    return result === true;
  }

  async signInWithGoogle(): Promise<boolean> {
    const result = await this.run(async () => {
      const { auth, api } = await loadFirebase();
      await api.signInWithPopup(auth, new api.GoogleAuthProvider());
      return true;
    });
    return result === true;
  }

  async resetPassword(email: string): Promise<boolean> {
    const result = await this.run(async () => {
      const { auth, api } = await loadFirebase();
      await api.sendPasswordResetEmail(auth, email.trim());
      return true;
    });
    return result === true;
  }

  async signOut(): Promise<void> {
    await this.run(async () => {
      const { auth, api } = await loadFirebase();
      await api.signOut(auth);
    });
  }

  private async fetchCloud(): Promise<CloudSave | null> {
    const { db, api } = await loadFirebase();
    if (!this.uid) return null;
    const snap = await api.getDoc(api.doc(db, SAVE_COLLECTION, this.uid));
    if (!snap.exists()) return null;
    const data = snap.data() as Partial<CloudSave>;
    if (typeof data.json !== 'string') return null;
    return {
      json: data.json,
      playedSeconds: typeof data.playedSeconds === 'number' ? data.playedSeconds : 0,
      km: typeof data.km === 'number' ? data.km : 0,
      version: typeof data.version === 'number' ? data.version : 1,
      aktualisiert: typeof data.aktualisiert === 'number' ? data.aktualisiert : 0,
      geraet: typeof data.geraet === 'string' ? data.geraet : 'unbekannt',
    };
  }

  /** Vergleicht nach dem Anmelden beide Seiten und handelt danach. */
  async reconcile(): Promise<SyncDecision> {
    if (!this.uid || !this.getSnapshot) return { kind: 'nichts' };
    this.sync = 'laeuft';
    try {
      const cloud = await this.fetchCloud();
      const { state } = this.getSnapshot();
      const decision = decideSync(state, cloud);
      if (decision.kind === 'fragen') {
        this.pendingCloud = cloud;
        this.conflict = { lokal: decision.lokal, cloud: decision.cloud };
        this.sync = 'ruht';
      } else if (decision.kind === 'herunterladen' && cloud) {
        await this.adopt(cloud);
      } else if (decision.kind === 'hochladen') {
        await this.push();
      } else {
        this.sync = 'fertig';
      }
      return decision;
    } catch (error) {
      this.sync = 'fehler';
      this.error = describeAuthError(error);
      console.warn('Abgleich fehlgeschlagen', error);
      return { kind: 'nichts' };
    }
  }

  private async adopt(cloud: CloudSave): Promise<void> {
    if (!this.onAdopt) return;
    await this.onAdopt(deserialize(cloud.json));
    this.sync = 'fertig';
    this.syncedAt = Date.now();
  }

  /** Antwort auf die Rückfrage: den Stand aus der Cloud übernehmen. */
  async resolveWithCloud(): Promise<void> {
    const cloud = this.pendingCloud;
    this.conflict = null;
    this.pendingCloud = null;
    if (!cloud) return;
    this.sync = 'laeuft';
    try {
      await this.adopt(cloud);
    } catch (error) {
      this.sync = 'fehler';
      this.error = describeAuthError(error);
    }
  }

  /** Antwort auf die Rückfrage: den Stand vom Gerät behalten und hochladen. */
  async resolveWithLocal(): Promise<void> {
    this.conflict = null;
    this.pendingCloud = null;
    await this.push();
  }

  /** Lädt den aktuellen Spielstand hoch. Ohne Konto passiert nichts. */
  async push(): Promise<boolean> {
    if (!this.uid || !this.getSnapshot) return false;
    this.sync = 'laeuft';
    try {
      const { db, api } = await loadFirebase();
      const { json, state } = this.getSnapshot();
      await api.setDoc(api.doc(db, SAVE_COLLECTION, this.uid), {
        json,
        playedSeconds: Math.round(state.playedSeconds),
        km: Number(state.km.toFixed(2)),
        version: state.version,
        aktualisiert: Date.now(),
        geraet: deviceName(),
      });
      this.sync = 'fertig';
      this.syncedAt = Date.now();
      return true;
    } catch (error) {
      this.sync = 'fehler';
      this.error = describeAuthError(error);
      console.warn('Hochladen fehlgeschlagen', error);
      return false;
    }
  }

  /** Holt den Stand aus der Cloud, auch ohne Konflikt. */
  async pull(): Promise<boolean> {
    if (!this.uid) return false;
    this.sync = 'laeuft';
    try {
      const cloud = await this.fetchCloud();
      if (!cloud) {
        this.sync = 'ruht';
        this.error = 'In der Cloud liegt noch kein Spielstand.';
        return false;
      }
      await this.adopt(cloud);
      return true;
    } catch (error) {
      this.sync = 'fehler';
      this.error = describeAuthError(error);
      return false;
    }
  }

  async deleteCloudSave(): Promise<boolean> {
    if (!this.uid) return false;
    const result = await this.run(async () => {
      const { db, api } = await loadFirebase();
      await api.deleteDoc(api.doc(db, SAVE_COLLECTION, this.uid!));
      this.sync = 'ruht';
      this.syncedAt = 0;
      return true;
    });
    return result === true;
  }
}

export const account = new Account();
