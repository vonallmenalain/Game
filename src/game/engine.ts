import { RECIPE_BY_ID, RESOURCE_IDS } from "./content";
import { Building, GameState, ResourceId } from "./types";

const DEFAULT_TICK_RATE = 4;

export function createInventory(): Record<ResourceId, number> {
  return RESOURCE_IDS.reduce((acc, id) => {
    acc[id] = 0;
    return acc;
  }, {} as Record<ResourceId, number>);
}

export function createInitialState(): GameState {
  return {
    time: 0,
    researchPoints: 0,
    inventory: createInventory(),
    power: {
      produced: 8,
      required: 0
    },
    buildings: [
      { id: "miner_iron_1", type: "miner", recipeId: "mine_iron", progress: 0, efficiency: 1, powered: true },
      { id: "miner_copper_1", type: "miner", recipeId: "mine_copper", progress: 0, efficiency: 1, powered: true },
      { id: "miner_silicon_1", type: "miner", recipeId: "mine_silicon", progress: 0, efficiency: 1, powered: true },
      { id: "miner_coal_1", type: "miner", recipeId: "mine_coal", progress: 0, efficiency: 1, powered: true },
      { id: "smelter_iron_1", type: "smelter", recipeId: "smelt_iron", progress: 0, efficiency: 1, powered: true },
      { id: "assembler_tool_1", type: "assembler", recipeId: "molding_tool", progress: 0, efficiency: 1, powered: true },
      { id: "matrix_lab_1", type: "matrix_lab", recipeId: "red_matrix", progress: 0, efficiency: 1, powered: true }
    ]
  };
}

function mine(building: Building, inventory: Record<ResourceId, number>, deltaSeconds: number): void {
  const amount = 0.8 * building.efficiency * deltaSeconds;
  if (building.id.includes("iron")) inventory.iron_ore += amount;
  if (building.id.includes("copper")) inventory.copper_ore += amount;
  if (building.id.includes("silicon")) inventory.silicon_ore += amount;
  if (building.id.includes("coal")) inventory.coal += amount;
}

function hasInputs(inventory: Record<ResourceId, number>, inputs: { id: ResourceId; amount: number }[]): boolean {
  return inputs.every((input) => inventory[input.id] >= input.amount);
}

function consumeInputs(inventory: Record<ResourceId, number>, inputs: { id: ResourceId; amount: number }[]): void {
  for (const input of inputs) inventory[input.id] -= input.amount;
}

function produceOutputs(inventory: Record<ResourceId, number>, outputs: { id: ResourceId; amount: number }[]): void {
  for (const output of outputs) inventory[output.id] += output.amount;
}

export function tick(state: GameState, deltaSeconds = 1 / DEFAULT_TICK_RATE): GameState {
  const next: GameState = {
    ...state,
    time: state.time + deltaSeconds,
    inventory: { ...state.inventory },
    buildings: state.buildings.map((building) => ({ ...building }))
  };

  next.power.required = next.buildings.length;
  const globalEfficiency = Math.min(1, next.power.produced / Math.max(1, next.power.required));

  for (const building of next.buildings) {
    building.efficiency = globalEfficiency;
    building.powered = globalEfficiency > 0;

    if (building.type === "miner") {
      mine(building, next.inventory, deltaSeconds);
      continue;
    }

    if (!building.recipeId) continue;
    const recipe = RECIPE_BY_ID.get(building.recipeId);
    if (!recipe) continue;

    if (building.progress <= 0 && !hasInputs(next.inventory, recipe.inputs)) {
      continue;
    }

    if (building.progress <= 0) {
      consumeInputs(next.inventory, recipe.inputs);
      building.progress = recipe.duration;
    }

    building.progress -= deltaSeconds * building.efficiency;

    if (building.progress <= 0) {
      produceOutputs(next.inventory, recipe.outputs);
      if (recipe.outputs.some((output) => output.id === "red_matrix" || output.id === "blue_matrix")) {
        next.researchPoints += recipe.outputs.reduce((sum, output) => sum + output.amount, 0);
      }
      building.progress = 0;
    }
  }

  return next;
}
