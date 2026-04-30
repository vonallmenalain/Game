import { GameState, ResourceId } from "./types";
import { RESOURCES } from "./resources";

export function emptyInventory(): Record<ResourceId, number> {
  return RESOURCES.reduce((acc, r) => ({ ...acc, [r.id]: 0 }), {} as Record<ResourceId, number>);
}

export function createInitialState(): GameState {
  const inventory = emptyInventory();
  Object.assign(inventory, { iron_ore: 40, copper_ore: 25, coal: 20, stone: 20, energy_cell: 5, research_red: 0, research_blue: 0, research_points: 0 });
  return {
    time: 0,
    inventory,
    unlockedRecipes: ["iron_ingot", "copper_ingot", "coke", "stone_brick", "glass", "iron_plate", "copper_wire", "gear", "forming_tool", "composite_plate", "coil", "conductor_frame", "machine_housing"],
    unlockedMiningTargets: ["iron_ore", "copper_ore", "coal", "stone"],
    unlockedBuildings: ["miner", "smelter", "assembler", "coal_generator"],
    researchedTechs: [],
    eventLog: ["Matrix Foundry gestartet"],
    modifiers: { miningRate: 1, smelterSpeed: 1 },
    power: { produced: 0, required: 0, efficiency: 1 },
    buildings: [
      { id: "miner_1", type: "miner", progress: 0, status: "running", minerTarget: "iron_ore" },
      { id: "miner_2", type: "miner", progress: 0, status: "running", minerTarget: "copper_ore" },
      { id: "smelter_1", type: "smelter", recipeId: "iron_ingot", progress: 0, status: "waiting" },
      { id: "assembler_1", type: "assembler", recipeId: "iron_plate", progress: 0, status: "waiting" },
      { id: "coal_generator_1", type: "coal_generator", progress: 0, status: "running" }
    ]
  };
}
