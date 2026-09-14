<script lang="ts">
  /**
   * Der Zug-Bildschirm: unter der Bühne die Wagenleiste zum Wechseln und darunter
   * ein einziger Wagen, der den ganzen Bereich füllt. Keine Liste aller Wagen mehr:
   * Was der Zug hat, zeigt die Leiste, was ein Wagen macht, zeigt sein Panel.
   */
  import { game } from '../game.svelte';
  import BuildPanel from './BuildPanel.svelte';
  import WagonPanel from './WagonPanel.svelte';
  import WagonStrip from './WagonStrip.svelte';

  const id = $derived(game.selectedWagonId);
  const bauen = $derived(game.detail.kind === 'bauen');

  /** Beim Wechsel steht das Panel wieder oben: Der neue Wagen fängt bei seinem Kopf an. */
  let panel = $state<HTMLElement | null>(null);
  $effect(() => {
    void id;
    void bauen;
    panel?.scrollTo({ top: 0 });
  });
</script>

<section class="zug">
  <WagonStrip />
  <div class="scrollbereich panel" bind:this={panel}>
    {#if bauen}
      <BuildPanel />
    {:else if id !== null}
      {#key id}
        <WagonPanel {id} />
      {/key}
    {:else}
      <p class="muted leer">Kein Wagen im Zug.</p>
    {/if}
  </div>
</section>

<style>
  .zug {
    flex: 1;
    min-height: 0;
    display: flex;
    flex-direction: column;
  }

  .panel {
    flex: 1;
    min-height: 0;
    overflow-y: auto;
    padding: 0 16px 24px;
  }

  .leer {
    margin: 0;
  }
</style>
