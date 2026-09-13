<script lang="ts">
  import {
    BALANCE,
    RECIPE_BY_ID,
    WAGON_BY_TYPE,
    buildMachine,
    canAfford,
    crank,
    detachRefund,
    detachWagon,
    discoveredResources,
    freeMachineSlots,
    harvestRatePerMinute,
    hasSelfLoader,
    getStore,
    ingredientsOf,
    isOnSite,
    machineSlots,
    machineSpeed,
    moveWagon,
    nextMachineCost,
    removeMachine,
    setMachineRecipe,
    setMachineResource,
    unlockedRecipesFor,
    upgradeWagon,
    wagonBaseSpeed,
    wagonUpgradeCost,
    type MachineState,
  } from '../../engine';
  import { formatRate } from '../../lib/format';
  import { game } from '../game.svelte';
  import { WAGON_COLOR, itemName, machineName, machineStatusText, stackText, statusText, statusTone } from '../labels';
  import ItemChip from './ItemChip.svelte';
  import RecipeFlow from './RecipeFlow.svelte';
  import Vehicle from './Vehicle.svelte';

  let { id }: { id: number } = $props();

  const index = $derived(game.state.wagons.findIndex((w) => w.id === id));
  const wagon = $derived(game.state.wagons[index]);
  const def = $derived(wagon ? WAGON_BY_TYPE[wagon.type] : undefined);
  const baseSpeed = $derived(wagon ? wagonBaseSpeed(game.state, wagon) : 1);
  const upgradeCost = $derived(wagon && def?.upgradable && wagon.level < BALANCE.maxLevel ? wagonUpgradeCost(wagon.type, wagon.level + 1) : null);
  const canUpgrade = $derived(upgradeCost ? canAfford(game.state, upgradeCost) : false);
  const selfLoader = $derived(hasSelfLoader(game.state));
  const machineCost = $derived(wagon ? nextMachineCost(wagon) : []);
  const frei = $derived(wagon ? freeMachineSlots(game.state, wagon) : 0);

  /** Welche Maschine gerade ihren Auftrag ändern lässt */
  let offen = $state<number | null>(null);
  let confirmDetach = $state(false);

  /** Was diese Maschine mit dem Rezept pro Minute ausstösst */
  function rateText(m: MachineState, recipeId: string): string {
    const r = RECIPE_BY_ID[recipeId];
    if (!r || !wagon) return '';
    const factor = (60 / r.seconds) * (m.recipe === recipeId ? machineSpeed(game.state, wagon, m) : baseSpeed);
    return r.outputs.map((s) => formatRate(s.amount * factor)).join(' + ');
  }

  function setzeRezept(m: MachineState, recipeId: string) {
    if (!wagon) return;
    if (game.run(setMachineRecipe(game.state, wagon.id, m.id, recipeId))) offen = null;
  }

  function setzeRohstoff(m: MachineState, item: string) {
    if (!wagon) return;
    if (game.run(setMachineResource(game.state, wagon.id, m.id, item))) offen = null;
  }

  function bauen() {
    if (!wagon) return;
    const vorher = wagon.machines.length;
    if (game.run(buildMachine(game.state, wagon.id))) {
      const neu = wagon.machines[vorher];
      if (neu) offen = neu.id;
    }
  }

  function detach() {
    if (!wagon) return;
    if (!confirmDetach) {
      confirmDetach = true;
      return;
    }
    if (game.run(detachWagon(game.state, wagon.id))) game.sheet = { kind: 'none' };
  }
</script>

