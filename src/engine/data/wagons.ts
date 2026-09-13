import type { LocoDef, WagonDef } from '../types';

export const WAGONS: WagonDef[] = [
  { type: 'ernte', name: 'Erntewagen', cost: [{ item: 'fahrgestell', amount: 1 }, { item: 'zahnrad', amount: 6 }, { item: 'bretter', amount: 10 }], upgradable: true, tech: null },
  { type: 'schmelz', name: 'Schmelzwagen', cost: [{ item: 'fahrgestell', amount: 1 }, { item: 'stein', amount: 20 }, { item: 'eisenbarren', amount: 8 }], upgradable: true, tech: 'schmelzwagen' },
  { type: 'walz', name: 'Walzwagen', cost: [{ item: 'fahrgestell', amount: 1 }, { item: 'eisenbarren', amount: 12 }, { item: 'zahnrad', amount: 6 }], upgradable: true, tech: 'walzwagen' },
  { type: 'werk', name: 'Werkwagen', cost: [{ item: 'fahrgestell', amount: 1 }, { item: 'eisenbarren', amount: 8 }, { item: 'bretter', amount: 12 }], upgradable: true, tech: 'werkwagen' },
  { type: 'buero', name: 'Konstruktionsbüro', cost: [{ item: 'fahrgestell', amount: 1 }, { item: 'bretter', amount: 20 }, { item: 'zahnrad', amount: 4 }], upgradable: true, tech: 'konstruktionsbuero' },
  { type: 'lager', name: 'Lagerwagen', cost: [{ item: 'fahrgestell', amount: 1 }, { item: 'bretter', amount: 16 }, { item: 'nieten', amount: 8 }], upgradable: false, tech: 'lagerwagen' },
  { type: 'chemie', name: 'Chemiewagen', cost: [{ item: 'fahrgestell', amount: 1 }, { item: 'stahl', amount: 10 }, { item: 'kupferdraht', amount: 8 }], upgradable: true, tech: 'chemiewagen' },
];

export const LOCOS: LocoDef[] = [
  { id: 'dampflok', name: 'Dampflok', slots: 8, speedKmh: 14, fuel: 'kohle', fuelPerKm: 30 },
  { id: 'schwere_dampflok', name: 'Schwere Dampflok', slots: 12, speedKmh: 19, fuel: 'koks', fuelPerKm: 25 },
];
