<script lang="ts">
  /**
   * Das Hindernis vor der Lok und das Bauwerk, das es überwindet: die Schlucht mit
   * der Brücke, das Bergmassiv mit dem Tunnel. Liegt in der nahen Ebene links der
   * Lok. Die rechte Kante ist `right` in Welt-Bildpunkten, die Schiene y = 0.
   */
  import { mix, type BiomeMood } from '../../stage/scenery';

  let {
    id,
    built,
    growing,
    unit,
    mood,
    w,
    right,
  }: { id: string; built: boolean; growing: boolean; unit: number; mood: BiomeMood; w: number; right: number } = $props();

  const TOP = -210;
  const HEIGHT = 480;
  const ty = -TOP;
  const uid = $props.id();

  const rock = $derived(mix(mood.far, mood.ground, 0.5));
  const rockLit = $derived(mix(rock, '#ffffff', 0.16));
  const rockDark = $derived(mix(rock, '#000000', 0.28));
  const chasmTop = $derived(mix(mood.ground, '#000000', 0.45));
  const wood = '#7b5a3c';
  const woodDark = '#553b27';
  const stone = $derived(mix(mood.ground, '#8d8a80', 0.6));

  /** Träger der Brücke, x-Positionen der Joche */
  const bents = [24, 50, 76, 102, 128];
</script>

<svg
  class="obstacle"
  style="left:{right - w * unit}px; top:{TOP * unit}px; width:{w * unit}px; height:{HEIGHT * unit}px"
  viewBox="0 0 {w} {HEIGHT}"
  preserveAspectRatio="none"
  aria-hidden="true"
