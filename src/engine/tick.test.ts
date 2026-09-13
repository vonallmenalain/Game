import { describe, expect, it } from 'vitest';
import { BALANCE } from './balance';
import { createInitialState, getStore, storeCap } from './state';
import { productionSpeed, tick } from './tick';
import { addWagon, clone, grant, research, runFor } from './sim/testkit';
import { startResearch } from './actions';

describe('Ernte', () => {
  it('erntet mit Selbstlader und Vor-Ort-Bonus 45 Eisenerz pro Minute im Tal', () => {
    const s = createInitialState();
    research(s, 'selbstlader');
    runFor(s, 60);
    expect(getStore(s, 'eisenerz')).toBe(45);
    expect(s.wagons[0]?.status).toBe('aktiv');
  });

  it('wartet ohne Selbstlader auf die Handkurbel', () => {
    const s = createInitialState();
    runFor(s, 30);
    expect(getStore(s, 'eisenerz')).toBe(0);
    expect(s.wagons[0]?.status).toBe('wartet');
    s.wagons[0]!.crankUntil = s.playedSeconds + BALANCE.crankSeconds;
    runFor(s, 10);
    expect(getStore(s, 'eisenerz')).toBe(3);
  });

  it('blockiert bei voller Kapazität', () => {
    const s = createInitialState();
    research(s, 'selbstlader');
    s.store['eisenerz'] = storeCap(s);
    runFor(s, 10);
    expect(getStore(s, 'eisenerz')).toBe(storeCap(s));
    expect(s.wagons[0]?.status).toBe('blockiert');
  });
});

describe('Produktion', () => {
  it('verarbeitet Kohle zu Koks mit 30 pro Minute und wartet dann auf Zutaten', () => {
    const s = createInitialState();
    s.store['kohle'] = 30;
    addWagon(s, 'schmelz', { recipe: 'koks' });
    runFor(s, 61);
    expect(getStore(s, 'koks')).toBe(30);
    expect(getStore(s, 'kohle')).toBe(0);
    expect(s.wagons[1]?.status).toBe('wartet');
  });

  it('liefert unabhängig vom Zeitschritt dasselbe Ergebnis', () => {
    const make = () => {
      const s = createInitialState();
      research(s, 'selbstlader');
      grant(s, { kohle: 200, holz: 100 });
      addWagon(s, 'ernte', { resource: 'kohle' });
      addWagon(s, 'schmelz', { recipe: 'koks' });
      addWagon(s, 'schmelz', { recipe: 'eisenbarren' });
      addWagon(s, 'werk', { recipe: 'bretter', level: 5 });
      return s;
    };
    const fine = make();
    const coarse = make();
    runFor(fine, 300, 0.25);
    runFor(coarse, 300, 1);
    for (const item of ['koks', 'eisenbarren', 'bretter', 'eisenerz', 'kohle']) {
      expect(Math.abs(getStore(fine, item) - getStore(coarse, item)), item).toBeLessThanOrEqual(1);
    }
  });

  it('gibt den Nachbarschaftsbonus nur, wenn der Wagen davor die Zutat liefert', () => {
    const s = createInitialState();
    research(s, 'selbstlader');
    addWagon(s, 'schmelz', { recipe: 'eisenbarren' });
    expect(productionSpeed(s, 1)).toBeCloseTo(1.1);
    const [a, b] = s.wagons;
    s.wagons = [b!, a!];
    expect(productionSpeed(s, 0)).toBeCloseTo(1);
  });

  it('blockiert, wenn das Lager für die Ausgabe voll ist', () => {
    const s = createInitialState();
    s.store['kohle'] = 50;
    s.store['koks'] = storeCap(s);
    addWagon(s, 'schmelz', { recipe: 'koks' });
    runFor(s, 10);
    expect(s.wagons[1]?.status).toBe('blockiert');
    expect(getStore(s, 'kohle')).toBe(50);
  });
});

describe('Werkbank', () => {
  it('arbeitet die Warteschlange mit einfachem Tempo ab', () => {
    const s = createInitialState();
    s.store['kohle'] = 2;
    s.workbench.queue = ['koks', 'koks'];
    runFor(s, 4);
    expect(getStore(s, 'koks')).toBe(2);
    expect(s.workbench.queue).toHaveLength(0);
  });

  it('wartet auf Zutaten, ohne den Auftrag zu verlieren', () => {
    const s = createInitialState();
    s.store['kohle'] = 0;
    s.workbench.queue = ['koks'];
    runFor(s, 5);
    expect(s.workbench.queue).toEqual(['koks']);
    s.store['kohle'] = 1;
    runFor(s, 2);
    expect(getStore(s, 'koks')).toBe(1);
  });
});

