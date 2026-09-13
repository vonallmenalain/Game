<script lang="ts">
  import type { LocoId, WagonType } from '../../engine';

  let {
    kind,
    color,
    rolling,
  }: { kind: WagonType | LocoId | 'werkstatt'; color: string; rolling: boolean } = $props();

  const isLoco = $derived(kind === 'dampflok' || kind === 'schwere_dampflok');
  const width = $derived(kind === 'schwere_dampflok' ? 86 : kind === 'dampflok' ? 72 : 58);
</script>

<svg viewBox="0 0 {width} 54" width={width} height="54" role="presentation" class:rolling>
  {#if isLoco}
    <g fill={color}>
      <rect x="2" y="26" width={width - 6} height="16" rx="3" />
      <rect x="4" y="12" width="22" height="16" rx="3" />
      <rect x="34" y="4" width="10" height="24" rx="2" />
      <path d="M30 28 h{width - 40} v-8 q0 -6 -8 -6 h-{width - 52} q-8 0 -8 6 Z" />
    </g>
    <g class="wheels" fill={color}>
      <circle cx="14" cy="45" r="7" /><circle cx="34" cy="45" r="7" />
      <circle cx="54" cy="45" r="7" />
      {#if kind === 'schwere_dampflok'}<circle cx="74" cy="45" r="7" />{/if}
    </g>
    <g class="spokes" stroke="rgba(255,255,255,0.5)" stroke-width="1.6">
      <path d="M14 39 v12 M8 45 h12" /><path d="M34 39 v12 M28 45 h12" /><path d="M54 39 v12 M48 45 h12" />
    </g>
  {:else}
    <g fill={color}>
      {#if kind === 'ernte'}
        <path d="M4 40 L10 22 h38 l6 18 Z" />
        <rect x="16" y="12" width="26" height="10" rx="3" />
      {:else if kind === 'schmelz'}
        <rect x="4" y="24" width="50" height="16" rx="3" />
        <rect x="16" y="8" width="12" height="16" rx="2" />
        <path d="M34 24 h14 v-9 q0 -3 -4 -3 h-6 q-4 0 -4 3 Z" />
      {:else if kind === 'walz'}
        <rect x="4" y="30" width="50" height="10" rx="3" />
        <circle cx="20" cy="24" r="8" />
        <circle cx="40" cy="24" r="6" />
      {:else if kind === 'werk'}
        <rect x="4" y="26" width="50" height="14" rx="3" />
        <path d="M8 26 L29 10 L50 26 Z" />
      {:else if kind === 'buero'}
        <rect x="4" y="16" width="50" height="24" rx="3" />
        <g fill="rgba(255,255,255,0.6)">
          <rect x="10" y="21" width="9" height="9" rx="1" />
          <rect x="24" y="21" width="9" height="9" rx="1" />
          <rect x="38" y="21" width="9" height="9" rx="1" />
        </g>
      {:else if kind === 'lager'}
        <rect x="4" y="18" width="50" height="22" rx="3" />
        <rect x="26" y="18" width="5" height="22" fill="rgba(255,255,255,0.45)" />
      {:else if kind === 'chemie'}
        <rect x="4" y="34" width="50" height="6" rx="2" />
        <rect x="7" y="16" width="44" height="18" rx="9" />
        <rect x="26" y="10" width="6" height="7" rx="2" />
      {:else}
        <rect x="4" y="24" width="50" height="16" rx="3" />
        <path d="M10 24 L29 12 L48 24 Z" />
        <rect x="24" y="28" width="10" height="12" rx="2" fill="rgba(255,255,255,0.5)" />
      {/if}
    </g>
    <g class="wheels" fill={color}>
      <circle cx="15" cy="45" r="5" /><circle cx="43" cy="45" r="5" />
    </g>
  {/if}
</svg>

<style>
  svg {
    display: block;
    overflow: visible;
  }

  @media (prefers-reduced-motion: no-preference) {
    .rolling .wheels circle,
    .rolling .spokes {
      animation: bounce 0.22s steps(2, end) infinite;
    }
  }

  @keyframes bounce {
    from {
      transform: translateY(0);
    }

    to {
      transform: translateY(0.8px);
    }
  }
</style>
