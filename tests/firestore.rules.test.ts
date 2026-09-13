/**
 * Prüft die Firestore-Regeln gegen den Emulator. Läuft mit `npm run test:rules`,
 * nicht in der normalen Testsuite, weil der Emulator Java und einen Download braucht.
 */
import { assertFails, assertSucceeds, initializeTestEnvironment, type RulesTestEnvironment } from '@firebase/rules-unit-testing';
import { doc, deleteDoc, getDoc, getDocs, collection, runTransaction, setDoc } from 'firebase/firestore';
import { readFileSync } from 'node:fs';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createInitialState, serialize, deserialize } from '../src/engine';
import { autoplay } from '../src/engine/sim/autoplay';
import { buildCloudSave, decideSync } from '../src/cloud/sync';

let env: RulesTestEnvironment;

const ANNA = 'anna';
const BEN = 'ben';

function gueltigerStand(overrides: Record<string, unknown> = {}) {
  return {
    json: '{"version":1,"playedSeconds":120}',
    playedSeconds: 120,
    km: 3.4,
    version: 1,
    aktualisiert: 1_700_000_000_000,
    geraet: 'Android',
    ...overrides,
  };
}

beforeAll(async () => {
  env = await initializeTestEnvironment({
    projectId: 'loco-test',
    firestore: { rules: readFileSync('firestore.rules', 'utf8'), host: '127.0.0.1', port: 8080 },
  });
});

afterAll(async () => {
  await env?.cleanup();
});

beforeEach(async () => {
  await env.clearFirestore();
});

