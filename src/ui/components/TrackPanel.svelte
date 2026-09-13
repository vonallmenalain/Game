<script lang="ts">
  import { BIOMES, OBSTACLES, PROJECTS, PROJECT_BY_ID, TECH_BY_ID, currentLoco, isProjectUnlocked, projectProgress, setProjectPaused } from '../../engine';
  import { formatLog } from '../../i18n/de-CH';
  import { formatCount, formatDuration, formatKm } from '../../lib/format';
  import { game } from '../game.svelte';
  import { itemName } from '../labels';
  import Bar from './Bar.svelte';

  const END_KM = 48;
  const x = (km: number) => 30 + (Math.min(km, END_KM) / END_KM) * 940;
  const biomeColor: Record<string, string> = { tal: '#7a9a6a', wald: '#3f6b46', berg: '#6b7c93', wueste: '#c9a860' };
  const loco = $derived(currentLoco(game.state));
  const projects = $derived(PROJECTS.filter((p) => !p.preview));
  const log = $derived([...game.state.log].reverse().slice(0, 25));
</script>

<section class="track">
  <div class="mapwrap">
    <svg viewBox="0 0 1000 120" role="img" aria-label="Streckenkarte">
      {#each BIOMES as b, i (b.id)}
        {@const next = BIOMES[i + 1]?.startKm ?? END_KM}
        {@const known = game.state.discoveredBiomes.includes(b.id)}
        <rect x={x(b.startKm)} y="52" width={x(next) - x(b.startKm)} height="14" fill={biomeColor[b.id] ?? '#888'} opacity={known ? 1 : 0.3} />
        <text x={x(b.startKm) + 6} y="90" font-size="15" fill="var(--ink)" opacity={known ? 1 : 0.5}>{known || b.preview ? b.name : '?'}</text>
      {/each}
      {#each OBSTACLES as o (o.id)}
        {@const done = game.state.projects[o.project]?.done}
        <line x1={x(o.km)} x2={x(o.km)} y1="40" y2="78" stroke={done ? 'var(--good)' : 'var(--warn)'} stroke-width="3" />
        <text x={x(o.km)} y="32" font-size="13" text-anchor="middle" fill="var(--ink-2)">{o.name}</text>
      {/each}
      <g transform="translate({x(game.state.km)} 59)">
        <circle r="9" fill="var(--accent)" stroke="var(--bg)" stroke-width="3" />
      </g>
      <text x={x(game.state.km)} y="112" font-size="13" text-anchor="middle" fill="var(--accent-ink)" font-weight="600">{formatKm(game.state.km)}</text>
    </svg>
  </div>

  <h3 class="section-title">Lok</h3>
  <div class="card">
    <div class="title">{loco.name}</div>
    <div class="small muted">{loco.slots} Wagen · {loco.speedKmh} km/h · {loco.fuelPerKm} {itemName(loco.fuel)} je km · 100 Schienen je km</div>
  </div>

  <h3 class="section-title">Bauprojekte</h3>
  <div class="projects">
    {#each projects as p (p.id)}
      {@const st = game.state.projects[p.id]}
      {@const unlocked = isProjectUnlocked(game.state, p.id)}
      <div class="card project" class:done={st?.done} class:locked={!unlocked}>
        <div class="row">
          <div>
            <div class="title">{p.name}</div>
            <div class="small muted">
              {#if st?.done}
                fertig nach {formatDuration(st.doneAt ?? 0)} Spielzeit
              {:else if !unlocked}
                braucht die Technologie {p.tech ? (TECH_BY_ID[p.tech]?.name ?? p.tech) : ''}
              {:else}
                {Math.round(projectProgress(game.state, p.id) * 100)} Prozent
              {/if}
            </div>
          </div>
          {#if unlocked && !st?.done}
            <button type="button" class="btn small" onclick={() => game.run(setProjectPaused(game.state, p.id, !st?.paused))}>{st?.paused ? 'Weiterbauen' : 'Pausieren'}</button>
          {/if}
        </div>
        {#if !st?.done}
          <div class="bom">
            {#each p.bom as line (line.item)}
              {@const have = Math.min(line.amount, st?.delivered[line.item] ?? 0)}
              <span class="small">{itemName(line.item)}</span>
              <Bar value={have / line.amount} tone={unlocked ? 'accent' : 'mute'} />
              <span class="mono small right">{formatCount(have)} / {formatCount(line.amount)}</span>
            {/each}
          </div>
        {/if}
      </div>
    {/each}
    <div class="card locked">
      <div class="title">{PROJECT_BY_ID['wuestenstrecke']?.name}</div>
      <div class="small muted">Kommt im nächsten Stand. Hier endet der erste.</div>
    </div>
  </div>

  <h3 class="section-title">Fahrtenbuch</h3>
  <ol class="log">
    {#each log as entry, i (i)}
      <li><span class="mono muted">{formatDuration(entry.at)}</span> {formatLog(entry)}</li>
    {/each}
  </ol>
</section>

<style>
  .track {
    padding: 12px 16px 24px;
  }

  .mapwrap {
    overflow-x: auto;
  }

  svg {
    width: 100%;
    min-width: 520px;
    height: auto;
    display: block;
  }

  .small {
    font-size: 13px;
  }

  .title {
    font-weight: 600;
  }

  .projects {
    display: grid;
    gap: 8px;
  }

  .project.locked {
    opacity: 0.7;
  }

  .project.done {
    border-color: var(--good);
  }

  .row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
  }

  .bom {
    display: grid;
    grid-template-columns: minmax(80px, auto) minmax(0, 1fr) auto;
    align-items: center;
    gap: 6px 10px;
    margin-top: 10px;
  }

  .right {
    text-align: right;
  }

  .log {
    list-style: none;
    padding: 0;
    margin: 0;
    display: grid;
    gap: 6px;
    font-size: 14px;
  }

  .log .mono {
    font-size: 12px;
    margin-right: 6px;
  }
</style>
