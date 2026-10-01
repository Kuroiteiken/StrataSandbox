import { test } from 'node:test';
import assert from 'node:assert/strict';
import { MAT } from '../js/engine/materials.js';
import { PICKER, pickerByKey, pickerByShortcut, CATEGORIES, categoryOf } from '../js/app/catalog.js';
import { DEFAULT_PREFS, sanitizePrefs, loadPrefs, savePrefs } from '../js/app/storage.js';
import { keyToAction, shouldIgnoreTarget, attachKeyboard } from '../js/app/keyboard.js';
import { formatCount, formatStats, createRateMeter, dayLabel, formatClimate } from '../js/app/stats.js';
import { SCENES, getScene, DEFAULT_SCENE_ID } from '../js/scenes/index.js';
import { Simulation } from '../js/engine/simulation.js';

// ---------- catalog ----------

test('materyal seçici plandaki kısayol sırasını izler ve silgi EMPTY olarak tanımlıdır', () => {
  const byShortcut = Object.fromEntries(PICKER.map((p) => [p.shortcut, p.tool ?? p.mat]));
  assert.deepEqual(byShortcut, {
    1: MAT.SAND, 2: MAT.WATER, 3: MAT.STONE, 4: MAT.FIRE, 5: MAT.WOOD,
    6: MAT.STEAM, 7: MAT.OIL, 8: MAT.LAVA, 9: MAT.PLANT, g: MAT.GLASS, 0: MAT.EMPTY,
    x: MAT.CLONER, y: MAT.SINK, b: MAT.ICE, k: MAT.SNOW, m: MAT.METAL, e: MAT.MOLTEN_METAL, o: MAT.RUBBLE, r: MAT.GUNPOWDER, d: MAT.DYNAMITE, i: MAT.FUSE, n: MAT.METHANE, u: MAT.SMOKE, h: 'heat', c: 'cool',
  });
  assert.equal(pickerByKey('ERASER').mat, MAT.EMPTY);
  assert.equal(pickerByShortcut('G').key, 'GLASS');
  for (const p of PICKER) assert.ok(p.label.length > 0);
  for (const p of PICKER) assert.ok(['powder', 'liquid', 'gas', 'solid', 'tool'].includes(p.category), p.key);
});

// ---------- storage ----------

function memoryStorage(initial = {}) {
  const data = { ...initial };
  return {
    data,
    getItem: (k) => (k in data ? data[k] : null),
    setItem: (k, v) => {
      data[k] = String(v);
    },
  };
}

test('bozuk ya da eksik tercihler varsayılanlarla tamamlanır, geçerli alanlar korunur', () => {
  const p = sanitizePrefs({ material: 'LAVA', brushSize: 40, brushShape: 'hexagon', speed: 3, quality: 'high', seed: 'ok-seed_1', scene: 'nope' });
  assert.equal(p.material, 'LAVA');
  assert.equal(p.brushSize, 16, 'boyut 1..16 aralığına sıkıştırılmalı');
  assert.equal(p.brushShape, DEFAULT_PREFS.brushShape);
  assert.equal(p.speed, DEFAULT_PREFS.speed);
  assert.equal(p.quality, 'high');
  assert.equal(p.seed, 'ok-seed_1');
  assert.equal(p.scene, DEFAULT_PREFS.scene);
  assert.deepEqual(sanitizePrefs(null), DEFAULT_PREFS);
  assert.deepEqual(sanitizePrefs('garbage'), DEFAULT_PREFS);
});

test('seed yalnızca güvenli karakterler ve en fazla 32 karakter kabul eder', () => {
  assert.equal(sanitizePrefs({ seed: '<script>' }).seed, DEFAULT_PREFS.seed);
  assert.equal(sanitizePrefs({ seed: 'x'.repeat(33) }).seed, DEFAULT_PREFS.seed);
  assert.equal(sanitizePrefs({ seed: 'abc-DEF_123' }).seed, 'abc-DEF_123');
});

