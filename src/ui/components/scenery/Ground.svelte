<script lang="ts">
  /**
   * Die nahe Ebene: Schotterbett, Schwellen, Schiene und der Boden davor. Sie zieht
   * eins zu eins mit dem Zug. Die Schienenoberkante liegt bei y = 0, darauf stehen
   * die Räder.
   */
  import { mix, noise, type BiomeMood } from '../../stage/scenery';

  let { mood, left, width, unit, period }: { mood: BiomeMood; left: number; width: number; unit: number; period: number } = $props();

  const TOP = -14;
  const HEIGHT = 300;
  const ty = -TOP;
  const id = $props.id();
  const tile = $derived(period / unit);
  const SLEEPER = 20;
  const sleepers = $derived(Array.from({ length: Math.round(tile / SLEEPER) }, (_, i) => i * SLEEPER));
  const stones = $derived(
    Array.from({ length: 36 }, (_, i) => ({ x: noise(i * 7 + 1) * tile, y: ty - 1 + noise(i * 7 + 2) * 11, w: 1.6 + noise(i * 7 + 3) * 2, shade: noise(i * 7 + 4) })),
  );
  const tufts = $derived(Array.from({ length: 9 }, (_, i) => ({ x: noise(i * 13 + 5) * tile, y: ty + 15 + noise(i * 13 + 6) * 12, s: 0.7 + noise(i * 13 + 7) * 0.8 })));

  const edge = $derived(mix(mood.mid, mood.ground, 0.45));
  const gravel = $derived(mix(mood.ground, '#a9a69c', 0.55));
  const gravelDark = $derived(mix(gravel, '#000000', 0.28));
  const front = $derived(mix(mood.ground, '#000000', 0.1));
</script>

<svg
  class="ground"
  style="left:{left}px; top:{TOP * unit}px; width:{width}px; height:{HEIGHT * unit}px"
  viewBox="0 0 {width / unit} {HEIGHT}"
  preserveAspectRatio="none"
  aria-hidden="true"
>
  <defs>
    <pattern id="{id}-g" width={tile} height={HEIGHT} patternUnits="userSpaceOnUse">
      <rect x="0" y="0" width={tile} height={HEIGHT} fill={mood.ground} />
      <rect x="0" y="0" width={tile} height={ty - 4} fill={edge} />
      <!-- Vordergrund vor dem Gleis, einen Ton dunkler -->
      <rect x="0" y={ty + 12} width={tile} height={HEIGHT - ty - 12} fill={front} />
      <!-- Schotterbett -->
      <rect x="0" y={ty - 2} width={tile} height="14" fill={gravel} />
      <rect x="0" y={ty + 9} width={tile} height="3" fill={gravelDark} />
      {#each stones as s, i (i)}
        <rect x={s.x.toFixed(1)} y={s.y.toFixed(1)} width={s.w.toFixed(1)} height="1.4" fill={s.shade > 0.5 ? '#ffffff' : '#000000'} opacity="0.22" />
      {/each}
      <!-- Schwellen -->
      {#each sleepers as x (x)}
        <rect x={x + 4} y={ty + 2.5} width="12" height="6" fill="#4a3728" />
        <rect x={x + 4} y={ty + 2.5} width="12" height="1.2" fill="#ffffff" opacity="0.14" />
      {/each}
      <!-- Schiene -->
      <rect x="0" y={ty + 3} width={tile} height="1.2" fill="#000000" opacity="0.35" />
      <rect x="0" y={ty} width={tile} height="3.2" fill="#5b6067" />
      <rect x="0" y={ty} width={tile} height="1" fill="#c3c8cd" />
      <!-- Grasbüschel davor -->
      {#each tufts as t, i (i)}
        <path
          transform="translate({t.x.toFixed(1)} {t.y.toFixed(1)}) scale({t.s.toFixed(2)})"
          d="M-4 0 L-2 -6 L-1 0 L0 -8 L1 0 L3 -6 L4 0 Z"
          fill={mood.flora}
          opacity="0.5"
        />
      {/each}
    </pattern>
  </defs>
  <rect width="100%" height="100%" fill="url(#{id}-g)" />
</svg>

<style>
  .ground {
    position: absolute;
    display: block;
    overflow: visible;
  }
</style>
