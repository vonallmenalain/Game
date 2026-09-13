<script lang="ts">
  /**
   * Die Dampflok: eine kleine Tenderlok mit drei Treibachsen, Seitentanks, Kessel
   * mit Dampfdom, Führerhaus mit Kohlenkasten, nach dem Vorbild der Schweizer
   * Rangierloks. Fahrtrichtung links. Räder und Gestänge laufen an der Bewegungsuhr.
   */
  import { getContext } from 'svelte';
  import type { Motion } from '../../stage/motion';
  import { attachRods, crossheadRest, type RodGeometry } from '../../stage/rods';
  import Wheel from './Wheel.svelte';

  let { unit = 0, rolling = false, dark = false }: { unit?: number; rolling?: boolean; dark?: boolean } = $props();

  const id = $props.id();
  const motion = getContext<Motion | undefined>('motion');
  const DRIVERS = [60, 108, 156];
  const G: RodGeometry = { radius: 15, crank: 6, driver: 108, cy: 85, rod: 62 };
  const REST = crossheadRest(G);

  let coupling = $state<SVGGElement | null>(null);
  let main = $state<SVGGElement | null>(null);
  let crosshead = $state<SVGGElement | null>(null);

  $effect(() => {
    if (!motion || !coupling || !main || !crosshead || unit <= 0) return;
    return attachRods(motion, { coupling, main, crosshead }, G, unit);
  });
</script>

<defs>
  <linearGradient id="{id}-cyl" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#000000" stop-opacity="0.3" />
    <stop offset="0.16" stop-color="#ffffff" stop-opacity="0.3" />
    <stop offset="0.42" stop-color="#ffffff" stop-opacity="0.03" />
    <stop offset="1" stop-color="#000000" stop-opacity="0.5" />
  </linearGradient>
  <linearGradient id="{id}-box" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#ffffff" stop-opacity="0.22" />
    <stop offset="0.5" stop-color="#ffffff" stop-opacity="0" />
    <stop offset="1" stop-color="#000000" stop-opacity="0.32" />
  </linearGradient>
  <radialGradient id="{id}-lamp">
    <stop offset="0" stop-color="#ffe9a8" stop-opacity="0.9" />
    <stop offset="1" stop-color="#ffe9a8" stop-opacity="0" />
  </radialGradient>
  <radialGradient id="{id}-fire">
    <stop offset="0" stop-color="#ffc766" stop-opacity="1" />
    <stop offset="0.6" stop-color="#ff7a1a" stop-opacity="0.7" />
    <stop offset="1" stop-color="#ff5a00" stop-opacity="0" />
  </radialGradient>
</defs>

