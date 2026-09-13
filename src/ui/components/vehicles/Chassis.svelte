<script lang="ts">
  /**
   * Fahrgestell eines Wagens: Rahmen, Puffer, Kupplungshaken, Achslager und Räder.
   * Alle Wagen teilen es, darum sehen sie als Zug zusammengehörig aus.
   */
  import Wheel from './Wheel.svelte';

  let {
    w,
    axles,
    r = 11,
    unit = 0,
    frame = '#363b41',
    rim = '#4a5058',
    top = 72,
  }: { w: number; axles: number[]; r?: number; unit?: number; frame?: string; rim?: string; top?: number } = $props();

  const cy = $derived(100 - r);
</script>

<g class="chassis">
  <!-- Schatten auf dem Boden -->
  <ellipse cx={w / 2} cy="99" rx={w / 2 - 6} ry="2.6" fill="#000000" opacity="0.28" />
  <!-- Puffer und Haken -->
  <rect x="0" y={top - 2} width="7" height="6" rx="1.5" fill="#2a2e33" />
  <rect x={w - 7} y={top - 2} width="7" height="6" rx="1.5" fill="#2a2e33" />
  <rect x="1" y={top - 1} width="2" height="4" fill="#9aa0a6" />
  <rect x={w - 3} y={top - 1} width="2" height="4" fill="#9aa0a6" />
  <path d="M6 {top + 6} q-5 0 -5 4 q0 3 3 3" fill="none" stroke="#2a2e33" stroke-width="1.6" />
  <path d="M{w - 6} {top + 6} q5 0 5 4 q0 3 -3 3" fill="none" stroke="#2a2e33" stroke-width="1.6" />
  <!-- Rahmen -->
  <rect x="6" y={top} width={w - 12} height="7" fill={frame} />
  <rect x="6" y={top} width={w - 12} height="1.2" fill="#ffffff" opacity="0.18" />
  <rect x="6" y={top + 5.8} width={w - 12} height="1.2" fill="#000000" opacity="0.35" />
  <!-- Achslager und Federn -->
  {#each axles as x (x)}
    <rect x={x - 9} y={top + 6} width="18" height="3" rx="1" fill="#2c3035" />
    <rect x={x - 4} y={top + 7} width="8" height="6" rx="1.5" fill="#3a3f46" />
  {/each}
  {#each axles as x (x)}
    <Wheel cx={x} {cy} {r} {unit} {rim} spokes={8} />
  {/each}
</g>
