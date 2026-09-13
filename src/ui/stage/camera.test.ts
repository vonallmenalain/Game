import { describe, expect, it } from 'vitest';
import { createInitialState } from '../../engine';
import { addWagon } from '../../engine/sim/testkit';
import { COUPLING, FIT, VEHICLE_SPEC, fitCamera, focusCamera, layerTransform, layoutTrain, panBounds, visibleRange } from './camera';
import { stageFocus } from './focus';
import { Motion, feltSpeed } from './motion';

const view = { width: 390, height: 230, trackY: 196 };

describe('Zug-Layout', () => {
  it('stellt die Lok bei null auf und hängt die Wagen mit Kupplungsabstand an', () => {
    const s = createInitialState();
    addWagon(s, 'schmelz');
    const layout = layoutTrain(s, 2, true);
    expect(layout.items.map((i) => i.kind)).toEqual(['dampflok', 'ernte', 'schmelz', 'platz']);
    expect(layout.items[0]?.x).toBe(0);
    expect(layout.items[1]?.x).toBe((VEHICLE_SPEC.dampflok.w + COUPLING) * 2);
    expect(layout.items[1]?.wagonId).toBe(s.wagons[0]?.id);
    expect(layout.items[0]?.wagonId).toBeUndefined();
    const last = layout.items[layout.items.length - 1]!;
    expect(layout.right).toBe(last.x + last.w);
  });
});

describe('Kamera', () => {
  it('passt einen kurzen Zug ins Bild, ohne ihn riesig zu machen', () => {
    const cam = fitCamera({ left: 0, right: 300 }, view, 1);
    expect(cam.s).toBe(FIT.maxShare);
    expect(cam.x).toBe(150);
  });

  it('verkleinert einen langen Zug bis zur Grenze und lässt dann schwenken', () => {
    const cam = fitCamera({ left: 0, right: 3000 }, view, 1);
    expect(cam.s).toBe(FIT.min);
    const bounds = panBounds({ left: 0, right: 3000 }, cam.s, view);
    expect(bounds.min).toBeGreaterThan(0);
    expect(bounds.max).toBeLessThan(3000);
    expect(bounds.min).toBeLessThan(bounds.max);
    // Kurzer Zug: keine Schwenkfreiheit, die Mitte bleibt die Mitte
    const kurz = panBounds({ left: 0, right: 300 }, FIT.maxShare, view);
    expect(kurz.min).toBe(150);
    expect(kurz.max).toBe(150);
  });

  it('holt ein Fahrzeug in die Mitte und begrenzt es auf Breite und Höhe', () => {
    const cam = focusCamera({ x: 400, w: 300, h: 100 }, view);
    expect(cam.x).toBe(550);
    expect(cam.s).toBeLessThanOrEqual(1);
    expect(cam.s * 300).toBeLessThanOrEqual(view.width * 0.9 + 0.001);
    const hoch = focusCamera({ x: 0, w: 100, h: 400 }, view);
    expect(hoch.s * 400).toBeLessThanOrEqual(view.trackY * 0.8 + 0.001);
  });

  it('schiebt jede Ebene so, dass der Zielpunkt auf Schienenhöhe in der Mitte liegt', () => {
    const cam = { s: 0.5, x: 1000 };
    expect(layerTransform(cam, 1, view)).toBe('translate3d(-305px, 196px, 0) scale(0.5)');
    // Ferne Ebene: kleinerer Exponent, also weniger Verkleinerung
    expect(layerTransform(cam, 0, view)).toBe('translate3d(-805px, 196px, 0) scale(1)');
    const range = visibleRange(cam, 1, view);
    expect(range.left).toBe(1000 - 390);
    expect(range.right).toBe(1000 + 390);
  });
});

describe('Ausschnitt je Register', () => {
  it('zeigt den Zug, den aufgeklappten Wagen, den Lagerwagen oder die Lok', () => {
    const s = createInitialState();
    const ernte = s.wagons[0]!;
    expect(stageFocus('zug', { kind: 'none' }, s)).toEqual({ kind: 'zug' });
    expect(stageFocus('zug', { kind: 'bauen' }, s)).toEqual({ kind: 'zug' });
    expect(stageFocus('zug', { kind: 'wagen', id: ernte.id }, s)).toEqual({ kind: 'wagen', id: ernte.id });
    // Ein Wagen, den es nicht mehr gibt, holt keine Kamera
    expect(stageFocus('zug', { kind: 'wagen', id: 999 }, s)).toEqual({ kind: 'zug' });
    expect(stageFocus('werkstatt', { kind: 'wagen', id: ernte.id }, s)).toEqual({ kind: 'zug' });
    expect(stageFocus('forschung', { kind: 'none' }, s)).toEqual({ kind: 'zug' });
    expect(stageFocus('strecke', { kind: 'none' }, s)).toEqual({ kind: 'lok' });
    expect(stageFocus('lager', { kind: 'none' }, s)).toEqual({ kind: 'zug' });
    const lager = addWagon(s, 'lager');
    expect(stageFocus('lager', { kind: 'none' }, s)).toEqual({ kind: 'wagen', id: lager.id });
    expect(stageFocus('mehr', { kind: 'none' }, s)).toEqual({ kind: 'zug' });
  });
});

describe('Bewegung', () => {
  it('fährt weich an, hält weich und ruft die Abonnenten', () => {
    const m = new Motion();
    m.speed = 100;
    const seen: number[] = [];
    const off = m.subscribe((d) => seen.push(d));
    expect(seen).toEqual([0]);
    expect(m.step(0.1)).toBe(false);
    m.target = 1;
    let moving = true;
    for (let i = 0; i < 40 && moving; i += 1) moving = m.step(0.1);
    expect(m.rate).toBe(1);
    // Nach dem Anfahren rollt es mit vollem Tempo: 100 je Sekunde
    const before = m.dist;
    m.step(0.1);
    expect(m.dist - before).toBeCloseTo(10, 5);
    m.target = 0;
    for (let i = 0; i < 40; i += 1) m.step(0.1);
    expect(m.rate).toBe(0);
    expect(m.step(0.1)).toBe(false);
    const stopped = m.dist;
    m.step(0.1);
    expect(m.dist).toBe(stopped);
    off();
    m.target = 1;
    m.step(0.1);
    expect(seen[seen.length - 1]).toBe(stopped);
  });

  it('fühlt sich mit einer schnelleren Lok schneller an', () => {
    expect(feltSpeed(19)).toBeGreaterThan(feltSpeed(14));
  });
});
