import { describe, expect, it } from 'vitest';
import {
  buildMachine,
  buildWagon,
  crank,
  detachWagon,
  machineBuildCost,
  moveWagon,
  queueWorkbench,
  removeMachine,
  setMachineRecipe,
  setMachineResource,
  setProjectPaused,
  shovelCoal,
  startResearch,
  upgradeWagon,
  wagonUpgradeCost,
} from './actions';
import { BALANCE } from './balance';
import { createInitialState, getStore, machineSlots, storeCap } from './state';
import { addMachine, addWagon, grant, research } from './sim/testkit';

describe('Wagen bauen', () => {
  it('scheitert an gesperrtem Typ, fehlendem Material und einem zweiten Wagen desselben Typs', () => {
    const s = createInitialState();
    expect(buildWagon(s, 'schmelz')).toMatchObject({ ok: false, code: 'wagen_gesperrt' });
    expect(buildWagon(s, 'ernte')).toMatchObject({ ok: false, code: 'wagen_schon_da' });
    research(s, 'schmelzwagen');
    const missing = buildWagon(s, 'schmelz');
    expect(missing).toMatchObject({ ok: false, code: 'material_fehlt' });
    // Zehn Stein liegen im Startlager, gemeldet wird nur die Fehlmenge
    if (!missing.ok) expect(missing.missing).toEqual([{ item: 'fahrgestell', amount: 1 }, { item: 'stein', amount: 10 }, { item: 'eisenbarren', amount: 8 }]);
    grant(s, { fahrgestell: 1, stein: 20, eisenbarren: 8 });
    expect(buildWagon(s, 'schmelz').ok).toBe(true);
    expect(s.wagons).toHaveLength(2);
    // Die erste Maschine steckt in den Baukosten
    expect(s.wagons[1]?.machines).toHaveLength(1);
    expect(buildWagon(s, 'schmelz')).toMatchObject({ ok: false, code: 'wagen_schon_da' });
  });

  it('setzt bei Produktionswagen nur freigeschaltete, passende Rezepte', () => {
    const s = createInitialState();
    research(s, 'schmelzwagen');
    grant(s, { fahrgestell: 1, stein: 20, eisenbarren: 8 });
    expect(buildWagon(s, 'schmelz', { recipe: 'stahl' }).ok).toBe(true);
    const w = s.wagons[1]!;
    const m = w.machines[0]!;
    expect(m.recipe).toBeNull();
    expect(setMachineRecipe(s, w.id, m.id, 'stahl')).toMatchObject({ ok: false, code: 'rezept_gesperrt' });
    expect(setMachineRecipe(s, w.id, m.id, 'schienen')).toMatchObject({ ok: false, code: 'rezept_falscher_wagen' });
    expect(setMachineRecipe(s, w.id, m.id, 'koks').ok).toBe(true);
    m.progress = 1;
    m.cycleActive = true;
    expect(setMachineRecipe(s, w.id, m.id, 'eisenbarren').ok).toBe(true);
    expect(m.progress).toBe(0);
    expect(m.cycleActive).toBe(false);
  });
});

describe('Maschinen bauen', () => {
  it('wird teurer, füllt den Wagen bis zum letzten Platz und lässt eine Maschine stehen', () => {
    const s = createInitialState();
    const w = s.wagons[0]!;
    // Die n-te Maschine kostet das n-fache der Grundkosten
    expect(machineBuildCost('ernte', 2)).toEqual([{ item: 'zahnrad', amount: 8 }, { item: 'bretter', amount: 12 }]);
    expect(machineBuildCost('ernte', 10)).toEqual([{ item: 'zahnrad', amount: 40 }, { item: 'bretter', amount: 60 }]);
    expect(buildMachine(s, w.id)).toMatchObject({ ok: false, code: 'material_fehlt' });
    grant(s, { zahnrad: 1000, bretter: 1000 });
    expect(buildMachine(s, w.id, { resource: 'kohle' }).ok).toBe(true);
    expect(w.machines).toHaveLength(2);
    expect(w.machines[1]?.resource).toBe('kohle');
    expect(getStore(s, 'zahnrad')).toBe(992);

    while (w.machines.length < machineSlots(s)) expect(buildMachine(s, w.id).ok).toBe(true);
    expect(buildMachine(s, w.id)).toMatchObject({ ok: false, code: 'wagen_voll' });

    while (w.machines.length > 1) expect(removeMachine(s, w.id, w.machines[w.machines.length - 1]!.id).ok).toBe(true);
    expect(removeMachine(s, w.id, w.machines[0]!.id)).toMatchObject({ ok: false, code: 'letzte_maschine' });
  });

  it('mehr Plätze kommen von der schweren Lok und aus der Forschung', () => {
    const s = createInitialState();
    expect(machineSlots(s)).toBe(BALANCE.machineSlotsBase);
    s.loco = 'schwere_dampflok';
    expect(machineSlots(s)).toBe(BALANCE.machineSlotsBase + 2);
    research(s, 'maschinenhalle1');
    expect(machineSlots(s)).toBe(BALANCE.machineSlotsBase + 6);
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

  it('Abkoppeln gibt die Hälfte von Wagen und Maschinen zurück', () => {
    const s = createInitialState();
    expect(detachWagon(s, 1).ok).toBe(true);
    expect(s.wagons).toHaveLength(0);
    expect(getStore(s, 'zahnrad')).toBe(3);
    expect(getStore(s, 'bretter')).toBe(5);
    expect(getStore(s, 'fahrgestell')).toBe(0);

    // Mit einer zweiten Maschine kommt auch deren halber Preis zurück
    const s2 = createInitialState();
    addMachine(s2, s2.wagons[0]!, { resource: 'kohle' });
    expect(detachWagon(s2, 1).ok).toBe(true);
    expect(getStore(s2, 'zahnrad')).toBe(7);
    expect(getStore(s2, 'bretter')).toBe(11);
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
    const m = s.wagons[0]!.machines[0]!;
    expect(setMachineResource(s, 1, m.id, 'harz')).toMatchObject({ ok: false, code: 'rohstoff_unbekannt' });
    expect(setMachineResource(s, 1, m.id, 'kohle').ok).toBe(true);
    s.discoveredBiomes.push('wald');
    expect(setMachineResource(s, 1, m.id, 'harz').ok).toBe(true);
  });

  it('Handkurbel spannt höchstens 30 Sekunden vor und treibt alle Maschinen im Wagen', () => {
    const s = createInitialState();
    for (let i = 0; i < 10; i += 1) crank(s, 1);
    expect(s.wagons[0]?.crankUntil).toBe(BALANCE.crankMaxAheadSeconds);
    research(s, 'selbstlader');
    addMachine(s, s.wagons[0]!, { resource: 'kohle' });
    crank(s, 1);
    expect(getStore(s, 'eisenerz')).toBe(2);
    expect(getStore(s, 'kohle')).toBe(BALANCE.startStore['kohle']! + 2);
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
  it('Warteschlange ist begrenzt und nimmt nur freigeschaltete Rezepte', () => {
    const s = createInitialState();
    expect(queueWorkbench(s, 'stahl')).toMatchObject({ ok: false, code: 'rezept_gesperrt' });
    for (let i = 0; i < BALANCE.workbenchQueueMax; i += 1) expect(queueWorkbench(s, 'koks').ok).toBe(true);
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
