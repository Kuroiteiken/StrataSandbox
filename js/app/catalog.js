// Materyal seçicinin içeriği: sıra, arayüz etiketi (Türkçe) ve kısayol.
// Engine'deki materyal adları (İngilizce) tanımlayıcı olarak kalır.
import { MAT } from '../engine/materials.js';

export const PICKER = Object.freeze([
  { key: 'SAND', mat: MAT.SAND, label: 'Kum', shortcut: '1', category: 'powder' },
  { key: 'WATER', mat: MAT.WATER, label: 'Su', shortcut: '2', category: 'liquid' },
  { key: 'STONE', mat: MAT.STONE, label: 'Taş', shortcut: '3', category: 'solid' },
  { key: 'FIRE', mat: MAT.FIRE, label: 'Ateş', shortcut: '4', category: 'gas' },
  { key: 'WOOD', mat: MAT.WOOD, label: 'Odun', shortcut: '5', category: 'solid' },
  { key: 'STEAM', mat: MAT.STEAM, label: 'Buhar', shortcut: '6', category: 'gas' },
  { key: 'OIL', mat: MAT.OIL, label: 'Yağ', shortcut: '7', category: 'liquid' },
  { key: 'LAVA', mat: MAT.LAVA, label: 'Lav', shortcut: '8', category: 'liquid' },
  { key: 'PLANT', mat: MAT.PLANT, label: 'Bitki', shortcut: '9', category: 'solid' },
  { key: 'GLASS', mat: MAT.GLASS, label: 'Cam', shortcut: 'g', category: 'solid' },
  { key: 'SNOW', mat: MAT.SNOW, label: 'Kar', shortcut: 'k', category: 'powder' },
  { key: 'MOLTEN_METAL', mat: MAT.MOLTEN_METAL, label: 'Erimiş metal', shortcut: 'e', category: 'liquid' },
  { key: 'ICE', mat: MAT.ICE, label: 'Buz', shortcut: 'b', category: 'solid' },
  { key: 'METAL', mat: MAT.METAL, label: 'Metal', shortcut: 'm', category: 'solid' },
  { key: 'CLONER', mat: MAT.CLONER, label: 'Çoğaltıcı', shortcut: 'x', category: 'solid' },
  { key: 'SINK', mat: MAT.SINK, label: 'Yutucu', shortcut: 'y', category: 'solid' },
  { key: 'ERASER', mat: MAT.EMPTY, label: 'Silgi', shortcut: '0', category: 'tool' },
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
  [MAT.MAGMA]: 'Magma kaynağı',
  [MAT.WALL]: 'Kenar',
};

export function materialLabel(mat) {
  if (mat in EXTRA_LABELS) return EXTRA_LABELS[mat];
  return PICKER.find((p) => p.mat === mat)?.label ?? String(mat);
}
