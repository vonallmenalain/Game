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
| 3 Prototyp, Phase 1 | Engine mit Daten, Tick, Speichern und Tests | offen |
| 3 Prototyp, Phasen 2 bis 5 | Bedienung, Rückkehr, Bühne, Spieltest | offen |

## Entwicklung

```sh
npm install
npm run dev      # Entwicklungsserver
npm run check    # Typprüfung mit svelte-check
npm test         # Tests mit Vitest
npm run build    # Produktionsbuild nach dist/
```

Die App ist eine Progressive Web App: installierbar, offline lauffähig, Updates per Hinweis in der App. Gehostet wird auf Netlify, der Build läuft mit `netlify.toml`.

## Dokumente

- [Spielkonzept](docs/konzept.md): Pitch, Säulen, Kern-Loop, Welt, Zug, Rezepte, Forschung, Bauprojekte, Offline, Oberfläche, Technik, Umfang des ersten Stands.
