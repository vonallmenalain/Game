<script lang="ts">
  /**
   * Ein Fahrzeug des Zuges, gezeichnet nach echten Vorbildern, Fahrtrichtung links.
   * Auf der Bühne kommt `unit` als Bildpunkte je Einheit; ohne `unit` füllt die
   * Zeichnung ihren Rahmen, so steht sie klein in Karten und Listen.
   */
  import { VEHICLE_SPEC, type VehicleKind } from '../stage/camera';
  import Buero from './vehicles/Buero.svelte';
  import Chemie from './vehicles/Chemie.svelte';
  import Dampflok from './vehicles/Dampflok.svelte';
  import Ernte from './vehicles/Ernte.svelte';
  import Lager from './vehicles/Lager.svelte';
  import Platz from './vehicles/Platz.svelte';
  import Schmelz from './vehicles/Schmelz.svelte';
  import SchwereDampflok from './vehicles/SchwereDampflok.svelte';
  import Walz from './vehicles/Walz.svelte';
  import Werk from './vehicles/Werk.svelte';

  let {
    kind,
    unit = 0,
    rolling = false,
    active = false,
    level = 1,
    tone = 'mute',
    dark = false,
  }: {
    kind: VehicleKind;
    unit?: number;
    rolling?: boolean;
    active?: boolean;
    level?: number;
    tone?: 'good' | 'warn' | 'mute';
    dark?: boolean;
  } = $props();

  const spec = $derived(VEHICLE_SPEC[kind]);
</script>

<svg
  class="fahrzeug"
  viewBox="0 {100 - spec.h} {spec.w} {spec.h}"
  style={unit > 0 ? `width:${spec.w * unit}px;height:${spec.h * unit}px` : 'width:100%;height:100%'}
  preserveAspectRatio="xMidYMax meet"
  role="presentation"
>
  {#if kind === 'dampflok'}
    <Dampflok {unit} {rolling} {dark} />
  {:else if kind === 'schwere_dampflok'}
    <SchwereDampflok {unit} {rolling} {dark} />
  {:else if kind === 'ernte'}
    <Ernte {unit} {active} {level} {tone} {dark} />
  {:else if kind === 'schmelz'}
    <Schmelz {unit} {active} {level} {tone} {dark} />
  {:else if kind === 'walz'}
    <Walz {unit} {active} {level} {tone} {dark} />
  {:else if kind === 'werk'}
    <Werk {unit} {active} {level} {tone} {dark} />
  {:else if kind === 'buero'}
    <Buero {unit} {active} {level} {tone} {dark} />
  {:else if kind === 'lager'}
    <Lager {unit} {active} {level} {tone} {dark} />
  {:else if kind === 'chemie'}
    <Chemie {unit} {active} {level} {tone} {dark} />
  {:else}
    <Platz w={spec.w} h={spec.h} />
  {/if}
</svg>

<style>
  .fahrzeug {
    display: block;
    overflow: visible;
  }
</style>
