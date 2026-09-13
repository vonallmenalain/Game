<script lang="ts">
  import { TABS, type Tab } from '../tabs';

  let { active, dots, onchange }: { active: Tab; dots: Partial<Record<Tab, boolean>>; onchange: (tab: Tab) => void } = $props();
</script>

<nav class="tabs" aria-label="Bereiche">
  {#each TABS as tab (tab.id)}
    <!-- Der Punkt bleibt aus dem zugänglichen Namen heraus, damit der Name eines
         Ziels stabil bleibt. Was dort wartet, sagt der Titel. -->
    <button
      type="button"
      class:active={active === tab.id}
      onclick={() => onchange(tab.id)}
      aria-current={active === tab.id ? 'page' : undefined}
      title={dots[tab.id] ? `${tab.label}: hier wartet etwas` : tab.label}
    >
      <span class="label">{tab.label}</span>
      {#if dots[tab.id]}<span class="dot" aria-hidden="true"></span>{/if}
    </button>
  {/each}
</nav>

<style>
  .tabs {
    flex: none;
    display: grid;
    grid-template-columns: repeat(6, 1fr);
    background: var(--surface);
    border-top: 1px solid var(--line);
    padding-bottom: var(--safe-bottom);
    z-index: 10;
  }

  button {
    position: relative;
    border: 0;
    background: transparent;
    padding: 10px 2px 12px;
    font-size: 11px;
    font-weight: 600;
    letter-spacing: -0.01em;
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
    left: 14%;
    right: 14%;
    top: 0;
    height: 2px;
    background: var(--accent);
  }

  .dot {
    position: absolute;
    top: 7px;
    right: calc(50% - 20px);
    width: 7px;
    height: 7px;
    border-radius: 50%;
    background: var(--accent);
  }
</style>
