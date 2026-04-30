# Frontend-Struktur (Punkt 3)

Vorschlag für die React+TypeScript Struktur:

- `src/ui/App.tsx`
  - Layout (Topbar, Ressourcenliste, Gebäude, Produktionspanel)
- `src/ui/components/TopBar.tsx`
  - Strom, Forschungspunkte, Spielzeit
- `src/ui/components/ResourcePanel.tsx`
  - Live-Bestände aller Ressourcen
- `src/ui/components/BuildingList.tsx`
  - Gebäudezustände inkl. Fortschritt je Rezept
- `src/ui/components/RecipePicker.tsx`
  - Rezeptzuweisung je Gebäude
- `src/ui/hooks/useGameLoop.ts`
  - RAF + fixed timestep
- `src/game/engine.ts`
  - reine Simulationslogik (testbar)

## Integrationshinweis

UI sollte nur auf `tick(state, dt)` zugreifen und den Zustand rendern.
So bleibt die Spiel-Engine unabhängig vom Framework.
