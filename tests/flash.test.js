// Ani buharlaşma: lava/erimiş metale su patlar; ağır ağır kaynayan tencere patlamaz; mevcut sahnelerde
// istenmeyen patlama yok (Review Focus 4).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { MAT } from '../js/engine/materials.js';
import { Simulation } from '../js/engine/simulation.js';
import { BLAST_KIND } from '../js/engine/explosions.js';
import { getScene } from '../js/scenes/index.js';
import { countMaterial, runTicks } from './helpers.js';

const steamBlasts = (sim) => sim.getStats().blastTotals[BLAST_KIND.STEAM];

function fill(sim, x0, y0, x1, y1, mat) {
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) sim.setCell(x, y, mat);
}

test('lava dökülen su buhar patlaması yapar', () => {
  const sim = new Simulation({ width: 60, height: 40, seed: 'flash' });
  fill(sim, 10, 30, 49, 39, MAT.LAVA);
  fill(sim, 20, 22, 39, 27, MAT.WATER);
  runTicks(sim, 300);
  assert.ok(steamBlasts(sim) >= 1);
});

test('erimiş metale dökülen su da patlar', () => {
  const sim = new Simulation({ width: 60, height: 40, seed: 'flash-metal' });
  fill(sim, 10, 34, 49, 39, MAT.MOLTEN_METAL);
  fill(sim, 20, 26, 39, 31, MAT.WATER);
  runTicks(sim, 300);
  assert.ok(steamBlasts(sim) >= 1);
});

test('ağır ağır ısınan tencere 2000 tick boyunca patlamaz', () => {
  const sim = new Simulation({ width: 40, height: 30, seed: 'pot' });
  fill(sim, 12, 26, 27, 26, MAT.STONE); // taban
  fill(sim, 12, 18, 12, 25, MAT.STONE);
  fill(sim, 27, 18, 27, 25, MAT.STONE);
  fill(sim, 13, 20, 26, 25, MAT.WATER);
  fill(sim, 12, 27, 27, 29, MAT.WOOD);
  sim.setCell(11, 29, MAT.FIRE);
  runTicks(sim, 2000);
  assert.equal(steamBlasts(sim), 0);
});

test('mevcut sahnelerde istenmeyen basınç ya da buhar patlaması yok (Review Focus 4)', () => {
  for (const id of ['glacier', 'cave', 'oasis', 'hourglass']) {
    const sim = new Simulation({ width: 200, height: 120, seed: 'rf4' });
    sim.loadScene(getScene(id), 'rf4');
    runTicks(sim, 3000);
    const t = sim.getStats().blastTotals;
    assert.equal(t[BLAST_KIND.STEAM] + t[BLAST_KIND.PRESSURE], 0, `${id}: istenmeyen patlama`);
  }
  const foundry = new Simulation({ width: 200, height: 120, seed: 'rf4' });
  foundry.loadScene(getScene('foundry'), 'rf4');
  const stone0 = countMaterial(foundry, MAT.STONE);
  runTicks(foundry, 4000);
  assert.ok(countMaterial(foundry, MAT.STONE) >= stone0 * 0.99, 'dökümhane kalıpları kırılmaz');
});
