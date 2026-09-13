import type { ItemDef } from '../types';

export const ITEMS: ItemDef[] = [
  // Rohstoffe
  { id: 'eisenerz', name: 'Eisenerz', tier: 0, kind: 'rohstoff', homeBiomes: ['tal'], harvestPerMinute: 30 },
  { id: 'kohle', name: 'Kohle', tier: 0, kind: 'rohstoff', homeBiomes: ['tal'], harvestPerMinute: 30 },
  { id: 'holz', name: 'Holz', tier: 0, kind: 'rohstoff', homeBiomes: ['tal', 'wald'], harvestPerMinute: 30 },
  { id: 'stein', name: 'Stein', tier: 0, kind: 'rohstoff', homeBiomes: ['tal'], harvestPerMinute: 30 },
  { id: 'harz', name: 'Harz', tier: 0, kind: 'rohstoff', homeBiomes: ['wald'], harvestPerMinute: 20 },
  { id: 'kupfererz', name: 'Kupfererz', tier: 0, kind: 'rohstoff', homeBiomes: ['berg'], harvestPerMinute: 24 },
  { id: 'kalk', name: 'Kalk', tier: 0, kind: 'rohstoff', homeBiomes: ['berg'], harvestPerMinute: 30 },
  { id: 'salpeter', name: 'Salpeter', tier: 0, kind: 'rohstoff', homeBiomes: ['berg'], harvestPerMinute: 20 },

  // Eisenzeit
  { id: 'koks', name: 'Koks', tier: 1, kind: 'ware' },
  { id: 'eisenbarren', name: 'Eisenbarren', tier: 1, kind: 'ware' },
  { id: 'schienen', name: 'Schienen', tier: 1, kind: 'ware' },
  { id: 'bretter', name: 'Bretter', tier: 1, kind: 'ware' },
  { id: 'zahnrad', name: 'Zahnrad', tier: 1, kind: 'ware' },
  { id: 'nieten', name: 'Nieten', tier: 1, kind: 'ware' },
  { id: 'fahrgestell', name: 'Fahrgestell', tier: 1, kind: 'ware' },
  { id: 'bp_eisen', name: 'Eiserne Blaupause', tier: 1, kind: 'blaupause' },

  // Stahlzeit
  { id: 'teer', name: 'Teer', tier: 2, kind: 'ware' },
  { id: 'stahl', name: 'Stahl', tier: 2, kind: 'ware' },
  { id: 'stahltraeger', name: 'Stahlträger', tier: 2, kind: 'ware' },
  { id: 'bohlen', name: 'Bohlen', tier: 2, kind: 'ware' },
  { id: 'dampfkessel', name: 'Dampfkessel', tier: 2, kind: 'ware' },
  { id: 'bp_stahl', name: 'Stahl-Blaupause', tier: 2, kind: 'blaupause' },

  // Kupferzeit
  { id: 'kupferbarren', name: 'Kupferbarren', tier: 3, kind: 'ware' },
  { id: 'kupferdraht', name: 'Kupferdraht', tier: 3, kind: 'ware' },
  { id: 'kupferspule', name: 'Kupferspule', tier: 3, kind: 'ware' },
  { id: 'bohrkopf', name: 'Bohrkopf', tier: 3, kind: 'ware' },
  { id: 'sprengstoff', name: 'Sprengstoff', tier: 3, kind: 'ware' },
  { id: 'moertel', name: 'Mörtel', tier: 3, kind: 'ware' },
  { id: 'stuetzbalken', name: 'Stützbalken', tier: 3, kind: 'ware' },
  { id: 'bp_kupfer', name: 'Kupfer-Blaupause', tier: 3, kind: 'blaupause' },
];
