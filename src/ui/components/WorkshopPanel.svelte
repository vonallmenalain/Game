<script lang="ts">
  /**
   * Die Werkstatt: Tender und Werkbank stehen fest, darunter scrollen die Rezepte,
   * nach Wagen gruppiert und filterbar. Die Menge je Tipp stellt man im Kopf der
   * Werkbank ein; der Knopf am Rezept sagt vorher, wie viele Aufträge daraus werden.
   */
  import {
    BALANCE,
    RECIPES,
    RECIPE_BY_ID,
    WAGONS,
    clearWorkbench,
    getStore,
    ingredientsOf,
    isRecipeUnlocked,
    machineRatePerMinute,
    machinesFor,
    outputBlocked,
    planCraft,
    queueCraftChain,
    shovelCoal,
    storeCap,
    wagonOfType,
    workbenchStalled,
    type ProductionWagonType,
  } from '../../engine';
  import { formatRate } from '../../lib/format';
  import { game } from '../game.svelte';
  import { WAGON_SHORT, itemName, machineName } from '../labels';
  import Bar from './Bar.svelte';
  import ItemChip from './ItemChip.svelte';
  import RecipeFlow from './RecipeFlow.svelte';
  import Vehicle from './Vehicle.svelte';

  const MENGEN = [1, 5, 10] as const;
  /** So oft läuft ein Rezept je Tipp auf den Knopf */
  let menge = $state<(typeof MENGEN)[number]>(1);
  /** Welcher Wagen in der Liste steht; «alle» zeigt jede Gruppe */
  let filter = $state<ProductionWagonType | 'alle'>('alle');

  const queue = $derived(game.state.workbench.queue);
  const head = $derived(queue[0] ? RECIPE_BY_ID[queue[0]] : undefined);
  /**
   * Die Werkbank arbeitet mit einfachem Tempo: Ausstoss ist Ausgabe je Rezeptdauer.
   * Wartet sie auf Zutaten oder ist das Lager voll, liefert sie gerade nichts.
   */
  const bankRate = $derived(head && !workbenchStalled(game.state) && !outputBlocked(game.state, head.id) ? ((head.outputs[0]?.amount ?? 0) / head.seconds) * 60 : 0);
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

  /** Rezepte nach Wagen gruppiert, mit dem Stand im Zug: So ist sichtbar, wer was herstellt. */
  const gruppen = $derived(
    WAGONS.filter((w) => w.type !== 'ernte' && w.type !== 'lager')
      .map((w) => ({
        typ: w.type as ProductionWagonType,
        name: w.name,
        wagen: wagonOfType(game.state, w.type),
        rezepte: RECIPES.filter((r) => r.wagon === w.type && isRecipeUnlocked(game.state, r.id)),
      }))
      .filter((g) => g.rezepte.length > 0),
  );
  const aktiverFilter = $derived(gruppen.some((g) => g.typ === filter) ? filter : 'alle');
  const sichtbar = $derived(aktiverFilter === 'alle' ? gruppen : gruppen.filter((g) => g.typ === aktiverFilter));

  /** Was der Zug schon selbst macht: Maschinen auf diesem Rezept und ihr Ausstoss */
  function imZug(typ: ProductionWagonType, recipeId: string): { n: number; rate: number } | null {
    const w = wagonOfType(game.state, typ);
    if (!w) return null;
    const maschinen = machinesFor(w, { recipe: recipeId });
    if (maschinen.length === 0) return null;
    return { n: maschinen.length, rate: maschinen.reduce((sum, m) => sum + machineRatePerMinute(game.state, w, m), 0) };
  }

  function bauen(id: string) {
    const plan = planCraft(game.state, id, menge);
    if (game.run(queueCraftChain(game.state, id, menge)) && plan.steps.length > 1) {
      const vorstufen = plan.steps.slice(0, -1).map((s) => RECIPE_BY_ID[s.recipe]?.name ?? s.recipe);
      game.showToast(`Zuerst ${vorstufen.join(', ')}.`);
    }
  }
</script>