test('loadPrefs bozuk JSON, erişim hatası ve boş depoda varsayılanları döner', () => {
  assert.deepEqual(loadPrefs(memoryStorage({ k: '{not json' }), 'k'), DEFAULT_PREFS);
  assert.deepEqual(loadPrefs(memoryStorage(), 'k'), DEFAULT_PREFS);
  const throwing = {
    getItem() {
      throw new Error('SecurityError');
    },
    setItem() {
      throw new Error('QuotaExceeded');
    },
  };
  assert.deepEqual(loadPrefs(throwing, 'k'), DEFAULT_PREFS);
  assert.deepEqual(loadPrefs(undefined, 'k'), DEFAULT_PREFS);
  assert.equal(savePrefs(DEFAULT_PREFS, throwing, 'k'), false);
});

test('savePrefs/loadPrefs gidiş-dönüşü tercihleri korur', () => {
  const store = memoryStorage();
  const prefs = { ...DEFAULT_PREFS, material: 'OIL', brushSize: 9, brushShape: 'spray', speed: 2, seed: 'round-trip' };
  assert.equal(savePrefs(prefs, store, 'k'), true);
  assert.deepEqual(loadPrefs(store, 'k'), prefs);
});

test('seenVersion yalnızca x.y.z biçimini kabul eder; 0.9.0 tercih kaydı sorunsuz yüklenir', () => {
  assert.equal(sanitizePrefs({ seenVersion: '0.9.0' }).seenVersion, '0.9.0');
  assert.equal(sanitizePrefs({ seenVersion: '<b>' }).seenVersion, DEFAULT_PREFS.seenVersion);
  // 0.9.0'ın kaydettiği alanlar (yeni alanlar yok):
  const old = { material: 'LAVA', brushSize: 6, brushShape: 'circle', speed: 1, quality: 'auto', seed: 'strata', scene: 'volcano' };
  const p = loadPrefs(memoryStorage({ k: JSON.stringify(old) }), 'k');
  assert.equal(p.material, 'LAVA');
  assert.equal(p.seenVersion, DEFAULT_PREFS.seenVersion);
});

// ---------- keyboard ----------

const key = (k, mods = {}) => ({ key: k, ctrlKey: false, metaKey: false, altKey: false, shiftKey: false, ...mods });

test('kısayol eşlemesi planla uyumlu', () => {
  assert.deepEqual(keyToAction(key('1')), { type: 'material', key: 'SAND' });
  assert.deepEqual(keyToAction(key('0')), { type: 'material', key: 'ERASER' });
  assert.deepEqual(keyToAction(key('g')), { type: 'material', key: 'GLASS' });
  assert.deepEqual(keyToAction(key('G', { shiftKey: true })), { type: 'material', key: 'GLASS' });
  assert.deepEqual(keyToAction(key(' ')), { type: 'togglePause' });
  assert.deepEqual(keyToAction(key('.')), { type: 'step' });
  assert.deepEqual(keyToAction(key('[')), { type: 'brushSize', delta: -1 });
  assert.deepEqual(keyToAction(key(']')), { type: 'brushSize', delta: 1 });
  assert.deepEqual(keyToAction(key('s')), { type: 'cycleShape' });
  assert.deepEqual(keyToAction(key('+')), { type: 'speed', delta: 1 });
  assert.deepEqual(keyToAction(key('=')), { type: 'speed', delta: 1 });
  assert.deepEqual(keyToAction(key('-')), { type: 'speed', delta: -1 });
  assert.deepEqual(keyToAction(key('?', { shiftKey: true })), { type: 'help' });
  assert.deepEqual(keyToAction(key('f')), { type: 'flip' });
  assert.deepEqual(keyToAction(key('F', { shiftKey: true })), { type: 'flip' });
});

