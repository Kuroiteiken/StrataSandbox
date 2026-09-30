// Engine sözleşmesi: DOM'a bağımlı değil ve Math.random kullanmaz (ADR-008).
// node --test her dosyayı ayrı süreçte çalıştırır; stub başka testlere sızmaz.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const engineDir = path.resolve(fileURLToPath(new URL('../js/engine', import.meta.url)));
const moduleUrl = (file) => pathToFileURL(path.join(engineDir, file)).href;

test('engine modülleri DOM olmadan yüklenir ve Math.random çağırmadan simülasyon çalıştırır', async () => {
  assert.equal(typeof globalThis.window, 'undefined');
  assert.equal(typeof globalThis.document, 'undefined');

  const originalRandom = Math.random;
  let randomCalls = 0;
  Math.random = () => {
    randomCalls++;
    throw new Error('Math.random engine içinde yasak');
  };
  try {
    const files = fs.readdirSync(engineDir).filter((f) => f.endsWith('.js'));
    assert.ok(files.length > 0);
    for (const file of files) await import(moduleUrl(file));

    const { Simulation } = await import(moduleUrl('simulation.js'));
    const { MAT } = await import(moduleUrl('materials.js'));
    const sim = new Simulation({ width: 32, height: 24, seed: 'purity' });
    for (let t = 0; t < 300; t++) {
      if (t < 150) sim.setCell(16, 0, MAT.SAND);
      sim.step();
    }
    sim.update(50);
    sim.getStats();
  } finally {
    Math.random = originalRandom;
  }
  assert.equal(randomCalls, 0);
});

// Statik tarama: çalışma yolunda tetiklenmeyen dallarda bile yasak API kullanılmasın.
test('engine kaynak kodu tarayıcıya özgü API ve Math.random içermez', () => {
  const forbidden = /\b(Math\.random|document\.|window\.|localStorage|sessionStorage|requestAnimationFrame|navigator\.)/;
  for (const file of fs.readdirSync(engineDir).filter((f) => f.endsWith('.js'))) {
    const code = fs
      .readFileSync(path.join(engineDir, file), 'utf8')
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/(^|\s)\/\/[^\n]*/g, '$1');
    const hit = code.match(forbidden);
    assert.equal(hit, null, `${file}: yasak kullanım "${hit?.[0]}"`);
  }
});
