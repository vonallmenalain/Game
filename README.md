# Linie Null

Ein Idle-Aufbauspiel mit Produktionsketten als Progressive Web App, in der Tradition von Idle Planet Miner und Dyson Sphere Program.

Dein Zug ist deine Fabrik. Jeder Wagen ist eine Maschine, Schienen sind ein Produkt, und ohne Schienen steht der Zug. Vor dir liegen Biome mit neuen Rohstoffen und Hindernisse, die nur ein Bauprojekt überwindet: Brücke, Tunnel, Fähre, Raumbahnhof.

## Stand

Prototyp in Arbeit, nach dem Bauplan in Abschnitt 15 des Konzepts.

| Schritt | Ergebnis | Status |
|---|---|---|
| 1 Brainstorming | Fünf Richtungen verglichen, der Zug gewählt | erledigt |
| 2 Konzept | [docs/konzept.md](docs/konzept.md) | erledigt |
| 3 Prototyp, Phase 0 | Projektgerüst: Vite, Svelte 5, TypeScript, Vitest, PWA, Netlify, CI | erledigt |
| 3 Prototyp, Phase 1 | Engine mit Daten, Tick, Aktionen, Nachsimulation, Speichern, Autospieler und Tests | erledigt |
| 3 Prototyp, Phase 2 | Bedienung: Zugstreifen, Wagenliste und Wagen-Detail, Werkstatt, Lager, Forschung, Strecke mit Baustellen, Autosave | erledigt |
| 3 Prototyp, Phase 3 | Rückkehr: Nachholen der Abwesenheit, Rückkehr-Bericht, Sicherung als Datei | erledigt |
| 3 Prototyp, Phase 4 | Bühne: Landschaft mit Parallax, Zug als Silhouetten, Bauwerke, Meilenstein-Moment | erledigt |
| 3 Prototyp, Phase 5 | Spieltest: Balancing gegen die Messlatte, Glyphen für alle Waren, Texte | erledigt |

Der erste spielbare Stand ist damit fertig: drei Biome, zwei Bauprojekte, dreissig Waren, Offline-Nachholen und Sicherung als Datei.

## Entwicklung

```sh
npm install
npm run dev      # Entwicklungsserver
npm run check    # Typprüfung mit svelte-check
npm test         # Tests mit Vitest
npm run build    # Produktionsbuild nach dist/
```

Die Engine liegt in `src/engine` und läuft ohne Browser. `npx vitest run src/engine/autoplay.test.ts` spielt den ersten Stand mit dem Autospieler durch und zeigt, wann Wald, Schlucht, Brücke und Tunnel erreicht werden.

`npm run build`, dann `npx vite preview --port 4173` und in einer zweiten Shell `npm run smoke` klickt sich mit Chromium durch die Oberfläche und legt Bildschirmfotos unter `smoke-shots/` ab.

Die App ist eine Progressive Web App: installierbar, offline lauffähig, Updates per Hinweis in der App. Gehostet wird auf Netlify, der Build läuft mit `netlify.toml`.

## Dokumente

- [Spielkonzept](docs/konzept.md): Pitch, Säulen, Kern-Loop, Welt, Zug, Rezepte, Forschung, Bauprojekte, Offline, Oberfläche, Technik, Umfang des ersten Stands.
