import { test } from 'node:test';
import assert from 'node:assert/strict';
import { MAT } from '../js/engine/materials.js';
import { Simulation } from '../js/engine/simulation.js';
import { createApp, randomSeed } from '../js/app/app.js';
import { DEFAULT_PREFS, loadPrefs, isValidSeed } from '../js/app/storage.js';
import { STORAGE_KEY } from '../js/config.js';
import { hashView } from './helpers.js';
import { APP_VERSION } from '../js/config.js';

function fakeDoc() {
  const announcer = { textContent: '' };
  const makeDialog = () => ({
    open: false,
    showModal() {
      this.open = true;
    },
  });
  const dialog = makeDialog();
  const whatsNew = makeDialog();
  return {
    announcer,
    dialog,
    whatsNew,
    getElementById: (id) => ({ announcer, 'help-dialog': dialog, 'whats-new-dialog': whatsNew })[id] ?? null,
  };
}

function memoryStorage() {
  const data = {};
  return { data, getItem: (k) => data[k] ?? null, setItem: (k, v) => (data[k] = String(v)) };
}

function setup(prefs = {}) {
  const sim = new Simulation({ width: 80, height: 50, debug: true });
  const renderer = { seeds: [], modes: [], setBackground(seed) { this.seeds.push(seed); }, setViewMode(m) { this.modes.push(m); } };
  const storage = memoryStorage();
  const doc = fakeDoc();
  const app = createApp({ sim, renderer, prefs: { ...DEFAULT_PREFS, ...prefs }, storage, doc });
  app.load();
  return { sim, renderer, storage, doc, app };
}

test('hız değişimi desteklenen sıraya göre ilerler ve uçlarda durur', () => {
  const { app, sim } = setup({ speed: 1 });
  app.actions.changeSpeed(1);
  assert.equal(sim.speed, 2);
  app.actions.changeSpeed(1);
  app.actions.changeSpeed(1);
  assert.equal(sim.speed, 4);
  for (let k = 0; k < 5; k++) app.actions.changeSpeed(-1);
  assert.equal(sim.speed, 0.5);
});

test('şekil döngüsü Daire → Kare → Sprey → Daire', () => {
  const { app } = setup({ brushShape: 'circle' });
  const seen = [];
  for (let k = 0; k < 3; k++) {
    app.actions.cycleShape();
    seen.push(app.state.brushShape);
  }
  assert.deepEqual(seen, ['square', 'spray', 'circle']);
});

test('fırça boyutu 1..16 dışına çıkmaz', () => {
  const { app } = setup({ brushSize: 15 });
  app.actions.changeBrushSize(5);
  assert.equal(app.state.brushSize, 16);
  app.actions.setBrushSize(-3);
  assert.equal(app.state.brushSize, 1);
});

test('step simülasyonu duraklatır ve tam olarak bir tick ilerletir', () => {
  const { app, sim } = setup();
  const t = sim.tick;
  app.actions.step();
  assert.equal(sim.isPaused, true);
  assert.equal(sim.tick, t + 1);
  app.actions.step();
  assert.equal(sim.tick, t + 2);
});

test('togglePause duraklatır/sürdürür ve ekran okuyucuya duyurur', () => {
  const { app, sim, doc } = setup();
  app.actions.togglePause();
  assert.equal(sim.isPaused, true);
  assert.match(doc.announcer.textContent, /Duraklat/);
  app.actions.togglePause();
  assert.equal(sim.isPaused, false);
});

test('geçersiz seed reddedilir, geçerli seed sahneyi o seed ile yeniden üretir', () => {
  const { app, sim, renderer } = setup({ seed: 'first' });
  assert.equal(app.actions.setSeed('bad seed!'), false);
  assert.equal(app.state.seed, 'first');
  assert.equal(app.actions.setSeed('second'), true);
  assert.equal(sim.seed, 'second');
  assert.equal(renderer.seeds.at(-1), 'second');
});

test('aynı sahne + seed ile yeniden üretmek aynı başlangıç dünyasını verir', () => {
  const { app, sim } = setup({ scene: 'volcano', seed: 'repeat' });
  const h = hashView(sim);
  sim.paintAt(10, 10, { material: MAT.STONE, size: 8, shape: 'square' });
  app.actions.regenerate();
  assert.equal(hashView(sim), h);
});

test('newSeed geçerli ve farklı bir seed üretir', () => {
  const { app } = setup({ seed: 'orig' });
  app.actions.newSeed();
  assert.notEqual(app.state.seed, 'orig');
  assert.ok(isValidSeed(app.state.seed));
  for (let k = 0; k < 50; k++) assert.ok(isValidSeed(randomSeed()));
});

