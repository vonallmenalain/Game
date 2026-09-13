<script lang="ts">
  import { BIOME_BY_ID, LOCO_BY_ID, PROJECT_BY_ID, WAGON_BY_TYPE, currentBiome, currentLoco, type WagonState } from '../../engine';
  import { formatKm } from '../../lib/format';
  import { game } from '../game.svelte';
  import { WAGON_COLOR, statusTone } from '../labels';
  import { blockingObstacle, stageMode } from '../stage/scenery';
  import { nextEvent, stopText } from '../track';
  import Landscape from './Landscape.svelte';
  import Vehicle from './Vehicle.svelte';

  const loco = $derived(currentLoco(game.state));
  const biome = $derived(currentBiome(game.state));
  const mode = $derived(stageMode(game.state));
  const obstacle = $derived(blockingObstacle(game.state));
  const free = $derived(Math.max(0, loco.slots - game.state.wagons.length));
  const next = $derived(nextEvent(game.state));

  /** Das Bauwerk am aktuellen Hindernis, sobald es steht */
  const builtHere = $derived.by(() => {
    const spot = obstacle ?? lastObstacle;
    return spot ? game.state.projects[spot.project]?.done === true : false;
  });
  /** Nach dem Bau bleibt das Hindernis noch im Bild, damit man den Zug hindurchfahren sieht */
  let lastObstacle = $state<{ id: string; name: string; project: string } | null>(null);
  let clearTimer: ReturnType<typeof setTimeout> | null = null;

  $effect(() => {
    if (obstacle) {
      lastObstacle = obstacle;
      if (clearTimer) clearTimeout(clearTimer);
      clearTimer = null;
    } else if (lastObstacle) {
      clearTimer ??= setTimeout(() => {
        lastObstacle = null;
        clearTimer = null;
      }, 4000);
    }
  });

  const shown = $derived(obstacle ?? lastObstacle);
  const growing = $derived(game.milestone?.kind === 'projekt' && game.milestone.ref === shown?.project);

  /** Eine neue Lok rollt von vorne heran, statt einfach da zu sein */
  const locoArriving = $derived(game.milestone?.kind === 'lok');

  const milestoneText = $derived.by(() => {
    const m = game.milestone;
    if (!m) return null;
    if (m.kind === 'projekt') return { eyebrow: 'Geschafft', title: PROJECT_BY_ID[m.ref]?.name ?? m.ref };
    if (m.kind === 'lok') return { eyebrow: 'Neue Lok', title: LOCO_BY_ID[m.ref]?.name ?? m.ref };
    return { eyebrow: 'Neues Gebiet', title: BIOME_BY_ID[m.ref]?.name ?? m.ref };
  });

  function open(w: WagonState) {
    game.sheet = { kind: 'wagen', id: w.id };
  }
</script>

<section class="stage" class:blocked={Boolean(shown)} aria-label="Der Zug unterwegs">
  <Landscape biome={biome.id} {mode} obstacle={shown?.id ?? null} built={builtHere} {growing} />

  <div class="readout">
    <span class="km mono">{formatKm(game.state.km)}</span>
    <span class="state" class:rolling={mode === 'faehrt'}>{stopText(game.state)}</span>
    {#if next && next.km - game.state.km > 0.005}
      <span class="next">{next.label} in {formatKm(next.km - game.state.km)}</span>
    {/if}
  </div>

  <div class="train" role="group" aria-label="Wagen des Zuges">
    <button type="button" class="vehicle" class:arriving={locoArriving} onclick={() => game.showToast(`${loco.name}: ${loco.slots} Wagen, ${loco.speedKmh} km/h`)} aria-label={loco.name}>
      <Vehicle kind={loco.id} color="var(--loco)" rolling={mode === 'faehrt'} />
    </button>
    {#each game.state.wagons as w (w.id)}
      <button type="button" class="vehicle tone-{statusTone(w)}" onclick={() => open(w)} aria-label="{WAGON_BY_TYPE[w.type]?.name ?? w.type}, Stufe {w.level}">
        <Vehicle kind={w.type} color={WAGON_COLOR[w.type]} rolling={mode === 'faehrt'} />
        <span class="pips" aria-hidden="true">
          {#each Array(5) as _, i (i)}<i class:on={i < w.level}></i>{/each}
        </span>
      </button>
    {/each}
    {#each Array(free) as _, i (i)}
      <button type="button" class="vehicle slot" onclick={() => (game.sheet = { kind: 'bauen' })} aria-label="Wagen anhängen">+</button>
    {/each}
  </div>

  {#if milestoneText}
    {#key game.milestone?.at}
      <button type="button" class="milestone" onclick={() => game.dismissMilestone()}>
        <span class="eyebrow">{milestoneText.eyebrow}</span>
        <span class="title">{milestoneText.title}</span>
      </button>
    {/key}
  {/if}
</section>

<style>
  .stage {
    position: relative;
    height: clamp(170px, 26vh, 230px);
    overflow: hidden;
    border-bottom: 1px solid var(--line);
    --loco: #2b333d;
  }

  @media (prefers-color-scheme: dark) {
    .stage {
      --loco: #cbd5df;
    }
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

  @media (prefers-color-scheme: dark) {
    .readout {
      text-shadow: 0 1px 3px rgba(0, 0, 0, 0.6);
    }
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

  .train {
    position: absolute;
    left: 0;
    right: 0;
    bottom: 12px;
    display: flex;
    align-items: flex-end;
    gap: 2px;
    padding-inline: 12px;
    overflow-x: auto;
    scrollbar-width: none;
    transition: padding-left 0.6s ease;
  }

  .train::-webkit-scrollbar {
    display: none;
  }

  .stage.blocked .train {
    padding-left: 104px;
  }

  .vehicle {
    position: relative;
    flex: none;
    border: 0;
    background: transparent;
    padding: 0 1px 8px;
    cursor: pointer;
    color: var(--ink-2);
    touch-action: manipulation;
  }

  .vehicle.tone-warn::after {
    content: '';
    position: absolute;
    left: 50%;
    bottom: 1px;
    width: 16px;
    height: 3px;
    border-radius: 2px;
    transform: translateX(-50%);
    background: var(--warn);
  }

  .vehicle.slot {
    width: 46px;
    height: 40px;
    border: 1px dashed var(--line);
    border-radius: 6px;
    font-size: 20px;
    margin-bottom: 9px;
  }

  .pips {
    position: absolute;
    left: 50%;
    top: 2px;
    transform: translateX(-50%);
    display: flex;
    gap: 2px;
  }

  .pips i {
    width: 4px;
    height: 4px;
    border-radius: 50%;
    background: transparent;
  }

  .pips i.on {
    background: var(--accent);
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
    .vehicle.arriving {
      animation: arrive 0.9s cubic-bezier(0.22, 1, 0.36, 1) both;
    }

    .milestone {
      animation: pop 0.45s cubic-bezier(0.22, 1.2, 0.4, 1) both;
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
