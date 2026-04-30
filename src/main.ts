import { createInitialState, tick } from "./game/engine";
import { RESOURCE_IDS } from "./game/content";

const app = document.querySelector<HTMLDivElement>("#app");
if (!app) {
  throw new Error("Container #app wurde nicht gefunden.");
}

let state = createInitialState();

function formatNumber(value: number): string {
  return value.toLocaleString("de-DE", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 1
  });
}

function render(): void {
  app.innerHTML = `
    <main style="font-family: Inter, system-ui, sans-serif; max-width: 960px; margin: 0 auto; padding: 1.5rem;">
      <h1 style="margin-bottom: .25rem;">Matrix Foundry (Browser-Prototyp)</h1>
      <p style="margin-top: 0; color: #555;">Erster lauffähiger Build im Browser mit Live-Simulation.</p>

      <section style="display: grid; grid-template-columns: repeat(3, minmax(0,1fr)); gap: .75rem; margin: 1rem 0;">
        <article style="padding: .75rem; border: 1px solid #ddd; border-radius: .5rem;">
          <strong>Zeit</strong>
          <div>${formatNumber(state.time)} s</div>
        </article>
        <article style="padding: .75rem; border: 1px solid #ddd; border-radius: .5rem;">
          <strong>Forschungspunkte</strong>
          <div>${formatNumber(state.researchPoints)}</div>
        </article>
        <article style="padding: .75rem; border: 1px solid #ddd; border-radius: .5rem;">
          <strong>Strom</strong>
          <div>${formatNumber(state.power.produced)} / ${formatNumber(state.power.required)}</div>
        </article>
      </section>

      <section style="margin: 1rem 0;">
        <h2>Inventar</h2>
        <ul style="columns: 2; padding-left: 1rem;">
          ${RESOURCE_IDS.map((id) => `<li><code>${id}</code>: ${formatNumber(state.inventory[id])}</li>`).join("")}
        </ul>
      </section>

      <section>
        <h2>Gebäude</h2>
        <ul style="padding-left: 1rem;">
          ${state.buildings
            .map(
              (building) =>
                `<li><strong>${building.id}</strong> (${building.type}) – Rezept: ${building.recipeId ?? "-"}, Fortschritt: ${formatNumber(
                  Math.max(0, building.progress)
                )}, Effizienz: ${formatNumber(building.efficiency * 100)}%</li>`
            )
            .join("")}
        </ul>
      </section>
    </main>
  `;
}

render();
window.setInterval(() => {
  state = tick(state);
  render();
}, 250);
