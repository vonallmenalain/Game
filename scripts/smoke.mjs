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

/** Den Spielstand im Browser umschreiben, wie ein Spieltester es mit der Konsole täte */
async function patchSave(patch) {
  await page.evaluate(async (fn) => {
    const apply = new Function('save', fn);
    await new Promise((resolve, reject) => {
      const open = indexedDB.open('keyval-store');
      open.onerror = () => reject(open.error);
      open.onsuccess = () => {
        const tx = open.result.transaction('keyval', 'readwrite');
        const store = tx.objectStore('keyval');
        const get = store.get('loco/save');
        get.onsuccess = () => {
          const save = JSON.parse(get.result);
          apply(save);
          store.put(JSON.stringify(save), 'loco/save');
          tx.oncomplete = () => resolve(true);
        };
        get.onerror = () => reject(get.error);
      };
    });
  }, patch);
}

const text = async (locator) => (await locator.innerText()).replace(/\s+/g, ' ').trim();

try {
  const started = Date.now();
  await page.goto(base);
  await page.getByRole('group', { name: 'Wagen des Zuges' }).waitFor({ timeout: 15000 });
  const ladezeit = Date.now() - started;
  await page.screenshot({ path: shot('01-zug.png') });

  // Der Zug-Bildschirm zeigt gleich den ersten Wagen, mit der Kurbel im Kopf
  const crank = page.getByRole('button', { name: /^Kurbeln/ }).first();
  for (let i = 0; i < 6; i += 1) {
    await crank.click();
    await page.waitForTimeout(1000);
  }
  await page.waitForTimeout(1500);

  await page.getByRole('button', { name: 'Lager', exact: true }).click();
  await page.screenshot({ path: shot('02-lager.png') });
  const eisen = await text(page.locator('div.row', { hasText: 'Eisenerz' }).first());

  await page.getByRole('button', { name: 'Werkstatt', exact: true }).click();
  await page.getByRole('button', { name: /Kohle schaufeln/ }).click();

  // Karte über den Rezeptnamen suchen, nicht über irgendeinen Text darin:
  // Die Zutaten tragen inzwischen selbst ihre Namen.
  const rezeptKarte = (name) =>
    page.locator('.rezept').filter({ has: page.locator('.zeile .name', { hasText: new RegExp(`^${name}$`) }) }).first();
  // innerText liefert die Kopfzeile in Grossbuchstaben, wie sie das CSS setzt
  const bankZahl = async () => Number.parseInt((await text(page.locator('.werkbank .eyebrow'))).match(/(\d+)\s*\/\s*(\d+)/)?.[1] ?? '0', 10);
  const bankMax = Number.parseInt((await text(page.locator('.werkbank .eyebrow'))).match(/\/\s*(\d+)/)?.[1] ?? '0', 10);

  // Kette: Eisenbarren braucht Koks. Antippen muss Koks von selbst voranstellen.
  const eisenbarren = rezeptKarte('Eisenbarren');
  const kettenKnopf = await text(eisenbarren.locator('.zeile').getByRole('button'));
  await eisenbarren.locator('.zeile').getByRole('button').click();
  await page.waitForTimeout(300);
  const queue = await text(page.locator('.werkbank'));

  // Der Knopf darf nicht wandern, wenn die Warteschlange wächst
  const koksRezept = rezeptKarte('Koks');
  const koksKnopf = koksRezept.locator('.zeile').getByRole('button');
  const knopfVorher = await koksKnopf.boundingBox();
  await koksKnopf.click();
  await page.waitForTimeout(250);
  await koksKnopf.click();
  await page.waitForTimeout(250);
  const knopfNachher = await koksKnopf.boundingBox();
  const knopfWandert = Math.abs((knopfVorher?.y ?? 0) - (knopfNachher?.y ?? 0));

  // Menge je Tipp: ×5 reiht fünf Aufträge auf einmal ein
  const vorMenge = await bankZahl();
  await page.locator('.menge').getByRole('button', { name: '×5', exact: true }).click();
  await page.waitForTimeout(150);
  const fuenferKnopf = await text(koksKnopf);
  await koksKnopf.click();
  await page.waitForTimeout(250);
  const nachMenge = await bankZahl();
  await page.locator('.menge').getByRole('button', { name: '×1', exact: true }).click();
  const menge = fuenferKnopf === '+5' && nachMenge === vorMenge + 5 && bankMax === 100;

  // Zutaten und Ergebnis sind beschriftet, und auch das Ergebnis zeigt seinen Bestand.
  const koksFluss = koksRezept.locator('.flow');
  const zutatName = await text(koksFluss.locator('.chip').first().locator('.label'));
  const ergebnisName = await text(koksFluss.locator('.chip').last().locator('.label'));
  const ergebnisBestand = await koksFluss.locator('.chip').last().locator('.have').count();
  const beschriftet = zutatName === 'Kohle' && ergebnisName === 'Koks' && ergebnisBestand === 1;

  // Der Filter zeigt nur die Rezepte eines Wagens
  await page.locator('.filter').getByRole('button', { name: /Werk$/ }).click();
  await page.waitForTimeout(200);
  const gefiltert = (await page.locator('.gruppe h3').count()) === 1 && (await text(page.locator('.gruppe h3'))) === 'Werkwagen';
  await page.locator('.filter').getByRole('button', { name: 'Alle' }).click();
  await page.screenshot({ path: shot('03-werkstatt.png') });

  // Eine Ware antippen öffnet ihre Übersicht unter der Bühne, die Bühne bleibt frei
  await koksFluss.locator('.chip').first().click();
  const sheet = page.getByRole('dialog', { name: /Kohle: Übersicht/ });
  await sheet.waitFor({ timeout: 5000 });
  const sheetText = await text(sheet);
  const buehneBeiSheet = await page.locator('section.stage').boundingBox();
  const sheetBox = await sheet.locator('.karte').boundingBox();
  await page.screenshot({ path: shot('04-ware.png') });
  const popup =
    /im lager/i.test(sheetText) &&
    /herstellung/i.test(sheetText) &&
    /verbrauch/i.test(sheetText) &&
    /wofür/i.test(sheetText) &&
    /Koks/.test(sheetText) &&
    Boolean(buehneBeiSheet && sheetBox && sheetBox.y >= buehneBeiSheet.y + buehneBeiSheet.height - 1);
  await sheet.getByRole('button', { name: 'Schliessen', exact: true }).click();
  await page.waitForTimeout(200);
  const popupZu = (await page.getByRole('dialog').count()) === 0;

  // Material für den Ausbau ins Lager legen, sonst bleibt der Knopf aus.
  // Vorher speichern lassen: Sonst geht beim Neuladen verloren, was bisher gespielt wurde.
  await page.evaluate(() => window.dispatchEvent(new Event('pagehide')));
  await page.waitForTimeout(400);
  await patchSave('save.store.zahnrad = 40; save.store.bretter = 60; save.store.bp_eisen = 20;');
  await page.reload();
  await page.getByRole('group', { name: 'Wagen des Zuges' }).waitFor({ timeout: 15000 });
  await page.getByRole('button', { name: 'Zug', exact: true }).click();
  // Ohne Wahl zeigt die Bühne den ganzen Zug; ein Wagen auf der Bühne holt sich die Kamera
  const fokusVorher = await page.locator('section.stage').getAttribute('data-focus');
  await page.locator('.train').getByRole('button', { name: /Erntewagen/ }).click();
  await page.waitForTimeout(300);
  const fokusWagen = await page.locator('section.stage').getAttribute('data-focus');

  // Maschinen je Ware: Eine zweite Erntemaschine bauen und sie mit Plus der Kohle zuteilen.
  const kopfVorher = await text(page.locator('.maschinen'));
  await page.getByRole('button', { name: /Erntemaschine bauen/ }).click();
  await page.waitForTimeout(300);
  const kopfGebaut = await text(page.locator('.maschinen'));
  const kohleKarte = page.locator('[data-produkt="kohle"]');
  await kohleKarte.getByRole('button', { name: /Eine Maschine mehr für Kohle/ }).click();
  await page.waitForTimeout(400);
  const kohleText = await text(kohleKarte);
  const kopfZugeteilt = await text(page.locator('.maschinen'));
  await page.screenshot({ path: shot('05-wagen.png') });
  const maschinenZugeteilt =
    /1 von \d+ · 0 frei/.test(kopfVorher) &&
    /2 von \d+ · 1 frei/.test(kopfGebaut) &&
    /2 von \d+ · 0 frei/.test(kopfZugeteilt) &&
    /\d+\/min/.test(kohleText) &&
    (await text(kohleKarte.locator('.anzahl'))) === '1';

  // Minus nimmt den Auftrag weg, die Maschine bleibt frei im Wagen
  await kohleKarte.getByRole('button', { name: /Eine Maschine weniger für Kohle/ }).click();
  await page.waitForTimeout(300);
  const wiederFrei = /2 von \d+ · 1 frei/.test(await text(page.locator('.maschinen'))) && (await text(kohleKarte.locator('.anzahl'))) === '0';

  // Die Bühne bleibt sichtbar, während der Wagen gezeigt wird
  const buehne = await page.locator('section.stage').boundingBox();
  const buehneFrei = Boolean(buehne && buehne.y >= 0 && buehne.height > 100);

  // Die Wagenleiste wechselt zwischen Wagen und «Anhängen»; die Bühne folgt
  await page.locator('.chips [data-chip="bauen"]').click();
  await page.waitForTimeout(300);
  const bauenOffen = (await page.locator('.panel h2').count()) === 1 && (await text(page.locator('.panel h2'))) === 'Wagen anhängen';
  const fokusBauen = await page.locator('section.stage').getAttribute('data-focus');
  await page.screenshot({ path: shot('06-anhaengen.png') });
  // Nichts darf über den Rand hinausragen
  const panelPasst = await page.evaluate(() => {
    const el = document.querySelector('.panel');
    return el ? el.scrollWidth <= el.clientWidth + 1 : false;
  });
  await page.locator('.chips [data-chip="1"]').click();
  await page.waitForTimeout(300);
  const fokusZurueck = await page.locator('section.stage').getAttribute('data-focus');
  const leisteWechselt = bauenOffen && fokusBauen === 'zug' && fokusZurueck === 'wagen' && (await page.locator('.produkte').count()) === 1;
  const buehneFokus = fokusVorher === 'zug' && fokusWagen === 'wagen';
  // Die Leiste zeigt je Wagen die Maschinen
  const leisteZeigtMaschinen = /2\/\d+/.test(await text(page.locator('.chips [data-chip="1"]')));

  // Die Lok antippen fährt die Kamera an sie heran und öffnet die Strecke
  await page.locator('.train').getByRole('button', { name: /^Dampflok$/ }).click();
  await page.waitForTimeout(400);
  const lokOeffnetStrecke =
    (await text(page.locator('nav.tabs button.active'))) === 'Strecke' && (await page.locator('section.stage').getAttribute('data-focus')) === 'lok';
  await page.getByRole('button', { name: 'Zug', exact: true }).click();
  await page.waitForTimeout(300);

  // Forschung: Der Baum zeigt Kanten, die Karte unten nimmt den Knopf; mehrere Technologien reihen sich ein
  await page.getByRole('button', { name: 'Forschung', exact: true }).click();
  await page.waitForTimeout(400);
  const kanten = await page.locator('.kanten path').count();
  await page.locator('[data-tech="selbstlader"]').click();
  await page.waitForTimeout(200);
  const ersterKnopf = await text(page.locator('.detail .aktion').getByRole('button'));
  const detailName = await text(page.locator('.detail h3'));
  await page.locator('.detail .aktion').getByRole('button').click();
  await page.waitForTimeout(200);
  await page.locator('[data-tech="schmelzwagen"]').click();
  await page.waitForTimeout(200);
  const zweiterKnopf = await text(page.locator('.detail .aktion').getByRole('button'));
  await page.locator('.detail .aktion').getByRole('button').click();
  await page.waitForTimeout(300);
  const forschung = await text(page.locator('.laufend'));
  const knotenStand = await page.locator('[data-tech="schmelzwagen"]').getAttribute('class');
  await page.screenshot({ path: shot('07-forschung.png') });
  const eingereiht =
    ersterKnopf === 'Forschen' &&
    detailName === 'Selbstlader' &&
    zweiterKnopf === 'Einreihen' &&
    /läuft selbstlader/i.test(forschung) &&
    /Danach: Schmelzwagen/.test(forschung) &&
    /eingereiht/.test(knotenStand ?? '');
  const baum = kanten >= 20 && (await page.locator('.node').count()) === 20;
  await page.getByRole('button', { name: 'Strecke', exact: true }).click();
  await page.screenshot({ path: shot('08-strecke.png'), fullPage: true });

  await page.waitForTimeout(3000);
  await page.reload();
  await page.getByRole('group', { name: 'Wagen des Zuges' }).waitFor({ timeout: 15000 });
  await page.getByRole('button', { name: 'Mehr', exact: true }).click();
  const spielzeit = await page.getByText(/Spielzeit:/).innerText();
  await page.screenshot({ path: shot('09-mehr.png'), fullPage: true });

  // Konto: Der Bereich ist da, aber ohne Anmeldung bleibt Firebase ungeladen
  await page.getByRole('button', { name: 'Mit Google anmelden' }).waitFor({ timeout: 10000 });
  const firebaseGeladen = await page.evaluate(() =>
    performance.getEntriesByType('resource').some((entry) => /firebase|index\.esm/.test(entry.name)),
  );
  await page.screenshot({ path: shot('10-konto.png'), clip: { x: 0, y: 0, width: 400, height: 620 } });

  // Rückkehr: Spielstand um drei Stunden zurückdatieren und mit Vorräten ausstatten
  await patchSave(`
    save.lastSavedAt = Date.now() - 3 * 3600 * 1000;
    save.store.schienen = 600;
    save.store.kohle = 600;
    save.techs.done = ['selbstlader'];
    save.techs.current = null;
    save.techs.queue = [];
  `);

  await page.reload();
  await page.getByText('Der Zug ist gefahren').waitFor({ timeout: 15000 });
  await page.screenshot({ path: shot('11-rueckkehr.png') });
  await page.getByRole('dialog', { name: 'Während du weg warst' }).waitFor({ timeout: 15000 });
  await page.waitForTimeout(300);
  await page.screenshot({ path: shot('12-bericht.png'), fullPage: true });
  const bericht = await text(page.getByRole('dialog', { name: 'Während du weg warst' }));
  await page.getByRole('button', { name: 'Weiter', exact: true }).click();
  await page.getByRole('group', { name: 'Wagen des Zuges' }).waitFor({ timeout: 15000 });
  const nachRueckkehr = await text(page.locator('.readout'));

  // Meilenstein: vor der Schlucht stehen, Brücke braucht nur noch den letzten Träger
  await patchSave(`
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
  `);

  await page.reload();
  await page.getByRole('group', { name: 'Wagen des Zuges' }).waitFor({ timeout: 15000 });
  await page.getByText('Geschafft').waitFor({ timeout: 15000 });
  await page.waitForTimeout(1200);
  await page.screenshot({ path: shot('13-meilenstein.png') });
  const banner = await text(page.locator('.milestone'));
  await page.locator('.milestone').click();
  await page.waitForTimeout(2500);
  await page.screenshot({ path: shot('14-buehne.png') });
  const unterwegs = await text(page.locator('.readout'));

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
  for (const ziel of ['Lager', 'Forschung', 'Strecke', 'Mehr', 'Werkstatt', 'Zug']) {
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
  const nachMigration = await text(page.locator('.readout'));
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
  const zugNachMigration = await text(page.locator('section.zug'));
  const migriert =
    /12,3 km/.test(nachMigration) &&
    schluessel.includes('loco/save') &&
    !schluessel.includes('linie-null/save') &&
    /Stufe 2/.test(zugNachMigration) &&
    /2\/\d+/.test(await text(page.locator('.chips [data-chip="1"]'))) &&
    (await page.locator('.chips [role="tab"]').count()) === 3;

  const offline = cloudRequests.length === 0 && !firebaseGeladen;
  const alleScrollen = Object.values(scrollbar).every(Boolean) && leisteSichtbar;
  const buehneUeberall =
    buehneJeZiel['Lager'] === 1 && buehneJeZiel['Forschung'] === 1 && buehneJeZiel['Strecke'] === 1 && buehneJeZiel['Werkstatt'] === 1 && buehneJeZiel['Zug'] === 1 && buehneJeZiel['Mehr'] === 0;
  const kette = kettenKnopf === '+2' && /Koks/.test(queue) && /Eisenbarren/.test(queue);
  console.log(
    JSON.stringify(
      {
        errors,
        ladezeitMs: ladezeit,
        ohneKontoOffline: offline,
        cloudRequests: cloudRequests.slice(0, 3),
        eisen,
        kettenKnopf,
        knopfWandert,
        menge,
        fuenferKnopf,
        beschriftet,
        gefiltert,
        popup,
        popupZu,
        maschinenZugeteilt,
        kopfVorher,
        kopfGebaut,
        kopfZugeteilt,
        kohleText,
        wiederFrei,
        buehneFrei,
        leisteWechselt,
        panelPasst,
        buehneFokus,
        leisteZeigtMaschinen,
        lokOeffnetStrecke,
        eingereiht,
        baum,
        kanten,
        forschung,
        queue,
        spielzeit,
        bericht: bericht.slice(0, 400),
        nachRueckkehr,
        banner,
        unterwegs,
        nachMigration,
        zugNachMigration: zugNachMigration.slice(0, 160),
        scrollbar,
        leisteSichtbar,
        buehneJeZiel,
      },
      null,
      2,
    ),
  );
  // Erfolgskriterium aus Abschnitt 15.3 des Konzepts: unter zwei Sekunden bis zum ersten Bild
  const schnell = ladezeit < 2000;
  const checks = {
    harvested: harvested > 0,
    kette,
    knopfWandert: knopfWandert <= 1,
    menge,
    beschriftet,
    gefiltert,
    popup,
    popupZu,
    maschinenZugeteilt,
    wiederFrei,
    buehneFrei,
    leisteWechselt,
    panelPasst,
    buehneFokus,
    leisteZeigtMaschinen,
    lokOeffnetStrecke,
    eingereiht,
    baum,
    persisted,
    gefahren,
    gewarnt,
    gefeiert,
    faehrt,
    schnell,
    offline,
    migriert,
    alleScrollen,
    buehneUeberall,
    keineFehler: errors.length === 0,
  };
  const gescheitert = Object.entries(checks).filter(([, ok]) => !ok).map(([name]) => name);
  if (gescheitert.length > 0) {
    console.error('Smoke-Test fehlgeschlagen.', gescheitert);
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
