// Sahne kaydı. Her sahne { id, name, generate(sim, rng) } biçimindedir;
// Simulation.loadScene(scene, seed) ile yüklenir (engine bu kayıttan habersizdir).
import { buildDemo } from './demo.js';

export const SCENES = Object.freeze([
  { id: 'demo', name: 'Demo', generate: (sim) => buildDemo(sim) },
  { id: 'empty', name: 'Boş', generate: () => {} },
]);

export const DEFAULT_SCENE_ID = 'demo';

export function getScene(id) {
  return SCENES.find((s) => s.id === id) ?? SCENES.find((s) => s.id === DEFAULT_SCENE_ID);
}
