<script lang="ts">
  /**
   * Der Werkwagen: ein Werkstattwagen mit offener Schiebetür. Drinnen die
   * Werkbank mit Schraubstock, Werkzeug an der Wand und eine Lampe; auf dem Dach
   * das Ofenrohr. Beim Arbeiten sprühen Funken.
   */
  import { mix } from '../../stage/scenery';
  import type { WagonProps } from './props';
  import Chassis from './Chassis.svelte';
  import Lamp from './Lamp.svelte';
  import Plate from './Plate.svelte';

  let { unit = 0, active = false, level = 1, tone = 'mute', dark = false }: WagonProps = $props();
  const id = $props.id();
  const lit = $derived(active || dark);
</script>

<defs>
  <linearGradient id="{id}-box" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#ffffff" stop-opacity="0.24" />
    <stop offset="0.5" stop-color="#ffffff" stop-opacity="0" />
    <stop offset="1" stop-color="#000000" stop-opacity="0.3" />
  </linearGradient>
  <radialGradient id="{id}-licht">
    <stop offset="0" stop-color="#ffe08a" stop-opacity="0.85" />
    <stop offset="1" stop-color="#ffe08a" stop-opacity="0" />
  </radialGradient>
</defs>

<Chassis w={150} axles={[34, 116]} {unit} />

<!-- Kasten mit Brettern -->
<rect x="10" y="24" width="130" height="48" fill="var(--w-werk)" />
<rect x="10" y="24" width="130" height="48" fill="url(#{id}-box)" />
{#each [20, 30, 40, 110, 120, 130] as x (x)}
  <rect x={x} y="24" width="1" height="48" fill="#000000" opacity="0.14" />
{/each}
<rect x="10" y="24" width="3" height="48" fill="#000000" opacity="0.3" />
<rect x="137" y="24" width="3" height="48" fill="#000000" opacity="0.3" />

<!-- Fenster -->
<rect x="18" y="34" width="18" height="14" rx="1.5" fill="var(--lok-glass)" />
<rect x="18" y="34" width="18" height="14" rx="1.5" fill="url(#{id}-licht)" opacity={lit ? 0.7 : 0} class="fenster" />
<path d="M20 47 L31 36 L34 36 L23 47 Z" fill="#ffffff" opacity="0.3" />
<rect x="18" y="34" width="18" height="14" rx="1.5" fill="none" stroke="#2a2e33" stroke-width="1.2" />
<rect x="26.5" y="34" width="1.2" height="14" fill="#2a2e33" />

<!-- Offene Tür: Innenraum -->
<rect x="52" y="30" width="42" height="42" fill="#1c1f23" />
<circle cx="74" cy="46" r="20" fill="url(#{id}-licht)" opacity={lit ? 0.55 : 0} class="fenster" />
<rect x="73" y="30" width="1" height="6" fill="#9aa0a6" />
<path d="M70 38 L78 38 L76 36 L72 36 Z" fill="#3a3f46" />
<circle cx="74" cy="39.5" r="2.4" fill={lit ? '#ffe08a' : '#8a8f96'} class="birne" />
<!-- Werkzeug an der Wand -->
<rect x="56" y="36" width="1.6" height="9" fill="#9aa0a6" /><rect x="54.5" y="35" width="4.6" height="2.6" fill="#7a5a3c" />
<rect x="62" y="35" width="1.6" height="10" fill="#9aa0a6" /><circle cx="62.8" cy="35" r="1.8" fill="#9aa0a6" />
<rect x="84" y="36" width="8" height="10" fill="#3a3f46" /><rect x="85" y="37" width="6" height="2" fill="#9aa0a6" /><rect x="85" y="41" width="6" height="2" fill="#9aa0a6" />
<!-- Werkbank mit Schraubstock -->
<rect x="54" y="54" width="38" height="4" fill="#6e5138" />
<rect x="56" y="58" width="3" height="14" fill="#4e3a2a" />
<rect x="87" y="58" width="3" height="14" fill="#4e3a2a" />
<rect x="60" y="48" width="9" height="6" rx="1" fill="#3a3f46" />
<rect x="62" y="46" width="5" height="2" fill="#8c9298" />
<g class="funken" class:active fill="#ffd36b">
  {#each [0, 1, 2] as i (i)}
    <circle class="funke" style="animation-delay: {i * 0.35}s" cx="64" cy="47" r="1" />
  {/each}
</g>

<!-- Türschiene und aufgeschobene Tür -->
<rect x="46" y="26" width="90" height="3" fill="#2a2e33" />
<rect x="94" y="28" width="38" height="44" fill={mix('#9c6b2f', '#000000', 0.18)} />
<rect x="94" y="28" width="38" height="44" fill="url(#{id}-box)" />
<rect x="94" y="28" width="38" height="44" fill="none" stroke="#2a2e33" stroke-width="1.4" />
<path d="M96 70 L130 30 M96 30 L130 70" stroke="#ffffff" stroke-opacity="0.2" stroke-width="2" />
<rect x="98" y="48" width="2.4" height="8" rx="1" fill="#2a2e33" />

<!-- Dach mit Ofenrohr und Lüfter -->
<path d="M8 24 Q75 13 142 24 L142 27 Q75 16 8 27 Z" fill="#2e3236" />
<path d="M8 24 Q75 13 142 24" fill="none" stroke="#ffffff" stroke-opacity="0.22" stroke-width="1" />
<rect x="28" y="6" width="6" height="14" fill="#1f2327" />
<rect x="25" y="4" width="12" height="3" rx="1" fill="#1f2327" />
<rect x="100" y="14" width="10" height="5" rx="1" fill="#3a3f46" />

<Plate x={18} y={60} {level} />
<Lamp cx={136} cy={34} {tone} />

<style>
  .fenster,
  .birne {
    transition:
      opacity 0.6s ease,
      fill 0.6s ease;
  }

  .funke {
    opacity: 0;
  }

  @media (prefers-reduced-motion: no-preference) {
    .funken.active .funke {
      animation: spark 1.1s ease-out infinite;
    }
  }

  @keyframes spark {
    0% {
      transform: translate(0, 0);
      opacity: 1;
    }

    100% {
      transform: translate(-7px, -12px);
      opacity: 0;
    }
  }
</style>
