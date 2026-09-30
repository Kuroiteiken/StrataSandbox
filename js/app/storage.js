// Hafif kullanıcı tercihleri (localStorage). Dünya durumu burada saklanmaz.
// Tüm erişim try/catch ile korunur: gizli mod, engellenmiş depolama ve bozuk veri
// durumlarında sessizce varsayılanlara dönülür.
import { PICKER } from './catalog.js';
import { SPEEDS } from '../engine/simulation.js';
import { BRUSH_SHAPES, clampBrushSize } from '../engine/brush.js';
import { SCENES, DEFAULT_SCENE_ID } from '../scenes/index.js';
import { DEFAULT_SEED } from '../config.js';

export const QUALITY_LEVELS = Object.freeze(['auto', 'high', 'medium', 'low']);

export const DEFAULT_PREFS = Object.freeze({
  material: 'SAND',
  brushSize: 6,
  brushShape: 'circle',
  speed: 1,
  quality: 'auto',
  seed: DEFAULT_SEED,
  scene: DEFAULT_SCENE_ID,
});

const SEED_PATTERN = /^[A-Za-z0-9_-]{1,32}$/;

export function isValidSeed(seed) {
  return typeof seed === 'string' && SEED_PATTERN.test(seed);
}

export function sanitizePrefs(raw) {
  const r = raw !== null && typeof raw === 'object' ? raw : {};
  const d = DEFAULT_PREFS;
  return {
    material: PICKER.some((p) => p.key === r.material) ? r.material : d.material,
    brushSize: Number.isFinite(r.brushSize) ? clampBrushSize(r.brushSize) : d.brushSize,
    brushShape: BRUSH_SHAPES.includes(r.brushShape) ? r.brushShape : d.brushShape,
    speed: SPEEDS.includes(r.speed) ? r.speed : d.speed,
    quality: QUALITY_LEVELS.includes(r.quality) ? r.quality : d.quality,
    seed: isValidSeed(r.seed) ? r.seed : d.seed,
    scene: SCENES.some((s) => s.id === r.scene) ? r.scene : d.scene,
  };
}

export function loadPrefs(storage, key) {
  try {
    if (!storage) return { ...DEFAULT_PREFS };
    const raw = storage.getItem(key);
    if (raw === null || raw === undefined) return { ...DEFAULT_PREFS };
    return sanitizePrefs(JSON.parse(raw));
  } catch {
    return { ...DEFAULT_PREFS };
  }
}

export function savePrefs(prefs, storage, key) {
  try {
    if (!storage) return false;
    storage.setItem(key, JSON.stringify(sanitizePrefs(prefs)));
    return true;
  } catch {
    return false;
  }
}

// window.localStorage erişimi bile hata fırlatabilir (ör. engellenmiş çerezler).
export function safeLocalStorage() {
  try {
    return globalThis.localStorage ?? null;
  } catch {
    return null;
  }
}
