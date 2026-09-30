// check-paths: ignore-file  (bu dosya bilerek bozuk import örnekleri içerir)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { findPathProblems } from '../tools/check-paths.js';

const repoRoot = path.resolve(fileURLToPath(new URL('..', import.meta.url)));

function makeFixture(files) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'strata-paths-'));
  for (const [rel, content] of Object.entries(files)) {
    const full = path.join(dir, rel);
    fs.mkdirSync(path.dirname(full), { recursive: true });
    fs.writeFileSync(full, content);
  }
  return dir;
}

test('harf büyüklüğü diskteki dosyayla uyuşmayan import yakalanır', () => {
  // Windows'ta çalışır ama GitHub Pages'te (Linux) 404 verir.
  const dir = makeFixture({
    'js/a.js': "import { x } from './Lib.js';\n",
    'js/lib.js': 'export const x = 1;\n',
  });
  const problems = findPathProblems(dir);
  assert.equal(problems.length, 1);
  assert.equal(problems[0].specifier, './Lib.js');
  assert.equal(problems[0].kind, 'case-mismatch');
});

test('klasör adındaki harf büyüklüğü farkı da yakalanır', () => {
  const dir = makeFixture({
    'js/a.js': "export { y } from './Engine/world.js';\n",
    'js/engine/world.js': 'export const y = 1;\n',
  });
  const problems = findPathProblems(dir);
  assert.deepEqual(problems.map((p) => p.kind), ['case-mismatch']);
});

test('var olmayan dosyaya yapılan import yakalanır', () => {
  const dir = makeFixture({ 'js/a.js': "import './missing.js';\n" });
  assert.deepEqual(findPathProblems(dir).map((p) => p.kind), ['missing']);
});

test('dynamic import da kontrol edilir', () => {
  const dir = makeFixture({ 'js/a.js': "const m = await import('./nope.js');\n" });
  assert.deepEqual(findPathProblems(dir).map((p) => p.kind), ['missing']);
});

test('root-absolute path (Pages alt dizininde kırılır) yakalanır', () => {
  const dir = makeFixture({
    'js/a.js': "import { x } from '/js/lib.js';\n",
    'js/lib.js': 'export const x = 1;\n',
  });
  assert.deepEqual(findPathProblems(dir).map((p) => p.kind), ['root-absolute']);
});

test('index.html içindeki src/href değerleri kontrol edilir', () => {
  const dir = makeFixture({
    'index.html': '<link rel="stylesheet" href="./CSS/base.css"><script type="module" src="./js/main.js"></script><a href="#x">x</a><a href="https://example.com">e</a>',
    'css/base.css': '',
    'js/main.js': '',
  });
  const problems = findPathProblems(dir);
  assert.deepEqual(problems.map((p) => [p.specifier, p.kind]), [['./CSS/base.css', 'case-mismatch']]);
});

test('bare (node:, paket) import\'ları ve sorunsuz relative path\'ler raporlanmaz', () => {
  const dir = makeFixture({
    'js/a.js': "import fs from 'node:fs';\nimport { x } from './lib.js';\nimport { y } from '../shared/y.js';\n",
    'js/lib.js': 'export const x = 1;\n',
    'shared/y.js': 'export const y = 1;\n',
  });
  assert.deepEqual(findPathProblems(dir), []);
});

test('template literal dynamic import, new URL(import.meta.url), fetch ve Worker kontrol edilir', () => {
  const dir = makeFixture({
    'js/a.js': [
      'const m = await import(`./Mod.js`);',
      "const u = new URL('./Data.json', import.meta.url);",
      "fetch('/api/x.json');",
      "const w = new Worker('./WORKER.js', { type: 'module' });",
    ].join('\n'),
    'js/mod.js': '',
    'js/data.json': '{}',
    // fetch/Worker path'leri modüle değil belgeye (index.html konumu = kök) göre çözülür.
    'worker.js': '',
  });
  const kinds = findPathProblems(dir).map((p) => [p.specifier, p.kind]);
  assert.deepEqual(kinds.sort(), [
    ['./Data.json', 'case-mismatch'],
    ['./Mod.js', 'case-mismatch'],
    ['./WORKER.js', 'case-mismatch'],
    ['/api/x.json', 'root-absolute'],
  ]);
});

test('CSS url() ve @import ile HTML srcset kontrol edilir', () => {
  const dir = makeFixture({
    'css/a.css': "@import './B.css';\n.x { background: url('../img/Bg.png'); }\n.y { background: url(/abs.png); }\n.z { background: url(data:image/png;base64,AAAA); }",
    'css/b.css': '',
    'img/bg.png': '',
    'index.html': '<img srcset="./img/bg.png 1x, ./IMG/bg.png 2x" src="./img/bg.png">',
  });
  const kinds = findPathProblems(dir).map((p) => [p.specifier, p.kind]).sort();
  assert.deepEqual(kinds, [
    ['../img/Bg.png', 'case-mismatch'],
    ['./B.css', 'case-mismatch'],
    ['./IMG/bg.png', 'case-mismatch'],
    ['/abs.png', 'root-absolute'],
  ]);
});

test('href="./" (site kökü) ve yorum satırındaki import yanlış alarm vermez', () => {
  const dir = makeFixture({
    'index.html': '<a href="./">Ana sayfa</a><a href="../">Üst</a>',
    'js/a.js': "// import { x } from './Missing.js';\n/* import './Gone.js'; */\nexport const ok = 1;\n",
  });
  assert.deepEqual(findPathProblems(dir), []);
});

test('repo içinde hiçbir path problemi yok', () => {
  assert.deepEqual(findPathProblems(repoRoot), []);
});
