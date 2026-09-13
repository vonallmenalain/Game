/**
 * Smoke-Test im Browser: klickt sich durch die gebaute App und legt Bildschirmfotos ab.
 * Voraussetzung: `npm run build` und ein laufendes `npx vite preview --port 4173`.
 * Chromium: CHROMIUM_PATH, Standard /opt/pw-browsers/chromium. Basis-URL: BASE_URL.
 */
import { mkdirSync } from 'node:fs';
import { chromium } from 'playwright-core';

const base = process.env['BASE_URL'] ?? 'http://localhost:4173/';
const executablePath = process.env['CHROMIUM_PATH'] ?? '/opt/pw-browsers/chromium';
const dir = new URL('../smoke-shots/', import.meta.url).pathname;
mkdirSync(dir, { recursive: true });
const shot = (name) => `${dir}${name}`;

const browser = await chromium.launch({ executablePath, args: ['--no-sandbox'] });
const context = await browser.newContext({ viewport: { width: 400, height: 860 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
const page = await context.newPage();
const errors = [];
/**
 * Ohne Konto darf die App keine Verbindung zu Firebase aufbauen. Gemeint sind die
 * Dienste von Firebase, nicht Chromes eigene Aufrufe wie content-autofill.
 */
const cloudRequests = [];
page.on('request', (request) => {
  const url = request.url();
  if (/identitytoolkit|securetoken|firestore\.googleapis|firebaseio|firebaseinstallations/.test(url)) cloudRequests.push(url);
});
page.on('pageerror', (error) => errors.push(`pageerror: ${error}`));
page.on('console', (message) => {
  if (message.type() === 'error') errors.push(`console: ${message.text()}`);
});

try {
  const started = Date.now();
  await page.goto(base);
  await page.getByRole('group', { name: 'Wagen des Zuges' }).waitFor({ timeout: 15000 });
  const ladezeit = Date.now() - started;
  await page.screenshot({ path: shot('01-zug.png') });

  const crank = page.getByRole('button', { name: /^Kurbeln/ }).first();
  for (let i = 0; i < 6; i += 1) {
    await crank.click();
    await page.waitForTimeout(1000);
  }
  await page.waitForTimeout(1500);

  await page.getByRole('button', { name: 'Lager', exact: true }).click();
  await page.screenshot({ path: shot('02-lager.png') });
  const eisen = (await page.locator('div.row', { hasText: 'Eisenerz' }).first().innerText()).replace(/\s+/g, ' ');

  await page.getByRole('button', { name: 'Werkstatt', exact: true }).click();
  await page.getByRole('button', { name: /Kohle schaufeln/ }).click();

  // Karte über den Rezeptnamen suchen, nicht über irgendeinen Text darin:
  // Die Zutaten tragen inzwischen selbst ihre Namen.
  const rezeptKarte = (name) =>
    page.locator('.rezept').filter({ has: page.locator('.zeile .name', { hasText: new RegExp(`^${name}$`) }) }).first();

  // Kette: Eisenbarren braucht Koks. Antippen muss Koks von selbst voranstellen.
  const eisenbarren = rezeptKarte('Eisenbarren');
  const kettenKnopf = (await eisenbarren.getByRole('button').innerText()).trim();
  await eisenbarren.getByRole('button').click();
  await page.waitForTimeout(300);
  const queue = (await page.locator('.werkbank').innerText()).replace(/\s+/g, ' ');

  // Der Knopf darf nicht wandern, wenn die Warteschlange wächst
  const koksRezept = rezeptKarte('Koks');
  const knopfVorher = await koksRezept.getByRole('button').boundingBox();
  await koksRezept.getByRole('button').click();
  await page.waitForTimeout(250);
  await koksRezept.getByRole('button').click();
  await page.waitForTimeout(250);
  const knopfNachher = await koksRezept.getByRole('button').boundingBox();
  const knopfWandert = Math.abs((knopfVorher?.y ?? 0) - (knopfNachher?.y ?? 0));

  // Zutaten und Ergebnis sind beschriftet, und auch das Ergebnis zeigt seinen Bestand.
  const koksFluss = koksRezept.locator('.flow');
  const zutatName = (await koksFluss.locator('.chip').first().locator('.label').innerText()).trim();
  const ergebnisName = (await koksFluss.locator('.chip').last().locator('.label').innerText()).trim();
  const ergebnisBestand = await koksFluss.locator('.chip').last().locator('.have').count();
  const beschriftet = zutatName === 'Kohle' && ergebnisName === 'Koks' && ergebnisBestand === 1;
  await page.screenshot({ path: shot('03-werkstatt.png') });

  // Material für den Ausbau ins Lager legen, sonst bleibt der Knopf aus.
  // Vorher speichern lassen: Sonst geht beim Neuladen verloren, was bisher gespielt wurde.
  await page.evaluate(() => window.dispatchEvent(new Event('pagehide')));
  await page.waitForTimeout(400);
  await page.evaluate(
    async (vorrat) =>
      new Promise((resolve, reject) => {
        const open = indexedDB.open('keyval-store');
        open.onerror = () => reject(open.error);
        open.onsuccess = () => {
          const tx = open.result.transaction('keyval', 'readwrite');
          const store = tx.objectStore('keyval');
          const get = store.get('loco/save');
          get.onsuccess = () => {
            const save = JSON.parse(get.result);
            for (const [item, amount] of Object.entries(vorrat)) save.store[item] = amount;
            store.put(JSON.stringify(save), 'loco/save');
            tx.oncomplete = () => resolve(true);
          };
          get.onerror = () => reject(get.error);
        };
      }),
    { zahnrad: 40, bretter: 60, bp_eisen: 20 },
  );
  await page.reload();
  await page.getByRole('group', { name: 'Wagen des Zuges' }).waitFor({ timeout: 15000 });
  await page.getByRole('button', { name: 'Zug', exact: true }).click();
  // Die Bühne zeigt den ganzen Zug; ein Wagen auf der Bühne holt sich die Kamera und klappt auf
  const fokusVorher = await page.locator('section.stage').getAttribute('data-focus');
  await page.getByRole('button', { name: /Erntewagen/ }).first().click();
  await page.waitForTimeout(300);
  const fokusWagen = await page.locator('section.stage').getAttribute('data-focus');

  // Maschinen im Wagen: Eine zweite Erntemaschine bauen und ihr einen Rohstoff geben.
  const maschinenVorher = await page.locator('.maschine').count();
  await page.getByRole('button', { name: /Erntemaschine bauen/ }).click();
  await page.waitForTimeout(300);
  const maschinenNachher = await page.locator('.maschine').count();
  // Die frische Maschine öffnet ihre Auswahl von selbst
  await page.locator('.maschine.offen .choice', { hasText: 'Kohle' }).first().click();
  await page.waitForTimeout(300);
  const zweite = (await page.locator('.maschine').nth(1).innerText()).replace(/\s+/g, ' ');
  await page.screenshot({ path: shot('04-wagen.png') });
  const maschinenGebaut = maschinenNachher === maschinenVorher + 1 && /Kohle/.test(zweite) && /\d+\/min/.test(zweite);

  // Pausieren nimmt den Auftrag weg, nicht die Maschine. Sonst wäre sie neu zu bezahlen.
  await page.getByRole('button', { name: /Erntemaschine 2 pausieren/ }).click();
  await page.waitForTimeout(300);
  const nachPause = (await page.locator('.maschine').nth(1).innerText()).replace(/\s+/g, ' ');
  const pausiert = (await page.locator('.maschine').count()) === maschinenNachher && /pausiert/.test(nachPause);

  // Die Bühne bleibt sichtbar, während der Wagen ausgeklappt ist
  const buehne = await page.locator('section.stage').boundingBox();
  const buehneFrei = Boolean(buehne && buehne.y >= 0 && buehne.height > 100);
  // Nochmals auf den Wagen tippen klappt ihn wieder zu, und die Bühne zeigt wieder den Zug
  await page.getByRole('button', { name: /Erntewagen/ }).first().click();
  await page.waitForTimeout(300);
  const zugeklappt = (await page.locator('.ausklapp').count()) === 0;
  const fokusZurueck = await page.locator('section.stage').getAttribute('data-focus');
  const buehneFokus = fokusVorher === 'zug' && fokusWagen === 'wagen' && fokusZurueck === 'zug';

  // Die Lok antippen fährt die Kamera an sie heran und öffnet die Strecke
  await page.getByRole('button', { name: /^Dampflok$/ }).first().click();
  await page.waitForTimeout(400);
  const lokOeffnetStrecke =
    (await page.locator('nav.tabs button.active').innerText()).trim() === 'Strecke' && (await page.locator('section.stage').getAttribute('data-focus')) === 'lok';
  await page.getByRole('button', { name: 'Zug', exact: true }).click();
  await page.waitForTimeout(300);

  // Auf der Wagenkarte muss die zweite Maschine sichtbar werden
  const karte = (await page.locator('.wagon').first().innerText()).replace(/\s+/g, ' ');
  const karteZeigtMaschinen = /2\/\d+/.test(karte);

  await page.locator('section.list button.add').click();
  await page.waitForTimeout(300);
  await page.screenshot({ path: shot('05-bauen.png') });
  // Nichts darf über den Rand hinausragen, auch nicht ausgeklappt
  const ausklappPasst = await page.evaluate(() => {
    const el = document.querySelector('.ausklapp');
    return el ? el.scrollWidth <= el.clientWidth + 1 : false;
  });
  await page.locator('section.list button.add').click();
  await page.waitForTimeout(200);

  // Forschung: Mehrere Technologien lassen sich hintereinander einreihen
  await page.getByRole('button', { name: 'Forschung', exact: true }).click();
  await page.waitForTimeout(300);
  const techEintrag = (name) =>
    page.locator('.entry').filter({ has: page.locator('.title', { hasText: new RegExp(`^${name}`) }) }).first();
  const ersterKnopf = (await techEintrag('Selbstlader').getByRole('button').innerText()).trim();
  await techEintrag('Selbstlader').getByRole('button').click();
  await page.waitForTimeout(200);
  const zweiterKnopf = (await techEintrag('Schmelzwagen').getByRole('button').innerText()).trim();
  await techEintrag('Schmelzwagen').getByRole('button').click();
  await page.waitForTimeout(300);
  const forschung = (await page.locator('.card.running').innerText()).replace(/\s+/g, ' ');
  const eingereiht = ersterKnopf === 'Forschen' && zweiterKnopf === 'Einreihen' && /DANACH · 1 VON \d+/i.test(forschung) && /Schmelzwagen/.test(forschung);
  await page.screenshot({ path: shot('06-forschung.png') });
  await page.getByRole('button', { name: 'Strecke', exact: true }).click();
  await page.screenshot({ path: shot('07-strecke.png'), fullPage: true });

  await page.waitForTimeout(3000);
  await page.reload();
  await page.getByRole('group', { name: 'Wagen des Zuges' }).waitFor({ timeout: 15000 });
  await page.getByRole('button', { name: 'Mehr', exact: true }).click();
  const spielzeit = await page.getByText(/Spielzeit:/).innerText();
  await page.screenshot({ path: shot('08-mehr.png'), fullPage: true });

  // Konto: Der Bereich ist da, aber ohne Anmeldung bleibt Firebase ungeladen
  await page.getByRole('button', { name: 'Mit Google anmelden' }).waitFor({ timeout: 10000 });
  const firebaseGeladen = await page.evaluate(() =>
    performance.getEntriesByType('resource').some((entry) => /firebase|index\.esm/.test(entry.name)),
  );
  await page.screenshot({ path: shot('09-konto.png'), clip: { x: 0, y: 0, width: 400, height: 620 } });

  // Rückkehr: Spielstand um drei Stunden zurückdatieren und mit Vorräten ausstatten
  const prepared = await page.evaluate(async () => {
    const read = () =>
      new Promise((resolve, reject) => {
        const open = indexedDB.open('keyval-store');
        open.onerror = () => reject(open.error);
        open.onsuccess = () => {
          const tx = open.result.transaction('keyval', 'readwrite');
          const store = tx.objectStore('keyval');
          const get = store.get('loco/save');
          get.onsuccess = () => {
            const save = JSON.parse(get.result);
            save.lastSavedAt = Date.now() - 3 * 3600 * 1000;
            save.store.schienen = 600;
            save.store.kohle = 600;
            save.techs.done = ['selbstlader'];
            store.put(JSON.stringify(save), 'loco/save');
            tx.oncomplete = () => resolve(true);
          };
          get.onerror = () => reject(get.error);
        };
      });
    return read();
  });
  if (!prepared) throw new Error('Spielstand liess sich nicht vorbereiten.');

  await page.reload();
  await page.getByText('Der Zug ist gefahren').waitFor({ timeout: 15000 });
  await page.screenshot({ path: shot('10-rueckkehr.png') });
  await page.getByRole('dialog', { name: 'Während du weg warst' }).waitFor({ timeout: 15000 });
  await page.waitForTimeout(300);
  await page.screenshot({ path: shot('11-bericht.png'), fullPage: true });
  const bericht = (await page.getByRole('dialog', { name: 'Während du weg warst' }).innerText()).replace(/\s+/g, ' ');
  await page.getByRole('button', { name: 'Weiter', exact: true }).click();
  await page.getByRole('group', { name: 'Wagen des Zuges' }).waitFor({ timeout: 15000 });
  const nachRueckkehr = (await page.locator('.readout').innerText()).replace(/\s+/g, ' ');

  // Meilenstein: vor der Schlucht stehen, Brücke braucht nur noch den letzten Träger
  await page.evaluate(async () => {
    await new Promise((resolve, reject) => {
      const open = indexedDB.open('keyval-store');
      open.onerror = () => reject(open.error);
      open.onsuccess = () => {
        const tx = open.result.transaction('keyval', 'readwrite');
        const store = tx.objectStore('keyval');
        const get = store.get('loco/save');
        get.onsuccess = () => {
          const save = JSON.parse(get.result);
          save.lastSavedAt = Date.now();
          save.pos = 2400;
          save.km = 24;
          save.stop = 'hindernis';
          save.discoveredBiomes = ['tal', 'wald'];
          save.reachedObstacles = ['schlucht'];
          save.techs.done = ['selbstlader', 'schmelzwagen', 'werkwagen', 'walzwagen', 'stahlwerk', 'teerofen', 'brueckenbau'];
          save.store.stahltraeger = 40;
          save.store.schienen = 400;
          save.store.kohle = 400;
          save.projects.bruecke = { delivered: { stahltraeger: 200, bohlen: 600, nieten: 800, teer: 80 }, done: false, paused: false, doneAt: null };
          store.put(JSON.stringify(save), 'loco/save');
          tx.oncomplete = () => resolve(true);
        };
        get.onerror = () => reject(get.error);
      };
    });
  });

  await page.reload();
  await page.getByRole('group', { name: 'Wagen des Zuges' }).waitFor({ timeout: 15000 });
  await page.getByText('Geschafft').waitFor({ timeout: 15000 });
  await page.waitForTimeout(1200);
  await page.screenshot({ path: shot('12-meilenstein.png') });
  const banner = (await page.locator('.milestone').innerText()).replace(/\s+/g, ' ');
  await page.locator('.milestone').click();
  await page.waitForTimeout(2500);
  await page.screenshot({ path: shot('13-buehne.png') });
  const unterwegs = (await page.locator('.readout').innerText()).replace(/\s+/g, ' ');

  const gefeiert = /Brücke über die Schlucht/.test(banner);
  const faehrt = /fährt/.test(unterwegs);
  const harvested = Number.parseInt(eisen.split(' ')[2] ?? '0', 10);
  const persisted = /Spielzeit: (?!0 s)/.test(spielzeit);
  const gefahren = /6,0 km gefahren/.test(bericht);
  const gewarnt = /Schienen alle/.test(bericht);
  // Jeder Bildschirm muss seinen Inhalt erreichbar machen: Das Gerüst hält Kopf und
  // Leiste fest, gescrollt wird innen. Bricht das, ist Inhalt unerreichbar.
  // Die Bühne steht auf jedem Register ausser «Mehr» fest oben
  const scrollbar = {};
  const buehneJeZiel = {};
  for (const ziel of ['Lager', 'Forschung', 'Strecke', 'Mehr', 'Werkstatt']) {
    await page.getByRole('button', { name: ziel, exact: true }).click();
    await page.waitForTimeout(300);
    buehneJeZiel[ziel] = await page.locator('section.stage').count();
    const bereich = page.locator('.scrollbereich, .liste').first();
    const mass = await bereich.evaluate((el) => ({ scroll: el.scrollHeight, sicht: el.clientHeight }));
    if (mass.scroll > mass.sicht + 4) {
      await bereich.evaluate((el) => el.scrollTo(0, el.scrollHeight));
      await page.waitForTimeout(200);
      scrollbar[ziel] = (await bereich.evaluate((el) => el.scrollTop)) > 10;
    } else {
      scrollbar[ziel] = true;
    }
  }
  const leiste = await page.locator('nav.tabs').boundingBox();
  const leisteSichtbar = Boolean(leiste && leiste.y + leiste.height <= 861);
  await page.getByRole('button', { name: 'Zug', exact: true }).click();

  // Spielstände aus der Zeit als «Linie Null» müssen weiterlaufen
  await page.evaluate(async () => {
    await new Promise((resolve, reject) => {
      const open = indexedDB.open('keyval-store');
      open.onerror = () => reject(open.error);
      open.onsuccess = () => {
        const tx = open.result.transaction('keyval', 'readwrite');
        const store = tx.objectStore('keyval');
        store.put(
          // Alte Form: mehrere Wagen desselben Typs, je ein Auftrag. Daraus muss ein Wagen mit Maschinen werden.
          JSON.stringify({
            version: 1,
            playedSeconds: 4242,
            pos: 1234,
            lastSavedAt: Date.now(),
            store: { kohle: 77 },
            techs: { done: ['selbstlader', 'schmelzwagen'], current: null },
            wagons: [
              { id: 1, type: 'ernte', level: 2, resource: 'eisenerz' },
              { id: 2, type: 'ernte', level: 1, resource: 'kohle' },
              { id: 3, type: 'schmelz', level: 1, recipe: 'koks' },
            ],
          }),
          'linie-null/save',
        );
        store.delete('loco/save');
        store.delete('loco/save/backup');
        tx.oncomplete = () => resolve(true);
      };
    });
  });
  await page.reload();
  await page.getByRole('group', { name: 'Wagen des Zuges' }).waitFor({ timeout: 15000 });
  await page.waitForTimeout(1200);
  const nachMigration = (await page.locator('.readout').innerText()).replace(/\s+/g, ' ');
  const schluessel = await page.evaluate(
    () =>
      new Promise((resolve) => {
        const open = indexedDB.open('keyval-store');
        open.onsuccess = () => {
          const alle = open.result.transaction('keyval', 'readonly').objectStore('keyval').getAllKeys();
          alle.onsuccess = () => resolve(alle.result);
        };
      }),
  );
  // Aus zwei Erntewagen wird ein Erntewagen mit zwei Maschinen, die Stufe ist die höhere
  const zugNachMigration = (await page.locator('.wagon').first().innerText()).replace(/\s+/g, ' ');
  const migriert =
    /12,3 km/.test(nachMigration) &&
    schluessel.includes('loco/save') &&
    !schluessel.includes('linie-null/save') &&
    /Stufe 2/.test(zugNachMigration) &&
    /2\/\d+/.test(zugNachMigration);

  const offline = cloudRequests.length === 0 && !firebaseGeladen;
  const alleScrollen = Object.values(scrollbar).every(Boolean) && leisteSichtbar;
  const buehneUeberall = buehneJeZiel['Lager'] === 1 && buehneJeZiel['Forschung'] === 1 && buehneJeZiel['Strecke'] === 1 && buehneJeZiel['Werkstatt'] === 1 && buehneJeZiel['Mehr'] === 0;
  const kette = kettenKnopf === '+2' && /Koks/.test(queue) && /Eisenbarren/.test(queue);
  console.log(JSON.stringify({ errors, ladezeitMs: ladezeit, ohneKontoOffline: offline, cloudRequests: cloudRequests.slice(0, 3), eisen, kettenKnopf, knopfWandert, beschriftet, zutatName, ergebnisName, maschinenGebaut, pausiert, nachPause, buehneFrei, zugeklappt, ausklappPasst, karte, eingereiht, forschung, queue, spielzeit, bericht: bericht.slice(0, 400), nachRueckkehr, banner, unterwegs, nachMigration, zugNachMigration, scrollbar, leisteSichtbar, buehneFokus, lokOeffnetStrecke, buehneJeZiel }, null, 2));
  // Erfolgskriterium aus Abschnitt 15.3 des Konzepts: unter zwei Sekunden bis zum ersten Bild
  const schnell = ladezeit < 2000;
  if (errors.length > 0 || !(harvested > 0) || !kette || knopfWandert > 1 || !persisted || !gefahren || !gewarnt || !gefeiert || !faehrt || !schnell || !offline || !migriert || !alleScrollen || !beschriftet || !maschinenGebaut || !karteZeigtMaschinen || !pausiert || !eingereiht || !buehneFrei || !zugeklappt || !ausklappPasst || !buehneFokus || !lokOeffnetStrecke || !buehneUeberall) {
    console.error('Smoke-Test fehlgeschlagen.', { harvested, persisted, gefahren, gewarnt, gefeiert, faehrt, ladezeit, offline, migriert, kette, knopfWandert, alleScrollen, beschriftet, maschinenGebaut, karteZeigtMaschinen, pausiert, eingereiht, buehneFrei, zugeklappt, ausklappPasst, buehneFokus, lokOeffnetStrecke, buehneUeberall });
    process.exitCode = 1;
  } else {
    console.log('Smoke-Test bestanden.');
  }
} catch (error) {
  console.error('Smoke-Test abgebrochen:', error);
  process.exitCode = 1;
} finally {
  await browser.close();
}
