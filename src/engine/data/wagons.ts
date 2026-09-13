import type { LocoDef, WagonDef } from '../types';

export const WAGONS: WagonDef[] = [
  {
    type: 'ernte',
    name: 'Erntewagen',
    machineName: 'Erntemaschine',
    cost: [{ item: 'fahrgestell', amount: 1 }, { item: 'zahnrad', amount: 6 }, { item: 'bretter', amount: 10 }],
    machineCost: [{ item: 'zahnrad', amount: 4 }, { item: 'bretter', amount: 6 }],
    upgradable: true,
    tech: null,
  },
  {
    type: 'schmelz',
    name: 'Schmelzwagen',
    machineName: 'Schmelzofen',
    cost: [{ item: 'fahrgestell', amount: 1 }, { item: 'stein', amount: 20 }, { item: 'eisenbarren', amount: 8 }],
    machineCost: [{ item: 'stein', amount: 12 }, { item: 'eisenbarren', amount: 5 }],
    upgradable: true,
    tech: 'schmelzwagen',
  },
  {
    type: 'walz',
    name: 'Walzwagen',
    machineName: 'Walzstrasse',
    cost: [{ item: 'fahrgestell', amount: 1 }, { item: 'eisenbarren', amount: 12 }, { item: 'zahnrad', amount: 6 }],
    machineCost: [{ item: 'eisenbarren', amount: 8 }, { item: 'zahnrad', amount: 4 }],
    upgradable: true,
    tech: 'walzwagen',
  },
  {
    type: 'werk',
    name: 'Werkwagen',
    machineName: 'Montagetisch',
    cost: [{ item: 'fahrgestell', amount: 1 }, { item: 'eisenbarren', amount: 8 }, { item: 'bretter', amount: 12 }],
    machineCost: [{ item: 'eisenbarren', amount: 5 }, { item: 'bretter', amount: 8 }],
    upgradable: true,
    tech: 'werkwagen',
  },
  {
    type: 'buero',
    name: 'Konstruktionsbüro',
    machineName: 'Zeichentisch',
    cost: [{ item: 'fahrgestell', amount: 1 }, { item: 'bretter', amount: 20 }, { item: 'zahnrad', amount: 4 }],
    machineCost: [{ item: 'bretter', amount: 12 }, { item: 'zahnrad', amount: 3 }],
    upgradable: true,
    tech: 'konstruktionsbuero',
  },
  {
    type: 'lager',
    name: 'Lagerwagen',
    machineName: 'Regal',
    cost: [{ item: 'fahrgestell', amount: 1 }, { item: 'bretter', amount: 16 }, { item: 'nieten', amount: 8 }],
    machineCost: [{ item: 'bretter', amount: 10 }, { item: 'nieten', amount: 5 }],
    upgradable: false,
    tech: 'lagerwagen',
  },
  {
    type: 'chemie',
    name: 'Chemiewagen',
    machineName: 'Reaktor',
    cost: [{ item: 'fahrgestell', amount: 1 }, { item: 'stahl', amount: 10 }, { item: 'kupferdraht', amount: 8 }],
    machineCost: [{ item: 'stahl', amount: 6 }, { item: 'kupferdraht', amount: 5 }],
    upgradable: true,
    tech: 'chemiewagen',
  },
];

export const LOCOS: LocoDef[] = [
  { id: 'dampflok', name: 'Dampflok', slots: 8, machineBonus: 0, speedKmh: 14, fuel: 'kohle', fuelPerKm: 30 },
  { id: 'schwere_dampflok', name: 'Schwere Dampflok', slots: 12, machineBonus: 2, speedKmh: 19, fuel: 'koks', fuelPerKm: 25 },
];
