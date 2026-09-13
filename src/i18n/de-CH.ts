import { BIOME_BY_ID, ITEM_BY_ID, LOCO_BY_ID, OBSTACLE_BY_ID, PROJECT_BY_ID, TECH_BY_ID } from '../engine/data';
import type { LogEntry, Warning } from '../engine/types';
import { formatDecimal } from '../lib/format';

function itemName(id: string): string {
  return ITEM_BY_ID[id]?.name ?? id;
}

function kmText(km: number): string {
  return `Km ${formatDecimal(km, km % 1 === 0 ? 0 : 1)}`;
}

/** Fahrtenbuch-Einträge als Text */
export function formatLog(entry: LogEntry): string {
  switch (entry.kind) {
    case 'start':
      return `${kmText(entry.km)}. Linie Null nimmt den Betrieb auf.`;
    case 'biom': {
      const biome = BIOME_BY_ID[entry.ref];
      if (!biome) return `${kmText(entry.km)}. Neues Gebiet.`;
      const neu = biome.resources.map(itemName).join(', ');
      return `${kmText(entry.km)}. ${biome.name} erreicht.${neu ? ` Neu: ${neu}.` : ''}`;
    }
    case 'hindernis': {
      const obstacle = OBSTACLE_BY_ID[entry.ref];
      const project = obstacle ? PROJECT_BY_ID[obstacle.project] : undefined;
      if (!obstacle) return `${kmText(entry.km)}. Hindernis.`;
      if (project?.preview) return `${kmText(entry.km)}. ${obstacle.name}. Hier endet der erste Stand.`;
      return `${kmText(entry.km)}. ${obstacle.name}. Ohne ${project?.name ?? 'Bauprojekt'} geht es nicht weiter.`;
    }
    case 'projekt':
      return `${kmText(entry.km)}. ${PROJECT_BY_ID[entry.ref]?.name ?? entry.ref} fertig.`;
    case 'forschung':
      return `Forschung abgeschlossen: ${TECH_BY_ID[entry.ref]?.name ?? entry.ref}.`;
    case 'lok': {
      const lok = LOCO_BY_ID[entry.ref];
      if (!lok) return 'Neue Lok.';
      return `Neue Lok: ${lok.name}. ${lok.slots} Wagen, ${lok.speedKmh} km/h.`;
    }
    case 'stand_ende':
      return 'Ende des ersten Stands. Die Wüste wartet.';
    default:
      return '';
  }
}

export function formatWarning(warning: Warning): string {
  switch (warning.code) {
    case 'zug_steht':
      return 'Der Zug steht.';
    case 'schienen_leer':
      return 'Keine Schienen. Der Zug wartet auf Nachschub.';
    case 'brennstoff_leer':
      return `Kein ${itemName(warning.item ?? 'kohle')}. Der Kessel ist kalt.`;
    case 'lager_voll':
      return `Lager voll: ${itemName(warning.item ?? '')}.`;
    case 'zutat_fehlt':
      return 'Zutat fehlt.';
    case 'handkurbel':
      return 'Erntewagen wartet auf die Handkurbel.';
    default:
      return '';
  }
}
