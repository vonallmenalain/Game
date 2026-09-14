import type { BiomeDef, ItemDef, ItemId, LocoDef, LocoId, ObstacleDef, ProjectDef, RecipeDef, TechDef, TechEffect, TechId, WagonDef, WagonType } from '../types';
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

/** Rezepte, die eine Ware als Zutat brauchen */
export function consumersOf(itemId: ItemId): RecipeDef[] {
  return RECIPES.filter((r) => r.inputs.some((s) => s.item === itemId));
}

/** Bauprojekte, deren Stückliste eine Ware verlangt, ohne die Vorschau */
export function projectsNeeding(itemId: ItemId): ProjectDef[] {
  return PROJECTS.filter((p) => !p.preview && p.bom.some((s) => s.item === itemId));
}

/**
 * Was eine Technologie freischaltet, aus den Daten gelesen: die Wagen, deren
 * Voraussetzung sie ist, die Rezepte, die sie nennen, ihre Bauprojekte und die
 * übrigen Wirkungen wie Boni und Plätze.
 */
export interface TechUnlocks {
  wagons: WagonDef[];
  recipes: RecipeDef[];
  projects: ProjectDef[];
  effects: TechEffect[];
}

export function techUnlocks(techId: TechId): TechUnlocks {
  const def = TECH_BY_ID[techId];
  if (!def) return { wagons: [], recipes: [], projects: [], effects: [] };
  const projects: ProjectDef[] = [];
  const effects: TechEffect[] = [];
  for (const e of def.effects) {
    if (e.kind === 'projekt') {
      const p = PROJECT_BY_ID[e.project];
      if (p) projects.push(p);
    } else if (e.kind !== 'wagen') effects.push(e);
  }
  return {
    wagons: WAGONS.filter((w) => w.tech === techId),
    recipes: RECIPES.filter((r) => r.techs.includes(techId)),
    projects,
    effects,
  };
}

/** Technologien, die diese hier voraussetzen */
export function dependentsOf(techId: TechId): TechDef[] {
  return TECHS.filter((t) => t.requires.includes(techId));
}

/**
 * Der Baum der Herstellung: eine Ware, ihr Rezept und darunter die Zutaten, bis zu
 * den Rohstoffen. `amount` ist an der Wurzel die Ausbeute je Lauf, darunter der Bedarf
 * je Lauf des Rezepts darüber. Reine Daten, ohne Bestände.
 */
export interface ProductionNode {
  item: ItemId;
  amount: number;
  recipe: RecipeDef | null;
  children: ProductionNode[];
}

export function productionTree(itemId: ItemId, depth = 4): ProductionNode {
  const recipe = producerOf(itemId);
  const amount = recipe?.outputs.find((o) => o.item === itemId)?.amount ?? 1;
  return { item: itemId, amount, recipe, children: recipe && depth > 0 ? recipe.inputs.map((s) => ({ ...productionTree(s.item, depth - 1), amount: s.amount })) : [] };
}
