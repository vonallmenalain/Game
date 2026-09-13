<script lang="ts">
  import { registerSW } from 'virtual:pwa-register';
  import { canResearch, TECHS, isTechDone } from './engine';
  import { game } from './ui/game.svelte';
  import type { Tab } from './ui/tabs';
  import BuildSheet from './ui/components/BuildSheet.svelte';
  import MorePanel from './ui/components/MorePanel.svelte';
  import ReturnReport from './ui/components/ReturnReport.svelte';
  import ReturnScreen from './ui/components/ReturnScreen.svelte';
  import ResearchPanel from './ui/components/ResearchPanel.svelte';
  import Sheet from './ui/components/Sheet.svelte';
  import StatusLine from './ui/components/StatusLine.svelte';
  import StorePanel from './ui/components/StorePanel.svelte';
  import TabBar from './ui/components/TabBar.svelte';
  import Toast from './ui/components/Toast.svelte';
  import TrackPanel from './ui/components/TrackPanel.svelte';
  import Stage from './ui/components/Stage.svelte';
  import WagonList from './ui/components/WagonList.svelte';
  import WagonSheet from './ui/components/WagonSheet.svelte';
  import WorkshopSheet from './ui/components/WorkshopSheet.svelte';

  let tab = $state<Tab>('zug');
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
    return { forschung: researchReady, strecke: projectDone, lager: storeFull, zug: wagonWaiting, mehr: game.exportOverdue } as Partial<Record<Tab, boolean>>;
  });

  const sheetTitle = $derived(game.sheet.kind === 'wagen' ? 'Wagen' : game.sheet.kind === 'bauen' ? 'Wagen anhängen' : game.sheet.kind === 'werkstatt' ? 'Werkstatt' : '');
</script>

{#if game.returning}
  <ReturnScreen />
{:else if !game.loaded}
  <main class="loading">Loco lädt …</main>
{:else}
  {#if tab !== 'zug'}
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
  <main class="content">
    {#if tab === 'zug'}
      <Stage />
      <WagonList />
    {:else if tab === 'lager'}
      <StorePanel />
    {:else if tab === 'forschung'}
      <ResearchPanel />
    {:else if tab === 'strecke'}
      <TrackPanel />
    {:else}
      <MorePanel />
    {/if}
  </main>
  <TabBar active={tab} {dots} onchange={(t) => (tab = t)} />

  <Sheet open={game.sheet.kind !== 'none'} title={sheetTitle} onclose={() => (game.sheet = { kind: 'none' })} scroll={game.sheet.kind !== 'werkstatt'}>
    {#if game.sheet.kind === 'wagen'}
      {#key game.sheet.id}
        <WagonSheet id={game.sheet.id} />
      {/key}
    {:else if game.sheet.kind === 'bauen'}
      <BuildSheet />
    {:else if game.sheet.kind === 'werkstatt'}
      <WorkshopSheet />
    {/if}
  </Sheet>
  {#if game.report}
    <ReturnReport report={game.report} />
  {/if}
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

  .content {
    padding-bottom: calc(72px + var(--safe-bottom));
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
