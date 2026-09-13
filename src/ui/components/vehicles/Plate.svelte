<script lang="ts">
  /** Messingschild mit der Stufe des Wagens. */
  let { x, y, level }: { x: number; y: number; level: number } = $props();
</script>

<g class="plate">
  <rect {x} {y} width="15" height="9" rx="1.2" fill="var(--lok-brass)" />
  <rect x={x + 1} y={y + 1} width="13" height="7" rx="0.8" fill="none" stroke="#000000" stroke-opacity="0.35" stroke-width="0.8" />
  <text x={x + 7.5} y={y + 7} text-anchor="middle" font-family="var(--display)" font-weight="700" font-size="7.4" fill="#2a2416">{level}</text>
</g>
