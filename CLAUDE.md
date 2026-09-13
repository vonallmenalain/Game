# Linie Null: Hinweise für die Arbeit im Repo

- Sprache im Repo ist Deutsch (Schweiz): «ss» statt «ß», Guillemets «…». Bezeichner im Code sind kurze ASCII-IDs wie in `docs/konzept.md` (zum Beispiel `eisenbarren`, `bp_stahl`).
- `docs/konzept.md` ist die Referenz für Spielregeln, Zahlen und Umfang. Wer im Code davon abweicht, führt das Konzept nach.
- Befehle: `npm install`, `npm run dev`, `npm run check` (svelte-check), `npm test` (Vitest), `npm run build`.
- Vor jedem Push: `npm run check && npm test && npm run build` müssen grün sein. Die CI führt dieselben drei Schritte aus.
- Architektur: `src/engine` ist reine Spiellogik ohne DOM, Einstieg `tick(state, dt)`. `src/ui` ist Svelte 5 mit Runes. Zahlen fürs Balancing liegen in `src/engine/balance.ts` und in `src/engine/data/`.
- Jede Bauphase aus Abschnitt 15 des Konzepts ist ein eigener Pull Request mit Squash-Merge.
- Balancing-Messlatte: `npx vitest run src/engine/autoplay.test.ts` spielt den ersten Stand mit dem Autospieler durch und druckt den Zeitplan. Änderungen an Zahlen gegen diesen Zeitplan prüfen.
- Oberfläche: `src/ui/game.svelte.ts` hält den Spielzustand als `$state` und treibt die Engine mit festem Zeitschritt. Komponenten liegen in `src/ui/components`, Texte für die Oberfläche in `src/ui/labels.ts`. Aktionen laufen über `game.run(...)`, das Fehler als Toast zeigt.
- Smoke-Test im Browser: `npm run build && npx vite preview --port 4173 &` und dann `npm run smoke` (Chromium unter `CHROMIUM_PATH`, Standard `/opt/pw-browsers/chromium`). Prüft Ernte, Werkbank, Bildschirme und den Spielstand nach einem Reload.
- Rückkehr: `game.boot()` rechnet die Abwesenheit mit `simulateOffline` nach, sobald sie eine Minute übersteigt, zeigt dabei den Rückkehr-Bildschirm und danach den Bericht. Der Spielstand merkt sich die Wanduhr in `lastSavedAt`.
- Bühne: `src/ui/components/Stage.svelte` legt den Zug als HTML über die SVG-Landschaft (`Landscape.svelte`), damit die Wagen antippbar und scrollbar bleiben. Farbstimmungen und das deterministische Streuen stehen in `src/ui/stage/scenery.ts`. Meilensteine erkennt der Spielstore aus neuen Fahrtenbuch-Einträgen; was in der Abwesenheit geschah, wird nicht gefeiert, das steht im Rückkehr-Bericht.
- Glyphen: Jede Ware braucht eine Form in `src/ui/components/ItemIcon.svelte` und einen Eintrag in `src/ui/glyphs.ts`. Fehlt einer, schlägt der Test in `src/ui/labels.test.ts` an.
