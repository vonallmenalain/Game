<script lang="ts">
  import { TABS, type Tab } from '../tabs';

  let { active, dots, onchange }: { active: Tab; dots: Partial<Record<Tab, boolean>>; onchange: (tab: Tab) => void } = $props();
</script>

<nav class="tabs" aria-label="Bereiche">
  {#each TABS as tab (tab.id)}
    <button type="button" class:active={active === tab.id} onclick={() => onchange(tab.id)} aria-current={active === tab.id ? 'page' : undefined}>
      <span class="label">{tab.label}</span>
      {#if dots[tab.id]}<span class="dot" aria-label="Hier wartet etwas"></span>{/if}
    </button>
  {/each}
</nav>

<style>
  .tabs {
    position: fixed;
    left: 0;
    right: 0;
    bottom: 0;
    display: grid;
    grid-template-columns: repeat(5, 1fr);
    background: var(--surface);
    border-top: 1px solid var(--line);
    padding-bottom: var(--safe-bottom);
    z-index: 10;
  }

  button {
    position: relative;
    border: 0;
    background: transparent;
    padding: 10px 4px 12px;
    font-size: 12px;
    font-weight: 600;
    color: var(--ink-2);
    cursor: pointer;
    touch-action: manipulation;
  }

  button.active {
    color: var(--accent-ink);
  }

  button.active::after {
    content: '';
    position: absolute;
    left: 20%;
    right: 20%;
    top: 0;
    height: 2px;
    background: var(--accent);
  }

  .dot {
    position: absolute;
    top: 8px;
    right: calc(50% - 22px);
    width: 7px;
    height: 7px;
    border-radius: 50%;
    background: var(--accent);
  }
</style>
