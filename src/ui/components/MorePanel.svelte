<script lang="ts">
  import { offlineCapSeconds } from '../../engine';
  import { formatDuration } from '../../lib/format';
  import { game } from '../game.svelte';
  import { playMilestone, setSoundEnabled, soundEnabled } from '../sound';
  import { ImportError, importSave } from '../transfer';
  import AccountPanel from './AccountPanel.svelte';

  let confirmReset = $state(false);
  let sound = $state(soundEnabled());
  let fileInput = $state<HTMLInputElement | null>(null);
  let pending = $state<{ name: string; state: import('../../engine').GameState; km: number; played: number } | null>(null);
  const version = __APP_VERSION__;
  const cap = $derived(formatDuration(offlineCapSeconds(game.state)));
  const exported = $derived(game.exportedAt ? new Date(game.exportedAt).toLocaleDateString('de-CH', { day: '2-digit', month: '2-digit', year: 'numeric' }) : null);

  async function pick(event: Event) {
    const input = event.currentTarget as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;
    try {
      const { state } = await importSave(file);
      pending = { name: file.name, state, km: state.km, played: state.playedSeconds };
    } catch (error) {
      game.showToast(error instanceof ImportError ? error.message : 'Die Datei liess sich nicht lesen.');
    }
  }

  async function confirmImport() {
    if (!pending) return;
    const loaded = pending.state;
    pending = null;
    await game.adopt(loaded);
    game.showToast('Spielstand geladen.');
  }

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
    <p class="small">Wird alle zehn Sekunden und beim Verlassen automatisch gespeichert, lokal auf diesem Gerät.</p>
    <p class="small muted">Spielzeit: {formatDuration(game.state.playedSeconds)} · Nachtschicht rechnet bis {cap} nach.</p>
  </div>

  <h3 class="section-title">Konto</h3>
  <AccountPanel />

  <h3 class="section-title">Sicherung als Datei</h3>
  <div class="card">
    {#if game.exportOverdue}
      <p class="small warnbox">Browser dürfen ihren Speicher aufräumen. Sichere den Spielstand als Datei, dann ist er in Sicherheit.</p>
    {:else}
      <p class="small">Browser dürfen ihren Speicher aufräumen. Eine Datei als Sicherung schützt davor, auch ohne Konto.</p>
    {/if}
    <p class="small muted">{exported ? `Zuletzt gesichert am ${exported}.` : 'Noch nie gesichert.'}</p>
    <div class="row">
      <button type="button" class="btn primary" onclick={() => game.exportToFile()}>Als Datei sichern</button>
      <button type="button" class="btn" onclick={() => fileInput?.click()}>Datei laden</button>
    </div>
    <input bind:this={fileInput} id="save-import" type="file" accept="application/json,.json" onchange={pick} hidden />
    {#if pending}
      <div class="confirm">
        <p class="small"><b>{pending.name}</b><br />Kilometer {pending.km.toFixed(1).replace('.', ',')} · Spielzeit {formatDuration(pending.played)}</p>
        <p class="small tone-warn">Das ersetzt den laufenden Spielstand auf diesem Gerät.</p>
        <div class="row">
          <button type="button" class="btn primary" onclick={confirmImport}>Laden und ersetzen</button>
          <button type="button" class="btn ghost" onclick={() => (pending = null)}>Abbrechen</button>
        </div>
      </div>
    {/if}
  </div>

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
    <p class="small">Löscht den Spielstand auf diesem Gerät. Eine gesicherte Datei bleibt erhalten.</p>
    <div class="row">
      <button type="button" class="btn danger" onclick={reset}>{confirmReset ? 'Wirklich alles löschen' : 'Neu anfangen'}</button>
      {#if confirmReset}
        <button type="button" class="btn ghost" onclick={() => (confirmReset = false)}>Abbrechen</button>
      {/if}
    </div>
  </div>

  <h3 class="section-title">Über</h3>
  <div class="card">
    <p class="small">Linie Null, Version <span class="mono">{version}</span>. Ein Idle-Aufbauspiel mit Produktionsketten. Dein Zug ist deine Fabrik.</p>
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

  .warnbox {
    padding: 10px 12px;
    border-radius: 8px;
    background: var(--warn-soft);
    color: var(--warn);
  }

  .confirm {
    display: grid;
    gap: 8px;
    padding: 12px;
    border: 1px solid var(--accent);
    border-radius: 8px;
    background: var(--accent-soft);
  }

  .confirm .small {
    color: var(--ink);
  }
</style>
