<script lang="ts">
  /**
   * Icons für alle Waren: bunt, mit dunklem Umriss, ohne Kästchen dahinter. Jede Ware
   * hat eigene Farben und eine eigene Silhouette, damit man sie am Bild erkennt, nicht
   * erst am Namen. Gezeichnet in einem 24er Raster. Der Umriss liegt unter der Fläche
   * (paint-order), so bleibt er gleich dick, wo sich Flächen berühren.
   */
  let { item }: { item: string } = $props();
</script>

<svg viewBox="0 0 24 24" role="presentation" aria-hidden="true" stroke="#1f2429" stroke-width="2.2" stroke-linejoin="round" stroke-linecap="round" paint-order="stroke">
  {#if item === 'eisenerz'}
    <!-- Rostroter Klumpen mit dunklen Adern -->
    <path d="M4 17 L6.5 9 L12.5 5 L19 8.5 L20.5 15.5 L15 20 L8 20.5 Z" fill="#a8653c" />
    <circle cx="10" cy="11.5" r="2.2" fill="#6e3d22" stroke="none" />
    <circle cx="15.5" cy="15" r="1.7" fill="#6e3d22" stroke="none" />
    <circle cx="9.5" cy="16.5" r="1.1" fill="#6e3d22" stroke="none" />
    <ellipse cx="14.5" cy="9" rx="2" ry="1.1" fill="#d99a6c" stroke="none" />
  {:else if item === 'kupfererz'}
    <!-- Grünes Gestein mit Kupferzacken -->
    <path d="M3 20 L5 12 L12 14 L19 11 L21 20 Z" fill="#4f8f7f" />
    <path d="M6 12.5 L8.5 3.5 L11.5 13.5 Z" fill="#e07b3c" />
    <path d="M13 13.5 L17 5.5 L19 11.5 Z" fill="#f0a06a" />
    <path d="M9 17 h6" stroke="#2f6b5e" stroke-width="1.2" fill="none" />
  {:else if item === 'kohle'}
    <!-- Schwarze, kantige Brocken -->
    <path d="M2.5 20 L4.5 10 L11 12 L10 20 Z" fill="#2b2f36" />
    <path d="M10.5 20 L11.5 9 L19.5 6 L21.5 20 Z" fill="#3a3f47" />
    <path d="M13 10.5 L18 8.2" stroke="#6b727c" stroke-width="1.2" fill="none" />
    <path d="M5.5 12.5 L9 13.5" stroke="#6b727c" stroke-width="1.2" fill="none" />
  {:else if item === 'koks'}
    <!-- Graue Briketts mit Loch, heller und poröser als Kohle -->
    <rect x="2" y="13" width="9" height="8" rx="2" fill="#6a717c" />
    <rect x="13" y="13" width="9" height="8" rx="2" fill="#7b828d" />
    <rect x="7.5" y="3" width="9" height="8" rx="2" fill="#868d98" />
    <circle cx="6.5" cy="17" r="1.7" fill="#2d3138" stroke="none" />
    <circle cx="17.5" cy="17" r="1.7" fill="#2d3138" stroke="none" />
    <circle cx="12" cy="7" r="1.7" fill="#2d3138" stroke="none" />
  {:else if item === 'holz'}
    <!-- Brauner Stamm mit hellem Hirnholz und Jahresringen -->
    <rect x="2" y="8" width="17" height="9" fill="#a06f3f" />
    <path d="M5 11 h9 M6 14.5 h8" stroke="#7a4f2a" stroke-width="1.1" fill="none" />
    <ellipse cx="19" cy="12.5" rx="3.4" ry="4.5" fill="#e2c08a" />
    <ellipse cx="19" cy="12.5" rx="1.9" ry="2.6" fill="none" stroke="#b5895a" stroke-width="0.9" />
    <circle cx="19" cy="12.5" r="0.8" fill="#b5895a" stroke="none" />
  {:else if item === 'stein'}
    <!-- Grauer Würfel in Schrägsicht -->
    <path d="M3 8 L12 13 L12 21 L3 16 Z" fill="#8e969f" />
    <path d="M21 8 L21 16 L12 21 L12 13 Z" fill="#6b737c" />
    <path d="M12 3 L21 8 L12 13 L3 8 Z" fill="#c3c9d0" />
  {:else if item === 'harz'}
    <!-- Bernsteinfarbener Tropfen -->
    <path d="M12 2.5 q7 9 7 12.5 a7 7 0 0 1 -14 0 q0 -3.5 7 -12.5 Z" fill="#e6a83a" />
    <ellipse cx="9.3" cy="15" rx="1.6" ry="2.4" fill="#fbe0a1" stroke="none" />
  {:else if item === 'kalk'}
    <!-- Cremeweisse Platten, gestapelt -->
    <path d="M2 19 L12 15 L22 19 L12 23 Z" fill="#d3cbb5" />
    <path d="M2 14 L12 10 L22 14 L12 18 Z" fill="#e3dcc8" />
    <path d="M2 9 L12 5 L22 9 L12 13 Z" fill="#efe9d8" />
  {:else if item === 'salpeter'}
    <!-- Lila Kristallnadeln, sternförmig -->
    <path d="M2.5 7 L11 11 L4.5 18 L9 11 Z" fill="#a9a3e0" />
    <path d="M21.5 7 L13 11 L19.5 18 L15 11 Z" fill="#a9a3e0" />
    <path d="M12 1.5 L14 10 L12 22 L10 10 Z" fill="#d3cff2" />
  {:else if item === 'eisenbarren'}
    <!-- Grauer Barren: helle Oberseite, dunkle Stirn und Flanke -->
    <path d="M3 11 L11 14.5 L11 19.5 L3 16 Z" fill="#8d959e" />
    <path d="M11 14.5 L21 9.5 L21 14.5 L11 19.5 Z" fill="#6c747d" />
    <path d="M3 11 L13 6 L21 9.5 L11 14.5 Z" fill="#cdd3d9" />
    <path d="M6 10.6 L13 7.3" stroke="#f0f3f6" stroke-width="1.1" fill="none" />
  {:else if item === 'kupferbarren'}
    <!-- Kupferroter Barren -->
    <path d="M3 11 L11 14.5 L11 19.5 L3 16 Z" fill="#c76a3b" />
    <path d="M11 14.5 L21 9.5 L21 14.5 L11 19.5 Z" fill="#9a4d2a" />
    <path d="M3 11 L13 6 L21 9.5 L11 14.5 Z" fill="#f2a672" />
    <path d="M6 10.6 L13 7.3" stroke="#ffd7b8" stroke-width="1.1" fill="none" />
  {:else if item === 'stahl'}
    <!-- Blaustahl-Barren mit Prägung -->
    <path d="M3 11 L11 14.5 L11 19.5 L3 16 Z" fill="#7e93ab" />
    <path d="M11 14.5 L21 9.5 L21 14.5 L11 19.5 Z" fill="#5a6c84" />
    <path d="M3 11 L13 6 L21 9.5 L11 14.5 Z" fill="#c2d0df" />
    <path d="M13.5 10.2 L16.5 8.7 L18.2 9.5 L15.2 11 Z" fill="#5a6c84" stroke="none" />
    <path d="M6 10.6 L11 8.2" stroke="#eef3f8" stroke-width="1.1" fill="none" />
  {:else if item === 'schienen'}
    <!-- Zwei Stahlschienen auf braunen Schwellen -->
    <path d="M4.5 7 L19 7 L19.4 10 L4.2 10 Z" fill="#8a5a2b" />
    <path d="M3.6 15 L20.2 15 L20.6 18 L3.3 18 Z" fill="#8a5a2b" />
    <path d="M6 2 L9 2 L7 22 L4 22 Z" fill="#9aa2ab" />
    <path d="M15 2 L18 2 L20 22 L17 22 Z" fill="#9aa2ab" />
    <path d="M7.4 3 L5.8 21 M16.6 3 L18.2 21" stroke="#d6dbe0" stroke-width="0.9" fill="none" />
  {:else if item === 'bretter'}
    <!-- Helle Latten mit Maserung -->
    <rect x="2" y="15.5" width="20" height="3.6" rx="1.2" fill="#d2a768" />
    <rect x="2" y="10.5" width="20" height="3.6" rx="1.2" fill="#dbb272" />
    <rect x="2" y="5.5" width="20" height="3.6" rx="1.2" fill="#e3bd7d" />
    <path d="M5 7.3 h8 M12 12.3 h7 M4 17.3 h6" stroke="#b8905a" stroke-width="0.8" fill="none" />
  {:else if item === 'bohlen'}
    <!-- Dicke, dunkle Balken mit Teerkante -->
    <path d="M2 10 L7 12 L7 18 L2 16 Z" fill="#6b4320" />
    <path d="M7 12 L22 8 L22 14 L7 18 Z" fill="#5a3618" />
    <path d="M2 10 L17 6 L22 8 L7 12 Z" fill="#8b5a2b" />
    <path d="M7.5 17.2 L21.5 13.4" stroke="#1a1a1a" stroke-width="1.6" fill="none" />
  {:else if item === 'zahnrad'}
    <!-- Messingfarbenes Zahnrad -->
    <path
      d="M12 2 l2.6 2.2 3.3 -.9 1.1 3.2 3.2 1.1 -.9 3.3 2.2 2.6 -2.2 2.6 .9 3.3 -3.2 1.1 -1.1 3.2 -3.3 -.9 -2.6 2.2 -2.6 -2.2 -3.3 .9 -1.1 -3.2 -3.2 -1.1 .9 -3.3 -2.2 -2.6 2.2 -2.6 -.9 -3.3 3.2 -1.1 1.1 -3.2 3.3 .9 Z"
      fill="#d9a441"
    />
    <circle cx="12" cy="12" r="3.6" fill="#6b4f1a" />
    <circle cx="12" cy="12" r="1.5" fill="#3d2d10" stroke="none" />
  {:else if item === 'nieten'}
    <!-- Drei silberne Nieten mit rundem Kopf -->
    <path d="M4 8.5 h3 l-.6 9 h-1.8 Z" fill="#7c8590" />
    <path d="M10.5 8.5 h3 l-.6 9 h-1.8 Z" fill="#7c8590" />
    <path d="M17 8.5 h3 l-.6 9 h-1.8 Z" fill="#7c8590" />
    <circle cx="5.5" cy="6" r="3" fill="#c0c7cf" />
    <circle cx="12" cy="6" r="3" fill="#c0c7cf" />
    <circle cx="18.5" cy="6" r="3" fill="#c0c7cf" />
    <circle cx="4.6" cy="5" r="0.8" fill="#eef1f4" stroke="none" />
    <circle cx="11.1" cy="5" r="0.8" fill="#eef1f4" stroke="none" />
    <circle cx="17.6" cy="5" r="0.8" fill="#eef1f4" stroke="none" />
  {:else if item === 'fahrgestell'}
    <!-- Dunkler Rahmen auf roten Rädern -->
    <path d="M2 8 L22 8 L20 13 L4 13 Z" fill="#3a4048" />
    <circle cx="7.5" cy="18" r="4" fill="#b6392d" />
    <circle cx="16.5" cy="18" r="4" fill="#b6392d" />
    <circle cx="7.5" cy="18" r="1.4" fill="#f2d7c9" stroke="none" />
    <circle cx="16.5" cy="18" r="1.4" fill="#f2d7c9" stroke="none" />
  {:else if item === 'bp_eisen' || item === 'bp_stahl' || item === 'bp_kupfer'}
    <!-- Blaupause: farbiges Blatt mit Eselsohr, die Marke unten nennt die Stufe -->
    <path d="M4 2 h11 l5 5 v15 h-16 Z" fill={item === 'bp_eisen' ? '#3f6fb5' : item === 'bp_stahl' ? '#4b4f9e' : '#2f8f86'} />
    <path d="M15 2 l5 5 h-5 Z" fill={item === 'bp_eisen' ? '#a9c4ec' : item === 'bp_stahl' ? '#b0b3e6' : '#9fd6cf'} />
    <g fill="#ffffff" stroke="none" opacity="0.9">
      <rect x="7" y="10" width="10" height="1.7" rx="0.85" />
      <rect x="7" y="13.5" width="7" height="1.7" rx="0.85" />
    </g>
    <circle cx="17" cy="18.5" r="2.7" fill={item === 'bp_eisen' ? '#b6bec6' : item === 'bp_stahl' ? '#dbe5ef' : '#f2a672'} />
  {:else if item === 'teer'}
    <!-- Schwarzes Fass mit Stahlreifen -->
    <path d="M5 4 h14 q2 8 0 16 h-14 q-2 -8 0 -16 Z" fill="#2a2d33" />
    <rect x="3.6" y="8.5" width="16.8" height="2.2" fill="#8b939d" />
    <rect x="3.6" y="13.5" width="16.8" height="2.2" fill="#8b939d" />
    <path d="M8 6 q-.8 6 0 12" stroke="#5a606a" stroke-width="1.1" fill="none" />
  {:else if item === 'stahltraeger'}
    <!-- Blaugrauer Doppel-T-Träger -->
    <path d="M3 2 h18 v4 h-6 v12 h6 v4 h-18 v-4 h6 v-12 h-6 Z" fill="#8ea3bb" />
    <path d="M12 6 v12" stroke="#5a6c84" stroke-width="1.4" fill="none" />
    <path d="M5 4 h14 M5 20 h14" stroke="#c2d0df" stroke-width="0.9" fill="none" />
  {:else if item === 'dampfkessel'}
    <!-- Kupferner Kessel mit Messingbändern, Ventil und Manometer -->
    <rect x="8" y="3" width="3.4" height="5" rx="1.4" fill="#8b939d" />
    <rect x="2" y="8" width="16" height="11" rx="5.5" fill="#c8703f" />
    <rect x="6" y="8" width="2.2" height="11" fill="#d9a441" stroke="none" />
    <rect x="11.5" y="8" width="2.2" height="11" fill="#d9a441" stroke="none" />
    <circle cx="20" cy="13.5" r="3" fill="#f2e8d0" />
    <path d="M20 13.5 l1.4 -1.6" stroke="#b6392d" stroke-width="1" fill="none" />
  {:else if item === 'kupferdraht'}
    <!-- Kupferdraht, gewunden -->
    <path d="M2.5 16 c0 -6 6 -6 6 0 s6 6 6 0 s6 -6 6 0" fill="none" stroke="#1f2429" stroke-width="4.4" />
    <path d="M2.5 16 c0 -6 6 -6 6 0 s6 6 6 0 s6 -6 6 0" fill="none" stroke="#d97a3a" stroke-width="2.4" />
    <path d="M4 21 c0 -5 5 -5 5 0 s5 5 5 0 s5 -5 5 0" fill="none" stroke="#1f2429" stroke-width="4" />
    <path d="M4 21 c0 -5 5 -5 5 0 s5 5 5 0 s5 -5 5 0" fill="none" stroke="#e8955a" stroke-width="2" />
    <circle cx="20.5" cy="6" r="2.2" fill="#d97a3a" />
  {:else if item === 'kupferspule'}
    <!-- Spule: dunkle Flansche, kupferne Wicklung -->
    <rect x="6.5" y="8" width="11" height="8" fill="#d97a3a" />
    <path d="M9.2 8.5 v7 M11.7 8.5 v7 M14.2 8.5 v7" stroke="#a4521f" stroke-width="0.9" fill="none" />
    <rect x="3" y="5" width="3.6" height="14" rx="1.2" fill="#3a4048" />
    <rect x="17.4" y="5" width="3.6" height="14" rx="1.2" fill="#3a4048" />
  {:else if item === 'bohrkopf'}
    <!-- Bohrer mit türkiser Hartmetallspitze -->
    <rect x="10" y="2" width="4" height="6" rx="1.4" fill="#6b737c" />
    <path d="M8.5 12 L8 8 h8 l-.5 4 Z" fill="#9aa2ab" />
    <path d="M9.5 9.5 l5 1.3 M9.6 11.2 l4.8 -1.3" stroke="#5a626b" stroke-width="0.9" fill="none" />
    <path d="M12 22 L7.5 12 h9 Z" fill="#3f8f7c" />
  {:else if item === 'sprengstoff'}
    <!-- Rote Sprengstoffstange mit Zündschnur und Funke -->
    <rect x="8" y="7" width="11" height="12" rx="2.5" fill="#a8322d" />
    <rect x="4" y="9.5" width="11" height="12" rx="2.5" fill="#c9403a" />
    <rect x="4" y="13" width="11" height="2.2" fill="#f2d7c9" stroke="none" />
    <path d="M9.5 9.5 q1 -5 6 -5.5" fill="none" stroke="#2b2b2b" stroke-width="1.6" />
    <path d="M17 1 l1.2 2.2 2.3 .3 -1.7 1.7 .5 2.3 -2.3 -1.2 -2.3 1.2 .5 -2.3 -1.7 -1.7 2.3 -.3 Z" fill="#f5c542" />
  {:else if item === 'moertel'}
    <!-- Kelle mit hellem Mörtel -->
    <rect x="18" y="4" width="2.8" height="7.5" rx="1.3" transform="rotate(22 19.4 7.75)" fill="#8b5a2b" />
    <path d="M2 13 L15 9 L20 13 L15 17 Z" fill="#8b939d" />
    <path d="M6 11.5 q3 -5.5 7 -1.5 Z" fill="#e6dcc4" />
  {:else if item === 'stuetzbalken'}
    <!-- Hölzerne Stütze mit Stahlplatte -->
    <path d="M2 21 L10 9 v4.5 L5.5 21 Z" fill="#7a4f2a" />
    <path d="M22 21 L14 9 v4.5 L18.5 21 Z" fill="#7a4f2a" />
    <path d="M10 2 h4 v20 h-4 Z" fill="#8b5a2b" />
    <rect x="8.6" y="10.2" width="6.8" height="2.6" rx="0.6" fill="#9aa2ab" />
  {:else}
    <circle cx="12" cy="12" r="7" fill="#9aa2ab" />
  {/if}
</svg>

<style>
  svg {
    width: 100%;
    height: 100%;
    display: block;
    overflow: visible;
  }
</style>
