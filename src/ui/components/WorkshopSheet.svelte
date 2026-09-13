<script lang="ts">
  import { BALANCE, RECIPES, RECIPE_BY_ID, clearWorkbench, getStore, isRecipeUnlocked, queueWorkbench, shovelCoal, storeCap } from '../../engine';
  import { formatRate } from '../../lib/format';
  import { game } from '../game.svelte';
  import { itemName } from '../labels';
  import Bar from './Bar.svelte';

  const queue = $derived(game.state.workbench.queue);
  const head = $derived(queue[0] ? RECIPE_BY_ID[queue[0]] : undefined);
  const progress = $derived(head ? game.state.workbench.progress / head.seconds : 0);
  const recipes = $derived(RECIPES.filter((r) => isRecipeUnlocked(game.state, r.id)));
</script>

<p class="eyebrow">Tender</p>
<div class="row">
  <span class="small">Kohle im Lager: <span class="mono">{getStore(game.state, 'kohle')}</span> von {storeCap(game.state)}</span>
  <button type="button" class="btn primary" onclick={() => game.run(shovelCoal(game.state))}>Kohle schaufeln, plus {BALANCE.shovelCoal}</button>
</div>

<p class="eyebrow">Werkbank · {queue.length} von {BALANCE.workbenchQueueMax} Aufträgen</p>
{#if queue.length > 0}
  <div class="card queue">
    <div class="row">
      <span>Läuft: <b>{head?.name ?? queue[0]}</b></span>
      <button type="button" class="btn small" onclick={() => game.run(clearWorkbench(game.state))}>Leeren</button>
    </div>
    <Bar value={progress} />
    <div class="chips">
      {#each queue as id, i (i)}
        <span class="chip">{RECIPE_BY_ID[id]?.name ?? id}</span>
      {/each}
    </div>
  </div>
{:else}
  <p class="small muted">Keine Aufträge. Die Werkbank baut jedes freigeschaltete Rezept von Hand, mit einfachem Tempo.</p>
{/if}

<div class="list">
  {#each recipes as r (r.id)}
    <div class="entry">
      <div class="text">
        <div class="title">{r.name} <span class="muted small">{r.seconds} s</span></div>
        <div class="small muted">
          {r.inputs.map((s) => `${s.amount} ${itemName(s.item)}`).join(' + ')} ergibt {r.outputs.map((s) => `${s.amount} ${itemName(s.item)}`).join(' + ')}
          · {formatRate((r.outputs[0]?.amount ?? 0) * (60 / r.seconds))}
        </div>
      </div>
      <button type="button" class="btn small" disabled={queue.length >= BALANCE.workbenchQueueMax} onclick={() => game.run(queueWorkbench(game.state, r.id))}>+1</button>
    </div>
  {/each}
</div>

<style>
  .row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
    margin-bottom: 10px;
  }

  .small {
    font-size: 13px;
  }

  .queue {
    display: grid;
    gap: 8px;
    margin-bottom: 12px;
  }

  .chips {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
  }

  .chip {
    font-size: 12px;
    padding: 3px 8px;
    border-radius: 999px;
    background: var(--surface-2);
  }

  .list {
    display: grid;
    gap: 6px;
  }

  .entry {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 8px 0;
    border-bottom: 1px solid var(--line);
  }

  .text {
    flex: 1;
    min-width: 0;
  }

  .title {
    font-weight: 600;
  }
</style>
