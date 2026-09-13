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
  <span class="naechstes muted">
    {#if next}{next.km - game.state.km < 0.005 ? `vor ${next.label}` : `${next.label} in ${formatKm(next.km - game.state.km)}`}{/if}
  </span>
  <span class="zustand {moving ? 'tone-good' : 'tone-warn'}">{stopText(game.state)}</span>
</header>

<style>
  /* Eine Zeile, immer gleich hoch: Sonst rutscht der ganze Bildschirm, sobald der
     Zug anhält und der Text länger wird. Zu Enges wird gekürzt, nicht umgebrochen. */
  .status {
    position: sticky;
    top: 0;
    z-index: 5;
    display: flex;
    align-items: baseline;
    gap: 10px;
    padding: 10px 16px;
    background: var(--surface);
    border-bottom: 1px solid var(--line);
    font-size: 13px;
    white-space: nowrap;
  }

  .naechstes {
    flex: 1;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .zustand {
    flex: none;
    max-width: 55%;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .brand {
    font-family: var(--display);
    font-size: 18px;
    font-weight: 700;
    letter-spacing: 0.01em;
  }
</style>
