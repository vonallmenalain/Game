import { BALANCE, ITEM_BY_ID, RECIPE_BY_ID, TECH_BY_ID, BIOME_BY_ID, PROJECT_BY_ID, WAGON_BY_TYPE, missingInputs, plannedTechs, producerOf, type ActionResult, type FlowSource, type GameState, type MachineState, type Stack, type TechDef, type TechEffect, type WagonState, type WagonStatus, type WagonType } from '../engine';

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

/** Kurzname je Wagentyp für enge Stellen wie die Wagenleiste */
export const WAGON_SHORT: Record<WagonType, string> = {
  ernte: 'Ernte',
  schmelz: 'Schmelz',
  walz: 'Walz',
  werk: 'Werk',
  buero: 'Büro',
  lager: 'Lager',
  chemie: 'Chemie',
};

export function wagonName(type: WagonType): string {
  return WAGON_BY_TYPE[type]?.name ?? type;
}

export const TIER_NAME: Record<number, string> = {
  0: 'Rohstoffe',
  1: 'Eisenzeit',
  2: 'Stahlzeit',
  3: 'Kupferzeit',
};

export function itemName(id: string): string {
  return ITEM_BY_ID[id]?.name ?? id;
}

/** Der Wagen, aus dem eine Ware kommt: Rohstoffe aus dem Erntewagen, sonst der Wagen ihres Rezepts */
export function itemWagon(id: string): WagonType {
  const def = ITEM_BY_ID[id];
  if (!def || def.kind === 'rohstoff') return 'ernte';
  return producerOf(id)?.wagon ?? 'werk';
}

/** Leichte Hintergrundfarbe je Wagen, als CSS-Variable aus app.css */
export function wagonTint(type: WagonType): string {
  return `var(--tint-${type})`;
}

/** Die Kachelfarbe einer Ware: die ihres Wagens. Die Icons selbst sind bunt und ohne Kästchen. */
export function itemTint(id: string): string {
  return wagonTint(itemWagon(id));
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
    case 'keine_freie_maschine':
      return 'Keine freie Maschine. Baue eine neue oder nimm einem anderen Auftrag eine weg.';
    case 'letzte_maschine':
      return 'Die letzte Maschine bleibt im Wagen.';
    case 'wagen_voll':
      return 'Alle Plätze im Wagen sind belegt.';
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

/**
 * Status der Maschinen mit demselben Auftrag, als kurzer Satz: «2 laufen» oder
 * «1 von 2 laufen · wartet auf Koks». Leer ohne Maschinen.
 */
export function jobStatusText(state: GameState, wagon: WagonState, machines: MachineState[]): string {
  const n = machines.length;
  if (n === 0) return '';
  const laufen = machines.filter((m) => m.status === 'aktiv').length;
  if (laufen === n) return n === 1 ? 'läuft' : `${n} laufen`;
  const klemmt = machines.find((m) => m.status === 'blockiert') ?? machines.find((m) => m.status === 'wartet') ?? machines[0]!;
  const text = machineStatusText(state, wagon, klemmt);
  return laufen > 0 ? `${laufen} von ${n} laufen · ${text}` : text;
}

/** Eine Wirkung einer Technologie als kurzer Text */
export function effectText(e: TechEffect): string {
  switch (e.kind) {
    case 'wagen':
      return `${wagonName(e.wagon)} baubar`;
    case 'projekt':
      return `Bauprojekt ${PROJECT_BY_ID[e.project]?.name ?? e.project}`;
    case 'ernte_bonus':
      return `Ernte plus ${Math.round(e.value * 100)} Prozent`;
    case 'wagen_tempo':
      return `${wagonName(e.wagon)} plus ${Math.round(e.value * 100)} Prozent Tempo`;
    case 'maschinen_plaetze':
      return `${e.value} Maschinenplätze mehr in jedem Wagen`;
    case 'selbstlader':
      return 'Erntewagen arbeiten ohne Handkurbel';
    case 'offline_deckel':
      return `Nachtschicht rechnet ${e.hours} Stunden nach`;
    case 'stand_ende':
      return 'Ende des ersten Stands';
    default:
      return '';
  }
}

/** Kurzes Etikett für den Indikator im Technologiebaum: «+25 %», «+4», «12 h» */
export function effectBadge(e: TechEffect): string | null {
  switch (e.kind) {
    case 'ernte_bonus':
    case 'wagen_tempo':
      return `+${Math.round(e.value * 100)} %`;
    case 'maschinen_plaetze':
      return `+${e.value}`;
    case 'offline_deckel':
      return `${e.hours} h`;
    default:
      return null;
  }
}

/** Woher ein Fluss kommt oder wohin er geht: «Schmelzwagen ×2 · Koks», «Werkbank · Koks», «Fahrt der Lok» */
export function sourceLabel(q: FlowSource): string {
  if (q.via === 'fahrt') return 'Fahrt der Lok';
  const auftrag = q.recipe ? (RECIPE_BY_ID[q.recipe]?.name ?? q.recipe) : q.resource ? itemName(q.resource) : '';
  if (q.via === 'werkbank') return `Werkbank · ${auftrag}`;
  const wagen = q.wagonType ? wagonName(q.wagonType) : 'Wagen';
  return `${wagen} ×${q.machines} · ${auftrag}`;
}
