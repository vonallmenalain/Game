<script lang="ts">
  /**
   * Die Bühne: Der Zug in der Landschaft, auf jedem Register ausser «Mehr». Alles
   * liegt in einer Welt in Bildpunkten, die Schiene bei y = 0, die Lok bei x = 0,
   * Fahrtrichtung links. Eine Kamera holt den ganzen Zug ins Bild oder fährt an ein
   * Fahrzeug heran; ferne Ebenen wachsen dabei weniger als nahe, das gibt Tiefe.
   */
  import { setContext } from 'svelte';
  import { fade } from 'svelte/transition';
  import { BIOME_BY_ID, LOCO_BY_ID, PROJECT_BY_ID, WAGONS, WAGON_BY_TYPE, currentBiome, currentLoco, machineSlots, wagonOfType } from '../../engine';
  import { formatKm } from '../../lib/format';
  import { game } from '../game.svelte';
  import { statusTone } from '../labels';
  import { follow, slide } from '../stage/actions';
  import { DEPTH, FIT, OBSTACLE_GAP, OBSTACLE_SPEC, PARALLAX, clamp, fitCamera, focusCamera, layerTransform, layoutTrain, panBounds, type Camera, type Viewport } from '../stage/camera';
  import { Motion, feltSpeed } from '../stage/motion';
  import { biomeMood, blockingObstacle, stageMode } from '../stage/scenery';
  import { nextEvent, stopText } from '../track';
  import Clouds from './scenery/Clouds.svelte';
  import FarHills from './scenery/FarHills.svelte';
  import Ground from './scenery/Ground.svelte';
  import MidFlora from './scenery/MidFlora.svelte';
  import Obstacle from './scenery/Obstacle.svelte';
  import Vehicle from './Vehicle.svelte';

  const motion = new Motion();
  setContext('motion', motion);

  let width = $state(0);
  let height = $state(0);
  let dark = $state(false);
  let reduced = $state(false);

  const view = $derived<Viewport>({ width, height, trackY: height - Math.max(26, height * 0.15) });
  /** Bildpunkte je Zeichnungseinheit: Im Fokus füllt ein Wagen gut sechzig Prozent der Höhe über der Schiene */
  const unit = $derived(Math.max(0.4, (0.62 * view.trackY) / 90));

  const loco = $derived(currentLoco(game.state));
  const biome = $derived(currentBiome(game.state));
  const mood = $derived(biomeMood(biome.id, dark));
  const mode = $derived(stageMode(game.state));
  const rolling = $derived(mode === 'faehrt');
  const next = $derived(nextEvent(game.state));
  const byId = $derived(new Map(game.state.wagons.map((w) => [w.id, w])));
  /** Ein Platzhalter am Schluss, solange die Lok noch Platz hat und ein Wagentyp fehlt */
  const ghost = $derived(loco.slots > game.state.wagons.length && WAGONS.some((w) => !wagonOfType(game.state, w.type)));
  const layout = $derived(layoutTrain(game.state, unit, ghost));

  // Hindernis: erscheint, sobald der Zug davorsteht. Nach dem Bau wächst das Bauwerk,
  // dann fährt der Zug los und das Bauwerk zieht mit dem Boden nach hinten weg.
  const obstacle = $derived(blockingObstacle(game.state));
  let lastObstacle = $state<{ id: string; name: string; project: string } | null>(null);
  /** Der Zug wartet noch, bis das Bauwerk fertig gewachsen ist */
  let held = $state(false);
  /** Das Bauwerk zieht gerade nach hinten weg */
  let passing = $state(false);
  let holdTimer: ReturnType<typeof setTimeout> | null = null;

  $effect(() => {
    if (obstacle) {
      lastObstacle = obstacle;
      held = false;
      passing = false;
      if (holdTimer) clearTimeout(holdTimer);
      holdTimer = null;
    } else if (lastObstacle && !passing && !holdTimer) {
      held = true;
      holdTimer = setTimeout(() => {
        holdTimer = null;
        held = false;
        passing = true;
      }, 2600);
    }
  });

  const shown = $derived(obstacle ?? lastObstacle);
  const builtHere = $derived(shown ? game.state.projects[shown.project]?.done === true : false);
  const growing = $derived(game.milestone?.kind === 'projekt' && game.milestone.ref === shown?.project);
  const obstacleW = $derived(shown ? (OBSTACLE_SPEC[shown.id]?.w ?? 150) * unit : 0);
  const scene = $derived({ left: shown && !passing ? -(obstacleW + OBSTACLE_GAP * unit) : 0, right: layout.right });

  /** Eine neue Lok rollt von vorne heran, statt einfach da zu sein */
  const locoArriving = $derived(game.milestone?.kind === 'lok');

  const milestoneText = $derived.by(() => {
    const m = game.milestone;
    if (!m) return null;
    if (m.kind === 'projekt') return { eyebrow: 'Geschafft', title: PROJECT_BY_ID[m.ref]?.name ?? m.ref };
    if (m.kind === 'lok') return { eyebrow: 'Neue Lok', title: LOCO_BY_ID[m.ref]?.name ?? m.ref };
    return { eyebrow: 'Neues Gebiet', title: BIOME_BY_ID[m.ref]?.name ?? m.ref };
  });

  // Kamera: Überblick über den ganzen Zug oder Fokus auf ein Fahrzeug
  const focusItem = $derived.by(() => {
    const f = game.focus;
    if (f.kind === 'lok') return layout.items[0] ?? null;
    if (f.kind === 'wagen') return layout.items.find((i) => i.wagonId === f.id) ?? null;
    return null;
  });
  const overview = $derived(fitCamera(scene, view, 1));
  const bounds = $derived(panBounds(scene, overview.s, view));
  /** Mitte, die der Finger gewählt hat, solange der Zug nicht ganz ins Bild passt */
  let panX = $state<number | null>(null);
  const camera = $derived.by<Camera>(() => {
    if (focusItem) return focusCamera(focusItem, view);
    // Passt der Zug nicht ins Bild, beginnt der Überblick vorne: bei der Lok und dem, was vor ihr liegt
    const x = clamp(panX ?? bounds.min, bounds.min, bounds.max);
    return { s: overview.s, x };
  });
  const canPan = $derived(!focusItem && bounds.max > bounds.min);

  /** Zurück im Überblick bleibt das zuletzt gezeigte Fahrzeug im Bild */
  let lastFocusX: number | null = null;
  $effect(() => {
    if (focusItem) lastFocusX = focusItem.x + focusItem.w / 2;
    else if (lastFocusX !== null) {
      panX = lastFocusX;
      lastFocusX = null;
    }
  });

  const tf = $derived({
    clouds: layerTransform(camera, DEPTH.clouds, view),
    far: layerTransform(camera, DEPTH.far, view),
    mid: layerTransform(camera, DEPTH.mid, view),
    near: layerTransform(camera, DEPTH.near, view),
  });

  /** Nach so vielen Welt-Bildpunkten wiederholt sich eine Ebene */
  const periods = $derived({ clouds: 1500 * unit, far: 900 * unit, mid: 1280 * unit, near: 320 * unit });

  /** So breit muss eine Ebene sein, damit bei jedem Massstab und jedem Schwenk nichts Leeres ins Bild kommt */
  function cover(depth: number, period: number): { left: number; width: number } {
    const s = FIT.min ** depth;
    const half = view.width / 2 / s + 60;
    return { left: scene.left - half - period, width: scene.right - scene.left + 2 * half + period };
  }
  const coverage = $derived({
    clouds: cover(DEPTH.clouds, periods.clouds),
    far: cover(DEPTH.far, periods.far),
    mid: cover(DEPTH.mid, periods.mid),
    near: cover(DEPTH.near, periods.near),
  });

  const caption = $derived.by(() => {
    const f = focusItem;
    if (!f) return null;
    if (f.wagonId === undefined) return `${loco.name} · ${loco.speedKmh} km/h · zieht ${loco.slots} Wagen`;
    const w = byId.get(f.wagonId);
    if (!w) return null;
    return `${WAGON_BY_TYPE[w.type]?.name ?? w.type} · Stufe ${w.level} · ${w.machines.length} von ${machineSlots(game.state)} Maschinen`;
  });

  // Bewegung: eine Uhr für Räder, Gestänge und Boden, mit weichem Anfahren und Bremsen
  let frame = 0;
  let last = 0;
  function loop(now: number) {
    const dt = (now - last) / 1000;
    last = now;
    frame = motion.step(dt) ? requestAnimationFrame(loop) : 0;
  }
  function ensureLoop() {
    if (frame || typeof requestAnimationFrame !== 'function') return;
    last = performance.now();
    frame = requestAnimationFrame(loop);
  }
  $effect(() => {
    motion.speed = feltSpeed(loco.speedKmh) * unit;
  });
  $effect(() => {
    motion.target = rolling && !held && !reduced ? 1 : 0;
    if (motion.target > 0) ensureLoop();
  });
  $effect(() => () => {
    if (frame) cancelAnimationFrame(frame);
    if (holdTimer) clearTimeout(holdTimer);
  });

  $effect(() => {
    const media = matchMedia('(prefers-color-scheme: dark)');
    const motionMedia = matchMedia('(prefers-reduced-motion: reduce)');
    const sync = () => {
      const stamped = document.documentElement.dataset['theme'];
      dark = stamped === 'dark' || (stamped !== 'light' && media.matches);
      reduced = motionMedia.matches;
    };
    sync();
    media.addEventListener('change', sync);
    motionMedia.addEventListener('change', sync);
    return () => {
      media.removeEventListener('change', sync);
      motionMedia.removeEventListener('change', sync);
    };
  });

  // Schwenken mit dem Finger, wenn der Zug nicht ganz ins Bild passt
  let drag: { x0: number; pan0: number; moved: boolean; lastX: number; lastT: number; vx: number } | null = null;
  let dragging = $state(false);
  let suppressUntil = 0;

  function down(e: PointerEvent) {
    if (!canPan || e.button !== 0) return;
    drag = { x0: e.clientX, pan0: camera.x, moved: false, lastX: e.clientX, lastT: e.timeStamp, vx: 0 };
  }

  function move(e: PointerEvent) {
    if (!drag) return;
    const dx = e.clientX - drag.x0;
    if (!drag.moved) {
      if (Math.abs(dx) < 6) return;
      drag.moved = true;
      dragging = true;
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    }
    const dt = e.timeStamp - drag.lastT;
    if (dt > 0) drag.vx = (e.clientX - drag.lastX) / dt;
    drag.lastX = e.clientX;
    drag.lastT = e.timeStamp;
    panX = clamp(drag.pan0 - dx / camera.s, bounds.min, bounds.max);
  }

  function up() {
    if (!drag) return;
    if (drag.moved) {
      suppressUntil = performance.now() + 350;
      dragging = false;
      // Schwung: noch ein Stück in Wischrichtung, weich auslaufend über den Übergang
      panX = clamp((panX ?? camera.x) - (drag.vx * 160) / camera.s, bounds.min, bounds.max);
    }
    drag = null;
  }

  function tapped(): boolean {
    return performance.now() > suppressUntil;
  }
