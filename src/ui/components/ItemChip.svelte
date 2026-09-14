<script lang="ts">
  import { formatCount } from '../../lib/format';
  import { game } from '../game.svelte';
  import { itemColor, itemName } from '../labels';
  import ItemIcon from './ItemIcon.svelte';

  let {
    item,
    amount = null,
    have = null,
    lacking = false,
    full = false,
    showName = false,
    size = 'm',
    tap = false,
  }: {
    item: string;
    amount?: number | null;
    have?: number | null;
    lacking?: boolean;
    full?: boolean;
    showName?: boolean;
    size?: 's' | 'm';
    /** Antippen öffnet die Übersicht der Ware. Nicht in Knöpfen verwenden, ein Knopf im Knopf ist keiner. */
    tap?: boolean;
  } = $props();

  const title = $derived(full ? `${itemName(item)}: Lager voll` : itemName(item));
</script>

{#snippet inhalt()}
  <span class="box" style="--mark: {itemColor(item)}">
    <ItemIcon {item} />
    {#if amount !== null}<b class="need mono">{amount}</b>{/if}
  </span>
  {#if showName}<span class="label">{itemName(item)}</span>{/if}
  {#if have !== null}
    <span class="have mono" class:short={lacking} class:voll={full}>{formatCount(have)}</span>
  {/if}
{/snippet}

{#if tap}
  <button type="button" class="chip {size} tipp" class:lacking {title} aria-label="{itemName(item)}: Übersicht öffnen" onclick={() => game.openItem(item)}>
    {@render inhalt()}
  </button>
{:else}
  <span class="chip {size}" class:lacking {title}>
    {@render inhalt()}
  </span>
{/if}

<style>
  .chip {
    display: inline-flex;
    flex-direction: column;
    align-items: center;
    gap: 2px;
    flex: none;
  }

  /* Als Knopf sieht der Chip gleich aus; nur der Zeiger verrät, dass er aufgeht. */
  .tipp {
    border: 0;
    margin: 0;
    padding: 0;
    background: transparent;
    color: inherit;
    font: inherit;
    cursor: pointer;
    touch-action: manipulation;
    border-radius: 8px;
  }

  .box {
    position: relative;
    display: grid;
    place-items: center;
    width: 30px;
    height: 30px;
    padding: 3px;
    border-radius: 7px;
    background: var(--mark);
    color: #fff;
  }

  .chip.s .box {
    width: 24px;
    height: 24px;
    padding: 2px;
    border-radius: 6px;
  }

  .chip.lacking .box {
    opacity: 0.45;
  }

  /* Oben rechts, nicht unten: Unten steht der Bestand, den die Marke sonst verdeckt. */
  .need {
    position: absolute;
    right: -5px;
    top: -4px;
    min-width: 15px;
    padding: 0 3px;
    border-radius: 8px;
    background: var(--ink);
    color: var(--bg);
    font-size: 11px;
    font-weight: 700;
    line-height: 15px;
    text-align: center;
    box-shadow: 0 0 0 1.5px var(--surface);
  }

  /* Der Name steht unter dem Bild, damit auch ohne Bilderkennung klar ist,
     welche Ware gemeint ist. Lange Wörter brechen um, statt die Zeile zu sprengen. */
  .label {
    max-width: 64px;
    margin-top: 1px;
    font-size: 10px;
    line-height: 1.15;
    color: var(--ink-2);
    text-align: center;
    overflow-wrap: anywhere;
  }

  .have {
    font-size: 11px;
    color: var(--ink-2);
    line-height: 1.1;
  }

  .have.short {
    color: var(--warn);
    font-weight: 700;
  }

  .have.voll {
    color: var(--warn);
  }
</style>
