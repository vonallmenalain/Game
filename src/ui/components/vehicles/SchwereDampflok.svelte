<script lang="ts">
  /**
   * Die schwere Dampflok: vier Treibachsen mit Vorlaufrad, hoher Kessel mit zwei
   * Domen, Führerhaus und ein eigener Tender, nach dem Vorbild der schweren
   * Schweizer Güterzugloks. Fahrtrichtung links.
   */
  import { getContext } from 'svelte';
  import type { Motion } from '../../stage/motion';
  import { attachRods, crossheadRest, type RodGeometry } from '../../stage/rods';
  import Wheel from './Wheel.svelte';

  let { unit = 0, rolling = false, dark = false }: { unit?: number; rolling?: boolean; dark?: boolean } = $props();

  const id = $props.id();
  const motion = getContext<Motion | undefined>('motion');
  const DRIVERS = [74, 112, 150, 188];
  const G: RodGeometry = { radius: 15, crank: 6, driver: 150, cy: 85, rod: 90 };
  const REST = crossheadRest(G);
  const TENDER_WHEELS = [244, 262, 282, 300];

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

<g class="smoke" class:rolling fill={dark ? '#c4ccd4' : '#eef1f3'}>
  {#each [0, 1, 2, 3, 4, 5] as i (i)}
    <circle class="puff" style="animation-delay: {i * 0.42}s" cx="41" cy="-3" r="7" />
  {/each}
</g>

<ellipse cx="156" cy="99" rx="152" ry="2.8" fill="#000000" opacity="0.28" />

<!-- Lok: Rahmen und Pufferbohle -->
<rect x="0" y="68" width="8" height="16" rx="1" fill="#b23a2e" />
<rect x="0" y="72" width="4" height="6" rx="1" fill="#2a2e33" />
<path d="M6 84 q-5 0 -5 4 q0 3 3 3" fill="none" stroke="#2a2e33" stroke-width="1.6" />
<rect x="8" y="74" width="214" height="12" fill="var(--lok-frame)" />
<rect x="8" y="74" width="214" height="1.2" fill="#ffffff" opacity="0.2" />
<rect x="8" y="84" width="214" height="2" fill="#000000" opacity="0.35" />
<rect x="6" y="92" width="14" height="2" fill="#23272b" />

<!-- Vorlaufrad -->
<Wheel cx={14} cy={91} r={9} {unit} rim="var(--lok-wheel)" spokes={10} />

<!-- Gleitbahn -->
<rect x="50" y="78.6" width="36" height="1.6" fill="#8d949b" />
<rect x="50" y="89.6" width="36" height="1.6" fill="#8d949b" />

{#each DRIVERS as x (x)}
  <Wheel cx={x} cy={G.cy} r={G.radius} {unit} rim="var(--lok-wheel)" spokes={14} pin weight />
{/each}

<g bind:this={coupling} class="stange">
  <rect x="76" y="83.2" width="122" height="3.6" rx="1.2" fill="#a2a8ae" />
  <rect x="76" y="83.2" width="122" height="1" fill="#ffffff" opacity="0.35" />
  {#each DRIVERS as x (x)}
    <circle cx={x + G.crank} cy={G.cy} r="3.4" fill="#8c9298" />
    <circle cx={x + G.crank} cy={G.cy} r="1.3" fill="#2a2e33" />
  {/each}
</g>

<g bind:this={main} class="stange" style="transform-origin: {REST}px {G.cy}px">
  <rect x={REST} y="83" width={G.rod} height="4" rx="1.4" fill="#b3b9bf" />
  <rect x={REST} y="83" width={G.rod} height="1.2" fill="#ffffff" opacity="0.4" />
  <circle cx={REST + G.rod} cy={G.cy} r="3.8" fill="#8c9298" />
  <circle cx={REST + G.rod} cy={G.cy} r="1.4" fill="#2a2e33" />
</g>

<g bind:this={crosshead} class="stange">
  <rect x="32" y="84" width={REST - 6 - 32} height="2.2" fill="#b3b9bf" />
  <rect x={REST - 6} y="80" width="12" height="10" rx="1.5" fill="#3a4047" />
  <rect x={REST - 6} y="80" width="12" height="2" fill="#ffffff" opacity="0.22" />
  <circle cx={REST} cy={G.cy} r="1.8" fill="#c9ced3" />
</g>

<!-- Zylinder -->
<rect x="24" y="74" width="26" height="20" rx="2" fill="#2b3036" />
<rect x="24" y="74" width="26" height="20" rx="2" fill="url(#{id}-cyl)" />
<rect x="24" y="74" width="4" height="20" rx="1" fill="#1a1d21" />
<rect x="46" y="74" width="4" height="20" rx="1" fill="#1a1d21" />

<!-- Umlauf -->
<rect x="20" y="64" width="156" height="4" fill="#23272b" />
<rect x="20" y="64" width="156" height="1" fill="#ffffff" opacity="0.22" />

<!-- Rauchkammer, Kamin, Lampe -->
<rect x="22" y="20" width="42" height="50" rx="3" fill="var(--lok-boiler)" />
<rect x="22" y="20" width="42" height="50" rx="3" fill="url(#{id}-cyl)" />
<rect x="20" y="18" width="5" height="54" rx="2" fill="#2a2e33" />
<rect x="20" y="18" width="5" height="54" rx="2" fill="url(#{id}-cyl)" />
<circle cx="22.5" cy="45" r="1.5" fill="#c9ced3" />
<path d="M34 20 L36 0 L48 0 L50 20 Z" fill="#1a1d21" />
<path d="M36 0 L38 20 L41 20 L40 0 Z" fill="#ffffff" opacity="0.1" />
<rect x="31" y="-4" width="22" height="6" rx="2" fill="#23272b" />
<rect x="32" y="2" width="20" height="1.6" fill="var(--lok-brass)" />
<circle cx="20" cy="12" r="16" fill="url(#{id}-lamp)" opacity={dark ? 0.6 : 0} />
<rect x="27" y="6" width="12" height="11" rx="2" fill="var(--lok-brass)" />
<rect x="27" y="6" width="12" height="11" rx="2" fill="url(#{id}-box)" />
<rect x="25" y="8" width="3" height="7" rx="1" fill="#fff6d6" />

<!-- Kessel -->
<rect x="62" y="22" width="114" height="48" fill="var(--lok-boiler)" />
<rect x="62" y="22" width="114" height="48" fill="url(#{id}-cyl)" />
<rect x="96" y="22" width="3" height="48" fill="var(--lok-brass)" opacity="0.9" />
<rect x="132" y="22" width="3" height="48" fill="var(--lok-brass)" opacity="0.9" />
<rect x="166" y="22" width="3" height="48" fill="var(--lok-brass)" opacity="0.9" />
<path d="M100 22 Q100 8 113 8 Q126 8 126 22 Z" fill="var(--lok-boiler)" />
<path d="M100 22 Q100 8 113 8 Q126 8 126 22 Z" fill="url(#{id}-cyl)" />
<path d="M104 12 Q113 6 122 12" fill="none" stroke="var(--lok-brass)" stroke-width="1.6" />
<path d="M140 22 Q140 12 149 12 Q158 12 158 22 Z" fill="var(--lok-boiler)" />
<path d="M140 22 Q140 12 149 12 Q158 12 158 22 Z" fill="url(#{id}-cyl)" />
<rect x="162" y="12" width="5" height="10" fill="var(--lok-brass)" />
<rect x="169" y="14" width="4" height="8" fill="var(--lok-brass)" />
<!-- Zierlinie am Kessel -->
<rect x="64" y="60" width="110" height="1.2" fill="var(--lok-brass)" opacity="0.5" />

<!-- Führerhaus -->
<rect x="176" y="10" width="46" height="60" fill="var(--lok-body)" />
<rect x="176" y="10" width="46" height="60" fill="url(#{id}-box)" />
<rect x="180" y="63" width="38" height="1.5" fill="var(--lok-brass)" opacity="0.7" />
<rect x="184" y="18" width="20" height="22" rx="2" fill="var(--lok-glass)" />
<path d="M186 38 L200 20 L204 20 L190 38 Z" fill="#ffffff" opacity="0.32" />
<rect x="184" y="18" width="20" height="22" rx="2" fill="none" stroke="var(--lok-brass)" stroke-width="1.2" />
<rect x="208" y="18" width="12" height="50" fill="#15181b" />
<rect x="208" y="46" width="12" height="22" fill="url(#{id}-fire)" opacity="0.75" class="feuer" />
<rect x="205.5" y="20" width="1.6" height="40" fill="var(--lok-brass)" />
<rect x="186" y="46" width="16" height="9" rx="1" fill="var(--lok-brass)" />
<rect x="187" y="47" width="14" height="7" rx="0.8" fill="none" stroke="#000000" stroke-opacity="0.35" stroke-width="0.8" />
<rect x="172" y="5" width="54" height="6" rx="2" fill="#23272b" />
<rect x="172" y="5" width="54" height="1.2" rx="0.6" fill="#ffffff" opacity="0.25" />

<!-- Kupplung zum Tender -->
<rect x="218" y="78" width="14" height="4" fill="#2a2e33" />

<!-- Tender -->
<rect x="230" y="72" width="80" height="8" fill="var(--lok-frame)" />
<rect x="230" y="78" width="80" height="2" fill="#000000" opacity="0.35" />
<rect x="304" y="68" width="8" height="16" rx="1" fill="#b23a2e" />
<rect x="308" y="72" width="4" height="6" rx="1" fill="#2a2e33" />
<path d="M306 84 q5 0 5 4 q0 3 -3 3" fill="none" stroke="#2a2e33" stroke-width="1.6" />
<rect x="236" y="84" width="34" height="4" rx="1" fill="#2a2e33" />
<rect x="274" y="84" width="34" height="4" rx="1" fill="#2a2e33" />
{#each TENDER_WHEELS as x (x)}
  <Wheel cx={x} cy={91.5} r={8.5} {unit} rim="var(--lok-wheel)" spokes={10} />
{/each}
<rect x="232" y="30" width="78" height="42" fill="var(--lok-body)" />
<rect x="232" y="30" width="78" height="42" fill="url(#{id}-box)" />
<rect x="232" y="30" width="78" height="1.2" fill="#ffffff" opacity="0.3" />
<rect x="237" y="35" width="68" height="30" fill="none" stroke="var(--lok-brass)" stroke-width="1" opacity="0.7" />
<path d="M236 31 q6 -8 12 -3 q5 -7 11 -2 q6 -6 11 -1 q6 -6 12 -2 q6 -4 10 0 L302 32 Z" fill="#101214" />
<rect x="292" y="24" width="12" height="7" rx="2" fill="#2a2e33" />
<rect x="292" y="24" width="12" height="7" rx="2" fill="url(#{id}-box)" />

<style>
  .stange {
    will-change: transform;
  }

  @media (prefers-reduced-motion: no-preference) {
    .puff {
      transform-origin: 41px -3px;
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
      transform: translate(80px, -56px) scale(2.8);
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
