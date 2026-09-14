<script lang="ts">
  /**
   * Ein Wagen, ganz: oben sein Name und die Kurbel, dann die Maschinen mit dem
   * Bauknopf, dann je Ware ein kleines Dashboard, zum Schluss Aufstufen und das
   * Verwalten. Was der Wagen noch nicht kann, steht als Ausblick darunter.
   */
  import {
    BALANCE,
    TECH_BY_ID,
    WAGON_BY_TYPE,
    buildMachine,
    canAfford,
    crank,
    detachRefund,
    detachWagon,
    freeMachineSlots,
    getStore,
    hasSelfLoader,
    idleMachines,
    isRecipeUnlocked,
    machineRefund,
    machineSlots,
    moveWagon,
    nextMachineCost,
    recipesForWagon,
    removeMachine,
    storeCap,
    upgradeWagon,
    wagonUpgradeCost,
  } from '../../engine';
  import { formatCount } from '../../lib/format';
  import { game } from '../game.svelte';
  import { itemName, machineName, stackText } from '../labels';
  import { wagonProducts } from '../products';
  import ProductCard from './ProductCard.svelte';

  let { id }: { id: number } = $props();

  const index = $derived(game.state.wagons.findIndex((w) => w.id === id));
  const wagon = $derived(game.state.wagons[index]);
  const def = $derived(wagon ? WAGON_BY_TYPE[wagon.type] : undefined);
  const slots = $derived(machineSlots(game.state));
  const frei = $derived(wagon ? idleMachines(wagon).length : 0);
  const plaetzeFrei = $derived(wagon ? freeMachineSlots(game.state, wagon) : 0);
  const machineCost = $derived(wagon ? nextMachineCost(wagon) : []);
  const machineAffordable = $derived(canAfford(game.state, machineCost));
  const products = $derived(wagon ? wagonProducts(game.state, wagon) : []);
  const gesperrt = $derived(
    wagon && wagon.type !== 'ernte' && wagon.type !== 'lager' ? recipesForWagon(wagon.type).filter((r) => !isRecipeUnlocked(game.state, r.id)) : [],
  );
  const selfLoader = $derived(hasSelfLoader(game.state));
  const crankLeft = $derived(wagon ? Math.max(0, wagon.crankUntil - game.state.playedSeconds) : 0);
  const upgradeCost = $derived(wagon && def?.upgradable && wagon.level < BALANCE.maxLevel ? wagonUpgradeCost(wagon.type, wagon.level + 1) : null);
  const canUpgrade = $derived(upgradeCost ? canAfford(game.state, upgradeCost) : false);

  let confirmRemove = $state(false);
  let confirmDetach = $state(false);

  function bauen() {
    if (wagon) game.run(buildMachine(game.state, wagon.id));
  }

  /** Erst beim zweiten Tipp wird wirklich ausgebaut. Zuerst geht eine freie Maschine. */
  function ausbauen() {
    if (!wagon) return;
    if (!confirmRemove) {
      confirmRemove = true;
      return;
    }
    confirmRemove = false;
    const m = idleMachines(wagon)[0] ?? wagon.machines[wagon.machines.length - 1];
    if (m) game.run(removeMachine(game.state, wagon.id, m.id));
  }

  function detach() {
    if (!wagon) return;
    if (!confirmDetach) {
      confirmDetach = true;
      return;
    }
    if (game.run(detachWagon(game.state, wagon.id))) game.detail = { kind: 'none' };
  }
</script>

