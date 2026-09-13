import { describe, expect, it } from 'vitest';
import {
  buildWagon,
  crank,
  detachWagon,
  moveWagon,
  queueWorkbench,
  setProjectPaused,
  setRecipe,
  setResource,
  shovelCoal,
  startResearch,
  upgradeWagon,
  wagonUpgradeCost,
} from './actions';
import { BALANCE } from './balance';
import { createInitialState, getStore, storeCap } from './state';
import { addWagon, grant, research } from './sim/testkit';

describe('Wagen bauen', () => {
  it('scheitert an gesperrtem Typ, fehlendem Material und vollem Zug', () => {
    const s = createInitialState();
    expect(buildWagon(s, 'schmelz')).toMatchObject({ ok: false, code: 'wagen_gesperrt' });
    const missing = buildWagon(s, 'ernte');
    expect(missing).toMatchObject({ ok: false, code: 'material_fehlt' });
    if (!missing.ok) expect(missing.missing).toEqual([{ item: 'fahrgestell', amount: 1 }, { item: 'zahnrad', amount: 6 }, { item: 'bretter', amount: 10 }]);
    grant(s, { fahrgestell: 10, zahnrad: 60, bretter: 100 });
    for (let i = 0; i < 7; i += 1) expect(buildWagon(s, 'ernte', { resource: 'kohle' }).ok).toBe(true);
    expect(s.wagons).toHaveLength(8);
    expect(buildWagon(s, 'ernte')).toMatchObject({ ok: false, code: 'kein_platz' });
    expect(getStore(s, 'fahrgestell')).toBe(3);
    expect(s.wagons[1]?.resource).toBe('kohle');
  });

  it('setzt bei Produktionswagen nur freigeschaltete, passende Rezepte', () => {
    const s = createInitialState();
    research(s, 'schmelzwagen');
    grant(s, { fahrgestell: 1, stein: 20, eisenbarren: 8 });
    expect(buildWagon(s, 'schmelz', { recipe: 'stahl' }).ok).toBe(true);
    expect(s.wagons[1]?.recipe).toBeNull();
    expect(setRecipe(s, 2, 'stahl')).toMatchObject({ ok: false, code: 'rezept_gesperrt' });
    expect(setRecipe(s, 2, 'schienen')).toMatchObject({ ok: false, code: 'rezept_falscher_wagen' });
    expect(setRecipe(s, 2, 'koks').ok).toBe(true);
    s.wagons[1]!.progress = 1;
    s.wagons[1]!.cycleActive = true;
    expect(setRecipe(s, 2, 'eisenbarren').ok).toBe(true);
    expect(s.wagons[1]?.progress).toBe(0);
    expect(s.wagons[1]?.cycleActive).toBe(false);
  });
});

describe('Aufstufen und Abkoppeln', () => {
  it('kostet Stufe mal Baukosten ohne Fahrgestell', () => {
    expect(wagonUpgradeCost('ernte', 2)).toEqual([{ item: 'zahnrad', amount: 12 }, { item: 'bretter', amount: 20 }]);
    const s = createInitialState();
    expect(upgradeWagon(s, 1)).toMatchObject({ ok: false, code: 'material_fehlt' });
    grant(s, { zahnrad: 12, bretter: 20 });
    expect(upgradeWagon(s, 1).ok).toBe(true);
    expect(s.wagons[0]?.level).toBe(2);
    expect(getStore(s, 'zahnrad')).toBe(0);
  });

  it('Lagerwagen sind nicht aufstufbar, Stufe 5 ist das Maximum', () => {
    const s = createInitialState();
    const lager = addWagon(s, 'lager');
    expect(upgradeWagon(s, lager.id)).toMatchObject({ ok: false, code: 'nicht_aufstufbar' });
    s.wagons[0]!.level = BALANCE.maxLevel;
    grant(s, { zahnrad: 100, bretter: 100 });
    expect(upgradeWagon(s, 1)).toMatchObject({ ok: false, code: 'stufe_max' });
  });

  it('Abkoppeln gibt die Hälfte der Baukosten zurück', () => {
    const s = createInitialState();
    expect(detachWagon(s, 1).ok).toBe(true);
    expect(s.wagons).toHaveLength(0);
    expect(getStore(s, 'zahnrad')).toBe(3);
    expect(getStore(s, 'bretter')).toBe(5);
    expect(getStore(s, 'fahrgestell')).toBe(0);
  });

  it('Umkoppeln ändert die Reihenfolge', () => {
    const s = createInitialState();
    addWagon(s, 'schmelz');
    addWagon(s, 'walz');
    expect(moveWagon(s, 3, 0).ok).toBe(true);
    expect(s.wagons.map((w) => w.type)).toEqual(['walz', 'ernte', 'schmelz']);
  });
});

