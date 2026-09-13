import { ITEM_BY_ID, RECIPE_BY_ID, TECH_BY_ID, BIOME_BY_ID, PROJECT_BY_ID, missingInputs, type ActionResult, type GameState, type Stack, type TechDef, type WagonState, type WagonType } from '../engine';

export const WAGON_MARK: Record<WagonType, string> = {
  ernte: 'ER',
  schmelz: 'SM',
  walz: 'WZ',
  werk: 'WK',
  buero: 'KB',
  lager: 'LG',
  chemie: 'CH',
};

/** CSS-Variable je Wagentyp, definiert in app.css */
export const WAGON_COLOR: Record<WagonType, string> = {
  ernte: 'var(--w-ernte)',
  schmelz: 'var(--w-schmelz)',
  walz: 'var(--w-walz)',
  werk: 'var(--w-werk)',
  buero: 'var(--w-buero)',
  lager: 'var(--w-lager)',
  chemie: 'var(--w-chemie)',
};

export const ITEM_MARK: Record<string, string> = {
  eisenerz: 'Fe',
  kohle: 'Ko',
  holz: 'Ho',
  stein: 'St',
  harz: 'Hz',
  kupfererz: 'Cu',
  kalk: 'Ka',
  salpeter: 'Sp',
  koks: 'Kk',
  eisenbarren: 'Eb',
  schienen: 'Sn',
  bretter: 'Br',
  zahnrad: 'Zr',
  nieten: 'Ni',
  fahrgestell: 'Fg',
  bp_eisen: 'B1',
  teer: 'Te',
  stahl: 'Sa',
  stahltraeger: 'Tr',
  bohlen: 'Bo',
  dampfkessel: 'Dk',
  bp_stahl: 'B2',
  kupferbarren: 'Cb',
  kupferdraht: 'Cd',
  kupferspule: 'Cs',
  bohrkopf: 'Bk',
  sprengstoff: 'Sx',
  moertel: 'Mö',
  stuetzbalken: 'Sb',
  bp_kupfer: 'B3',
};

export const TIER_NAME: Record<number, string> = {
  0: 'Rohstoffe',
  1: 'Eisenzeit',
  2: 'Stahlzeit',
  3: 'Kupferzeit',
};

export const TIER_COLOR: Record<number, string> = {
  0: 'var(--t-0)',
  1: 'var(--t-1)',
  2: 'var(--t-2)',
  3: 'var(--t-3)',
};

export function itemName(id: string): string {
  return ITEM_BY_ID[id]?.name ?? id;
}

export function itemMark(id: string): string {
  return ITEM_MARK[id] ?? id.slice(0, 2);
}

export function itemColor(id: string): string {
  return TIER_COLOR[ITEM_BY_ID[id]?.tier ?? 0] ?? 'var(--t-0)';
}

export function stackText(stacks: Stack[]): string {
  return stacks.map((s) => `${s.amount} ${itemName(s.item)}`).join(', ');
}

/** Warum eine Aktion nicht ging, als Satz */
export function describeError(result: ActionResult): string {
  if (result.ok) return '';
  switch (result.code) {
    case 'material_fehlt':
      return result.missing && result.missing.length > 0 ? `Es fehlen ${stackText(result.missing)}.` : 'Material fehlt.';
    case 'kein_platz':
      return 'Kein Platz. Die Lok zieht nicht mehr Wagen.';
    case 'wagen_gesperrt':
      return 'Dieser Wagen ist noch nicht erforscht.';
    case 'stufe_max':
      return 'Höchste Stufe erreicht.';
    case 'nicht_aufstufbar':
      return 'Dieser Wagen lässt sich nicht aufstufen.';
    case 'rezept_gesperrt':
      return 'Dieses Rezept ist noch nicht erforscht.';
    case 'rezept_falscher_wagen':
      return 'Das Rezept passt nicht zu diesem Wagen.';
    case 'rohstoff_unbekannt':
      return 'Dieser Rohstoff ist noch nicht entdeckt.';
    case 'forschung_laeuft':
      return 'Es läuft schon eine Forschung.';
    case 'forschung_fertig':
      return 'Schon erforscht.';
    case 'voraussetzung_fehlt':
      return 'Eine Voraussetzung fehlt.';
    case 'warteschlange_voll':
      return 'Die Werkbank ist voll.';
    case 'projekt_gesperrt':
      return 'Dieses Projekt ist noch nicht freigeschaltet.';
    default:
      return 'Das geht gerade nicht.';
  }
}

/** Status eines Wagens als kurzer Satz */
export function statusText(state: GameState, w: WagonState): string {
  switch (w.status) {
    case 'aktiv':
      return 'aktiv';
    case 'wartet': {
      if (w.type === 'ernte') return 'wartet auf die Handkurbel';
      const r = w.recipe ? RECIPE_BY_ID[w.recipe] : undefined;
      if (!r) return 'wartet';
      const missing = missingInputs(state, r);
      return missing.length > 0 ? `wartet auf ${missing.map((m) => itemName(m.item)).join(', ')}` : 'wartet';
    }
    case 'blockiert': {
      const out = w.type === 'ernte' ? w.resource : w.recipe ? RECIPE_BY_ID[w.recipe]?.outputs[0]?.item : undefined;
      return out ? `Lager voll: ${itemName(out)}` : 'Lager voll';
    }
    default:
      return w.type === 'ernte' ? 'kein Rohstoff gewählt' : w.type === 'lager' ? 'erhöht die Kapazität' : 'kein Rezept gewählt';
  }
}

export function statusTone(w: WagonState): 'good' | 'warn' | 'mute' {
  if (w.status === 'aktiv') return 'good';
  if (w.status === 'leer') return 'mute';
  return 'warn';
}

/** Voraussetzungen einer Technologie als Text, leer wenn keine offen sind */
export function techRequirementText(state: GameState, tech: TechDef): string {
  const parts: string[] = [];
  for (const req of tech.requires) if (!state.techs.done.includes(req)) parts.push(TECH_BY_ID[req]?.name ?? req);
  if (tech.requiresBiome && !state.discoveredBiomes.includes(tech.requiresBiome)) parts.push(`${BIOME_BY_ID[tech.requiresBiome]?.name ?? tech.requiresBiome} entdecken`);
  if (tech.requiresProject && !state.projects[tech.requiresProject]?.done) parts.push(`${PROJECT_BY_ID[tech.requiresProject]?.name ?? tech.requiresProject} fertigstellen`);
  return parts.join(', ');
}