test('Ctrl+Z ve Cmd+Z undo; Ctrl+Shift+Z ve modifier ile basılan rakamlar yok sayılır', () => {
  assert.deepEqual(keyToAction(key('z', { ctrlKey: true })), { type: 'undo' });
  assert.deepEqual(keyToAction(key('Z', { metaKey: true })), { type: 'undo' });
  assert.equal(keyToAction(key('z', { ctrlKey: true, shiftKey: true })), null);
  assert.equal(keyToAction(key('1', { ctrlKey: true })), null, 'Ctrl+1 tarayıcı sekme kısayolu');
  assert.equal(keyToAction(key('s', { metaKey: true })), null, 'Cmd+S kaydet');
  assert.equal(keyToAction(key('z')), null);
});

test('AltGr ile yazılan karakterler (Türkçe Q: [ ] vb.) Ctrl kısayolu sanılmaz', () => {
  // Windows AltGr'yi ctrlKey + altKey olarak bildirir.
  assert.deepEqual(keyToAction(key('[', { ctrlKey: true, altKey: true })), { type: 'brushSize', delta: -1 });
  assert.deepEqual(keyToAction(key(']', { ctrlKey: true, altKey: true })), { type: 'brushSize', delta: 1 });
  assert.equal(keyToAction(key('z', { ctrlKey: true, altKey: true })), null, 'AltGr+Z undo değildir');
});

test('metin girişi yapılan alanlarda kısayollar devre dışı', () => {
  assert.equal(shouldIgnoreTarget({ tagName: 'INPUT', type: 'text' }), true);
  assert.equal(shouldIgnoreTarget({ tagName: 'TEXTAREA' }), true);
  assert.equal(shouldIgnoreTarget({ tagName: 'SELECT' }), true);
  assert.equal(shouldIgnoreTarget({ tagName: 'DIV', isContentEditable: true }), true);
  assert.equal(shouldIgnoreTarget({ tagName: 'CANVAS' }), false);
  assert.equal(shouldIgnoreTarget({ tagName: 'INPUT', type: 'range' }), false, 'slider odaktayken kısayollar çalışır');
  assert.equal(shouldIgnoreTarget(null), false);
});

// ---------- stats ----------

test('büyük sayılar okunabilir gruplanır', () => {
  assert.equal(formatCount(0), '0');
  assert.equal(formatCount(999), '999');
  assert.equal(formatCount(12345), '12 345');
  assert.equal(formatCount(1234567), '1 234 567');
});

test('formatStats panel alanlarını üretir', () => {
  const f = formatStats({ particles: 12345, fps: 59.6, tps: 60.2, width: 282, height: 197, speed: 0.5, paused: false, seed: 's1' });
  assert.equal(f.particles, '12 345');
  assert.equal(f.fps, '60');
  assert.equal(f.tps, '60');
  assert.equal(f.grid, '282×197');
  assert.equal(f.speed, '0.5×');
  assert.equal(f.seed, 's1');
  const paused = formatStats({ particles: 0, fps: 0, tps: 0, width: 1, height: 1, speed: 1, paused: true, seed: 'x' });
  assert.equal(paused.speed, 'duraklatıldı');
});

test('kategoriler seçici sırasını tanımlar; her kategoride en az bir giriş var', () => {
  assert.deepEqual(CATEGORIES.map((c) => c.id), ['powder', 'liquid', 'gas', 'solid', 'tool']);
  assert.deepEqual(CATEGORIES.map((c) => c.label), ['Toz', 'Sıvı', 'Gaz', 'Katı', 'Araç']);
  for (const c of CATEGORIES) assert.ok(PICKER.some((p) => p.category === c.id), c.id);
  assert.equal(categoryOf('METAL'), 'solid');
  assert.equal(categoryOf('nope'), 'powder');
});

test('T termal görünümü açıp kapatır; dayCycle tercihi boolean olarak doğrulanır', () => {
  assert.deepEqual(keyToAction(key('t')), { type: 'toggleThermal' });
  assert.equal(sanitizePrefs({ dayCycle: true }).dayCycle, true);
  assert.equal(sanitizePrefs({ dayCycle: 'yes' }).dayCycle, false);
  assert.equal(sanitizePrefs({}).dayCycle, false, '0.9.0 kaydı: alan yok → kapalı');
});

