<script lang="ts">
  /** Statuslampe am Wagen: grün läuft, bernstein wartet oder blockiert, aus ohne Auftrag. */
  let { cx, cy, tone }: { cx: number; cy: number; tone: 'good' | 'warn' | 'mute' } = $props();
  const color = $derived(tone === 'good' ? '#4fd08a' : tone === 'warn' ? '#f2a83a' : '#4a4f56');
</script>

<g class="lamp tone-{tone}">
  <circle {cx} {cy} r="3.2" fill="#23272b" />
  {#if tone !== 'mute'}
    <circle class="glow" {cx} {cy} r="6" fill={color} opacity="0.28" />
  {/if}
  <circle class="light" {cx} {cy} r="2.1" fill={color} />
  <circle cx={cx - 0.6} cy={cy - 0.7} r="0.7" fill="#ffffff" opacity="0.7" />
</g>

<style>
  @media (prefers-reduced-motion: no-preference) {
    .tone-warn .light,
    .tone-warn .glow {
      animation: blink 1.6s ease-in-out infinite;
    }
  }

  @keyframes blink {
    0%,
    100% {
      opacity: 1;
    }

    50% {
      opacity: 0.35;
    }
  }

  .tone-warn .glow {
    opacity: 0.4;
  }
</style>
