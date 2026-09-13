<script lang="ts">
  /**
   * Ein Speichenrad. Dreht sich mit der gefahrenen Strecke, wenn eine Bewegungsuhr
   * im Kontext liegt; in Karten steht es still. Der Zug fährt nach links, das Rad
   * dreht gegen den Uhrzeiger.
   */
  import { getContext } from 'svelte';
  import { roll } from '../../stage/actions';
  import type { Motion } from '../../stage/motion';

  let {
    cx,
    cy,
    r,
    unit = 0,
    rim = '#3f454c',
    spokes = 8,
    pin = false,
    weight = false,
  }: { cx: number; cy: number; r: number; unit?: number; rim?: string; spokes?: number; pin?: boolean; weight?: boolean } = $props();

  const motion = getContext<Motion | undefined>('motion');
  const angles = $derived(Array.from({ length: spokes }, (_, i) => (360 / spokes) * i));
</script>

<g class="wheel" style="transform-origin: {cx}px {cy}px" use:roll={{ motion, radius: r * unit }}>
  <circle {cx} {cy} {r} fill="#1e2124" />
  <circle {cx} {cy} r={r * 0.86} fill={rim} />
  <circle {cx} {cy} r={r * 0.72} fill="#24282d" />
  {#if weight}
    <!-- Gegengewicht gegenüber dem Kurbelzapfen -->
    <path d="M{cx - r * 0.72} {cy} A{r * 0.72} {r * 0.72} 0 0 1 {cx} {cy - r * 0.72} L{cx} {cy + r * 0.72} A{r * 0.72} {r * 0.72} 0 0 1 {cx - r * 0.72} {cy} Z" fill={rim} opacity="0.9" />
  {/if}
  {#each angles as a (a)}
    <rect x={cx - r * 0.055} y={cy - r * 0.74} width={r * 0.11} height={r * 0.74} fill={rim} transform="rotate({a} {cx} {cy})" />
  {/each}
  <circle {cx} {cy} r={r * 0.24} fill={rim} />
  <circle {cx} {cy} r={r * 0.24} fill="#000000" opacity="0.25" />
  <circle {cx} {cy} r={r * 0.11} fill="#c9ced3" />
  <!-- Lichtkante auf dem Reifen -->
  <path d="M{cx - r * 0.93} {cy} A{r * 0.93} {r * 0.93} 0 0 1 {cx} {cy - r * 0.93}" fill="none" stroke="#ffffff" stroke-opacity="0.28" stroke-width={r * 0.08} />
  {#if pin}
    <circle cx={cx + r * 0.42} cy={cy} r={r * 0.15} fill="#aab0b6" />
    <circle cx={cx + r * 0.42} cy={cy} r={r * 0.07} fill="#2a2e33" />
  {/if}
</g>