<!-- Rauch aus dem Kamin, nach hinten und oben -->
<g class="smoke" class:rolling fill={dark ? '#c4ccd4' : '#eef1f3'}>
  {#each [0, 1, 2, 3, 4] as i (i)}
    <circle class="puff" style="animation-delay: {i * 0.5}s" cx="36" cy="2" r="6" />
  {/each}
</g>

<ellipse cx="110" cy="99" rx="104" ry="2.8" fill="#000000" opacity="0.28" />

<!-- Rahmen, Pufferbohlen, Umlauf -->
<rect x="0" y="68" width="8" height="16" rx="1" fill="#b23a2e" />
<rect x="212" y="68" width="8" height="16" rx="1" fill="#b23a2e" />
<rect x="0" y="72" width="4" height="6" rx="1" fill="#2a2e33" />
<rect x="216" y="72" width="4" height="6" rx="1" fill="#2a2e33" />
<path d="M6 84 q-5 0 -5 4 q0 3 3 3" fill="none" stroke="#2a2e33" stroke-width="1.6" />
<rect x="8" y="74" width="206" height="12" fill="var(--lok-frame)" />
<rect x="8" y="74" width="206" height="1.2" fill="#ffffff" opacity="0.2" />
<rect x="8" y="84" width="206" height="2" fill="#000000" opacity="0.35" />
<rect x="8" y="86" width="12" height="2" fill="#23272b" />
<rect x="6" y="92" width="12" height="2" fill="#23272b" />

<!-- Gleitbahn -->
<rect x="30" y="78.6" width="40" height="1.6" fill="#8d949b" />
<rect x="30" y="89.6" width="40" height="1.6" fill="#8d949b" />

<!-- Treibräder -->
{#each DRIVERS as x (x)}
  <Wheel cx={x} cy={G.cy} r={G.radius} {unit} rim="var(--lok-wheel)" spokes={12} pin weight />
{/each}

<!-- Kuppelstange -->
<g bind:this={coupling} class="stange">
  <rect x="62" y="83.2" width="104" height="3.6" rx="1.2" fill="#a2a8ae" />
  <rect x="62" y="83.2" width="104" height="1" fill="#ffffff" opacity="0.35" />
  {#each DRIVERS as x (x)}
    <circle cx={x + G.crank} cy={G.cy} r="3.4" fill="#8c9298" />
    <circle cx={x + G.crank} cy={G.cy} r="1.3" fill="#2a2e33" />
  {/each}
</g>

<!-- Treibstange -->
<g bind:this={main} class="stange" style="transform-origin: {REST}px {G.cy}px">
  <rect x={REST} y="83" width={G.rod} height="4" rx="1.4" fill="#b3b9bf" />
  <rect x={REST} y="83" width={G.rod} height="1.2" fill="#ffffff" opacity="0.4" />
  <circle cx={REST + G.rod} cy={G.cy} r="3.8" fill="#8c9298" />
  <circle cx={REST + G.rod} cy={G.cy} r="1.4" fill="#2a2e33" />
</g>

<!-- Kreuzkopf und Kolbenstange -->
<g bind:this={crosshead} class="stange">
  <rect x="12" y="84" width={REST - 6 - 12} height="2.2" fill="#b3b9bf" />
  <rect x={REST - 6} y="80" width="12" height="10" rx="1.5" fill="#3a4047" />
  <rect x={REST - 6} y="80" width="12" height="2" fill="#ffffff" opacity="0.22" />
  <circle cx={REST} cy={G.cy} r="1.8" fill="#c9ced3" />
</g>

<!-- Zylinder -->
<rect x="4" y="76" width="24" height="18" rx="2" fill="#2b3036" />
<rect x="4" y="76" width="24" height="18" rx="2" fill="url(#{id}-cyl)" />
<rect x="4" y="76" width="4" height="18" rx="1" fill="#1a1d21" />
<rect x="24" y="76" width="4" height="18" rx="1" fill="#1a1d21" />
<rect x="8" y="79" width="16" height="2" fill="#ffffff" opacity="0.14" />

<!-- Umlauf über den Rädern -->
<rect x="6" y="68" width="208" height="4" fill="#23272b" />
<rect x="6" y="68" width="208" height="1" fill="#ffffff" opacity="0.22" />

<!-- Rauchkammer und Kamin -->
<rect x="16" y="26" width="40" height="44" rx="3" fill="var(--lok-boiler)" />
<rect x="16" y="26" width="40" height="44" rx="3" fill="url(#{id}-cyl)" />
<rect x="14" y="24" width="5" height="48" rx="2" fill="#2a2e33" />
<rect x="14" y="24" width="5" height="48" rx="2" fill="url(#{id}-cyl)" />
<circle cx="16.5" cy="48" r="1.4" fill="#c9ced3" />
<path d="M29 26 L31 6 L41 6 L43 26 Z" fill="#1a1d21" />
<path d="M31 6 L33 26 L36 26 L35 6 Z" fill="#ffffff" opacity="0.1" />
<rect x="26" y="1" width="20" height="6" rx="2" fill="#23272b" />
<rect x="27" y="7" width="18" height="1.6" fill="var(--lok-brass)" />

<!-- Stirnlampe -->
<circle cx="15" cy="19" r="16" fill="url(#{id}-lamp)" opacity={dark ? 0.6 : 0} class="lampglow" />
<rect x="22" y="13" width="12" height="11" rx="2" fill="var(--lok-brass)" />
<rect x="22" y="13" width="12" height="11" rx="2" fill="url(#{id}-box)" />
<rect x="20" y="15" width="3" height="7" rx="1" fill="#fff6d6" />

<!-- Kessel mit Ringen, Dampfdom und Sicherheitsventil -->
<rect x="54" y="28" width="104" height="42" fill="var(--lok-boiler)" />
<rect x="54" y="28" width="104" height="42" fill="url(#{id}-cyl)" />
<rect x="84" y="28" width="3" height="42" fill="var(--lok-brass)" opacity="0.9" />
<rect x="122" y="28" width="3" height="42" fill="var(--lok-brass)" opacity="0.9" />
<path d="M86 28 Q86 12 100 12 Q114 12 114 28 Z" fill="var(--lok-boiler)" />
<path d="M86 28 Q86 12 100 12 Q114 12 114 28 Z" fill="url(#{id}-cyl)" />
<path d="M90 17 Q100 10 110 17" fill="none" stroke="var(--lok-brass)" stroke-width="1.6" />
<rect x="126" y="18" width="6" height="10" fill="var(--lok-brass)" />
<rect x="124" y="16" width="10" height="3" rx="1" fill="var(--lok-brass)" />
<rect x="124" y="16" width="10" height="3" rx="1" fill="url(#{id}-box)" />

<!-- Seitentank mit Zierlinie und Einfüllstutzen -->
<rect x="58" y="42" width="92" height="28" fill="var(--lok-body)" />
<rect x="58" y="42" width="92" height="28" fill="url(#{id}-box)" />
<rect x="58" y="42" width="92" height="1.2" fill="#ffffff" opacity="0.3" />
<rect x="63" y="47" width="82" height="18" fill="none" stroke="var(--lok-brass)" stroke-width="1" opacity="0.75" />
<rect x="128" y="38" width="12" height="5" rx="1.5" fill="#2a2e33" />

<!-- Führerhaus -->
<rect x="150" y="12" width="56" height="58" fill="var(--lok-body)" />
<rect x="150" y="12" width="56" height="58" fill="url(#{id}-box)" />
<rect x="154" y="63" width="48" height="1.5" fill="var(--lok-brass)" opacity="0.7" />
<rect x="160" y="20" width="22" height="24" rx="2" fill="var(--lok-glass)" />
<path d="M162 42 L178 22 L182 22 L166 42 Z" fill="#ffffff" opacity="0.32" />
<rect x="160" y="20" width="22" height="24" rx="2" fill="none" stroke="var(--lok-brass)" stroke-width="1.2" />
<rect x="188" y="20" width="16" height="48" fill="#15181b" />
<rect x="188" y="46" width="16" height="22" fill="url(#{id}-fire)" opacity="0.75" class="feuer" />
<rect x="185.5" y="22" width="1.6" height="40" fill="var(--lok-brass)" />
<rect x="162" y="50" width="16" height="9" rx="1" fill="var(--lok-brass)" />
<rect x="163" y="51" width="14" height="7" rx="0.8" fill="none" stroke="#000000" stroke-opacity="0.35" stroke-width="0.8" />
<!-- Dach -->
<rect x="146" y="7" width="64" height="6" rx="2" fill="#23272b" />
<rect x="146" y="7" width="64" height="1.2" rx="0.6" fill="#ffffff" opacity="0.25" />
<!-- Kohlenkasten -->
<rect x="204" y="30" width="10" height="40" fill="var(--lok-body)" />
<rect x="204" y="30" width="10" height="40" fill="url(#{id}-box)" />
<path d="M204 32 q2 -5 5 -2 q2 -4 5 0 L214 34 L204 34 Z" fill="#101214" />

<style>
  .stange {
    will-change: transform;
  }

  @media (prefers-reduced-motion: no-preference) {
    .puff {
      transform-origin: 36px 2px;
      animation: wisp 4.5s ease-out infinite;
      opacity: 0;
    }

    .rolling .puff {
      animation: puff 2.6s ease-out infinite;
    }

    .feuer {
      animation: flicker 0.9s ease-in-out infinite alternate;
    }
  }

  @keyframes puff {
    0% {
      transform: translate(0, 0) scale(0.5);
      opacity: 0.75;
    }

    100% {
      transform: translate(70px, -50px) scale(2.6);
      opacity: 0;
    }
  }

  @keyframes wisp {
    0% {
      transform: translate(0, 0) scale(0.4);
      opacity: 0.35;
    }

    100% {
      transform: translate(18px, -34px) scale(1.5);
      opacity: 0;
    }
  }

  @keyframes flicker {
    from {
      opacity: 0.55;
    }

    to {
      opacity: 0.9;
    }
  }
</style>
