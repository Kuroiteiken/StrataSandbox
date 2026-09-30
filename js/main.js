// Composition root: config, simulation, renderer ve uygulama katmanını bağlar.
import { APP_NAME, CELL_BUDGET, MAX_DPR, PHYSICS_BUDGET_MS, STORAGE_KEY } from './config.js';
import { Simulation } from './engine/simulation.js';
import { Renderer } from './render/renderer.js';
import { chooseGridSize } from './render/layout.js';
import { createLoop } from './app/loop.js';
import { attachPointer } from './app/pointer.js';
import { attachKeyboard } from './app/keyboard.js';
import { createControls } from './app/controls.js';
import { createApp } from './app/app.js';
import { loadPrefs, safeLocalStorage, sanitizePrefs, isValidSeed } from './app/storage.js';
import { attachStats, formatStats, createRateMeter } from './app/stats.js';
import { materialLabel } from './app/catalog.js';
import { SCENES } from './scenes/index.js';
import { createQualityGovernor } from './app/quality.js';

document.title = APP_NAME;
for (const el of document.querySelectorAll('[data-app-name]')) el.textContent = APP_NAME;

const params = new URLSearchParams(location.search);
const debug = params.get('debug') === '1'; // debug paneli + window.__strata
const invariants = params.get('invariants') === '1'; // her tick dünya değişmezi kontrolü (yavaş)

// Tercihler; URL parametreleri (?scene=, ?seed=) kayıtlı tercihlerin önüne geçer.
const storage = safeLocalStorage();
const prefs = loadPrefs(storage, STORAGE_KEY);
if (params.has('scene')) prefs.scene = sanitizePrefs({ ...prefs, scene: params.get('scene') }).scene;
if (isValidSeed(params.get('seed'))) prefs.seed = params.get('seed');

const canvas = document.getElementById('world-canvas');
const viewport = document.getElementById('viewport');

// Sabit iç grid: yalnızca açılışta, konteynır boyutuna göre (ADR-002).
const coarsePointer = window.matchMedia('(pointer: coarse)').matches;
const initialRect = viewport.getBoundingClientRect();
const grid = chooseGridSize(initialRect.width, initialRect.height, coarsePointer ? CELL_BUDGET.mobile : CELL_BUDGET.desktop);

const sim = new Simulation({ width: grid.width, height: grid.height, seed: prefs.seed, debug: invariants });
const renderer = new Renderer(canvas, { seed: prefs.seed });

let cursor = null; // { x, y } | null
const updatePreview = (visible = cursor !== null) => {
  renderer.setBrushPreview({ x: cursor?.x, y: cursor?.y, shape: app.state.brushShape, size: app.state.brushSize, visible });
};

// Uyarlanır kalite: yalnızca dekoratif efektler (glow) değişir, fizik değil.
const quality = createQualityGovernor(prefs.quality);
renderer.setQuality(quality.level);

const app = createApp({
  sim,
  renderer,
  prefs,
  storage,
  doc: document,
  onStateChange: () => updatePreview(),
  onQualityChange(mode) {
    quality.setMode(mode);
    renderer.setQuality(quality.level);
  },
});
const pickableScenes = SCENES.filter((s) => debug || !s.hidden);
app.bindControls(createControls(document, { palette: renderer.palette, scenes: pickableScenes, actions: app.actions }));
app.load();

attachPointer(canvas, {
  renderer,
  sim,
  getBrush: () => app.brush(),
  onCursor(cell, pointerType) {
    cursor = cell;
    // Touch'ta önizleme gereksiz (parmak zaten altını kapatır).
    updatePreview(cell !== null && pointerType !== 'touch');
  },
});
attachKeyboard(window, (action) => app.dispatch(action));

const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
renderer.setReducedMotion(reducedMotion.matches);
reducedMotion.addEventListener('change', (e) => renderer.setReducedMotion(e.matches));

const resize = () => {
  const rect = viewport.getBoundingClientRect();
  renderer.resize(rect.width, rect.height, Math.min(window.devicePixelRatio || 1, MAX_DPR));
};
new ResizeObserver(resize).observe(viewport);
resize();

// DPR değişimi (pencere başka monitöre taşınınca ya da tarayıcı zoom'u): boyut değişmeden de olur.
const watchDpr = () => {
  const mq = window.matchMedia(`(resolution: ${window.devicePixelRatio}dppx)`);
  mq.addEventListener(
    'change',
    () => {
      resize();
      watchDpr();
    },
    { once: true },
  );
};
watchDpr();

// "Sahne ve diğer ayarlar" geniş ekranda açık, dar ekranda kapalı başlar.
document.getElementById('more-controls').open = !window.matchMedia('(max-width: 760px)').matches;

// İstatistikler: kare başına örnekleme, DOM'a ~400 ms'de bir yazım.
const meter = createRateMeter();
if (debug) document.getElementById('debug-panel').hidden = false;
attachStats(document, () => {
  const s = sim.getStats();
  const { fps, tps } = meter.rates(1000);
  const values = formatStats({ ...s, fps, tps });
  if (debug) {
    values.physicsMs = s.physicsMs.toFixed(2);
    values.renderMs = renderer.lastRenderMs.toFixed(2);
    values.activeCells = String(s.activeCells);
    values.quality = quality.mode === 'auto' ? `otomatik → ${quality.level}` : quality.level;
    values.cursorCell = cursor ? `${cursor.x}, ${cursor.y}` : '–';
    values.cursorMaterial = cursor ? materialLabel(sim.getCell(cursor.x, cursor.y)?.material) : '–';
  }
  return values;
});

const loop = createLoop({
  onFrame(dt, now) {
    const ticks = sim.update(dt, PHYSICS_BUDGET_MS);
    renderer.render(sim.view);
    meter.sample(now, sim.tick);
    const work = (ticks > 0 ? sim.physicsMs : 0) + renderer.lastRenderMs;
    const level = quality.update(now, work);
    if (level !== renderer.quality) renderer.setQuality(level);
  },
  onResume() {
    sim.resetTiming();
  },
});
loop.start();

if (debug) window.__strata = { sim, renderer, loop, grid, app, quality };
