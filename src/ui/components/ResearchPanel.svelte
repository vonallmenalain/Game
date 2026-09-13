<script lang="ts">
  import {
    BALANCE,
    ITEM_BY_ID,
    TECHS,
    TECH_BY_ID,
    cancelQueuedResearch,
    canResearch,
    getStore,
    hasWagonOfType,
    isTechDone,
    isTechPlannable,
    isTechPlanned,
    startResearch,
  } from '../../engine';
  import { formatDuration } from '../../lib/format';
  import { game } from '../game.svelte';
  import { TIER_NAME, itemName, techRequirementText } from '../labels';
  import Bar from './Bar.svelte';

  const current = $derived(game.state.techs.current);
  const currentDef = $derived(current ? TECH_BY_ID[current.id] : undefined);
  const queue = $derived(game.state.techs.queue);
  const tiers = $derived([1, 2, 3].map((tier) => ({ tier, techs: TECHS.filter((t) => ITEM_BY_ID[t.cost.item]?.tier === tier) })));
  /** Ohne Konstruktionsbüro forscht die Werkstatt mit halbem Tempo */
  const tempo = $derived(hasWagonOfType(game.state, 'buero') ? 1 : 1 / BALANCE.workbenchResearchFactor);
  const restlaufzeit = $derived.by(() => {
    const offen = current && currentDef ? Math.max(0, currentDef.seconds - current.progress) : 0;
    return (offen + queue.reduce((sum, id) => sum + (TECH_BY_ID[id]?.seconds ?? 0), 0)) * tempo;
  });
</script>

<section class="research">
  {#if current && currentDef}
    <div class="card running">
      <p class="eyebrow">Läuft</p>
      <div class="title">{currentDef.name}</div>
      <Bar value={current.progress / currentDef.seconds} tone="good" />
      <div class="small muted">
        noch etwa {formatDuration(Math.max(0, currentDef.seconds - current.progress) * tempo)}{#if tempo > 1}, ohne Konstruktionsbüro mit halbem Tempo{/if}
      </div>

      {#if queue.length > 0}
        <p class="eyebrow reihe">Danach · {queue.length} von {BALANCE.researchQueueMax}</p>
        <ol class="schlange">
          {#each queue as id, i (id)}
            {@const def = TECH_BY_ID[id]}
            <li>
              <span class="nr mono">{i + 1}</span>
              <span class="name">{def?.name ?? id}</span>
              <span class="muted small mono">{formatDuration((def?.seconds ?? 0) * tempo)}</span>
              <button type="button" class="btn ghost weg" aria-label="{def?.name ?? id} aus der Warteschlange nehmen" onclick={() => game.run(cancelQueuedResearch(game.state, id))}>×</button>
            </li>
          {/each}
        </ol>
        <div class="small muted">Alles zusammen noch etwa {formatDuration(restlaufzeit)}. Wer eine Forschung herausnimmt, bekommt ihre Blaupausen zurück.</div>
      {/if}
    </div>
  {:else}
    <p class="muted small">Keine Forschung aktiv. Blaupausen werden beim Einreihen bezahlt, mehrere Forschungen warten nacheinander.</p>
  {/if}

  {#each tiers as group (group.tier)}
    <h3 class="section-title">{TIER_NAME[group.tier]}</h3>
    <div class="list">
      {#each group.techs as t (t.id)}
        {@const done = isTechDone(game.state, t.id)}
        {@const geplant = isTechPlanned(game.state, t.id)}
        {@const machbar = isTechPlannable(game.state, t.id)}
        {@const check = canResearch(game.state, t.id)}
        {@const have = getStore(game.state, t.cost.item)}
        <div class="entry" class:done class:locked={!done && !geplant && !machbar}>
          <div class="text">
            <div class="title">
              {t.name}
              {#if done}<span class="tone-good small">erforscht</span>{:else if geplant}<span class="muted small">eingereiht</span>{/if}
            </div>
            <div class="small muted">{t.description}</div>
            {#if !done && !geplant}
              <div class="small">
                <span class:tone-warn={have < t.cost.amount}>{t.cost.amount} {itemName(t.cost.item)} <span class="muted">({have})</span></span>
                · {formatDuration(t.seconds * tempo)}
                {#if !machbar}<br /><span class="tone-warn">Braucht: {techRequirementText(game.state, t)}</span>{/if}
              </div>
            {/if}
          </div>
          {#if !done && !geplant}
            <button type="button" class="btn primary small" disabled={!check.ok} onclick={() => game.run(startResearch(game.state, t.id))}>
              {current ? 'Einreihen' : 'Forschen'}
            </button>
          {/if}
        </div>
      {/each}
    </div>
  {/each}
</section>

<style>
  .research {
    padding: 12px 16px 24px;
  }

  .small {
    font-size: 13px;
  }

  .running {
    display: grid;
    gap: 6px;
  }

  .running .eyebrow {
    margin: 0;
  }

  .reihe {
    margin-top: 4px;
  }

  /* Die Warteschlange ist bezahlt: Darum steht bei jeder Zeile, wie man sie zurückholt. */
  .schlange {
    list-style: none;
    margin: 0;
    padding: 0;
    display: grid;
    gap: 2px;
  }

  .schlange li {
    display: flex;
    align-items: center;
    gap: 8px;
    min-width: 0;
  }

  .schlange .nr {
    width: 14px;
    font-size: 12px;
    color: var(--ink-2);
  }

  .schlange .name {
    flex: 1;
    min-width: 0;
    font-size: 14px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .weg {
    flex: none;
    width: 30px;
    height: 28px;
    padding: 0;
    font-size: 15px;
    line-height: 1;
    color: var(--ink-2);
  }

  .list {
    display: grid;
    gap: 6px;
  }

  .entry {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 8px 0;
    border-bottom: 1px solid var(--line);
  }

  .entry.locked {
    opacity: 0.7;
  }

  .entry.done {
    opacity: 0.6;
  }

  .text {
    flex: 1;
    min-width: 0;
  }

  .title {
    font-weight: 600;
  }
</style>
