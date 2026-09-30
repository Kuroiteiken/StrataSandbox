// Test yardımcıları: ASCII senaryolar, bağımsız sayım ve grid hash.
// Sayım ve hash engine koduna değil doğrudan sim.view dizilerine bakar.
import { Simulation } from '../js/engine/simulation.js';
import { MAT } from '../js/engine/materials.js';

export const CHAR_TO_MAT = {
  '.': MAT.EMPTY,
  S: MAT.SAND,
  '#': MAT.STONE,
  '~': MAT.WATER,
  o: MAT.OIL,
  L: MAT.LAVA,
  s: MAT.STEAM,
  f: MAT.FIRE,
  W: MAT.WOOD,
  G: MAT.GLASS,
  P: MAT.PLANT,
};
const MAT_TO_CHAR = Object.fromEntries(Object.entries(CHAR_TO_MAT).map(([c, m]) => [m, c]));

function parseRows(ascii) {
  const rows = ascii.split('\n').map((r) => r.trim()).filter((r) => r.length > 0);
  const width = rows[0].length;
  for (const row of rows) {
    if (row.length !== width) throw new Error(`ASCII satır genişlikleri eşit değil: "${row}"`);
  }
  return rows;
}

export function makeSim(ascii, { seed = 'test', debug = true } = {}) {
  const rows = parseRows(ascii);
  const sim = new Simulation({ width: rows[0].length, height: rows.length, seed, debug });
  rows.forEach((row, y) => {
    [...row].forEach((ch, x) => {
      const mat = CHAR_TO_MAT[ch];
      if (mat === undefined) throw new Error(`Bilinmeyen ASCII karakter: "${ch}"`);
      if (mat !== MAT.EMPTY) sim.setCell(x, y, mat);
    });
  });
  return sim;
}

export function cellType(sim, x, y) {
  const { type, width } = sim.view;
  return type[(y + 1) * (width + 2) + (x + 1)];
}

export function toAscii(sim) {
  const { width, height } = sim.view;
  const rows = [];
  for (let y = 0; y < height; y++) {
    let row = '';
    for (let x = 0; x < width; x++) row += MAT_TO_CHAR[cellType(sim, x, y)] ?? '?';
    rows.push(row);
  }
  return rows.join('\n');
}

export function ascii(strings) {
  return parseRows(strings).join('\n');
}

export function countMaterial(sim, mat) {
  const { width, height } = sim.view;
  let n = 0;
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) if (cellType(sim, x, y) === mat) n++;
  return n;
}

export function runTicks(sim, n) {
  for (let i = 0; i < n; i++) sim.step();
}

// FNV-1a: dünyanın tüm hücre durumunu (tip, ton, life, flags) özetler.
export function hashView(sim) {
  const { type, variant, life, flags } = sim.view;
  let h = 0x811c9dc5;
  const mix = (v) => {
    h ^= v & 0xff;
    h = Math.imul(h, 0x01000193);
  };
  for (let i = 0; i < type.length; i++) {
    mix(type[i]);
    mix(variant[i]);
    mix(life[i]);
    mix(life[i] >>> 8);
    mix(flags[i]);
  }
  return h >>> 0;
}