{#if wagon && def}
  <header class="kopf">
    <div class="titel">
      <h2>{def.name}</h2>
      <span class="sub muted">Stufe {wagon.level} · Wagen {index + 1} von {game.state.wagons.length}</span>
    </div>
    {#if wagon.type === 'ernte' && !selfLoader}
      <button type="button" class="btn primary crank" onclick={() => game.run(crank(game.state, wagon.id))}>
        Kurbeln
        {#if crankLeft > 0}<span class="mono small">{Math.ceil(crankLeft)} s</span>{/if}
      </button>
    {/if}
  </header>

  <section class="card maschinen">
    <div class="zeile">
      <span class="eyebrow">{wagon.type === 'lager' ? 'Regale' : 'Maschinen'}</span>
      <span class="zahl">
        <b class="mono">{wagon.machines.length}</b> von {slots}
        {#if wagon.type !== 'lager'}
          · <span class="frei" class:hat={frei > 0}>{frei} frei</span>
        {/if}
      </span>
    </div>
    <div class="zeile">
      <span class="small kosten" class:tone-warn={plaetzeFrei > 0 && !machineAffordable}>
        {#if plaetzeFrei > 0}
          Nächste: {stackText(machineCost)}
        {:else}
          Alle Plätze belegt. Mehr Platz gibt die Forschung und eine stärkere Lok.
        {/if}
      </span>
      <button type="button" class="btn small primary bauen" disabled={plaetzeFrei <= 0 || !machineAffordable} onclick={bauen}>
        {machineName(wagon.type)} bauen
      </button>
    </div>
    {#if wagon.type === 'lager'}
      <p class="hint">Jedes Regal gibt plus {BALANCE.storeCapPerRegal} Kapazität je Ware. Zusammen {formatCount(storeCap(game.state))} je Ware.</p>
    {:else if wagon.type === 'ernte' && !selfLoader}
      <p class="hint">Ohne Selbstlader erntet der Wagen nur, wenn du kurbelst: {BALANCE.crankSeconds} Sekunden je Tipp, für alle Maschinen im Wagen.</p>
    {:else if wagon.type === 'ernte'}
      <p class="hint">Freie Maschinen teilst du unten je Rohstoff zu.</p>
    {:else}
      <p class="hint">
        Freie Maschinen teilst du unten je Ware zu. Kurze Wege: Liefert eine Maschine im Wagen eine Zutat, arbeitet die daneben {Math.round(BALANCE.neighborBonus * 100)} Prozent schneller.
      </p>
    {/if}
  </section>

  {#if products.length > 0}
    <p class="eyebrow abschnitt">Produktion</p>
    <div class="produkte">
      {#each products as p (p.key)}
        <ProductCard {wagon} product={p} />
      {/each}
    </div>
  {/if}
  {#if gesperrt.length > 0}
    <p class="small muted spaeter">
      Später: {gesperrt.map((r) => `${r.name} (${r.techs.map((t) => TECH_BY_ID[t]?.name ?? t).join(', ')})`).join(' · ')}
    </p>
  {/if}

  {#if def.upgradable}
    <p class="eyebrow abschnitt">Aufstufen</p>
    <section class="card">
      {#if upgradeCost}
        <div class="zeile">
          <span class="small">
            Stufe {wagon.level + 1}: {stackText(upgradeCost)}
            <br />
            <span class="muted">plus {Math.round(BALANCE.levelSpeedStep * 100)} Prozent Tempo für jede Maschine im Wagen</span>
          </span>
          <button type="button" class="btn small primary" disabled={!canUpgrade} onclick={() => game.run(upgradeWagon(game.state, wagon.id))}>Aufstufen</button>
        </div>
        {#if !canUpgrade}
          <p class="small tone-warn fehlt">
            Es fehlen {upgradeCost
              .filter((s) => getStore(game.state, s.item) < s.amount)
              .map((s) => `${s.amount - getStore(game.state, s.item)} ${itemName(s.item)}`)
              .join(', ')}.
          </p>
        {/if}
      {:else}
        <p class="small muted">Höchste Stufe erreicht.</p>
      {/if}
    </section>
  {/if}

  <details class="verwalten">
    <summary>Wagen verwalten</summary>
    <div class="inhalt">
      <p class="eyebrow">Reihenfolge im Zug</p>
      <div class="zeile">
        <button type="button" class="btn small" disabled={index <= 0} onclick={() => game.run(moveWagon(game.state, wagon.id, index - 1))}>Nach vorne</button>
        <button type="button" class="btn small" disabled={index >= game.state.wagons.length - 1} onclick={() => game.run(moveWagon(game.state, wagon.id, index + 1))}>
          Nach hinten
        </button>
      </div>
      {#if wagon.machines.length > 1}
        <p class="eyebrow">{machineName(wagon.type)} ausbauen</p>
        <div class="zeile">
          <span class="small muted">Gibt {stackText(machineRefund(wagon))} zurück. Eine freie Maschine geht zuerst.</span>
          <button type="button" class="btn small danger" onclick={ausbauen}>{confirmRemove ? 'Wirklich ausbauen' : 'Ausbauen'}</button>
        </div>
      {/if}
      <p class="eyebrow">Abkoppeln</p>
      <div class="zeile">
        <span class="small muted">Gibt {stackText(detachRefund(wagon))} zurück.</span>
        <button type="button" class="btn small danger" onclick={detach}>{confirmDetach ? 'Wirklich abkoppeln' : 'Abkoppeln'}</button>
      </div>
    </div>
  </details>
{:else}
  <p class="muted">Dieser Wagen ist nicht mehr im Zug.</p>
{/if}

<style>
  /* Der Kopf klebt oben: Die Kurbel bleibt erreichbar, auch wenn man zu den Waren scrollt. */
  .kopf {
    position: sticky;
    top: 0;
    z-index: 3;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    margin: 0 -16px 10px;
    padding: 12px 16px 8px;
    background: var(--bg);
  }

  .titel {
    display: flex;
    flex-direction: column;
    min-width: 0;
  }

  h2 {
    font-family: var(--display);
    font-size: 24px;
    font-weight: 700;
    line-height: 1.05;
    margin: 0;
  }

  .sub {
    font-size: 13px;
  }

  .crank {
    flex: none;
    flex-direction: column;
    gap: 0;
    min-width: 92px;
    min-height: 46px;
  }

  .crank .small {
    font-size: 11px;
    font-weight: 500;
  }

  .maschinen {
    display: grid;
    gap: 6px;
  }

  .maschinen .eyebrow {
    margin: 0;
  }

  .zeile {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
  }

  .zahl {
    font-size: 13px;
    color: var(--ink-2);
  }

  .zahl b {
    font-size: 15px;
    color: var(--ink);
  }

  .frei.hat {
    color: var(--accent-ink);
    font-weight: 600;
  }

  .small {
    font-size: 13px;
  }

  .kosten {
    min-width: 0;
  }

  .bauen {
    flex: none;
  }

  .hint {
    margin: 2px 0 0;
    font-size: 12.5px;
    color: var(--ink-2);
  }

  .abschnitt {
    margin: 14px 0 6px;
  }

  .produkte {
    display: grid;
    gap: 8px;
  }

  .spaeter {
    margin: 8px 0 0;
  }

  .fehlt {
    margin: 6px 0 0;
  }

  .verwalten {
    margin-top: 14px;
    border: 1px solid var(--line);
    border-radius: 10px;
    background: var(--surface);
  }

  .verwalten summary {
    padding: 10px 14px;
    font-weight: 600;
    cursor: pointer;
  }

  .verwalten .inhalt {
    display: grid;
    gap: 8px;
    padding: 0 14px 14px;
  }

  .verwalten .eyebrow {
    margin: 6px 0 0;
  }
</style>
