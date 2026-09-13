<script lang="ts">
  import { registerSW } from 'virtual:pwa-register';
  import { formatCount } from './lib/format';

  let needRefresh = $state(false);
  let offlineReady = $state(false);

  const updateSW = registerSW({
    onNeedRefresh() {
      needRefresh = true;
    },
    onOfflineReady() {
      offlineReady = true;
    },
  });

  const version = __APP_VERSION__;
  const railsPerKm = 100;
</script>

<main class="page">
  <p class="eyebrow">Phase 0 · Fundament</p>
  <h1>Linie Null</h1>
  <p class="lede">
    Idle-Aufbauspiel mit Produktionsketten. Dein Zug ist deine Fabrik. Jeder Wagen ist eine Maschine,
    Schienen sind ein Produkt, und ohne Schienen steht der Zug.
  </p>

  <dl class="facts">
    <dt>Stand</dt>
    <dd>Projektgerüst steht. Die Engine entsteht in Phase 1, die Bedienung in Phase 2.</dd>
    <dt>Ein Kilometer</dt>
    <dd>{formatCount(railsPerKm)} Schienen</dd>
    <dt>Version</dt>
    <dd class="mono">{version}</dd>
  </dl>

  {#if offlineReady}
    <p class="note good">Offline bereit. Die App läuft jetzt auch ohne Netz.</p>
  {/if}
  {#if needRefresh}
    <p class="note">
      Neue Version bereit.
      <button type="button" onclick={() => updateSW(true)}>Neu laden</button>
    </p>
  {/if}
</main>

<style>
  .page {
    max-width: 40rem;
    margin-inline: auto;
    padding-inline: clamp(16px, 5vw, 32px);
    padding-block: 48px 64px;
  }

  .eyebrow {
    font-size: 12px;
    font-weight: 600;
    letter-spacing: 0.09em;
    text-transform: uppercase;
    color: var(--accent-ink);
    margin: 0 0 12px;
  }

  h1 {
    font-family: var(--display);
    font-size: clamp(44px, 10vw, 72px);
    font-weight: 700;
    line-height: 0.95;
    margin: 0 0 16px;
  }

  .lede {
    font-size: 18px;
    margin: 0 0 28px;
    max-width: 34em;
  }

  .facts {
    display: grid;
    grid-template-columns: max-content minmax(0, 1fr);
    gap: 8px 16px;
    margin: 0 0 24px;
    font-size: 15px;
  }

  .facts dt {
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--ink-2);
    padding-top: 3px;
  }

  .facts dd {
    margin: 0;
  }

  .mono {
    font-family: var(--mono);
  }

  .note {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 8px 12px;
    padding: 12px 14px;
    border: 1px solid var(--line);
    border-radius: 6px;
    background: var(--surface);
    margin: 0 0 12px;
  }

  .note.good {
    border-color: var(--good);
    color: var(--good);
    background: var(--good-soft);
  }

  button {
    padding: 6px 12px;
    border: 1px solid var(--accent);
    border-radius: 6px;
    background: var(--accent-soft);
    color: var(--accent-ink);
    font-weight: 600;
    cursor: pointer;
  }
</style>
