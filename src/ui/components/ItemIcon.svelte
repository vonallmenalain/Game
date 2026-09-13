<script lang="ts">
  /**
   * Glyphen für alle Waren. Jede hat eine eigene Silhouette: Man soll sie am Umriss
   * unterscheiden, nicht erst an der Farbe. Verwandte Waren teilen eine Grundform,
   * die Stufe unterscheidet sie dann über die Farbe.
   * Gezeichnet in einem 24er Raster, flach, ohne Umrisslinien.
   */
  let { item }: { item: string } = $props();
</script>

<svg viewBox="0 0 24 24" role="presentation" aria-hidden="true">
  {#if item === 'eisenerz'}
    <!-- Runder Klumpen mit zwei glatten Adern -->
    <path d="M3 15 q0 -9 9 -10 q10 -1 10 9 q0 8 -9 8 q-10 0 -10 -7 Z" />
    <circle cx="10" cy="11" r="3" fill="var(--mark, #fff)" opacity="0.5" />
    <circle cx="16" cy="16" r="2" fill="var(--mark, #fff)" opacity="0.5" />
  {:else if item === 'kupfererz'}
    <!-- Klumpen mit Kristallzacken nach oben -->
    <path d="M3 21 L5 13 L12 15 L19 12 L21 21 Z" />
    <path d="M6 13 L8 4 L11 14 Z" />
    <path d="M13 14 L17 6 L19 12 Z" />
  {:else if item === 'kohle'}
    <!-- Zwei kantige, massive Brocken -->
    <path d="M2 20 L4 10 L11 12 L10 20 Z" />
    <path d="M11 20 L12 9 L20 6 L22 20 Z" opacity="0.75" />
  {:else if item === 'koks'}
    <!-- Drei gestapelte Briketts mit Loch: klar anders als ein Erzklumpen -->
    <g>
      <rect x="2" y="13" width="9" height="8" rx="2" />
      <circle cx="6.5" cy="17" r="1.7" fill="var(--mark, #fff)" />
      <rect x="13" y="13" width="9" height="8" rx="2" opacity="0.8" />
      <circle cx="17.5" cy="17" r="1.7" fill="var(--mark, #fff)" />
      <rect x="7.5" y="3" width="9" height="8" rx="2" opacity="0.9" />
      <circle cx="12" cy="7" r="1.7" fill="var(--mark, #fff)" />
    </g>
  {:else if item === 'holz'}
    <!-- Stamm quer mit Jahresringen -->
    <rect x="2" y="8" width="20" height="9" rx="4.5" />
    <ellipse cx="18" cy="12.5" rx="3.4" ry="4.2" fill="var(--mark, #fff)" opacity="0.45" />
    <ellipse cx="18" cy="12.5" rx="1.4" ry="1.9" fill="var(--mark, #fff)" opacity="0.8" />
  {:else if item === 'stein'}
    <!-- Würfel in Schrägsicht -->
    <path d="M12 3 L21 8 L12 13 L3 8 Z" />
    <path d="M3 8 L12 13 L12 21 L3 16 Z" opacity="0.8" />
    <path d="M21 8 L21 16 L12 21 L12 13 Z" opacity="0.55" />
  {:else if item === 'harz'}
    <!-- Tropfen -->
    <path d="M12 2 q7 9 7 12.5 a7 7 0 0 1 -14 0 q0 -3.5 7 -12.5 Z" />
    <ellipse cx="9" cy="15" rx="2" ry="2.6" fill="var(--mark, #fff)" opacity="0.45" />
  {:else if item === 'kalk'}
    <!-- Flache Platten, gestapelt -->
    <path d="M2 9 L12 5 L22 9 L12 13 Z" />
    <path d="M2 14 L12 10 L22 14 L12 18 Z" opacity="0.75" />
    <path d="M2 19 L12 15 L22 19 L12 23 Z" opacity="0.5" />
  {:else if item === 'salpeter'}
    <!-- Kristallnadeln, sternförmig -->
    <path d="M12 1 L14 10 L12 22 L10 10 Z" />
    <path d="M2 7 L11 11 L4 18 L9 11 Z" opacity="0.75" />
    <path d="M22 7 L13 11 L20 18 L15 11 Z" opacity="0.75" />
  {:else if item === 'eisenbarren' || item === 'kupferbarren' || item === 'stahl'}
    <!-- Barren, gestapelt. Die Stufenfarbe trennt Eisen, Stahl und Kupfer -->
    <path d="M2 20 L5 14 L19 14 L22 20 Z" />
    <path d="M6 14 L8.5 9 L18.5 9 L21 14 Z" opacity="0.72" />
    {#if item === 'stahl'}<path d="M9 10.5 L11 10.5 L9.5 13 L7.5 13 Z" fill="var(--mark, #fff)" opacity="0.85" />{/if}
  {:else if item === 'schienen'}
    <!-- Zwei Schienen mit Schwellen, von schräg oben -->
    <path d="M6 2 L9 2 L7 22 L4 22 Z" />
    <path d="M15 2 L18 2 L20 22 L17 22 Z" />
    <path d="M4.5 7 L19 7 L19.4 10 L4.2 10 Z" opacity="0.6" />
    <path d="M3.6 15 L20.2 15 L20.6 18 L3.3 18 Z" opacity="0.6" />
  {:else if item === 'bretter'}
    <!-- Drei dünne Latten mit Abstand -->
    <rect x="2" y="6" width="20" height="3.2" rx="1.2" />
    <rect x="2" y="11" width="20" height="3.2" rx="1.2" opacity="0.78" />
    <rect x="2" y="16" width="20" height="3.2" rx="1.2" opacity="0.56" />
  {:else if item === 'bohlen'}
    <!-- Zwei dicke Balken, perspektivisch versetzt -->
    <path d="M2 10 L17 6 L22 8 L7 12 Z" />
    <path d="M2 10 L7 12 L7 18 L2 16 Z" opacity="0.8" />
    <path d="M7 12 L22 8 L22 14 L7 18 Z" opacity="0.6" />
  {:else if item === 'zahnrad'}
    <path
      d="M12 2 l2.6 2.2 3.3 -.9 1.1 3.2 3.2 1.1 -.9 3.3 2.2 2.6 -2.2 2.6 .9 3.3 -3.2 1.1 -1.1 3.2 -3.3 -.9 -2.6 2.2 -2.6 -2.2 -3.3 .9 -1.1 -3.2 -3.2 -1.1 .9 -3.3 -2.2 -2.6 2.2 -2.6 -.9 -3.3 3.2 -1.1 1.1 -3.2 3.3 .9 Z"
    />
    <circle cx="12" cy="12" r="3.6" fill="var(--mark, #fff)" />
  {:else if item === 'nieten'}
    <!-- Drei Nieten mit rundem Kopf -->
    <g>
      <circle cx="5.5" cy="6" r="3" /><path d="M4 8.5 h3 l-.6 9 h-1.8 Z" />
      <circle cx="12" cy="6" r="3" opacity="0.8" /><path d="M10.5 8.5 h3 l-.6 9 h-1.8 Z" opacity="0.8" />
      <circle cx="18.5" cy="6" r="3" opacity="0.6" /><path d="M17 8.5 h3 l-.6 9 h-1.8 Z" opacity="0.6" />
    </g>
  {:else if item === 'fahrgestell'}
    <!-- Rahmen auf zwei Rädern -->
    <path d="M2 8 L22 8 L20 13 L4 13 Z" />
    <circle cx="7.5" cy="18" r="4" />
    <circle cx="16.5" cy="18" r="4" />
    <circle cx="7.5" cy="18" r="1.5" fill="var(--mark, #fff)" />
    <circle cx="16.5" cy="18" r="1.5" fill="var(--mark, #fff)" />
  {:else if item === 'bp_eisen' || item === 'bp_stahl' || item === 'bp_kupfer'}
    <!-- Blatt mit Eselsohr. Die Zahl der Linien zeigt die Stufe -->
    <path d="M4 2 h11 l5 5 v15 h-16 Z" />
    <path d="M15 2 l5 5 h-5 Z" fill="var(--mark, #fff)" opacity="0.65" />
    <g fill="var(--mark, #fff)" opacity="0.9">
      <rect x="7" y="11" width="10" height="1.8" rx="0.9" />
      {#if item !== 'bp_eisen'}<rect x="7" y="15" width="10" height="1.8" rx="0.9" />{/if}
      {#if item === 'bp_kupfer'}<rect x="7" y="19" width="7" height="1.8" rx="0.9" />{/if}
    </g>
  {:else if item === 'teer'}
    <!-- Fass mit Reifen -->
    <path d="M5 4 h14 q2 8 0 16 h-14 q-2 -8 0 -16 Z" />
    <rect x="3.6" y="9" width="16.8" height="2" fill="var(--mark, #fff)" opacity="0.55" />
    <rect x="3.6" y="14" width="16.8" height="2" fill="var(--mark, #fff)" opacity="0.55" />
  {:else if item === 'stahltraeger'}
    <!-- Doppel-T, aufrecht -->
    <path d="M3 2 h18 v4 h-6 v12 h6 v4 h-18 v-4 h6 v-12 h-6 Z" />
  {:else if item === 'dampfkessel'}
    <!-- Liegender Kessel mit Ventil und Manometer -->
    <rect x="2" y="8" width="16" height="11" rx="5.5" />
    <rect x="8" y="3" width="3.4" height="5" rx="1.4" />
    <circle cx="20" cy="13.5" r="3" opacity="0.75" />
    <rect x="4" y="11" width="12" height="1.8" fill="var(--mark, #fff)" opacity="0.5" />
  {:else if item === 'kupferdraht'}
    <!-- Ein Draht, der sich windet -->
    <path
      d="M2 17 q4 -8 8 -4 q4 4 8 -4"
      fill="none"
      stroke="currentColor"
      stroke-width="3"
      stroke-linecap="round"
    />
    <path
      d="M4 22 q4 -8 8 -4 q4 4 8 -4"
      fill="none"
      stroke="currentColor"
      stroke-width="3"
      stroke-linecap="round"
      opacity="0.55"
    />
    <circle cx="21" cy="7" r="2" />
  {:else if item === 'kupferspule'}
    <!-- Spule: Kern mit Wicklungen -->
    <rect x="3" y="6" width="3.5" height="12" rx="1.4" />
    <rect x="17.5" y="6" width="3.5" height="12" rx="1.4" />
    <g opacity="0.78">
      <rect x="7" y="8" width="2.6" height="8" rx="1.3" />
      <rect x="10.7" y="8" width="2.6" height="8" rx="1.3" />
      <rect x="14.4" y="8" width="2.6" height="8" rx="1.3" />
    </g>
  {:else if item === 'bohrkopf'}
    <!-- Spiralbohrer mit Spitze nach unten -->
    <path d="M12 22 L7.5 12 h9 Z" />
    <path d="M8.5 12 L8 8 h8 l-.5 4 Z" opacity="0.8" />
    <rect x="10" y="2" width="4" height="6" rx="1.4" opacity="0.6" />
  {:else if item === 'sprengstoff'}
    <!-- Stange mit Zündschnur und Funke -->
    <rect x="5" y="9" width="11" height="12" rx="2.5" />
    <rect x="5" y="12" width="11" height="2" fill="var(--mark, #fff)" opacity="0.5" />
    <path d="M10.5 9 q1 -5 6 -5.5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
    <path d="M17 1 l1.2 2.2 2.3 .3 -1.7 1.7 .5 2.3 -2.3 -1.2 -2.3 1.2 .5 -2.3 -1.7 -1.7 2.3 -.3 Z" />
  {:else if item === 'moertel'}
    <!-- Kelle mit Haufen darauf -->
    <path d="M2 13 L15 9 L20 13 L15 17 Z" />
    <path d="M6 11 q3 -5 7 -1 Z" opacity="0.7" />
    <rect x="18" y="5" width="2.6" height="7" rx="1.3" transform="rotate(22 19 8)" opacity="0.8" />
  {:else if item === 'stuetzbalken'}
    <!-- A-förmige Stütze -->
    <path d="M10 2 h4 v20 h-4 Z" />
    <path d="M2 21 L10 9 v4.5 L5.5 21 Z" opacity="0.75" />
    <path d="M22 21 L14 9 v4.5 L18.5 21 Z" opacity="0.75" />
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
