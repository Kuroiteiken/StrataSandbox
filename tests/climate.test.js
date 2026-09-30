import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { DAY_TICKS, DAY_AMPLITUDE, dayPhase, dayWave, ambientAt, daylight } from '../js/engine/climate.js';
import { Simulation } from '../js/engine/simulation.js';
import { MAT } from '../js/engine/materials.js';

test('gün dalgası: gece yarısı −1, öğle +1, periyodik ve [−1, 1] içinde', () => {
  assert.equal(dayWave(0), -1);
  assert.equal(dayWave(0.5), 1);
  for (let k = 0; k <= 100; k++) {
    const v = dayWave(k / 100);
    assert.ok(v >= -1 && v <= 1);
  }
  assert.equal(dayPhase(0), dayPhase(DAY_TICKS));
});

test('dalga süreklidir: ardışık tick\'ler arasında sıçrama yok; tick 0 sabah', () => {
  for (let t = 0; t < DAY_TICKS; t += 7) {
    assert.ok(Math.abs(ambientAt(20, t + 1, true) - ambientAt(20, t, true)) < 0.02);
  }
  assert.ok(Math.abs(dayWave(dayPhase(0))) < 1e-9, 'tick 0: dalga 0');
  assert.ok(dayWave(dayPhase(60)) > 0, 'sabah ısınıyor');
});

test('ambientAt döngü kapalıyken tabana eşit, açıkken ±DAY_AMPLITUDE içinde', () => {
  assert.equal(ambientAt(-5, 1234, false), -5);
  for (let t = 0; t < DAY_TICKS; t += 100) {
    const v = ambientAt(-5, t, true);
    assert.ok(v >= -5 - DAY_AMPLITUDE - 1e-9 && v <= -5 + DAY_AMPLITUDE + 1e-9);
  }
  assert.equal(daylight(0), 0);
  assert.equal(daylight(0.5), 1);
});

test('ısı ve iklim kodu Math.sin/cos/exp/pow kullanmaz', () => {
  for (const f of ['heat.js', 'climate.js']) {
    const code = fs.readFileSync(new URL(`../js/engine/${f}`, import.meta.url), 'utf8').replace(/\/\/[^\n]*/g, '');
    assert.equal(/Math\.(sin|cos|exp|pow)\b/.test(code), false, f);
  }
});

test('gün/gece açıkken ortam tick ile değişir; undo tick\'i ve dolayısıyla ortamı geri getirir', () => {
  const sim = new Simulation({ width: 8, height: 8 });
  sim.setAmbient(10);
  sim.setDayCycle(true);
  const a0 = sim.ambient;
  sim.beginStroke();
  sim.paintAt(1, 1, { material: MAT.STONE, size: 1, shape: 'square' });
  sim.endStroke();
  for (let t = 0; t < 1200; t++) sim.step();
  assert.notEqual(sim.ambient, a0);
  sim.undo();
  assert.equal(sim.ambient, a0);
});

test('loadScene sahnenin ortam sıcaklığını uygular ve alanı onunla başlatır', () => {
  const sim = new Simulation({ width: 8, height: 8 });
  sim.loadScene({ id: 'cold', ambient: -12, generate: () => {} }, 's');
  assert.equal(sim.ambient, -12);
  assert.equal(sim.getCell(3, 3).temp, -12);
  sim.loadScene({ id: 'default', generate: () => {} }, 's');
  assert.equal(sim.ambient, 20);
});
