<script lang="ts">
  /**
   * Der Chemiewagen: ein Kesselwagen mit Dom, Laufsteg und Leiter, auf zwei
   * Sätteln über dem Rahmen. Im Schauglas steigen Blasen, wenn ein Reaktor läuft.
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
    <stop offset="0" stop-color="#000000" stop-opacity="0.22" />
    <stop offset="0.18" stop-color="#ffffff" stop-opacity="0.34" />
    <stop offset="0.48" stop-color="#ffffff" stop-opacity="0.03" />
    <stop offset="1" stop-color="#000000" stop-opacity="0.45" />
  </linearGradient>
  <linearGradient id="{id}-box" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#ffffff" stop-opacity="0.24" />
    <stop offset="0.5" stop-color="#ffffff" stop-opacity="0" />
    <stop offset="1" stop-color="#000000" stop-opacity="0.3" />
  </linearGradient>
</defs>

<Chassis w={150} axles={[34, 116]} {unit} />

<!-- Sättel -->
<rect x="26" y="60" width="24" height="12" rx="1" fill="#33373c" />
<rect x="100" y="60" width="24" height="12" rx="1" fill="#33373c" />

<!-- Kessel -->
<rect x="14" y="28" width="122" height="38" rx="19" fill="var(--w-chemie)" />
<rect x="14" y="28" width="122" height="38" rx="19" fill="url(#{id}-cyl)" />
<rect x="46" y="26" width="4" height="42" rx="1" fill="#2a2e33" opacity="0.75" />
<rect x="100" y="26" width="4" height="42" rx="1" fill="#2a2e33" opacity="0.75" />
<path d="M64 30 Q64 16 75 16 Q86 16 86 30 Z" fill="var(--w-chemie)" />
<path d="M64 30 Q64 16 75 16 Q86 16 86 30 Z" fill="url(#{id}-box)" />
<rect x="68" y="14" width="14" height="3" rx="1.5" fill="#2a2e33" />

<!-- Laufsteg und Leiter -->
<rect x="40" y="26.5" width="70" height="2" fill="#2a2e33" />
{#each [44, 74, 104] as x (x)}
  <rect x={x} y="19.5" width="1.5" height="7" fill="#2a2e33" />
{/each}
<rect x="42" y="19.5" width="66" height="1.2" fill="#2a2e33" />
<rect x="20" y="34" width="1.6" height="34" fill="#2a2e33" />
<rect x="28" y="34" width="1.6" height="34" fill="#2a2e33" />
{#each [38, 43, 48, 53, 58, 63] as y (y)}
  <rect x="21" y={y} width="7.5" height="1.2" fill="#2a2e33" />
{/each}

<!-- Gefahrgut-Tafel und Schauglas -->
<path d="M112 42 L118 48 L112 54 L106 48 Z" fill="#f2a33a" />
<path d="M112 44.5 L115.5 48 L112 51.5 L108.5 48 Z" fill="none" stroke="#2a2e33" stroke-width="0.8" />
<rect x="124" y="36" width="5" height="22" rx="2.5" fill="#1c1f23" />
<rect x="124.8" y="37" width="3.4" height="20" rx="1.7" fill="#9cc0d3" opacity="0.6" />
<rect x="124.8" y="44" width="3.4" height="13" rx="1.7" fill="#7ad3c0" opacity="0.85" />
<g class="blasen" class:active fill="#ffffff">
  <circle class="blase" style="animation-delay: 0s" cx="126.5" cy="55" r="0.9" />
  <circle class="blase" style="animation-delay: 0.7s" cx="126.5" cy="55" r="0.7" />
</g>

<Plate x={30} y={46} {level} />
<Lamp cx={130} cy={30} {tone} />

<style>
  .blase {
    opacity: 0;
  }

  @media (prefers-reduced-motion: no-preference) {
    .blasen.active .blase {
      animation: bubble 1.4s ease-in infinite;
    }
  }

  @keyframes bubble {
    0% {
      transform: translateY(0);
      opacity: 0.9;
    }

    100% {
      transform: translateY(-10px);
      opacity: 0;
    }
  }
</style>
