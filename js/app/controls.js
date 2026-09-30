// Kontrol paneli: DOM olaylarını uygulama eylemlerine bağlar ve durumu panele yansıtır.
// Paneldeki hiçbir öğe simülasyon içindekilere doğrudan erişmez (yalnızca actions).
import { MAT } from '../engine/materials.js';
import { PICKER } from './catalog.js';
import { SHADES, packRGBA } from '../render/palette.js';

const SWATCH = 6; // numune dokusu (hücre); CSS ile büyütülür

function paintSwatch(canvas, mat, palette) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const img = ctx.createImageData(SWATCH, SWATCH);
  const px = new Uint32Array(img.data.buffer);
  const light = packRGBA(90, 82, 74, 255);
  const dark = packRGBA(52, 46, 40, 255);
  for (let k = 0; k < px.length; k++) {
    if (mat === MAT.EMPTY) {
      const x = k % SWATCH;
      const y = (k / SWATCH) | 0;
      px[k] = ((x >> 1) + (y >> 1)) % 2 === 0 ? light : dark; // silgi: dama deseni
    } else {
      px[k] = palette[mat * SHADES + ((k * 7) % SHADES)];
    }
  }
  ctx.putImageData(img, 0, 0);
}

export function createControls(doc, { palette, scenes, actions }) {
  const $ = (id) => doc.getElementById(id);

  // Numune kartları
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
    paintSwatch(swatch, p.mat, palette);
    const name = doc.createElement('span');
    name.className = 'specimen-name';
    name.textContent = p.label;
    const kbd = doc.createElement('kbd');
    kbd.textContent = p.shortcut.toUpperCase();
    kbd.setAttribute('aria-hidden', 'true');
    label.append(input, swatch, name, kbd);
    picker.append(label);
    input.addEventListener('change', () => actions.setMaterial(p.key));
    cards.set(p.key, { label, input });
  }

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
  const speeds = [...doc.querySelectorAll('input[name="speed"]')];
  for (const r of speeds) r.addEventListener('change', () => actions.setSpeed(Number(r.value)));
  const undo = $('btn-undo');
  undo.addEventListener('click', () => actions.undo());
  $('btn-clear').addEventListener('click', () => actions.clear());

  // Sahne ve seed
  const sceneSelect = $('scene-select');
  for (const s of scenes) {
    const opt = doc.createElement('option');
    opt.value = s.id;
    opt.textContent = s.name;
    sceneSelect.append(opt);
  }
  sceneSelect.addEventListener('change', () => actions.setScene(sceneSelect.value));
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

  return {
    sync(state) {
      for (const [key, { label, input }] of cards) {
        const selected = key === state.material;
        label.dataset.selected = String(selected);
        input.checked = selected;
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
      sceneSelect.value = state.scene;
      committedSeed = state.seed;
      if (doc.activeElement !== seedInput) seedInput.value = state.seed;
    },
  };
}
