<script lang="ts">
  /**
   * Das Konstruktionsbüro: ein Personenwagen mit Oberlichtdach, einer Reihe
   * Fenster mit Vorhängen und Türen an beiden Enden. Abends brennt Licht.
   */
  import type { WagonProps } from './props';
  import Chassis from './Chassis.svelte';
  import Lamp from './Lamp.svelte';
  import Plate from './Plate.svelte';

  let { unit = 0, active = false, level = 1, tone = 'mute', dark = false }: WagonProps = $props();
  const id = $props.id();
  const lit = $derived(active || dark);
  const windows = [26, 54, 82, 110, 138];
</script>

<defs>
  <linearGradient id="{id}-box" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#ffffff" stop-opacity="0.26" />
    <stop offset="0.5" stop-color="#ffffff" stop-opacity="0" />
    <stop offset="1" stop-color="#000000" stop-opacity="0.3" />
  </linearGradient>
</defs>

<Chassis w={180} axles={[22, 42, 138, 158]} r={9.5} top={74} {unit} />
<rect x="12" y="80" width="40" height="3" rx="1" fill="#2a2e33" />
<rect x="128" y="80" width="40" height="3" rx="1" fill="#2a2e33" />

<!-- Kasten -->
<rect x="8" y="30" width="164" height="44" rx="3" fill="var(--w-buero)" />
<rect x="8" y="30" width="164" height="44" rx="3" fill="url(#{id}-box)" />
<rect x="12" y="66" width="156" height="1.6" fill="#ffffff" opacity="0.45" />
<rect x="12" y="33" width="156" height="1" fill="#ffffff" opacity="0.3" />
<rect x="8" y="74" width="164" height="2.4" fill="#23272b" />

<!-- Türen an den Enden -->
{#each [10, 158] as x (x)}
  <rect x={x} y="34" width="12" height="38" rx="1" fill="#000000" opacity="0.22" />
  <rect x={x + 2} y="38" width="8" height="12" rx="1" fill="var(--lok-glass)" />
  <rect x={x + 2} y="38" width="8" height="12" rx="1" fill="#ffd98a" opacity={lit ? 0.45 : 0} class="licht" />
  <rect x={x + 9} y="54" width="1.5" height="5" fill="#2a2e33" />
{/each}

<!-- Fensterreihe mit Vorhängen -->
{#each windows as x, i (x)}
  <rect x={x} y="38" width="20" height="22" rx="1.5" fill="var(--lok-glass)" />
  <rect x={x} y="38" width="20" height="22" rx="1.5" fill="#ffd98a" opacity={lit ? 0.55 : 0} class="licht" />
  <path d="M{x + 2} 58 L{x + 14} 40 L{x + 17} 40 L{x + 5} 58 Z" fill="#ffffff" opacity="0.28" />
  <rect x={x} y="38" width="20" height="5" fill="#f2e8d4" opacity="0.85" />
  {#if i === 2}
    <!-- Der Zeichentisch mit seiner Lampe -->
    <rect x={x + 5} y="50" width="10" height="2" fill="#6e5138" />
    <circle cx={x + 10} cy="47" r="1.6" fill={active ? '#fff1b8' : '#8a8f96'} class="licht" />
  {/if}
  <rect x={x} y="38" width="20" height="22" rx="1.5" fill="none" stroke="var(--lok-brass)" stroke-width="1" opacity="0.9" />
{/each}

<!-- Dach mit Oberlicht -->
<rect x="4" y="22" width="172" height="9" rx="4" fill="#3a3d42" />
<rect x="4" y="22" width="172" height="9" rx="4" fill="url(#{id}-box)" />
<rect x="30" y="15" width="120" height="8" rx="3" fill="#2f3236" />
{#each [40, 60, 80, 100, 120, 140] as x (x)}
  <rect x={x - 6} y="17" width="12" height="3.5" rx="1" fill="var(--lok-glass)" opacity="0.7" />
{/each}
<!-- Griffstangen -->
<rect x="24" y="36" width="1.4" height="34" fill="var(--lok-brass)" />
<rect x="156" y="36" width="1.4" height="34" fill="var(--lok-brass)" />

<Plate x={82} y={62} {level} />
<Lamp cx={170} cy={40} {tone} />

<style>
  .licht {
    transition:
      opacity 0.8s ease,
      fill 0.8s ease;
  }
</style>
