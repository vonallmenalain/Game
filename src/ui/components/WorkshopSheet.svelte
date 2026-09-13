<script lang="ts">
  import {
    BALANCE,
    RECIPES,
    RECIPE_BY_ID,
    WAGONS,
    clearWorkbench,
    getStore,
    ingredientsOf,
    isRecipeUnlocked,
    outputBlocked,
    planCraft,
    queueCraftChain,
    shovelCoal,
    storeCap,
    type ProductionWagonType,
  } from '../../engine';
  import { game } from '../game.svelte';
  import { WAGON_COLOR, itemName } from '../labels';
  import Bar from './Bar.svelte';
  import ItemChip from './ItemChip.svelte';
  import RecipeFlow from './RecipeFlow.svelte';
  import Vehicle from './Vehicle.svelte';

  const queue = $derived(game.state.workbench.queue);
  const head = $derived(queue[0] ? RECIPE_BY_ID[queue[0]] : undefined);
  const progress = $derived(head ? game.state.workbench.progress / head.seconds : 0);
  const frei = $derived(BALANCE.workbenchQueueMax - queue.length);

  /** Gleiche Aufträge hintereinander werden zusammengezogen: «Koks ×6» statt sechs Chips. */
  const wartend = $derived.by(() => {
    const gruppen: { recipe: string; anzahl: number }[] = [];
    for (const id of queue.slice(1)) {
      const letzte = gruppen[gruppen.length - 1];
      if (letzte && letzte.recipe === id) letzte.anzahl += 1;
      else gruppen.push({ recipe: id, anzahl: 1 });
    }
    return gruppen;
  });

  /** Rezepte nach Wagen gruppiert: So ist sichtbar, wer was herstellt. */
  const gruppen = $derived(
    WAGONS.filter((w) => w.type !== 'ernte' && w.type !== 'lager')
      .map((w) => ({
        typ: w.type as ProductionWagonType,
        name: w.name,
        rezepte: RECIPES.filter((r) => r.wagon === w.type && isRecipeUnlocked(game.state, r.id)),
      }))
      .filter((g) => g.rezepte.length > 0),
  );

  function bauen(id: string) {
    const plan = planCraft(game.state, id);
    if (game.run(queueCraftChain(game.state, id)) && plan.steps.length > 1) {
      const vorstufen = plan.steps.slice(0, -1).map((s) => RECIPE_BY_ID[s.recipe]?.name ?? s.recipe);
      game.showToast(`Zuerst ${vorstufen.join(', ')}.`);
    }
  }
</script>

<div class="tender">
  <span class="small">
    <ItemChip item="kohle" have={getStore(game.state, 'kohle')} size="s" />
    <span class="muted">von {storeCap(game.state)} im Lager</span>
  </span>
  <button type="button" class="btn primary small" onclick={() => game.run(shovelCoal(game.state))}>Kohle schaufeln</button>
</div>

