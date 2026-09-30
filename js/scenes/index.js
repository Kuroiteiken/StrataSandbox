// Sahne kaydı. Her sahne { id, name, ambient, generate(sim, rng), hidden?, hint? } biçimindedir;
// ambient: sahnenin varsayılan ortam sıcaklığı (°C); yüklenince alan onunla başlar.
// Simulation.loadScene(scene, seed) ile yüklenir (engine bu kayıttan habersizdir).
// hidden: seçicide yalnızca debug modunda görünür. hint: yüklenince duyurulan kısa ipucu.
import { volcano } from './volcano.js';
import { hourglass } from './hourglass.js';
import { oasis } from './oasis.js';
import { chaos } from './chaos.js';
import { benchmark } from './benchmark.js';

export const SCENES = Object.freeze([
  { id: 'volcano', name: 'Volkan', ambient: 20, generate: volcano },
  { id: 'hourglass', name: 'Kum saati', ambient: 20, generate: hourglass, hint: 'Kum saati sürekli akar: üstte sınırsız çoğaltıcı, altta sınırsız yutucu var.' },
  { id: 'oasis', name: 'Vaha', ambient: 30, generate: oasis },
  { id: 'chaos', name: 'Kaos Lab', ambient: 20, generate: chaos },
  { id: 'empty', name: 'Boş', ambient: 20, generate: () => {} },
  { id: 'benchmark', name: 'Benchmark', ambient: 20, generate: benchmark, hidden: true },
]);

export const DEFAULT_SCENE_ID = 'volcano';

export function getScene(id) {
  return SCENES.find((s) => s.id === id) ?? SCENES.find((s) => s.id === DEFAULT_SCENE_ID);
}
