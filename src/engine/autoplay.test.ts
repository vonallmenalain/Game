import { describe, expect, it } from 'vitest';
import { formatDuration } from '../lib/format';
import { autoplay } from './sim/autoplay';

const KEY_EVENTS = ['biom:wald', 'hindernis:schlucht', 'projekt:schwere_dampflok', 'projekt:bruecke', 'biom:berg', 'hindernis:bergmassiv', 'projekt:tunnel', 'forschung:wuestenausruestung', 'hindernis:wuestenstrecke'];

describe('Sackgassen-Test: der Autospieler erreicht den Tunnel', () => {
  it('spielt den ersten Stand ohne Oberfläche durch', () => {
    const result = autoplay({ maxSeconds: 14 * 3600, stopAt: 'tunnel' });
    const lines = result.events
      .filter((e) => KEY_EVENTS.includes(e.name))
      .map((e) => `${formatDuration(e.at).padStart(12)}  km ${e.km.toFixed(1).padStart(5)}  ${e.name}`);
    const research = result.events.filter((e) => e.name.startsWith('forschung:')).map((e) => `${formatDuration(e.at).padStart(12)}  ${e.name}`);
    console.info(['Zeitplan des Autospielers:', ...lines, 'Forschung:', ...research, `Ende bei ${formatDuration(result.seconds)}, km ${result.state.km.toFixed(1)}, Zug: ${result.state.wagons.map((w) => `${w.type}${w.level}`).join(' ')}`].join('\n'));
    expect(result.reachedTunnel).toBe(true);
    expect(result.seconds).toBeLessThan(12 * 3600);
  }, 120000);
});
