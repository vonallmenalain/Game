<script lang="ts">
  /**
   * Die Forschung als Baum: oben die laufende Forschung mit der Warteschlange, in der
   * Mitte der Baum, unten die Karte der gewählten Technologie mit Kosten,
   * Voraussetzungen, dem, was sie bringt, und dem Knopf.
   */
  import {
    BALANCE,
    BIOME_BY_ID,
    PROJECT_BY_ID,
    TECH_BY_ID,
    cancelQueuedResearch,
    canResearch,
    dependentsOf,
    getStore,
    hasWagonOfType,
    isTechDone,
    isTechPlanned,
    startResearch,
    techUnlocks,
    type TechId,
  } from '../../engine';
  import { formatDuration } from '../../lib/format';
  import { game } from '../game.svelte';
  import { effectText, itemName } from '../labels';
  import { suggestedTech, techStatus } from '../research/tree';
  import Bar from './Bar.svelte';
  import ItemChip from './ItemChip.svelte';
  import TechMark from './TechMark.svelte';
  import TechTree from './TechTree.svelte';
  import Vehicle from './Vehicle.svelte';

  const current = $derived(game.state.techs.current);
  const currentDef = $derived(current ? TECH_BY_ID[current.id] : undefined);
  const queue = $derived(game.state.techs.queue);
  /** Ohne Konstruktionsbüro forscht die Werkstatt mit halbem Tempo */
  const tempo = $derived(hasWagonOfType(game.state, 'buero') ? 1 : 1 / BALANCE.workbenchResearchFactor);
  const rest = $derived(current && currentDef ? Math.max(0, currentDef.seconds - current.progress) * tempo : 0);
  const restlaufzeit = $derived(rest + queue.reduce((sum, id) => sum + (TECH_BY_ID[id]?.seconds ?? 0), 0) * tempo);

  let selected = $state<TechId | null>(suggestedTech(game.state));
  const tech = $derived(selected ? TECH_BY_ID[selected] : undefined);
  const status = $derived(selected ? techStatus(game.state, selected) : 'gesperrt');
  const unlocks = $derived(tech ? techUnlocks(tech.id) : null);
  const check = $derived(tech ? canResearch(game.state, tech.id) : null);
  const have = $derived(tech ? getStore(game.state, tech.cost.item) : 0);
  const dependents = $derived(tech ? dependentsOf(tech.id) : []);

  /** Voraussetzungen mit Stand: erforscht oder eingereiht zählt, sonst offen */
  const requirements = $derived.by(() => {
    if (!tech) return [];
    const list: { key: string; name: string; ok: boolean; tech?: TechId }[] = tech.requires.map((id) => ({
      key: id,
      name: TECH_BY_ID[id]?.name ?? id,
      ok: isTechDone(game.state, id) || isTechPlanned(game.state, id),
      tech: id,
    }));
    if (tech.requiresBiome) {
      list.push({ key: `biom/${tech.requiresBiome}`, name: `${BIOME_BY_ID[tech.requiresBiome]?.name ?? tech.requiresBiome} entdecken`, ok: game.state.discoveredBiomes.includes(tech.requiresBiome) });
    }
    if (tech.requiresProject) {
      list.push({ key: `projekt/${tech.requiresProject}`, name: `${PROJECT_BY_ID[tech.requiresProject]?.name ?? tech.requiresProject} fertigstellen`, ok: game.state.projects[tech.requiresProject]?.done === true });
    }
    return list;
  });
</script>

