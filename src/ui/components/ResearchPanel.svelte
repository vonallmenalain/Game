<script lang="ts">
  import { ITEM_BY_ID, TECHS, TECH_BY_ID, canResearch, getStore, isTechAvailable, isTechDone, startResearch } from '../../engine';
  import { formatDuration } from '../../lib/format';
  import { game } from '../game.svelte';
  import { TIER_NAME, itemName, techRequirementText } from '../labels';
  import Bar from './Bar.svelte';

  const current = $derived(game.state.techs.current);
  const currentDef = $derived(current ? TECH_BY_ID[current.id] : undefined);
  const tiers = $derived([1, 2, 3].map((tier) => ({ tier, techs: TECHS.filter((t) => ITEM_BY_ID[t.cost.item]?.tier === tier) })));
</script>

<section class="research">
  {#if current && currentDef}
    <div class="card running">
      <p class="eyebrow">Läuft</p>
      <div class="title">{currentDef.name}</div>
      <Bar value={current.progress / currentDef.seconds} tone="good" />
      <div class="small muted">noch etwa {formatDuration(Math.max(0, currentDef.seconds - current.progress) * (game.state.wagons.some((w) => w.type === 'buero') ? 1 : 2))}{#if !game.state.wagons.some((w) => w.type === 'buero')}, ohne Konstruktionsbüro mit halbem Tempo{/if}</div>
    </div>
  {:else}
    <p class="muted small">Keine Forschung aktiv. Blaupausen werden beim Start bezahlt.</p>
  {/if}

  {#each tiers as group (group.tier)}
    <h3 class="section-title">{TIER_NAME[group.tier]}</h3>
    <div class="list">
      {#each group.techs as t (t.id)}
        {@const done = isTechDone(game.state, t.id)}
        {@const available = isTechAvailable(game.state, t.id)}
        {@const check = canResearch(game.state, t.id)}
        {@const have = getStore(game.state, t.cost.item)}
        <div class="entry" class:done class:locked={!done && !available}>
          <div class="text">
            <div class="title">{t.name} {#if done}<span class="tone-good small">erforscht</span>{/if}</div>
            <div class="small muted">{t.description}</div>
            {#if !done}
              <div class="small">
                <span class:tone-warn={have < t.cost.amount}>{t.cost.amount} {itemName(t.cost.item)} <span class="muted">({have})</span></span>
                · {formatDuration(t.seconds)}
                {#if !available}<br /><span class="tone-warn">Braucht: {techRequirementText(game.state, t)}</span>{/if}
              </div>
            {/if}
          </div>
          {#if !done}
            <button type="button" class="btn primary small" disabled={!check.ok} onclick={() => game.run(startResearch(game.state, t.id))}>Forschen</button>
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
