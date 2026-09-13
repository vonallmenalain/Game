<script lang="ts">
  import { WAGONS, currentLoco, isWagonTypeUnlocked, wagonOfType } from '../../engine';
  import { game } from '../game.svelte';
  import WagonCard from './WagonCard.svelte';

  const free = $derived(currentLoco(game.state).slots - game.state.wagons.length);
  /** Wagentypen, die es noch nicht gibt. Von jedem Typ hat der Zug genau einen. */
  const offen = $derived(WAGONS.filter((w) => !wagonOfType(game.state, w.type)));
  const bereit = $derived(offen.filter((w) => isWagonTypeUnlocked(game.state, w.type)).length);
  const maschinen = $derived(game.state.wagons.reduce((sum, w) => sum + w.machines.length, 0));
</script>

<section class="list">
  <div class="head">
    <span class="eyebrow">Wagen · {game.state.wagons.length} mit {maschinen} Maschinen</span>
  </div>
  {#each game.state.wagons as w (w.id)}
    <WagonCard wagon={w} />
  {/each}
  {#if offen.length > 0}
    <button type="button" class="btn primary add" onclick={() => (game.sheet = { kind: 'bauen' })} disabled={free <= 0}>
      {#if free <= 0}
        Kein Platz für weitere Wagen
      {:else if bereit > 0}
        Wagen anhängen, {bereit} möglich
      {:else}
        Weitere Wagen kommen aus der Forschung
      {/if}
    </button>
  {/if}
</section>

<style>
  .list {
    display: flex;
    flex-direction: column;
    gap: 8px;
    padding: 12px 16px 24px;
  }

  .head {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  .head .eyebrow {
    margin: 0;
  }

  .add {
    margin-top: 6px;
  }
</style>
