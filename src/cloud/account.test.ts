/**
 * Zwei Geräte, ein Konto, eine Cloud. Firebase ist hier ein Fake im Speicher, der sich
 * verhält wie Firestore: ein Dokument je Pfad, Transaktionen lesen erst und schreiben dann.
 * Geprüft wird der Ablauf, der im Fehlerbericht schiefging: Am PC gespielt, dann das Handy
 * geöffnet, und der PC-Stand war weg.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createInitialState, serialize, type GameState } from '../engine';
import type { CloudSave } from './sync';

type Doc = Record<string, unknown>;
interface Ref {
  path: string;
}

const fake = vi.hoisted(() => {
  const docs = new Map<string, Doc>();
  const auth = { user: null as { uid: string; displayName: string | null; email: string | null } | null };
  const snapshot = (ref: Ref) => {
    const data = docs.get(ref.path);
    return { exists: () => data !== undefined, data: () => (data ? { ...data } : undefined) };
  };
  const api = {
    onAuthStateChanged: (_auth: unknown, cb: (user: unknown) => void) => {
      queueMicrotask(() => cb(auth.user));
      return () => {};
    },
    doc: (_db: unknown, collection: string, id: string): Ref => ({ path: `${collection}/${id}` }),
    getDoc: async (ref: Ref) => snapshot(ref),
    setDoc: async (ref: Ref, data: Doc) => {
      docs.set(ref.path, { ...data });
    },
    deleteDoc: async (ref: Ref) => {
      docs.delete(ref.path);
    },
    runTransaction: async <T>(_db: unknown, fn: (tx: { get: (ref: Ref) => Promise<ReturnType<typeof snapshot>>; set: (ref: Ref, data: Doc) => void }) => Promise<T>) => {
      const pending: [string, Doc][] = [];
      const result = await fn({
        get: async (ref) => snapshot(ref),
        set: (ref, data) => {
          pending.push([ref.path, { ...data }]);
        },
      });
      for (const [path, data] of pending) docs.set(path, data);
      return result;
    },
  };
  return { docs, auth, api };
});

vi.mock('./firebase', () => ({
  loadFirebase: async () => ({ app: {}, auth: fake.auth, db: {}, api: fake.api }),
  describeAuthError: (error: unknown) => String(error),
}));

import { Account } from './account.svelte';

const clock = { now: 1_700_000_000_000 };

/** Ein Gerät: eigener Speicher, eigener Spielstand, eigenes Konto-Objekt. */
function device() {
  const storage = new Map<string, string>();
  const localStorage = {
    getItem: (key: string) => storage.get(key) ?? null,
    setItem: (key: string, value: string) => void storage.set(key, value),
    removeItem: (key: string) => void storage.delete(key),
  };
  let state: GameState = createInitialState();
  const account = new Account();
  const adopted: CloudSave[] = [];
  let resumed = 0;
  account.getSnapshot = () => ({ json: serialize(state, clock.now), state: structuredClone(state) });
  account.onAdopt = async (next, source) => {
    state = next;
    adopted.push(source);
  };
  account.onResume = async () => {
    resumed += 1;
  };
  const d = {
    account,
    adopted,
    get resumed() {
      return resumed;
    },
    get state() {
      return state;
    },
    /** Macht dieses Gerät zum aktiven: Sein Speicher ist dann der globale */
    use() {
      Object.defineProperty(globalThis, 'localStorage', { value: localStorage, configurable: true, writable: true });
      return d;
    },
    async signIn() {
      d.use();
      await account.watch();
      return account.firstDecision();
    },
    play(seconds: number) {
      state.playedSeconds += seconds;
      state.km += seconds / 600;
    },
    /** Die Nachsimulation beim Aufwachen: gibt Spielzeit und meldet sie dem Konto */
    catchUp(seconds: number) {
      d.use();
      state.playedSeconds += seconds;
      state.km += seconds / 600;
      account.noteCatchUp(seconds);
    },
    reset() {
      d.use();
      state = createInitialState();
      account.noteFreshStart();
    },
  };
  return d;
}

function cloudDoc(): Doc | undefined {
  return fake.docs.get('spielstaende/anna');
}

function tick(ms = 120_000) {
  clock.now += ms;
}

