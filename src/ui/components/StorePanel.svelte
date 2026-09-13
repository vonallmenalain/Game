<script lang="ts">
  import { ITEMS, discoveredResources, getStore, isRecipeUnlocked, producerOf, storeCap } from '../../engine';
  import { formatCount, formatRate } from '../../lib/format';
  import { game } from '../game.svelte';
  import { TIER_NAME, itemColor } from '../labels';
  import Bar from './Bar.svelte';
  import Mark from './Mark.svelte';

  const cap = $derived(storeCap(game.state));
  const visible = $derived.by(() => {
    const discovered = new Set(discoveredResources(game.state));
    return ITEMS.filter((item) => {
      if (getStore(game.state, item.id) > 0) return true;
      if (item.kind === 'rohstoff') return discovered.has(item.id);
      const r = producerOf(item.id);
      return r ? isRecipeUnlocked(game.state, r.id) : false;
    });
  });
  const groups = $derived([0, 1, 2, 3].map((tier) => ({ tier, items: visible.filter((i) => i.tier === tier) })).filter((g) => g.items.length > 0));
</script>

<section class="store">
  <p class="muted small">Kapazität je Ware: {formatCount(cap)}. Die Rate ist der Saldo von jetzt: alles, was gerade läuft, Herstellung minus Verbrauch.</p>
  {#each groups as group (group.tier)}
    <h3 class="section-title">{TIER_NAME[group.tier]}</h3>
    <div class="rows">
      {#each group.items as item (item.id)}
        {@const amount = getStore(game.state, item.id)}
        {@const rate = game.rates[item.id] ?? 0}
        <div class="row" class:full={amount >= cap}>
          <Mark item={item.id} color={itemColor(item.id)} size="s" />
          <span class="name">{item.name}</span>
          <span class="mono amount">{formatCount(amount)}</span>
          <span class="mono rate" class:tone-good={rate > 0.05} class:tone-warn={rate < -0.05}>{rate > 0.05 ? '+' : ''}{Math.abs(rate) < 0.05 ? '' : formatRate(rate)}</span>
          <div class="barwrap"><Bar value={amount / cap} tone={amount >= cap ? 'warn' : 'accent'} /></div>
        </div>
      {/each}
    </div>
  {/each}
</section>

<style>
  .store {
    padding: 12px 16px 24px;
  }

  .small {
    font-size: 13px;
    margin: 0;
  }

  .rows {
    display: grid;
    gap: 6px;
  }

  .row {
    display: grid;
    grid-template-columns: 22px minmax(0, 1fr) auto auto;
    grid-template-rows: auto auto;
    align-items: center;
    gap: 2px 10px;
  }

  .name {
    font-size: 14px;
    font-weight: 500;
  }

  .amount {
    font-size: 14px;
    text-align: right;
  }

  .rate {
    font-size: 12px;
    min-width: 64px;
    text-align: right;
  }

  .barwrap {
    grid-column: 2 / -1;
  }

  .full .name {
    color: var(--warn);
  }
</style>
