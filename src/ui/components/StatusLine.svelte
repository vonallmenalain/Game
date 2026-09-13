<script lang="ts">
  import { formatKm } from '../../lib/format';
  import { game } from '../game.svelte';
  import { nextEvent, stopText } from '../track';

  const next = $derived(nextEvent(game.state));
  const moving = $derived(game.state.stop === 'faehrt');
</script>

<header class="status">
  <span class="brand">Loco</span>
  <span class="mono">{formatKm(game.state.km)}</span>
  {#if next}
    <span class="muted">
      {#if next.km - game.state.km < 0.005}
        vor {next.label}
      {:else}
        {next.label} in {formatKm(next.km - game.state.km)}
      {/if}
    </span>
  {/if}
  <span class={moving ? 'tone-good' : 'tone-warn'}>{stopText(game.state)}</span>
</header>

<style>
  .status {
    position: sticky;
    top: 0;
    z-index: 5;
    display: flex;
    flex-wrap: wrap;
    align-items: baseline;
    gap: 4px 14px;
    padding: 10px 16px;
    background: var(--surface);
    border-bottom: 1px solid var(--line);
    font-size: 13px;
  }

  .brand {
    font-family: var(--display);
    font-size: 18px;
    font-weight: 700;
    letter-spacing: 0.01em;
  }
</style>
