<script lang="ts">
  import { WAGONS, TECH_BY_ID, buildWagon, canAfford, currentLoco, getStore, isWagonTypeUnlocked, machineSlots, wagonBuildCost, wagonOfType } from '../../engine';
  import { game } from '../game.svelte';
  import { WAGON_COLOR, itemName, machineName } from '../labels';
  import Vehicle from './Vehicle.svelte';

  const free = $derived(currentLoco(game.state).slots - game.state.wagons.length);
  const offen = $derived(WAGONS.filter((w) => !wagonOfType(game.state, w.type)));

  function build(type: (typeof WAGONS)[number]['type']) {
    if (game.run(buildWagon(game.state, type))) {
      const w = game.state.wagons[game.state.wagons.length - 1];
      game.detail = w ? { kind: 'wagen', id: w.id } : { kind: 'none' };
    }
  }
</script>

<p class="muted small">
  Von jedem Wagentyp zieht die Lok einen, {free} von {currentLoco(game.state).slots} Plätzen sind frei. Ausgebaut wird ein Wagen von innen: In jeden passen
  {machineSlots(game.state)} Maschinen. Die erste ist im Preis dabei, jeder Wagen braucht ein Fahrgestell aus dem Werkwagen oder der Werkbank.
</p>

<div class="list">
  {#each offen as w (w.type)}
    {@const unlocked = isWagonTypeUnlocked(game.state, w.type)}
    {@const cost = wagonBuildCost(w.type)}
    {@const affordable = canAfford(game.state, cost)}
    <div class="card entry" class:locked={!unlocked}>
      <span class="silhouette"><Vehicle kind={w.type} color={WAGON_COLOR[w.type]} rolling={false} /></span>
      <div class="text">
        <div class="title">{w.name} <span class="muted small">mit {machineName(w.type)}</span></div>
        {#if unlocked}
          <div class="cost">
            {#each cost as s (s.item)}
              <span class:missing={getStore(game.state, s.item) < s.amount}>{s.amount} {itemName(s.item)} <span class="muted">({getStore(game.state, s.item)})</span></span>
            {/each}
          </div>
        {:else}
          <div class="small muted">Braucht die Technologie {w.tech ? (TECH_BY_ID[w.tech]?.name ?? w.tech) : ''}.</div>
        {/if}
      </div>
      <button type="button" class="btn primary" disabled={!unlocked || !affordable || free <= 0} onclick={() => build(w.type)}>Anhängen</button>
    </div>
  {/each}
  {#if offen.length === 0}
    <p class="muted small">Jeder Wagentyp hängt bereits im Zug. Mehr Leistung kommt jetzt aus Maschinen und Stufen.</p>
  {/if}
</div>

<style>
  .small {
    font-size: 13px;
    margin: 0 0 10px;
  }

  .list {
    display: grid;
    gap: 8px;
  }

  .silhouette {
    flex: none;
    display: grid;
    place-items: center;
    width: 46px;
    height: 36px;
    overflow: hidden;
  }

  /* Die Liste steht jetzt ausgeklappt in der Wagenliste und hat weniger Breite:
     Der Knopf rutscht darum notfalls auf eine eigene Zeile, statt hinauszuragen. */
  .entry {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 8px 12px;
    padding: 10px 12px;
  }

  .entry .btn {
    flex: none;
    margin-left: auto;
  }

  .entry.locked {
    opacity: 0.6;
  }

  .text {
    flex: 1;
    min-width: 140px;
  }

  .title {
    font-weight: 600;
  }

  .cost {
    display: flex;
    flex-wrap: wrap;
    gap: 2px 10px;
    font-size: 13px;
  }

  .missing {
    color: var(--warn);
  }
</style>
