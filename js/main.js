// Composition root: config, simulation, renderer ve uygulama katmanını bağlar.
import { APP_NAME, DEFAULT_GRID, DEFAULT_SEED } from './config.js';
import { Simulation } from './engine/simulation.js';
import { MAT } from './engine/materials.js';
import { Renderer } from './render/renderer.js';
import { createLoop } from './app/loop.js';
import { buildDemo, demoSources } from './scenes/demo.js';

const MAX_DPR = 2;
const PHYSICS_BUDGET_MS = 8;
const DEMO_POUR_TICKS = 1800; // geçici demo: ilk ~30 sn kum akıt

document.title = APP_NAME;
for (const el of document.querySelectorAll('[data-app-name]')) el.textContent = APP_NAME;

const params = new URLSearchParams(location.search);
const debug = params.get('debug') === '1';

const canvas = document.getElementById('world-canvas');
const viewport = document.getElementById('viewport');

const sim = new Simulation({ width: DEFAULT_GRID.width, height: DEFAULT_GRID.height, seed: DEFAULT_SEED, debug });
const renderer = new Renderer(canvas);
buildDemo(sim);
const sources = demoSources(sim.view.width, sim.view.height);

const resize = () => {
  const rect = viewport.getBoundingClientRect();
  renderer.resize(rect.width, rect.height, Math.min(window.devicePixelRatio || 1, MAX_DPR));
};
new ResizeObserver(resize).observe(viewport);
resize();

const loop = createLoop({
  onFrame(dt) {
    const ticks = sim.update(dt, PHYSICS_BUDGET_MS);
    if (ticks > 0 && sim.tick < DEMO_POUR_TICKS) {
      for (const s of sources) sim.setCell(s.x, s.y, MAT.SAND);
    }
    renderer.render(sim.view);
  },
  onResume() {
    sim.resetTiming();
  },
});
loop.start();

if (debug) window.__strata = { sim, renderer, loop };
