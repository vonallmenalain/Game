<script lang="ts">
  import { registerSW } from 'virtual:pwa-register';
  import { canResearch, TECHS, isTechDone } from './engine';
  import { game } from './ui/game.svelte';
  import type { Tab } from './ui/tabs';
  import MorePanel from './ui/components/MorePanel.svelte';
  import ReturnReport from './ui/components/ReturnReport.svelte';
  import ReturnScreen from './ui/components/ReturnScreen.svelte';
  import ItemSheet from './ui/components/ItemSheet.svelte';
  import ResearchPanel from './ui/components/ResearchPanel.svelte';
  import StatusLine from './ui/components/StatusLine.svelte';
  import StorePanel from './ui/components/StorePanel.svelte';
  import SyncChoice from './ui/components/SyncChoice.svelte';
  import TabBar from './ui/components/TabBar.svelte';
  import Toast from './ui/components/Toast.svelte';
  import TrackPanel from './ui/components/TrackPanel.svelte';
  import Stage from './ui/components/Stage.svelte';
  import WagonScreen from './ui/components/WagonScreen.svelte';
  import WorkshopPanel from './ui/components/WorkshopPanel.svelte';

  let needRefresh = $state(false);

  const updateSW = registerSW({
    onNeedRefresh() {
      needRefresh = true;
    },
  });

  $effect(() => {
    void game.boot();
    return () => game.stop();
  });

  const dots = $derived.by(() => {
    const s = game.state;
    const researchReady = !s.techs.current && TECHS.some((t) => !isTechDone(s, t.id) && canResearch(s, t.id).ok);
    const projectDone = s.log.some((e) => e.kind === 'projekt' && s.playedSeconds - e.at < 120);
    const storeFull = s.warnings.some((w) => w.code === 'lager_voll');
    const wagonWaiting = s.warnings.some((w) => w.code === 'zutat_fehlt' || w.code === 'handkurbel');
    return { forschung: researchReady, strecke: projectDone, lager: storeFull, zug: wagonWaiting } as Partial<Record<Tab, boolean>>;
  });

</script>

{#if game.returning}
  <ReturnScreen />
{:else if !game.loaded}
  <main class="loading">{game.bootPhase === 'cloud' ? 'Loco holt den Spielstand aus der Cloud …' : 'Loco lädt …'}</main>
{:else}
  <div class="app">
    {#if game.tab === 'mehr'}
      <StatusLine />
    {/if}
    {#if needRefresh}
      <div class="update">
        Neue Version bereit.
        <button type="button" class="btn small primary" onclick={() => updateSW(true)}>Neu laden</button>
      </div>
    {/if}
    {#if game.state.standEnde}
      <div class="update">Ende des ersten Stands erreicht. Die Wüste wartet auf den nächsten Ausbau.</div>
    {/if}
    <main>
      <!-- Die Bühne steht auf jedem Register ausser «Mehr» fest oben. Sie bleibt dieselbe
           Instanz, damit Fahrt und Kamerafahrt beim Wechsel nicht abreissen. -->
      {#if game.tab !== 'mehr'}
        <Stage />
      {/if}
      <!-- Der Bereich unter der Bühne: Hier steht der Bildschirm, und hierhinein legt
           sich die Übersicht einer Ware. Die Bühne darüber bleibt frei. -->
      <div class="bereich">
        {#if game.tab === 'zug'}
          <WagonScreen />
        {:else if game.tab === 'werkstatt'}
          <WorkshopPanel />
        {:else if game.tab === 'lager'}
          <div class="scrollbereich"><StorePanel /></div>
        {:else if game.tab === 'forschung'}
          <ResearchPanel />
        {:else if game.tab === 'strecke'}
          <div class="scrollbereich"><TrackPanel /></div>
        {:else}
          <div class="scrollbereich"><MorePanel /></div>
        {/if}
        {#if game.item}
          <ItemSheet />
        {/if}
      </div>
    </main>
    <TabBar active={game.tab} {dots} onchange={(t: Tab) => game.openTab(t)} />
  </div>

  {#if game.report}
    <ReturnReport report={game.report} />
  {/if}
  <!-- Die Rückfrage steht auf jedem Register: Sie kommt auch mitten im Spiel -->
  <SyncChoice />
  <Toast />
{/if}

<style>
  .loading {
    display: grid;
    place-items: center;
    min-height: 60vh;
    font-family: var(--display);
    font-size: 24px;
  }

  /* App-Gerüst: Kopf und Leiste stehen, dazwischen scrollt jeder Bildschirm selbst. */
  .app {
    display: flex;
    flex-direction: column;
    height: 100dvh;
  }

  main {
    flex: 1;
    min-height: 0;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  .bereich {
    position: relative;
    flex: 1;
    min-height: 0;
    display: flex;
    flex-direction: column;
  }

  .scrollbereich {
    flex: 1;
    min-height: 0;
    overflow-y: auto;
  }

  .update {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
    margin: 10px 16px 0;
    padding: 10px 12px;
    border: 1px solid var(--accent);
    border-radius: 8px;
    background: var(--accent-soft);
    color: var(--accent-ink);
    font-size: 14px;
  }
</style>
