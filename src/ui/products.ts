/**
 * Was ein Wagen herstellen kann, je Ware mit den Maschinen, die gerade daran
 * arbeiten. Das ist die Sicht des Zug-Bildschirms: nicht die Maschine mit ihrem
 * Auftrag, sondern die Ware mit ihrer Anzahl Maschinen.
 */
import {
  discoveredResources,
  harvestRatePerMinute,
  machineRatePerMinute,
  machinesFor,
  unlockedRecipesFor,
  wagonBaseSpeed,
  type GameState,
  type ItemId,
  type MachineJob,
  type MachineState,
  type RecipeDef,
  type Stack,
  type WagonState,
} from '../engine';

export interface Product {
  key: string;
  job: MachineJob;
  item: ItemId;
  /** Null im Erntewagen: Dort kommt die Ware aus dem Boden */
  recipe: RecipeDef | null;
  machines: MachineState[];
  /** Ausstoss aller zugeteilten Maschinen, Stand von jetzt */
  rate: number;
  /** Was eine Maschine leisten würde: das Angebot, nach dem man zuteilt */
  perMachine: number;
}

function sum(values: number[]): number {
  return values.reduce((total, v) => total + v, 0);
}

export function wagonProducts(state: GameState, wagon: WagonState): Product[] {
  if (wagon.type === 'ernte') {
    return discoveredResources(state).map((resource) => {
      const job: MachineJob = { resource };
      const machines = machinesFor(wagon, job);
      return {
        key: resource,
        job,
        item: resource,
        recipe: null,
        machines,
        rate: sum(machines.map((m) => machineRatePerMinute(state, wagon, m))),
        perMachine: harvestRatePerMinute(state, wagon, resource),
      };
    });
  }
  if (wagon.type === 'lager') return [];
  const base = wagonBaseSpeed(state, wagon);
  return unlockedRecipesFor(state, wagon.type).map((recipe) => {
    const job: MachineJob = { recipe: recipe.id };
    const machines = machinesFor(wagon, job);
    const out = recipe.outputs[0]!;
    return {
      key: recipe.id,
      job,
      item: out.item,
      recipe,
      machines,
      rate: sum(machines.map((m) => machineRatePerMinute(state, wagon, m))),
      perMachine: (out.amount / recipe.seconds) * 60 * base,
    };
  });
}

/** Was die Maschinen einer Ware je Zutat pro Minute verbrauchen, Stand von jetzt */
export function productConsumption(product: Product): Stack[] {
  if (!product.recipe || product.rate <= 0) return [];
  const out = product.recipe.outputs[0]!;
  const cycles = product.rate / out.amount;
  return product.recipe.inputs.map((s) => ({ item: s.item, amount: s.amount * cycles }));
}
