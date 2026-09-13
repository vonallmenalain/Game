<script lang="ts">
  /**
   * Wolken ganz hinten: ziehen kaum mit und wachsen beim Heranfahren fast nicht.
   * Koordinaten in Zeichnungseinheiten, die Schiene liegt bei y = 0 in der Welt.
   */
  let { left, width, unit, period, dark }: { left: number; width: number; unit: number; period: number; dark: boolean } = $props();

  const TOP = -250;
  const HEIGHT = 190;
  const id = $props.id();
  const tile = $derived(period / unit);
  const clouds = [
    { x: 90, y: 40, s: 1 },
    { x: 520, y: 90, s: 0.7 },
    { x: 860, y: 30, s: 1.25 },
    { x: 1240, y: 110, s: 0.85 },
  ];
</script>

<svg
  class="clouds"
  style="left:{left}px; top:{TOP * unit}px; width:{width}px; height:{HEIGHT * unit}px"
  viewBox="0 0 {width / unit} {HEIGHT}"
  preserveAspectRatio="none"
  aria-hidden="true"
>
  <defs>
    <pattern id="{id}-c" width={tile} height={HEIGHT} patternUnits="userSpaceOnUse">
      {#each clouds as c, i (i)}
        <g transform="translate({c.x} {c.y}) scale({c.s})" fill={dark ? '#dfe7f0' : '#ffffff'} opacity={dark ? 0.1 : 0.62}>
          <ellipse cx="0" cy="0" rx="46" ry="14" />
          <ellipse cx="-18" cy="-8" rx="22" ry="14" />
          <ellipse cx="12" cy="-12" rx="26" ry="18" />
          <ellipse cx="34" cy="-4" rx="20" ry="12" />
        </g>
      {/each}
    </pattern>
  </defs>
  <rect width="100%" height="100%" fill="url(#{id}-c)" />
</svg>

<style>
  .clouds {
    position: absolute;
    display: block;
    overflow: visible;
  }
</style>
