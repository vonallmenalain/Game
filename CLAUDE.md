# Linie Null: Hinweise für die Arbeit im Repo

- Sprache im Repo ist Deutsch (Schweiz): «ss» statt «ß», Guillemets «…». Bezeichner im Code sind kurze ASCII-IDs wie in `docs/konzept.md` (zum Beispiel `eisenbarren`, `bp_stahl`).
- `docs/konzept.md` ist die Referenz für Spielregeln, Zahlen und Umfang. Wer im Code davon abweicht, führt das Konzept nach.
- Befehle: `npm install`, `npm run dev`, `npm run check` (svelte-check), `npm test` (Vitest), `npm run build`.
- Vor jedem Push: `npm run check && npm test && npm run build` müssen grün sein. Die CI führt dieselben drei Schritte aus.
- Architektur: `src/engine` ist reine Spiellogik ohne DOM, Einstieg `tick(state, dt)`. `src/ui` ist Svelte 5 mit Runes. Zahlen fürs Balancing liegen in `src/engine/balance.ts` und in `src/engine/data/`.
- Jede Bauphase aus Abschnitt 15 des Konzepts ist ein eigener Pull Request mit Squash-Merge.
