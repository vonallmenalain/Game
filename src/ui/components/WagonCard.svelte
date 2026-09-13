<script lang="ts">
  import { RECIPE_BY_ID, WAGON_BY_TYPE, crank, getStore, harvestRatePerMinute, hasSelfLoader, productionSpeed, type WagonState } from '../../engine';
  import { formatRate } from '../../lib/format';
  import { game } from '../game.svelte';
  import { WAGON_COLOR, itemName, statusText, statusTone } from '../labels';
  import ItemChip from './ItemChip.svelte';
  import RecipeFlow from './RecipeFlow.svelte';
  import Vehicle from './Vehicle.svelte';

  let { wagon, index }: { wagon: WagonState; index: number } = $props();

  const def = $derived(WAGON_BY_TYPE[wagon.type]);
  const recipe = $derived(wagon.recipe ? RECIPE_BY_ID[wagon.recipe] : undefined);
  const job = $derived(wagon.type === 'ernte' ? (wagon.resource ? itemName(wagon.resource) : null) : (recipe?.name ?? null));
  const rate = $derived.by(() => {
    if (wagon.type === 'ernte') return harvestRatePerMinute(game.state, wagon);
    if (!recipe) return 0;
    const out = recipe.outputs[0];
    return out ? (out.amount / recipe.seconds) * 60 * productionSpeed(game.state, index) : 0;
  });
  const needsCrank = $derived(wagon.type === 'ernte' && !hasSelfLoader(game.state));
  const crankLeft = $derived(Math.max(0, wagon.crankUntil - game.state.playedSeconds));
</script>

<div class="card wagon">
  <button type="button" class="main" onclick={() => (game.sheet = { kind: 'wagen', id: wagon.id })}>
    <span class="silhouette"><Vehicle kind={wagon.type} color={WAGON_COLOR[wagon.type]} rolling={false} /></span>
    <span class="text">
      <span class="title">{def?.name ?? wagon.type} <span class="muted">Stufe {wagon.level}</span></span>
      {#if wagon.type === 'ernte' && wagon.resource}
        <span class="fluss"><ItemChip item={wagon.resource} have={getStore(game.state, wagon.resource)} size="s" /></span>
      {:else if recipe}
        <span class="fluss"><RecipeFlow recipe={recipe.id} size="s" showNames={false} /></span>
      {:else}
        <span class="job">{statusText(game.state, wagon)}</span>
      {/if}
      {#if job}
        <span class="status tone-{statusTone(wagon)}">
          {#if wagon.type !== 'lager'}<span class="mono">{formatRate(rate)}</span>{' · '}{/if}{statusText(game.state, wagon)}
        </span>
      {/if}
    </span>
  </button>
  {#if needsCrank}
    <button type="button" class="btn primary crank" onclick={() => game.run(crank(game.state, wagon.id))}>
      Kurbeln
      {#if crankLeft > 0}<span class="mono small">{Math.ceil(crankLeft)} s</span>{/if}
    </button>
  {/if}
</div>

<style>
  .silhouette {
    flex: none;
    display: grid;
    place-items: center;
    width: 58px;
    height: 44px;
    overflow: hidden;
  }

  .wagon {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 10px 12px;
  }

  .main {
    flex: 1;
    display: flex;
    align-items: center;
    gap: 12px;
    min-width: 0;
    border: 0;
    background: transparent;
    padding: 0;
    text-align: left;
    color: inherit;
    font: inherit;
    cursor: pointer;
  }

  .text {
    display: flex;
    flex-direction: column;
    gap: 2px;
    min-width: 0;
  }

  .title {
    font-weight: 600;
  }

  .job {
    font-size: 14px;
  }

  .fluss {
    display: block;
    margin: 2px 0 1px;
  }

  .status {
    font-size: 13px;
  }

  .crank {
    flex-direction: column;
    gap: 0;
    min-width: 84px;
  }

  .small {
    font-size: 11px;
    font-weight: 500;
  }
</style>
