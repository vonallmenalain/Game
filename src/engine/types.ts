/**
 * Typen der Spiel-Engine. Die Engine kennt kein DOM und keine Oberfläche.
 * Bezeichner sind kurze ASCII-IDs, Anzeigenamen liegen in den Daten.
 */

export type ItemId = string;
export type RecipeId = string;
export type TechId = string;
export type ProjectId = string;
export type BiomeId = string;
export type ObstacleId = string;

export type WagonType = 'ernte' | 'schmelz' | 'walz' | 'werk' | 'buero' | 'lager' | 'chemie';
export type ProductionWagonType = Exclude<WagonType, 'ernte' | 'lager'>;
export type LocoId = 'dampflok' | 'schwere_dampflok';

/** 0 = Rohstoff, 1 = Eisenzeit, 2 = Stahlzeit, 3 = Kupferzeit */
export type Tier = 0 | 1 | 2 | 3;

export interface Stack {
  item: ItemId;
  amount: number;
}

export interface ItemDef {
  id: ItemId;
  name: string;
  tier: Tier;
  kind: 'rohstoff' | 'ware' | 'blaupause';
  /** Nur Rohstoffe: Biome, in denen der Vor-Ort-Bonus gilt */
  homeBiomes?: BiomeId[];
  /** Nur Rohstoffe: Stück pro Minute auf Stufe 1 ohne Boni */
  harvestPerMinute?: number;
}

export interface RecipeDef {
  id: RecipeId;
  name: string;
  wagon: ProductionWagonType;
  inputs: Stack[];
  outputs: Stack[];
  seconds: number;
  /** Alle genannten Technologien müssen erforscht sein. Leer = ab Start. */
  techs: TechId[];
}

export interface WagonDef {
  type: WagonType;
  name: string;
  /** Wie eine einzelne Maschine in diesem Wagen heisst */
  machineName: string;
  /** Baukosten inklusive Fahrgestell. Die erste Maschine ist darin enthalten. */
  cost: Stack[];
  /** Grundkosten einer weiteren Maschine. Jede weitere wird teurer. */
  machineCost: Stack[];
  upgradable: boolean;
  /** null = ab Start baubar */
  tech: TechId | null;
}

export interface LocoDef {
  id: LocoId;
  name: string;
  /** Wie viele Wagen die Lok zieht */
  slots: number;
  /** Zusätzliche Maschinenplätze in jedem Wagen */
  machineBonus: number;
  speedKmh: number;
  fuel: ItemId;
  fuelPerKm: number;
}

export type TechEffect =
  | { kind: 'wagen'; wagon: WagonType }
  | { kind: 'projekt'; project: ProjectId }
  | { kind: 'ernte_bonus'; value: number }
  | { kind: 'wagen_tempo'; wagon: WagonType; value: number }
  | { kind: 'maschinen_plaetze'; value: number }
  | { kind: 'selbstlader' }
  | { kind: 'offline_deckel'; hours: number }
  | { kind: 'stand_ende' };

export interface TechDef {
  id: TechId;
  name: string;
  description: string;
  cost: Stack;
  seconds: number;
  requires: TechId[];
  requiresBiome?: BiomeId;
  requiresProject?: ProjectId;
  effects: TechEffect[];
}

export interface BiomeDef {
  id: BiomeId;
  name: string;
  startKm: number;
  resources: ItemId[];
  /** Nur Ausblick, im ersten Stand nicht bespielbar */
  preview?: boolean;
}

export interface ObstacleDef {
  id: ObstacleId;
  name: string;
  km: number;
  project: ProjectId;
}

export interface ProjectDef {
  id: ProjectId;
  name: string;
  kind: 'hindernis' | 'lok';
  bom: Stack[];
  /** Technologie, die das Projekt freischaltet. null nur bei Vorschau-Projekten. */
  tech: TechId | null;
  obstacle?: ObstacleId;
  loco?: LocoId;
  /** Nur Ausblick, nie baubar */
  preview?: boolean;
}

