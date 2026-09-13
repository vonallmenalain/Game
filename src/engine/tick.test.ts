import { describe, expect, it } from 'vitest';
import { BALANCE } from './balance';
import { BIOME_BY_ID, LOCO_BY_ID, OBSTACLE_BY_ID, PROJECT_BY_ID } from './data';
import { createInitialState, getStore, storeCap } from './state';
import { flowPerMinute, machineRatePerMinute, machineSpeed, tick } from './tick';
import { addMachine, addWagon, clone, grant, research, runFor } from './sim/testkit';
import { startResearch } from './actions';

describe('Ernte', () => {
  it('erntet mit Selbstlader und Vor-Ort-Bonus 45 Eisenerz pro Minute im Tal', () => {
    const s = createInitialState();
    research(s, 'selbstlader');
    runFor(s, 60);
    expect(getStore(s, 'eisenerz')).toBe(45);
    expect(s.wagons[0]?.status).toBe('aktiv');
  });

  it('jede weitere Erntemaschine im Wagen erntet noch einmal so viel', () => {
    const s = createInitialState();
    research(s, 'selbstlader');
    addMachine(s, s.wagons[0]!, { resource: 'eisenerz' });
    addMachine(s, s.wagons[0]!, { resource: 'kohle' });
    runFor(s, 60);
    expect(getStore(s, 'eisenerz')).toBe(90);
    expect(getStore(s, 'kohle')).toBe(BALANCE.startStore['kohle']! + 45);
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

  it('zwei Schmelzöfen im selben Wagen arbeiten nebeneinander', () => {
    const s = createInitialState();
    s.store['kohle'] = 60;
    const schmelz = addWagon(s, 'schmelz', { recipe: 'koks' });
    addMachine(s, schmelz, { recipe: 'koks' });
    runFor(s, 30);
    expect(getStore(s, 'koks')).toBe(30);
    expect(s.wagons[1]?.status).toBe('aktiv');
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

  it('gibt kurze Wege nur, wenn eine Maschine im selben Wagen die Zutat liefert', () => {
    const s = createInitialState();
    research(s, 'selbstlader');
    const schmelz = addWagon(s, 'schmelz', { recipe: 'eisenbarren' });
    const barren = schmelz.machines[0]!;
    expect(machineSpeed(s, schmelz, barren)).toBeCloseTo(1);
    // Ein Schmelzofen für Koks im selben Wagen bringt den Bonus
    addMachine(s, schmelz, { recipe: 'koks' });
    expect(machineSpeed(s, schmelz, barren)).toBeCloseTo(1.1);
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

describe('Ausstoss je Maschine', () => {
  it('rechnet Ernte und Rezept in Stück pro Minute, ohne Auftrag null', () => {
    const s = createInitialState();
    const ernte = s.wagons[0]!;
    // Ohne Kurbel steht die Maschine, die Zahl sagt das auch
    expect(machineRatePerMinute(s, ernte, ernte.machines[0]!)).toBe(0);
    research(s, 'selbstlader');
    // Eisenerz im Tal: 30 mal 1,5 vor Ort
    expect(machineRatePerMinute(s, ernte, ernte.machines[0]!)).toBeCloseTo(45);
    // Volles Lager heisst null, egal wie schnell die Maschine wäre
    s.store['eisenerz'] = storeCap(s);
    expect(machineRatePerMinute(s, ernte, ernte.machines[0]!)).toBe(0);
    s.store['eisenerz'] = 0;

    const schmelz = addWagon(s, 'schmelz', { recipe: 'koks' });
    // Koks: 1 Stück je 2 Sekunden
    expect(machineRatePerMinute(s, schmelz, schmelz.machines[0]!)).toBeCloseTo(30);

    const leer = addMachine(s, schmelz);
    expect(machineRatePerMinute(s, schmelz, leer)).toBe(0);

    // Kurze Wege und Stufe schlagen auf die Zahl durch
    const barren = addMachine(s, schmelz, { recipe: 'eisenbarren' });
    expect(machineRatePerMinute(s, schmelz, barren)).toBeCloseTo(16.5);
    schmelz.level = 2;
    expect(machineRatePerMinute(s, schmelz, barren)).toBeCloseTo(19.8);
  });
});

describe('Fluss je Ware', () => {
  it('rechnet Herstellung minus Verbrauch aus dem, was gerade eingestellt ist', () => {
    const s = createInitialState();
    research(s, 'selbstlader', 'schmelzwagen');
    grant(s, { kohle: 100, eisenerz: 100 });
    const schmelz = addWagon(s, 'schmelz', { recipe: 'koks' });
    addMachine(s, schmelz, { recipe: 'eisenbarren' });

    const flow = flowPerMinute(s);
    // Ernte 45, Eisenbarren frisst 2 je Lauf bei 16,5 Läufen
    expect(flow['eisenerz']).toBeCloseTo(45 - 33);
    // Koks: 30 aus dem einen Ofen, davon 16,5 in die Barren
    expect(flow['koks']).toBeCloseTo(30 - 16.5);
    // 30 in den Ofen, dazu 7 in den Kessel der fahrenden Lok
    expect(flow['kohle']).toBeCloseTo(-37, 1);
    expect(flow['eisenbarren']).toBeCloseTo(16.5);
  });

  it('zählt nicht mit, was gerade nicht laufen kann', () => {
    const s = createInitialState();
    research(s, 'schmelzwagen');
    const schmelz = addWagon(s, 'schmelz', { recipe: 'koks' });

    // Ohne Selbstlader steht die Ernte, bis jemand kurbelt
    expect(flowPerMinute(s)['eisenerz'] ?? 0).toBe(0);
    s.wagons[0]!.crankUntil = s.playedSeconds + 5;
    expect(flowPerMinute(s)['eisenerz']).toBeCloseTo(45);

    // Volles Ausgabelager: Der Ofen zählt nicht mehr mit, nur noch der Kessel
    expect(flowPerMinute(s)['kohle']).toBeCloseTo(-37, 1);
    s.store['koks'] = storeCap(s);
    expect(flowPerMinute(s)['kohle']).toBeCloseTo(-7, 1);

    // Pausiert zählt die Maschine gar nicht mehr
    s.store['koks'] = 0;
    schmelz.machines[0]!.recipe = null;
    expect(flowPerMinute(s)['kohle']).toBeCloseTo(-7, 1);
  });

  it('zieht Schienen und Brennstoff der Fahrt ab und rechnet die Werkbank mit', () => {
    const s = createInitialState();
    grant(s, { schienen: 100 });
    runFor(s, 1);
    expect(s.stop).toBe('faehrt');
    // 14 km/h sind 0,2333 km je Minute: rund 23 Schienen und 7 Kohle
    const fahrend = flowPerMinute(s);
    expect(fahrend['schienen']).toBeCloseTo(-23.33, 1);
    expect(fahrend['kohle']).toBeCloseTo(-7, 1);

    s.workbench.queue = ['koks'];
    const mitWerkbank = flowPerMinute(s);
    expect(mitWerkbank['koks']).toBeCloseTo(30);
    expect(mitWerkbank['kohle']).toBeCloseTo(-7 - 30, 1);
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
  it('verbraucht 100 Schienen und 30 Kohle je Kilometer', () => {
    const s = createInitialState();
    s.store['schienen'] = 100;
    s.store['kohle'] = 100;
    const seconds = (3600 / LOCO_BY_ID['dampflok']!.speedKmh) * 1.05;
    runFor(s, seconds);
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
    const schlucht = OBSTACLE_BY_ID['schlucht']!.km * BALANCE.railsPerKm;
    s.pos = schlucht - 1;
    s.km = s.pos / BALANCE.railsPerKm;
    s.discoveredBiomes = ['tal', 'wald'];
    grant(s, { schienen: 100, kohle: 100 });
    runFor(s, 30);
    expect(s.pos).toBe(schlucht);
    expect(s.stop).toBe('hindernis');
    expect(s.reachedObstacles).toContain('schlucht');
    expect(s.discoveredBiomes).not.toContain('berg');
    s.projects['bruecke']!.done = true;
    runFor(s, 10);
    expect(s.pos).toBeGreaterThan(schlucht);
    expect(s.discoveredBiomes).toContain('berg');
    expect(s.log.some((e) => e.kind === 'biom' && e.ref === 'berg')).toBe(true);
  });

  it('entdeckt den Wald, sobald er beginnt', () => {
    const s = createInitialState();
    const wald = BIOME_BY_ID['wald']!.startKm * BALANCE.railsPerKm;
    s.pos = wald - 1;
    s.km = s.pos / BALANCE.railsPerKm;
    grant(s, { schienen: 10, kohle: 10 });
    runFor(s, 10);
    expect(s.discoveredBiomes).toContain('wald');
  });
});

describe('Baustellen', () => {
  it('ziehen Material aus dem Lager, sobald es da ist, und werden fertig', () => {
    const s = createInitialState();
    research(s, 'stahlwerk', 'teerofen', 'brueckenbau');
    const bom = PROJECT_BY_ID['bruecke']!.bom;
    const need = (item: string) => bom.find((b) => b.item === item)!.amount;
    grant(s, { stahltraeger: need('stahltraeger') - 40, bohlen: need('bohlen'), nieten: need('nieten') + 200, teer: need('teer') });
    tick(s, 1);
    const st = s.projects['bruecke']!;
    expect(st.delivered['stahltraeger']).toBe(need('stahltraeger') - 40);
    expect(st.delivered['nieten']).toBe(need('nieten'));
    expect(getStore(s, 'nieten')).toBe(200);
    expect(st.done).toBe(false);
    grant(s, { stahltraeger: 40 });
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
