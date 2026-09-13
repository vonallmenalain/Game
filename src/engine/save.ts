import { ITEMS, PROJECTS } from './data';
import { STATE_VERSION, createInitialState } from './state';
import type { GameState, MachineState, ProjectState, WagonState } from './types';

export const SAVE_KEY = 'loco/save';
/** Schlüssel aus der Zeit, als das Spiel «Linie Null» hiess. Wird beim Laden übernommen. */
export const LEGACY_SAVE_KEY = 'linie-null/save';

type Raw = Record<string, unknown>;

const STATUSES: Set<unknown> = new Set(['aktiv', 'wartet', 'blockiert', 'leer']);

/**
 * Version 1 hatte je Wagen genau einen Auftrag, dafür mehrere Wagen desselben Typs.
 * Version 2 hat je Typ einen Wagen mit Maschinen darin. Aus jedem alten Wagen wird
 * eine Maschine im Wagen seines Typs, die Stufe ist die höchste der Gruppe. So
 * behält ein Spielstand genau seine bisherige Leistung, auch die Lagerkapazität.
 */
function migrateWagonsToMachines(raw: Raw): Raw {
  if (!Array.isArray(raw['wagons'])) return raw;
  const byType = new Map<string, Raw>();
  const order: string[] = [];
  let nextMachineId = 1;
  raw['wagons'].forEach((entry) => {
    if (!isObject(entry)) return;
    const type = entry['type'];
    if (typeof type !== 'string') return;
    const machine: Raw = {
      id: nextMachineId,
      recipe: typeof entry['recipe'] === 'string' ? entry['recipe'] : null,
      resource: typeof entry['resource'] === 'string' ? entry['resource'] : null,
      progress: num(entry['progress'], 0),
      cycleActive: entry['cycleActive'] === true,
      status: STATUSES.has(entry['status']) ? entry['status'] : 'leer',
    };
    nextMachineId += 1;
    const existing = byType.get(type);
    if (existing) {
      (existing['machines'] as Raw[]).push(machine);
      existing['level'] = Math.max(num(existing['level'], 1), num(entry['level'], 1));
      existing['crankUntil'] = Math.max(num(existing['crankUntil'], 0), num(entry['crankUntil'], 0));
      return;
    }
    byType.set(type, {
      id: num(entry['id'], byType.size + 1),
      type,
      level: Math.max(1, Math.floor(num(entry['level'], 1))),
      machines: [machine],
      status: 'leer',
      crankUntil: num(entry['crankUntil'], 0),
    });
    order.push(type);
  });
  return { ...raw, wagons: order.map((type) => byType.get(type)!), nextMachineId };
}

/**
 * Migrationen von Version n auf n + 1. Wird beim Laden der Reihe nach angewendet.
 */
const MIGRATIONS: Record<number, (raw: Raw) => Raw> = {
  1: migrateWagonsToMachines,
};

