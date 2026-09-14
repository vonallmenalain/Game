import { describe, expect, it } from 'vitest';
import { TECHS, createInitialState, startResearch } from '../../engine';
import { grant, research } from '../../engine/sim/testkit';
import { layoutTechTree, suggestedTech, techStatus } from './tree';

describe('Technologiebaum', () => {
  it('stellt jede Technologie eine Spalte hinter ihre tiefste Voraussetzung', () => {
    const layout = layoutTechTree(TECHS);
    const col = (id: string) => layout.nodes.find((n) => n.id === id)?.col;
    expect(col('selbstlader')).toBe(0);
    expect(col('schmelzwagen')).toBe(1);
    expect(col('walzwagen')).toBe(2);
    expect(col('stahlwerk')).toBe(3);
    expect(col('brueckenbau')).toBe(4);
    expect(col('wuestenausruestung')).toBe(7);
    expect(layout.cols).toBe(8);
    expect(layout.rows).toBe(6);
    expect(layout.perColumn).toEqual([1, 3, 4, 1, 6, 1, 1, 3]);
    // Jede Voraussetzung ist eine Kante
    expect(layout.edges).toHaveLength(TECHS.reduce((sum, t) => sum + t.requires.length, 0));
    expect(layout.edges).toContainEqual({ from: 'stahlwerk', to: 'brueckenbau' });
  });

  it('reiht Kinder nach ihren Eltern, damit die Kanten kurz bleiben', () => {
    const layout = layoutTechTree(TECHS);
    const row = (id: string) => layout.nodes.find((n) => n.id === id)?.row;
    // Schmelzwagen steht über Werkwagen, also stehen dessen Kinder oben
    expect(row('walzwagen')).toBe(0);
    expect(row('teerofen')).toBe(1);
    expect(row('konstruktionsbuero')).toBe(2);
    expect(row('lagerwagen')).toBe(3);
    // Keine zwei Knoten teilen eine Zelle
    const zellen = new Set(layout.nodes.map((n) => `${n.col}/${n.row}`));
    expect(zellen.size).toBe(layout.nodes.length);
  });

  it('kennt den Stand jeder Technologie', () => {
    const s = createInitialState();
    expect(techStatus(s, 'selbstlader')).toBe('planbar');
    expect(techStatus(s, 'schmelzwagen')).toBe('gesperrt');
    grant(s, { bp_eisen: 10 });
    expect(techStatus(s, 'selbstlader')).toBe('bereit');
    expect(startResearch(s, 'selbstlader').ok).toBe(true);
    expect(techStatus(s, 'selbstlader')).toBe('laeuft');
    expect(techStatus(s, 'schmelzwagen')).toBe('bereit');
    expect(startResearch(s, 'schmelzwagen').ok).toBe(true);
    expect(techStatus(s, 'schmelzwagen')).toBe('eingereiht');
    research(s, 'werkwagen');
    expect(techStatus(s, 'werkwagen')).toBe('erforscht');
  });

  it('schlägt die laufende vor, sonst die erste mögliche', () => {
    const s = createInitialState();
    expect(suggestedTech(s)).toBe('selbstlader');
    research(s, 'selbstlader');
    grant(s, { bp_eisen: 4 });
    expect(suggestedTech(s)).toBe('schmelzwagen');
    expect(startResearch(s, 'schmelzwagen').ok).toBe(true);
    expect(suggestedTech(s)).toBe('schmelzwagen');
  });
});