{#if wagon && def}
  <div class="head">
    <span class="silhouette"><Vehicle kind={wagon.type} color={WAGON_COLOR[wagon.type]} rolling={false} /></span>
    <div>
      <div class="title">{def.name} <span class="muted">Stufe {wagon.level}</span></div>
      <div class="tone-{statusTone(wagon)}">{statusText(game.state, wagon)}</div>
    </div>
  </div>

  <p class="eyebrow">{machineName(wagon.type)} · {wagon.machines.length} von {machineSlots(game.state)}</p>

  <div class="maschinen">
    {#each wagon.machines as m, i (m.id)}
      <div class="maschine" class:offen={offen === m.id}>
        <div class="zeile">
          <button type="button" class="auftrag" onclick={() => (offen = offen === m.id ? null : m.id)} disabled={wagon.type === 'lager'}>
            <span class="nr mono">{i + 1}</span>
            <span class="was">
              {#if wagon.type === 'lager'}
                <span class="small">Regal · plus {BALANCE.storeCapPerRegal} Kapazität je Ware</span>
              {:else if wagon.type === 'ernte'}
                {#if m.resource}
                  <ItemChip item={m.resource} have={getStore(game.state, m.resource)} size="s" showName />
                {:else}
                  <span class="small tone-warn">Rohstoff wählen</span>
                {/if}
              {:else if m.recipe}
                <RecipeFlow recipe={m.recipe} size="s" showNames={false} />
              {:else}
                <span class="small tone-warn">Auftrag wählen</span>
              {/if}
              <span class="status tone-{statusTone(m)}">{machineStatusText(game.state, wagon, m)}</span>
            </span>
            {#if wagon.type !== 'lager'}
              <span class="pfeil" aria-hidden="true">{offen === m.id ? '×' : '›'}</span>
            {/if}
          </button>
          {#if wagon.machines.length > 1}
            <button type="button" class="btn ghost weg" aria-label="{machineName(wagon.type)} {i + 1} ausbauen" onclick={() => game.run(removeMachine(game.state, wagon.id, m.id))}>×</button>
          {/if}
        </div>

        {#if offen === m.id}
          <div class="choices">
            {#if wagon.type === 'ernte'}
              {#each discoveredResources(game.state) as res (res)}
                <button type="button" class="choice row" class:active={m.resource === res} onclick={() => setzeRohstoff(m, res)}>
                  <ItemChip item={res} have={getStore(game.state, res)} />
                  <span class="text">
                    <span class="name">{itemName(res)}</span>
                    <span class="muted small">{formatRate(harvestRatePerMinute(game.state, wagon, res))}{#if isOnSite(game.state, res)}{` · vor Ort, mal ${BALANCE.onSiteBonus.toString().replace('.', ',')}`}{/if}</span>
                  </span>
                </button>
              {/each}
            {:else}
              {#each unlockedRecipesFor(game.state, wagon.type) as r (r.id)}
                {@const fehlt = ingredientsOf(game.state, r.id).filter((z) => !z.enough)}
                <button type="button" class="choice" class:active={m.recipe === r.id} onclick={() => setzeRezept(m, r.id)}>
                  <span class="kopf">
                    <span class="name">{r.name}</span>
                    <span class="muted small mono">{rateText(m, r.id)}</span>
                  </span>
                  <RecipeFlow recipe={r.id} />
                  {#if fehlt.length > 0}
                    <span class="small tone-warn">Kein {fehlt.map((z) => itemName(z.item)).join(', kein ')} im Lager.</span>
                  {/if}
                </button>
              {/each}
            {/if}
          </div>
        {/if}
      </div>
    {/each}
  </div>

  <div class="row">
    <span class="small">
      {#if frei > 0}
        {stackText(machineCost)}
      {:else}
        Alle {machineSlots(game.state)} Plätze belegt. Mehr Platz gibt es über die Forschung und eine stärkere Lok.
      {/if}
    </span>
    <button type="button" class="btn primary" disabled={frei <= 0 || !canAfford(game.state, machineCost)} onclick={bauen}>
      {machineName(wagon.type)} bauen
    </button>
  </div>

  {#if wagon.type === 'ernte' && !selfLoader}
    <p class="hint">Ohne Selbstlader erntet der Wagen nur, wenn du kurbelst. Jeder Tipp gibt {BALANCE.crankSeconds} Sekunden für alle Maschinen im Wagen.</p>
    <button type="button" class="btn primary wide" onclick={() => game.run(crank(game.state, wagon.id))}>Kurbeln</button>
  {:else if wagon.type !== 'ernte' && wagon.type !== 'lager'}
    <p class="hint">Kurze Wege: Stellt eine Maschine im selben Wagen eine Zutat her, arbeitet die Maschine daneben {Math.round(BALANCE.neighborBonus * 100)} Prozent schneller.</p>
  {/if}

  {#if def.upgradable}
    <p class="eyebrow">Aufstufen</p>
    {#if upgradeCost}
      <div class="row">
        <span class="small">Stufe {wagon.level + 1}: {stackText(upgradeCost)}<br /><span class="muted">plus {Math.round(BALANCE.levelSpeedStep * 100)} Prozent Tempo für jede Maschine im Wagen</span></span>
        <button type="button" class="btn primary" disabled={!canUpgrade} onclick={() => game.run(upgradeWagon(game.state, wagon.id))}>Aufstufen</button>
      </div>
      {#if !canUpgrade}
        <p class="small tone-warn">Es fehlen {upgradeCost.filter((s) => getStore(game.state, s.item) < s.amount).map((s) => `${s.amount - getStore(game.state, s.item)} ${itemName(s.item)}`).join(', ')}.</p>
      {/if}
    {:else}
      <p class="small muted">Höchste Stufe erreicht.</p>
    {/if}
  {/if}

  <p class="eyebrow">Reihenfolge</p>
  <div class="row">
    <button type="button" class="btn" disabled={index <= 0} onclick={() => game.run(moveWagon(game.state, wagon.id, index - 1))}>Nach vorne</button>
    <button type="button" class="btn" disabled={index >= game.state.wagons.length - 1} onclick={() => game.run(moveWagon(game.state, wagon.id, index + 1))}>Nach hinten</button>
  </div>

  <p class="eyebrow">Abkoppeln</p>
  <div class="row">
    <span class="small muted">Gibt {stackText(detachRefund(wagon))} zurück.</span>
    <button type="button" class="btn danger" onclick={detach}>{confirmDetach ? 'Wirklich abkoppeln' : 'Abkoppeln'}</button>
  </div>
{:else}
  <p class="muted">Dieser Wagen ist nicht mehr im Zug.</p>
{/if}

<style>
  .silhouette {
    flex: none;
    display: grid;
    place-items: center;
    width: 62px;
    height: 48px;
  }

  .head {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 14px;
  }

  .title {
    font-family: var(--display);
    font-size: 22px;
    font-weight: 600;
  }

  .maschinen {
    display: grid;
    gap: 6px;
    margin-bottom: 10px;
  }

  .maschine {
    border: 1px solid var(--line);
    border-radius: 8px;
    background: var(--surface);
  }

  .maschine.offen {
    border-color: var(--accent);
  }

  .zeile {
    display: flex;
    align-items: stretch;
    gap: 4px;
  }

  /* Die ganze Zeile öffnet die Auswahl: Auf dem Handy ist das Ziel gross genug. */
  .auftrag {
    flex: 1;
    display: flex;
    align-items: center;
    gap: 10px;
    min-width: 0;
    padding: 8px 10px;
    border: 0;
    border-radius: 8px;
    background: transparent;
    color: inherit;
    font: inherit;
    text-align: left;
    cursor: pointer;
  }

  .auftrag:disabled {
    cursor: default;
  }

  .nr {
    flex: none;
    width: 20px;
    font-size: 12px;
    color: var(--ink-2);
  }

  .was {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 3px;
    min-width: 0;
  }

  .status {
    font-size: 12.5px;
  }

  /* Der Pfeil sagt, dass die Zeile aufgeht. Offen wird er zum Schliessen-Zeichen. */
  .pfeil {
    flex: none;
    width: 14px;
    text-align: center;
    font-size: 17px;
    color: var(--ink-2);
  }

  .weg {
    flex: none;
    width: 32px;
    padding: 0;
    font-size: 15px;
    line-height: 1;
    color: var(--ink-2);
  }

  .choices {
    display: grid;
    gap: 6px;
    padding: 0 10px 10px;
  }

  .choice {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 7px;
    padding: 10px 12px;
    border: 1px solid var(--line);
    border-radius: 8px;
    background: var(--bg);
    color: inherit;
    font: inherit;
    text-align: left;
    cursor: pointer;
  }

  .choice.active {
    border-color: var(--accent);
    background: var(--accent-soft);
  }

  .choice .name {
    font-weight: 600;
  }

  .choice.row {
    flex-direction: row;
    align-items: center;
    gap: 12px;
  }

  .choice .text {
    display: flex;
    flex-direction: column;
    gap: 1px;
  }

  .kopf {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 10px;
    width: 100%;
  }

  .small {
    font-size: 13px;
  }

  .hint {
    font-size: 13px;
    color: var(--ink-2);
    margin: 0 0 10px;
  }

  .row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
    margin-bottom: 10px;
  }

  .wide {
    width: 100%;
    margin-bottom: 10px;
  }
</style>
