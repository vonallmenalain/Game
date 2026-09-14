import { describe, expect, it } from 'vitest';
import { queueCraftChain } from './actions';
import { BALANCE } from './balance';
import { ingredientsOf, outputBlocked, outputsOf, planCraft } from './craft';
import { createInitialState, getStore, storeCap } from './state';
import { grant, research, runFor } from './sim/testkit';

describe('Herstellungskette planen', () => {
  it('nimmt alles aus dem Lager, wenn genug da ist', () => {
    const s = createInitialState();
    grant(s, { eisenerz: 10, koks: 5 });
    const plan = planCraft(s, 'eisenbarren');
    expect(plan.steps).toEqual([{ recipe: 'eisenbarren', runs: 1 }]);
    expect(plan.missing).toEqual([]);
    expect(plan.fromStore).toEqual([{ item: 'eisenerz', amount: 2 }, { item: 'koks', amount: 1 }]);
  });

  it('stellt fehlenden Koks voran, wenn Kohle da ist', () => {
    const s = createInitialState();
    grant(s, { eisenerz: 10 });
    const plan = planCraft(s, 'eisenbarren');
    expect(plan.steps).toEqual([{ recipe: 'koks', runs: 1 }, { recipe: 'eisenbarren', runs: 1 }]);
    expect(plan.missing).toEqual([]);
    expect(plan.orders).toBe(2);
  });

  it('plant mehrere Stufen tief', () => {
    const s = createInitialState();
    research(s, 'werkwagen');
    s.store['kohle'] = 40;
    s.store['eisenerz'] = 40;
    s.store['holz'] = 20;
    const plan = planCraft(s, 'fahrgestell');
    // Ein Fahrgestell braucht 4 Eisenbarren, 2 Zahnräder und 4 Bretter.
    // Die Zahnräder kosten nochmal 2 Eisenbarren, macht 6 Barren und 6 Koks.
    expect(plan.steps).toEqual([
      { recipe: 'koks', runs: 6 },
      { recipe: 'eisenbarren', runs: 6 },
      { recipe: 'zahnrad', runs: 2 },
      { recipe: 'bretter', runs: 2 },
      { recipe: 'fahrgestell', runs: 1 },
    ]);
    expect(plan.missing).toEqual([]);
  });

  it('rechnet Überschüsse aus einem Lauf an', () => {
    const s = createInitialState();
    s.store['holz'] = 10;
    // Ein Lauf Bretter liefert zwei Stück, für vier Bretter reichen zwei Läufe
    const plan = planCraft(s, 'fahrgestell');
    const bretter = plan.steps.find((step) => step.recipe === 'bretter');
    expect(bretter?.runs).toBe(2);
  });

  it('meldet, was sich nicht herstellen lässt', () => {
    const s = createInitialState();
    s.store['kohle'] = 0;
    s.store['eisenerz'] = 0;
    const plan = planCraft(s, 'eisenbarren');
    expect(plan.missing).toEqual([{ item: 'eisenerz', amount: 2 }, { item: 'kohle', amount: 1 }]);
  });

  it('plant keine gesperrten Rezepte', () => {
    const s = createInitialState();
    expect(planCraft(s, 'stahl').steps).toEqual([]);
    grant(s, { eisenbarren: 10, koks: 10 });
    research(s, 'stahlwerk');
    expect(planCraft(s, 'stahl').steps).toEqual([{ recipe: 'stahl', runs: 1 }]);
  });
});

