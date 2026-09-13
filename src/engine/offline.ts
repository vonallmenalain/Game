import { BALANCE } from './balance';
import { PROJECTS } from './data';
import { getStore, offlineCapSeconds, projectProgress, storeCap } from './state';
import { tick } from './tick';
import type { BiomeId, GameState, ItemId, ObstacleId, ProjectId, StopReason, TechId } from './types';

export interface OfflineWarning {
  code: Exclude<StopReason, 'faehrt'>;
  /** Sekunden nach Beginn der Abwesenheit */
  at: number;
}

export interface OfflineReport {
  elapsedSeconds: number;
  simulatedSeconds: number;
  lostSeconds: number;
  kmBefore: number;
  kmAfter: number;
  biomes: BiomeId[];
  obstacles: ObstacleId[];
  techsDone: TechId[];
  projectsDone: ProjectId[];
  projectProgress: { id: ProjectId; before: number; after: number }[];
  fullItems: ItemId[];
  warnings: OfflineWarning[];
  stoppedSeconds: number;
}

/**
 * Holt die Abwesenheit nach: dieselbe Tick-Funktion wie im Spiel, in groben Schritten,
 * gedeckelt auf den Offline-Deckel. Verändert den Zustand und liefert den Bericht.
 */
export function simulateOffline(state: GameState, elapsedSeconds: number): OfflineReport {
  const elapsed = Math.max(0, elapsedSeconds);
  const cap = offlineCapSeconds(state);
  const simulated = Math.min(elapsed, cap);

  const kmBefore = state.km;
  const logStart = state.log.length;
  const stoppedBefore = state.stats.stoppedSeconds;
  const progressBefore = new Map<ProjectId, number>();
  for (const def of PROJECTS) progressBefore.set(def.id, projectProgress(state, def.id));

  const warnings: OfflineWarning[] = [];
  const seen = new Set<StopReason>();
  let done = 0;
  const step = BALANCE.offlineStepSeconds;
  while (done < simulated - 1e-9) {
    const dt = Math.min(step, simulated - done);
    tick(state, dt);
    done += dt;
    if (state.stop !== 'faehrt' && !seen.has(state.stop)) {
      seen.add(state.stop);
      warnings.push({ code: state.stop, at: done });
    }
  }

  const newLog = state.log.slice(logStart);
  const cap2 = storeCap(state);
  const fullItems = Object.keys(state.store).filter((item) => getStore(state, item) >= cap2);

  return {
    elapsedSeconds: elapsed,
    simulatedSeconds: simulated,
    lostSeconds: elapsed - simulated,
    kmBefore,
    kmAfter: state.km,
    biomes: newLog.filter((e) => e.kind === 'biom').map((e) => e.ref),
    obstacles: newLog.filter((e) => e.kind === 'hindernis').map((e) => e.ref),
    techsDone: newLog.filter((e) => e.kind === 'forschung').map((e) => e.ref),
    projectsDone: newLog.filter((e) => e.kind === 'projekt').map((e) => e.ref),
    projectProgress: PROJECTS.filter((def) => !def.preview)
      .map((def) => ({ id: def.id, before: progressBefore.get(def.id) ?? 0, after: projectProgress(state, def.id) }))
      .filter((p) => p.after > 0 || p.before > 0),
    fullItems,
    warnings,
    stoppedSeconds: state.stats.stoppedSeconds - stoppedBefore,
  };
}

/** Ob sich das Nachholen lohnt: erst ab einer Minute Abwesenheit */
export function needsCatchUp(elapsedSeconds: number): boolean {
  return elapsedSeconds >= BALANCE.offlineMinSeconds;
}
