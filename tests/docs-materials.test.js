// Kullanıcı isteği: tüm materyaller ve etkileşimleri (eski ve yeni) docs/MATERIALS.md'de belgeli kalsın.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { MATERIALS } from '../js/engine/materials.js';

test('docs/MATERIALS.md tanımlı her materyal anahtarını içerir', () => {
  const doc = fs.readFileSync(new URL('../docs/MATERIALS.md', import.meta.url), 'utf8');
  for (const def of MATERIALS.list) assert.ok(doc.includes(`\`${def.key}\``), `${def.key} docs/MATERIALS.md'de belgelenmemiş`);
});
