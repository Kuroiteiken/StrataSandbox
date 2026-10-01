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

test('lava dökülen su buhar patlaması yapar (3 seed)', () => {
  for (const seed of ['flash', 'flash-b', 'flash-c']) {
    const sim = new Simulation({ width: 60, height: 40, seed });
    fill(sim, 10, 30, 49, 39, MAT.LAVA);
    fill(sim, 20, 22, 39, 27, MAT.WATER);
    runTicks(sim, 300);
    assert.ok(steamBlasts(sim) >= 1, `${seed}: lava + su patlamalı`);
  }
});

test('erimiş metale dökülen su da patlar (3 seed)', () => {
  for (const seed of ['flash-metal', 'flash-metal-b', 'flash-metal-c']) {
    const sim = new Simulation({ width: 60, height: 40, seed });
    fill(sim, 10, 34, 49, 39, MAT.MOLTEN_METAL);
    fill(sim, 20, 26, 39, 31, MAT.WATER);
    runTicks(sim, 300);
    assert.ok(steamBlasts(sim) >= 1, `${seed}: erimiş metal + su patlamalı`);
  }
});

// Gerçekten kaynayan tencere: taban sabit sıcaklıkta tutulur, buhar çıkar ama kaynak eşiğinin altında kalır.
for (const floorT of [200, 400]) {
  test(`tabanı ${floorT} °C tutulan tencere kaynar ama 2000 tick boyunca buhar patlaması yapmaz`, () => {
    const sim = new Simulation({ width: 40, height: 30, seed: 'pot' });
    fill(sim, 12, 26, 27, 26, MAT.STONE); // taban
    fill(sim, 12, 18, 12, 25, MAT.STONE);
    fill(sim, 27, 18, 27, 25, MAT.STONE);
    fill(sim, 13, 20, 26, 25, MAT.WATER);
    const water0 = countMaterial(sim, MAT.WATER);
    let steamSeen = 0;
    for (let t = 0; t < 2000; t++) {
      for (let x = 12; x <= 27; x++) sim.setTemp(x, 26, floorT);
      sim.step();
      steamSeen = Math.max(steamSeen, countMaterial(sim, MAT.STEAM));
    }
    assert.ok(steamSeen > 0, 'tencere kaynamalı (buhar görülmeli)');
    assert.ok(countMaterial(sim, MAT.WATER) < water0, 'su buharlaşmış olmalı');
    assert.equal(steamBlasts(sim), 0);
  });
}

test('lava + su kapalı kutusu 10k tick patlamalarla da sağlam kalır (ani buharlaşma açık)', () => {
  const sim = new Simulation({ width: 30, height: 20, seed: 'stable', debug: true });
  fill(sim, 0, 14, 29, 19, MAT.LAVA);
  fill(sim, 0, 6, 29, 13, MAT.WATER);
  runTicks(sim, 10000);
  const t = sim.getStats().blastTotals;
  assert.ok(t[BLAST_KIND.STEAM] >= 1);
  assert.ok(t[BLAST_KIND.STEAM] < 20000, `patlama sayısı sınırlı kalmalı: ${t[BLAST_KIND.STEAM]}`);
  for (let y = 0; y < 20; y++) for (let x = 0; x < 30; x++) {
    const c = sim.getCell(x, y);
    assert.ok(Number.isFinite(c.temp), `(${x},${y}) sıcaklık sonlu değil`);
    assert.ok(c.material >= 0 && c.material < 256);
  }
});

test('kapalı kavanozda bir anda kaynatılan su (yapay hızlı ısıtıcı) buhar patlaması yapar', () => {
  // Dış ısıtıcı 8 suyu aynı tick'te 150 °C'ye çeker: gerçek bir ani buharlaşma, basınçtan önce patlar.
  const sim = new Simulation({ width: 30, height: 30, seed: 'jar-flash' });
  for (let y = 20; y <= 24; y++) { sim.setCell(12, y, MAT.GLASS); sim.setCell(17, y, MAT.GLASS); }
  for (let x = 12; x <= 17; x++) { sim.setCell(x, 20, MAT.GLASS); sim.setCell(x, 24, MAT.GLASS); }
  fill(sim, 13, 22, 16, 23, MAT.WATER);
  for (let t = 0; t < 300; t++) {
    for (let y = 22; y <= 23; y++) for (let x = 13; x <= 16; x++) if (sim.getCell(x, y).material === MAT.WATER) sim.setTemp(x, y, 150);
    sim.step();
  }
  assert.ok(steamBlasts(sim) + sim.getStats().blastTotals[BLAST_KIND.PRESSURE] >= 1);
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