export type WagonStatus = 'aktiv' | 'wartet' | 'blockiert' | 'leer';

/**
 * Eine Maschine im Wagen. Sie hat den Auftrag, nicht der Wagen: Ein Schmelzwagen
 * kann gleichzeitig Koks und Eisenbarren machen, wenn zwei Maschinen drinstehen.
 */
export interface MachineState {
  id: number;
  /** Produktionswagen: aktives Rezept */
  recipe: RecipeId | null;
  /** Erntewagen: geernteter Rohstoff */
  resource: ItemId | null;
  /** Produktion: Sekunden im laufenden Zyklus. Ernte: angesammelte Bruchteile. */
  progress: number;
  /** Produktion: Zutaten des laufenden Zyklus sind eingezogen */
  cycleActive: boolean;
  status: WagonStatus;
}

export interface WagonState {
  id: number;
  type: WagonType;
  level: number;
  /** Die Maschinen im Wagen, höchstens so viele wie Plätze da sind */
  machines: MachineState[];
  /** Zusammenfassung der Maschinen, jeden Tick neu bestimmt */
  status: WagonStatus;
  /** Spielzeit in Sekunden, bis zu der die Handkurbel wirkt. Gilt für den ganzen Wagen. */
  crankUntil: number;
}

export type StopReason = 'faehrt' | 'hindernis' | 'schienen' | 'brennstoff';

export type LogKind = 'start' | 'biom' | 'hindernis' | 'projekt' | 'forschung' | 'lok' | 'stand_ende';

export interface LogEntry {
  /** Spielzeit in Sekunden */
  at: number;
  km: number;
  kind: LogKind;
  /** ID des Bioms, Hindernisses, Projekts, der Technologie oder Lok */
  ref: string;
}

export interface ProjectState {
  delivered: Record<ItemId, number>;
  done: boolean;
  paused: boolean;
  doneAt: number | null;
}

export type WarningCode = 'zug_steht' | 'schienen_leer' | 'brennstoff_leer' | 'lager_voll' | 'zutat_fehlt' | 'handkurbel';

export interface Warning {
  code: WarningCode;
  item?: ItemId;
  wagonId?: number;
  machineId?: number;
}

export interface GameState {
  version: number;
  /** Simulierte Spielzeit in Sekunden */
  playedSeconds: number;
  /** Wanduhr in Millisekunden beim letzten Speichern, 0 = nie */
  lastSavedAt: number;
  /** Position in Streckenabschnitten zu 10 m (ganzzahlig) */
  pos: number;
  /** Position in Kilometern, aus pos abgeleitet */
  km: number;
  /** Angesparte Fahrstrecke in Kilometern, die noch nicht in Abschnitte umgesetzt wurde */
  moveBudgetKm: number;
  /** Angesammelter Brennstoffverbrauch unter einem Stück */
  fuelDebt: number;
  stop: StopReason;
  loco: LocoId;
  nextWagonId: number;
  nextMachineId: number;
  /** Reihenfolge = Position hinter der Werkstatt, Index 0 ist der Lok am nächsten */
  wagons: WagonState[];
  store: Record<ItemId, number>;
  discoveredBiomes: BiomeId[];
  reachedObstacles: ObstacleId[];
  techs: {
    done: TechId[];
    current: { id: TechId; progress: number } | null;
  };
  projects: Record<ProjectId, ProjectState>;
  workbench: {
    queue: RecipeId[];
    progress: number;
    cycleActive: boolean;
  };
  log: LogEntry[];
  stats: {
    produced: Record<ItemId, number>;
    consumed: Record<ItemId, number>;
    stoppedSeconds: number;
  };
  /** Wird jeden Tick neu berechnet, nicht gespeichert */
  warnings: Warning[];
  standEnde: boolean;
}
