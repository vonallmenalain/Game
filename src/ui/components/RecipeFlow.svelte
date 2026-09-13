<script lang="ts">
  import { RECIPE_BY_ID, ingredientsOf, outputsOf, type RecipeId } from '../../engine';
  import { game } from '../game.svelte';
  import ItemChip from './ItemChip.svelte';

  let {
    recipe,
    showStock = true,
    showNames = true,
    size = 'm',
  }: { recipe: RecipeId; showStock?: boolean; showNames?: boolean; size?: 's' | 'm' } = $props();

  const def = $derived(RECIPE_BY_ID[recipe]);
  const zutaten = $derived(ingredientsOf(game.state, recipe));
  const ergebnisse = $derived(outputsOf(game.state, recipe));
</script>

{#if def}
  <div class="flow {size}">
    {#each zutaten as zutat (zutat.item)}
      <ItemChip
        item={zutat.item}
        amount={zutat.need}
        have={showStock ? zutat.have : null}
        lacking={!zutat.enough}
        showName={showNames}
        {size}
      />
    {/each}
    <svg class="arrow" viewBox="0 0 16 16" role="presentation" aria-hidden="true">
      <path d="M1 8 h11 M9 4 l4 4 -4 4" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
    </svg>
    {#each ergebnisse as ergebnis (ergebnis.item)}
      <ItemChip
        item={ergebnis.item}
        amount={ergebnis.amount}
        have={showStock ? ergebnis.have : null}
        full={showStock && ergebnis.full}
        showName={showNames}
        {size}
      />
    {/each}
  </div>
{/if}

<style>
  .flow {
    display: flex;
    align-items: flex-start;
    gap: 9px;
    flex-wrap: wrap;
  }

  /* Der Pfeil ist so hoch wie das Bild daneben, damit er auf dessen Mitte zeigt. */
  .arrow {
    width: 16px;
    height: 30px;
    flex: none;
    color: var(--ink-2);
  }

  .flow.s .arrow {
    height: 24px;
  }
</style>