<!-- Feste Höhe: Die Liste darunter darf nicht springen, wenn Aufträge dazukommen. -->
<div class="werkbank">
  <div class="kopf">
    <span class="eyebrow">Werkbank · {queue.length} von {BALANCE.workbenchQueueMax}</span>
    <button type="button" class="btn small ghost" disabled={queue.length === 0} onclick={() => game.run(clearWorkbench(game.state))}>Leeren</button>
  </div>
  {#if head}
    <div class="laeuft">
      <RecipeFlow recipe={head.id} showStock={false} size="s" />
      <span class="name">{head.name}</span>
    </div>
    <Bar value={progress} tone="good" />
    <div class="schlange">
      {#each wartend as gruppe, i (i)}
        <span class="wartet">
          {RECIPE_BY_ID[gruppe.recipe]?.name ?? gruppe.recipe}{#if gruppe.anzahl > 1}<b class="mono">&#8202;×{gruppe.anzahl}</b>{/if}
        </span>
      {/each}
      {#if queue.length === 1}<span class="muted small">danach ist die Werkbank frei</span>{/if}
    </div>
  {:else}
    <p class="leer">Keine Aufträge. Tippe unten ein Rezept an, fehlende Vorstufen kommen automatisch dazu.</p>
  {/if}
</div>

<div class="liste">
  {#each gruppen as gruppe (gruppe.typ)}
    <div class="gruppe">
      <span class="silhouette"><Vehicle kind={gruppe.typ} color={WAGON_COLOR[gruppe.typ]} rolling={false} /></span>
      <h3>{gruppe.name}</h3>
    </div>
    {#each gruppe.rezepte as r (r.id)}
      {@const zutaten = ingredientsOf(game.state, r.id)}
      {@const plan = planCraft(game.state, r.id)}
      {@const geht = plan.missing.length === 0 && plan.orders <= frei}
      {@const voll = outputBlocked(game.state, r.id)}
      <div class="rezept" class:gesperrt={!geht}>
        <div class="zeile">
          <span class="name">{r.name}</span>
          <span class="dauer mono muted">{r.seconds} s</span>
          <button type="button" class="btn small primary" disabled={!geht} onclick={() => bauen(r.id)}>
            +{plan.orders || 1}
          </button>
        </div>
        <RecipeFlow recipe={r.id} />
        {#if plan.missing.length > 0}
          <p class="hinweis warn">Es fehlt {plan.missing.map((m) => `${m.amount} ${itemName(m.item)}`).join(' und ')}. Das musst du ernten.</p>
        {:else if plan.orders > frei}
          <p class="hinweis warn">Braucht {plan.orders} Plätze in der Warteschlange, frei sind {frei}.</p>
        {:else if plan.steps.length > 1}
          <p class="hinweis">Baut zuerst {plan.steps.slice(0, -1).map((s) => RECIPE_BY_ID[s.recipe]?.name ?? s.recipe).join(', ')}.</p>
        {:else if voll}
          <p class="hinweis warn">Das Lager für {r.outputs.map((o) => itemName(o.item)).join(', ')} ist voll.</p>
        {:else if zutaten.length === 0}
          <p class="hinweis">Braucht nichts, ausser Zeit.</p>
        {/if}
      </div>
    {/each}
  {/each}
</div>

<style>
  .tender {
    flex: none;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
    margin-bottom: 12px;
  }

  .small {
    font-size: 13px;
  }

  .tender .small {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  /* Feste Höhe für beide Zustände: leer und arbeitend. Nur so bleibt die Liste
     darunter stehen, wenn Aufträge dazukommen. */
  .werkbank {
    flex: none;
    height: 140px;
    display: flex;
    flex-direction: column;
    gap: 7px;
    padding: 10px 12px;
    border: 1px solid var(--line);
    border-radius: 10px;
    background: var(--surface);
    margin-bottom: 12px;
    overflow: hidden;
  }

  .kopf {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  .kopf .eyebrow {
    margin: 0;
  }

  .laeuft {
    display: flex;
    align-items: center;
    gap: 10px;
    min-width: 0;
  }

  .laeuft .name {
    font-size: 14px;
    font-weight: 600;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .schlange {
    display: flex;
    align-items: center;
    gap: 4px;
    height: 26px;
    flex: none;
    overflow-x: auto;
    scrollbar-width: none;
  }

  .schlange::-webkit-scrollbar {
    display: none;
  }

  .wartet {
    flex: none;
    font-size: 12px;
    padding: 2px 8px;
    border-radius: 999px;
    background: var(--surface-2);
    white-space: nowrap;
  }

  .wartet b {
    font-weight: 700;
    color: var(--accent-ink);
  }

  .leer {
    margin: 0;
    font-size: 13.5px;
    color: var(--ink-2);
  }

  /* Nur die Rezepte scrollen. Tender und Werkbank darüber bleiben stehen. */
  .liste {
    display: grid;
    gap: 10px;
    flex: 1;
    min-height: 0;
    overflow-y: auto;
    margin: 0 -16px;
    padding: 0 16px 20px;
  }

  .gruppe {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-top: 8px;
  }

  .gruppe:first-child {
    margin-top: 0;
  }

  .silhouette {
    display: grid;
    place-items: center;
    width: 44px;
    height: 32px;
    overflow: hidden;
    flex: none;
  }

  .gruppe h3 {
    font-family: var(--display);
    font-size: 20px;
    font-weight: 600;
    margin: 0;
  }

  .rezept {
    display: grid;
    gap: 7px;
    padding: 10px 12px;
    border: 1px solid var(--line);
    border-radius: 9px;
    background: var(--surface);
  }

  .rezept.gesperrt {
    background: transparent;
  }

  .zeile {
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .name {
    flex: 1;
    min-width: 0;
    font-weight: 600;
  }

  .dauer {
    font-size: 12px;
  }

  .hinweis {
    margin: 0;
    font-size: 12.5px;
    color: var(--ink-2);
  }

  .hinweis.warn {
    color: var(--warn);
  }
</style>
