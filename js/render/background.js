// Procedural, cache'lenen arka plan: alacakaranlık gradyanı, soluk yıldızlar ve
// uzakta katmanlı sırt siluetleri (strata). Yalnızca resize/seed değişince yeniden çizilir.
import { Rng } from '../engine/rng.js';

const smoothstep = (u) => u * u * (3 - 2 * u);

// Seed'li, pürüzsüz sırt profili: n örnek, [0, 1] aralığında. İki oktav value noise.
export function ridgeProfile(n, seed, layer) {
  const rng = new Rng(String(seed), `ridge-${layer}`);
  const octaves = [
    { knots: 5 + layer * 3, amp: 0.8 },
    { knots: 18 + layer * 6, amp: 0.2 },
  ];
  const out = new Float32Array(n);
  for (const { knots, amp } of octaves) {
    const pts = Array.from({ length: knots + 1 }, () => rng.next());
    for (let i = 0; i < n; i++) {
      const pos = n === 1 ? 0 : (i / (n - 1)) * knots;
      const k = Math.min(knots - 1, Math.floor(pos));
      const u = smoothstep(pos - k);
      out[i] += amp * (pts[k] + (pts[k + 1] - pts[k]) * u);
    }
  }
  for (let i = 0; i < n; i++) out[i] = Math.max(0, Math.min(1, out[i]));
  return out;
}

const LAYERS = [
  { base: 0.72, amp: 0.3, color: '#211a1d' },
  { base: 0.84, amp: 0.26, color: '#271d1a' },
  { base: 0.95, amp: 0.2, color: '#2e221c' },
];

export function paintBackground(ctx, width, height, seed) {
  const sky = ctx.createLinearGradient(0, 0, 0, height);
  sky.addColorStop(0, '#15131c');
  sky.addColorStop(0.55, '#1d1719');
  sky.addColorStop(1, '#261b15');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, width, height);

  // Soluk yıldızlar (üst bölge).
  const stars = new Rng(String(seed), 'stars');
  const count = Math.floor((width * height) / 5000);
  for (let s = 0; s < count; s++) {
    const x = stars.next() * width;
    const y = stars.next() * height * 0.6;
    const a = 0.12 + stars.next() * 0.35;
    ctx.fillStyle = `rgba(239, 230, 212, ${a.toFixed(3)})`;
    ctx.fillRect(Math.floor(x), Math.floor(y), 1, 1);
  }

  // Katmanlı sırtlar; her katmanın üstünde ince, biraz açık bir strata çizgisi.
  const samples = Math.max(2, Math.ceil(width / 2));
  LAYERS.forEach((layer, index) => {
    const profile = ridgeProfile(samples, seed, index);
    const yAt = (k) => height * (layer.base - layer.amp * profile[k]);
    ctx.beginPath();
    ctx.moveTo(0, height);
    for (let k = 0; k < samples; k++) ctx.lineTo((k / (samples - 1)) * width, yAt(k));
    ctx.lineTo(width, height);
    ctx.closePath();
    ctx.fillStyle = layer.color;
    ctx.fill();

    ctx.beginPath();
    for (let k = 0; k < samples; k++) {
      const x = (k / (samples - 1)) * width;
      if (k === 0) ctx.moveTo(x, yAt(k) + 3);
      else ctx.lineTo(x, yAt(k) + 3);
    }
    ctx.strokeStyle = 'rgba(211, 166, 82, 0.05)';
    ctx.lineWidth = 1;
    ctx.stroke();
  });
}
