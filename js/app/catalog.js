// Materyal seçicinin içeriği: sıra, arayüz etiketi (Türkçe) ve kısayol.
// Engine'deki materyal adları (İngilizce) tanımlayıcı olarak kalır.
import { MAT } from '../engine/materials.js';

export const PICKER = Object.freeze([
  { key: 'SAND', mat: MAT.SAND, label: 'Kum', shortcut: '1' },
  { key: 'WATER', mat: MAT.WATER, label: 'Su', shortcut: '2' },
  { key: 'STONE', mat: MAT.STONE, label: 'Taş', shortcut: '3' },
  { key: 'FIRE', mat: MAT.FIRE, label: 'Ateş', shortcut: '4' },
  { key: 'WOOD', mat: MAT.WOOD, label: 'Odun', shortcut: '5' },
  { key: 'STEAM', mat: MAT.STEAM, label: 'Buhar', shortcut: '6' },
  { key: 'OIL', mat: MAT.OIL, label: 'Yağ', shortcut: '7' },
  { key: 'LAVA', mat: MAT.LAVA, label: 'Lav', shortcut: '8' },
  { key: 'PLANT', mat: MAT.PLANT, label: 'Bitki', shortcut: '9' },
  { key: 'GLASS', mat: MAT.GLASS, label: 'Cam', shortcut: 'g' },
  { key: 'ERASER', mat: MAT.EMPTY, label: 'Silgi', shortcut: '0' },
]);

export function pickerByKey(key) {
  return PICKER.find((p) => p.key === key) ?? null;
}

export function pickerByShortcut(ch) {
  const c = String(ch).toLowerCase();
  return PICKER.find((p) => p.shortcut === c) ?? null;
}

// Engine materyal id'si → arayüz etiketi (debug imleç bilgisi için; seçicide olmayanlar dahil).
const EXTRA_LABELS = {
  [MAT.EMPTY]: 'Boş',
  [MAT.BURNING_WOOD]: 'Yanan odun',
  [MAT.BURNING_PLANT]: 'Yanan bitki',
  [MAT.BURNING_OIL]: 'Yanan yağ',
  [MAT.ASH]: 'Kül',
  [MAT.WALL]: 'Kenar',
};

export function materialLabel(mat) {
  if (mat in EXTRA_LABELS) return EXTRA_LABELS[mat];
  return PICKER.find((p) => p.mat === mat)?.label ?? String(mat);
}
