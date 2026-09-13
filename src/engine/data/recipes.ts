import type { RecipeDef } from '../types';

export const RECIPES: RecipeDef[] = [
  // Schmelzwagen
  { id: 'koks', name: 'Koks', wagon: 'schmelz', inputs: [{ item: 'kohle', amount: 1 }], outputs: [{ item: 'koks', amount: 1 }], seconds: 2, techs: [] },
  { id: 'eisenbarren', name: 'Eisenbarren', wagon: 'schmelz', inputs: [{ item: 'eisenerz', amount: 2 }, { item: 'koks', amount: 1 }], outputs: [{ item: 'eisenbarren', amount: 1 }], seconds: 4, techs: [] },
  { id: 'teer', name: 'Teer', wagon: 'schmelz', inputs: [{ item: 'harz', amount: 2 }], outputs: [{ item: 'teer', amount: 1 }], seconds: 3, techs: ['teerofen'] },
  { id: 'stahl', name: 'Stahl', wagon: 'schmelz', inputs: [{ item: 'eisenbarren', amount: 2 }, { item: 'koks', amount: 1 }], outputs: [{ item: 'stahl', amount: 1 }], seconds: 6, techs: ['stahlwerk'] },
  { id: 'kupferbarren', name: 'Kupferbarren', wagon: 'schmelz', inputs: [{ item: 'kupfererz', amount: 2 }, { item: 'koks', amount: 1 }], outputs: [{ item: 'kupferbarren', amount: 1 }], seconds: 4, techs: ['kupferhuette'] },

  // Walzwagen
  { id: 'schienen', name: 'Schienen', wagon: 'walz', inputs: [{ item: 'eisenbarren', amount: 1 }], outputs: [{ item: 'schienen', amount: 2 }], seconds: 6, techs: [] },
  { id: 'stahltraeger', name: 'Stahlträger', wagon: 'walz', inputs: [{ item: 'stahl', amount: 2 }, { item: 'nieten', amount: 2 }], outputs: [{ item: 'stahltraeger', amount: 1 }], seconds: 8, techs: ['stahlwerk'] },
  { id: 'kupferdraht', name: 'Kupferdraht', wagon: 'walz', inputs: [{ item: 'kupferbarren', amount: 1 }], outputs: [{ item: 'kupferdraht', amount: 3 }], seconds: 4, techs: ['kupferhuette'] },

  // Werkwagen
  { id: 'bretter', name: 'Bretter', wagon: 'werk', inputs: [{ item: 'holz', amount: 1 }], outputs: [{ item: 'bretter', amount: 2 }], seconds: 2, techs: [] },
  { id: 'zahnrad', name: 'Zahnrad', wagon: 'werk', inputs: [{ item: 'eisenbarren', amount: 1 }], outputs: [{ item: 'zahnrad', amount: 1 }], seconds: 3, techs: [] },
  { id: 'nieten', name: 'Nieten', wagon: 'werk', inputs: [{ item: 'eisenbarren', amount: 1 }], outputs: [{ item: 'nieten', amount: 4 }], seconds: 3, techs: [] },
  { id: 'fahrgestell', name: 'Fahrgestell', wagon: 'werk', inputs: [{ item: 'eisenbarren', amount: 4 }, { item: 'zahnrad', amount: 2 }, { item: 'bretter', amount: 4 }], outputs: [{ item: 'fahrgestell', amount: 1 }], seconds: 12, techs: [] },
  { id: 'bohlen', name: 'Bohlen', wagon: 'werk', inputs: [{ item: 'bretter', amount: 2 }, { item: 'teer', amount: 1 }], outputs: [{ item: 'bohlen', amount: 2 }], seconds: 4, techs: ['teerofen'] },
  { id: 'dampfkessel', name: 'Dampfkessel', wagon: 'werk', inputs: [{ item: 'stahl', amount: 3 }, { item: 'nieten', amount: 6 }], outputs: [{ item: 'dampfkessel', amount: 1 }], seconds: 10, techs: ['stahlwerk'] },
  { id: 'kupferspule', name: 'Kupferspule', wagon: 'werk', inputs: [{ item: 'kupferdraht', amount: 4 }, { item: 'zahnrad', amount: 1 }], outputs: [{ item: 'kupferspule', amount: 1 }], seconds: 6, techs: ['kupferhuette'] },
  { id: 'bohrkopf', name: 'Bohrkopf', wagon: 'werk', inputs: [{ item: 'stahl', amount: 2 }, { item: 'kupferspule', amount: 1 }], outputs: [{ item: 'bohrkopf', amount: 1 }], seconds: 8, techs: ['bohrtechnik'] },
  { id: 'stuetzbalken', name: 'Stützbalken', wagon: 'werk', inputs: [{ item: 'bohlen', amount: 2 }, { item: 'nieten', amount: 2 }], outputs: [{ item: 'stuetzbalken', amount: 1 }], seconds: 4, techs: ['bohrtechnik'] },

  // Chemiewagen
  { id: 'sprengstoff', name: 'Sprengstoff', wagon: 'chemie', inputs: [{ item: 'salpeter', amount: 2 }, { item: 'koks', amount: 1 }], outputs: [{ item: 'sprengstoff', amount: 1 }], seconds: 5, techs: ['chemiewagen'] },
  { id: 'moertel', name: 'Mörtel', wagon: 'chemie', inputs: [{ item: 'kalk', amount: 2 }, { item: 'stein', amount: 1 }], outputs: [{ item: 'moertel', amount: 2 }], seconds: 4, techs: ['chemiewagen'] },

  // Konstruktionsbüro
  { id: 'bp_eisen', name: 'Eiserne Blaupause', wagon: 'buero', inputs: [{ item: 'zahnrad', amount: 1 }, { item: 'bretter', amount: 2 }], outputs: [{ item: 'bp_eisen', amount: 1 }], seconds: 10, techs: [] },
  { id: 'bp_stahl', name: 'Stahl-Blaupause', wagon: 'buero', inputs: [{ item: 'dampfkessel', amount: 1 }, { item: 'teer', amount: 2 }], outputs: [{ item: 'bp_stahl', amount: 1 }], seconds: 20, techs: ['stahlwerk', 'teerofen'] },
  { id: 'bp_kupfer', name: 'Kupfer-Blaupause', wagon: 'buero', inputs: [{ item: 'kupferspule', amount: 1 }, { item: 'sprengstoff', amount: 1 }], outputs: [{ item: 'bp_kupfer', amount: 1 }], seconds: 30, techs: ['chemiewagen'] },
];
