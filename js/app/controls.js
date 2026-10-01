// Kontrol paneli: DOM olaylarını uygulama eylemlerine bağlar ve durumu panele yansıtır.
// Paneldeki hiçbir öğe simülasyon içindekilere doğrudan erişmez (yalnızca actions).
import { MAT } from '../engine/materials.js';
import { PICKER, CATEGORIES } from './catalog.js';
import { SHADES, packRGBA } from '../render/palette.js';
import { getScene } from '../scenes/index.js';
import { APP_VERSION } from '../config.js';
import { releaseSections } from './releases.js';

const SWATCH = 6; // numune dokusu (hücre); CSS ile büyütülür

function paintSwatch(canvas, pick, palette) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const img = ctx.createImageData(SWATCH, SWATCH);
  const px = new Uint32Array(img.data.buffer);
  const light = packRGBA(90, 82, 74, 255);
  const dark = packRGBA(52, 46, 40, 255);
  for (let k = 0; k < px.length; k++) {
    const x = k % SWATCH;
    const y = (k / SWATCH) | 0;
    if (pick.tool === 'blast') {
      const dx = x - (SWATCH - 1) / 2; // araç: merkezden dışa beyaz-sarı-kırmızı patlama
      const dy = y - (SWATCH - 1) / 2;
      const u = Math.min(1, Math.sqrt(dx * dx + dy * dy) / (SWATCH / 2));
      px[k] = packRGBA(255, Math.round(240 - 170 * u), Math.round(200 - 190 * u), 255);
    } else if (pick.tool) {
      const u = y / (SWATCH - 1); // araç: dikey sıcak/soğuk gradyan
      px[k] = pick.tool === 'heat'
        ? packRGBA(255, Math.round(200 - 150 * u), Math.round(90 - 80 * u), 255)
        : packRGBA(Math.round(120 - 90 * u), Math.round(200 - 60 * u), 255, 255);
    } else if (pick.mat === MAT.EMPTY) {
      px[k] = ((x >> 1) + (y >> 1)) % 2 === 0 ? light : dark; // silgi: dama deseni
    } else {
      px[k] = palette[pick.mat * SHADES + ((k * 7) % SHADES)];
    }
  }
  ctx.putImageData(img, 0, 0);
}

