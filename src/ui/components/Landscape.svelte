<script lang="ts">
  import { biomeMood, plantsFor, type BiomeMood, type StageMode } from '../stage/scenery';

  let {
    biome,
    mode,
    obstacle,
    built,
    growing,
  }: {
    biome: string;
    mode: StageMode;
    obstacle: string | null;
    built: boolean;
    growing: boolean;
  } = $props();

  const W = 400;
  const H = 190;
  /** Gefühlte Fahrt, kein Massstab: so viele Bildpunkte je Sekunde zieht der Boden vorbei */
  const GROUND_SPEED = 46;
  const TILE_FAR = 260;
  const TILE_MID = 200;
  const TILE_GROUND = 64;

  let dark = $state(false);
  let offset = $state(0);
  let reduced = $state(false);

  const mood = $derived<BiomeMood>(biomeMood(biome, dark));
  const rolling = $derived(mode === 'faehrt');
  /** Kacheln der mittleren Ebene, zwei nebeneinander für den nahtlosen Umlauf */
  const midTile = $derived(Math.floor((offset * 0.45) / TILE_MID));
  const midPlants = $derived([0, 1, 2].map((i) => ({ i, tile: midTile + i, plants: plantsFor(midTile + i, TILE_MID, mood.density) })));
  const farTile = $derived(Math.floor((offset * 0.15) / TILE_FAR));

  $effect(() => {
    const media = matchMedia('(prefers-color-scheme: dark)');
    const motion = matchMedia('(prefers-reduced-motion: reduce)');
    const sync = () => {
      const stamped = document.documentElement.dataset['theme'];
      dark = stamped === 'dark' || (stamped !== 'light' && media.matches);
      reduced = motion.matches;
    };
    sync();
    media.addEventListener('change', sync);
    motion.addEventListener('change', sync);
    return () => {
      media.removeEventListener('change', sync);
      motion.removeEventListener('change', sync);
    };
  });

  $effect(() => {
    if (!rolling || reduced) return;
    let frame = 0;
    let last = performance.now();
    const step = (now: number) => {
      offset += ((now - last) / 1000) * GROUND_SPEED;
      last = now;
      frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  });

  const shift = (factor: number, tile: number) => -(((offset * factor) % tile) + tile) % tile;
</script>

<svg class="landscape" viewBox="0 0 {W} {H}" preserveAspectRatio="xMinYMax slice" role="presentation">
  <defs>
    <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color={mood.skyTop} />
      <stop offset="100%" stop-color={mood.skyBottom} />
    </linearGradient>
    <clipPath id="frame"><rect x="0" y="0" width={W} height={H} /></clipPath>
  </defs>

  <g clip-path="url(#frame)">
    <rect width={W} height={H} fill="url(#sky)" />

    <!-- Ferne Hügel -->
    <g transform="translate({shift(0.15, TILE_FAR)} 0)" fill={mood.far}>
      {#each [0, 1, 2] as i (i)}
        <path
          transform="translate({i * TILE_FAR} 0)"
          d="M0 128 q40 -34 78 -12 q30 18 56 -8 q34 -34 72 -2 q28 24 54 6 L{TILE_FAR} 190 L0 190 Z"
        />
      {/each}
    </g>

    <!-- Mittlere Ebene mit Pflanzen oder Felsen -->
    <g transform="translate({shift(0.45, TILE_MID)} 0)">
      {#each midPlants as group (group.tile)}
        <g transform="translate({group.i * TILE_MID} 0)">
          {#each group.plants as plant, n (n)}
            <g transform="translate({plant.x} 150) scale({plant.scale})" fill={mood.flora} opacity={0.75 + plant.shade * 0.25}>
              {#if mood.floraKind === 'baum'}
                <rect x="-2" y="-14" width="4" height="16" />
                <path d="M0 -44 L13 -14 L-13 -14 Z" />
                <path d="M0 -32 L16 -2 L-16 -2 Z" />
              {:else if mood.floraKind === 'busch'}
                <path d="M-12 0 q0 -14 12 -14 q12 0 12 14 Z" />
              {:else if mood.floraKind === 'fels'}
                <path d="M-14 0 L-6 -17 L4 -22 L14 -6 L12 0 Z" />
              {:else}
                <rect x="-3" y="-26" width="6" height="26" rx="3" />
                <rect x="-11" y="-20" width="6" height="12" rx="3" />
                <rect x="7" y="-24" width="6" height="14" rx="3" />
              {/if}
            </g>
          {/each}
        </g>
      {/each}
      <rect x={-TILE_MID} y="150" width={W + 3 * TILE_MID} height="12" fill={mood.mid} />
    </g>

    <!-- Boden und Gleis -->
    <rect x="0" y="160" width={W} height={H - 160} fill={mood.ground} />
    <g transform="translate({shift(1, TILE_GROUND)} 0)" fill="#000" opacity="0.22">
      {#each [0, 1, 2, 3, 4, 5, 6, 7] as i (i)}
        <rect x={i * TILE_GROUND + 8} y="172" width="26" height="5" rx="1" />
      {/each}
    </g>
    <rect x="0" y="168" width={W} height="3" fill="#000" opacity="0.35" />

    <!-- Hindernis und Bauwerk -->
    {#if obstacle === 'schlucht'}
      <g class:growing>
        <path d="M0 160 L96 160 L96 190 L0 190 Z" fill={mood.skyBottom} opacity="0.9" />
        <path d="M78 160 L96 160 L96 190 L64 190 Z" fill="#000" opacity="0.35" />
        {#if built}
          <g class="work">
            <rect x="0" y="156" width="104" height="7" fill={mood.far} />
            <g stroke={mood.far} stroke-width="4" fill="none">
              <path d="M6 163 L26 186 M46 163 L26 186 M46 163 L66 186 M86 163 L66 186" />
            </g>
            <rect x="0" y="184" width="104" height="5" fill={mood.far} />
          </g>
        {/if}
      </g>
    {:else if obstacle === 'bergmassiv'}
      <g class:growing>
        <path d="M-10 190 L-10 110 L40 58 L96 110 L96 190 Z" fill={mood.far} />
        <path d="M40 58 L96 110 L96 190 L56 190 Z" fill="#000" opacity="0.18" />
        {#if built}
          <g class="work">
            <path d="M18 190 L18 142 q22 -26 44 0 L62 190 Z" fill="#000" opacity="0.72" />
            <path d="M14 146 q26 -32 52 0 l-8 6 q-18 -22 -36 0 Z" fill={mood.mid} />
          </g>
        {/if}
      </g>
    {/if}
  </g>
</svg>

<style>
  .landscape {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    display: block;
  }

  .work {
    transform-origin: 50px 190px;
  }

  @media (prefers-reduced-motion: no-preference) {
    .growing .work {
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
