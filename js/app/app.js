// Uygulama durumu ve eylemleri. Panel, klavye ve pointer bu eylemleri çağırır;
// simülasyon yalnızca public API'si üzerinden kullanılır.
import { pickerByKey, CATEGORIES, categoryOf } from './catalog.js';
import { SPEEDS } from '../engine/simulation.js';
import { BRUSH_SHAPES, clampBrushSize } from '../engine/brush.js';
import { getScene } from '../scenes/index.js';
import { isValidSeed, savePrefs, QUALITY_LEVELS } from './storage.js';
import { APP_SLUG, APP_VERSION, STORAGE_KEY } from '../config.js';

const PERSIST_DELAY_MS = 300;

export function randomSeed() {
  const a = new Uint32Array(2);
  globalThis.crypto.getRandomValues(a);
  return (a[0].toString(36) + a[1].toString(36)).slice(0, 8);
}

function timestamp(date) {
  const p = (n) => String(n).padStart(2, '0');
  return `${date.getFullYear()}${p(date.getMonth() + 1)}${p(date.getDate())}-${p(date.getHours())}${p(date.getMinutes())}${p(date.getSeconds())}`;
}

export function createApp({ sim, renderer, prefs, storage, doc, onStateChange = () => {}, onQualityChange = () => {} }) {
  const state = {
    material: prefs.material,
    brushSize: prefs.brushSize,
    brushShape: prefs.brushShape,
    replace: false,
    speed: prefs.speed,
    quality: prefs.quality,
    scene: getScene(prefs.scene).id,
    seed: prefs.seed,
    seenVersion: prefs.seenVersion,
    tab: categoryOf(prefs.material), // açık seçici sekmesi
    ambient: sim.ambientBase, // ortam sıcaklığı (sahne yüklenince sahnenin değeri)
    dayCycle: prefs.dayCycle,
    thermal: false, // termal görünüm (saklanmaz)
  };
  sim.setSpeed(state.speed);
  sim.setDayCycle(state.dayCycle);

  let controls = null;
  let persistTimer = 0;

  const persist = () => {
    clearTimeout(persistTimer);
    persistTimer = setTimeout(() => {
      const { material, brushSize, brushShape, speed, quality, seed, scene, seenVersion, dayCycle } = state;
      savePrefs({ material, brushSize, brushShape, speed, quality, seed, scene, seenVersion, dayCycle }, storage, STORAGE_KEY);
    }, PERSIST_DELAY_MS);
  };

  const announce = (message) => {
    const el = doc.getElementById('announcer');
    if (el) el.textContent = message;
  };

  const sync = () => {
    controls?.sync({ ...state, paused: sim.isPaused, canUndo: sim.canUndo });
    onStateChange(state);
  };

  const load = () => {
    const scene = getScene(state.scene);
    sim.loadScene(scene, state.seed);
    state.ambient = sim.ambientBase;
    renderer.setBackground(state.seed);
    if (scene.hint) announce(scene.hint);
    sync();
  };

  const actions = {
    setMaterial(key) {
      const pick = pickerByKey(key);
      if (!pick) return;
      state.material = key;
      state.tab = pick.category;
      announce(`Materyal: ${pick.label}`);
      persist();
      sync();
    },
    setTab(id) {
      if (!CATEGORIES.some((c) => c.id === id)) return;
      state.tab = id;
      sync();
    },
    // Ortam sıcaklığı: hava yavaşça yaklaşır; sahne yeniden üretilmez, undo noktası oluşmaz.
    setAmbient(c) {
      sim.setAmbient(Number(c));
      state.ambient = sim.ambientBase;
      sync();
    },
    setDayCycle(on) {
      state.dayCycle = Boolean(on);
      sim.setDayCycle(state.dayCycle);
      announce(state.dayCycle ? 'Gün/gece döngüsü açık' : 'Gün/gece döngüsü kapalı');
      persist();
      sync();
    },
    toggleThermal() {
      state.thermal = !state.thermal;
      renderer.setViewMode?.(state.thermal ? 'thermal' : 'normal');
      announce(state.thermal ? 'Termal görünüm açık' : 'Termal görünüm kapalı');
      sync();
    },
    setBrushSize(size) {
      state.brushSize = clampBrushSize(size);
      persist();
      sync();
    },
    changeBrushSize(delta) {
      actions.setBrushSize(state.brushSize + delta);
    },
    setBrushShape(shape) {
      if (!BRUSH_SHAPES.includes(shape)) return;
      state.brushShape = shape;
      persist();
      sync();
    },
    cycleShape() {
      const i = BRUSH_SHAPES.indexOf(state.brushShape);
      actions.setBrushShape(BRUSH_SHAPES[(i + 1) % BRUSH_SHAPES.length]);
    },
    setReplace(enabled) {
      state.replace = Boolean(enabled);
      sync();
    },
    togglePause() {
      if (sim.isPaused) {
        sim.resetTiming();
        sim.play();
      } else {
        sim.pause();
      }
      announce(sim.isPaused ? 'Duraklatıldı' : 'Devam ediyor');
      sync();
    },
    step() {
      if (!sim.isPaused) sim.pause();
      sim.step();
      sync();
    },
    setSpeed(speed) {
      if (!SPEEDS.includes(speed)) return;
      sim.setSpeed(speed);
      state.speed = speed;
      persist();
      sync();
    },
    changeSpeed(delta) {
      const i = SPEEDS.indexOf(state.speed);
      actions.setSpeed(SPEEDS[Math.max(0, Math.min(SPEEDS.length - 1, i + delta))]);
    },
    setQuality(mode) {
      if (!QUALITY_LEVELS.includes(mode)) return;
      state.quality = mode;
      onQualityChange(mode);
      persist();
      sync();
    },
    undo() {
      if (sim.undo()) announce('Son çizim geri alındı');
      sync();
    },
    clear() {
      sim.clear();
      announce('Dünya temizlendi. Geri al ile geri getirilebilir.');
      sync();
    },
    flip() {
      sim.flipVertical();
      announce('Dünya ters çevrildi. Geri al ile geri alınabilir.');
      sync();
    },
    setScene(id) {
      state.scene = getScene(id).id;
      load();
      persist();
    },
    setSeed(seed) {
      if (!isValidSeed(seed)) {
        sync(); // geçersiz girişi eski değere döndür
        return false;
      }
      state.seed = seed;
      load();
      persist();
      return true;
    },
    regenerate() {
      load();
    },
    newSeed() {
      state.seed = randomSeed();
      load();
      persist();
    },
    async capture() {
      try {
        const blob = await renderer.capture(sim.view);
        const url = URL.createObjectURL(blob);
        const a = doc.createElement('a');
        a.href = url;
        a.download = `${APP_SLUG}-${state.scene}-${state.seed}-${timestamp(new Date())}.png`;
        doc.body.append(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 2000);
        announce('Görüntü kaydedildi');
      } catch {
        announce('Görüntü alınamadı');
      }
    },
    help() {
      const dialog = doc.getElementById('help-dialog');
      if (dialog && !dialog.open) dialog.showModal();
    },
    whatsNew() {
      const dialog = doc.getElementById('whats-new-dialog');
      if (dialog && !dialog.open) dialog.showModal();
      state.seenVersion = APP_VERSION;
      persist();
      sync();
    },
    refresh() {
      sync();
    },
  };

  return {
    state,
    actions,
    load,
    sync,
    brush() {
      const pick = pickerByKey(state.material);
      return { material: pick.mat ?? 0, tool: pick.tool ?? null, size: state.brushSize, shape: state.brushShape, replace: state.replace };
    },
    bindControls(c) {
      controls = c;
      sync();
    },
    // Klavye eylemi → uygulama eylemi
    dispatch(action) {
      switch (action.type) {
        case 'material':
          return actions.setMaterial(action.key);
        case 'togglePause':
          return actions.togglePause();
        case 'step':
          return actions.step();
        case 'brushSize':
          return actions.changeBrushSize(action.delta);
        case 'cycleShape':
          return actions.cycleShape();
        case 'speed':
          return actions.changeSpeed(action.delta);
        case 'undo':
          return actions.undo();
        case 'flip':
          return actions.flip();
        case 'toggleThermal':
          return actions.toggleThermal();
        case 'help':
          return actions.help();
        default:
          return undefined;
      }
    },
  };
}
