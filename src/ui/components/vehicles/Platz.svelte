<script lang="ts">
  /** Platzhalter am Ende des Zuges: Hier passt noch ein Wagen hin. */
  let { w, h }: { w: number; h: number } = $props();
  const top = $derived(100 - h);
</script>

<g class="platz" fill="none" stroke="currentColor" stroke-linecap="round">
  <rect x="6" y={top + 14} width={w - 12} height={h - 40} rx="7" stroke-width="2.2" stroke-dasharray="7 6" opacity="0.6" />
  <circle cx="30" cy="89" r="9" stroke-width="2" stroke-dasharray="4 4" opacity="0.5" />
  <circle cx={w - 30} cy="89" r="9" stroke-width="2" stroke-dasharray="4 4" opacity="0.5" />
  <path d="M{w / 2} {top + 26} v22 M{w / 2 - 11} {top + 37} h22" stroke-width="3.2" opacity="0.75" />
</g>
