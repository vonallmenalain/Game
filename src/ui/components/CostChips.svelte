<script lang="ts">
  /**
   * Kosten als Chips: je Ware der Bedarf als Marke, darunter der Bestand, rot und
   * fett, wenn er nicht reicht. Die Zeile darunter sagt, was fehlt, oder dass alles
   * da ist. So sieht man vor dem Bauen, wofür man noch ernten muss.
   */
  import { getStore, type Stack } from '../../engine';
  import { game } from '../game.svelte';
  import { itemName } from '../labels';
  import ItemChip from './ItemChip.svelte';

  let { cost, size = 's', note = true }: { cost: Stack[]; size?: 's' | 'm'; note?: boolean } = $props();

  const fehlt = $derived(
    cost
      .map((s) => ({ item: s.item, amount: s.amount - Math.floor(getStore(game.state, s.item)) }))
      .filter((s) => s.amount > 0),
  );
</script>

<div class="kosten">
  <div class="chips">
    {#each cost as s (s.item)}
      {@const have = Math.floor(getStore(game.state, s.item))}
      <ItemChip item={s.item} amount={s.amount} {have} lacking={have < s.amount} showName {size} tap />
    {/each}
  </div>
  {#if note}
    <p class="meldung" class:warn={fehlt.length > 0}>
      {#if fehlt.length > 0}
        Es fehlen {fehlt.map((s) => `${s.amount} ${itemName(s.item)}`).join(', ')}.
      {:else}
        Alles da.
      {/if}
    </p>
  {/if}
</div>

<style>
  .kosten {
    display: grid;
    gap: 4px;
    min-width: 0;
  }

  .chips {
    display: flex;
    flex-wrap: wrap;
    align-items: flex-start;
    gap: 6px 12px;
  }
</style>
