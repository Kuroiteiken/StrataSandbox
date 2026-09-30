import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { APP_VERSION } from '../js/config.js';
import { RELEASES } from '../js/app/releases.js';

const read = (p) => fs.readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');
const versionKey = (v) => v.split('.').map(Number).reduce((a, n) => a * 1000 + n, 0);

test('sürüm tek kaynaktan: config, package.json, CHANGELOG ve Yenilikler aynı sürümü gösterir', () => {
  assert.equal(JSON.parse(read('package.json')).version, APP_VERSION);
  const latest = /^## \[(\d+\.\d+\.\d+)\]/m.exec(read('CHANGELOG.md'));
  assert.ok(latest, 'CHANGELOG.md içinde yayınlanmış sürüm başlığı yok');
  assert.equal(latest[1], APP_VERSION);
  assert.equal(RELEASES[0].version, APP_VERSION);
});

test('Yenilikler yeniden eskiye sıralı; her kaydın tarihi ve en az bir maddesi var', () => {
  for (let k = 1; k < RELEASES.length; k++) assert.ok(versionKey(RELEASES[k - 1].version) > versionKey(RELEASES[k].version));
  for (const r of RELEASES) {
    assert.match(r.date, /^\d{4}-\d{2}-\d{2}$/);
    assert.ok(r.items.length > 0 && r.items.every((s) => typeof s === 'string' && s.length > 0));
  }
});

test('Yenilikler bölümleri: önce geliştirmedeki sürüm, sonra yayınlanmış sürümlerin tamamı (yalnızca sonuncusu değil)', async () => {
  const { UNRELEASED, releaseSections } = await import('../js/app/releases.js');
  const sections = releaseSections();
  assert.ok(UNRELEASED.items.length > 0, 'geliştirmedeki yenilikler listelenmeli');
  assert.ok(versionKey(UNRELEASED.version) > versionKey(APP_VERSION), 'geliştirme sürümü yayınlanmıştan yeni');
  assert.equal(sections[0].title, `v${UNRELEASED.version} · geliştirmede`);
  assert.equal(sections.length, RELEASES.length + 1, 'tüm yayınlanmış sürümler gösterilir');
  assert.deepEqual(sections.slice(1).map((s) => s.title), RELEASES.map((r) => `v${r.version} · ${r.date}`));
});
