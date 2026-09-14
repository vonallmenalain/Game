<script lang="ts">
  /**
   * Die Übersicht einer Ware: Bestand und Saldo, wer sie gerade herstellt und wer sie
   * verbraucht, woher sie kommt bis zum Rohstoff, und wofür sie gebraucht wird, soweit
   * das schon freigeschaltet ist. Sie legt sich unter die Bühne, nie darüber.
   */
  import {
    BIOMES,
    ITEM_BY_ID,
    consumersOf,
    flowSources,
    getStore,
    isProjectUnlocked,
    isRecipeUnlocked,
    isResourceDiscovered,
    producerOf,
    productionTree,
    projectsNeeding,
    storeCap,
    TECH_BY_ID,
    type ProductionNode,
  } from '../../engine';
  import { formatCount, formatRate, formatSignedRate } from '../../lib/format';
  import { game } from '../game.svelte';
  import { TIER_NAME, itemName, itemTint, sourceLabel, wagonName } from '../labels';
  import Bar from './Bar.svelte';
  import ItemChip from './ItemChip.svelte';
  import Mark from './Mark.svelte';
  import RecipeFlow from './RecipeFlow.svelte';

  const item = $derived(game.item ?? '');
  const def = $derived(ITEM_BY_ID[item]);
  const stock = $derived(getStore(game.state, item));
  const cap = $derived(storeCap(game.state));
  const saldo = $derived(game.rates[item] ?? 0);
  const quellen = $derived(flowSources(game.state)[item] ?? []);
  const her = $derived(quellen.filter((q) => q.perMinute > 0));
  const weg = $derived(quellen.filter((q) => q.perMinute < 0));
  const producer = $derived(producerOf(item));
  const producerUnlocked = $derived(producer ? isRecipeUnlocked(game.state, producer.id) : false);
  const baum = $derived(productionTree(item));
  const tief = $derived(baum.children.some((c) => c.children.length > 0));
  const heimat = $derived(BIOMES.filter((b) => def?.homeBiomes?.includes(b.id)).map((b) => b.name));
  const verwendungen = $derived(consumersOf(item).filter((r) => isRecipeUnlocked(game.state, r.id)));
  const projekte = $derived(projectsNeeding(item).filter((p) => isProjectUnlocked(game.state, p.id) && !game.state.projects[p.id]?.done));
  const artText = $derived(
    def?.kind === 'rohstoff' ? 'Rohstoff' : `${TIER_NAME[def?.tier ?? 0]} · ${def?.kind === 'blaupause' ? 'Blaupause' : 'Ware'}`,
  );

  function close() {
    game.closeItem();
  }

  function onkey(e: KeyboardEvent) {
    if (e.key === 'Escape') close();
  }
</script>

<svelte:window onkeydown={onkey} />

