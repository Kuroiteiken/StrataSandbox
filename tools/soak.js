// Dayanıklılık (soak) testi: sahneleri uzun süre koşturur; dünya değişmezlerini, parçacık
// sayısının sınırlı kaldığını ve bellek sızıntısı olmadığını kontrol eder.
// Kullanım: node --expose-gc tools/soak.js [tick] [sahne,sahne]
// Varsayılan: 36 000 tick (60 TPS'de 10 dakikalık simülasyon) × volcano, benchmark.
import { Simulation } from '../js/engine/simulation.js';
import { getScene } from '../js/scenes/index.js';

const ticks = Number(process.argv[2]) || 36000;
const scenes = (process.argv[3] || 'volcano,benchmark').split(',');
const gc = globalThis.gc ?? (() => {});
const heapMb = () => {
  gc();
  return process.memoryUsage().heapUsed / 1048576;
};

let failed = false;
for (const id of scenes) {
  const sim = new Simulation({ width: 320, height: 180, seed: 'soak' });
  sim.loadScene(getScene(id), 'soak');
  const startParticles = sim.getStats().particles;
  for (let t = 0; t < 2000; t++) sim.step(); // JIT ısınması
  const heapStart = heapMb();
  let maxParticles = 0;
  const t0 = performance.now();
  for (let t = 0; t < ticks; t++) {
    sim.step();
    if (t % 1000 === 0) {
      const problems = sim.world.checkInvariants();
      if (problems.length) {
        console.log(`${id}: tick ${t} değişmez hatası: ${problems.slice(0, 3).join('; ')}`);
        failed = true;
        break;
      }
      maxParticles = Math.max(maxParticles, sim.getStats().particles);
    }
  }
  const seconds = (performance.now() - t0) / 1000;
  const heapEnd = heapMb();
  const growth = heapEnd - heapStart;
  const cells = sim.view.width * sim.view.height;
  const ok = maxParticles <= cells && growth < 5;
  if (!ok) failed = true;
  console.log(
    `${id.padEnd(10)} ${ticks} tick, ${seconds.toFixed(1)} sn (${((seconds * 1000) / ticks).toFixed(3)} ms/tick) · parçacık başlangıç ${startParticles}, en yüksek ${maxParticles}, son ${sim.getStats().particles} · heap ${heapStart.toFixed(1)} → ${heapEnd.toFixed(1)} MB (${growth >= 0 ? '+' : ''}${growth.toFixed(2)}) ${ok ? 'OK' : 'SORUN'}`,
  );
}
process.exitCode = failed ? 1 : 0;
