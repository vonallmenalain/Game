import type { BiomeDef, ItemDef, ItemId, LocoDef, LocoId, ObstacleDef, ProjectDef, RecipeDef, TechDef, WagonDef, WagonType } from '../types';
import { ITEMS } from './items';
import { RECIPES } from './recipes';
import { LOCOS, WAGONS } from './wagons';
import { TECHS } from './techs';
import { BIOMES, OBSTACLES, PROJECTS } from './world';

export { ITEMS, RECIPES, WAGONS, LOCOS, TECHS, BIOMES, OBSTACLES, PROJECTS };

function byId<T extends { id: string }>(list: T[]): Record<string, T> {
  return Object.fromEntries(list.map((entry) => [entry.id, entry]));
}

export const ITEM_BY_ID: Record<string, ItemDef> = byId(ITEMS);
export const RECIPE_BY_ID: Record<string, RecipeDef> = byId(RECIPES);
export const TECH_BY_ID: Record<string, TechDef> = byId(TECHS);
export const BIOME_BY_ID: Record<string, BiomeDef> = byId(BIOMES);
export const OBSTACLE_BY_ID: Record<string, ObstacleDef> = byId(OBSTACLES);
export const PROJECT_BY_ID: Record<string, ProjectDef> = byId(PROJECTS);
export const WAGON_BY_TYPE: Record<string, WagonDef> = Object.fromEntries(WAGONS.map((w) => [w.type, w]));
export const LOCO_BY_ID: Record<string, LocoDef> = byId(LOCOS);

export function item(id: ItemId): ItemDef {
  const def = ITEM_BY_ID[id];
  if (!def) throw new Error(`Unbekannte Ware: ${id}`);
  return def;
}

export function recipe(id: string): RecipeDef {
  const def = RECIPE_BY_ID[id];
  if (!def) throw new Error(`Unbekanntes Rezept: ${id}`);
  return def;
}

export function tech(id: string): TechDef {
  const def = TECH_BY_ID[id];
  if (!def) throw new Error(`Unbekannte Technologie: ${id}`);
  return def;
}

export function wagon(type: WagonType): WagonDef {
  const def = WAGON_BY_TYPE[type];
  if (!def) throw new Error(`Unbekannter Wagentyp: ${type}`);
  return def;
}

export function loco(id: LocoId): LocoDef {
  const def = LOCO_BY_ID[id];
  if (!def) throw new Error(`Unbekannte Lok: ${id}`);
  return def;
}

export function project(id: string): ProjectDef {
  const def = PROJECT_BY_ID[id];
  if (!def) throw new Error(`Unbekanntes Projekt: ${id}`);
  return def;
}

export function recipesForWagon(type: WagonType): RecipeDef[] {
  return RECIPES.filter((r) => r.wagon === type);
}

/** Das Rezept, das eine Ware herstellt, oder null bei Rohstoffen */
export function producerOf(itemId: ItemId): RecipeDef | null {
  return RECIPES.find((r) => r.outputs.some((o) => o.item === itemId)) ?? null;
}
