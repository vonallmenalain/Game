import { describe, expect, it } from 'vitest';
import { createInitialState, serialize } from '../engine';
import { ImportError, exportFileName, importSave } from './transfer';

function fileOf(text: string, name = 'stand.json'): File {
  return new File([text], name, { type: 'application/json' });
}

describe('Spielstand exportieren und importieren', () => {
  it('baut einen Dateinamen mit Kilometerstand und Datum', () => {
    const s = createInitialState();
    s.km = 24.5;
    expect(exportFileName(s, new Date(2026, 8, 13, 9, 5))).toBe('linie-null-km24-5-2026-09-13-0905.json');
  });

  it('liest einen echten Spielstand zurück', async () => {
    const s = createInitialState();
    s.km = 12.3;
    s.pos = 1230;
    const { state } = await importSave(fileOf(serialize(s, 1)));
    expect(state.km).toBeCloseTo(12.3);
    expect(state.pos).toBe(1230);
  });

  it('erklärt, wenn die Datei kein Spielstand ist', async () => {
    await expect(importSave(fileOf('kein json'))).rejects.toBeInstanceOf(ImportError);
    await expect(importSave(fileOf('[]'))).rejects.toThrow('kein Spielstand');
    const big = new File([new Uint8Array(9_000_000)], 'gross.json');
    await expect(importSave(big)).rejects.toThrow('zu gross');
  });
});
