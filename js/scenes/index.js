// Sahne kaydı. Her sahne { id, name, generate(sim, rng), hidden?, hint? } biçimindedir;
// Simulation.loadScene(scene, seed) ile yüklenir (engine bu kayıttan habersizdir).
// hidden: seçicide yalnızca debug modunda görünür. hint: yüklenince duyurulan kısa ipucu.
import { volcano } from './volcano.js';
import { hourglass } from './hourglass.js';
import { oasis } from './oasis.js';
import { chaos } from './chaos.js';
import { benchmark } from './benchmark.js';

export const SCENES = Object.freeze([
  { id: 'volcano', name: 'Volkan', generate: volcano },
  { id: 'hourglass', name: 'Kum saati', generate: hourglass, hint: 'Kum saati sürekli akar: üstte sınırsız çoğaltıcı, altta sınırsız yutucu var.' },
  { id: 'oasis', name: 'Vaha', generate: oasis },
  { id: 'chaos', name: 'Kaos Lab', generate: chaos },
  { id: 'empty', name: 'Boş', generate: () => {} },
  { id: 'benchmark', name: 'Benchmark', generate: benchmark, hidden: true },
]);

export const DEFAULT_SCENE_ID = 'volcano';

export function getScene(id) {
  return SCENES.find((s) => s.id === id) ?? SCENES.find((s) => s.id === DEFAULT_SCENE_ID);
}
