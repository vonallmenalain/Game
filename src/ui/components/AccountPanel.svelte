<script lang="ts">
  import { account } from '../../cloud/account.svelte';
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
    <p class="small muted">
      Der Spielstand wird alle zwei Minuten und beim Verlassen in die Cloud gesichert. Beim Start holt Loco zuerst den Stand aus der Cloud, wenn er dort weiter ist. Haben beide Seiten etwas, das der anderen fehlt, fragt das Spiel nach. Status: {syncText}.
    </p>
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
</style>
