/**
 * Zahlenformat der Schweiz, unabhängig von der ICU-Ausstattung der Laufzeit:
 * Tausendertrennung mit typografischem Apostroph, Dezimalkomma.
 */
const THOUSANDS = '’';

function groupInteger(value: number): string {
  const digits = Math.trunc(Math.abs(value)).toString();
  let out = '';
  for (let i = 0; i < digits.length; i += 1) {
    const fromEnd = digits.length - i;
    out += digits[i];
    if (fromEnd > 1 && fromEnd % 3 === 1) out += THOUSANDS;
  }
  return (value < 0 ? '-' : '') + out;
}

/** Ganze Stückzahl, abgerundet: 1234.7 → 1’234 */
export function formatCount(value: number): string {
  return groupInteger(Math.floor(value));
}

/** Zahl mit fester Anzahl Nachkommastellen und Dezimalkomma: 7.5 → 7,5 */
export function formatDecimal(value: number, decimals: number): string {
  const factor = 10 ** decimals;
  const rounded = Math.round(value * factor) / factor;
  const intPart = groupInteger(rounded);
  if (decimals === 0) return intPart;
  const fraction = Math.abs(rounded - Math.trunc(rounded)) * factor;
  return `${intPart},${Math.round(fraction).toString().padStart(decimals, '0')}`;
}

/** Rate pro Minute: 7.5 → 7,5/min, 20 → 20/min */
export function formatRate(perMinute: number): string {
  const decimals = Number.isInteger(Math.round(perMinute * 10) / 10) ? 0 : 1;
  return `${formatDecimal(perMinute, decimals)}/min`;
}

/** Kilometer mit einer Nachkommastelle: 6.4 → 6,4 km */
export function formatKm(km: number): string {
  return `${formatDecimal(km, 1)} km`;
}

/** Dauer in Sekunden als h/min/s: 27600 → 7 h 40 min, 185 → 3 min 5 s, 45 → 45 s */
export function formatDuration(seconds: number): string {
  const total = Math.max(0, Math.round(seconds));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  if (h > 0) return m > 0 ? `${h} h ${m} min` : `${h} h`;
  if (m > 0) return s > 0 ? `${m} min ${s} s` : `${m} min`;
  return `${s} s`;
}

/**
 * Wie lange ein Zeitpunkt her ist, grob: 0 → unbekannt, unter einer Minute → gerade eben,
 * sonst «vor 3 min» oder «vor 2 h 10 min». Sekunden bleiben weg, sie ändern sich zu schnell.
 */
export function formatAgo(at: number, now = Date.now()): string {
  if (!at) return 'unbekannt';
  const seconds = Math.max(0, (now - at) / 1000);
  if (seconds < 60) return 'gerade eben';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `vor ${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h < 48) return m > 0 ? `vor ${h} h ${m} min` : `vor ${h} h`;
  return `vor ${Math.floor(h / 24)} Tagen`;
}
