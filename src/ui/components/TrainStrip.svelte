<script lang="ts">
  import { currentLoco, type WagonState } from '../../engine';
  import { game } from '../game.svelte';
  import { WAGON_COLOR, WAGON_MARK, statusTone } from '../labels';
  import Mark from './Mark.svelte';

  const loco = $derived(currentLoco(game.state));
  const free = $derived(loco.slots - game.state.wagons.length);

  function open(w: WagonState) {
    game.sheet = { kind: 'wagen', id: w.id };
  }
</script>

<div class="strip" aria-label="Der Zug">
  <div class="block loco" title={loco.name}>
    <span class="name">{loco.name}</span>
    <span class="mono small">{loco.slots} Plätze</span>
  </div>
  <button type="button" class="block werkstatt" onclick={() => (game.sheet = { kind: 'werkstatt' })}>
    <span class="name">Werkstatt</span>
    <span class="small muted">Handarbeit</span>
  </button>
  {#each game.state.wagons as w (w.id)}
    <button type="button" class="block wagon tone-{statusTone(w)}" onclick={() => open(w)}>
      <Mark text={WAGON_MARK[w.type]} color={WAGON_COLOR[w.type]} />
      <span class="pips" aria-label="Stufe {w.level}">
        {#each Array(5) as _, i (i)}<i class:on={i < w.level}></i>{/each}
      </span>
    </button>
  {/each}
  {#each Array(Math.max(0, free)) as _, i (i)}
    <button type="button" class="block empty" onclick={() => (game.sheet = { kind: 'bauen' })} aria-label="Wagen anhängen">+</button>
  {/each}
</div>

<style>
  .strip {
    display: flex;
    gap: 6px;
    overflow-x: auto;
    padding: 12px 16px 10px;
    background: linear-gradient(to bottom, var(--surface-2), var(--bg));
    border-bottom: 1px solid var(--line);
    scrollbar-width: thin;
  }

  .block {
    flex: none;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 5px;
    min-width: 58px;
    height: 64px;
    border: 1px solid var(--line);
    border-radius: 8px;
    background: var(--surface);
    color: var(--ink);
    padding: 6px 8px;
    font: inherit;
    cursor: pointer;
  }

  .loco {
    min-width: 88px;
    background: var(--ink);
    color: var(--bg);
    border-color: var(--ink);
    cursor: default;
    border-radius: 14px 8px 8px 8px;
  }

  .werkstatt {
    border-style: dashed;
  }

  .name {
    font-family: var(--display);
    font-size: 15px;
    font-weight: 600;
  }

  .small {
    font-size: 11px;
  }

  .wagon {
    border-bottom-width: 3px;
  }

  .wagon.tone-good {
    border-bottom-color: var(--good);
  }

  .wagon.tone-warn {
    border-bottom-color: var(--warn);
  }

  .wagon.tone-mute {
    border-bottom-color: var(--line);
  }

  .pips {
    display: flex;
    gap: 3px;
  }

  .pips i {
    width: 5px;
    height: 5px;
    border-radius: 50%;
    background: var(--line);
  }

  .pips i.on {
    background: var(--accent);
  }

  .empty {
    border-style: dashed;
    color: var(--ink-2);
    font-size: 22px;
    background: transparent;
  }
</style>
