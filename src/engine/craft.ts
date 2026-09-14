/**
 * Planen einer Herstellungskette für die Werkbank: Was fehlt, um eine Ware zu bauen,
 * und welche Vorstufen dafür zuerst durch die Werkbank müssen.
 */
import { RECIPE_BY_ID, producerOf } from './data';
import { getStore, isRecipeUnlocked, storeCap } from './state';
import type { GameState, ItemId, RecipeId, Stack } from './types';

export interface CraftStep {
  recipe: RecipeId;
  /** Wie oft dieses Rezept laufen muss */
  runs: number;
}

export interface CraftPlan {
  /** Rezepte in der Reihenfolge, in der sie gebaut werden: Vorstufen zuerst */
  steps: CraftStep[];
  /** Wie viele Aufträge das insgesamt sind */
  orders: number;
  /** Was fehlt und sich nicht herstellen lässt, also geerntet werden muss */
  missing: Stack[];
  /** Was bereits vorrätig ist und darum nicht gebaut werden muss */
  fromStore: Stack[];
}

const MAX_DEPTH = 8;

/**
 * Plant, was nötig ist, um `recipeId` so oft wie `count` zu bauen. Vorhandene Bestände
 * werden angerechnet, fehlende Zwischenprodukte werden eingeplant, solange es Rezepte
 * dafür gibt. Rohstoffe lassen sich nicht bauen und landen in `missing`.
 */
export function planCraft(state: GameState, recipeId: RecipeId, count = 1): CraftPlan {
  const target = RECIPE_BY_ID[recipeId];
  if (!target || !isRecipeUnlocked(state, recipeId)) {
    return { steps: [], orders: 0, missing: [], fromStore: [] };
  }

  /** Was im Verlauf des Plans schon verplant ist */
  const reserved: Record<ItemId, number> = {};
  const missing: Record<ItemId, number> = {};
  const used: Record<ItemId, number> = {};
  const steps: CraftStep[] = [];

  const available = (item: ItemId) => getStore(state, item) - (reserved[item] ?? 0);

  /** Sichert `amount` Stück von `item`, indem Bestand genutzt oder Vorstufen geplant werden. */
  const secure = (item: ItemId, amount: number, depth: number): void => {
    const fromStore = Math.min(amount, Math.max(0, available(item)));
    if (fromStore > 0) {
      reserved[item] = (reserved[item] ?? 0) + fromStore;
      used[item] = (used[item] ?? 0) + fromStore;
    }
    let open = amount - fromStore;
    if (open <= 0) return;

    const recipe = producerOf(item);
    if (!recipe || !isRecipeUnlocked(state, recipe.id) || depth >= MAX_DEPTH) {
      missing[item] = (missing[item] ?? 0) + open;
      return;
    }

    const perRun = recipe.outputs.find((o) => o.item === item)?.amount ?? 1;
    const runs = Math.ceil(open / perRun);
    for (const input of recipe.inputs) secure(input.item, input.amount * runs, depth + 1);

    const existing = steps.find((s) => s.recipe === recipe.id);
    if (existing) existing.runs += runs;
    else steps.push({ recipe: recipe.id, runs });

    // Was ein Lauf über den Bedarf hinaus liefert, steht später zur Verfügung
    const produced = runs * perRun;
    reserved[item] = (reserved[item] ?? 0) - (produced - open);
    open = 0;
  };

  const runs = Math.max(1, Math.floor(count));
  for (const input of target.inputs) secure(input.item, input.amount * runs, 1);
  steps.push({ recipe: target.id, runs });

  return {
    steps,
    orders: steps.reduce((sum, s) => sum + s.runs, 0),
    missing: Object.entries(missing).map(([item, amount]) => ({ item, amount })),
    fromStore: Object.entries(used).map(([item, amount]) => ({ item, amount })),
  };
}

/** Zutaten eines Rezepts mit Bestand und Fehlmenge, für die Anzeige. */
export interface IngredientView {
  item: ItemId;
  need: number;
  have: number;
  enough: boolean;
  /** Lässt sich die Fehlmenge selbst herstellen? */
  craftable: boolean;
}

export function ingredientsOf(state: GameState, recipeId: RecipeId): IngredientView[] {
  const recipe = RECIPE_BY_ID[recipeId];
  if (!recipe) return [];
  return recipe.inputs.map((input) => {
    const have = Math.floor(getStore(state, input.item));
    const producer = producerOf(input.item);
    return {
      item: input.item,
      need: input.amount,
      have,
      enough: have >= input.amount,
      craftable: Boolean(producer && isRecipeUnlocked(state, producer.id)),
    };
  });
}

/** Ergebnisse eines Rezepts mit Bestand, für die Anzeige. */
export interface OutputView {
  item: ItemId;
  /** Wie viel ein Lauf liefert */
  amount: number;
  have: number;
  /** Das Lager dieser Ware ist voll, ein Lauf brächte nichts mehr ein */
  full: boolean;
}

export function outputsOf(state: GameState, recipeId: RecipeId): OutputView[] {
  const recipe = RECIPE_BY_ID[recipeId];
  if (!recipe) return [];
  const cap = storeCap(state);
  return recipe.outputs.map((output) => ({
    item: output.item,
    amount: output.amount,
    have: Math.floor(getStore(state, output.item)),
    full: getStore(state, output.item) >= cap,
  }));
}

/** Reicht der Platz im Lager für das Ergebnis? */
export function outputBlocked(state: GameState, recipeId: RecipeId): boolean {
  return outputsOf(state, recipeId).some((o) => o.full);
}
