import { BuildingDef } from "./types";
export const BUILDINGS: BuildingDef[] = [
{ type:"miner",name:"Miner",powerUse:2,cost:[{id:"iron_ingot",amount:10},{id:"gear",amount:5}] },
{ type:"smelter",name:"Smelter",powerUse:4,cost:[{id:"iron_plate",amount:8},{id:"stone_brick",amount:4}] },
{ type:"assembler",name:"Assembler",powerUse:5,cost:[{id:"iron_plate",amount:10},{id:"copper_wire",amount:5},{id:"gear",amount:2}] },
{ type:"matrix_press",name:"Matrix Press",powerUse:8,cost:[{id:"iron_plate",amount:12},{id:"coil",amount:4},{id:"machine_housing",amount:2}] },
{ type:"coal_generator",name:"Coal Generator",powerUse:0,powerProduction:15,cost:[{id:"iron_plate",amount:10},{id:"copper_wire",amount:4},{id:"stone_brick",amount:2}] }
];
export const BUILDING_BY_TYPE = Object.fromEntries(BUILDINGS.map(b=>[b.type,b]));
