<script lang="ts">
  let { value, tone = 'accent' }: { value: number; tone?: 'accent' | 'good' | 'warn' | 'mute' } = $props();
  const pct = $derived(Math.max(0, Math.min(1, value)) * 100);
</script>

<div class="bar"><b class={tone === 'accent' ? '' : tone} style="width: {pct}%"></b></div>
