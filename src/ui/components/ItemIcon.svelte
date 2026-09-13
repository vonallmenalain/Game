<script lang="ts">
  /**
   * Glyphen für alle Waren. Flache Formen, zwei bis drei Flächen, keine Umrisse,
   * gezeichnet in einem 24er Raster. Verwandte Waren teilen sich eine Grundform.
   */
  let { item }: { item: string } = $props();
</script>

<svg viewBox="0 0 24 24" role="presentation" aria-hidden="true">
  {#if item === 'eisenerz' || item === 'kupfererz'}
    <path d="M3 18 L6 8 L15 5 L21 11 L19 19 Z" />
    <circle cx="10" cy="12" r="2.6" fill="var(--mark, #fff)" opacity="0.55" />
    <circle cx="16" cy="15" r="1.8" fill="var(--mark, #fff)" opacity="0.55" />
  {:else if item === 'kohle'}
    <path d="M2 17 L7 7 L13 11 L12 18 Z" />
    <path d="M13 6 L20 8 L22 15 L14 18 Z" opacity="0.7" />
  {:else if item === 'holz'}
    <rect x="3" y="9" width="18" height="7" rx="3.5" />
    <circle cx="19" cy="12.5" r="2.4" opacity="0.55" />
    <circle cx="19" cy="12.5" r="1" opacity="0.8" />
  {:else if item === 'stein'}
    <path d="M4 10 L12 5 L20 10 L20 17 L12 21 L4 17 Z" />
    <path d="M4 10 L12 14 L12 21 L4 17 Z" fill="var(--mark, #fff)" opacity="0.28" />
  {:else if item === 'harz'}
    <path d="M12 4 q6 8 6 11 a6 6 0 0 1 -12 0 q0 -3 6 -11 Z" />
    <circle cx="9.5" cy="14" r="1.6" opacity="0.6" />
  {:else if item === 'kalk'}
    <rect x="4" y="8" width="16" height="9" rx="1.5" />
    <path d="M4 11 h16" opacity="0.5" stroke="currentColor" stroke-width="1.4" fill="none" />
  {:else if item === 'salpeter'}
    <path d="M12 4 L15 11 L12 20 L9 11 Z" />
    <path d="M5 9 L8 13 L5 17 Z" opacity="0.6" />
    <path d="M19 9 L16 13 L19 17 Z" opacity="0.6" />
  {:else if item === 'koks'}
    <path d="M4 16 L7 9 L14 8 L18 13 L15 18 Z" />
    <circle cx="9" cy="13" r="1.3" opacity="0.4" />
    <circle cx="13" cy="12" r="1" opacity="0.4" />
    <circle cx="12" cy="15.5" r="1.1" opacity="0.4" />
  {:else if item === 'eisenbarren' || item === 'kupferbarren' || item === 'stahl'}
    <path d="M3 17 L6 11 L18 11 L21 17 Z" />
    <path d="M7 11 L9 7 L17 7 L19 11 Z" opacity={item === 'stahl' ? '0.75' : '0.6'} />
  {:else if item === 'schienen'}
    <path d="M5 4 h3 v16 h-3 Z" />
    <path d="M16 4 h3 v16 h-3 Z" />
    <path d="M3 9 h18 v2.4 h-18 Z" opacity="0.55" />
    <path d="M3 14 h18 v2.4 h-18 Z" opacity="0.55" />
  {:else if item === 'bretter' || item === 'bohlen'}
    <rect x="3" y="7" width="18" height={item === 'bohlen' ? 4.6 : 3.4} rx="1" />
    <rect x="3" y={item === 'bohlen' ? 13 : 12} width="18" height={item === 'bohlen' ? 4.6 : 3.4} rx="1" opacity="0.7" />
    {#if item === 'bretter'}<rect x="3" y="17" width="18" height="3.4" rx="1" opacity="0.45" />{/if}
  {:else if item === 'zahnrad'}
    <path d="M12 3 l2.4 2 3 -.8 1 2.9 2.9 1 -.8 3 2 2.4 -2 2.4 .8 3 -2.9 1 -1 2.9 -3 -.8 -2.4 2 -2.4 -2 -3 .8 -1 -2.9 -2.9 -1 .8 -3 -2 -2.4 2 -2.4 -.8 -3 2.9 -1 1 -2.9 3 .8 Z" />
    <circle cx="12" cy="12" r="3.4" fill="var(--mark, #fff)" opacity="0.9" />
  {:else if item === 'nieten'}
    <g>
      <circle cx="6" cy="7" r="2.6" /><rect x="5" y="8" width="2" height="9" rx="1" />
      <circle cx="12" cy="7" r="2.6" opacity="0.8" /><rect x="11" y="8" width="2" height="9" rx="1" opacity="0.8" />
      <circle cx="18" cy="7" r="2.6" opacity="0.6" /><rect x="17" y="8" width="2" height="9" rx="1" opacity="0.6" />
    </g>
  {:else if item === 'fahrgestell'}
    <rect x="3" y="8" width="18" height="5" rx="1.5" />
    <circle cx="7.5" cy="17" r="3.4" />
    <circle cx="16.5" cy="17" r="3.4" />
    <circle cx="7.5" cy="17" r="1.2" fill="var(--mark, #fff)" />
    <circle cx="16.5" cy="17" r="1.2" fill="var(--mark, #fff)" />
  {:else if item === 'bp_eisen' || item === 'bp_stahl' || item === 'bp_kupfer'}
    <rect x="4" y="3" width="16" height="18" rx="2" />
    <g fill="var(--mark, #fff)" opacity="0.85">
      <rect x="7" y="7" width="10" height="1.6" rx="0.8" />
      <rect x="7" y="11" width="7" height="1.6" rx="0.8" />
      {#if item !== 'bp_eisen'}<rect x="7" y="15" width="9" height="1.6" rx="0.8" />{/if}
      {#if item === 'bp_kupfer'}<rect x="15" y="11" width="2" height="1.6" rx="0.8" />{/if}
    </g>
  {:else if item === 'teer'}
    <path d="M6 6 h12 l-1.5 13 a2 2 0 0 1 -2 1.8 h-5 a2 2 0 0 1 -2 -1.8 Z" />
    <ellipse cx="12" cy="6.4" rx="6" ry="1.8" opacity="0.6" />
  {:else if item === 'stahltraeger'}
    <path d="M4 4 h16 v3.4 h-6 v9.2 h6 v3.4 h-16 v-3.4 h6 v-9.2 h-6 Z" />
  {:else if item === 'dampfkessel'}
    <rect x="3" y="8" width="16" height="10" rx="5" />
    <rect x="9" y="3" width="3" height="5" rx="1.2" />
    <circle cx="19.5" cy="13" r="2.4" opacity="0.7" />
  {:else if item === 'kupferdraht'}
    <path d="M4 18 q3 -6 6 0 q3 6 6 0 q3 -6 6 0" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" />
    <path d="M4 10 q3 -6 6 0 q3 6 6 0 q3 -6 6 0" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" opacity="0.65" />
  {:else if item === 'kupferspule'}
    <rect x="5" y="5" width="14" height="14" rx="2" />
    <g fill="var(--mark, #fff)" opacity="0.8">
      <rect x="7.5" y="7" width="9" height="1.6" />
      <rect x="7.5" y="11.2" width="9" height="1.6" />
      <rect x="7.5" y="15.4" width="9" height="1.6" />
    </g>
  {:else if item === 'bohrkopf'}
    <path d="M12 21 L8 13 h8 Z" />
    <rect x="10.5" y="3" width="3" height="10" rx="1" opacity="0.8" />
    <path d="M8 13 h8 v-2 h-8 Z" opacity="0.5" />
  {:else if item === 'sprengstoff'}
    <rect x="6" y="8" width="12" height="12" rx="2" />
    <path d="M12 8 q0 -4 4 -5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" opacity="0.8" />
    <circle cx="17" cy="3" r="1.8" opacity="0.8" />
  {:else if item === 'moertel'}
    <path d="M4 9 h16 l-2 10 h-12 Z" />
    <rect x="3" y="6" width="18" height="3" rx="1.4" opacity="0.7" />
  {:else if item === 'stuetzbalken'}
    <rect x="10" y="3" width="4" height="18" rx="1" />
    <path d="M4 20 L10 12 v3 L7 20 Z" opacity="0.7" />
    <path d="M20 20 L14 12 v3 L17 20 Z" opacity="0.7" />
  {:else}
    <circle cx="12" cy="12" r="7" />
  {/if}
</svg>

<style>
  svg {
    width: 100%;
    height: 100%;
    display: block;
    fill: currentColor;
  }
</style>
