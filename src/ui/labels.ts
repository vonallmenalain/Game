import { BALANCE, ITEM_BY_ID, RECIPE_BY_ID, TECH_BY_ID, BIOME_BY_ID, PROJECT_BY_ID, WAGON_BY_TYPE, missingInputs, plannedTechs, type ActionResult, type GameState, type MachineState, type Stack, type TechDef, type WagonState, type WagonStatus, type WagonType } from '../engine';

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

/**
 * Rohstoffe haben eigene Farben, denn sie liegen alle auf derselben Stufe und
 * wären sonst nicht auseinanderzuhalten. Hergestellte Waren tragen die Farbe ihrer Stufe.
 */
const RESOURCE_COLOR: Record<string, string> = {
  eisenerz: '#8a5a3a',
  kupfererz: '#3f7f6d',
  kohle: '#3d434a',
  holz: '#7a5a35',
  stein: '#6f7680',
  harz: '#b08a2e',
  kalk: '#87907f',
  salpeter: '#6e769a',
};

export function itemColor(id: string): string {
  return RESOURCE_COLOR[id] ?? TIER_COLOR[ITEM_BY_ID[id]?.tier ?? 0] ?? 'var(--t-0)';
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

/** Wie eine Maschine in diesem Wagen heisst */
export function machineName(type: WagonType): string {
  return WAGON_BY_TYPE[type]?.machineName ?? 'Maschine';
}

/** Status einer einzelnen Maschine als kurzer Satz */
export function machineStatusText(state: GameState, wagon: WagonState, m: MachineState): string {
  switch (m.status) {
    case 'aktiv':
      return 'aktiv';
    case 'wartet': {
      if (wagon.type === 'ernte') return 'wartet auf die Handkurbel';
      const r = m.recipe ? RECIPE_BY_ID[m.recipe] : undefined;
      if (!r) return 'wartet';
      const missing = missingInputs(state, r);
      return missing.length > 0 ? `wartet auf ${missing.map((x) => itemName(x.item)).join(', ')}` : 'wartet';
    }
    case 'blockiert': {
      const out = m.resource ?? (m.recipe ? RECIPE_BY_ID[m.recipe]?.outputs[0]?.item : undefined);
      return out ? `Lager voll: ${itemName(out)}` : 'Lager voll';
    }
    default:
      return wagon.type === 'lager' ? 'erhöht die Kapazität' : 'pausiert';
  }
}

/**
 * Status des ganzen Wagens. Laufen alle Maschinen, steht das kurz da. Sonst zählt,
 * was klemmt, denn das ist der Grund hinzuschauen.
 */
export function statusText(state: GameState, w: WagonState): string {
  const n = w.machines.length;
  if (w.type === 'lager') return `${n} ${n === 1 ? 'Regal' : 'Regale'} · plus ${n * BALANCE.storeCapPerRegal} je Ware`;
  const laufen = w.machines.filter((m) => m.status === 'aktiv').length;
  if (laufen > 0 && laufen === n) return n === 1 ? 'aktiv' : `${n} Maschinen laufen`;
  // Was klemmt, ist die dringlichste Meldung einer Maschine, die gerade nicht läuft
  const klemmt =
    w.machines.find((m) => m.status === 'blockiert') ?? w.machines.find((m) => m.status === 'wartet') ?? w.machines.find((m) => m.status === 'leer');
  let text = klemmt ? machineStatusText(state, w, klemmt) : 'leer';
  if (klemmt?.status === 'leer') {
    const pausiert = w.machines.filter((m) => m.status === 'leer').length;
    text = pausiert > 1 ? `${pausiert} pausiert` : 'pausiert';
  }
  return laufen > 0 ? `${laufen} von ${n} laufen · ${text}` : text;
}

/** Gilt für Wagen wie für einzelne Maschinen */
export function statusTone(what: { status: WagonStatus }): 'good' | 'warn' | 'mute' {
  if (what.status === 'aktiv') return 'good';
  if (what.status === 'leer') return 'mute';
  return 'warn';
}

/**
 * Voraussetzungen einer Technologie als Text, leer wenn keine offen sind. Was schon
 * eingereiht ist, zählt als erledigt: Es ist bezahlt und kommt vor dieser hier dran.
 */
export function techRequirementText(state: GameState, tech: TechDef): string {
  const parts: string[] = [];
  const geplant = plannedTechs(state);
  for (const req of tech.requires) if (!state.techs.done.includes(req) && !geplant.includes(req)) parts.push(TECH_BY_ID[req]?.name ?? req);
  if (tech.requiresBiome && !state.discoveredBiomes.includes(tech.requiresBiome)) parts.push(`${BIOME_BY_ID[tech.requiresBiome]?.name ?? tech.requiresBiome} entdecken`);
  if (tech.requiresProject && !state.projects[tech.requiresProject]?.done) parts.push(`${PROJECT_BY_ID[tech.requiresProject]?.name ?? tech.requiresProject} fertigstellen`);
  return parts.join(', ');
}
