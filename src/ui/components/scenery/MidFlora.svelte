<script lang="ts">
  /**
   * Die mittlere Ebene: ein Band Land hinter dem Gleis mit Bäumen, Büschen, Felsen
   * oder Kakteen, deterministisch je Kachel gestreut. Zwei Reihen: eine kleine,
   * blasse weiter hinten, eine grosse vorne. Die Schiene liegt bei y = 0.
   */
  import { mix, plantsFor, type BiomeMood, type Plant } from '../../stage/scenery';

  let { mood, left, width, unit, period, tiles }: { mood: BiomeMood; left: number; width: number; unit: number; period: number; tiles: number } = $props();

  const TOP = -140;
  const HEIGHT = 420;
  const ty = -TOP;
  /** Oberkante des Bandes hinter dem Gleis */
  const band = ty - 34;
  const id = $props.id();
  const tile = $derived(period / unit / tiles);

  interface Placed extends Plant {
    y: number;
    hazy: boolean;
  }

  const plants = $derived.by(() => {
    const out: Placed[] = [];
    for (let t = 0; t < tiles; t += 1) {
      for (const p of plantsFor(t + 50, tile, mood.density)) out.push({ ...p, x: p.x + t * tile, scale: p.scale * 0.42, y: band + 1 + p.shade * 3, hazy: true });
      for (const p of plantsFor(t, tile, mood.density)) out.push({ ...p, x: p.x + t * tile, scale: p.scale * 0.95, y: band + 3 + p.shade * 20, hazy: false });
    }
    return out.sort((a, b) => a.y - b.y);
  });

  const shade = $derived(mix(mood.flora, '#000000', 0.3));
  const hazyColor = $derived(mix(mood.flora, mood.far, 0.5));
  const bandColor = $derived(mood.mid);
  const bandBack = $derived(mix(mood.mid, mood.far, 0.35));
</script>

<svg
  class="flora"
  style="left:{left}px; top:{TOP * unit}px; width:{width}px; height:{HEIGHT * unit}px"
  viewBox="0 0 {width / unit} {HEIGHT}"
  preserveAspectRatio="none"
  aria-hidden="true"
>
  <defs>
    <linearGradient id="{id}-band" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color={bandBack} />
      <stop offset="1" stop-color={bandColor} />
    </linearGradient>
    <pattern id="{id}-p" width={period / unit} height={HEIGHT} patternUnits="userSpaceOnUse">
      <rect x="0" y={band} width={period / unit} height={HEIGHT - band} fill="url(#{id}-band)" />
      {#each plants as p, i (i)}
        {@const fill = p.hazy ? hazyColor : mood.flora}
        {@const dark = p.hazy ? mix(hazyColor, '#000000', 0.15) : shade}
        <g transform="translate({p.x.toFixed(1)} {p.y.toFixed(1)}) scale({p.scale.toFixed(3)})">
          {#if mood.floraKind === 'baum'}
            <rect x="-2.5" y="-16" width="5" height="17" fill="#5a3d28" />
            <path d="M0 -36 L-22 -8 L22 -8 Z M0 -50 L-18 -20 L18 -20 Z M0 -64 L-14 -36 L14 -36 Z" fill={fill} />
            <path d="M0 -36 L22 -8 L0 -8 Z M0 -50 L18 -20 L0 -20 Z M0 -64 L14 -36 L0 -36 Z" fill={dark} />
          {:else if mood.floraKind === 'busch'}
            <path d="M-16 0 Q-19 -14 -8 -16 Q-4 -27 6 -22 Q17 -25 19 -10 Q21 0 14 0 Z" fill={fill} />
            <path d="M4 -23 Q17 -25 19 -10 Q21 0 14 0 L3 0 Z" fill={dark} />
            <path d="M-13 -4 Q-14 -13 -6 -14" stroke="#ffffff" stroke-opacity="0.22" stroke-width="1.6" fill="none" stroke-linecap="round" />
          {:else if mood.floraKind === 'fels'}
            <path d="M-18 0 L-12 -20 L-2 -30 L12 -24 L20 -8 L18 0 Z" fill={fill} />
            <path d="M-12 -20 L-2 -30 L12 -24 L0 -17 Z" fill="#ffffff" opacity="0.22" />
            <path d="M12 -24 L20 -8 L18 0 L2 0 L0 -17 Z" fill={dark} />
          {:else}
            <rect x="-5" y="-52" width="10" height="53" rx="5" fill={fill} />
            <rect x="-16" y="-31" width="7" height="20" rx="3.5" fill={fill} />
            <rect x="-14" y="-18" width="10" height="7" rx="3" fill={fill} />
            <rect x="9" y="-41" width="7" height="20" rx="3.5" fill={fill} />
            <rect x="4" y="-27" width="10" height="7" rx="3" fill={fill} />
            <rect x="1" y="-50" width="4" height="50" rx="2" fill={dark} />
          {/if}
        </g>
      {/each}
    </pattern>
  </defs>
  <rect width="100%" height="100%" fill="url(#{id}-p)" />
</svg>

<style>
  .flora {
    position: absolute;
    display: block;
    overflow: visible;
  }
</style>