export function createControls(doc, { palette, scenes, actions }) {
  const $ = (id) => doc.getElementById(id);

  // Numune kartları
  // Kategori sekmeleri (ARIA tablist): ok tuşları, Home/End; seçim otomatik (roving tabindex).
  const tabList = $('material-tabs');
  const tabPanel = $('material-panel');
  const tabs = new Map();
  const tabIds = CATEGORIES.map((c) => c.id);
  for (const c of CATEGORIES) {
    const tab = doc.createElement('button');
    tab.type = 'button';
    tab.id = `tab-${c.id}`;
    tab.className = 'picker-tab';
    tab.setAttribute('role', 'tab');
    tab.setAttribute('aria-controls', 'material-panel');
    tab.textContent = c.label;
    tab.addEventListener('click', () => actions.setTab(c.id));
    tab.addEventListener('keydown', (e) => {
      const at = tabIds.indexOf(c.id);
      const next = {
        ArrowRight: tabIds[(at + 1) % tabIds.length],
        ArrowLeft: tabIds[(at - 1 + tabIds.length) % tabIds.length],
        Home: tabIds[0],
        End: tabIds[tabIds.length - 1],
      }[e.key];
      if (!next) return;
      e.preventDefault();
      actions.setTab(next);
      tabs.get(next).focus();
    });
    tabList.append(tab);
    tabs.set(c.id, tab);
  }

  const picker = $('material-picker');
  const cards = new Map();
  for (const p of PICKER) {
    const label = doc.createElement('label');
    label.className = 'specimen';
    label.dataset.key = p.key;
    const input = doc.createElement('input');
    input.type = 'radio';
    input.name = 'material';
    input.value = p.key;
    input.setAttribute('aria-keyshortcuts', p.shortcut.toUpperCase());
    const swatch = doc.createElement('canvas');
    swatch.className = 'swatch';
    swatch.width = SWATCH;
    swatch.height = SWATCH;
    swatch.setAttribute('aria-hidden', 'true');
    paintSwatch(swatch, p, palette);
    const name = doc.createElement('span');
    name.className = 'specimen-name';
    name.textContent = p.label;
    const kbd = doc.createElement('kbd');
    kbd.textContent = p.shortcut.toUpperCase();
    kbd.setAttribute('aria-hidden', 'true');
    label.append(input, swatch, name, kbd);
    picker.append(label);
    input.addEventListener('change', () => actions.setMaterial(p.key));
    cards.set(p.key, { label, input, category: p.category });
  }

  // Ortam
  const ambient = $('ambient');
  const ambientOut = $('ambient-out');
  ambient.addEventListener('input', () => actions.setAmbient(Number(ambient.value)));
  const dayCycle = $('day-cycle');
  dayCycle.addEventListener('change', () => actions.setDayCycle(dayCycle.checked));
  const thermal = $('btn-thermal');
  thermal.addEventListener('click', () => actions.toggleThermal());

  // Fırça
  const size = $('brush-size');
  const sizeOut = $('brush-size-out');
  size.addEventListener('input', () => actions.setBrushSize(Number(size.value)));
  const shapes = [...doc.querySelectorAll('input[name="brush-shape"]')];
  for (const r of shapes) r.addEventListener('change', () => actions.setBrushShape(r.value));
  const replace = $('brush-replace');
  replace.addEventListener('change', () => actions.setReplace(replace.checked));

  // Simülasyon
  const play = $('btn-play');
  play.addEventListener('click', () => actions.togglePause());
  $('btn-step').addEventListener('click', () => actions.step());
  $('btn-flip').addEventListener('click', () => actions.flip());
  const speeds = [...doc.querySelectorAll('input[name="speed"]')];
  for (const r of speeds) r.addEventListener('change', () => actions.setSpeed(Number(r.value)));
  const undo = $('btn-undo');
  undo.addEventListener('click', () => actions.undo());
  $('btn-clear').addEventListener('click', () => actions.clear());
  const quality = $('quality-select');
  quality.addEventListener('change', () => {
    actions.setQuality(quality.value);
    quality.blur();
  });

  // Sahne ve seed
  const sceneSelect = $('scene-select');
  for (const s of scenes) {
    const opt = doc.createElement('option');
    opt.value = s.id;
    opt.textContent = s.name;
    sceneSelect.append(opt);
  }
  // Seçimden sonra odak bırakılır; aksi halde select odakta kalıp tüm kısayolları yutar.
  sceneSelect.addEventListener('change', () => {
    actions.setScene(sceneSelect.value);
    sceneSelect.blur();
  });
  const seedInput = $('seed-input');
  seedInput.addEventListener('change', () => actions.setSeed(seedInput.value.trim()));
  let committedSeed = '';
  seedInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') seedInput.blur(); // change olayını tetikler
    if (e.key === 'Escape') {
      // Düzenlemeyi iptal et: değer odaklanmadan önceki haline dönünce blur'da change tetiklenmez.
      seedInput.value = committedSeed;
      seedInput.blur();
    }
  });
  $('btn-regenerate').addEventListener('click', () => actions.regenerate());
  $('btn-new-seed').addEventListener('click', () => actions.newSeed());

  // Diğer
  $('btn-capture').addEventListener('click', () => actions.capture());
  $('btn-help').addEventListener('click', () => actions.help());

  // Sürüm rozeti ve Yenilikler listesi
  const badge = $('btn-whats-new');
  badge.textContent = `v${APP_VERSION}`;
  badge.addEventListener('click', () => actions.whatsNew());
  const releaseList = $('whats-new-list');
  for (const section of releaseSections()) {
    const title = doc.createElement('h3');
    title.className = 'release-title';
    title.textContent = section.title;
    const items = doc.createElement('ul');
    items.className = 'release-items';
    for (const text of section.items) {
      const li = doc.createElement('li');
      li.textContent = text;
      items.append(li);
    }
    releaseList.append(title, items);
  }

  // Fareyle tıklanan butonlar odağı bırakır: sonraki Space pause yapsın, butonu tekrar
  // tetiklemesin (ör. "Yeniden üret" dünyayı silerdi). Klavyeyle etkinleştirmede (detail 0)
  // odak korunur (erişilebilirlik).
  for (const el of doc.querySelectorAll('#panel button, #panel summary, .app-header button')) {
    el.addEventListener('click', (e) => {
      if (e.detail > 0) el.blur();
    });
  }

  return {
    sync(state) {
      for (const [key, { label, input, category }] of cards) {
        const selected = key === state.material;
        label.dataset.selected = String(selected);
        input.checked = selected;
        label.hidden = category !== state.tab;
      }
      size.value = String(state.brushSize);
      sizeOut.value = String(state.brushSize);
      sizeOut.textContent = String(state.brushSize);
      for (const r of shapes) r.checked = r.value === state.brushShape;
      replace.checked = state.replace;
      play.setAttribute('aria-pressed', String(state.paused));
      play.firstChild.textContent = state.paused ? 'Devam et ' : 'Duraklat ';
      for (const r of speeds) r.checked = Number(r.value) === state.speed;
      undo.disabled = !state.canUndo;
      quality.value = state.quality;
      for (const [id, tab] of tabs) {
        const on = id === state.tab;
        tab.setAttribute('aria-selected', String(on));
        tab.tabIndex = on ? 0 : -1;
      }
      tabPanel.setAttribute('aria-labelledby', `tab-${state.tab}`);
      ambient.value = String(state.ambient);
      ambientOut.textContent = `${state.ambient} °C`;
      dayCycle.checked = state.dayCycle;
      thermal.setAttribute('aria-pressed', String(state.thermal));
      // Seçicide olmayan (ör. yalnızca debug'da listelenen) aktif sahne için seçenek ekle.
      if (![...sceneSelect.options].some((o) => o.value === state.scene)) {
        const opt = doc.createElement('option');
        opt.value = state.scene;
        opt.textContent = getScene(state.scene).name;
        sceneSelect.append(opt);
      }
      sceneSelect.value = state.scene;
      committedSeed = state.seed;
      if (doc.activeElement !== seedInput) seedInput.value = state.seed;
      badge.dataset.new = String(state.seenVersion !== APP_VERSION);
    },
  };
}
