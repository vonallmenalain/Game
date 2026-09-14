<script lang="ts">
  /**
   * Die Wagenleiste: jeder Wagen als Chip mit Silhouette, Kurzname und Maschinen,
   * dazu «Anhängen». Ein Tipp zeigt den Wagen unten und holt ihn auf der Bühne heran.
   * Die Leiste ist der Überblick: Wie viele Wagen, welche, und ob einer klemmt.
   */
  import { WAGONS, currentLoco, isWagonTypeUnlocked, machineSlots, wagonOfType } from '../../engine';
  import { game } from '../game.svelte';
  import { WAGON_SHORT, statusTone, wagonName, wagonTint } from '../labels';
  import Vehicle from './Vehicle.svelte';

  const loco = $derived(currentLoco(game.state));
  const free = $derived(loco.slots - game.state.wagons.length);
  const offen = $derived(WAGONS.filter((w) => !wagonOfType(game.state, w.type)));
  const bereit = $derived(offen.filter((w) => isWagonTypeUnlocked(game.state, w.type)).length);
  const maschinen = $derived(game.state.wagons.reduce((sum, w) => sum + w.machines.length, 0));
  const bauen = $derived(game.detail.kind === 'bauen');
  const selected = $derived(bauen ? null : game.selectedWagonId);

  /** Der gewählte Chip rückt ins Bild, auch wenn die Wahl von der Bühne kam */
  let leiste = $state<HTMLElement | null>(null);
  $effect(() => {
    const key = bauen ? 'bauen' : String(selected);
    const el = leiste?.querySelector(`[data-chip="${key}"]`);
    el?.scrollIntoView({ inline: 'nearest', block: 'nearest', behavior: 'smooth' });
  });
</script>

<div class="leiste">
  <span class="eyebrow kopf">Zug · {game.state.wagons.length} von {loco.slots} Wagen · {maschinen} Maschinen</span>
  <div class="chips" bind:this={leiste} role="tablist" aria-label="Wagen">
    {#each game.state.wagons as w (w.id)}
      <button
        type="button"
        role="tab"
        class="chip tone-{statusTone(w)}"
        class:aktiv={selected === w.id}
        aria-selected={selected === w.id}
        aria-label="{wagonName(w.type)}, {w.machines.length} Maschinen"
        data-chip={w.id}
        style="--tint: {wagonTint(w.type)}"
        onclick={() => game.selectWagon(w.id)}
      >
        <span class="bild"><Vehicle kind={w.type} /></span>
        <span class="name">{WAGON_SHORT[w.type]}</span>
        <span class="zahl mono">{w.machines.length}/{machineSlots(game.state)}</span>
        <span class="punkt" aria-hidden="true"></span>
      </button>
    {/each}
    {#if offen.length > 0}
      <button
        type="button"
        role="tab"
        class="chip neu"
        class:aktiv={bauen}
        aria-selected={bauen}
        aria-label="Wagen anhängen"
        data-chip="bauen"
        disabled={free <= 0}
        onclick={() => game.openBuild()}
      >
        <span class="bild plus" aria-hidden="true">+</span>
        <span class="name">Anhängen</span>
        <span class="zahl">{free <= 0 ? 'kein Platz' : bereit > 0 ? `${bereit} bereit` : 'Forschung'}</span>
      </button>
    {/if}
  </div>
</div>

<style>
  .leiste {
    flex: none;
    display: flex;
    flex-direction: column;
    gap: 4px;
    padding: 8px 0 6px;
    border-bottom: 1px solid var(--line);
    background: var(--surface);
  }

  .kopf {
    margin: 0 16px;
  }

  .chips {
    display: flex;
    gap: 6px;
    padding: 0 16px;
    overflow-x: auto;
    scrollbar-width: none;
    -webkit-overflow-scrolling: touch;
  }

  .chips::-webkit-scrollbar {
    display: none;
  }

  /* Jeder Chip trägt die Farbe seines Wagens, der gewählte dazu den Messingrand */
  .chip {
    position: relative;
    flex: none;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1px;
    width: 74px;
    padding: 6px 4px 5px;
    border: 1px solid var(--line);
    border-radius: 10px;
    background: var(--tint, var(--bg));
    color: var(--ink);
    cursor: pointer;
    touch-action: manipulation;
  }

  .chip.aktiv {
    border-color: var(--accent);
    box-shadow: 0 0 0 2px var(--accent);
    color: var(--accent-ink);
  }

  .chip:disabled {
    opacity: 0.5;
    cursor: default;
  }

  .bild {
    display: grid;
    place-items: center;
    width: 56px;
    height: 30px;
    overflow: hidden;
  }

  .plus {
    font-family: var(--display);
    font-size: 26px;
    font-weight: 600;
    line-height: 1;
    color: var(--ink-2);
  }

  .chip.aktiv .plus {
    color: inherit;
  }

  .neu {
    border-style: dashed;
  }

  .name {
    font-size: 11px;
    font-weight: 600;
    line-height: 1.2;
  }

  .zahl {
    font-size: 10px;
    line-height: 1.2;
    color: var(--ink-2);
  }

  .chip.aktiv .zahl {
    color: inherit;
  }

  /* Der Punkt sagt auf einen Blick, ob der Wagen läuft oder klemmt */
  .punkt {
    position: absolute;
    top: 5px;
    right: 5px;
    width: 7px;
    height: 7px;
    border-radius: 50%;
    background: var(--ink-2);
    opacity: 0.5;
  }

  .tone-good .punkt {
    background: var(--good);
    opacity: 1;
  }

  .tone-warn .punkt {
    background: var(--warn);
    opacity: 1;
  }
</style>
