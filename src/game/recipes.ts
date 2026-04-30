import { Recipe } from "./types";
export const RECIPES: Recipe[] = [
{ id:"iron_ingot",name:"Eisenbarren",building:"smelter",duration:2,inputs:[{id:"iron_ore",amount:2}],outputs:[{id:"iron_ingot",amount:1}] },
{ id:"copper_ingot",name:"Kupferbarren",building:"smelter",duration:2,inputs:[{id:"copper_ore",amount:2}],outputs:[{id:"copper_ingot",amount:1}] },
{ id:"coke",name:"Koks",building:"smelter",duration:2,inputs:[{id:"coal",amount:1}],outputs:[{id:"coke",amount:1}] },
{ id:"stone_brick",name:"Steinziegel",building:"smelter",duration:3,inputs:[{id:"stone",amount:2}],outputs:[{id:"stone_brick",amount:1}] },
{ id:"glass",name:"Glas",building:"smelter",duration:4,inputs:[{id:"stone",amount:2},{id:"coal",amount:1}],outputs:[{id:"glass",amount:1}] },
{ id:"silicon_ingot",name:"Siliziumbarren",building:"smelter",duration:3,inputs:[{id:"silicon_ore",amount:2}],outputs:[{id:"silicon_ingot",amount:1}],initiallyLocked:true },
{ id:"iron_plate",name:"Eisenplatte",building:"assembler",duration:3,inputs:[{id:"iron_ingot",amount:2}],outputs:[{id:"iron_plate",amount:1}] },
{ id:"copper_wire",name:"Kupferdraht",building:"assembler",duration:2,inputs:[{id:"copper_ingot",amount:1}],outputs:[{id:"copper_wire",amount:2}] },
{ id:"gear",name:"Zahnrad",building:"assembler",duration:4,inputs:[{id:"iron_ingot",amount:1},{id:"iron_plate",amount:1}],outputs:[{id:"gear",amount:1}] },
{ id:"forming_tool",name:"Formwerkzeug",building:"assembler",duration:3,inputs:[{id:"iron_ingot",amount:1}],outputs:[{id:"forming_tool",amount:1}] },
{ id:"composite_plate",name:"Verbundplatte",building:"assembler",duration:5,inputs:[{id:"coke",amount:1},{id:"iron_plate",amount:1}],outputs:[{id:"composite_plate",amount:1}] },
{ id:"coil",name:"Spule",building:"assembler",duration:4,inputs:[{id:"copper_wire",amount:2},{id:"iron_plate",amount:1}],outputs:[{id:"coil",amount:1}] },
{ id:"conductor_frame",name:"Leiterrahmen",building:"assembler",duration:5,inputs:[{id:"copper_wire",amount:2},{id:"composite_plate",amount:1}],outputs:[{id:"conductor_frame",amount:1}] },
{ id:"machine_housing",name:"Maschinengehäuse",building:"assembler",duration:5,inputs:[{id:"iron_plate",amount:2},{id:"gear",amount:1}],outputs:[{id:"machine_housing",amount:1}] },
{ id:"silicon_wafer",name:"Siliziumwafer",building:"assembler",duration:5,inputs:[{id:"silicon_ingot",amount:1},{id:"glass",amount:1}],outputs:[{id:"silicon_wafer",amount:1}],initiallyLocked:true },
{ id:"logic_chip",name:"Logikchip",building:"assembler",duration:6,inputs:[{id:"silicon_wafer",amount:1},{id:"copper_wire",amount:2}],outputs:[{id:"logic_chip",amount:1}],initiallyLocked:true },
{ id:"ceramic_plate",name:"Keramikplatte",building:"assembler",duration:5,inputs:[{id:"stone_brick",amount:1},{id:"glass",amount:1}],outputs:[{id:"ceramic_plate",amount:1}],initiallyLocked:true },
{ id:"red_matrix",name:"Roter Matrix-Baustein",building:"matrix_press",duration:8,inputs:[{id:"composite_plate",amount:1},{id:"forming_tool",amount:1}],outputs:[{id:"red_matrix",amount:1}],initiallyLocked:true,researchGain:5 },
{ id:"blue_matrix",name:"Blauer Matrix-Baustein",building:"matrix_press",duration:12,inputs:[{id:"conductor_frame",amount:1},{id:"logic_chip",amount:1}],outputs:[{id:"blue_matrix",amount:1}],initiallyLocked:true,researchGain:12 },
{ id:"yellow_matrix",name:"Gelber Matrix-Baustein",building:"matrix_press",duration:18,inputs:[{id:"ceramic_plate",amount:1},{id:"coil",amount:1},{id:"silicon_wafer",amount:1}],outputs:[{id:"yellow_matrix",amount:1}],initiallyLocked:true,researchGain:30 },
];
export const RECIPE_BY_ID = Object.fromEntries(RECIPES.map(r=>[r.id,r]));
