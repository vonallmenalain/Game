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
page.on('pageerror', (error) => errors.push(`pageerror: ${error}`));
page.on('console', (message) => {
  if (message.type() === 'error') errors.push(`console: ${message.text()}`);
});

try {
  await page.goto(base);
  await page.getByText('Wagen anhängen').waitFor({ timeout: 15000 });
  await page.screenshot({ path: shot('01-zug.png') });

  const crank = page.getByRole('button', { name: /Kurbeln/ }).first();
  for (let i = 0; i < 6; i += 1) {
    await crank.click();
    await page.waitForTimeout(1000);
  }
  await page.waitForTimeout(1500);

  await page.getByRole('button', { name: 'Lager', exact: true }).click();
  await page.screenshot({ path: shot('02-lager.png') });
  const eisen = (await page.locator('div.row', { hasText: 'Eisenerz' }).first().innerText()).replace(/\s+/g, ' ');

  await page.getByRole('button', { name: 'Zug', exact: true }).click();
  await page.getByRole('button', { name: 'Werkstatt', exact: true }).first().click();
  await page.getByRole('button', { name: /Kohle schaufeln/ }).click();
  await page.getByRole('button', { name: '+1' }).first().click();
  await page.waitForTimeout(600);
  await page.screenshot({ path: shot('03-werkstatt.png') });
  const queue = (await page.locator('.queue').innerText().catch(() => 'keine Warteschlange')).replace(/\s+/g, ' ');
  await page.getByRole('button', { name: 'Schliessen' }).click();

  await page.getByRole('button', { name: /Erntewagen/ }).first().click();
  await page.waitForTimeout(300);
  await page.screenshot({ path: shot('04-wagen.png') });
  await page.getByRole('button', { name: 'Schliessen' }).click();

  await page.getByRole('button', { name: /Wagen anhängen, \d+ frei/ }).click();
  await page.waitForTimeout(300);
  await page.screenshot({ path: shot('05-bauen.png') });
  await page.getByRole('button', { name: 'Schliessen' }).click();

  await page.getByRole('button', { name: 'Forschung', exact: true }).click();
  await page.screenshot({ path: shot('06-forschung.png') });
  await page.getByRole('button', { name: 'Strecke', exact: true }).click();
  await page.screenshot({ path: shot('07-strecke.png'), fullPage: true });

  await page.waitForTimeout(3000);
  await page.reload();
  await page.getByText('Wagen anhängen').waitFor({ timeout: 15000 });
  await page.getByRole('button', { name: 'Mehr', exact: true }).click();
  const spielzeit = await page.getByText(/Spielzeit:/).innerText();
  await page.screenshot({ path: shot('08-mehr.png') });

  // Rückkehr: Spielstand um drei Stunden zurückdatieren und mit Vorräten ausstatten
  const prepared = await page.evaluate(async () => {
    const read = () =>
      new Promise((resolve, reject) => {
        const open = indexedDB.open('keyval-store');
        open.onerror = () => reject(open.error);
        open.onsuccess = () => {
          const tx = open.result.transaction('keyval', 'readwrite');
          const store = tx.objectStore('keyval');
          const get = store.get('linie-null/save');
          get.onsuccess = () => {
            const save = JSON.parse(get.result);
            save.lastSavedAt = Date.now() - 3 * 3600 * 1000;
            save.store.schienen = 600;
            save.store.kohle = 600;
            save.techs.done = ['selbstlader'];
            store.put(JSON.stringify(save), 'linie-null/save');
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
  await page.screenshot({ path: shot('09-rueckkehr.png') });
  await page.getByRole('dialog', { name: 'Während du weg warst' }).waitFor({ timeout: 15000 });
  await page.waitForTimeout(300);
  await page.screenshot({ path: shot('10-bericht.png'), fullPage: true });
  const bericht = (await page.getByRole('dialog', { name: 'Während du weg warst' }).innerText()).replace(/\s+/g, ' ');
  await page.getByRole('button', { name: 'Weiter', exact: true }).click();
  await page.getByText('Wagen anhängen').waitFor({ timeout: 15000 });
  const nachRueckkehr = await page.locator('header.status').innerText();

  const harvested = Number.parseInt(eisen.split(' ')[2] ?? '0', 10);
  const persisted = /Spielzeit: (?!0 s)/.test(spielzeit);
  const gefahren = /6,0 km gefahren/.test(bericht);
  const gewarnt = /Schienen alle/.test(bericht);
  console.log(JSON.stringify({ errors, eisen, queue, spielzeit, bericht: bericht.slice(0, 400), nachRueckkehr: nachRueckkehr.replace(/\s+/g, ' ') }, null, 2));
  if (errors.length > 0 || !(harvested > 0) || !queue.includes('Koks') || !persisted || !gefahren || !gewarnt) {
    console.error('Smoke-Test fehlgeschlagen.', { harvested, persisted, gefahren, gewarnt });
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
