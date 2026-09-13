<script lang="ts">
  import { formatDuration } from '../../lib/format';
  import { game } from '../game.svelte';

  let confirmReset = $state(false);
  const version = __APP_VERSION__;

  async function reset() {
    if (!confirmReset) {
      confirmReset = true;
      return;
    }
    confirmReset = false;
    await game.reset();
    game.showToast('Neue Linie. Der Zug steht wieder bei Kilometer null.');
  }
</script>

<section class="more">
  <h3 class="section-title">Spielstand</h3>
  <div class="card">
    <p class="small">Wird alle zehn Sekunden und beim Verlassen automatisch gespeichert, lokal auf diesem Gerät. Export und Import als Datei kommen in Phase 3.</p>
    <p class="small muted">Spielzeit: {formatDuration(game.state.playedSeconds)}</p>
    <button type="button" class="btn danger" onclick={reset}>{confirmReset ? 'Wirklich neu anfangen? Alles geht verloren.' : 'Neu anfangen'}</button>
    {#if confirmReset}
      <button type="button" class="btn ghost" onclick={() => (confirmReset = false)}>Abbrechen</button>
    {/if}
  </div>

  <h3 class="section-title">Über</h3>
  <div class="card">
    <p class="small">Linie Null, Version <span class="mono">{version}</span>. Ein Idle-Aufbauspiel mit Produktionsketten. Dein Zug ist deine Fabrik.</p>
    <p class="small muted">Erster spielbarer Stand, Phase 2 von 5: Bedienung mit Buchstabenmarken statt Icons.</p>
  </div>
</section>

<style>
  .more {
    padding: 12px 16px 24px;
  }

  .small {
    font-size: 14px;
    margin: 0 0 10px;
  }

  .card {
    display: grid;
    gap: 6px;
  }
</style>
