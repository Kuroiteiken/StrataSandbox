// Headless fizik benchmark'ı: Benchmark sahnesini verilen grid boyutunda çalıştırır ve
// tick sürelerini (median / p95 / max) raporlar. Sonuçlar docs/DEVELOPMENT.md benchmark
// log'una işlenir; optimizasyonlar bu sayılarla karşılaştırılır.
// Kullanım: npm run bench            (masaüstü + mobil bütçesi)
//           node tools/bench.js 400 225 1200
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { Simulation } from '../js/engine/simulation.js';
import { getScene } from '../js/scenes/index.js';

function hashState(view) {
  const tb = new Uint32Array(view.temp.buffer, view.temp.byteOffset, view.temp.length);
  let h = 0x811c9dc5;
  for (let i = 0; i < view.type.length; i++) {
    h ^= view.type[i];
    h = Math.imul(h, 0x01000193);
    h ^= view.life[i] & 0xff;
    h = Math.imul(h, 0x01000193);
    h ^= tb[i] & 0xff;
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16);
}

export function runBenchmark({ width = 400, height = 225, warmup = 200, ticks = 1000, scene = 'benchmark' } = {}) {
  const sim = new Simulation({ width, height, seed: 'bench' });
  sim.loadScene(getScene(scene), 'bench');
  for (let t = 0; t < warmup; t++) sim.step();
  const times = new Float64Array(ticks);
  for (let t = 0; t < ticks; t++) {
    const a = performance.now();
    sim.step();
    times[t] = performance.now() - a;
  }
  const sorted = Array.from(times).sort((a, b) => a - b);
  const at = (q) => sorted[Math.min(sorted.length - 1, Math.floor(q * (sorted.length - 1)))];
  return {
    grid: `${width}×${height}`,
    ticks,
    particles: sim.getStats().particles,
    medianMs: at(0.5),
    p95Ms: at(0.95),
    maxMs: sorted[sorted.length - 1],
    stateHash: hashState(sim.view),
  };
}

const isMain = process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;
if (isMain) {
  const [w, h, n] = process.argv.slice(2).map(Number);
  const configs = w && h ? [[w, h]] : [[400, 225], [320, 180], [200, 200]];
  console.log(`Node ${process.version} · ${process.platform}/${process.arch}`);
  console.log('grid        parçacık   median ms   p95 ms   max ms');
  for (const [cw, ch] of configs) {
    const r = runBenchmark({ width: cw, height: ch, ticks: n || 1000 });
    console.log(
      `${r.grid.padEnd(11)} ${String(r.particles).padStart(8)}   ${r.medianMs.toFixed(3).padStart(9)}   ${r.p95Ms.toFixed(3).padStart(6)}   ${r.maxMs.toFixed(2).padStart(6)}`,
    );
  }
}
