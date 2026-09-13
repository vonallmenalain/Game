import { describe, expect, it } from 'vitest';
import { ITEMS, WAGONS, createInitialState, type WagonType } from '../engine';
import { addMachine, addWagon, research } from '../engine/sim/testkit';
import { WAGON_COLOR, describeError, statusText, techRequirementText } from './labels';
import { GLYPH_ITEMS, itemsWithoutGlyph } from './glyphs';
import { TECH_BY_ID } from '../engine';

describe('Beschriftungen', () => {
  it('jede Ware hat eine Glyphe und jeder Wagentyp eine Farbe', () => {
    expect(itemsWithoutGlyph()).toEqual([]);
    expect(GLYPH_ITEMS).toHaveLength(ITEMS.length);
    expect(new Set(GLYPH_ITEMS).size).toBe(GLYPH_ITEMS.length);
    for (const w of WAGONS) expect(WAGON_COLOR[w.type as WagonType], w.type).toBeDefined();
  });

  it('erklärt Fehler als Satz', () => {
    expect(describeError({ ok: false, code: 'material_fehlt', missing: [{ item: 'zahnrad', amount: 4 }, { item: 'bretter', amount: 6 }] })).toBe('Es fehlen 4 Zahnrad, 6 Bretter.');
    expect(describeError({ ok: false, code: 'kein_platz' })).toContain('Kein Platz');
    expect(describeError({ ok: true })).toBe('');
  });

  it('beschreibt den Wagenstatus', () => {
    const s = createInitialState();
    expect(statusText(s, s.wagons[0]!)).toBe('wartet auf die Handkurbel');
    const w = addWagon(s, 'schmelz', { recipe: 'eisenbarren' });
    const m = w.machines[0]!;
    w.status = 'wartet';
    m.status = 'wartet';
    expect(statusText(s, w)).toBe('wartet auf Eisenerz, Koks');
    w.status = 'blockiert';
    m.status = 'blockiert';
    expect(statusText(s, w)).toBe('Lager voll: Eisenbarren');
    // Mehrere Maschinen: Der Wagen meldet, wie viele laufen und was klemmt
    addMachine(s, w, { recipe: 'koks' }).status = 'aktiv';
    expect(statusText(s, w)).toBe('1 von 2 laufen · Lager voll: Eisenbarren');
  });

  it('nennt offene Voraussetzungen', () => {
    const s = createInitialState();
    expect(techRequirementText(s, TECH_BY_ID['teerofen']!)).toBe('Schmelzwagen, Wald entdecken');
    research(s, 'selbstlader', 'schmelzwagen');
    s.discoveredBiomes.push('wald');
    expect(techRequirementText(s, TECH_BY_ID['teerofen']!)).toBe('');
  });
});
