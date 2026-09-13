<script lang="ts">
  /**
   * Der Lagerwagen: ein gedeckter Güterwagen mit Bretterwänden, Schiebetür in
   * der Mitte, Lüftungsklappe und Handbremse am Ende.
   */
  import type { WagonProps } from './props';
  import Chassis from './Chassis.svelte';
  import Lamp from './Lamp.svelte';

  let { unit = 0, tone = 'mute' }: WagonProps = $props();
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

<!-- Kasten aus Brettern -->
<rect x="10" y="26" width="130" height="46" fill="var(--w-lager)" />
<rect x="10" y="26" width="130" height="46" fill="url(#{id}-box)" />
{#each [18, 26, 34, 42, 50, 100, 108, 116, 124, 132] as x (x)}
  <rect x={x} y="26" width="1" height="46" fill="#000000" opacity="0.14" />
{/each}
<rect x="10" y="48" width="130" height="1.4" fill="#000000" opacity="0.2" />
<rect x="10" y="26" width="3" height="46" fill="#000000" opacity="0.3" />
<rect x="137" y="26" width="3" height="46" fill="#000000" opacity="0.3" />
<rect x="10" y="26" width="130" height="1.2" fill="#ffffff" opacity="0.3" />

<!-- Lüftungsklappe und Anschriftfeld -->
<rect x="18" y="32" width="14" height="9" rx="1" fill="#2a2e33" />
{#each [34, 36.5, 39] as y (y)}
  <rect x="19.5" y={y} width="11" height="1" fill="#ffffff" opacity="0.3" />
{/each}
<rect x="108" y="38" width="9" height="9" fill="#eceae4" />
<rect x="109.5" y="41" width="6" height="1" fill="#2a2e33" opacity="0.6" />
<rect x="109.5" y="43.5" width="4" height="1" fill="#2a2e33" opacity="0.6" />

<!-- Schiebetür -->
<rect x="52" y="27" width="48" height="3" fill="#2a2e33" />
<rect x="58" y="30" width="36" height="42" fill="#000000" opacity="0.16" />
<rect x="58" y="30" width="36" height="42" fill="none" stroke="#2a2e33" stroke-width="1.4" />
<path d="M60 70 L92 32" stroke="#2a2e33" stroke-width="1.6" opacity="0.6" />
<rect x="58" y="50" width="36" height="1" fill="#2a2e33" opacity="0.5" />
<rect x="88" y="50" width="3" height="8" rx="1" fill="#2a2e33" />

<!-- Handbremse -->
<circle cx="141" cy="60" r="5" fill="none" stroke="#2a2e33" stroke-width="1.6" />
<path d="M136 60 H146 M141 55 V65" stroke="#2a2e33" stroke-width="1.2" />

<!-- Dach -->
<rect x="6" y="18" width="138" height="10" rx="5" fill="#4a4d52" />
<rect x="6" y="18" width="138" height="10" rx="5" fill="url(#{id}-box)" />
<rect x="14" y="19.5" width="122" height="1.2" fill="#ffffff" opacity="0.25" />

<Lamp cx={136} cy={34} {tone} />
