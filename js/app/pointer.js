// Pointer Events girişi (mouse, touch, stylus) → Simulation boyama API'si.
// - Pointer capture: sürükleme tuval dışına taşsa bile stroke devam eder (kenara sabitlenir).
// - Coalesced events: hızlı harekette ara örnekler de çizgiye katılır (boşluk yok).
// - Basılı tutma: sim.setHold ile tick başına akış; bırakınca/iptalde durur.
// - Sağ tık: geçici silgi. Shift: replace modu. Aynı anda tek pointer çizer.
import { MAT } from '../engine/materials.js';

const PRIMARY = 0;
const SECONDARY = 2;

export function attachPointer(canvas, { renderer, sim, getBrush, onCursor = () => {} }) {
  let active = null; // { id, last: {x, y}, brush }

  const toCell = (e, clamp) => renderer.clientToCell(e.clientX, e.clientY, { clamp });

  const finish = (e) => {
    if (!active || e.pointerId !== active.id) return;
    sim.releaseHold();
    sim.endStroke();
    try {
      if (canvas.hasPointerCapture?.(e.pointerId)) canvas.releasePointerCapture(e.pointerId);
    } catch {
      // capture zaten bırakılmış olabilir
    }
    active = null;
  };

  const handlers = {
    contextmenu(e) {
      e.preventDefault();
    },

    pointerdown(e) {
      if (active) return; // ikinci parmak / pointer yok sayılır
      if (e.pointerType === 'mouse' && e.button !== PRIMARY && e.button !== SECONDARY) return;
      const cell = toCell(e, false);
      if (!cell) return;
      e.preventDefault();
      const base = getBrush();
      const brush = {
        ...base,
        material: e.button === SECONDARY ? MAT.EMPTY : base.material,
        replace: Boolean(base.replace || e.shiftKey),
      };
      active = { id: e.pointerId, last: cell, brush };
      try {
        canvas.setPointerCapture?.(e.pointerId);
      } catch {
        // bazı tarayıcılar sentetik olaylarda capture'a izin vermez
      }
      sim.beginStroke();
      sim.paintAt(cell.x, cell.y, brush);
      sim.setHold(cell.x, cell.y, brush);
      onCursor(cell, e.pointerType);
    },

    pointermove(e) {
      if (!active || e.pointerId !== active.id) {
        onCursor(toCell(e, false), e.pointerType);
        return;
      }
      const samples = typeof e.getCoalescedEvents === 'function' ? e.getCoalescedEvents() : null;
      const events = samples && samples.length > 0 ? samples : [e];
      for (const sample of events) {
        const cell = toCell(sample, true);
        if (!cell || (cell.x === active.last.x && cell.y === active.last.y)) continue;
        sim.paintLine(active.last.x, active.last.y, cell.x, cell.y, active.brush);
        active.last = cell;
      }
      sim.setHold(active.last.x, active.last.y, active.brush);
      onCursor(active.last, e.pointerType);
    },

    pointerup: finish,
    pointercancel: finish,

    pointerleave(e) {
      if (!active) onCursor(null, e.pointerType);
    },
  };

  for (const [type, fn] of Object.entries(handlers)) canvas.addEventListener(type, fn);

  return {
    get drawing() {
      return active !== null;
    },
    detach() {
      for (const [type, fn] of Object.entries(handlers)) canvas.removeEventListener(type, fn);
      active = null;
    },
  };
}
