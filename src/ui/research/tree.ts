/**
 * Der Technologiebaum als Bild: Spalten nach Tiefe, also dem längsten Weg von einer
 * Wurzel, Reihen nach der Mitte der Eltern, damit die Kanten kurz bleiben. Reine
 * Rechnung ohne DOM, die Bühne zeichnet daraus Knoten und Kanten.
 */
import { TECHS, canResearch, isTechDone, isTechPlannable, type GameState, type TechDef, type TechId } from '../../engine';

export interface TreeNode {
  id: TechId;
  col: number;
  row: number;
}

export interface TreeEdge {
  from: TechId;
  to: TechId;
}

export interface TreeLayout {
  nodes: TreeNode[];
  edges: TreeEdge[];
  cols: number;
  rows: number;
  /** Knoten je Spalte, damit kurze Spalten mittig stehen können */
  perColumn: number[];
}

export function layoutTechTree(techs: TechDef[] = TECHS): TreeLayout {
  const byId = new Map(techs.map((t) => [t.id, t]));
  const depth = new Map<TechId, number>();
  const depthOf = (id: TechId, seen: Set<TechId>): number => {
    const cached = depth.get(id);
    if (cached !== undefined) return cached;
    const t = byId.get(id);
    if (!t || seen.has(id)) return 0;
    seen.add(id);
    const d = t.requires.length > 0 ? Math.max(...t.requires.map((r) => depthOf(r, seen))) + 1 : 0;
    depth.set(id, d);
    return d;
  };
  for (const t of techs) depthOf(t.id, new Set());

  const cols = techs.length > 0 ? Math.max(...techs.map((t) => depth.get(t.id) ?? 0)) + 1 : 0;
  const columns: TechDef[][] = Array.from({ length: cols }, () => []);
  for (const t of techs) columns[depth.get(t.id) ?? 0]!.push(t);

  const row = new Map<TechId, number>();
  for (const list of columns) {
    // Reihe nach der Mitte der Eltern; ohne Eltern bleibt die Reihenfolge der Daten
    const sorted = list
      .map((t, i) => {
        const eltern = t.requires.map((r) => row.get(r)).filter((r): r is number => r !== undefined);
        const mitte = eltern.length > 0 ? eltern.reduce((a, b) => a + b, 0) / eltern.length : i;
        return { t, i, mitte };
      })
      .sort((a, b) => a.mitte - b.mitte || a.i - b.i);
    sorted.forEach((e, r) => row.set(e.t.id, r));
  }

  return {
    nodes: techs.map((t) => ({ id: t.id, col: depth.get(t.id) ?? 0, row: row.get(t.id) ?? 0 })),
    edges: techs.flatMap((t) => t.requires.filter((r) => byId.has(r)).map((from) => ({ from, to: t.id }))),
    cols,
    rows: Math.max(0, ...columns.map((c) => c.length)),
    perColumn: columns.map((c) => c.length),
  };
}

export type TechStatus = 'erforscht' | 'laeuft' | 'eingereiht' | 'bereit' | 'planbar' | 'gesperrt';

/** Wo eine Technologie steht: fertig, in Arbeit, in der Reihe, sofort möglich, nur ohne Blaupausen möglich, gesperrt */
export function techStatus(state: GameState, id: TechId): TechStatus {
  if (isTechDone(state, id)) return 'erforscht';
  if (state.techs.current?.id === id) return 'laeuft';
  if (state.techs.queue.includes(id)) return 'eingereiht';
  if (canResearch(state, id).ok) return 'bereit';
  if (isTechPlannable(state, id)) return 'planbar';
  return 'gesperrt';
}

/** Die Technologie, die man als Erstes anschaut: die laufende, sonst die erste, die geht */
export function suggestedTech(state: GameState, techs: TechDef[] = TECHS): TechId | null {
  if (state.techs.current) return state.techs.current.id;
  for (const wanted of ['bereit', 'planbar'] as const) {
    const hit = techs.find((t) => techStatus(state, t.id) === wanted);
    if (hit) return hit.id;
  }
  return techs.find((t) => techStatus(state, t.id) !== 'erforscht')?.id ?? techs[0]?.id ?? null;
}