</script>

<section
  class="stage"
  class:focused={Boolean(focusItem)}
  class:dragging
  class:dark
  aria-label="Der Zug unterwegs"
  data-focus={game.focus.kind}
  bind:clientWidth={width}
  bind:clientHeight={height}
>
  {#if width > 0 && height > 0}
    {#key mood.skyTop}
      <div class="sky" style="--top: {mood.skyTop}; --bottom: {mood.skyBottom}" in:fade={{ duration: 900 }}></div>
    {/key}

    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <div class="world" class:pannable={canPan} onpointerdown={down} onpointermove={move} onpointerup={up} onpointercancel={up}>
      <div class="layer" style:transform={tf.clouds}>
        <div class="scroll" use:slide={{ motion, factor: PARALLAX.clouds, period: periods.clouds }}>
          <Clouds left={coverage.clouds.left} width={coverage.clouds.width} {unit} period={periods.clouds} {dark} />
        </div>
      </div>
      <div class="layer" style:transform={tf.far}>
        <div class="scroll" use:slide={{ motion, factor: PARALLAX.far, period: periods.far }}>
          <FarHills {mood} left={coverage.far.left} width={coverage.far.width} {unit} period={periods.far} />
        </div>
      </div>
      <div class="layer" style:transform={tf.mid}>
        <div class="scroll" use:slide={{ motion, factor: PARALLAX.mid, period: periods.mid }}>
          <MidFlora {mood} left={coverage.mid.left} width={coverage.mid.width} {unit} period={periods.mid} tiles={4} />
        </div>
      </div>
      <div class="layer near" style:transform={tf.near}>
        <div class="scroll" use:slide={{ motion, factor: PARALLAX.near, period: periods.near }}>
          <Ground {mood} left={coverage.near.left} width={coverage.near.width} {unit} period={periods.near} />
        </div>
        {#if shown}
          <div
            class="bauwerk"
            use:follow={{
              motion,
              active: passing,
              until: scene.right + obstacleW + OBSTACLE_GAP * unit + 40,
              onpassed: () => {
                lastObstacle = null;
                passing = false;
              },
            }}
          >
            <Obstacle id={shown.id} built={builtHere} {growing} {unit} {mood} w={OBSTACLE_SPEC[shown.id]?.w ?? 150} right={-OBSTACLE_GAP * unit} />
          </div>
        {/if}

        <!-- Der Zug hat eine echte Ausdehnung, damit er als Gruppe sichtbar ist: die Räder stehen auf seiner Unterkante -->
        <div class="train" role="group" aria-label="Wagen des Zuges" style:width="{layout.right}px" style:height="{110 * unit}px" style:top="{-110 * unit}px">
          {#each layout.items as item (item.key)}
            {#if item.kind === 'platz'}
              <button
                type="button"
                class="vehicle slot"
                style:transform="translate3d({item.x}px, 0, 0)"
                style:width="{item.w}px"
                onclick={() => tapped() && game.tapSlot()}
                aria-label="Wagen anhängen"
              >
                <span class="body"><Vehicle kind="platz" {unit} {dark} /></span>
              </button>
            {:else if item.wagonId === undefined}
              <button
                type="button"
                class="vehicle lok"
                class:focus={focusItem === item}
                style:transform="translate3d({item.x}px, 0, 0)"
                style:width="{item.w}px"
                onclick={() => tapped() && game.tapLoco()}
                aria-label={loco.name}
              >
                <span class="body" class:arriving={locoArriving}><Vehicle kind={loco.id} {unit} rolling={rolling && !held} active={rolling} {dark} /></span>
              </button>
            {:else}
              {@const w = byId.get(item.wagonId)}
              {#if w}
                <button
                  type="button"
                  class="vehicle tone-{statusTone(w)}"
                  class:focus={focusItem === item}
                  style:transform="translate3d({item.x}px, 0, 0)"
                  style:width="{item.w}px"
                  onclick={() => tapped() && game.tapWagon(w.id)}
                  aria-label="{WAGON_BY_TYPE[w.type]?.name ?? w.type}, Stufe {w.level}, {w.machines.length} Maschinen"
                >
                  <span class="body"><Vehicle kind={w.type} {unit} rolling={rolling && !held} active={w.status === 'aktiv'} level={w.level} tone={statusTone(w)} {dark} /></span>
                </button>
              {/if}
            {/if}
          {/each}
        </div>
      </div>
    </div>

    <div class="vignette"></div>

    <div class="readout">
      <span class="km mono">{formatKm(game.state.km)}</span>
      <span class="state" class:rolling={mode === 'faehrt'}>{stopText(game.state)}</span>
      {#if next && next.km - game.state.km > 0.005}
        <span class="next">{next.label} in {formatKm(next.km - game.state.km)}</span>
      {/if}
    </div>

    {#if caption}
      {#key caption}
        <div class="caption" in:fade={{ duration: 300 }}>{caption}</div>
      {/key}
    {/if}

    {#if milestoneText}
      {#key game.milestone?.at}
        <button type="button" class="milestone" onclick={() => game.dismissMilestone()}>
          <span class="eyebrow">{milestoneText.eyebrow}</span>
          <span class="title">{milestoneText.title}</span>
        </button>
      {/key}
    {/if}
  {/if}
</section>

<style>
  /* clip statt hidden: So kann nichts die Bühne programmatisch scrollen, auch kein
     fokussierter Knopf am Rand. Die Kamera allein bestimmt den Ausschnitt. */
  .stage {
    position: relative;
    height: clamp(168px, 27vh, 250px);
    flex: none;
    overflow: hidden;
    overflow: clip;
    border-bottom: 1px solid var(--line);
    background: var(--bg);
    contain: layout paint;
    user-select: none;
    -webkit-user-select: none;
  }

  .sky {
    position: absolute;
    inset: 0;
    background:
      radial-gradient(circle at 78% 24%, rgba(255, 248, 225, 0.55), rgba(255, 248, 225, 0) 9%),
      linear-gradient(var(--top), var(--bottom));
  }

  .dark .sky {
    background:
      radial-gradient(circle at 80% 22%, rgba(226, 234, 244, 0.45), rgba(226, 234, 244, 0) 5%),
      linear-gradient(var(--top), var(--bottom));
  }

  .world {
    position: absolute;
    inset: 0;
    touch-action: pan-y;
  }

  .world.pannable {
    cursor: grab;
  }

  .dragging .world {
    cursor: grabbing;
  }

  .layer,
  .scroll,
  .bauwerk,
  .train {
    position: absolute;
    left: 0;
    top: 0;
    width: 0;
    height: 0;
  }

  .train {
    pointer-events: none;
  }

  .train .vehicle {
    pointer-events: auto;
  }

  .layer {
    transform-origin: 0 0;
    will-change: transform;
    transition: transform 0.9s cubic-bezier(0.22, 0.86, 0.24, 1);
  }

  .dragging .layer {
    transition: none;
  }

  .scroll,
  .bauwerk {
    will-change: transform;
  }

  .vehicle {
    position: absolute;
    left: 0;
    bottom: 0;
    display: block;
    border: 0;
    margin: 0;
    padding: 0;
    background: transparent;
    color: inherit;
    cursor: pointer;
    touch-action: manipulation;
    transition:
      transform 0.7s cubic-bezier(0.22, 0.86, 0.24, 1),
      opacity 0.7s ease;
  }

  .vehicle:focus-visible {
    outline: none;
  }

  .vehicle:focus-visible .body {
    outline: 2px solid var(--accent);
    outline-offset: 4px;
    border-radius: 6px;
  }

  .focused .vehicle:not(.focus) {
    opacity: 0.5;
  }

  .body {
    display: block;
    position: relative;
  }

  /* Ein wartender Wagen trägt einen warnfarbenen Strich unter sich */
  .vehicle.tone-warn .body::after {
    content: '';
    position: absolute;
    left: 20%;
    right: 20%;
    bottom: -4px;
    height: 3px;
    border-radius: 2px;
    background: var(--warn);
    opacity: 0.85;
  }

  .vignette {
    position: absolute;
    inset: 0;
    pointer-events: none;
    opacity: 0;
    transition: opacity 0.9s ease;
    box-shadow:
      inset 0 -50px 60px -30px rgba(0, 0, 0, 0.42),
      inset 0 0 90px rgba(0, 0, 0, 0.16);
  }

  .focused .vignette {
    opacity: 1;
  }

  .readout {
    position: absolute;
    top: 8px;
    left: 12px;
    right: 12px;
    display: flex;
    flex-wrap: wrap;
    align-items: baseline;
    gap: 2px 10px;
    font-size: 12px;
    color: var(--ink);
    text-shadow: 0 1px 2px rgba(255, 255, 255, 0.45);
    pointer-events: none;
  }

  .dark .readout {
    text-shadow: 0 1px 3px rgba(0, 0, 0, 0.6);
  }

  .km {
    font-family: var(--display);
    font-size: 22px;
    font-weight: 700;
  }

  .state {
    font-weight: 600;
    color: var(--warn);
  }

  .state.rolling {
    color: var(--good);
  }

  .next {
    color: var(--ink-2);
  }

  .caption {
    position: absolute;
    left: 50%;
    bottom: 7px;
    transform: translateX(-50%);
    max-width: calc(100% - 24px);
    padding: 3px 11px;
    border-radius: 999px;
    background: rgba(12, 16, 20, 0.58);
    color: #f4f6f8;
    font-size: 12px;
    font-weight: 500;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    pointer-events: none;
  }

  .milestone {
    position: absolute;
    left: 12px;
    right: 12px;
    top: 42px;
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 1px;
    padding: 9px 14px;
    border: 1px solid var(--accent);
    border-radius: 10px;
    background: var(--accent-soft);
    color: var(--accent-ink);
    text-align: left;
    cursor: pointer;
    box-shadow: 0 6px 20px rgba(0, 0, 0, 0.18);
  }

  .milestone .eyebrow {
    margin: 0;
    color: inherit;
  }

  .milestone .title {
    font-family: var(--display);
    font-size: 23px;
    font-weight: 700;
    line-height: 1.05;
  }

  @media (prefers-reduced-motion: no-preference) {
    .body.arriving {
      animation: arrive 0.9s cubic-bezier(0.22, 1, 0.36, 1) both;
    }

    .milestone {
      animation: pop 0.45s cubic-bezier(0.22, 1.2, 0.4, 1) both;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .layer,
    .vehicle,
    .vignette {
      transition: none;
    }
  }

  @keyframes arrive {
    from {
      transform: translateX(-120%);
      opacity: 0;
    }

    to {
      transform: none;
      opacity: 1;
    }
  }

  @keyframes pop {
    from {
      opacity: 0;
      transform: translateY(-10px) scale(0.96);
    }

    to {
      opacity: 1;
      transform: none;
    }
  }
</style>
