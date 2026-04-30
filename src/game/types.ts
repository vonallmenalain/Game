export type ResourceId =
  | "iron_ore"
  | "copper_ore"
  | "silicon_ore"
  | "coal"
  | "iron_ingot"
  | "copper_wire"
  | "silicon_wafer"
  | "composite_plate"
  | "molding_tool"
  | "conductor_frame"
  | "precision_blade"
  | "red_matrix"
  | "blue_matrix";

export type BuildingType = "miner" | "smelter" | "assembler" | "matrix_lab";

export interface ResourceStack {
  id: ResourceId;
  amount: number;
}

export interface Recipe {
  id: string;
  machine: BuildingType;
  duration: number;
  inputs: ResourceStack[];
  outputs: ResourceStack[];
}

export interface Building {
  id: string;
  type: BuildingType;
  recipeId?: string;
  progress: number;
  efficiency: number;
  powered: boolean;
}

export interface GameState {
  time: number;
  inventory: Record<ResourceId, number>;
  buildings: Building[];
  researchPoints: number;
  power: {
    produced: number;
    required: number;
  };
}
