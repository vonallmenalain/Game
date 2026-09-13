import { describe, expect, it } from 'vitest';
import { BIOMES, ITEMS, ITEM_BY_ID, LOCOS, OBSTACLES, PROJECTS, RECIPES, TECHS, TECH_BY_ID, WAGONS, producerOf } from './data';

const PRODUCTION_TYPES = ['schmelz', 'walz', 'werk', 'buero', 'chemie'];

describe('Spieldaten', () => {
  it('haben eindeutige IDs', () => {
    for (const list of [ITEMS, RECIPES, TECHS, BIOMES, OBSTACLES, PROJECTS]) {
      const ids = list.map((e) => e.id);
      expect(new Set(ids).size).toBe(ids.length);
    }
    expect(new Set(WAGONS.map((w) => w.type)).size).toBe(WAGONS.length);
  });

  it('Rohstoffe haben Ernterate und Heimat-Biome, Waren haben genau einen Hersteller', () => {
    for (const item of ITEMS) {
      if (item.kind === 'rohstoff') {
        expect(item.harvestPerMinute, item.id).toBeGreaterThan(0);
        expect(item.homeBiomes?.length, item.id).toBeGreaterThan(0);
        for (const b of item.homeBiomes ?? []) expect(BIOMES.some((x) => x.id === b), `${item.id}: ${b}`).toBe(true);
        expect(producerOf(item.id), item.id).toBeNull();
      } else {
        const producers = RECIPES.filter((r) => r.outputs.some((o) => o.item === item.id));
        expect(producers.length, item.id).toBe(1);
      }
    }
  });

  it('Rezepte verweisen auf bekannte Waren, Wagen und Technologien', () => {
    for (const r of RECIPES) {
      expect(r.seconds, r.id).toBeGreaterThan(0);
      expect(PRODUCTION_TYPES, r.id).toContain(r.wagon);
      expect(r.outputs.length, r.id).toBeGreaterThan(0);
      for (const s of [...r.inputs, ...r.outputs]) {
        expect(ITEM_BY_ID[s.item], `${r.id}: ${s.item}`).toBeDefined();
        expect(s.amount, `${r.id}: ${s.item}`).toBeGreaterThan(0);
      }
      for (const t of r.techs) expect(TECH_BY_ID[t], `${r.id}: ${t}`).toBeDefined();
    }
    for (const type of PRODUCTION_TYPES) expect(RECIPES.some((r) => r.wagon === type), type).toBe(true);
  });

  it('jede Ware wird irgendwo gebraucht', () => {
    const used = new Set<string>(['schienen']);
    for (const r of RECIPES) for (const s of r.inputs) used.add(s.item);
    for (const w of WAGONS) for (const s of w.cost) used.add(s.item);
    for (const p of PROJECTS) for (const s of p.bom) used.add(s.item);
    for (const t of TECHS) used.add(t.cost.item);
    for (const l of LOCOS) used.add(l.fuel);
    for (const item of ITEMS) expect(used.has(item.id), item.id).toBe(true);
  });

  it('Technologien bilden einen Baum ohne Zyklen mit gültigen Verweisen', () => {
    for (const t of TECHS) {
      expect(ITEM_BY_ID[t.cost.item]?.kind, t.id).toBe('blaupause');
      expect(t.seconds, t.id).toBeGreaterThan(0);
      for (const req of t.requires) expect(TECH_BY_ID[req], `${t.id}: ${req}`).toBeDefined();
      if (t.requiresBiome) expect(BIOMES.some((b) => b.id === t.requiresBiome), t.id).toBe(true);
      if (t.requiresProject) expect(PROJECTS.some((p) => p.id === t.requiresProject), t.id).toBe(true);
      for (const e of t.effects) {
        if (e.kind === 'wagen') expect(WAGONS.some((w) => w.type === e.wagon), t.id).toBe(true);
        if (e.kind === 'projekt') expect(PROJECTS.some((p) => p.id === e.project), t.id).toBe(true);
      }
    }
    const visiting = new Set<string>();
    const done = new Set<string>();
    const visit = (id: string): void => {
      if (done.has(id)) return;
      expect(visiting.has(id), `Zyklus bei ${id}`).toBe(false);
      visiting.add(id);
      for (const req of TECH_BY_ID[id]?.requires ?? []) visit(req);
      visiting.delete(id);
      done.add(id);
    };
    for (const t of TECHS) visit(t.id);
  });

  it('Wagen, Loks, Projekte und Strecke sind konsistent', () => {
    for (const w of WAGONS) {
      for (const s of w.cost) expect(ITEM_BY_ID[s.item], `${w.type}: ${s.item}`).toBeDefined();
      if (w.tech) expect(TECH_BY_ID[w.tech], w.type).toBeDefined();
      if (w.type !== 'ernte') expect(w.cost.some((s) => s.item === 'fahrgestell'), w.type).toBe(true);
    }
    for (const l of LOCOS) {
      expect(l.slots).toBeGreaterThan(0);
      expect(l.speedKmh).toBeGreaterThan(0);
      expect(ITEM_BY_ID[l.fuel], l.id).toBeDefined();
    }
    for (const p of PROJECTS) {
      for (const s of p.bom) expect(ITEM_BY_ID[s.item], `${p.id}: ${s.item}`).toBeDefined();
      if (p.preview) expect(p.tech).toBeNull();
      else {
        expect(p.tech, p.id).not.toBeNull();
        expect(p.bom.length, p.id).toBeGreaterThan(0);
        expect(TECHS.some((t) => t.effects.some((e) => e.kind === 'projekt' && e.project === p.id)), `${p.id} ohne Technologie`).toBe(true);
      }
      if (p.kind === 'hindernis') expect(OBSTACLES.some((o) => o.id === p.obstacle), p.id).toBe(true);
      if (p.kind === 'lok') expect(LOCOS.some((l) => l.id === p.loco), p.id).toBe(true);
    }
    for (const o of OBSTACLES) {
      expect(Number.isInteger(o.km), o.id).toBe(true);
      expect(PROJECTS.some((p) => p.id === o.project), o.id).toBe(true);
    }
    expect(new Set(OBSTACLES.map((o) => o.km)).size).toBe(OBSTACLES.length);
    for (let i = 1; i < BIOMES.length; i += 1) expect(BIOMES[i]!.startKm).toBeGreaterThan(BIOMES[i - 1]!.startKm);
    expect(BIOMES[0]?.startKm).toBe(0);
    for (const b of BIOMES) for (const r of b.resources) expect(ITEM_BY_ID[r]?.kind, `${b.id}: ${r}`).toBe('rohstoff');
  });

  it('entspricht dem Umfang des Konzepts', () => {
    expect(ITEMS.filter((i) => i.kind === 'rohstoff')).toHaveLength(8);
    expect(ITEMS.filter((i) => i.kind === 'ware')).toHaveLength(19);
    expect(ITEMS.filter((i) => i.kind === 'blaupause')).toHaveLength(3);
    expect(RECIPES).toHaveLength(22);
    expect(TECHS).toHaveLength(20);
    expect(WAGONS).toHaveLength(7);
    expect(LOCOS).toHaveLength(2);
    expect(PROJECTS.filter((p) => !p.preview)).toHaveLength(3);
  });
});
