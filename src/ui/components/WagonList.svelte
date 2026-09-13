<script lang="ts">
  import { currentLoco } from '../../engine';
  import { game } from '../game.svelte';
  import WagonCard from './WagonCard.svelte';

  const free = $derived(currentLoco(game.state).slots - game.state.wagons.length);
</script>

<section class="list">
  <div class="head">
    <span class="eyebrow">Wagen · {game.state.wagons.length} von {currentLoco(game.state).slots}</span>
    <button type="button" class="btn small" onclick={() => (game.sheet = { kind: 'werkstatt' })}>Werkstatt</button>
  </div>
  {#each game.state.wagons as w, i (w.id)}
    <WagonCard wagon={w} index={i} />
  {/each}
  <button type="button" class="btn primary add" onclick={() => (game.sheet = { kind: 'bauen' })} disabled={free <= 0}>
    {free > 0 ? `Wagen anhängen, ${free} frei` : 'Kein Platz für weitere Wagen'}
  </button>
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
