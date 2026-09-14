<script lang="ts">
  /**
   * Der Technologiebaum: Spalten von links nach rechts, Kanten von den
   * Voraussetzungen zu dem, was sie freischalten. Jeder Knoten trägt seinen
   * Indikator, Namen, Kosten und Stand. Der Baum scrollt in beide Richtungen und
   * rückt beim Öffnen die Front ins Bild, also die gewählte Technologie.
   */
  import { TECHS, TECH_BY_ID, type TechId } from '../../engine';
  import { formatDuration } from '../../lib/format';
  import { game } from '../game.svelte';
  import { layoutTechTree, techStatus, type TechStatus, type TreeEdge } from '../research/tree';
  import ItemIcon from './ItemIcon.svelte';
  import TechMark from './TechMark.svelte';

  let { selected, onselect, tempo }: { selected: TechId | null; onselect: (id: TechId) => void; tempo: number } = $props();

  const W = 184;
  const H = 62;
  const DX = 40;
  const DY = 12;
  const PAD = 16;
  const layout = layoutTechTree(TECHS);
  const pitchX = W + DX;
  const pitchY = H + DY;
  const width = PAD * 2 + layout.cols * pitchX - DX;
  const height = PAD * 2 + layout.rows * pitchY - DY;

  /** Kurze Spalten stehen mittig, damit die Kanten nicht alle nach oben laufen */
  const positions = new Map(
    layout.nodes.map((n) => {
      const offset = ((layout.rows - (layout.perColumn[n.col] ?? 0)) * pitchY) / 2;
      return [n.id, { x: PAD + n.col * pitchX, y: PAD + offset + n.row * pitchY }];
    }),
  );

  const status = $derived(Object.fromEntries(TECHS.map((t) => [t.id, techStatus(game.state, t.id)])) as Record<TechId, TechStatus>);
  const queueIndex = $derived(new Map(game.state.techs.queue.map((id, i) => [id, i + 1])));
  const progress = $derived.by(() => {
    const c = game.state.techs.current;
    return c ? c.progress / (TECH_BY_ID[c.id]?.seconds ?? 1) : 0;
  });

  const LABEL: Record<TechStatus, string> = {
    erforscht: 'erforscht',
    laeuft: 'läuft',
    eingereiht: 'eingereiht',
    bereit: 'bereit zum Forschen',
    planbar: 'Blaupausen fehlen',
    gesperrt: 'gesperrt',
  };

  /** Über wie viele Spalten eine Kante geht; eins ist die Nachbarspalte */
  function span(e: TreeEdge): number {
    const a = layout.nodes.find((n) => n.id === e.from);
    const b = layout.nodes.find((n) => n.id === e.to);
    return a && b ? b.col - a.col : 1;
  }

  /**
   * Eine Kante von der rechten Kante der Voraussetzung zur linken der Technologie.
   * Weite Kanten über mehrere Spalten biegen nach unten aus, sonst läge eine gerade
   * Linie quer durch den Baum und sähe aus wie ein Trennstrich.
   */
  function edgePath(e: TreeEdge): string {
    const a = positions.get(e.from);
    const b = positions.get(e.to);
    if (!a || !b) return '';
    const x1 = a.x + W;
    const y1 = a.y + H / 2;
    const x2 = b.x;
    const y2 = b.y + H / 2;
    const c = Math.max(12, (x2 - x1) / 2);
    const bogen = (span(e) - 1) * 28;
    return `M${x1} ${y1} C${x1 + c} ${y1 + bogen} ${x2 - c} ${y2 + bogen} ${x2} ${y2}`;
  }

  /** Fertige Kanten sind grün, die Front messingfarben, alles dahinter bleibt blass */
  function edgeTone(e: TreeEdge): string {
    const zu = status[e.to];
    const von = status[e.from];
    if (zu === 'erforscht') return 'fertig';
    if (zu === 'laeuft' || zu === 'eingereiht' || zu === 'bereit' || zu === 'planbar') return 'front';
    return von === 'erforscht' || von === 'laeuft' || von === 'eingereiht' ? 'naechst' : 'fern';
  }

  /**
   * Die gewählte Technologie steht in der Mitte, ihre Voraussetzungen links davon.
   * Beim Öffnen sofort, bei jeder weiteren Wahl mit einer weichen Fahrt: So folgt der
   * Baum auch einem Sprung über die Chips «Braucht» und «Führt zu».
   */
  let scroller = $state<HTMLElement | null>(null);
  let erstes = true;
  $effect(() => {
    if (!scroller) return;
    const ziel = selected ? positions.get(selected) : null;
    if (!ziel) return;
    const el = scroller;
    const behavior: ScrollBehavior = erstes ? 'auto' : 'smooth';
    erstes = false;
    requestAnimationFrame(() => {
      el.scrollTo({
        left: Math.max(0, ziel.x + W / 2 - el.clientWidth / 2),
        top: Math.max(0, ziel.y + H / 2 - el.clientHeight / 2),
        behavior,
      });
    });
  });
