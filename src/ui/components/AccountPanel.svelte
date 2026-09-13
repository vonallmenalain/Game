<script lang="ts">
  import { account } from '../../cloud/account.svelte';
  import { formatDuration, formatKm } from '../../lib/format';
  import { game } from '../game.svelte';

  let mode = $state<'anmelden' | 'registrieren'>('anmelden');
  let email = $state('');
  let password = $state('');
  let busy = $state(false);
  let confirmDelete = $state(false);

  const syncText = $derived.by(() => {
    switch (account.sync) {
      case 'laeuft':
        return 'gleicht ab …';
      case 'fehler':
        return 'Abgleich fehlgeschlagen';
      case 'fertig':
        return account.syncedAt ? `gesichert um ${new Date(account.syncedAt).toLocaleTimeString('de-CH', { hour: '2-digit', minute: '2-digit' })}` : 'gesichert';
      default:
        return 'bereit';
    }
  });

  async function submit(event: SubmitEvent) {
    event.preventDefault();
    busy = true;
    const ok = mode === 'anmelden' ? await account.signInWithEmail(email, password) : await account.registerWithEmail(email, password);
    busy = false;
    if (ok) {
      password = '';
      game.showToast(mode === 'anmelden' ? 'Angemeldet.' : 'Konto angelegt.');
    }
  }

  async function google() {
    busy = true;
    await game.openAccount();
    const ok = await account.signInWithGoogle();
    busy = false;
    if (ok) game.showToast('Mit Google angemeldet.');
  }

  async function reset() {
    if (!email.trim()) {
      account.error = 'Gib zuerst deine E-Mail-Adresse ein.';
      return;
    }
    busy = true;
    const ok = await account.resetPassword(email);
    busy = false;
    if (ok) game.showToast('Wir haben dir eine E-Mail zum Zurücksetzen geschickt.');
  }
</script>

<div class="card">
  {#if account.signedIn}
    <p class="small"><b>{account.name}</b></p>
    <p class="small muted">Der Spielstand wird alle zwei Minuten und beim Verlassen in die Cloud gesichert. Status: {syncText}.</p>
    <div class="row">
      <button type="button" class="btn" disabled={account.sync === 'laeuft'} onclick={() => account.push()}>Jetzt sichern</button>
      <button type="button" class="btn" disabled={account.sync === 'laeuft'} onclick={() => account.pull()}>Aus der Cloud laden</button>
      <button type="button" class="btn ghost" onclick={() => account.signOut()}>Abmelden</button>
    </div>
    <div class="row">
      <button
        type="button"
        class="btn danger small"
        onclick={async () => {
          if (!confirmDelete) {
            confirmDelete = true;
            return;
          }
          confirmDelete = false;
          if (await account.deleteCloudSave()) game.showToast('Cloud-Spielstand gelöscht.');
        }}
      >
        {confirmDelete ? 'Wirklich aus der Cloud löschen' : 'Cloud-Spielstand löschen'}
      </button>
      {#if confirmDelete}
        <button type="button" class="btn ghost small" onclick={() => (confirmDelete = false)}>Abbrechen</button>
      {/if}
    </div>
  {:else}
    <p class="small">Mit einem Konto liegt dein Spielstand in der Cloud und du spielst auf mehreren Geräten weiter. Ohne Konto läuft das Spiel genauso, nur lokal.</p>
    <form onsubmit={submit}>
      <label class="field" for="account-email">
        <span>E-Mail</span>
        <input id="account-email" type="email" autocomplete="email" bind:value={email} required />
      </label>
      <label class="field" for="account-password">
        <span>Passwort</span>
        <input id="account-password" type="password" autocomplete={mode === 'anmelden' ? 'current-password' : 'new-password'} bind:value={password} minlength="6" required />
      </label>
      <div class="row">
        <button type="submit" class="btn primary" disabled={busy}>{mode === 'anmelden' ? 'Anmelden' : 'Konto anlegen'}</button>
        <button type="button" class="btn ghost" onclick={() => (mode = mode === 'anmelden' ? 'registrieren' : 'anmelden')}>
          {mode === 'anmelden' ? 'Neues Konto' : 'Ich habe ein Konto'}
        </button>
      </div>
    </form>
    <div class="row">
      <button type="button" class="btn" disabled={busy} onclick={google}>Mit Google anmelden</button>
      {#if mode === 'anmelden'}
        <button type="button" class="btn ghost small" onclick={reset}>Passwort vergessen</button>
      {/if}
    </div>
  {/if}

  {#if account.error}
    <p class="small tone-warn">{account.error}</p>
  {/if}
</div>

{#if account.conflict}
  <div class="backdrop" role="presentation"></div>
  <div class="conflict" role="dialog" aria-modal="true" aria-label="Zwei Spielstände">
    <h3>Zwei Spielstände</h3>
    <p class="small">In der Cloud liegt ein Stand, der weiter ist als der auf diesem Gerät. Welcher soll gelten? Der andere geht dabei verloren.</p>
    <div class="choice">
      <div>
        <p class="eyebrow">In der Cloud</p>
        <p class="big">{formatKm(account.conflict.cloud.km)}</p>
        <p class="small muted">{formatDuration(account.conflict.cloud.playedSeconds)} gespielt</p>
        <button type="button" class="btn primary wide" onclick={() => account.resolveWithCloud()}>Diesen nehmen</button>
      </div>
      <div>
        <p class="eyebrow">Auf diesem Gerät</p>
        <p class="big">{formatKm(account.conflict.lokal.km)}</p>
        <p class="small muted">{formatDuration(account.conflict.lokal.playedSeconds)} gespielt</p>
        <button type="button" class="btn wide" onclick={() => account.resolveWithLocal()}>Diesen behalten</button>
      </div>
    </div>
  </div>
{/if}

<style>
  .small {
    font-size: 14px;
    margin: 0;
  }

  .row {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }

  form {
    display: grid;
    gap: 8px;
  }

  .field {
    display: grid;
    gap: 3px;
    font-size: 13px;
    font-weight: 600;
    color: var(--ink-2);
  }

  .field input {
    font: inherit;
    font-weight: 400;
    color: var(--ink);
    padding: 9px 10px;
    border: 1px solid var(--line);
    border-radius: 8px;
    background: var(--bg);
  }

  .field input:focus-visible {
    outline: 2px solid var(--accent);
    outline-offset: 1px;
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

  .choice > div {
    display: grid;
    gap: 2px;
    align-content: start;
  }

  .choice .eyebrow {
    margin: 0;
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
