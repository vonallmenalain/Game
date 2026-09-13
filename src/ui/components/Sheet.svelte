<script lang="ts">
  import type { Snippet } from 'svelte';

  let { open, title, onclose, children }: { open: boolean; title: string; onclose: () => void; children: Snippet } = $props();

  function onkeydown(event: KeyboardEvent) {
    if (open && event.key === 'Escape') onclose();
  }
</script>

<svelte:window {onkeydown} />

{#if open}
  <div class="backdrop" onclick={onclose} role="presentation"></div>
  <div class="sheet" role="dialog" aria-modal="true" aria-label={title}>
    <header>
      <h2>{title}</h2>
      <button class="btn ghost" type="button" onclick={onclose} aria-label="Schliessen">✕</button>
    </header>
    <div class="body">{@render children()}</div>
  </div>
{/if}

<style>
  .backdrop {
    position: fixed;
    inset: 0;
    background: rgba(10, 16, 24, 0.45);
    z-index: 20;
  }

  .sheet {
    position: fixed;
    left: 0;
    right: 0;
    bottom: 0;
    max-height: 86vh;
    display: flex;
    flex-direction: column;
    background: var(--bg);
    border-top: 1px solid var(--line);
    border-radius: 16px 16px 0 0;
    box-shadow: 0 -8px 30px rgba(0, 0, 0, 0.25);
    z-index: 21;
    padding-bottom: var(--safe-bottom);
  }

  header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    padding: 12px 8px 8px 18px;
    border-bottom: 1px solid var(--line);
  }

  h2 {
    font-family: var(--display);
    font-size: 24px;
    font-weight: 600;
    margin: 0;
  }

  .body {
    overflow-y: auto;
    padding: 14px 16px 20px;
  }

</style>