beforeEach(() => {
  fake.docs.clear();
  fake.auth.user = { uid: 'anna', displayName: 'Anna', email: 'anna@example.ch' };
  clock.now = 1_700_000_000_000;
  vi.spyOn(Date, 'now').mockImplementation(() => clock.now);
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('Zwei Geräte an einem Konto', () => {
  it('lädt beim ersten Anmelden hoch, wenn die Cloud leer ist, und danach im Takt weiter', async () => {
    const handy = device();
    expect(await handy.signIn()).toEqual({ kind: 'hochladen', grund: 'cloud_leer' });
    expect(cloudDoc()?.['playedSeconds']).toBe(0);
    handy.play(1000);
    tick();
    expect(await handy.account.push()).toBe(true);
    expect(cloudDoc()?.['playedSeconds']).toBe(1000);
    expect(handy.account.sync).toBe('fertig');
  });

  it('das Handy übernimmt nach der Nacht den Stand vom PC, statt ihn zu überschreiben', async () => {
    // Am Handy gespielt und gesichert
    const handy = device();
    await handy.signIn();
    handy.play(1000);
    tick();
    await handy.account.push();

    // Der PC meldet sich frisch an, übernimmt den Stand und spielt drei Stunden weiter
    const pc = device();
    expect(await pc.signIn()).toEqual({ kind: 'herunterladen', grund: 'cloud_neuer' });
    expect(pc.state.playedSeconds).toBe(1000);
    pc.play(3 * 3600);
    tick(3 * 3600 * 1000);
    expect(await pc.account.push()).toBe(true);
    const pcStamp = cloudDoc()?.['aktualisiert'];
    expect(cloudDoc()?.['playedSeconds']).toBe(1000 + 3 * 3600);

    // Das Handy wacht auf, holt acht Stunden nach und vergleicht dann.
    // Nach Spielzeit sähe es weiter aus als der PC. Gespielt wurde hier aber nichts.
    tick(5 * 3600 * 1000);
    handy.catchUp(8 * 3600);
    expect(handy.state.playedSeconds).toBe(1000 + 8 * 3600);
    expect(await handy.account.reconcile()).toEqual({ kind: 'herunterladen', grund: 'cloud_neuer' });
    expect(handy.adopted).toHaveLength(1);
    expect(handy.state.playedSeconds).toBe(1000 + 3 * 3600);
    // Die Cloud ist unangetastet
    expect(cloudDoc()?.['aktualisiert']).toBe(pcStamp);
    expect(handy.account.conflict).toBeNull();

    // Und das Handy darf weiterspielen und sichern, denn es baut jetzt auf dem PC-Stand auf
    handy.play(600);
    tick();
    expect(await handy.account.push()).toBe(true);
    expect(cloudDoc()?.['playedSeconds']).toBe(1000 + 3 * 3600 + 600);
  });

  it('ein Gerät, das die Cloud nicht kennt, schreibt nicht blind: die Rückfrage kommt, und die Antwort gilt', async () => {
    const handy = device();
    await handy.signIn();
    handy.play(1000);
    tick();
    await handy.account.push();

    const pc = device();
    await pc.signIn();
    pc.play(3 * 3600);
    tick(3 * 3600 * 1000);
    await pc.account.push();
    const pcStamp = cloudDoc()?.['aktualisiert'];

    // Das Handy hat seither selbst gespielt: Beide Seiten haben etwas, das der anderen fehlt
    handy.use();
    handy.play(600);
    tick();
    expect(await handy.account.push()).toBe(false);
    expect(cloudDoc()?.['aktualisiert']).toBe(pcStamp);
    expect(handy.account.conflict).not.toBeNull();
    expect(handy.account.conflict?.empfehlung).toBe('cloud');
    expect(handy.account.conflict?.cloud.playedSeconds).toBe(1000 + 3 * 3600);
    expect(handy.account.conflict?.lokal.playedSeconds).toBe(1600);
    // Solange die Rückfrage steht, schreibt nichts
    expect(await handy.account.push()).toBe(false);
    expect(cloudDoc()?.['aktualisiert']).toBe(pcStamp);

    // Das Handy behält seinen Stand: Das Spiel läuft weiter, und genau der gezeigte Stand wird ersetzt
    tick();
    await handy.account.resolveWithLocal();
    expect(handy.resumed).toBe(1);
    expect(handy.account.conflict).toBeNull();
    expect(cloudDoc()?.['playedSeconds']).toBe(1600);

    // Der PC merkt es beim nächsten Sichern: Er hat seit seinem Abgleich nichts gespielt und übernimmt still
    pc.use();
    tick();
    expect(await pc.account.push()).toBe(false);
    expect(pc.adopted).toHaveLength(2);
    expect(pc.state.playedSeconds).toBe(1600);
    expect(pc.account.conflict).toBeNull();
  });

  it('die Antwort «Cloud nehmen» übernimmt den gezeigten Stand samt Herkunft', async () => {
    const handy = device();
    await handy.signIn();
    handy.play(1000);
    tick();
    await handy.account.push();

    const pc = device();
    await pc.signIn();
    pc.play(3 * 3600);
    tick();
    await pc.account.push();

    handy.use();
    handy.play(600);
    tick();
    await handy.account.push();
    expect(handy.account.conflict).not.toBeNull();
    await handy.account.resolveWithCloud();
    expect(handy.state.playedSeconds).toBe(1000 + 3 * 3600);
    expect(handy.adopted.at(-1)?.playedSeconds).toBe(1000 + 3 * 3600);
    expect(handy.account.conflict).toBeNull();
    // Jetzt baut das Handy auf dem PC-Stand auf und darf sichern
    tick();
    expect(await handy.account.push()).toBe(true);
  });

  it('nach «Neu anfangen» folgt die Cloud dem frischen Stand, statt ihn zurückzuholen', async () => {
    const handy = device();
    await handy.signIn();
    handy.play(5000);
    tick();
    await handy.account.push();

    handy.reset();
    tick();
    expect(await handy.account.push()).toBe(true);
    expect(cloudDoc()?.['playedSeconds']).toBe(0);
    handy.play(30);
    tick();
    expect(await handy.account.reconcile()).toEqual({ kind: 'nichts' });
    expect(handy.adopted).toHaveLength(0);
  });

  it('ein Gerät mit eigenem Spiel und ohne Merkzettel bekommt die Rückfrage, nicht die Cloud übergestülpt', async () => {
    const handy = device();
    await handy.signIn();
    handy.play(1000);
    tick();
    await handy.account.push();

    const pc = device();
    pc.play(3000);
    expect((await pc.signIn())?.kind).toBe('fragen');
    expect(pc.account.conflict?.empfehlung).toBe('lokal');
    expect(pc.adopted).toHaveLength(0);
    expect(cloudDoc()?.['playedSeconds']).toBe(1000);
  });

  it('holt die Cloud zurück, wenn der lokale Spielstand hinter den Merkzettel gefallen ist', async () => {
    const handy = device();
    await handy.signIn();
    handy.play(5000);
    tick();
    await handy.account.push();

    // Der Spielstand auf dem Gerät ist weg, der Merkzettel nicht
    handy.reset();
    handy.use();
    const mark = JSON.parse(globalThis.localStorage.getItem('loco/abgleich') ?? '{}') as Record<string, unknown>;
    mark['playedSeconds'] = 5000;
    globalThis.localStorage.setItem('loco/abgleich', JSON.stringify(mark));
    const fresh = device();
    fresh.use();
    globalThis.localStorage.setItem('loco/abgleich', JSON.stringify(mark));
    expect(await fresh.signIn()).toEqual({ kind: 'herunterladen', grund: 'lokal_zurueck' });
    expect(fresh.state.playedSeconds).toBe(5000);
  });

  it('nach dem Löschen in der Cloud legt das nächste Sichern den Stand neu an', async () => {
    const handy = device();
    await handy.signIn();
    handy.play(1000);
    tick();
    await handy.account.push();
    expect(await handy.account.deleteCloudSave()).toBe(true);
    expect(cloudDoc()).toBeUndefined();
    tick();
    expect(await handy.account.push()).toBe(true);
    expect(cloudDoc()?.['playedSeconds']).toBe(1000);
  });
});

describe('Sichern im Takt', () => {
  it('läuft nie doppelt: Hintergrund und Takt teilen sich ein Schreiben', async () => {
    const handy = device();
    await handy.signIn();
    handy.play(1000);
    tick();
    const [a, b] = await Promise.all([handy.account.push(), handy.account.push()]);
    expect(a).toBe(true);
    expect(b).toBe(true);
    expect(cloudDoc()?.['playedSeconds']).toBe(1000);
    expect(handy.account.sync).toBe('fertig');
    // Und danach ist die Freigabe intakt: das nächste Sichern braucht keinen neuen Vergleich
    handy.play(200);
    tick();
    expect(await handy.account.push()).toBe(true);
    expect(cloudDoc()?.['playedSeconds']).toBe(1200);
  });
});