describe('Kette einreihen', () => {
  it('reiht Vorstufe und Ziel in der richtigen Reihenfolge ein', () => {
    const s = createInitialState();
    grant(s, { eisenerz: 10 });
    expect(queueCraftChain(s, 'eisenbarren').ok).toBe(true);
    expect(s.workbench.queue).toEqual(['koks', 'eisenbarren']);
    runFor(s, 10);
    expect(getStore(s, 'eisenbarren')).toBe(1);
    expect(s.workbench.queue).toHaveLength(0);
  });

  it('lehnt ab, wenn Rohstoffe fehlen, und sagt welche', () => {
    const s = createInitialState();
    s.store['kohle'] = 0;
    s.store['eisenerz'] = 1;
    const result = queueCraftChain(s, 'eisenbarren');
    expect(result).toMatchObject({ ok: false, code: 'material_fehlt' });
    if (!result.ok) expect(result.missing).toEqual([{ item: 'eisenerz', amount: 1 }, { item: 'kohle', amount: 1 }]);
    expect(s.workbench.queue).toHaveLength(0);
  });

  it('reiht eine tiefe Kette in einem Zug ein', () => {
    const s = createInitialState();
    research(s, 'werkwagen');
    grant(s, { kohle: 40, eisenerz: 40, holz: 20 });
    expect(queueCraftChain(s, 'fahrgestell').ok).toBe(true);
    expect(s.workbench.queue).toHaveLength(17);
    expect(s.workbench.queue.at(-1)).toBe('fahrgestell');
    expect(s.workbench.queue[0]).toBe('koks');
  });

  it('lehnt ab, wenn der Platz nicht reicht, und lässt die Warteschlange unberührt', () => {
    const s = createInitialState();
    research(s, 'werkwagen');
    grant(s, { kohle: 40, eisenerz: 40, holz: 20 });
    const belegt = BALANCE.workbenchQueueMax - 3;
    for (let i = 0; i < belegt; i += 1) s.workbench.queue.push('koks');
    const result = queueCraftChain(s, 'fahrgestell');
    expect(result).toMatchObject({ ok: false, code: 'warteschlange_voll' });
    expect(s.workbench.queue).toHaveLength(belegt);
  });
});

describe('Zutaten für die Anzeige', () => {
  it('zeigt Bedarf, Bestand und ob die Fehlmenge baubar ist', () => {
    const s = createInitialState();
    grant(s, { eisenerz: 3 });
    const zutaten = ingredientsOf(s, 'eisenbarren');
    expect(zutaten).toEqual([
      { item: 'eisenerz', need: 2, have: 3, enough: true, craftable: false },
      { item: 'koks', need: 1, have: 0, enough: false, craftable: true },
    ]);
  });

  it('erkennt ein volles Ausgabelager', () => {
    const s = createInitialState();
    expect(outputBlocked(s, 'koks')).toBe(false);
    s.store['koks'] = storeCap(s);
    expect(outputBlocked(s, 'koks')).toBe(true);
  });
});

describe('Ergebnisse für die Anzeige', () => {
  it('zeigt Ausbeute und Bestand der hergestellten Ware', () => {
    const s = createInitialState();
    grant(s, { schienen: 7 });
    expect(outputsOf(s, 'schienen')).toEqual([{ item: 'schienen', amount: 2, have: 7, full: false }]);
  });

  it('meldet das volle Lager an der Ware selbst', () => {
    const s = createInitialState();
    s.store['koks'] = storeCap(s);
    expect(outputsOf(s, 'koks')).toEqual([{ item: 'koks', amount: 1, have: storeCap(s), full: true }]);
  });
});

describe('Mehrere Läufe auf einmal', () => {
  it('plant die Zutaten für die ganze Menge und reiht das Ziel so oft ein', () => {
    const s = createInitialState();
    grant(s, { eisenerz: 40, kohle: 40 });
    const plan = planCraft(s, 'eisenbarren', 5);
    expect(plan.steps).toEqual([{ recipe: 'koks', runs: 5 }, { recipe: 'eisenbarren', runs: 5 }]);
    expect(plan.orders).toBe(10);
    expect(queueCraftChain(s, 'eisenbarren', 5).ok).toBe(true);
    expect(s.workbench.queue.filter((id) => id === 'koks')).toHaveLength(5);
    expect(s.workbench.queue.filter((id) => id === 'eisenbarren')).toHaveLength(5);
  });

  it('rechnet Bestand und Überschuss auch bei zehn Läufen an', () => {
    const s = createInitialState();
    grant(s, { eisenerz: 200, kohle: 200 });
    s.store['holz'] = 3;
    // Zehn Fahrgestelle brauchen 40 Bretter, also 20 Läufe zu je einem Holz; drei sind da
    const plan = planCraft(s, 'fahrgestell', 10);
    expect(plan.steps.find((step) => step.recipe === 'bretter')?.runs).toBe(20);
    expect(plan.steps.at(-1)).toEqual({ recipe: 'fahrgestell', runs: 10 });
    expect(plan.missing).toEqual([{ item: 'holz', amount: 17 }]);
  });

  it('meldet Rohstoffmangel für die ganze Menge, nicht nur für einen Lauf', () => {
    const s = createInitialState();
    s.store['kohle'] = 3;
    const result = queueCraftChain(s, 'koks', 10);
    expect(result).toMatchObject({ ok: false, code: 'material_fehlt' });
    if (!result.ok) expect(result.missing).toEqual([{ item: 'kohle', amount: 7 }]);
    expect(s.workbench.queue).toHaveLength(0);
  });
});
