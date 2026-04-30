(() => {
const fmt = (n) => n.toLocaleString("de-DE", { maximumFractionDigits: 1 });
const SAVE_KEY = "matrix-foundry-save";

const RESOURCES = [
  ["iron_ore","Eisenerz","raw"],["copper_ore","Kupfererz","raw"],["coal","Kohle","raw"],["stone","Stein","raw"],["silicon_ore","Siliziumerz","raw"],
  ["iron_ingot","Eisenbarren","material"],["copper_ingot","Kupferbarren","material"],["coke","Koks","material"],["graphite","Graphit","material"],["stone_brick","Steinziegel","material"],["glass","Glas","material"],["iron_plate","Eisenplatte","material"],["copper_wire","Kupferdraht","material"],["gear","Zahnrad","material"],["composite_plate","Verbundplatte","material"],["coil","Spule","material"],["silicon_ingot","Siliziumbarren","material"],["silicon_wafer","Siliziumwafer","material"],["logic_chip","Logikchip","material"],["ceramic_plate","Keramikplatte","material"],
  ["forming_tool","Formwerkzeug","component"],["conductor_frame","Leiterrahmen","component"],["machine_housing","Maschinengehäuse","component"],
  ["red_matrix","Roter Matrix-Baustein","matrix"],["blue_matrix","Blauer Matrix-Baustein","matrix"],["yellow_matrix","Gelber Matrix-Baustein","matrix"],
  ["energy_cell","Energiezelle","meta"],["research_red","Rote Forschungsdaten","meta"],["research_blue","Blaue Forschungsdaten","meta"],["research_points","Forschungspunkte","meta"]
];
const BUILDINGS = [
  { type:"miner",name:"Miner",powerUse:2,cost:[{id:"iron_ingot",amount:10},{id:"gear",amount:5}] },
  { type:"smelter",name:"Smelter",powerUse:4,cost:[{id:"iron_plate",amount:8},{id:"stone_brick",amount:4}] },
  { type:"assembler",name:"Assembler",powerUse:5,cost:[{id:"iron_plate",amount:10},{id:"copper_wire",amount:5},{id:"gear",amount:2}] },
  { type:"matrix_press",name:"Matrix Press",powerUse:8,cost:[{id:"iron_plate",amount:12},{id:"coil",amount:4},{id:"machine_housing",amount:2}] },
  { type:"coal_generator",name:"Coal Generator",powerUse:0,powerProduction:15,cost:[{id:"iron_plate",amount:10},{id:"copper_wire",amount:4},{id:"stone_brick",amount:2}] }
];
const RECIPES = [
{id:"iron_ingot",name:"Eisenbarren",building:"smelter",duration:2,inputs:[{id:"iron_ore",amount:2}],outputs:[{id:"iron_ingot",amount:1}]},{id:"copper_ingot",name:"Kupferbarren",building:"smelter",duration:2,inputs:[{id:"copper_ore",amount:2}],outputs:[{id:"copper_ingot",amount:1}]},{id:"coke",name:"Koks",building:"smelter",duration:2,inputs:[{id:"coal",amount:1}],outputs:[{id:"coke",amount:1}]},{id:"stone_brick",name:"Steinziegel",building:"smelter",duration:3,inputs:[{id:"stone",amount:2}],outputs:[{id:"stone_brick",amount:1}]},{id:"glass",name:"Glas",building:"smelter",duration:4,inputs:[{id:"stone",amount:2},{id:"coal",amount:1}],outputs:[{id:"glass",amount:1}]},{id:"silicon_ingot",name:"Siliziumbarren",building:"smelter",duration:3,inputs:[{id:"silicon_ore",amount:2}],outputs:[{id:"silicon_ingot",amount:1}]},
{id:"iron_plate",name:"Eisenplatte",building:"assembler",duration:3,inputs:[{id:"iron_ingot",amount:2}],outputs:[{id:"iron_plate",amount:1}]},{id:"copper_wire",name:"Kupferdraht",building:"assembler",duration:2,inputs:[{id:"copper_ingot",amount:1}],outputs:[{id:"copper_wire",amount:2}]},{id:"gear",name:"Zahnrad",building:"assembler",duration:4,inputs:[{id:"iron_ingot",amount:1},{id:"iron_plate",amount:1}],outputs:[{id:"gear",amount:1}]},{id:"forming_tool",name:"Formwerkzeug",building:"assembler",duration:3,inputs:[{id:"iron_ingot",amount:1}],outputs:[{id:"forming_tool",amount:1}]},{id:"composite_plate",name:"Verbundplatte",building:"assembler",duration:5,inputs:[{id:"coke",amount:1},{id:"iron_plate",amount:1}],outputs:[{id:"composite_plate",amount:1}]},{id:"coil",name:"Spule",building:"assembler",duration:4,inputs:[{id:"copper_wire",amount:2},{id:"iron_plate",amount:1}],outputs:[{id:"coil",amount:1}]},{id:"conductor_frame",name:"Leiterrahmen",building:"assembler",duration:5,inputs:[{id:"copper_wire",amount:2},{id:"composite_plate",amount:1}],outputs:[{id:"conductor_frame",amount:1}]},{id:"machine_housing",name:"Maschinengehäuse",building:"assembler",duration:5,inputs:[{id:"iron_plate",amount:2},{id:"gear",amount:1}],outputs:[{id:"machine_housing",amount:1}]},{id:"silicon_wafer",name:"Siliziumwafer",building:"assembler",duration:5,inputs:[{id:"silicon_ingot",amount:1},{id:"glass",amount:1}],outputs:[{id:"silicon_wafer",amount:1}]},{id:"logic_chip",name:"Logikchip",building:"assembler",duration:6,inputs:[{id:"silicon_wafer",amount:1},{id:"copper_wire",amount:2}],outputs:[{id:"logic_chip",amount:1}]},
{id:"red_matrix",name:"Roter Matrix-Baustein",building:"matrix_press",duration:8,inputs:[{id:"composite_plate",amount:1},{id:"forming_tool",amount:1}],outputs:[{id:"red_matrix",amount:1}]},{id:"blue_matrix",name:"Blauer Matrix-Baustein",building:"matrix_press",duration:12,inputs:[{id:"conductor_frame",amount:1},{id:"logic_chip",amount:1}],outputs:[{id:"blue_matrix",amount:1}]},{id:"yellow_matrix",name:"Gelber Matrix-Baustein",building:"matrix_press",duration:18,inputs:[{id:"ceramic_plate",amount:1},{id:"coil",amount:1},{id:"silicon_wafer",amount:1}],outputs:[{id:"yellow_matrix",amount:1}]},
];
const TECHS = [
{id:"automation_1",name:"Automatisierung I",cost:15,requires:[],effect:"Schaltet Matrix Press Kauf frei."},
{id:"mining_1",name:"Erzabbau I",cost:20,requires:["automation_1"],effect:"Miner-Rate +25%."},
{id:"smelting_1",name:"Schmelztechnik I",cost:25,requires:["automation_1"],effect:"Smelter-Geschwindigkeit +20%."},
{id:"matrix_1",name:"Matrixpressen I",cost:30,requires:["automation_1"],effect:"Schaltet roten Matrix-Baustein frei."},
{id:"silicon_processing",name:"Siliziumverarbeitung",cost:50,requires:["smelting_1"],effect:"Schaltet Silizium-Prozesse frei."},
{id:"logic_systems",name:"Logiksysteme",cost:75,requires:["silicon_processing"],effect:"Schaltet Logikchip und blaue Matrix frei."},
];
const byType = Object.fromEntries(BUILDINGS.map(b=>[b.type,b]));
const byRecipe = Object.fromEntries(RECIPES.map(r=>[r.id,r]));
const categories = ["raw","material","component","matrix","meta"];

const emptyInventory = () => Object.fromEntries(RESOURCES.map(([id]) => [id, 0]));
const createInitialState = () => ({
  time: 0, inventory: Object.assign(emptyInventory(), { iron_ore: 40, copper_ore: 25, coal: 20, stone: 20, energy_cell: 5, research_red: 0, research_blue: 0, research_points: 0 }),
  unlockedRecipes: ["iron_ingot","copper_ingot","coke","stone_brick","glass","iron_plate","copper_wire","gear","forming_tool","composite_plate","coil","conductor_frame","machine_housing"],
  unlockedMiningTargets: ["iron_ore","copper_ore","coal","stone"],
  unlockedBuildings: ["miner","smelter","assembler","coal_generator"], researchedTechs: [], eventLog: ["Matrix Foundry gestartet"],
  modifiers: { miningRate: 1, smelterSpeed: 1 }, power: { produced: 0, required: 0, efficiency: 1 },
  buildings: [
    { id:"miner_1",type:"miner",progress:0,status:"running",minerTarget:"iron_ore" },
    { id:"miner_2",type:"miner",progress:0,status:"running",minerTarget:"copper_ore" },
    { id:"smelter_1",type:"smelter",recipeId:"iron_ingot",progress:0,status:"waiting" },
    { id:"assembler_1",type:"assembler",recipeId:"iron_plate",progress:0,status:"waiting" },
    { id:"coal_generator_1",type:"coal_generator",progress:0,status:"running" }
  ]
});

let state = loadGame();
let last = performance.now();
let acc = 0;
const step = 0.25;

function saveGame() { localStorage.setItem(SAVE_KEY, JSON.stringify(state)); }
function loadGame() { try { return JSON.parse(localStorage.getItem(SAVE_KEY) || "null") || createInitialState(); } catch { return createInitialState(); } }
function resetGame() { localStorage.removeItem(SAVE_KEY); state = createInitialState(); render(); }
const hasStacks = (inv, stacks) => stacks.every((s) => inv[s.id] >= s.amount);
const consume = (inv, stacks) => stacks.forEach((s) => (inv[s.id] -= s.amount));
const produce = (inv, stacks) => stacks.forEach((s) => (inv[s.id] += s.amount));
const techStatus = (id) => state.researchedTechs.includes(id) ? "researched" : (TECHS.find((t) => t.id === id).requires.every((r) => state.researchedTechs.includes(r)) ? "available" : "locked");

function tick(dt) {
  state.time += dt;
  state.power.produced = state.buildings.reduce((s, b) => s + (byType[b.type].powerProduction || 0), 0);
  state.power.required = state.buildings.reduce((s, b) => s + byType[b.type].powerUse, 0);
  state.power.efficiency = state.power.required > 0 ? Math.min(1, state.power.produced / state.power.required) : 1;

  for (const b of state.buildings) {
    if (b.type === "coal_generator") continue;
    if (b.type === "miner") { if (!b.minerTarget) continue; state.inventory[b.minerTarget] += 0.5 * state.modifiers.miningRate * dt * state.power.efficiency; b.status = state.power.efficiency < 1 ? "low_power" : "running"; continue; }
    if (!b.recipeId) { b.status = "no_recipe"; continue; }
    const r = byRecipe[b.recipeId]; if (!r || !state.unlockedRecipes.includes(r.id)) { b.status = "no_recipe"; continue; }
    const speedMod = b.type === "smelter" ? state.modifiers.smelterSpeed : 1;
    if (b.progress <= 0) { if (!hasStacks(state.inventory, r.inputs)) { b.status = "waiting"; continue; } consume(state.inventory, r.inputs); b.progress = r.duration; }
    b.progress -= dt * state.power.efficiency * speedMod;
    b.status = state.power.efficiency < 1 ? "low_power" : "running";
    if (b.progress <= 0) { produce(state.inventory, r.outputs); if (r.id === "red_matrix") { state.inventory.research_red += 5; state.inventory.research_points += 5; } if (r.id === "blue_matrix") { state.inventory.research_blue += 12; state.inventory.research_points += 12; } if (r.id === "yellow_matrix") state.inventory.research_points += 30; state.eventLog.unshift(`${r.name} +${r.outputs[0].amount} produziert`); }
  }
  state.eventLog = state.eventLog.slice(0, 10);
}

function buyBuilding(type){const def=byType[type]; if(!state.unlockedBuildings.includes(type)||!hasStacks(state.inventory,def.cost)) return; consume(state.inventory,def.cost); state.buildings.push({id:`${type}_${state.buildings.length+1}`,type,progress:0,status:"no_recipe",minerTarget:type==="miner"?"iron_ore":undefined}); state.eventLog.unshift(`${def.name} gebaut`);}
function researchTech(id){const t=TECHS.find(x=>x.id===id); if(!t||techStatus(id)!=="available"||state.inventory.research_points<t.cost) return; state.inventory.research_points-=t.cost; state.researchedTechs.push(id); if(id==="automation_1")state.unlockedBuildings.push("matrix_press"); if(id==="mining_1")state.modifiers.miningRate*=1.25; if(id==="smelting_1")state.modifiers.smelterSpeed*=1.2; if(id==="matrix_1")state.unlockedRecipes.push("red_matrix"); if(id==="silicon_processing"){state.unlockedMiningTargets.push("silicon_ore"); state.unlockedRecipes.push("silicon_ingot","silicon_wafer");} if(id==="logic_systems")state.unlockedRecipes.push("logic_chip","blue_matrix"); state.eventLog.unshift(`${t.name} erforscht`);}

function render(){
  const app = document.getElementById("app");
  app.innerHTML = `<h1>Matrix Foundry</h1><header>
  <span>Energie ${fmt(state.power.produced)} / ${fmt(state.power.required)}</span>
  <span>Effizienz ${fmt(state.power.efficiency*100)}%</span>
  <span>Forschungspunkte ${fmt(state.inventory.research_points)}</span>
  <button data-a='save'>Save</button><button data-a='load'>Load</button><button data-a='reset'>Reset</button>
  </header><section class='grid'><article><h2>Inventar</h2>${categories.map(cat=>`<div><h3>${cat}</h3><ul>${RESOURCES.filter(([id,,c])=>c===cat&&(state.inventory[id]>0||state.unlockedRecipes.some(u=>u.includes(id)))).map(([id,name])=>`<li>${name}: ${fmt(state.inventory[id])}</li>`).join("")}</ul></div>`).join("")}</article>
  <article><h2>Gebäude</h2>${BUILDINGS.map(def=>`<div class='card'><b>${def.name} (${state.buildings.filter(b=>b.type===def.type).length})</b><div>Power ${def.powerUse}</div><div>Kosten: ${def.cost.map(c=>`${c.amount} ${c.id}`).join(", ")}</div><button data-buy='${def.type}' ${!state.unlockedBuildings.includes(def.type)?"disabled":""}>Kaufen</button></div>`).join("")}
  ${state.buildings.filter(b=>b.type!=="coal_generator").map(b=>{const options=b.type==="miner"?state.unlockedMiningTargets.map(t=>`<option ${b.minerTarget===t?"selected":""}>${t}</option>`).join(""):["<option value=''>Kein Rezept</option>",...RECIPES.filter(r=>r.building===b.type&&state.unlockedRecipes.includes(r.id)).map(r=>`<option value='${r.id}' ${b.recipeId===r.id?"selected":""}>${r.name}</option>`)].join(""); return `<div class='card'><b>${b.id}</b><div>Status: ${b.status}</div><select data-bid='${b.id}' data-mode='${b.type==="miner"?"mine":"recipe"}'>${options}</select></div>`;}).join("")}
  </article><article><h2>Forschung</h2>${TECHS.map(t=>{const st=techStatus(t.id); return `<div class='card ${st}'><b>${t.name}</b><div>Kosten ${t.cost}</div><div>${t.effect}</div><button data-tech='${t.id}' ${st!=="available"||state.inventory.research_points<t.cost?"disabled":""}>Erforschen</button></div>`;}).join("")}
  <h2>Event Log</h2><ul>${state.eventLog.map(e=>`<li>${e}</li>`).join("")}</ul></article></section>`;

  app.querySelector("[data-a='save']").onclick=()=>saveGame();
  app.querySelector("[data-a='load']").onclick=()=>{state=loadGame(); render();};
  app.querySelector("[data-a='reset']").onclick=()=>resetGame();
  app.querySelectorAll("[data-buy]").forEach(el=>el.onclick=()=>{buyBuilding(el.dataset.buy); render();});
  app.querySelectorAll("[data-tech]").forEach(el=>el.onclick=()=>{researchTech(el.dataset.tech); render();});
  app.querySelectorAll("select[data-bid]").forEach(el=>el.onchange=(e)=>{const b=state.buildings.find(x=>x.id===el.dataset.bid); if(!b) return; if(el.dataset.mode==="mine") b.minerTarget=e.target.value; else b.recipeId=e.target.value||undefined; render();});
}

function loop(now){acc += (now-last)/1000; last=now; while(acc>=step){tick(step); acc-=step;} render(); requestAnimationFrame(loop);}
render(); requestAnimationFrame(loop);
})();