describe('Firestore-Regeln', () => {
  it('lassen ein Konto den eigenen Spielstand anlegen, lesen, ändern und löschen', async () => {
    const db = env.authenticatedContext(ANNA).firestore();
    const ref = doc(db, 'spielstaende', ANNA);
    await assertSucceeds(setDoc(ref, gueltigerStand()));
    await assertSucceeds(getDoc(ref));
    await assertSucceeds(setDoc(ref, gueltigerStand({ playedSeconds: 300, km: 8 })));
    await assertSucceeds(deleteDoc(ref));
  });

  it('sperren fremde Spielstände, auch für angemeldete Konten', async () => {
    await env.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'spielstaende', ANNA), gueltigerStand());
    });
    const db = env.authenticatedContext(BEN).firestore();
    await assertFails(getDoc(doc(db, 'spielstaende', ANNA)));
    await assertFails(setDoc(doc(db, 'spielstaende', ANNA), gueltigerStand()));
    await assertFails(deleteDoc(doc(db, 'spielstaende', ANNA)));
  });

  it('sperren alles für nicht angemeldete Besucher', async () => {
    const db = env.unauthenticatedContext().firestore();
    await assertFails(getDoc(doc(db, 'spielstaende', ANNA)));
    await assertFails(setDoc(doc(db, 'spielstaende', ANNA), gueltigerStand()));
  });

  it('lassen niemanden die Sammlung durchsuchen', async () => {
    const db = env.authenticatedContext(ANNA).firestore();
    await assertFails(getDocs(collection(db, 'spielstaende')));
  });

  it('weisen fehlerhafte Spielstände ab', async () => {
    const db = env.authenticatedContext(ANNA).firestore();
    const ref = doc(db, 'spielstaende', ANNA);
    await assertFails(setDoc(ref, gueltigerStand({ json: 123 })));
    await assertFails(setDoc(ref, gueltigerStand({ json: '' })));
    await assertFails(setDoc(ref, gueltigerStand({ json: 'x'.repeat(400_001) })));
    await assertFails(setDoc(ref, gueltigerStand({ playedSeconds: -5 })));
    await assertFails(setDoc(ref, gueltigerStand({ km: 'weit' })));
    await assertFails(setDoc(ref, gueltigerStand({ version: 0 })));
    await assertFails(setDoc(ref, gueltigerStand({ geraet: 'x'.repeat(65) })));
    await assertFails(setDoc(ref, gueltigerStand({ heimlich: 'daten' })));
    const { json: _weg, ...ohneJson } = gueltigerStand();
    await assertFails(setDoc(ref, ohneJson));
  });

  it('nehmen genau das Dokument an, das die App schreibt', async () => {
    const state = createInitialState();
    const dokument = buildCloudSave(serialize(state, Date.now()), state, Date.now(), 'Android');
    const db = env.authenticatedContext(ANNA).firestore();
    await assertSucceeds(setDoc(doc(db, 'spielstaende', ANNA), { ...dokument }));
  });

  it('nehmen auch einen durchgespielten Stand an und geben ihn unversehrt zurück', async () => {
    // Der grösste Spielstand, den der erste Stand hergibt: alles freigeschaltet, volles Fahrtenbuch
    const { state } = autoplay({ maxSeconds: 6 * 3600, stopAt: 'stand_ende' });
    const json = serialize(state, Date.now());
    const dokument = buildCloudSave(json, state, Date.now(), 'Mac');
    // Die Regel erlaubt 400 000 Zeichen. Ein voller Spielstand muss klar darunter bleiben.
    console.info(`Spielstand am Ende des ersten Stands: ${(json.length / 1024).toFixed(1)} KB, Grenze der Regel 390 KB`);
    expect(json.length).toBeLessThan(200_000);

    const db = env.authenticatedContext(ANNA).firestore();
    const ref = doc(db, 'spielstaende', ANNA);
    await assertSucceeds(setDoc(ref, { ...dokument }));

    const gelesen = (await getDoc(ref)).data();
    expect(gelesen?.['json']).toBe(json);
    const zurueck = deserialize(String(gelesen?.['json']));
    expect(zurueck.km).toBeCloseTo(state.km, 5);
    expect(zurueck.wagons).toHaveLength(state.wagons.length);
    expect(zurueck.techs.done).toEqual(state.techs.done);
    expect(zurueck.projects['tunnel']?.done).toBe(true);

    // Und der Abgleich erkennt, dass beide Seiten gleich weit sind
    const geschrieben = buildCloudSave(json, state);
    const merkzettel = { stamp: geschrieben.aktualisiert, playedSeconds: zurueck.playedSeconds, catchUpSeconds: 0 };
    expect(decideSync(zurueck, geschrieben, merkzettel)).toEqual({ kind: 'nichts' });
  });

  it('nehmen das Schreiben in der Transaktion an, mit der die App die Abstammung prüft', async () => {
    const state = createInitialState();
    const db = env.authenticatedContext(ANNA).firestore();
    const ref = doc(db, 'spielstaende', ANNA);
    const erstes = buildCloudSave(serialize(state, 1_700_000_000_000), state, 1_700_000_000_000, 'Android');
    await assertSucceeds(setDoc(ref, { ...erstes }));

    // Die App liest zuerst und schreibt nur, wenn die Cloud noch den erwarteten Stempel trägt
    const zweites = buildCloudSave(serialize(state, 1_700_000_100_000), state, 1_700_000_100_000, 'Windows');
    const geschrieben = await assertSucceeds(
      runTransaction(db, async (tx) => {
        const snap = await tx.get(ref);
        if (snap.data()?.['aktualisiert'] !== erstes.aktualisiert) return false;
        tx.set(ref, { ...zweites });
        return true;
      }),
    );
    expect(geschrieben).toBe(true);
    expect((await getDoc(ref)).data()?.['aktualisiert']).toBe(zweites.aktualisiert);

    // Fremde Konten kommen auch über eine Transaktion nicht an den Stand
    const fremd = env.authenticatedContext(BEN).firestore();
    await assertFails(
      runTransaction(fremd, async (tx) => {
        await tx.get(doc(fremd, 'spielstaende', ANNA));
      }),
    );
  });

  it('sperren alle anderen Sammlungen', async () => {
    const db = env.authenticatedContext(ANNA).firestore();
    await assertFails(setDoc(doc(db, 'irgendwas', 'x'), { a: 1 }));
    await assertFails(getDoc(doc(db, 'nutzer', ANNA)));
  });
});