{#snippet knoten(node: ProductionNode, wurzel: boolean)}
  <li>
    <span class="knoten">
      <ItemChip item={node.item} size="s" tap={node.item !== item} />
      <span class="text">
        <span class="name">{itemName(node.item)}{#if !wurzel}<span class="mono muted menge"> ×{node.amount}</span>{/if}</span>
        <span class="muted small">{node.recipe ? `${wagonName(node.recipe.wagon)} · ${node.recipe.seconds} s` : 'Rohstoff'}</span>
      </span>
    </span>
    {#if node.children.length > 0}
      <ul>
        {#each node.children as child (child.item)}
          {@render knoten(child, false)}
        {/each}
      </ul>
    {/if}
  </li>
{/snippet}

{#if def}
  <div class="sheet" role="dialog" aria-modal="true" aria-label="{def.name}: Übersicht">
    <button type="button" class="schleier" aria-label="Übersicht schliessen" tabindex="-1" onclick={close}></button>
    <section class="karte" style="--tint: {itemTint(item)}">
      <header>
        <Mark {item} size="l" />
        <div class="titel">
          <h2>{def.name}</h2>
          <span class="muted small">{artText}</span>
        </div>
        <button type="button" class="btn ghost schliessen" aria-label="Schliessen" onclick={close}>×</button>
      </header>

      <div class="inhalt">
        <div class="kennzahlen">
          <div class="zahl">
            <span class="eyebrow">Im Lager</span>
            <b class="mono" class:tone-warn={stock >= cap}>{formatCount(stock)}</b>
            <span class="muted small">von {formatCount(cap)}</span>
          </div>
          <div class="zahl">
            <span class="eyebrow">Saldo</span>
            <b class="mono" class:tone-good={saldo > 0.05} class:tone-warn={saldo < -0.05}>{formatSignedRate(saldo)}</b>
            <span class="muted small">Stand von jetzt</span>
          </div>
        </div>
        <Bar value={stock / cap} tone={stock >= cap ? 'warn' : 'accent'} />

        <div class="fluss">
          <div>
            <p class="eyebrow">Herstellung</p>
            {#if her.length > 0}
              <ul class="quellen">
                {#each her as q, i (i)}
                  <li><span>{sourceLabel(q)}</span><span class="mono tone-good">+{formatRate(q.perMinute)}</span></li>
                {/each}
              </ul>
            {:else}
              <p class="small muted leer">Gerade stellt nichts {def.name} her.</p>
            {/if}
          </div>
          <div>
            <p class="eyebrow">Verbrauch</p>
            {#if weg.length > 0}
              <ul class="quellen">
                {#each weg as q, i (i)}
                  <li><span>{sourceLabel(q)}</span><span class="mono tone-warn">{formatRate(q.perMinute)}</span></li>
                {/each}
              </ul>
            {:else}
              <p class="small muted leer">Gerade verbraucht nichts {def.name}.</p>
            {/if}
          </div>
        </div>

        <p class="eyebrow">Woher</p>
        {#if def.kind === 'rohstoff'}
          <p class="small">
            Rohstoff, geerntet vom Erntewagen{heimat.length > 0 ? `, zu Hause in: ${heimat.join(', ')}` : ''}. {def.harvestPerMinute ?? 0}/min je Erntemaschine, vor Ort mehr.
            {#if !isResourceDiscovered(game.state, item)}<span class="tone-warn">Noch nicht entdeckt.</span>{/if}
          </p>
        {:else if producer}
          <div class="rezept">
            <RecipeFlow recipe={producer.id} tap />
            <p class="small muted">
              {wagonName(producer.wagon)} oder Werkbank · {producer.seconds} s je Lauf{#if !producerUnlocked}
                · braucht {producer.techs.map((t) => TECH_BY_ID[t]?.name ?? t).join(', ')}{/if}
            </p>
          </div>
          {#if tief}
            <p class="eyebrow">Kette bis zum Rohstoff</p>
            <ul class="baum">
              {@render knoten(baum, true)}
            </ul>
          {/if}
        {/if}

        <p class="eyebrow">Wofür</p>
        {#if verwendungen.length === 0 && projekte.length === 0}
          <p class="small muted leer">Noch keine freigeschaltete Verwendung.</p>
        {:else}
          <ul class="verwendungen">
            {#each verwendungen as r (r.id)}
              {@const bedarf = r.inputs.find((s) => s.item === item)?.amount ?? 0}
              <li>
                <ItemChip item={r.outputs[0]?.item ?? item} size="s" tap />
                <span class="text">
                  <span class="name">{r.name}</span>
                  <span class="muted small">{wagonName(r.wagon)} · {bedarf} {def.name} je Lauf</span>
                </span>
              </li>
            {/each}
            {#each projekte as p (p.id)}
              {@const bedarf = p.bom.find((s) => s.item === item)?.amount ?? 0}
              {@const geliefert = game.state.projects[p.id]?.delivered[item] ?? 0}
              <li>
                <span class="projekt" aria-hidden="true">B</span>
                <span class="text">
                  <span class="name">{p.name}</span>
                  <span class="muted small">Bauprojekt · {formatCount(geliefert)} von {formatCount(bedarf)} {def.name} geliefert</span>
                </span>
              </li>
            {/each}
          </ul>
        {/if}
      </div>
    </section>
  </div>
{/if}

<style>
  /* Die Übersicht füllt nur den Bereich unter der Bühne. Von unten kommt die Karte,
     der Schleier dahinter schliesst sie. */
  .sheet {
    position: absolute;
    inset: 0;
    z-index: 20;
    display: flex;
    flex-direction: column;
    justify-content: flex-end;
  }

  .schleier {
    position: absolute;
    inset: 0;
    border: 0;
    padding: 0;
    background: rgba(10, 14, 18, 0.38);
    cursor: default;
  }

  .karte {
    position: relative;
    display: flex;
    flex-direction: column;
    max-height: 100%;
    border-top: 1px solid var(--line);
    border-radius: 14px 14px 0 0;
    background: var(--surface);
    box-shadow: 0 -8px 30px rgba(0, 0, 0, 0.22);
  }

  @media (prefers-reduced-motion: no-preference) {
    .karte {
      animation: herauf 0.24s cubic-bezier(0.22, 1, 0.36, 1) both;
    }
  }

  @keyframes herauf {
    from {
      transform: translateY(24px);
      opacity: 0;
    }

    to {
      transform: none;
      opacity: 1;
    }
  }

  header {
    flex: none;
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 12px 12px 10px 16px;
    border-radius: 14px 14px 0 0;
    background: var(--tint);
  }

  .titel {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
  }

  h2 {
    margin: 0;
    font-family: var(--display);
    font-size: 24px;
    font-weight: 700;
    line-height: 1.05;
  }

  .schliessen {
    flex: none;
    width: 40px;
    padding: 0;
    font-size: 22px;
    line-height: 1;
    color: var(--ink-2);
  }

  .inhalt {
    min-height: 0;
    overflow-y: auto;
    padding: 0 16px 20px;
    display: grid;
    gap: 8px;
  }

  .inhalt .eyebrow {
    margin: 10px 0 2px;
  }

  .inhalt p {
    margin: 0;
  }

  .kennzahlen {
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
    gap: 10px;
  }

  .zahl {
    display: flex;
    flex-direction: column;
    line-height: 1.15;
  }

  .zahl .eyebrow {
    margin: 0 0 2px;
  }

  .zahl b {
    font-size: 20px;
    overflow-wrap: anywhere;
  }

  .small {
    font-size: 13px;
  }

  .leer {
    margin: 0;
  }

  /* Herstellung und Verbrauch untereinander: Die Quellen heissen «Schmelzwagen ×2 · Koks»,
     zwei Spalten wären dafür zu eng. */
  .fluss {
    display: grid;
    gap: 2px;
  }

  .quellen {
    list-style: none;
    margin: 0;
    padding: 0;
    display: grid;
    gap: 3px;
    font-size: 13px;
  }

  .quellen li {
    display: flex;
    justify-content: space-between;
    gap: 8px;
  }

  .quellen li span:first-child {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .quellen li span:last-child {
    flex: none;
  }

  .rezept {
    display: grid;
    gap: 6px;
  }

  .rezept p {
    margin: 0;
  }

  /* Der Baum hängt nach rechts ein: Jede Stufe eine Linie tiefer, bis zum Rohstoff. */
  .baum,
  .baum ul {
    list-style: none;
    margin: 0;
    padding: 0;
    display: grid;
    gap: 6px;
  }

  .baum ul {
    margin: 6px 0 0 11px;
    padding-left: 14px;
    border-left: 2px solid var(--line);
  }

  .knoten,
  .verwendungen li {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .text {
    display: flex;
    flex-direction: column;
    line-height: 1.2;
    min-width: 0;
  }

  .name {
    font-weight: 600;
    font-size: 14px;
  }

  .menge {
    font-weight: 500;
    font-size: 12px;
  }

  .verwendungen {
    list-style: none;
    margin: 0;
    padding: 0;
    display: grid;
    gap: 8px;
  }

  .projekt {
    display: grid;
    place-items: center;
    flex: none;
    width: 24px;
    height: 24px;
    border-radius: 6px;
    background: var(--accent-soft);
    color: var(--accent-ink);
    font-family: var(--display);
    font-weight: 700;
  }
</style>
