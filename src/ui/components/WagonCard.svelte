<script lang="ts">
  import {
    RECIPE_BY_ID,
    WAGON_BY_TYPE,
    crank,
    getStore,
    harvestRatePerMinute,
    hasSelfLoader,
    machineSlots,
    machineSpeed,
    type WagonState,
  } from '../../engine';
  import { formatRate } from '../../lib/format';
  import { game } from '../game.svelte';
  import { WAGON_COLOR, machineName, statusText, statusTone } from '../labels';
  import ItemChip from './ItemChip.svelte';
  import Vehicle from './Vehicle.svelte';

  let { wagon }: { wagon: WagonState } = $props();

  const def = $derived(WAGON_BY_TYPE[wagon.type]);

  /**
   * Was der Wagen ausstösst, je Ware zusammengezählt: «Koks ×2» statt zweimal Koks.
   * So sieht man auf der Karte, wofür die Maschinen darin eingeteilt sind.
   */
  const ausstoss = $derived.by(() => {
    const gruppen = new Map<string, { item: string; maschinen: number; rate: number }>();
    for (const m of wagon.machines) {
      if (wagon.type === 'ernte') {
        if (!m.resource) continue;
        const eintrag = gruppen.get(m.resource) ?? { item: m.resource, maschinen: 0, rate: 0 };
        eintrag.maschinen += 1;
        eintrag.rate += harvestRatePerMinute(game.state, wagon, m.resource);
        gruppen.set(m.resource, eintrag);
        continue;
      }
      const r = m.recipe ? RECIPE_BY_ID[m.recipe] : undefined;
      const out = r?.outputs[0];
      if (!r || !out) continue;
      const eintrag = gruppen.get(out.item) ?? { item: out.item, maschinen: 0, rate: 0 };
      eintrag.maschinen += 1;
      eintrag.rate += (out.amount / r.seconds) * 60 * machineSpeed(game.state, wagon, m);
      gruppen.set(out.item, eintrag);
    }
    return [...gruppen.values()].sort((a, b) => b.maschinen - a.maschinen);
  });

  const rate = $derived(ausstoss.reduce((sum, g) => sum + g.rate, 0));
  const needsCrank = $derived(wagon.type === 'ernte' && !hasSelfLoader(game.state));
  const crankLeft = $derived(Math.max(0, wagon.crankUntil - game.state.playedSeconds));
</script>

<div class="card wagon">
  <button type="button" class="main" onclick={() => (game.sheet = { kind: 'wagen', id: wagon.id })}>
    <span class="silhouette"><Vehicle kind={wagon.type} color={WAGON_COLOR[wagon.type]} rolling={false} /></span>
    <span class="text">
      <span class="title">
        {def?.name ?? wagon.type} <span class="muted">Stufe {wagon.level}</span>
        <span class="plaetze mono">{wagon.machines.length}/{machineSlots(game.state)}</span>
      </span>
      {#if ausstoss.length > 0}
        <span class="fluss">
          {#each ausstoss as g (g.item)}
            <span class="gruppe">
              <ItemChip item={g.item} have={getStore(game.state, g.item)} size="s" />
              {#if g.maschinen > 1}<b class="mono">×{g.maschinen}</b>{/if}
            </span>
          {/each}
        </span>
      {:else if wagon.type !== 'lager'}
        <span class="job">{machineName(wagon.type)} ohne Auftrag</span>
      {/if}
      <span class="status tone-{statusTone(wagon)}">
        {#if wagon.type !== 'lager'}<span class="mono">{formatRate(rate)}</span>{' · '}{/if}{statusText(game.state, wagon)}
      </span>
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

  .plaetze {
    font-size: 12px;
    font-weight: 500;
    color: var(--ink-2);
  }

  .job {
    font-size: 14px;
  }

  .fluss {
    display: flex;
    flex-wrap: wrap;
    align-items: flex-start;
    gap: 4px 10px;
    margin: 2px 0 1px;
  }

  .gruppe {
    display: flex;
    align-items: center;
    gap: 3px;
  }

  .gruppe b {
    font-size: 12px;
    color: var(--ink-2);
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