test('tercihler gecikmeli olarak kaydedilir ve geri okunabilir', async () => {
  const { app, storage } = setup();
  app.actions.setMaterial('LAVA');
  app.actions.setBrushSize(11);
  app.actions.setBrushShape('spray');
  assert.equal(storage.data[STORAGE_KEY], undefined, 'hemen yazılmamalı (debounce)');
  await new Promise((r) => setTimeout(r, 400));
  const saved = loadPrefs(storage, STORAGE_KEY);
  assert.equal(saved.material, 'LAVA');
  assert.equal(saved.brushSize, 11);
  assert.equal(saved.brushShape, 'spray');
});

test('fırça durumu engine brush nesnesine çevrilir (silgi = EMPTY)', () => {
  const { app } = setup({ material: 'ERASER', brushSize: 4, brushShape: 'square' });
  assert.deepEqual(app.brush(), { material: MAT.EMPTY, tool: null, size: 4, shape: 'square', replace: false });
  app.actions.setReplace(true);
  assert.equal(app.brush().replace, true);
});

test('klavye eylemleri uygulama eylemlerine dağıtılır', () => {
  const { app, sim, doc } = setup();
  app.dispatch({ type: 'material', key: 'WATER' });
  assert.equal(app.state.material, 'WATER');
  app.dispatch({ type: 'togglePause' });
  assert.equal(sim.isPaused, true);
  app.dispatch({ type: 'help' });
  assert.equal(doc.dialog.open, true);
  sim.beginStroke();
  sim.paintAt(5, 5, { material: MAT.STONE, size: 2, shape: 'square' });
  sim.endStroke();
  app.dispatch({ type: 'undo' });
  assert.equal(sim.canUndo, false);
});

test('clear geri alınabilir ve bunu duyurur', () => {
  const { app, sim, doc } = setup();
  const before = sim.getStats().particles;
  assert.ok(before > 0, 'varsayılan sahne boş olmamalı');
  app.actions.clear();
  assert.equal(sim.getStats().particles, 0);
  assert.match(doc.announcer.textContent, /Geri al/);
  app.actions.undo();
  assert.equal(sim.getStats().particles, before);
});

test('Yenilikler diyaloğu açılınca görülen sürüm güncellenir ve kaydedilir', async () => {
  const { app, doc, storage } = setup({ seenVersion: '' });
  app.actions.whatsNew();
  assert.equal(doc.whatsNew.open, true);
  assert.equal(app.state.seenVersion, APP_VERSION);
  await new Promise((r) => setTimeout(r, 350)); // PERSIST_DELAY_MS
  assert.equal(JSON.parse(storage.data['fsbox.prefs.v1']).seenVersion, APP_VERSION);
});

test('flip eylemi dünyayı çevirir ve geri alınabilir', () => {
  const { app, sim } = setup();
  sim.setCell(0, 0, MAT.STONE);
  app.dispatch({ type: 'flip' });
  assert.equal(sim.getCell(0, sim.view.height - 1).material, MAT.STONE);
  assert.equal(sim.canUndo, true);
});

test('Isıt seçilince fırça aracı taşır; silgi taşımaz', () => {
  const { app } = setup();
  app.actions.setMaterial('HEAT');
  assert.equal(app.brush().tool, 'heat');
  app.actions.setMaterial('ERASER');
  assert.equal(app.brush().tool, null);
  assert.equal(app.brush().material, MAT.EMPTY);
});

test('materyal seçmek sekmesini açar; setTab yalnızca geçerli kategoriyi kabul eder', () => {
  const { app } = setup();
  app.actions.setMaterial('ICE');
  assert.equal(app.state.tab, 'solid');
  app.actions.setTab('gas');
  assert.equal(app.state.tab, 'gas');
  app.actions.setTab('bogus');
  assert.equal(app.state.tab, 'gas');
});

test('ortam ayarı dünyayı anında değiştirmez ve sahne yüklenince sahnenin değerine döner', () => {
  const { app, sim } = setup({ scene: 'volcano' });
  const types = [...sim.view.type];
  app.actions.setAmbient(-25);
  assert.equal(sim.ambientBase, -25);
  assert.equal(app.state.ambient, -25);
  assert.equal(sim.canUndo, false);
  assert.deepEqual([...sim.view.type], types);
  app.actions.setScene('oasis');
  assert.equal(app.state.ambient, 30);
});

test('gün/gece tercihi simülasyona uygulanır ve kaydedilir; termal görünüm renderer\'a iletilir', async () => {
  const { app, sim, storage, renderer } = setup({ dayCycle: false });
  app.actions.setDayCycle(true);
  assert.equal(sim.dayCycle, true);
  app.dispatch({ type: 'toggleThermal' });
  assert.equal(renderer.modes.at(-1), 'thermal');
  assert.equal(app.state.thermal, true);
  await new Promise((r) => setTimeout(r, 350));
  assert.equal(JSON.parse(storage.data['fsbox.prefs.v1']).dayCycle, true);
});
