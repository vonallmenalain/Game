<script lang="ts">
  import { WAGONS, currentLoco, isWagonTypeUnlocked, wagonOfType } from '../../engine';
  import { game } from '../game.svelte';
  import BuildPanel from './BuildPanel.svelte';
  import WagonCard from './WagonCard.svelte';
  import WagonDetail from './WagonDetail.svelte';

  const free = $derived(currentLoco(game.state).slots - game.state.wagons.length);
  /** Wagentypen, die es noch nicht gibt. Von jedem Typ hat der Zug genau einen. */
  const offen = $derived(WAGONS.filter((w) => !wagonOfType(game.state, w.type)));
  const bereit = $derived(offen.filter((w) => isWagonTypeUnlocked(game.state, w.type)).length);
  const maschinen = $derived(game.state.wagons.reduce((sum, w) => sum + w.machines.length, 0));
  const bauenOffen = $derived(game.detail.kind === 'bauen');

  function toggle(id: number) {
    game.detail = game.detail.kind === 'wagen' && game.detail.id === id ? { kind: 'none' } : { kind: 'wagen', id };
  }

  /**
   * Ein aufgeklappter Wagen wird sichtbar gerollt. Wer ihn auf der Bühne antippt,
   * soll ihn nicht erst in der Liste suchen müssen.
   */
  let liste = $state<HTMLElement | null>(null);
  $effect(() => {
    const d = game.detail;
    if (d.kind !== 'wagen' || !liste) return;
    const el = liste.querySelector(`[data-wagen="${d.id}"]`);
    el?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  });
</script>

<section class="list" bind:this={liste}>
  <div class="head">
    <span class="eyebrow">Wagen · {game.state.wagons.length} mit {maschinen} Maschinen</span>
  </div>

  {#each game.state.wagons as w (w.id)}
    {@const auf = game.detail.kind === 'wagen' && game.detail.id === w.id}
    <div class="block" data-wagen={w.id}>
      <WagonCard wagon={w} open={auf} ontoggle={() => toggle(w.id)} />
      {#if auf}
        <div class="ausklapp">
          {#key w.id}
            <WagonDetail id={w.id} />
          {/key}
        </div>
      {/if}
    </div>
  {/each}

  {#if offen.length > 0}
    <div class="block">
      <button
        type="button"
        class="btn primary add"
        class:offen={bauenOffen}
        aria-expanded={bauenOffen}
        onclick={() => (game.detail = bauenOffen ? { kind: 'none' } : { kind: 'bauen' })}
        disabled={free <= 0}
      >
        {#if free <= 0}
          Kein Platz für weitere Wagen
        {:else if bereit > 0}
          Wagen anhängen, {bereit} möglich
        {:else}
          Weitere Wagen kommen aus der Forschung
        {/if}
      </button>
      {#if bauenOffen}
        <div class="ausklapp"><BuildPanel /></div>
      {/if}
    </div>
  {/if}
</section>

<style>
  .list {
    display: flex;
    flex-direction: column;
    gap: 8px;
    padding: 12px 16px 24px;
  }

  .head {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  .head .eyebrow {
    margin: 0;
  }

  .add {
    width: 100%;
    margin-top: 6px;
  }

  .add.offen {
    border-bottom-left-radius: 0;
    border-bottom-right-radius: 0;
  }

  /* Karte und Ausklapp gehören zusammen, darum sitzen sie in einem Block ohne Lücke. */
  .block {
    display: flex;
    flex-direction: column;
  }

  .ausklapp {
    border: 1px solid var(--accent);
    border-top: 0;
    border-radius: 0 0 10px 10px;
    background: var(--surface);
    padding: 12px 14px 14px;
  }
</style>
