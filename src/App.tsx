import { useEffect, useMemo, useState } from "react";
import { BUILDINGS } from "./game/buildings";
import { buyBuilding, getTechStatus, recipesByBuilding, researchTech, tick } from "./game/engine";
import { createInitialState } from "./game/initialState";
import { RECIPE_BY_ID } from "./game/recipes";
import { RESOURCES } from "./game/resources";
import { loadGame, resetGame, saveGame } from "./game/saveLoad";
import { TECHS } from "./game/techs";
import "./styles.css";

const fmt = (n: number) => n.toLocaleString("de-DE", { maximumFractionDigits: 1 });

export default function App() {
  const [state, setState] = useState(createInitialState());
  useEffect(() => setState(loadGame()), []);
  useEffect(() => {
    let last = performance.now(); let acc = 0; const step = 0.25;
    let raf = 0; const loop = (now: number) => { acc += (now - last) / 1000; last = now; while (acc >= step) { setState((s) => tick(s, step)); acc -= step; } raf = requestAnimationFrame(loop); };
    raf = requestAnimationFrame(loop); return () => cancelAnimationFrame(raf);
  }, []);
  const grouped = useMemo(() => ["raw", "material", "component", "matrix", "meta"] as const, []);

  return <main className="app"><h1>Matrix Foundry</h1><header><span>Energie {fmt(state.power.produced)} / {fmt(state.power.required)}</span><span>Effizienz {fmt(state.power.efficiency * 100)}%</span><span>Forschungspunkte {fmt(state.inventory.research_points)}</span><button onClick={() => saveGame(state)}>Save</button><button onClick={() => setState(loadGame())}>Load</button><button onClick={() => setState(resetGame())}>Reset</button></header><section className="grid">
    <article><h2>Inventar</h2>{grouped.map((cat) => <div key={cat}><h3>{cat}</h3><ul>{RESOURCES.filter((r) => r.category === cat && (state.inventory[r.id] > 0 || state.unlockedRecipes.some((u) => u.includes(r.id)))).map((r) => <li key={r.id}>{r.name}: {fmt(state.inventory[r.id])}</li>)}</ul></div>)}</article>
    <article><h2>Gebäude</h2>{BUILDINGS.map((def) => <div key={def.type} className="card"><b>{def.name} ({state.buildings.filter((b) => b.type === def.type).length})</b><div>Power {def.powerUse}</div><div>Kosten: {def.cost.map((c) => `${c.amount} ${c.id}`).join(", ")}</div><button disabled={!state.unlockedBuildings.includes(def.type)} onClick={() => setState((s) => buyBuilding(s, def.type))}>Kaufen</button></div>)}
      {state.buildings.filter((b) => b.type !== "coal_generator").map((b) => { const recipe = b.recipeId ? RECIPE_BY_ID[b.recipeId] : undefined; const value = recipe ? Math.max(0, recipe.duration - b.progress) : 0; const max = recipe?.duration ?? 1; return <div key={b.id} className="card"><b>{b.id}</b><div>Status: {b.status}</div>{b.type === "miner" ? <select value={b.minerTarget} onChange={(e) => setState((s) => ({ ...s, buildings: s.buildings.map((x) => x.id === b.id ? { ...x, minerTarget: e.target.value as any } : x) }))}>{state.unlockedMiningTargets.map((t) => <option key={t} value={t}>{t}</option>)}</select> : <select value={b.recipeId ?? ""} onChange={(e) => setState((s) => ({ ...s, buildings: s.buildings.map((x) => x.id === b.id ? { ...x, recipeId: e.target.value || undefined } : x) }))}><option value="">Kein Rezept</option>{recipesByBuilding(b.type, state.unlockedRecipes).map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}</select>}<progress max={max} value={value} /></div>; })}</article>
    <article><h2>Forschung</h2>{TECHS.map((t) => { const st = getTechStatus(state, t.id); return <div key={t.id} className={`card ${st}`}><b>{t.name}</b><div>Kosten {t.cost}</div><div>{t.effect}</div><button disabled={st !== "available" || state.inventory.research_points < t.cost} onClick={() => setState((s) => researchTech(s, t.id))}>Erforschen</button></div>; })}
      <h2>Event Log</h2><ul>{state.eventLog.map((e, i) => <li key={i}>{e}</li>)}</ul></article>
  </section></main>;
}
