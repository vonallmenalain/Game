import { describe, expect, it } from 'vitest';
import { ITEMS, WAGONS, createInitialState, type WagonType } from '../engine';
import { addWagon, research } from '../engine/sim/testkit';
import { ITEM_MARK, WAGON_MARK, describeError, statusText, techRequirementText } from './labels';
import { TECH_BY_ID } from '../engine';

describe('Beschriftungen', () => {
  it('jede Ware und jeder Wagentyp hat eine Buchstabenmarke', () => {
    for (const item of ITEMS) expect(ITEM_MARK[item.id], item.id).toBeDefined();
    for (const w of WAGONS) expect(WAGON_MARK[w.type as WagonType], w.type).toBeDefined();
    expect(new Set(Object.values(ITEM_MARK)).size).toBe(Object.keys(ITEM_MARK).length);
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
    w.status = 'wartet';
    expect(statusText(s, w)).toBe('wartet auf Eisenerz, Koks');
    w.status = 'blockiert';
    expect(statusText(s, w)).toBe('Lager voll: Eisenbarren');
  });

  it('nennt offene Voraussetzungen', () => {
    const s = createInitialState();
    expect(techRequirementText(s, TECH_BY_ID['teerofen']!)).toBe('Schmelzwagen, Wald entdecken');
    research(s, 'selbstlader', 'schmelzwagen');
    s.discoveredBiomes.push('wald');
    expect(techRequirementText(s, TECH_BY_ID['teerofen']!)).toBe('');
  });
});
