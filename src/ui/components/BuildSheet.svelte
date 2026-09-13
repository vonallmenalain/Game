<script lang="ts">
  import { WAGONS, TECH_BY_ID, buildWagon, canAfford, currentLoco, getStore, isWagonTypeUnlocked, wagonBuildCost } from '../../engine';
  import { game } from '../game.svelte';
  import { WAGON_COLOR, itemName } from '../labels';
  import Vehicle from './Vehicle.svelte';

  const free = $derived(currentLoco(game.state).slots - game.state.wagons.length);

  function build(type: (typeof WAGONS)[number]['type']) {
    if (game.run(buildWagon(game.state, type))) {
      const w = game.state.wagons[game.state.wagons.length - 1];
      game.sheet = w ? { kind: 'wagen', id: w.id } : { kind: 'none' };
    }
  }
</script>

<p class="muted small">{free} von {currentLoco(game.state).slots} Plätzen frei. Jeder Wagen braucht ein Fahrgestell aus dem Werkwagen oder der Werkbank.</p>

<div class="list">
  {#each WAGONS as w (w.type)}
    {@const unlocked = isWagonTypeUnlocked(game.state, w.type)}
    {@const cost = wagonBuildCost(w.type)}
    {@const affordable = canAfford(game.state, cost)}
    <div class="card entry" class:locked={!unlocked}>
      <span class="silhouette"><Vehicle kind={w.type} color={WAGON_COLOR[w.type]} rolling={false} /></span>
      <div class="text">
        <div class="title">{w.name}</div>
        {#if unlocked}
          <div class="cost">
            {#each cost as s (s.item)}
              <span class:missing={getStore(game.state, s.item) < s.amount}>{s.amount} {itemName(s.item)} <span class="muted">({getStore(game.state, s.item)})</span></span>
            {/each}
          </div>
        {:else}
          <div class="small muted">Braucht die Technologie {w.tech ? (TECH_BY_ID[w.tech]?.name ?? w.tech) : ''}.</div>
        {/if}
      </div>
      <button type="button" class="btn primary" disabled={!unlocked || !affordable || free <= 0} onclick={() => build(w.type)}>Anhängen</button>
    </div>
  {/each}
</div>

<style>
  .small {
    font-size: 13px;
    margin: 0 0 10px;
  }

  .list {
    display: grid;
    gap: 8px;
  }

  .silhouette {
    flex: none;
    display: grid;
    place-items: center;
    width: 58px;
    height: 44px;
  }

  .entry {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .entry.locked {
    opacity: 0.6;
  }

  .text {
    flex: 1;
    min-width: 0;
  }

  .title {
    font-weight: 600;
  }

  .cost {
    display: flex;
    flex-wrap: wrap;
    gap: 2px 10px;
    font-size: 13px;
  }

  .missing {
    color: var(--warn);
  }
</style>