</script>

<div class="scroller scrollbereich" bind:this={scroller}>
  <div class="flaeche" style="width:{width}px;height:{height}px">
    <svg class="kanten" {width} {height} aria-hidden="true">
      {#each layout.edges as e (`${e.from}>${e.to}`)}
        <path d={edgePath(e)} class={edgeTone(e)} class:weit={span(e) > 1} />
      {/each}
    </svg>
    {#each TECHS as t (t.id)}
      {@const p = positions.get(t.id) ?? { x: 0, y: 0 }}
      {@const s = status[t.id] ?? 'gesperrt'}
      <button
        type="button"
        class="node {s}"
        class:gewaehlt={selected === t.id}
        style="left:{p.x}px;top:{p.y}px;width:{W}px;height:{H}px"
        aria-pressed={selected === t.id}
        aria-label="{t.name}, {LABEL[s]}"
        data-tech={t.id}
        onclick={() => onselect(t.id)}
      >
        <TechMark tech={t} />
        <span class="text">
          <span class="name">{t.name}</span>
          <span class="stand mono">
            {#if s === 'erforscht'}
              erforscht
            {:else if s === 'laeuft'}
              läuft
            {:else if s === 'eingereiht'}
              {queueIndex.get(t.id)}. in der Reihe
            {:else}
              <span class="bp"><ItemIcon item={t.cost.item} /></span>{t.cost.amount} · {formatDuration(t.seconds * tempo)}
            {/if}
          </span>
        </span>
        {#if s === 'laeuft'}<span class="fortschritt" style="width:{progress * 100}%"></span>{/if}
        {#if s === 'erforscht'}
          <svg class="haken" viewBox="0 0 16 16" aria-hidden="true"><path d="M3 8.5 L6.5 12 L13 4.5" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" /></svg>
        {/if}
      </button>
    {/each}
  </div>
</div>

<style>
  .scroller {
    flex: 1;
    min-height: 0;
    overflow: auto;
    background: var(--bg);
    overscroll-behavior: contain;
  }

  .flaeche {
    position: relative;
  }

  .kanten {
    position: absolute;
    left: 0;
    top: 0;
    pointer-events: none;
  }

  .kanten path {
    fill: none;
    stroke: var(--line);
    stroke-width: 2;
  }

  .kanten path.fertig {
    stroke: var(--good);
  }

  .kanten path.front {
    stroke: var(--accent);
  }

  .kanten path.naechst {
    stroke: var(--ink-2);
    opacity: 0.55;
  }

  .kanten path.fern {
    stroke-dasharray: 4 4;
    opacity: 0.6;
  }

  /* Weite Kanten bleiben leicht: Sie verbinden, sie trennen nicht */
  .kanten path.weit {
    stroke-dasharray: 6 5;
    opacity: 0.55;
  }

  .node {
    position: absolute;
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 6px 8px;
    border: 1.5px solid var(--line);
    border-radius: 11px;
    background: var(--surface);
    color: var(--ink);
    font: inherit;
    text-align: left;
    cursor: pointer;
    touch-action: manipulation;
    overflow: hidden;
  }

  .node.gesperrt {
    opacity: 0.55;
  }

  .node.planbar {
    border-color: var(--ink-2);
  }

  .node.bereit {
    border-color: var(--accent);
    box-shadow: 0 0 0 2px var(--accent-soft);
  }

  .node.laeuft,
  .node.eingereiht {
    border-color: var(--accent);
    background: var(--accent-soft);
  }

  .node.erforscht {
    border-color: var(--good);
    opacity: 0.85;
  }

  .node.gewaehlt {
    outline: 2.5px solid var(--ink);
    outline-offset: 1px;
  }

  .text {
    display: flex;
    flex-direction: column;
    min-width: 0;
    gap: 2px;
    line-height: 1.15;
  }

  .name {
    font-size: 12px;
    font-weight: 700;
    letter-spacing: -0.01em;
    overflow-wrap: break-word;
    hyphens: auto;
    display: -webkit-box;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 2;
    line-clamp: 2;
    overflow: hidden;
  }

  .stand {
    display: flex;
    align-items: center;
    gap: 3px;
    font-size: 10.5px;
    color: var(--ink-2);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .node.erforscht .stand {
    color: var(--good);
  }

  .node.laeuft .stand,
  .node.eingereiht .stand {
    color: var(--accent-ink);
  }

  .bp {
    display: inline-grid;
    place-items: center;
    width: 15px;
    height: 15px;
  }

  .fortschritt {
    position: absolute;
    left: 0;
    bottom: 0;
    height: 3px;
    background: var(--accent);
    transition: width 0.3s linear;
  }

  .haken {
    position: absolute;
    top: 4px;
    right: 5px;
    width: 13px;
    height: 13px;
    color: var(--good);
  }

  @media (prefers-reduced-motion: reduce) {
    .fortschritt {
      transition: none;
    }
  }
</style>
