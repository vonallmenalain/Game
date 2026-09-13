import { BIOMES, OBSTACLES, OBSTACLE_BY_ID, currentLoco, type GameState } from '../engine';
import { itemName } from './labels';

export interface NextEvent {
  label: string;
  km: number;
  kind: 'biom' | 'hindernis';
}

/** Das nächste Biom oder Hindernis vor dem Zug */
export function nextEvent(state: GameState): NextEvent | null {
  const candidates: NextEvent[] = [];
  for (const b of BIOMES) {
    if (b.startKm > state.km && !state.discoveredBiomes.includes(b.id)) candidates.push({ label: b.name, km: b.startKm, kind: 'biom' });
  }
  for (const o of OBSTACLES) {
    if (o.km >= state.km && !state.projects[o.project]?.done) candidates.push({ label: o.name, km: o.km, kind: 'hindernis' });
  }
  candidates.sort((a, b) => a.km - b.km);
  return candidates[0] ?? null;
}

export function stopText(state: GameState): string {
  const loco = currentLoco(state);
  switch (state.stop) {
    case 'faehrt':
      return `fährt, ${loco.speedKmh} km/h`;
    case 'hindernis': {
      const obstacle = OBSTACLES.find((o) => o.km * 100 === state.pos);
      return obstacle ? `steht vor: ${OBSTACLE_BY_ID[obstacle.id]?.name ?? obstacle.name}` : 'steht vor einem Hindernis';
    }
    case 'schienen':
      return 'steht: keine Schienen';
    case 'brennstoff':
      return `steht: kein ${itemName(loco.fuel)}`;
    default:
      return '';
  }
}
