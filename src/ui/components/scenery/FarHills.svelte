<script lang="ts">
  /**
   * Ferne Hügel, Gipfel oder Dünen, je nach Biom. Zwei Kämme hintereinander, der
   * hintere blasser: So bekommt der Horizont Tiefe. Alles in Zeichnungseinheiten,
   * die Schiene liegt bei y = 0.
   */
  import { mix, peaksPath, ridgePath, type BiomeMood } from '../../stage/scenery';

  let { mood, left, width, unit, period }: { mood: BiomeMood; left: number; width: number; unit: number; period: number } = $props();

  const TOP = -190;
  const HEIGHT = 470;
  /** Schienenhöhe in den Koordinaten dieser Ebene */
  const ty = -TOP;
  /** Der Fuss der Hügel liegt hinter der mittleren Ebene */
  const base = ty - 30;
  const id = $props.id();
  const tile = $derived(period / unit);
  const kind = $derived(mood.floraKind === 'fels' ? 'gipfel' : mood.floraKind === 'kaktus' ? 'duenen' : 'huegel');
  const backColor = $derived(mix(mood.far, mood.skyBottom, 0.5));
  const back = $derived(
    kind === 'gipfel' ? peaksPath(tile, base, 140, HEIGHT, 5, 6) : { ridge: ridgePath(tile, base, kind === 'duenen' ? 46 : 105, HEIGHT, 11), caps: '' },
  );
  const front = $derived(
    kind === 'gipfel' ? peaksPath(tile, base, 95, HEIGHT, 9, 5) : { ridge: ridgePath(tile, base, kind === 'duenen' ? 30 : 70, HEIGHT, 23), caps: '' },
  );
</script>

<svg
  class="hills"
  style="left:{left}px; top:{TOP * unit}px; width:{width}px; height:{HEIGHT * unit}px"
  viewBox="0 0 {width / unit} {HEIGHT}"
  preserveAspectRatio="none"
  aria-hidden="true"
>
  <defs>
    <pattern id="{id}-h" width={tile} height={HEIGHT} patternUnits="userSpaceOnUse">
      <path d={back.ridge} fill={backColor} />
      {#if back.caps}<path d={back.caps} fill="#f4f7fa" opacity="0.7" />{/if}
      <path d={front.ridge} fill={mood.far} />
      {#if front.caps}<path d={front.caps} fill="#f4f7fa" opacity="0.85" />{/if}
    </pattern>
    <linearGradient id="{id}-haze" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color={mood.skyBottom} stop-opacity="0" />
      <stop offset="1" stop-color={mood.skyBottom} stop-opacity="0.45" />
    </linearGradient>
  </defs>
  <rect width="100%" height="100%" fill="url(#{id}-h)" />
  <!-- Dunst über dem Horizont, damit die Ferne zurücktritt -->
  <rect x="0" y={base - 70} width="100%" height="70" fill="url(#{id}-haze)" />
  <rect x="0" y={base} width="100%" height={HEIGHT - base} fill={mood.skyBottom} opacity="0.3" />
</svg>

<style>
  .hills {
    position: absolute;
    display: block;
    overflow: visible;
  }

  .hills path,
  .hills rect {
    transition: fill 1.2s ease;
  }
</style>