describe('Bewegung', () => {
  it('verbraucht 100 Schienen und 30 Kohle je Kilometer bei 12 km/h', () => {
    const s = createInitialState();
    s.store['schienen'] = 100;
    s.store['kohle'] = 100;
    runFor(s, 310);
    expect(s.km).toBeCloseTo(1, 5);
    expect(getStore(s, 'schienen')).toBe(0);
    expect(getStore(s, 'kohle')).toBe(70);
    expect(s.stop).toBe('schienen');
    expect(s.warnings.map((w) => w.code)).toContain('schienen_leer');
  });

  it('hält ohne Brennstoff an', () => {
    const s = createInitialState();
    s.store['schienen'] = 100;
    s.store['kohle'] = 0;
    runFor(s, 30);
    expect(s.pos).toBe(0);
    expect(s.stop).toBe('brennstoff');
  });

  it('hält vor der Schlucht, bis die Brücke steht, und entdeckt dann den Berg', () => {
    const s = createInitialState();
    s.pos = 2399;
    s.km = 23.99;
    s.discoveredBiomes = ['tal', 'wald'];
    grant(s, { schienen: 100, kohle: 100 });
    runFor(s, 30);
    expect(s.pos).toBe(2400);
    expect(s.stop).toBe('hindernis');
    expect(s.reachedObstacles).toContain('schlucht');
    expect(s.discoveredBiomes).not.toContain('berg');
    s.projects['bruecke']!.done = true;
    runFor(s, 10);
    expect(s.pos).toBeGreaterThan(2400);
    expect(s.discoveredBiomes).toContain('berg');
    expect(s.log.some((e) => e.kind === 'biom' && e.ref === 'berg')).toBe(true);
  });

  it('entdeckt den Wald bei Kilometer 8', () => {
    const s = createInitialState();
    s.pos = 799;
    s.km = 7.99;
    grant(s, { schienen: 10, kohle: 10 });
    runFor(s, 10);
    expect(s.discoveredBiomes).toContain('wald');
  });
});

describe('Baustellen', () => {
  it('ziehen Material aus dem Lager, sobald es da ist, und werden fertig', () => {
    const s = createInitialState();
    research(s, 'stahlwerk', 'teerofen', 'brueckenbau');
    grant(s, { stahltraeger: 100, bohlen: 600, nieten: 1000, teer: 80 });
    tick(s, 1);
    const st = s.projects['bruecke']!;
    expect(st.delivered['stahltraeger']).toBe(100);
    expect(st.delivered['nieten']).toBe(800);
    expect(getStore(s, 'nieten')).toBe(200);
    expect(st.done).toBe(false);
    grant(s, { stahltraeger: 140 });
    tick(s, 1);
    expect(st.done).toBe(true);
    expect(s.log.some((e) => e.kind === 'projekt' && e.ref === 'bruecke')).toBe(true);
  });

  it('pausierte Baustellen nehmen nichts', () => {
    const s = createInitialState();
    research(s, 'stahlwerk', 'teerofen', 'brueckenbau');
    s.projects['bruecke']!.paused = true;
    grant(s, { teer: 80 });
    tick(s, 1);
    expect(getStore(s, 'teer')).toBe(80);
  });

  it('eine fertige Lok ersetzt die alte', () => {
    const s = createInitialState();
    research(s, 'stahlwerk', 'schwere_dampflok');
    grant(s, { dampfkessel: 6, stahl: 60, nieten: 120, zahnrad: 40 });
    tick(s, 1);
    expect(s.loco).toBe('schwere_dampflok');
    expect(s.log.some((e) => e.kind === 'lok')).toBe(true);
  });
});

describe('Forschung', () => {
  it('läuft ohne Büro mit halbem Tempo', () => {
    const s = createInitialState();
    grant(s, { bp_eisen: 3 });
    expect(startResearch(s, 'selbstlader').ok).toBe(true);
    runFor(s, 59);
    expect(s.techs.done).not.toContain('selbstlader');
    runFor(s, 2);
    expect(s.techs.done).toContain('selbstlader');
    expect(getStore(s, 'bp_eisen')).toBe(0);
  });

  it('läuft mit Büro mit vollem Tempo', () => {
    const s = createInitialState();
    grant(s, { bp_eisen: 3 });
    addWagon(s, 'buero');
    startResearch(s, 'selbstlader');
    runFor(s, 31);
    expect(s.techs.done).toContain('selbstlader');
  });
});

describe('Determinismus', () => {
  it('zwei gleiche Läufe enden im gleichen Zustand', () => {
    const make = () => {
      const s = createInitialState();
      research(s, 'selbstlader');
      grant(s, { kohle: 100, schienen: 50 });
      addWagon(s, 'ernte', { resource: 'kohle' });
      addWagon(s, 'schmelz', { recipe: 'koks' });
      addWagon(s, 'schmelz', { recipe: 'eisenbarren' });
      addWagon(s, 'walz', { recipe: 'schienen' });
      return s;
    };
    const a = make();
    const b = clone(make());
    runFor(a, 600);
    runFor(b, 600);
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });
});
