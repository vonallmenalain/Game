<script lang="ts">
  import { offlineCapSeconds } from '../../engine';
  import { formatDuration } from '../../lib/format';
  import { game } from '../game.svelte';
  import { playMilestone, setSoundEnabled, soundEnabled } from '../sound';
  import AccountPanel from './AccountPanel.svelte';

  let confirmReset = $state(false);
  let sound = $state(soundEnabled());
  const version = __APP_VERSION__;
  const cap = $derived(formatDuration(offlineCapSeconds(game.state)));

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
    <p class="small">Wird alle zehn Sekunden und beim Verlassen automatisch gespeichert, lokal auf diesem Gerät. Mit einem Konto liegt er zusätzlich in der Cloud und kommt auf jedes angemeldete Gerät, dort weiter, wo du zuletzt warst.</p>
    <p class="small muted">Spielzeit: {formatDuration(game.state.playedSeconds)} · Nachtschicht rechnet bis {cap} nach.</p>
  </div>

  <h3 class="section-title">Konto</h3>
  <AccountPanel />

  <h3 class="section-title">Ton</h3>
  <div class="card">
    <label class="switch" for="sound">
      <input
        id="sound"
        type="checkbox"
        checked={sound}
        onchange={(event) => {
          sound = event.currentTarget.checked;
          setSoundEnabled(sound);
          if (sound) playMilestone();
        }}
      />
      <span>Ton beim Meilenstein</span>
    </label>
    <p class="small muted">Ein kurzer Akkord, wenn ein Bauprojekt fertig ist oder eine neue Lok kommt. Sonst bleibt das Spiel still.</p>
  </div>

  <h3 class="section-title">Neu anfangen</h3>
  <div class="card">
    <p class="small">Löscht den Spielstand auf diesem Gerät. Bist du angemeldet, fängt auch die Cloud von vorn an.</p>
    <div class="row">
      <button type="button" class="btn danger" onclick={reset}>{confirmReset ? 'Wirklich alles löschen' : 'Neu anfangen'}</button>
      {#if confirmReset}
        <button type="button" class="btn ghost" onclick={() => (confirmReset = false)}>Abbrechen</button>
      {/if}
    </div>
  </div>

  <h3 class="section-title">Über</h3>
  <div class="card">
    <p class="small">Loco, Version <span class="mono">{version}</span>. Ein Idle-Aufbauspiel mit Produktionsketten. Dein Zug ist deine Fabrik.</p>
    <p class="small muted">Erster spielbarer Stand: drei Biome vom Tal bis zum Berg, zwei Bauprojekte, dreissig Waren. Hinter dem Tunnel wartet die Wüste auf den nächsten Ausbau.</p>
  </div>
</section>

<style>
  .more {
    padding: 12px 16px 24px;
  }

  .small {
    font-size: 14px;
    margin: 0;
  }

  .card {
    display: grid;
    gap: 8px;
  }

  .row {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }

  .switch {
    display: flex;
    align-items: center;
    gap: 10px;
    font-size: 15px;
    font-weight: 500;
    cursor: pointer;
  }

  .switch input {
    width: 20px;
    height: 20px;
    accent-color: var(--accent);
  }
</style>