function isObject(value: unknown): value is Raw {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function num(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function fillMachine(raw: unknown, fallbackId: number): MachineState | null {
  if (!isObject(raw)) return null;
  return {
    id: num(raw['id'], fallbackId),
    recipe: typeof raw['recipe'] === 'string' ? raw['recipe'] : null,
    resource: typeof raw['resource'] === 'string' ? raw['resource'] : null,
    progress: num(raw['progress'], 0),
    cycleActive: raw['cycleActive'] === true,
    status: STATUSES.has(raw['status']) ? (raw['status'] as MachineState['status']) : 'leer',
  };
}

function fillWagon(raw: unknown, fallbackId: number): WagonState | null {
  if (!isObject(raw)) return null;
  const type = raw['type'];
  if (typeof type !== 'string') return null;
  const machines: MachineState[] = [];
  if (Array.isArray(raw['machines'])) {
    raw['machines'].forEach((entry, index) => {
      const m = fillMachine(entry, index + 1);
      if (m) machines.push(m);
    });
  }
  // Ein Wagen ohne Maschine kann nichts. Das gibt es nicht, also bekommt er eine leere.
  if (machines.length === 0) machines.push({ id: 1, recipe: null, resource: null, progress: 0, cycleActive: false, status: 'leer' });
  return {
    id: num(raw['id'], fallbackId),
    type: type as WagonState['type'],
    level: Math.max(1, Math.floor(num(raw['level'], 1))),
    machines,
    status: STATUSES.has(raw['status']) ? (raw['status'] as WagonState['status']) : 'leer',
    crankUntil: num(raw['crankUntil'], 0),
  };
}

/** Ergänzt fehlende Felder aus dem Startzustand, damit alte Spielstände laden. */
export function fillDefaults(raw: Raw): GameState {
  const base = createInitialState();
  const store: Record<string, number> = { ...base.store };
  if (isObject(raw['store'])) {
    for (const [item, value] of Object.entries(raw['store'])) store[item] = Math.max(0, num(value, 0));
  }

  const wagons: WagonState[] = [];
  if (Array.isArray(raw['wagons'])) {
    raw['wagons'].forEach((entry, index) => {
      const w = fillWagon(entry, index + 1);
      if (w) wagons.push(w);
    });
  }

  const projects: Record<string, ProjectState> = {};
  const rawProjects = isObject(raw['projects']) ? raw['projects'] : {};
  for (const def of PROJECTS) {
    const rp = rawProjects[def.id];
    const delivered: Record<string, number> = {};
    if (isObject(rp) && isObject(rp['delivered'])) {
      for (const [item, value] of Object.entries(rp['delivered'])) delivered[item] = Math.max(0, num(value, 0));
    }
    projects[def.id] = {
      delivered,
      done: isObject(rp) && rp['done'] === true,
      paused: isObject(rp) && rp['paused'] === true,
      doneAt: isObject(rp) && typeof rp['doneAt'] === 'number' ? rp['doneAt'] : null,
    };
  }

  const rawTechs = isObject(raw['techs']) ? raw['techs'] : {};
  const rawCurrent = isObject(rawTechs['current']) ? rawTechs['current'] : null;
  const rawWorkbench = isObject(raw['workbench']) ? raw['workbench'] : {};
  const rawStats = isObject(raw['stats']) ? raw['stats'] : {};

  const state: GameState = {
    ...base,
    version: STATE_VERSION,
    playedSeconds: num(raw['playedSeconds'], 0),
    lastSavedAt: num(raw['lastSavedAt'], 0),
    pos: Math.max(0, Math.floor(num(raw['pos'], 0))),
    km: 0,
    moveBudgetKm: num(raw['moveBudgetKm'], 0),
    fuelDebt: num(raw['fuelDebt'], 0),
    stop: typeof raw['stop'] === 'string' ? (raw['stop'] as GameState['stop']) : 'faehrt',
    loco: raw['loco'] === 'schwere_dampflok' ? 'schwere_dampflok' : 'dampflok',
    nextWagonId: Math.max(num(raw['nextWagonId'], 1), ...wagons.map((w) => w.id + 1), 1),
    nextMachineId: Math.max(num(raw['nextMachineId'], 1), ...wagons.flatMap((w) => w.machines.map((m) => m.id + 1)), 1),
    wagons: wagons.length > 0 ? wagons : base.wagons,
    store,
    discoveredBiomes: Array.isArray(raw['discoveredBiomes']) ? (raw['discoveredBiomes'].filter((b) => typeof b === 'string') as string[]) : base.discoveredBiomes,
    reachedObstacles: Array.isArray(raw['reachedObstacles']) ? (raw['reachedObstacles'].filter((b) => typeof b === 'string') as string[]) : [],
    techs: {
      done: Array.isArray(rawTechs['done']) ? (rawTechs['done'].filter((t) => typeof t === 'string') as string[]) : [],
      current: rawCurrent && typeof rawCurrent['id'] === 'string' ? { id: rawCurrent['id'], progress: num(rawCurrent['progress'], 0) } : null,
      queue: Array.isArray(rawTechs['queue']) ? (rawTechs['queue'].filter((t) => typeof t === 'string') as string[]) : [],
    },
    projects,
    workbench: {
      queue: Array.isArray(rawWorkbench['queue']) ? (rawWorkbench['queue'].filter((r) => typeof r === 'string') as string[]) : [],
      progress: num(rawWorkbench['progress'], 0),
      cycleActive: rawWorkbench['cycleActive'] === true,
    },
    log: Array.isArray(raw['log']) ? (raw['log'].filter(isObject) as unknown as GameState['log']) : base.log,
    stats: {
      produced: isObject(rawStats['produced']) ? (rawStats['produced'] as Record<string, number>) : {},
      consumed: isObject(rawStats['consumed']) ? (rawStats['consumed'] as Record<string, number>) : {},
      stoppedSeconds: num(rawStats['stoppedSeconds'], 0),
    },
    warnings: [],
    standEnde: raw['standEnde'] === true,
  };
  state.km = state.pos / 100;
  if (!state.discoveredBiomes.includes('tal')) state.discoveredBiomes.unshift('tal');
  for (const def of ITEMS) if (!(def.id in state.store)) state.store[def.id] = 0;
  return state;
}

export function serialize(state: GameState, savedAt: number): string {
  const { warnings: _warnings, ...rest } = state;
  return JSON.stringify({ ...rest, version: STATE_VERSION, lastSavedAt: savedAt });
}

export function deserialize(json: string): GameState {
  const parsed: unknown = JSON.parse(json);
  if (!isObject(parsed)) throw new Error('Spielstand ist kein Objekt');
  let raw = parsed;
  let version = num(raw['version'], 0);
  while (version < STATE_VERSION) {
    const migrate = MIGRATIONS[version];
    raw = migrate ? migrate(raw) : raw;
    version += 1;
    raw['version'] = version;
  }
  return fillDefaults(raw);
}
