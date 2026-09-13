<script lang="ts">
  /**
   * Der Schmelzwagen: eine Torpedopfanne, wie sie im Hüttenwerk flüssiges Eisen
   * fährt. Das Gefäss hängt in zwei Endgestellen auf Drehgestellen, oben glüht die
   * Öffnung, wenn ein Ofen läuft.
   */
  import type { WagonProps } from './props';
  import Chassis from './Chassis.svelte';
  import Lamp from './Lamp.svelte';
  import Plate from './Plate.svelte';

  let { unit = 0, active = false, level = 1, tone = 'mute' }: WagonProps = $props();
  const id = $props.id();
  const vessel = 'M30 52 Q30 30 62 30 L106 30 Q138 30 138 52 Q138 74 106 74 L62 74 Q30 74 30 52 Z';
</script>

<defs>
  <linearGradient id="{id}-cyl" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#000000" stop-opacity="0.25" />
    <stop offset="0.18" stop-color="#ffffff" stop-opacity="0.28" />
    <stop offset="0.45" stop-color="#ffffff" stop-opacity="0.02" />
    <stop offset="1" stop-color="#000000" stop-opacity="0.5" />
  </linearGradient>
  <linearGradient id="{id}-box" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#ffffff" stop-opacity="0.24" />
    <stop offset="0.5" stop-color="#ffffff" stop-opacity="0" />
    <stop offset="1" stop-color="#000000" stop-opacity="0.3" />
  </linearGradient>
  <radialGradient id="{id}-glow">
    <stop offset="0" stop-color="#ffb347" stop-opacity="0.75" />
    <stop offset="1" stop-color="#ff6a00" stop-opacity="0" />
  </radialGradient>
</defs>

<Chassis w={168} axles={[22, 40, 128, 146]} r={9} top={74} {unit} />
<rect x="12" y="80" width="38" height="3" rx="1" fill="#2a2e33" />
<rect x="118" y="80" width="38" height="3" rx="1" fill="#2a2e33" />

<!-- Endgestelle -->
<rect x="14" y="40" width="24" height="34" rx="1.5" fill="var(--w-schmelz)" />
<rect x="14" y="40" width="24" height="34" rx="1.5" fill="url(#{id}-box)" />
<rect x="130" y="40" width="24" height="34" rx="1.5" fill="var(--w-schmelz)" />
<rect x="130" y="40" width="24" height="34" rx="1.5" fill="url(#{id}-box)" />
<rect x="14" y="40" width="24" height="1.4" fill="#ffffff" opacity="0.3" />
<rect x="130" y="40" width="24" height="1.4" fill="#ffffff" opacity="0.3" />

<!-- Die Pfanne -->
<path d={vessel} fill="#3b353a" />
<path d={vessel} fill="url(#{id}-cyl)" />
<rect x="58" y="30" width="3" height="44" fill="#26232a" />
<rect x="107" y="30" width="3" height="44" fill="#26232a" />
<rect x="58" y="30" width="1" height="44" fill="#ffffff" opacity="0.15" />
<rect x="107" y="30" width="1" height="44" fill="#ffffff" opacity="0.15" />
{#each [40, 48, 66, 74, 82, 90, 98, 116, 124] as x (x)}
  <circle cx={x} cy="35" r="0.9" fill="#ffffff" opacity="0.28" />
  <circle cx={x} cy="69" r="0.9" fill="#ffffff" opacity="0.2" />
{/each}
<!-- Zapfen der Lagerung -->
<circle cx="26" cy="52" r="6" fill="#2a2e33" />
<circle cx="26" cy="52" r="2.4" fill="#8c9298" />
<circle cx="142" cy="52" r="6" fill="#2a2e33" />
<circle cx="142" cy="52" r="2.4" fill="#8c9298" />

<!-- Öffnung mit Glut -->
<circle cx="84" cy="34" r="26" fill="url(#{id}-glow)" class="schein" opacity={active ? 0.7 : 0} />
<ellipse cx="84" cy="30" rx="13" ry="5" fill="#1a1618" />
<ellipse cx="84" cy="30" rx="10" ry="3.6" fill={active ? '#ff7d24' : '#3a2a22'} class="glut" class:active />
<ellipse cx="84" cy="30" rx="5" ry="1.8" fill={active ? '#ffd873' : '#4a3328'} class="glut" class:active />
<g class="funken" class:active fill="#ffb347">
  {#each [0, 1, 2, 3] as i (i)}
    <circle class="ember" style="animation-delay: {i * 0.45}s" cx={78 + i * 4} cy="29" r="1.1" />
  {/each}
</g>

<Plate x={18} y={60} {level} />
<Lamp cx={150} cy={46} {tone} />

<style>
  .schein,
  .glut {
    transition:
      opacity 0.8s ease,
      fill 0.8s ease;
  }

  .ember {
    opacity: 0;
  }

  @media (prefers-reduced-motion: no-preference) {
    .glut.active {
      animation: flicker 0.7s ease-in-out infinite alternate;
    }

    .funken.active .ember {
      animation: rise 1.8s ease-out infinite;
    }
  }

  @keyframes flicker {
    from {
      opacity: 0.8;
    }

    to {
      opacity: 1;
    }
  }

  @keyframes rise {
    0% {
      transform: translate(0, 0);
      opacity: 0.9;
    }

    100% {
      transform: translate(6px, -26px);
      opacity: 0;
    }
  }
</style>
