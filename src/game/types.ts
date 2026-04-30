export type ResourceCategory = "raw" | "material" | "component" | "matrix" | "meta";

export type ResourceId =
  | "iron_ore"
  | "copper_ore"
  | "coal"
  | "stone"
  | "silicon_ore"
  | "iron_ingot"
  | "copper_ingot"
  | "coke"
  | "graphite"
  | "stone_brick"
  | "glass"
  | "iron_plate"
  | "copper_wire"
  | "gear"
  | "composite_plate"
  | "coil"
  | "silicon_ingot"
  | "silicon_wafer"
  | "logic_chip"
  | "ceramic_plate"
  | "forming_tool"
  | "conductor_frame"
  | "machine_housing"
  | "red_matrix"
  | "blue_matrix"
  | "yellow_matrix"
  | "energy_cell"
  | "research_red"
  | "research_blue"
  | "research_points";

export type BuildingType = "miner" | "smelter" | "assembler" | "matrix_press" | "coal_generator";
export type TechStatus = "locked" | "available" | "researched";

export interface ResourceDef { id: ResourceId; name: string; category: ResourceCategory; description: string; }
export interface Stack { id: ResourceId; amount: number; }
export interface Recipe { id: string; name: string; building: BuildingType; duration: number; inputs: Stack[]; outputs: Stack[]; initiallyLocked?: boolean; researchGain?: number; }
export interface BuildingDef { type: BuildingType; name: string; powerUse: number; powerProduction?: number; cost: Stack[]; }
export interface BuildingInstance { id: string; type: BuildingType; recipeId?: string; progress: number; status: "running"|"waiting"|"no_recipe"|"low_power"; minerTarget?: Extract<ResourceId,"iron_ore"|"copper_ore"|"coal"|"stone"|"silicon_ore">; }
export interface TechDef { id:string; name:string; cost:number; requires:string[]; effect:string; }
export interface GameState { time:number; inventory:Record<ResourceId,number>; buildings:BuildingInstance[]; unlockedRecipes:string[]; unlockedMiningTargets:BuildingInstance["minerTarget"][]; unlockedBuildings:BuildingType[]; researchedTechs:string[]; eventLog:string[]; modifiers:{ miningRate:number; smelterSpeed:number; }; power:{ produced:number; required:number; efficiency:number; }; }
