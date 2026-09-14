<script lang="ts">
  import { BIOME_BY_ID, LOCO_BY_ID, OBSTACLE_BY_ID, PROJECT_BY_ID, TECH_BY_ID, currentLoco, type OfflineReport } from '../../engine';
  import { formatCount, formatDuration, formatKm } from '../../lib/format';
  import { formatOfflineWarning } from '../../i18n/de-CH';
  import { game } from '../game.svelte';
  import { itemName } from '../labels';
  import Bar from './Bar.svelte';
  import Mark from './Mark.svelte';

  let { report }: { report: OfflineReport } = $props();

  const distance = $derived(report.kmAfter - report.kmBefore);
  const gained = $derived(report.gained.slice(0, 8));
  const openProjects = $derived(report.projectProgress.filter((p) => p.after > p.before && p.after < 1));
</script>

<div class="backdrop" role="presentation"></div>
<div class="report" role="dialog" aria-modal="true" aria-label="Während du weg warst">
  <header>
    <p class="eyebrow">{formatDuration(report.elapsedSeconds)} weg{#if report.lostSeconds > 60}{`, davon ${formatDuration(report.simulatedSeconds)} gerechnet`}{/if}</p>
    <h2>Während du weg warst</h2>
  </header>

  <div class="body">
    <div class="headline">
      <span class="big mono">{formatKm(distance)}</span>
      <span class="muted">gefahren, jetzt bei {formatKm(report.kmAfter)}</span>
    </div>

    {#if game.reportSource}
      <p class="note">Dieser Stand kommt aus der Cloud, zuletzt gespielt auf {game.reportSource.geraet}. Er hat die Abwesenheit genauso nachgeholt.</p>
    {/if}

    {#if report.lostSeconds > 60}
      <p class="note">Die Nachtschicht rechnet höchstens {formatDuration(report.simulatedSeconds)}. {formatDuration(report.lostSeconds)} sind verfallen, die Mannschaft hat geschlafen.</p>
    {/if}

    {#if report.biomes.length > 0 || report.obstacles.length > 0 || report.projectsDone.length > 0 || report.techsDone.length > 0 || report.newLoco}
      <h3>Was passiert ist</h3>
      <ul class="events">
        {#each report.biomes as id (id)}
          <li class="good">{BIOME_BY_ID[id]?.name ?? id} erreicht</li>
        {/each}
        {#each report.projectsDone as id (id)}
          <li class="good">{PROJECT_BY_ID[id]?.name ?? id} fertiggestellt</li>
        {/each}
        {#if report.newLoco}
          <li class="good">Neue Lok: {LOCO_BY_ID[report.newLoco]?.name ?? report.newLoco}</li>
        {/if}
        {#each report.techsDone as id (id)}
          <li>Forschung: {TECH_BY_ID[id]?.name ?? id}</li>
        {/each}
        {#each report.obstacles as id (id)}
          <li class="warn">{OBSTACLE_BY_ID[id]?.name ?? id} erreicht, hier geht es nur mit einem Bauprojekt weiter</li>
        {/each}
      </ul>
    {/if}

    {#if gained.length > 0}
      <h3>Ins Lager gekommen</h3>
      <div class="goods">
        {#each gained as entry (entry.item)}
          <div class="good-row">
            <Mark item={entry.item} size="s" />
            <span class="name">{itemName(entry.item)}</span>
            <span class="mono amount" class:full={report.fullItems.includes(entry.item)}>+{formatCount(entry.amount)}</span>
            {#if report.fullItems.includes(entry.item)}<span class="tag">voll</span>{/if}
          </div>
        {/each}
      </div>
    {/if}

    {#if openProjects.length > 0}
      <h3>Baustellen</h3>
      <div class="projects">
        {#each openProjects as p (p.id)}
          <div class="project">
            <span class="name">{PROJECT_BY_ID[p.id]?.name ?? p.id}</span>
            <span class="mono small">{Math.round(p.after * 100)} %</span>
            <Bar value={p.after} />
          </div>
        {/each}
      </div>
    {/if}

    {#if report.warnings.length > 0 || report.stoppedSeconds > 60}
      <h3>Was gebremst hat</h3>
      <ul class="events">
        {#each report.warnings as w, i (i)}
          <li class="warn">{formatOfflineWarning(w, currentLoco(game.state).fuel)}</li>
        {/each}
        {#if report.stoppedSeconds > 60}
          <li class="warn">Der Zug stand insgesamt {formatDuration(report.stoppedSeconds)}.</li>
        {/if}
      </ul>
    {:else if report.simulatedSeconds > 300}
      <p class="note good-note">Nichts ist ausgegangen. Der Zug ist durchgefahren.</p>
    {/if}
  </div>

  <footer>
    <button class="btn primary wide" type="button" onclick={() => game.dismissReport()}>Weiter</button>
  </footer>
</div>

<style>
  .backdrop {
    position: fixed;
    inset: 0;
    background: rgba(10, 16, 24, 0.5);
    z-index: 40;
  }

  .report {
    position: fixed;
    left: 0;
    right: 0;
    bottom: 0;
    max-height: 92vh;
    display: flex;
    flex-direction: column;
    background: var(--bg);
    border-top: 1px solid var(--line);
    border-radius: 16px 16px 0 0;
    box-shadow: 0 -8px 30px rgba(0, 0, 0, 0.3);
    z-index: 41;
    padding-bottom: var(--safe-bottom);
  }

  header {
    padding: 16px 18px 10px;
    border-bottom: 1px solid var(--line);
  }

  header .eyebrow {
    margin: 0 0 4px;
  }

  h2 {
    font-family: var(--display);
    font-size: 30px;
    font-weight: 700;
    margin: 0;
  }

  h3 {
    font-family: var(--display);
    font-size: 19px;
    font-weight: 600;
    margin: 18px 0 8px;
  }

  .body {
    overflow-y: auto;
    padding: 4px 18px 16px;
  }

  .headline {
    display: flex;
    align-items: baseline;
    flex-wrap: wrap;
    gap: 4px 10px;
    margin-top: 14px;
  }

  .big {
    font-family: var(--display);
    font-size: 40px;
    font-weight: 700;
    color: var(--accent-ink);
    line-height: 1;
  }

  .note {
    margin: 12px 0 0;
    padding: 10px 12px;
    border-radius: 8px;
    background: var(--surface-2);
    font-size: 14px;
  }

  .note.good-note {
    background: var(--good-soft);
    color: var(--good);
  }

  .events {
    list-style: none;
    padding: 0;
    margin: 0;
    display: grid;
    gap: 7px;
    font-size: 15px;
  }

  .events li {
    position: relative;
    padding-left: 16px;
  }

  .events li::before {
    content: '';
    position: absolute;
    left: 0;
    top: 0.55em;
    width: 7px;
    height: 7px;
    border-radius: 50%;
    background: var(--ink-2);
  }

  .events li.good::before {
    background: var(--good);
  }

  .events li.warn::before {
    background: var(--warn);
  }

  .goods {
    display: grid;
    gap: 6px;
  }

  .good-row {
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .good-row .name {
    flex: 1;
    min-width: 0;
    font-size: 15px;
  }

  .amount {
    font-weight: 600;
    color: var(--good);
  }

  .amount.full {
    color: var(--warn);
  }

  .tag {
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 0.04em;
    text-transform: uppercase;
    color: var(--warn);
    border: 1px solid var(--warn);
    border-radius: 999px;
    padding: 2px 7px;
  }

  .projects {
    display: grid;
    gap: 10px;
  }

  .project {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    gap: 4px 10px;
  }

  .project .name {
    font-size: 15px;
    font-weight: 500;
  }

  .project :global(.bar) {
    grid-column: 1 / -1;
  }

  .small {
    font-size: 13px;
  }

  footer {
    padding: 12px 18px 16px;
    border-top: 1px solid var(--line);
  }

  .wide {
    width: 100%;
  }
</style>
