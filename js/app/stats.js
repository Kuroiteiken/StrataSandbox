// Çalışma zamanı istatistikleri: FPS/TPS ölçümü, biçimleme ve throttle'lı DOM güncellemesi.
// DOM her karede değil, ~400 ms aralıkla ve yalnızca değer değiştiyse güncellenir.

export function formatCount(n) {
  const s = String(Math.max(0, Math.round(n)));
  return s.replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
}

export function formatStats(s) {
  return {
    particles: formatCount(s.particles),
    fps: String(Math.round(s.fps)),
    tps: String(Math.round(s.tps)),
    grid: `${s.width}×${s.height}`,
    speed: s.paused ? 'duraklatıldı' : `${s.speed}×`,
    seed: s.seed,
  };
}

// Kare zamanları ve tick sayacından kayan pencere FPS/TPS.
export function createRateMeter(capacity = 240) {
  const times = new Float64Array(capacity);
  const ticks = new Float64Array(capacity);
  let head = 0;
  let count = 0;
  return {
    sample(now, tick) {
      times[head] = now;
      ticks[head] = tick;
      head = (head + 1) % capacity;
      if (count < capacity) count++;
    },
    rates(windowMs = 1000) {
      if (count < 2) return { fps: 0, tps: 0 };
      const newest = (head - 1 + capacity) % capacity;
      let oldest = newest;
      let frames = 0;
      for (let k = 1; k < count; k++) {
        const idx = (newest - k + capacity) % capacity;
        if (times[newest] - times[idx] > windowMs) break;
        oldest = idx;
        frames = k;
      }
      const dt = times[newest] - times[oldest];
      if (dt <= 0) return { fps: 0, tps: 0 };
      return { fps: (frames * 1000) / dt, tps: ((ticks[newest] - ticks[oldest]) * 1000) / dt };
    },
  };
}

// [data-stat="ad"] elemanlarına değer yazar; yalnızca değişenleri günceller.
export function attachStats(root, getValues, { interval = 400 } = {}) {
  const nodes = new Map();
  for (const el of root.querySelectorAll('[data-stat]')) nodes.set(el.dataset.stat, el);
  const last = new Map();
  const update = () => {
    const values = getValues();
    for (const [name, el] of nodes) {
      const v = values[name];
      if (v === undefined || last.get(name) === v) continue;
      last.set(name, v);
      el.textContent = v;
    }
  };
  update();
  const id = setInterval(update, interval);
  return () => clearInterval(id);
}
