<script lang="ts">
  /**
   * Der Walzwagen: ein Flachwagen mit einem Walzgerüst darauf. Zwei Walzen im
   * Ständer, Schwungrad vorne, Zahnräder hinten, und ein glühender Strang, sobald
   * eine Walzstrasse läuft.
   */
  import type { WagonProps } from './props';
  import Chassis from './Chassis.svelte';
  import Lamp from './Lamp.svelte';
  import Plate from './Plate.svelte';

  let { unit = 0, active = false, level = 1, tone = 'mute' }: WagonProps = $props();
  const id = $props.id();
</script>

<defs>
  <linearGradient id="{id}-cyl" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#000000" stop-opacity="0.25" />
    <stop offset="0.2" stop-color="#ffffff" stop-opacity="0.4" />
    <stop offset="0.5" stop-color="#ffffff" stop-opacity="0.05" />
    <stop offset="1" stop-color="#000000" stop-opacity="0.5" />
  </linearGradient>
  <linearGradient id="{id}-box" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#ffffff" stop-opacity="0.24" />
    <stop offset="0.5" stop-color="#ffffff" stop-opacity="0" />
    <stop offset="1" stop-color="#000000" stop-opacity="0.3" />
  </linearGradient>
  <linearGradient id="{id}-bar" x1="0" y1="0" x2="1" y2="0">
    <stop offset="0" stop-color="#ffb347" stop-opacity="0" />
    <stop offset="0.2" stop-color="#ff9a3a" />
    <stop offset="0.8" stop-color="#ff9a3a" />
    <stop offset="1" stop-color="#ffb347" stop-opacity="0" />
  </linearGradient>
</defs>

<Chassis w={160} axles={[22, 40, 120, 138]} r={9} {unit} />
<rect x="12" y="78" width="38" height="3" rx="1" fill="#2a2e33" />
<rect x="110" y="78" width="38" height="3" rx="1" fill="#2a2e33" />

<!-- Ladefläche aus Bohlen -->
<rect x="8" y="64" width="144" height="8" fill="#5a4a3a" />
<rect x="8" y="64" width="144" height="8" fill="url(#{id}-box)" />
{#each [24, 40, 56, 72, 88, 104, 120, 136] as x (x)}
  <rect x={x} y="64" width="1" height="8" fill="#000000" opacity="0.25" />
{/each}
<rect x="26" y="58" width="108" height="6" rx="1" fill="#2c3035" />

<!-- Schwungrad vorne -->
<g class="dreht" class:active style="transform-origin: 24px 40px">
  <circle cx="24" cy="40" r="13" fill="none" stroke="#3f444a" stroke-width="3.6" />
  {#each [0, 60, 120] as a (a)}
    <rect x="11.5" y="38.8" width="25" height="2.4" fill="#3f444a" transform="rotate({a} 24 40)" />
  {/each}
  <circle cx="24" cy="40" r="3.4" fill="#8c9298" />
</g>
<rect x="34" y="52" width="12" height="6" fill="#2c3035" />

<!-- Walzgerüst: Ständer, Traverse, Walzen -->
<rect x="40" y="16" width="14" height="44" rx="1.5" fill="var(--w-walz)" />
<rect x="40" y="16" width="14" height="44" rx="1.5" fill="url(#{id}-box)" />
<rect x="106" y="16" width="14" height="44" rx="1.5" fill="var(--w-walz)" />
<rect x="106" y="16" width="14" height="44" rx="1.5" fill="url(#{id}-box)" />
<rect x="36" y="13" width="88" height="6" rx="1.5" fill="var(--w-walz)" />
<rect x="36" y="13" width="88" height="6" rx="1.5" fill="#000000" opacity="0.25" />
{#each [44, 50, 110, 116] as x (x)}
  <circle cx={x} cy="24" r="1.4" fill="#c9ced3" opacity="0.8" />
  <circle cx={x} cy="54" r="1.4" fill="#c9ced3" opacity="0.8" />
{/each}
<rect x="54" y="30" width="52" height="12" rx="6" fill="#8b9096" />
<rect x="54" y="30" width="52" height="12" rx="6" fill="url(#{id}-cyl)" />
<rect x="54" y="45" width="52" height="12" rx="6" fill="#8b9096" />
<rect x="54" y="45" width="52" height="12" rx="6" fill="url(#{id}-cyl)" />
<!-- Der Strang zwischen den Walzen -->
<rect x="20" y="41.4" width="120" height="3.2" rx="1" fill={active ? `url(#${id}-bar)` : '#4a4f56'} class="strang" />
{#if active}
  <rect x="20" y="39" width="120" height="8" rx="4" fill="url(#{id}-bar)" opacity="0.3" class="strang" />
{/if}

<!-- Zahnräder hinten -->
<g class="dreht" class:active style="transform-origin: 132px 37px">
  <circle cx="132" cy="37" r="10" fill="#4c5258" />
  {#each [0, 30, 60, 90, 120, 150] as a (a)}
    <rect x="120" y="35.6" width="24" height="2.8" rx="1" fill="#4c5258" transform="rotate({a} 132 37)" />
  {/each}
  <circle cx="132" cy="37" r="3" fill="#8c9298" />
</g>
<g class="dreht gegen" class:active style="transform-origin: 147px 24px">
  <circle cx="147" cy="24" r="5.5" fill="#5a6067" />
  {#each [0, 45, 90, 135] as a (a)}
    <rect x="140" y="23" width="14" height="2" rx="0.8" fill="#5a6067" transform="rotate({a} 147 24)" />
  {/each}
  <circle cx="147" cy="24" r="1.8" fill="#c9ced3" />
</g>

<Plate x={41} y={46} {level} />
<Lamp cx={126} cy={20} {tone} />

<style>
  .strang {
    transition: fill 0.6s ease;
  }

  @media (prefers-reduced-motion: no-preference) {
    .dreht.active {
      animation: spin 2.4s linear infinite;
    }

    .dreht.gegen.active {
      animation-direction: reverse;
      animation-duration: 1.3s;
    }
  }

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }
</style>
