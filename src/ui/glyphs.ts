import { ITEMS } from '../engine';

/**
 * Waren mit eigener Glyphe in ItemIcon.svelte. Die Liste hält den Test ehrlich:
 * kommt eine Ware dazu, ohne dass sie gezeichnet wird, schlägt er an.
 */
export const GLYPH_ITEMS: readonly string[] = [
  'eisenerz',
  'kupfererz',
  'kohle',
  'holz',
  'stein',
  'harz',
  'kalk',
  'salpeter',
  'koks',
  'eisenbarren',
  'kupferbarren',
  'stahl',
  'schienen',
  'bretter',
  'bohlen',
  'zahnrad',
  'nieten',
  'fahrgestell',
  'bp_eisen',
  'bp_stahl',
  'bp_kupfer',
  'teer',
  'stahltraeger',
  'dampfkessel',
  'kupferdraht',
  'kupferspule',
  'bohrkopf',
  'sprengstoff',
  'moertel',
  'stuetzbalken',
];

export function itemsWithoutGlyph(): string[] {
  return ITEMS.filter((item) => !GLYPH_ITEMS.includes(item.id)).map((item) => item.id);
}
