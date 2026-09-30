import { test } from 'node:test';
import assert from 'node:assert/strict';
import { MAT } from '../js/engine/materials.js';
import { World } from '../js/engine/world.js';
import { Simulation } from '../js/engine/simulation.js';
import { DEFAULT_AMBIENT, clampAmbient } from '../js/engine/climate.js';
import { hashView, countMaterial } from './helpers.js';

test('yeni dünyada kenar dahil her hücre ortam sıcaklığındadır', () => {
  const w = new World(8, 6);
  for (let i = 0; i < w.size; i++) assert.equal(w.temp[i], DEFAULT_AMBIENT);
});

test('swap sıcaklığı parçacıkla taşır; transform korur; set verilen ya da ortam sıcaklığını yazar', () => {
  const w = new World(4, 4);
  const a = w.index(1, 1);
  const b = w.index(1, 2);
  w.set(a, MAT.SAND, 0, 0, 0, 500);
  w.swap(a, b);
  assert.equal(w.temp[b], 500);
  assert.equal(w.temp[a], DEFAULT_AMBIENT);
  w.transform(b, MAT.GLASS, 0);
  assert.equal(w.temp[b], 500);
  w.set(a, MAT.STONE, 0, 0, 0);
  assert.equal(w.temp[a], w.ambient);
});

test('clear sıcaklığı ortam değerine döndürür', () => {
  const w = new World(4, 4);
  w.temp[w.index(2, 2)] = 900;
  w.ambient = -5;
  w.clear();
  for (let i = 0; i < w.size; i++) assert.equal(w.temp[i], -5);
});

test('flipVertical sıcaklığı da aynalar', () => {
  const w = new World(3, 4);
  w.temp[w.index(1, 0)] = 700;
  w.flipVertical();
  assert.equal(w.temp[w.index(1, 3)], 700);
  assert.equal(w.temp[w.index(1, 0)], DEFAULT_AMBIENT);
});

test('checkInvariants sonlu olmayan ya da aralık dışı sıcaklığı yakalar', () => {
  const w = new World(4, 4);
  w.temp[w.index(1, 1)] = NaN;
  assert.ok(w.checkInvariants().some((p) => p.includes('sıcaklık')));
  w.temp[w.index(1, 1)] = 99999;
  assert.ok(w.checkInvariants().some((p) => p.includes('sıcaklık')));
});

test('undo sıcaklığı da geri getirir', () => {
  const sim = new Simulation({ width: 6, height: 6 });
  sim.setCell(2, 2, MAT.STONE);
  const i = sim.world.index(2, 2);
  sim.world.temp[i] = 700;
  const before = hashView(sim);
  sim.beginStroke();
  sim.paintAt(4, 4, { material: MAT.SAND, size: 1, shape: 'square' });
  sim.world.temp[i] = 20;
  sim.endStroke();
  assert.ok(sim.undo());
  assert.equal(sim.getCell(2, 2).temp, 700);
  assert.equal(hashView(sim), before);
});

test('silgi ortam sıcaklığı yazar; getCell sıcaklığı döner', () => {
  const sim = new Simulation({ width: 4, height: 4 });
  sim.setCell(1, 1, MAT.STONE);
  sim.world.temp[sim.world.index(1, 1)] = 700;
  sim.paintAt(1, 1, { material: MAT.EMPTY, size: 1, shape: 'square' });
  assert.equal(sim.getCell(1, 1).temp, sim.world.ambient);
});

test('sönen ateş yerinde sıcak hava bırakır (vanish sıcaklığı korur)', () => {
  const sim = new Simulation({ width: 5, height: 6, seed: 'hot-air' });
  sim.setCell(2, 5, MAT.FIRE);
  sim.world.temp[sim.world.index(2, 5)] = 900;
  let hottestAir = 0;
  for (let t = 0; t < 80 && countMaterial(sim, MAT.FIRE) > 0; t++) sim.step();
  assert.equal(countMaterial(sim, MAT.FIRE), 0);
  for (let i = 0; i < sim.view.temp.length; i++) if (sim.view.type[i] === MAT.EMPTY) hottestAir = Math.max(hottestAir, sim.view.temp[i]);
  assert.ok(hottestAir > 300, `en sıcak hava ${hottestAir}`);
});

// Yutulan madde ısısıyla birlikte yok olur: hücre 600 °C'yi taşımaz (difüzyon komşulardan biraz ısıtabilir).
test('yutucunun boşalttığı hücre yutulan maddenin ısısını taşımaz', () => {
  const sim = new Simulation({ width: 5, height: 5, seed: 'sink-temp' });
  sim.setCell(2, 4, MAT.SINK);
  sim.setCell(2, 3, MAT.SAND);
  sim.world.temp[sim.world.index(2, 3)] = 600;
  for (let t = 0; t < 400 && countMaterial(sim, MAT.SAND) > 0; t++) sim.step();
  assert.equal(countMaterial(sim, MAT.SAND), 0);
  assert.ok(sim.getCell(2, 3).temp < 100, `hücre ${sim.getCell(2, 3).temp} °C`);
});

test('clampAmbient aralığa kırpar, sonlu olmayanı varsayılana çevirir', () => {
  assert.equal(clampAmbient(100), 60);
  assert.equal(clampAmbient(-100), -40);
  assert.equal(clampAmbient(NaN), DEFAULT_AMBIENT);
  assert.equal(clampAmbient(12.5), 12.5);
});
