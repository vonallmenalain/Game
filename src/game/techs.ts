import { TechDef } from "./types";
export const TECHS: TechDef[] = [
{id:"automation_1",name:"Automatisierung I",cost:15,requires:[],effect:"Schaltet Matrix Press Kauf frei."},
{id:"mining_1",name:"Erzabbau I",cost:20,requires:["automation_1"],effect:"Miner-Rate +25%."},
{id:"smelting_1",name:"Schmelztechnik I",cost:25,requires:["automation_1"],effect:"Smelter-Geschwindigkeit +20%."},
{id:"matrix_1",name:"Matrixpressen I",cost:30,requires:["automation_1"],effect:"Schaltet roten Matrix-Baustein frei."},
{id:"silicon_processing",name:"Siliziumverarbeitung",cost:50,requires:["smelting_1"],effect:"Schaltet Silizium-Prozesse frei."},
{id:"logic_systems",name:"Logiksysteme",cost:75,requires:["silicon_processing"],effect:"Schaltet Logikchip und blaue Matrix frei."},
{id:"logistics_1",name:"Logistik I",cost:100,requires:["logic_systems"],effect:"Logistikoptimierung abgeschlossen."}
];
