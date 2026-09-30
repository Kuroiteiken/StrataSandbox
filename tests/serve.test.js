import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createStaticServer } from '../tools/serve.js';

const repoRoot = path.resolve(fileURLToPath(new URL('..', import.meta.url)));

function listen(server) {
  return new Promise((resolve) => {
    server.listen(0, '127.0.0.1', () => resolve(`http://127.0.0.1:${server.address().port}`));
  });
}

let rootServer;
let rootBase;
let jsServer;
let jsBase;

before(async () => {
  rootServer = createStaticServer(repoRoot);
  rootBase = await listen(rootServer);
  // Kök olarak alt klasör verilir; üst klasördeki package.json'a erişilememeli.
  jsServer = createStaticServer(path.join(repoRoot, 'tools'));
  jsBase = await listen(jsServer);
});

after(() => {
  rootServer.close();
  jsServer.close();
});

test('.js dosyasını module script olarak yüklenebilecek MIME tipiyle sunar', async () => {
  const res = await fetch(`${rootBase}/tools/serve.js`);
  assert.equal(res.status, 200);
  assert.match(res.headers.get('content-type'), /^text\/javascript/);
});

test('kök isteğinde index.html döner', async () => {
  const res = await fetch(`${rootBase}/`);
  assert.equal(res.status, 200);
  assert.match(res.headers.get('content-type'), /^text\/html/);
});

test('olmayan dosya için 404 döner', async () => {
  const res = await fetch(`${rootBase}/does-not-exist.js`);
  assert.equal(res.status, 404);
});

test('kök klasör dışına çıkan path reddedilir', async () => {
  const res = await fetch(`${jsBase}/..%2fpackage.json`);
  assert.ok(res.status === 403 || res.status === 404, `beklenmeyen status: ${res.status}`);
  const body = await res.text();
  assert.doesNotMatch(body, /strata-sandbox/);
});

test('geliştirme sırasında önbelleğe alınmaz', async () => {
  const res = await fetch(`${rootBase}/tools/serve.js`);
  assert.equal(res.headers.get('cache-control'), 'no-store');
});

test('ters bölü (%5c) ile kök dışına çıkma denemesi de reddedilir', async () => {
  for (const attempt of ['..%5cpackage.json', '%2e%2e%5cpackage.json', '..%5c..%5cpackage.json']) {
    const res = await fetch(`${jsBase}/${attempt}`);
    assert.ok(res.status === 403 || res.status === 404, `${attempt}: ${res.status}`);
    assert.doesNotMatch(await res.text(), /strata-sandbox/);
  }
});