<section class="werkstatt">
  <div class="tender">
    <span class="small">
      <ItemChip item="kohle" have={getStore(game.state, 'kohle')} size="s" tap />
      <span class="muted">von {storeCap(game.state)} im Lager</span>
    </span>
    <button type="button" class="btn primary small" onclick={() => game.run(shovelCoal(game.state))}>Kohle schaufeln</button>
  </div>

  <!-- Feste Höhe: Die Liste darunter darf nicht springen, wenn Aufträge dazukommen. -->
  <div class="werkbank">
    <div class="kopf">
      <span class="eyebrow stand">Werkbank · {queue.length}/{BALANCE.workbenchQueueMax}</span>
      <span class="rechts">
        <span class="menge" role="group" aria-label="Menge je Tipp">
          {#each MENGEN as m (m)}
            <button type="button" class:aktiv={menge === m} aria-pressed={menge === m} onclick={() => (menge = m)}>×{m}</button>
          {/each}
        </span>
        <button type="button" class="btn small ghost" disabled={queue.length === 0} onclick={() => game.run(clearWorkbench(game.state))}>Leeren</button>
      </span>
    </div>
    {#if head}
      <div class="laeuft">
        <RecipeFlow recipe={head.id} showStock={false} showNames={false} size="s" />
        <span class="name">{head.name}</span>
        <span class="muted small mono">{formatRate(bankRate)}</span>
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
      <p class="leer">Keine Aufträge. Tippe unten ein Rezept an, fehlende Vorstufen kommen automatisch dazu. Die Menge je Tipp stellst du oben ein.</p>
    {/if}
  </div>

  <div class="liste">
    <div class="filter" role="group" aria-label="Rezepte nach Wagen">
      <button type="button" class="fchip" class:aktiv={aktiverFilter === 'alle'} aria-pressed={aktiverFilter === 'alle'} onclick={() => (filter = 'alle')}>Alle</button>
      {#each gruppen as g (g.typ)}
        <button type="button" class="fchip" class:aktiv={aktiverFilter === g.typ} aria-pressed={aktiverFilter === g.typ} onclick={() => (filter = g.typ)}>
          <span class="mini"><Vehicle kind={g.typ} /></span>{WAGON_SHORT[g.typ]}
        </button>
      {/each}
    </div>
    {#each sichtbar as gruppe (gruppe.typ)}
      <div class="gruppe">
        <span class="silhouette"><Vehicle kind={gruppe.typ} /></span>
        <div class="gtext">
          <h3>{gruppe.name}</h3>
          <span class="small muted">
            {#if gruppe.wagen}
              im Zug · {gruppe.wagen.machines.length} {gruppe.wagen.machines.length === 1 ? machineName(gruppe.typ) : 'Maschinen'}
            {:else}
              nicht im Zug · hier von Hand
            {/if}
          </span>
        </div>
      </div>
      {#each gruppe.rezepte as r (r.id)}
        {@const zutaten = ingredientsOf(game.state, r.id)}
        {@const plan = planCraft(game.state, r.id, menge)}
        {@const geht = plan.missing.length === 0 && plan.orders <= frei}
        {@const voll = outputBlocked(game.state, r.id)}
        {@const zug = imZug(gruppe.typ, r.id)}
        <div class="rezept" class:gesperrt={!geht}>
          <div class="zeile">
            <span class="name">{r.name}</span>
            <span class="dauer mono muted">{r.seconds} s · {formatRate(((r.outputs[0]?.amount ?? 0) / r.seconds) * 60)}</span>
            <button type="button" class="btn small primary" disabled={!geht} title="{menge} × {r.name} einreihen" onclick={() => bauen(r.id)}>
              +{plan.orders || menge}
            </button>
          </div>
          <RecipeFlow recipe={r.id} tap />
          {#if zug}
            <p class="imzug small">Im Zug: {zug.n} × {machineName(gruppe.typ)} · {formatRate(zug.rate)}</p>
          {/if}
          <!-- Die Meldung steht immer da, auch leer: Sonst springt die Liste, sobald ein Lager volläuft. -->
          <p class="meldung" class:warn={plan.missing.length > 0 || plan.orders > frei || voll}>
            {#if plan.missing.length > 0}
              Es fehlt {plan.missing.map((m) => `${m.amount} ${itemName(m.item)}`).join(' und ')}. Das musst du ernten.
            {:else if plan.orders > frei}
              Braucht {plan.orders} Plätze in der Warteschlange, frei sind {frei}.
            {:else if plan.steps.length > 1}
              Baut zuerst {plan.steps
                .slice(0, -1)
                .map((s) => `${s.runs > 1 ? `${s.runs} × ` : ''}${RECIPE_BY_ID[s.recipe]?.name ?? s.recipe}`)
                .join(', ')}.
            {:else if voll}
              Das Lager für {r.outputs.map((o) => itemName(o.item)).join(', ')} ist voll.
            {:else if zutaten.length === 0}
              Braucht nichts, ausser Zeit.
            {/if}
          </p>
        </div>
      {/each}
    {/each}
  </div>
</section>

<style>
  /* Tender und Werkbank stehen fest, nur die Rezepte darunter scrollen. */
  .werkstatt {
    flex: 1;
    display: flex;
    flex-direction: column;
    min-height: 0;
    padding: 12px 16px 0;
  }

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
    height: 144px;
    display: flex;
    flex-direction: column;
    gap: 7px;
    padding: 8px 12px 10px;
    border: 1px solid var(--line);
    border-radius: 10px;
    background: var(--surface);
    margin-bottom: 10px;
    overflow: hidden;
  }

  .kopf {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
  }

  .kopf .eyebrow {
    margin: 0;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    min-width: 0;
  }

  .rechts {
    flex: none;
    display: flex;
    align-items: center;
    gap: 4px;
  }

  /* Die Menge je Tipp: ×1 für den Handgriff, ×5 und ×10 für den Vorrat */
  .menge {
    display: inline-flex;
    border: 1px solid var(--line);
    border-radius: 8px;
    overflow: hidden;
  }

  .menge button {
    min-width: 30px;
    min-height: 28px;
    padding: 0 5px;
    border: 0;
    border-right: 1px solid var(--line);
    background: transparent;
    font-size: 12px;
    font-weight: 600;
    font-family: var(--mono);
    color: var(--ink-2);
    cursor: pointer;
    touch-action: manipulation;
  }

  .menge button:last-child {
    border-right: 0;
  }

  .menge button.aktiv {
    background: var(--accent-soft);
    color: var(--accent-ink);
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

  .laeuft .small {
    flex: none;
    font-size: 12px;
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
    align-content: start;
    gap: 10px;
    flex: 1;
    min-height: 0;
    overflow-y: auto;
    margin: 0 -16px;
    padding: 0 16px 20px;
  }

  /* Der Filter klebt oben in der Liste: Man wechselt den Wagen, ohne hochzuscrollen. */
  /* Feste Höhe: Als Rollbereich im Raster bekäme die Zeile sonst keine Höhe. */
  .filter {
    position: sticky;
    top: 0;
    z-index: 2;
    display: flex;
    align-items: center;
    gap: 6px;
    height: 42px;
    margin: 0 -16px;
    padding: 2px 16px 8px;
    overflow-x: auto;
    overflow-y: hidden;
    scrollbar-width: none;
    background: var(--bg);
  }

  .filter::-webkit-scrollbar {
    display: none;
  }

  .fchip {
    flex: none;
    display: inline-flex;
    align-items: center;
    gap: 5px;
    min-height: 30px;
    padding: 2px 10px 2px 6px;
    border: 1px solid var(--line);
    border-radius: 999px;
    background: var(--surface);
    font-size: 12.5px;
    font-weight: 600;
    color: var(--ink-2);
    cursor: pointer;
    touch-action: manipulation;
  }

  .fchip.aktiv {
    border-color: var(--accent);
    background: var(--accent-soft);
    color: var(--accent-ink);
  }

  .mini {
    display: grid;
    place-items: center;
    width: 30px;
    height: 20px;
    overflow: hidden;
  }

  .gruppe {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-top: 6px;
  }

  .gtext {
    display: flex;
    flex-direction: column;
    line-height: 1.2;
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

  .imzug {
    margin: 0;
    color: var(--good);
  }
</style>
