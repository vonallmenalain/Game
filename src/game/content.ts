import { Recipe, ResourceId } from "./types";

export const RESOURCE_IDS: ResourceId[] = [
  "iron_ore",
  "copper_ore",
  "silicon_ore",
  "coal",
  "iron_ingot",
  "copper_wire",
  "silicon_wafer",
  "composite_plate",
  "molding_tool",
  "conductor_frame",
  "precision_blade",
  "red_matrix",
  "blue_matrix"
];

export const RECIPES: Recipe[] = [
  {
    id: "smelt_iron",
    machine: "smelter",
    duration: 2,
    inputs: [{ id: "iron_ore", amount: 2 }],
    outputs: [{ id: "iron_ingot", amount: 1 }]
  },
  {
    id: "wire_copper",
    machine: "smelter",
    duration: 2,
    inputs: [{ id: "copper_ore", amount: 1 }],
    outputs: [{ id: "copper_wire", amount: 2 }]
  },
  {
    id: "wafer_silicon",
    machine: "smelter",
    duration: 3,
    inputs: [{ id: "silicon_ore", amount: 2 }],
    outputs: [{ id: "silicon_wafer", amount: 1 }]
  },
  {
    id: "composite_plate",
    machine: "assembler",
    duration: 4,
    inputs: [
      { id: "iron_ingot", amount: 2 },
      { id: "coal", amount: 1 }
    ],
    outputs: [{ id: "composite_plate", amount: 1 }]
  },
  {
    id: "molding_tool",
    machine: "assembler",
    duration: 3,
    inputs: [{ id: "iron_ingot", amount: 2 }],
    outputs: [{ id: "molding_tool", amount: 1 }]
  },
  {
    id: "conductor_frame",
    machine: "assembler",
    duration: 4,
    inputs: [
      { id: "copper_wire", amount: 4 },
      { id: "composite_plate", amount: 1 }
    ],
    outputs: [{ id: "conductor_frame", amount: 1 }]
  },
  {
    id: "precision_blade",
    machine: "assembler",
    duration: 5,
    inputs: [
      { id: "iron_ingot", amount: 1 },
      { id: "silicon_wafer", amount: 1 }
    ],
    outputs: [{ id: "precision_blade", amount: 1 }]
  },
  {
    id: "red_matrix",
    machine: "matrix_lab",
    duration: 6,
    inputs: [
      { id: "composite_plate", amount: 1 },
      { id: "molding_tool", amount: 1 }
    ],
    outputs: [{ id: "red_matrix", amount: 1 }]
  },
  {
    id: "blue_matrix",
    machine: "matrix_lab",
    duration: 7,
    inputs: [
      { id: "conductor_frame", amount: 1 },
      { id: "precision_blade", amount: 1 }
    ],
    outputs: [{ id: "blue_matrix", amount: 1 }]
  }
];

export const RECIPE_BY_ID = new Map(RECIPES.map((recipe) => [recipe.id, recipe]));
