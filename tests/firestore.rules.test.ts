/**
 * Prüft die Firestore-Regeln gegen den Emulator. Läuft mit `npm run test:rules`,
 * nicht in der normalen Testsuite, weil der Emulator Java und einen Download braucht.
 */
import { assertFails, assertSucceeds, initializeTestEnvironment, type RulesTestEnvironment } from '@firebase/rules-unit-testing';
import { doc, deleteDoc, getDoc, getDocs, collection, setDoc } from 'firebase/firestore';
import { readFileSync } from 'node:fs';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

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
    projectId: 'linie-null-test',
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

  it('sperren alle anderen Sammlungen', async () => {
    const db = env.authenticatedContext(ANNA).firestore();
    await assertFails(setDoc(doc(db, 'irgendwas', 'x'), { a: 1 }));
    await assertFails(getDoc(doc(db, 'nutzer', ANNA)));
  });
});