describe('Erntewagen', () => {
  it('erntet nur entdeckte Rohstoffe', () => {
    const s = createInitialState();
    expect(setResource(s, 1, 'harz')).toMatchObject({ ok: false, code: 'rohstoff_unbekannt' });
    expect(setResource(s, 1, 'kohle').ok).toBe(true);
    s.discoveredBiomes.push('wald');
    expect(setResource(s, 1, 'harz').ok).toBe(true);
  });

  it('Handkurbel spannt höchstens 30 Sekunden vor, mit Selbstlader gibt sie zwei Stück', () => {
    const s = createInitialState();
    for (let i = 0; i < 10; i += 1) crank(s, 1);
    expect(s.wagons[0]?.crankUntil).toBe(BALANCE.crankMaxAheadSeconds);
    research(s, 'selbstlader');
    crank(s, 1);
    expect(getStore(s, 'eisenerz')).toBe(2);
  });

  it('Kohle schaufeln respektiert die Kapazität', () => {
    const s = createInitialState();
    s.store['kohle'] = storeCap(s) - 1;
    shovelCoal(s);
    shovelCoal(s);
    expect(getStore(s, 'kohle')).toBe(storeCap(s));
  });
});

describe('Forschung starten', () => {
  it('prüft Voraussetzungen, Biome, Blaupausen und laufende Forschung', () => {
    const s = createInitialState();
    expect(startResearch(s, 'schmelzwagen')).toMatchObject({ ok: false, code: 'voraussetzung_fehlt' });
    expect(startResearch(s, 'selbstlader')).toMatchObject({ ok: false, code: 'material_fehlt' });
    grant(s, { bp_eisen: 30 });
    expect(startResearch(s, 'selbstlader').ok).toBe(true);
    expect(getStore(s, 'bp_eisen')).toBe(27);
    expect(startResearch(s, 'erntetechnik1')).toMatchObject({ ok: false, code: 'forschung_laeuft' });
    s.techs.current = null;
    research(s, 'selbstlader', 'schmelzwagen');
    expect(startResearch(s, 'teerofen')).toMatchObject({ ok: false, code: 'voraussetzung_fehlt' });
    s.discoveredBiomes.push('wald');
    expect(startResearch(s, 'teerofen').ok).toBe(true);
    expect(startResearch(s, 'selbstlader')).toMatchObject({ ok: false, code: 'forschung_fertig' });
  });
});

describe('Werkbank und Baustellen', () => {
  it('Warteschlange ist auf zehn begrenzt und nimmt nur freigeschaltete Rezepte', () => {
    const s = createInitialState();
    expect(queueWorkbench(s, 'stahl')).toMatchObject({ ok: false, code: 'rezept_gesperrt' });
    for (let i = 0; i < 10; i += 1) expect(queueWorkbench(s, 'koks').ok).toBe(true);
    expect(queueWorkbench(s, 'koks')).toMatchObject({ ok: false, code: 'warteschlange_voll' });
  });

  it('Pausieren geht nur bei freigeschalteten Projekten', () => {
    const s = createInitialState();
    expect(setProjectPaused(s, 'bruecke', true)).toMatchObject({ ok: false, code: 'projekt_gesperrt' });
    research(s, 'brueckenbau');
    expect(setProjectPaused(s, 'bruecke', true).ok).toBe(true);
    expect(s.projects['bruecke']?.paused).toBe(true);
  });
});
