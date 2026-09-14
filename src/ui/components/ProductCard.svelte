<script lang="ts">
  /**
   * Das kleine Dashboard einer Ware im Wagen: Bestand und Saldo, das Rezept als
   * Fluss, der Zähler der Maschinen, ihr Ausstoss und was sie dafür verbrauchen.
   * Zugeteilt wird hier mit Plus und Minus, nicht Maschine für Maschine.
   */
  import { BALANCE, assignMachine, getStore, idleMachines, isOnSite, storeCap, unassignMachine, type WagonState } from '../../engine';
  import { formatCount, formatDecimal, formatRate, formatSignedRate } from '../../lib/format';
  import { game } from '../game.svelte';
  import { itemColor, itemName, jobStatusText } from '../labels';
  import { productConsumption, type Product } from '../products';
  import Mark from './Mark.svelte';
  import RecipeFlow from './RecipeFlow.svelte';

  let { wagon, product }: { wagon: WagonState; product: Product } = $props();

  const n = $derived(product.machines.length);
  const frei = $derived(idleMachines(wagon).length);
  const stock = $derived(getStore(game.state, product.item));
  const cap = $derived(storeCap(game.state));
  const saldo = $derived(game.rates[product.item] ?? 0);
  const status = $derived(jobStatusText(game.state, wagon, product.machines));
  const verbrauch = $derived(productConsumption(product));
  const tone = $derived(
    product.machines.some((m) => m.status === 'aktiv') ? 'good' : product.machines.some((m) => m.status !== 'leer') ? 'warn' : 'mute',
  );
</script>

<div class="produkt" class:aktiv={n > 0} data-produkt={product.key}>
  <div class="kopf">
    <button type="button" class="ware" onclick={() => game.openItem(product.item)} aria-label="{itemName(product.item)}: Übersicht öffnen">
      <Mark item={product.item} color={itemColor(product.item)} size="s" />
      <span class="name">{itemName(product.item)}</span>
    </button>
    <span class="lager" title="Bestand im Lager und Saldo von jetzt">
      <span class="mono bestand" class:tone-warn={stock >= cap}>{formatCount(stock)}</span>
      <span class="mono saldo" class:tone-good={saldo > 0.05} class:tone-warn={saldo < -0.05}>{formatSignedRate(saldo)}</span>
    </span>
  </div>

  {#if product.recipe}
    <RecipeFlow recipe={product.recipe.id} size="s" tap />
  {:else}
    <p class="small muted quelle">
      Aus dem Boden{#if isOnSite(game.state, product.item)}, hier zu Hause: mal {formatDecimal(BALANCE.onSiteBonus, 1)}{/if}
    </p>
  {/if}

  <div class="steuer">
    <div class="zaehler" role="group" aria-label="Maschinen für {itemName(product.item)}">
      <button
        type="button"
        class="btn schritt"
        aria-label="Eine Maschine weniger für {itemName(product.item)}"
        disabled={n === 0}
        onclick={() => game.run(unassignMachine(game.state, wagon.id, product.job))}
      >
        −
      </button>
      <b class="mono anzahl" aria-live="polite">{n}</b>
      <button
        type="button"
        class="btn schritt"
        aria-label="Eine Maschine mehr für {itemName(product.item)}"
        disabled={frei === 0}
        title={frei === 0 ? 'Keine freie Maschine. Baue eine oder nimm sie einer anderen Ware weg.' : 'Freie Maschine zuteilen'}
        onclick={() => game.run(assignMachine(game.state, wagon.id, product.job))}
      >
        +
      </button>
    </div>
    <span class="text">
      {#if n > 0}
        <span class="mono rate">{formatRate(product.rate)}</span>
        <span class="status tone-{tone}">{status}</span>
      {:else}
        <span class="small muted">je Maschine {formatRate(product.perMachine)}</span>
      {/if}
    </span>
  </div>

  {#if product.recipe}
    <!-- Immer da, auch leer: Sonst springt die Karte, sobald eine Maschine dazukommt. -->
    <p class="meldung verbrauch">
      {#if verbrauch.length > 0}verbraucht {verbrauch.map((v) => `${formatRate(v.amount)} ${itemName(v.item)}`).join(' · ')}{/if}
    </p>
  {/if}
</div>

<style>
  .produkt {
    display: grid;
    gap: 8px;
    padding: 10px 12px;
    border: 1px solid var(--line);
    border-radius: 10px;
    background: var(--surface);
  }

  .produkt.aktiv {
    border-color: var(--accent);
  }

  .kopf {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
  }

  .ware {
    display: flex;
    align-items: center;
    gap: 8px;
    min-width: 0;
    padding: 0;
    border: 0;
    background: transparent;
    color: inherit;
    font: inherit;
    text-align: left;
    cursor: pointer;
  }

  .name {
    font-weight: 600;
    font-size: 15px;
  }

  .lager {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    line-height: 1.15;
    flex: none;
  }

  .bestand {
    font-size: 14px;
  }

  .saldo {
    font-size: 11.5px;
    color: var(--ink-2);
  }

  .quelle {
    margin: 0;
    font-size: 13px;
  }

  .steuer {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .zaehler {
    display: flex;
    align-items: center;
    gap: 2px;
    flex: none;
  }

  .schritt {
    width: 38px;
    min-height: 36px;
    padding: 0;
    font-size: 20px;
    line-height: 1;
  }

  .anzahl {
    min-width: 34px;
    text-align: center;
    font-size: 18px;
  }

  .text {
    display: flex;
    flex-direction: column;
    min-width: 0;
    line-height: 1.2;
  }

  .rate {
    font-size: 14px;
    font-weight: 600;
  }

  .status {
    font-size: 12.5px;
  }

  .small {
    font-size: 13px;
  }

  .verbrauch {
    margin: -2px 0 0;
  }
</style>