<section class="forschung">
  <!-- Feste Höhe: Der Baum darunter springt nicht, wenn eine Forschung anläuft oder fertig wird. -->
  <div class="laufend">
    {#if current && currentDef}
      <div class="zeile">
        <span class="eyebrow">Läuft</span>
        <span class="name">{currentDef.name}</span>
        <span class="mono small muted">noch {formatDuration(rest)}</span>
      </div>
      <Bar value={current.progress / currentDef.seconds} tone="good" />
      <div class="small muted danach">
        {#if queue.length > 0}
          Danach: {queue.map((id) => TECH_BY_ID[id]?.name ?? id).join(', ')} · zusammen noch {formatDuration(restlaufzeit)}
        {:else}
          Danach ist die Reihe frei{#if tempo > 1}. Ohne Konstruktionsbüro mit halbem Tempo{/if}.
        {/if}
      </div>
    {:else}
      <div class="zeile">
        <span class="eyebrow">Forschung</span>
        <span class="small muted">Nichts läuft. Tippe im Baum an, was du erforschen willst.</span>
      </div>
      <div class="small muted danach">Blaupausen werden beim Einreihen bezahlt, bis zu {BALANCE.researchQueueMax} Forschungen warten hintereinander.</div>
    {/if}
  </div>

  <TechTree {selected} onselect={(id) => (selected = id)} {tempo} />

  <div class="detail">
    {#if tech && unlocks}
      <div class="dkopf">
        <TechMark {tech} size="l" />
        <div class="dtitel">
          <h3>{tech.name}</h3>
          <span class="small muted">{tech.description}</span>
        </div>
        <div class="aktion">
          {#if status === 'erforscht'}
            <span class="tone-good small stand">erforscht</span>
          {:else if status === 'laeuft'}
            <span class="small muted stand">läuft</span>
          {:else if status === 'eingereiht'}
            <button type="button" class="btn small" onclick={() => game.run(cancelQueuedResearch(game.state, tech.id))}>Herausnehmen</button>
          {:else}
            <button type="button" class="btn small primary" disabled={!check?.ok} onclick={() => game.run(startResearch(game.state, tech.id))}>
              {current ? 'Einreihen' : 'Forschen'}
            </button>
          {/if}
        </div>
      </div>
      <div class="dzeilen">
        {#if status !== 'erforscht' && status !== 'laeuft'}
          <div class="dzeile">
            <span class="k">Kosten</span>
            <span class="v">
              <ItemChip item={tech.cost.item} size="s" tap />
              <span class:tone-warn={have < tech.cost.amount}>{tech.cost.amount} {itemName(tech.cost.item)} <span class="muted">({have} da)</span></span>
              <span class="muted">· {formatDuration(tech.seconds * tempo)}</span>
            </span>
          </div>
        {/if}
        {#if requirements.length > 0 && status !== 'erforscht'}
          <div class="dzeile">
            <span class="k">Braucht</span>
            <span class="v chips">
              {#each requirements as r (r.key)}
                {#if r.tech}
                  <button type="button" class="req" class:ok={r.ok} onclick={() => (selected = r.tech ?? selected)}>{r.ok ? '✓' : '○'} {r.name}</button>
                {:else}
                  <span class="req" class:ok={r.ok}>{r.ok ? '✓' : '○'} {r.name}</span>
                {/if}
              {/each}
            </span>
          </div>
        {/if}
        <div class="dzeile">
          <span class="k">Bringt</span>
          <span class="v chips">
            {#each unlocks.wagons as w (w.type)}
              <span class="bringt"><span class="mini"><Vehicle kind={w.type} /></span>{w.name}</span>
            {/each}
            {#each unlocks.recipes as r (r.id)}
              <ItemChip item={r.outputs[0]?.item ?? ''} size="s" showName tap />
            {/each}
            {#each unlocks.projects as p (p.id)}
              <span class="bringt">Bauprojekt {p.name}</span>
            {/each}
            {#each unlocks.effects as e, i (i)}
              <span class="bringt">{effectText(e)}</span>
            {/each}
          </span>
        </div>
        {#if dependents.length > 0}
          <div class="dzeile">
            <span class="k">Führt zu</span>
            <span class="v chips">
              {#each dependents as d (d.id)}
                <button type="button" class="req" class:ok={isTechDone(game.state, d.id)} onclick={() => (selected = d.id)}>{d.name}</button>
              {/each}
            </span>
          </div>
        {/if}
      </div>
    {/if}
  </div>
</section>

<style>
  .forschung {
    flex: 1;
    min-height: 0;
    display: flex;
    flex-direction: column;
  }

  .laufend {
    flex: none;
    height: 74px;
    display: flex;
    flex-direction: column;
    justify-content: center;
    gap: 5px;
    padding: 6px 16px;
    border-bottom: 1px solid var(--line);
    background: var(--surface);
    overflow: hidden;
  }

  .zeile {
    display: flex;
    align-items: baseline;
    gap: 8px;
    min-width: 0;
  }

  .zeile .eyebrow {
    margin: 0;
    flex: none;
  }

  .zeile .name {
    flex: 1;
    min-width: 0;
    font-weight: 600;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .small {
    font-size: 13px;
  }

  .danach {
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  /* Die Karte unten hat ihren Platz, der Baum darüber nimmt den Rest */
  .detail {
    flex: none;
    max-height: 46%;
    overflow-y: auto;
    padding: 10px 16px 12px;
    border-top: 1px solid var(--line);
    background: var(--surface);
  }

  .dkopf {
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .dtitel {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    line-height: 1.2;
  }

  h3 {
    margin: 0;
    font-family: var(--display);
    font-size: 22px;
    font-weight: 700;
    line-height: 1.05;
  }

  .aktion {
    flex: none;
  }

  .stand {
    font-weight: 600;
  }

  .dzeilen {
    display: grid;
    gap: 6px;
    margin-top: 8px;
  }

  .dzeile {
    display: grid;
    grid-template-columns: 62px minmax(0, 1fr);
    gap: 8px;
    align-items: start;
    font-size: 13px;
  }

  .k {
    padding-top: 3px;
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: var(--ink-2);
  }

  .v {
    display: flex;
    align-items: center;
    gap: 6px;
    min-width: 0;
  }

  .chips {
    flex-wrap: wrap;
    align-items: flex-start;
  }

  .req {
    display: inline-flex;
    align-items: center;
    min-height: 26px;
    padding: 2px 9px;
    border: 1px solid var(--line);
    border-radius: 999px;
    background: var(--bg);
    color: var(--warn);
    font: inherit;
    font-size: 12.5px;
    font-weight: 600;
    cursor: pointer;
    touch-action: manipulation;
  }

  .req.ok {
    color: var(--good);
  }

  span.req {
    cursor: default;
  }

  .bringt {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    min-height: 26px;
    padding: 2px 9px 2px 6px;
    border-radius: 999px;
    background: var(--accent-soft);
    color: var(--accent-ink);
    font-size: 12.5px;
    font-weight: 600;
  }

  .mini {
    display: grid;
    place-items: center;
    width: 30px;
    height: 20px;
    overflow: hidden;
  }
</style>
