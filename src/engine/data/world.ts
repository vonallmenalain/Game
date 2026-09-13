import type { BiomeDef, ObstacleDef, ProjectDef } from '../types';

export const BIOMES: BiomeDef[] = [
  { id: 'tal', name: 'Tal', startKm: 0, resources: ['eisenerz', 'kohle', 'holz', 'stein'] },
  { id: 'wald', name: 'Wald', startKm: 8, resources: ['holz', 'harz'] },
  { id: 'berg', name: 'Berg', startKm: 24, resources: ['kupfererz', 'kalk', 'salpeter'] },
  { id: 'wueste', name: 'Wüste', startKm: 48, resources: [], preview: true },
];

export const OBSTACLES: ObstacleDef[] = [
  { id: 'schlucht', name: 'Schlucht', km: 24, project: 'bruecke' },
  { id: 'bergmassiv', name: 'Bergmassiv', km: 36, project: 'tunnel' },
  { id: 'wuestenstrecke', name: 'Wüstenstrecke', km: 48, project: 'wuestenstrecke' },
];

export const PROJECTS: ProjectDef[] = [
  {
    id: 'bruecke', name: 'Brücke über die Schlucht', kind: 'hindernis', obstacle: 'schlucht', tech: 'brueckenbau',
    bom: [{ item: 'stahltraeger', amount: 240 }, { item: 'bohlen', amount: 600 }, { item: 'nieten', amount: 800 }, { item: 'teer', amount: 80 }],
  },
  {
    id: 'schwere_dampflok', name: 'Schwere Dampflok', kind: 'lok', loco: 'schwere_dampflok', tech: 'schwere_dampflok',
    bom: [{ item: 'dampfkessel', amount: 6 }, { item: 'stahl', amount: 60 }, { item: 'nieten', amount: 120 }, { item: 'zahnrad', amount: 40 }],
  },
  {
    id: 'tunnel', name: 'Tunnel durch das Bergmassiv', kind: 'hindernis', obstacle: 'bergmassiv', tech: 'bohrtechnik',
    bom: [{ item: 'sprengstoff', amount: 300 }, { item: 'bohrkopf', amount: 60 }, { item: 'stuetzbalken', amount: 400 }, { item: 'moertel', amount: 200 }],
  },
  {
    id: 'wuestenstrecke', name: 'Wüstenstrecke', kind: 'hindernis', obstacle: 'wuestenstrecke', tech: null, preview: true,
    bom: [],
  },
];
