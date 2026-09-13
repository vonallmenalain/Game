<script lang="ts">
  /**
   * Der Erntewagen: ein offener Wagen mit Bordwänden, darauf die Erntemaschine
   * mit Haspel am Ausleger, Förderband und Bunker, dazu die Handkurbel an der Seite.
   */
  import type { WagonProps } from './props';
  import Chassis from './Chassis.svelte';
  import Lamp from './Lamp.svelte';
  import Plate from './Plate.svelte';

  let { unit = 0, active = false, level = 1, tone = 'mute' }: WagonProps = $props();
  const id = $props.id();
</script>

<defs>
  <linearGradient id="{id}-box" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#ffffff" stop-opacity="0.24" />
    <stop offset="0.5" stop-color="#ffffff" stop-opacity="0" />
    <stop offset="1" stop-color="#000000" stop-opacity="0.3" />
  </linearGradient>
</defs>

<Chassis w={150} axles={[34, 116]} {unit} />

<!-- Ausleger und Haspel, vorne über den Rand hinaus -->
<path d="M92 27 L26 31 L26 37 L92 35 Z" fill="#3f444a" />
<g class="haspel" class:active style="transform-origin: 26px 34px">
  <circle cx="26" cy="34" r="14" fill="none" stroke="#3f444a" stroke-width="2" />
  {#each [0, 60, 120] as a (a)}
    <rect x="12.5" y="32.6" width="27" height="2.8" rx="1" fill="#b58a4a" transform="rotate({a} 26 34)" />
  {/each}
  <circle cx="26" cy="34" r="3" fill="#2a2e33" />
</g>

<!-- Förderband von der Haspel zum Bunker -->
<rect x="34" y="41" width="58" height="6" rx="2" fill="#2c3035" />
<g class="belt" class:active>
  {#each [0, 1, 2, 3, 4, 5, 6, 7] as i (i)}
    <rect x={36 + i * 8} y="42" width="3" height="4" fill="#ffffff" opacity="0.14" />
  {/each}
</g>

<!-- Bunker hinten -->
<rect x="92" y="22" width="46" height="28" rx="2" fill="#6b7078" />
<rect x="92" y="22" width="46" height="28" rx="2" fill="url(#{id}-box)" />
<rect x="90" y="20" width="50" height="4" rx="1" fill="#4d5158" />
<path d="M96 50 L104 58 L118 58 L126 50 Z" fill="#3a3f45" />
<rect x="98" y="30" width="34" height="1.2" fill="#000000" opacity="0.25" />
<rect x="98" y="40" width="34" height="1.2" fill="#000000" opacity="0.25" />

<!-- Bordwände mit Brettern und Rungen -->
<rect x="8" y="50" width="134" height="22" fill="var(--w-ernte)" />
<rect x="8" y="50" width="134" height="22" fill="url(#{id}-box)" />
<rect x="8" y="49" width="134" height="1.6" fill="#ffffff" opacity="0.3" />
<rect x="8" y="57" width="134" height="1" fill="#000000" opacity="0.2" />
<rect x="8" y="64" width="134" height="1" fill="#000000" opacity="0.2" />
{#each [12, 44, 76, 108, 136] as x (x)}
  <rect x={x} y="48" width="3" height="24" fill="#000000" opacity="0.32" />
{/each}

<!-- Handkurbel -->
<circle cx="126" cy="60" r="4.5" fill="#2a2e33" />
<g class="kurbel" class:active style="transform-origin: 126px 60px">
  <rect x="126" y="58.8" width="9" height="2.4" rx="1" fill="#9aa0a6" />
  <circle cx="134" cy="60" r="1.8" fill="#c9ced3" />
</g>

<Plate x={60} y={55} {level} />
<Lamp cx={140} cy={44} {tone} />

<style>
  @media (prefers-reduced-motion: no-preference) {
    .haspel.active {
      animation: spin 1.6s linear infinite;
    }

    .kurbel.active {
      animation: spin 1.1s linear infinite;
    }

    .belt.active {
      animation: belt 0.6s linear infinite;
    }
  }

  @keyframes spin {
    to {
      transform: rotate(-360deg);
    }
  }

  @keyframes belt {
    to {
      transform: translateX(8px);
    }
  }
</style>