>
  <defs>
    <linearGradient id="{uid}-chasm" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color={chasmTop} />
      <stop offset="0.35" stop-color="#15181c" />
      <stop offset="1" stop-color="#0a0c0f" />
    </linearGradient>
    <linearGradient id="{uid}-walls" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color={rockLit} stop-opacity="0.55" />
      <stop offset="0.16" stop-color={rock} stop-opacity="0" />
      <stop offset="0.84" stop-color={rock} stop-opacity="0" />
      <stop offset="1" stop-color={rockDark} stop-opacity="0.7" />
    </linearGradient>
    <linearGradient id="{uid}-tunnel" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#05060a" />
      <stop offset="1" stop-color="#181c22" />
    </linearGradient>
  </defs>

  {#if id === 'schlucht'}
    <!-- Die Schlucht: ein Riss im Boden, das Gleis endet an der Kante -->
    <rect x="10" y={ty - 14} width={w - 20} height={HEIGHT - ty + 14} fill="url(#{uid}-chasm)" />
    <rect x="10" y={ty - 14} width={w - 20} height={HEIGHT - ty + 14} fill="url(#{uid}-walls)" />
    <!-- Felsbänder in den Wänden und ein Bach ganz unten -->
    <g fill={rockLit} opacity="0.35">
      <rect x="10" y={ty + 8} width="22" height="3" /><rect x="12" y={ty + 44} width="16" height="3" /><rect x="10" y={ty + 96} width="20" height="3" />
      <rect x={w - 34} y={ty + 20} width="24" height="3" /><rect x={w - 30} y={ty + 70} width="20" height="3" /><rect x={w - 36} y={ty + 118} width="26" height="3" />
    </g>
    <path d="M28 {ty + 150} Q{w / 2} {ty + 136} {w - 28} {ty + 150} L{w - 28} {ty + 170} Q{w / 2} {ty + 158} 28 {ty + 170} Z" fill={mood.skyBottom} opacity="0.35" />
    <path d="M10 {ty - 14} L26 {ty - 8} L22 {ty + 40} L28 {ty + 90} L18 {ty + 150} L10 {ty + 150} Z" fill={rockLit} opacity="0.55" />
    <path d="M{w - 10} {ty - 14} L{w - 24} {ty - 6} L{w - 20} {ty + 50} L{w - 28} {ty + 110} L{w - 10} {ty + 150} Z" fill="#000000" opacity="0.45" />
    <g stroke="#000000" stroke-opacity="0.28" stroke-width="1.5" fill="none">
      <path d="M12 {ty + 22} L24 {ty + 26}" /><path d="M14 {ty + 58} L26 {ty + 55}" /><path d="M{w - 26} {ty + 34} L{w - 12} {ty + 30}" /><path d="M{w - 24} {ty + 78} L{w - 12} {ty + 82}" />
    </g>
    {#if built}
      <g class="work" class:growing style="transform-origin: {w / 2}px {ty + 116}px">
        <!-- Joche der Holzbrücke -->
        {#each bents as x (x)}
          <g fill={wood}>
            <rect x={x - 6} y={ty + 3} width="3.2" height="106" transform="skewX(-2)" />
            <rect x={x + 3} y={ty + 3} width="3.2" height="106" transform="skewX(2)" />
          </g>
          <g fill={woodDark}>
            <rect x={x - 9} y={ty + 30} width="18" height="2.4" />
            <rect x={x - 11} y={ty + 62} width="22" height="2.4" />
            <rect x={x - 13} y={ty + 94} width="26" height="2.4" />
          </g>
          <rect x={x - 14} y={ty + 108} width="28" height="6" fill={woodDark} />
        {/each}
        <g stroke={woodDark} stroke-width="2" fill="none" opacity="0.9">
          {#each bents.slice(0, -1) as x, i (x)}
            {@const next = bents[i + 1] ?? x}
            <path d="M{x + 4} {ty + 10} L{next - 4} {ty + 60} M{next - 4} {ty + 10} L{x + 4} {ty + 60} M{x + 5} {ty + 64} L{next - 5} {ty + 104} M{next - 5} {ty + 64} L{x + 5} {ty + 104}" />
          {/each}
        </g>
        <!-- Fahrbahn mit Gleis darauf -->
        <rect x="0" y={ty - 1} width={w} height="7" fill="#5e3f30" />
        <rect x="0" y={ty - 1} width={w} height="1.4" fill="#ffffff" opacity="0.2" />
        <rect x="0" y={ty + 6} width={w} height="2.2" fill="#3e2a20" />
        <rect x="0" y={ty} width={w} height="3.2" fill="#5b6067" />
        <rect x="0" y={ty} width={w} height="1" fill="#c3c8cd" />
      </g>
    {/if}
  {:else}
    <!-- Das Bergmassiv: ein Fels, der über das Gleis hinweg aufragt -->
    <path
      d="M0 {ty + 14} L0 {ty - 46} L26 {ty - 98} L54 {ty - 132} L78 {ty - 152} L100 {ty - 182} L122 {ty - 164} L142 {ty - 128} L162 {ty - 98} L178 {ty - 62} L{w} {ty - 34} L{w} {ty + 14} Z"
      fill={rock}
    />
    <path d="M0 {ty - 46} L26 {ty - 98} L54 {ty - 132} L78 {ty - 152} L100 {ty - 182} L92 {ty - 120} L60 {ty - 70} L30 {ty - 20} L0 {ty + 14} Z" fill={rockLit} />
    <path d="M100 {ty - 182} L122 {ty - 164} L142 {ty - 128} L162 {ty - 98} L178 {ty - 62} L{w} {ty - 34} L{w} {ty + 14} L120 {ty + 14} L104 {ty - 90} Z" fill={rockDark} />
    <g stroke="#000000" stroke-opacity="0.22" stroke-width="1.6" fill="none" stroke-linecap="round">
      <path d="M62 {ty - 116} L80 {ty - 92} L74 {ty - 60}" /><path d="M126 {ty - 140} L140 {ty - 104} L156 {ty - 84}" /><path d="M36 {ty - 70} L48 {ty - 40}" />
    </g>
    <path d="M86 {ty - 154} L100 {ty - 182} L116 {ty - 158} Q108 {ty - 150} 102 {ty - 156} Q96 {ty - 146} 86 {ty - 154} Z" fill="#f4f7fa" opacity="0.85" />
    <!-- Geröll am Fuss -->
    <path d="M0 {ty + 14} L0 {ty - 6} Q40 {ty - 14} 90 {ty - 8} Q150 {ty - 2} {w} {ty - 10} L{w} {ty + 14} Z" fill={mix(rock, mood.ground, 0.5)} />
    {#if built}
      <g class="work" class:growing style="transform-origin: {w - 56}px {ty + 14}px">
        <!-- Stützmauern und Portal -->
        <rect x={w - 104} y={ty - 34} width="12" height="48" fill={stone} />
        <rect x={w - 20} y={ty - 34} width="12" height="48" fill={stone} />
        <path d="M{w - 96} {ty + 14} L{w - 96} {ty - 34} A40 40 0 0 1 {w - 16} {ty - 34} L{w - 16} {ty + 14} Z" fill={stone} />
        <path d="M{w - 96} {ty + 14} L{w - 96} {ty - 34} A40 40 0 0 1 {w - 16} {ty - 34} L{w - 16} {ty + 14} Z" fill="#000000" opacity="0.18" />
        <path d="M{w - 86} {ty + 14} L{w - 86} {ty - 30} A30 30 0 0 1 {w - 26} {ty - 30} L{w - 26} {ty + 14} Z" fill="url(#{uid}-tunnel)" />
        <rect x={w - 60} y={ty - 78} width="8" height="10" fill={mix(stone, '#ffffff', 0.2)} />
        <g stroke="#000000" stroke-opacity="0.2" stroke-width="1.2" fill="none">
          <path d="M{w - 96} {ty - 10} L{w - 86} {ty - 10} M{w - 96} {ty - 22} L{w - 86} {ty - 22} M{w - 26} {ty - 10} L{w - 16} {ty - 10} M{w - 26} {ty - 22} L{w - 16} {ty - 22}" />
        </g>
        <!-- Das Gleis führt hinein -->
        <rect x={w - 86} y={ty} width="86" height="3.2" fill="#5b6067" />
        <rect x={w - 86} y={ty} width="86" height="1" fill="#c3c8cd" />
      </g>
    {/if}
  {/if}
</svg>

<style>
  .obstacle {
    position: absolute;
    display: block;
    overflow: visible;
  }

  @media (prefers-reduced-motion: no-preference) {
    .work.growing {
      animation: grow 2.4s cubic-bezier(0.22, 1, 0.36, 1) both;
    }
  }

  @keyframes grow {
    from {
      transform: scaleY(0.04);
      opacity: 0.4;
    }

    to {
      transform: scaleY(1);
      opacity: 1;
    }
  }
</style>