test('oran ölçer kare ve tick hızını zaman penceresinde hesaplar', () => {
  const meter = createRateMeter();
  for (let k = 0; k <= 60; k++) meter.sample(k * (1000 / 60), k * 2);
  const r = meter.rates(1000);
  assert.ok(Math.abs(r.fps - 60) < 1.5, `fps=${r.fps}`);
  assert.ok(Math.abs(r.tps - 120) < 3, `tps=${r.tps}`);
});

test('gün etiketi ve iklim satırı', () => {
  assert.equal(dayLabel(0.1), 'Gece');
  assert.equal(dayLabel(0.3), 'Sabah');
  assert.equal(dayLabel(0.5), 'Öğle');
  assert.equal(dayLabel(0.7), 'Akşam');
  assert.equal(dayLabel(0.9), 'Gece');
  assert.equal(formatClimate(true, 0.5, 27.6), 'Öğle · 28 °C');
  assert.equal(formatClimate(false, 0.5, -15), 'Sabit · -15 °C');
});

// ---------- scenes ----------

test('sahne kaydı benzersiz id içerir ve bilinmeyen id varsayılan sahneye düşer', () => {
  const ids = SCENES.map((s) => s.id);
  assert.equal(new Set(ids).size, ids.length);
  assert.ok(ids.includes(DEFAULT_SCENE_ID));
  assert.equal(getScene('does-not-exist').id, DEFAULT_SCENE_ID);
  for (const s of SCENES) assert.equal(typeof s.generate, 'function');
});

test('her sahne yüklendikten sonra geri alınacak bir undo noktası kalmaz', () => {
  for (const scene of SCENES) {
    const sim = new Simulation({ width: 120, height: 80, debug: true });
    sim.loadScene(scene, 'undo-check');
    assert.equal(sim.canUndo, false, scene.id);
    sim.step(); // debug değişmezleri
  }
});

// ---- attachKeyboard: odak durumuna göre Space ----

function keyboardHarness() {
  const listeners = {};
  const target = { addEventListener: (t, fn) => (listeners[t] = fn), removeEventListener() {} };
  const actions = [];
  attachKeyboard(target, (a) => actions.push(a.type));
  const press = (key, focused, extra = {}) => {
    const e = { key, ctrlKey: false, metaKey: false, altKey: false, shiftKey: false, repeat: false, defaultPrevented: false, target: focused, preventDefault() { this.defaultPrevented = true; }, ...extra };
    listeners.keydown(e);
    return e;
  };
  return { press, actions };
}

const focusable = (tagName, { focusVisible, type } = {}) => ({ tagName, type, matches: (sel) => sel === ':focus-visible' && Boolean(focusVisible) });

test('odakta buton yokken (fareyle tıklanan butonlar odağı bırakır) Space pause yapar', () => {
  const { press, actions } = keyboardHarness();
  const e = press(' ', { tagName: 'BODY', matches: () => false });
  assert.deepEqual(actions, ['togglePause']);
  assert.equal(e.defaultPrevented, true, 'sayfa kaydırması engellenmeli');
});

test('klavyeyle odaklanılmış butonda Space butonu tetikler (erişilebilirlik)', () => {
  const { press, actions } = keyboardHarness();
  const e = press(' ', focusable('BUTTON'));
  assert.deepEqual(actions, []);
  assert.equal(e.defaultPrevented, false);
});

test('seçili radyo (materyal kartı) odaktayken Space pause yapar', () => {
  const { press, actions } = keyboardHarness();
  press(' ', focusable('INPUT', { type: 'radio', focusVisible: true }));
  assert.deepEqual(actions, ['togglePause']);
});

test('yardım diyaloğu açıkken kısayollar arka plandaki sayfayı değiştirmez', () => {
  const { press, actions } = keyboardHarness();
  press('3', { tagName: 'BUTTON', matches: () => false, closest: (sel) => (sel === 'dialog[open]' ? {} : null) });
  assert.deepEqual(actions, []);
});
