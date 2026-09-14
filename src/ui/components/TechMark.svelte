<script lang="ts">
  /**
   * Der Indikator einer Technologie: Auf einen Blick, worum es geht. Ein Wagen zeigt
   * seine Silhouette, ein Bauprojekt sein Bauwerk oder die Lok, neue Rezepte ihre
   * Waren, ein Bonus den Wagen, den er betrifft, mit dem Wert als Etikett.
   */
  import { techUnlocks, type TechDef, type WagonType } from '../../engine';
  import type { VehicleKind } from '../stage/camera';
  import { effectBadge, itemColor } from '../labels';
  import ItemIcon from './ItemIcon.svelte';
  import Vehicle from './Vehicle.svelte';

  let { tech, size = 'm' }: { tech: TechDef; size?: 'm' | 'l' } = $props();

  const u = $derived(techUnlocks(tech.id));
  const effekt = $derived(u.effects[0]);
  const badge = $derived(effekt ? effectBadge(effekt) : null);
  const projekt = $derived(u.projects[0]);
  const items = $derived(u.recipes.map((r) => r.outputs[0]?.item).filter((x): x is string => Boolean(x)).slice(0, 2));
  /** Der Wagen, den ein Bonus betrifft; Ernteboni und der Selbstlader gehören zum Erntewagen */
  const bonusWagen = $derived<WagonType | null>(
    effekt?.kind === 'wagen_tempo' ? effekt.wagon : effekt?.kind === 'ernte_bonus' || effekt?.kind === 'selbstlader' ? 'ernte' : null,
  );
  const fahrzeug = $derived<VehicleKind | null>(
    u.wagons[0]?.type ?? (projekt?.kind === 'lok' && projekt.loco ? projekt.loco : null) ?? (items.length === 0 ? bonusWagen : null),
  );
  const glyph = $derived(
    fahrzeug || items.length > 0
      ? null
      : projekt?.obstacle === 'schlucht'
        ? 'bruecke'
        : projekt?.obstacle
          ? 'tunnel'
          : effekt?.kind === 'maschinen_plaetze'
            ? 'plaetze'
            : effekt?.kind === 'offline_deckel'
              ? 'nacht'
              : effekt?.kind === 'stand_ende'
                ? 'ende'
                : 'stern',
  );
</script>

<span class="mark {size}" aria-hidden="true">
  {#if fahrzeug}
    <span class="fahrzeug"><Vehicle kind={fahrzeug} /></span>
  {:else if items.length > 0}
    <span class="waren" class:zwei={items.length > 1}>
      {#each items as it (it)}
        <span class="ware" style="--mark: {itemColor(it)}"><ItemIcon item={it} /></span>
      {/each}
    </span>
  {:else}
    <svg class="glyph" viewBox="0 0 24 24">
      {#if glyph === 'bruecke'}
        <path d="M2 8 h20" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" fill="none" />
        <path d="M5 8 v11 M19 8 v11 M5 19 q7 -12 14 0" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" fill="none" />
      {:else if glyph === 'tunnel'}
        <path d="M2 21 L8 6 L12 11 L16 5 L22 21 Z" />
        <path d="M9 21 a3 4 0 0 1 6 0 Z" fill="var(--surface)" />
      {:else if glyph === 'plaetze'}
        <rect x="3" y="3" width="8" height="8" rx="1.5" />
        <rect x="13" y="3" width="8" height="8" rx="1.5" />
        <rect x="3" y="13" width="8" height="8" rx="1.5" />
        <rect x="13" y="13" width="8" height="8" rx="1.5" opacity="0.45" />
      {:else if glyph === 'nacht'}
        <path d="M14 2.5 a9.5 9.5 0 1 0 7.5 15 a7.5 7.5 0 0 1 -7.5 -15 Z" />
      {:else if glyph === 'ende'}
        <path d="M5 22 V3" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" fill="none" />
        <path d="M6 4 h13 l-3 4.5 l3 4.5 h-13 Z" />
      {:else}
        <path d="M12 2 l2.9 6.3 6.9 0.8 -5.1 4.7 1.4 6.8 -6.1 -3.4 -6.1 3.4 1.4 -6.8 -5.1 -4.7 6.9 -0.8 Z" />
      {/if}
    </svg>
  {/if}
  {#if badge}<span class="badge mono">{badge}</span>{/if}
</span>

<style>
  .mark {
    position: relative;
    display: grid;
    place-items: center;
    flex: none;
    width: 36px;
    height: 36px;
    border-radius: 9px;
    background: var(--surface-2);
    color: var(--ink-2);
  }

  .mark.l {
    width: 52px;
    height: 52px;
    border-radius: 11px;
  }

  .fahrzeug {
    display: grid;
    place-items: center;
    width: 90%;
    height: 70%;
    overflow: hidden;
  }

  .glyph {
    width: 62%;
    height: 62%;
    fill: currentColor;
  }

  .waren {
    display: grid;
    place-items: center;
    width: 100%;
    height: 100%;
  }

  .ware {
    display: grid;
    place-items: center;
    width: 26px;
    height: 26px;
    padding: 3px;
    border-radius: 6px;
    background: var(--mark);
    color: #fff;
  }

  .mark.l .ware {
    width: 32px;
    height: 32px;
  }

  /* Zwei Waren überlappen sich leicht: Man sieht, dass es mehrere sind */
  .waren.zwei {
    grid-template-columns: 1fr;
  }

  .waren.zwei .ware {
    grid-area: 1 / 1;
    width: 22px;
    height: 22px;
    box-shadow: 0 0 0 1.5px var(--surface-2);
  }

  .waren.zwei .ware:first-child {
    transform: translate(-6px, -6px);
  }

  .waren.zwei .ware:last-child {
    transform: translate(6px, 6px);
  }

  .mark.l .waren.zwei .ware {
    width: 28px;
    height: 28px;
  }

  .badge {
    position: absolute;
    right: -6px;
    bottom: -5px;
    padding: 0 4px;
    border-radius: 7px;
    background: var(--ink);
    color: var(--bg);
    font-size: 9.5px;
    font-weight: 700;
    line-height: 14px;
    white-space: nowrap;
    box-shadow: 0 0 0 1.5px var(--surface);
  }
</style>
