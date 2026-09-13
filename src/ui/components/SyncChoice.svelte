<script lang="ts">
  /**
   * Die Rückfrage «Zwei Spielstände». Sie steht auf jedem Register, denn sie kommt auch
   * mitten im Spiel, wenn ein anderes Gerät inzwischen geschrieben hat. Solange sie
   * offen ist, steht das Spiel; die Wahl setzt es fort.
   */
  import { account } from '../../cloud/account.svelte';
  import { formatAgo, formatDuration, formatKm } from '../../lib/format';

  let busy = $state(false);

  async function choose(which: 'cloud' | 'lokal') {
    if (busy) return;
    busy = true;
    try {
      if (which === 'cloud') await account.resolveWithCloud();
      else await account.resolveWithLocal();
    } finally {
      busy = false;
    }
  }
</script>

{#if account.conflict}
  {@const c = account.conflict}
  <div class="backdrop" role="presentation"></div>
  <div class="conflict" role="dialog" aria-modal="true" aria-label="Zwei Spielstände">
    <h3>Zwei Spielstände</h3>
    <p class="small">
      Dieser Spielstand wurde inzwischen auf einem anderen Gerät weitergespielt, und auch hier ist seither etwas passiert. Welcher soll gelten? Der andere geht verloren.
    </p>
    <div class="choice">
      <div class="side" class:empfohlen={c.empfehlung === 'cloud'}>
        <p class="eyebrow">In der Cloud{#if c.empfehlung === 'cloud'}<span class="tag">weiter</span>{/if}</p>
        <p class="big">{formatKm(c.cloud.km)}</p>
        <p class="small muted">{formatDuration(c.cloud.playedSeconds)} gespielt</p>
        <p class="small muted">{c.cloud.geraet}, {formatAgo(c.cloud.savedAt)}</p>
        <button type="button" class="btn wide" class:primary={c.empfehlung === 'cloud'} disabled={busy} onclick={() => choose('cloud')}>Diesen nehmen</button>
      </div>
      <div class="side" class:empfohlen={c.empfehlung === 'lokal'}>
        <p class="eyebrow">Auf diesem Gerät{#if c.empfehlung === 'lokal'}<span class="tag">weiter</span>{/if}</p>
        <p class="big">{formatKm(c.lokal.km)}</p>
        <p class="small muted">{formatDuration(c.lokal.playedSeconds)} gespielt</p>
        <p class="small muted">zuletzt gespielt {formatAgo(c.lokal.savedAt)}</p>
        <button type="button" class="btn wide" class:primary={c.empfehlung === 'lokal'} disabled={busy} onclick={() => choose('lokal')}>Diesen behalten</button>
      </div>
    </div>
  </div>
{/if}

<style>
  .small {
    font-size: 14px;
    margin: 0;
  }

  .backdrop {
    position: fixed;
    inset: 0;
    background: rgba(10, 16, 24, 0.5);
    z-index: 40;
  }

  .conflict {
    position: fixed;
    left: 16px;
    right: 16px;
    top: 50%;
    transform: translateY(-50%);
    z-index: 41;
    padding: 18px;
    border-radius: 14px;
    background: var(--bg);
    border: 1px solid var(--line);
    box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
    max-width: 460px;
    margin-inline: auto;
  }

  .conflict h3 {
    font-family: var(--display);
    font-size: 26px;
    font-weight: 700;
    margin: 0 0 6px;
  }

  .choice {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 14px;
    margin-top: 14px;
  }

  .side {
    display: grid;
    gap: 2px;
    align-content: start;
    padding: 10px;
    border: 1px solid var(--line);
    border-radius: 10px;
  }

  .side.empfohlen {
    border-color: var(--accent);
    background: var(--accent-soft);
  }

  .side .eyebrow {
    display: flex;
    align-items: center;
    gap: 6px;
    margin: 0;
  }

  .tag {
    font-size: 10px;
    letter-spacing: 0.06em;
    color: var(--accent-ink);
    border: 1px solid var(--accent);
    border-radius: 999px;
    padding: 1px 6px;
  }

  .big {
    font-family: var(--display);
    font-size: 26px;
    font-weight: 700;
    margin: 0;
    color: var(--accent-ink);
  }

  .wide {
    width: 100%;
    margin-top: 8px;
  }

  @media (max-width: 420px) {
    .choice {
      grid-template-columns: 1fr;
    }
  }
</style>
