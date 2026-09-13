<script lang="ts">
  import {
    BALANCE,
    RECIPE_BY_ID,
    WAGON_BY_TYPE,
    canAfford,
    crank,
    detachRefund,
    detachWagon,
    discoveredResources,
    harvestRatePerMinute,
    hasSelfLoader,
    getStore,
    ingredientsOf,
    isOnSite,
    levelMultiplier,
    moveWagon,
    productionSpeed,
    setRecipe,
    setResource,
    unlockedRecipesFor,
    upgradeWagon,
    wagonTypeMultiplier,
    wagonUpgradeCost,
  } from '../../engine';
  import { formatRate } from '../../lib/format';
  import { game } from '../game.svelte';
  import { WAGON_COLOR, itemName, stackText, statusText, statusTone } from '../labels';
  import ItemChip from './ItemChip.svelte';
  import RecipeFlow from './RecipeFlow.svelte';
  import Vehicle from './Vehicle.svelte';

  let { id }: { id: number } = $props();

  const index = $derived(game.state.wagons.findIndex((w) => w.id === id));
  const wagon = $derived(game.state.wagons[index]);
  const def = $derived(wagon ? WAGON_BY_TYPE[wagon.type] : undefined);
  const speed = $derived(wagon && wagon.type !== 'ernte' && wagon.type !== 'lager' ? productionSpeed(game.state, index) : 0);
  const baseSpeed = $derived(wagon ? levelMultiplier(wagon.level) * wagonTypeMultiplier(game.state, wagon.type) : 1);
  const neighborBonus = $derived(wagon?.recipe ? speed > baseSpeed + 1e-9 : false);
  const upgradeCost = $derived(wagon && def?.upgradable && wagon.level < BALANCE.maxLevel ? wagonUpgradeCost(wagon.type, wagon.level + 1) : null);
  const canUpgrade = $derived(upgradeCost ? canAfford(game.state, upgradeCost) : false);
  const selfLoader = $derived(hasSelfLoader(game.state));

  let confirmDetach = $state(false);

  /** Wie viel dieser Wagen mit dem Rezept pro Minute ausstösst */
  function rateText(recipeId: string): string {
    const r = RECIPE_BY_ID[recipeId];
    if (!r || !wagon) return '';
    const factor = (60 / r.seconds) * (wagon.recipe === recipeId ? speed : baseSpeed);
    return r.outputs.map((s) => formatRate(s.amount * factor)).join(' + ');
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

  {#if wagon.type === 'ernte'}
    <p class="eyebrow">Rohstoff</p>
    <div class="choices">
      {#each discoveredResources(game.state) as res (res)}
        <button type="button" class="choice row" class:active={wagon.resource === res} onclick={() => game.run(setResource(game.state, wagon.id, res))}>
          <ItemChip item={res} have={getStore(game.state, res)} />
          <span class="text">
            <span class="name">{itemName(res)}</span>
            <span class="muted small">{formatRate(harvestRatePerMinute(game.state, wagon, res))}{#if isOnSite(game.state, res)}{` · vor Ort, mal ${BALANCE.onSiteBonus.toString().replace('.', ',')}`}{/if}</span>
          </span>
        </button>
      {/each}
    </div>
    {#if !selfLoader}
      <p class="hint">Ohne Selbstlader erntet der Wagen nur, wenn du kurbelst. Jeder Tipp gibt {BALANCE.crankSeconds} Sekunden.</p>
      <button type="button" class="btn primary wide" onclick={() => game.run(crank(game.state, wagon.id))}>Kurbeln</button>
    {/if}
  {:else if wagon.type === 'lager'}
    <p class="hint">Erhöht die Kapazität jeder Ware um {BALANCE.storeCapPerLagerwagen}.</p>
  {:else}
    <p class="eyebrow">Rezept</p>
    <div class="choices">
      {#each unlockedRecipesFor(game.state, wagon.type) as r (r.id)}
        {@const fehlt = ingredientsOf(game.state, r.id).filter((z) => !z.enough)}
        <button type="button" class="choice" class:active={wagon.recipe === r.id} onclick={() => game.run(setRecipe(game.state, wagon.id, r.id))}>
          <span class="kopf">
            <span class="name">{r.name}</span>
            <span class="muted small mono">{rateText(r.id)}</span>
          </span>
          <RecipeFlow recipe={r.id} />
          {#if fehlt.length > 0}
            <span class="small tone-warn">Kein {fehlt.map((z) => itemName(z.item)).join(', kein ')} im Lager.</span>
          {/if}
        </button>
      {/each}
    </div>
    <p class="hint">
      {#if neighborBonus}
        Nachbarschaftsbonus aktiv: Der Wagen davor liefert eine Zutat, plus {Math.round(BALANCE.neighborBonus * 100)} Prozent Tempo.
      {:else}
        Kein Nachbarschaftsbonus. Hängt der Wagen direkt hinter einem, der eine Zutat liefert, arbeitet er {Math.round(BALANCE.neighborBonus * 100)} Prozent schneller.
      {/if}
    </p>
  {/if}

  {#if def.upgradable}
    <p class="eyebrow">Aufstufen</p>
    {#if upgradeCost}
      <div class="row">
        <span class="small">Stufe {wagon.level + 1}: {stackText(upgradeCost)}<br /><span class="muted">plus {Math.round(BALANCE.levelSpeedStep * 100)} Prozent Tempo</span></span>
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
    <span class="small muted">Gibt {stackText(detachRefund(wagon.type))} zurück.</span>
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

  .choices {
    display: grid;
    gap: 6px;
    margin-bottom: 10px;
  }

  .choice {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 7px;
    padding: 10px 12px;
    border: 1px solid var(--line);
    border-radius: 8px;
    background: var(--surface);
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
