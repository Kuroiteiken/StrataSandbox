// Composition root: config, simulation, renderer ve uygulama katmanını bağlar.
import { APP_NAME, CELL_BUDGET, MAX_DPR, PHYSICS_BUDGET_MS, DEFAULT_SEED } from './config.js';
import { Simulation } from './engine/simulation.js';
import { Renderer } from './render/renderer.js';
import { chooseGridSize } from './render/layout.js';
import { createLoop } from './app/loop.js';
import { attachPointer } from './app/pointer.js';
import { MAT } from './engine/materials.js';
import { buildDemo, demoSources } from './scenes/demo.js';

const DEMO_POUR_TICKS = 1800; // geçici demo: ilk ~30 sn akıt

document.title = APP_NAME;
for (const el of document.querySelectorAll('[data-app-name]')) el.textContent = APP_NAME;

const params = new URLSearchParams(location.search);
const debug = params.get('debug') === '1';

const canvas = document.getElementById('world-canvas');
const viewport = document.getElementById('viewport');

// Sabit iç grid: yalnızca açılışta, konteynır boyutuna göre.
const coarsePointer = window.matchMedia('(pointer: coarse)').matches;
const initialRect = viewport.getBoundingClientRect();
const grid = chooseGridSize(initialRect.width, initialRect.height, coarsePointer ? CELL_BUDGET.mobile : CELL_BUDGET.desktop);

const sim = new Simulation({ width: grid.width, height: grid.height, seed: DEFAULT_SEED, debug });
const renderer = new Renderer(canvas, { seed: DEFAULT_SEED });
buildDemo(sim);
const sources = demoSources(sim.view.width, sim.view.height);

const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
renderer.setReducedMotion(reducedMotion.matches);
reducedMotion.addEventListener('change', (e) => renderer.setReducedMotion(e.matches));

// Fırça durumu (Phase 6'da panel ve kısayollarla değiştirilecek).
const brush = { material: MAT.SAND, size: 6, shape: 'circle', replace: false };

attachPointer(canvas, {
  renderer,
  sim,
  getBrush: () => brush,
  onCursor(cell, pointerType) {
    // Touch'ta önizleme gereksiz (parmak zaten altını kapatır).
    const visible = cell !== null && pointerType !== 'touch';
    renderer.setBrushPreview({ x: cell?.x, y: cell?.y, shape: brush.shape, size: brush.size, visible });
  },
});

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
      for (const s of sources) sim.setCell(s.x, s.y, s.material);
    }
    renderer.render(sim.view);
  },
  onResume() {
    sim.resetTiming();
  },
});
loop.start();

if (debug) window.__strata = { sim, renderer, loop, grid, brush };
