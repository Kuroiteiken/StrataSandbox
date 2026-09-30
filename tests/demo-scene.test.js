import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Simulation } from '../js/engine/simulation.js';
import { MAT } from '../js/engine/materials.js';
import { buildDemo } from '../js/scenes/demo.js';
import { countMaterial, hashView } from './helpers.js';

for (const [w, h] of [[240, 135], [120, 160], [64, 36]]) {
  test(`demo sahnesi ${w}×${h} grid'de hatasız kurulur ve kum + taş içerir`, () => {
    const sim = new Simulation({ width: w, height: h, debug: true });
    buildDemo(sim);
    assert.deepEqual(sim.world.checkInvariants(), []);
    assert.ok(countMaterial(sim, MAT.SAND) > 0);
    assert.ok(countMaterial(sim, MAT.STONE) > 0);
  });
}

test('demo sahnesi aynı boyutta her seferinde aynı başlangıcı üretir', () => {
  const a = new Simulation({ width: 240, height: 135 });
  const b = new Simulation({ width: 240, height: 135 });
  buildDemo(a);
  buildDemo(b);
  assert.equal(hashView(a), hashView(b));
});
