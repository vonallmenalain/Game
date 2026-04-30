import { createInitialState } from "./initialState";
import { GameState } from "./types";
const KEY = "matrix-foundry-save";
export const saveGame = (state: GameState) => localStorage.setItem(KEY, JSON.stringify(state));
export const loadGame = (): GameState => { const raw = localStorage.getItem(KEY); if (!raw) return createInitialState(); try { return JSON.parse(raw) as GameState; } catch { return createInitialState(); } };
export const resetGame = () => { localStorage.removeItem(KEY); return createInitialState(); };
