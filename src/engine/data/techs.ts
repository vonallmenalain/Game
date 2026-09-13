import type { TechDef } from '../types';

export const TECHS: TechDef[] = [
  { id: 'selbstlader', name: 'Selbstlader', description: 'Erntewagen arbeiten ohne Handkurbel.', cost: { item: 'bp_eisen', amount: 3 }, seconds: 30, requires: [], effects: [{ kind: 'selbstlader' }] },
  { id: 'schmelzwagen', name: 'Schmelzwagen', description: 'Schmelzwagen baubar.', cost: { item: 'bp_eisen', amount: 4 }, seconds: 45, requires: ['selbstlader'], effects: [{ kind: 'wagen', wagon: 'schmelz' }] },
  { id: 'werkwagen', name: 'Werkwagen', description: 'Werkwagen baubar.', cost: { item: 'bp_eisen', amount: 4 }, seconds: 45, requires: ['selbstlader'], effects: [{ kind: 'wagen', wagon: 'werk' }] },
  { id: 'walzwagen', name: 'Walzwagen', description: 'Walzwagen baubar, Schienen automatisch.', cost: { item: 'bp_eisen', amount: 6 }, seconds: 60, requires: ['schmelzwagen'], effects: [{ kind: 'wagen', wagon: 'walz' }] },
  { id: 'konstruktionsbuero', name: 'Konstruktionsbüro', description: 'Konstruktionsbüro baubar, Blaupausen automatisch.', cost: { item: 'bp_eisen', amount: 8 }, seconds: 60, requires: ['werkwagen'], effects: [{ kind: 'wagen', wagon: 'buero' }] },
  { id: 'lagerwagen', name: 'Lagerwagen', description: 'Lagerwagen baubar. Jedes Regal darin gibt plus 200 Kapazität je Ware.', cost: { item: 'bp_eisen', amount: 8 }, seconds: 60, requires: ['werkwagen'], effects: [{ kind: 'wagen', wagon: 'lager' }] },
  { id: 'erntetechnik1', name: 'Erntetechnik I', description: 'Ernte plus 25 Prozent.', cost: { item: 'bp_eisen', amount: 12 }, seconds: 90, requires: ['selbstlader'], effects: [{ kind: 'ernte_bonus', value: 0.25 }] },
  { id: 'stahlwerk', name: 'Stahlwerk', description: 'Stahl, Stahlträger, Dampfkessel.', cost: { item: 'bp_eisen', amount: 20 }, seconds: 120, requires: ['walzwagen'], effects: [] },
  { id: 'teerofen', name: 'Teerofen', description: 'Teer und Bohlen.', cost: { item: 'bp_eisen', amount: 15 }, seconds: 90, requires: ['schmelzwagen'], requiresBiome: 'wald', effects: [] },
  { id: 'brueckenbau', name: 'Brückenbau', description: 'Bauprojekt Brücke über die Schlucht.', cost: { item: 'bp_stahl', amount: 10 }, seconds: 120, requires: ['stahlwerk', 'teerofen'], effects: [{ kind: 'projekt', project: 'bruecke' }] },
  { id: 'schwere_dampflok', name: 'Schwere Dampflok', description: 'Bauprojekt Schwere Dampflok.', cost: { item: 'bp_stahl', amount: 15 }, seconds: 180, requires: ['stahlwerk'], effects: [{ kind: 'projekt', project: 'schwere_dampflok' }] },
  { id: 'schmelztechnik1', name: 'Schmelztechnik I', description: 'Schmelzwagen plus 25 Prozent.', cost: { item: 'bp_stahl', amount: 12 }, seconds: 120, requires: ['stahlwerk'], effects: [{ kind: 'wagen_tempo', wagon: 'schmelz', value: 0.25 }] },
  { id: 'maschinenhalle1', name: 'Maschinenhalle I', description: 'Vier Maschinenplätze mehr in jedem Wagen.', cost: { item: 'bp_stahl', amount: 14 }, seconds: 150, requires: ['stahlwerk'], effects: [{ kind: 'maschinen_plaetze', value: 4 }] },
  { id: 'nachtschicht1', name: 'Nachtschicht I', description: 'Offline-Deckel 12 Stunden.', cost: { item: 'bp_stahl', amount: 10 }, seconds: 120, requires: ['stahlwerk'], effects: [{ kind: 'offline_deckel', hours: 12 }] },
  { id: 'kupferhuette', name: 'Kupferhütte', description: 'Kupferbarren, Kupferdraht, Kupferspule.', cost: { item: 'bp_stahl', amount: 20 }, seconds: 180, requires: ['stahlwerk'], requiresBiome: 'berg', effects: [] },
  { id: 'chemiewagen', name: 'Chemiewagen', description: 'Chemiewagen, Sprengstoff, Mörtel.', cost: { item: 'bp_stahl', amount: 20 }, seconds: 180, requires: ['kupferhuette'], effects: [{ kind: 'wagen', wagon: 'chemie' }] },
  { id: 'bohrtechnik', name: 'Bohrtechnik', description: 'Bohrkopf, Stützbalken, Bauprojekt Tunnel.', cost: { item: 'bp_kupfer', amount: 10 }, seconds: 180, requires: ['chemiewagen'], effects: [{ kind: 'projekt', project: 'tunnel' }] },
  { id: 'erntetechnik2', name: 'Erntetechnik II', description: 'Ernte plus 25 Prozent.', cost: { item: 'bp_kupfer', amount: 15 }, seconds: 180, requires: ['erntetechnik1', 'bohrtechnik'], effects: [{ kind: 'ernte_bonus', value: 0.25 }] },
  { id: 'walztechnik1', name: 'Walztechnik I', description: 'Walzwagen plus 25 Prozent.', cost: { item: 'bp_kupfer', amount: 12 }, seconds: 150, requires: ['bohrtechnik'], effects: [{ kind: 'wagen_tempo', wagon: 'walz', value: 0.25 }] },
  { id: 'wuestenausruestung', name: 'Wüstenausrüstung', description: 'Ende des ersten Stands. Ausblick auf die Wüste.', cost: { item: 'bp_kupfer', amount: 30 }, seconds: 300, requires: ['bohrtechnik'], requiresProject: 'tunnel', effects: [{ kind: 'stand_ende' }] },
];
