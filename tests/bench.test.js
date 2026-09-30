import { test } from 'node:test';
import assert from 'node:assert/strict';
import { runBenchmark } from '../tools/bench.js';

test('benchmark aracı sonuçları anlamlı alanlarla döner', () => {
  const r = runBenchmark({ width: 80, height: 60, warmup: 5, ticks: 20 });
  assert.equal(r.grid, '80×60');
  assert.equal(r.ticks, 20);
  assert.ok(r.particles > 0);
  for (const v of [r.medianMs, r.p95Ms, r.maxMs]) assert.ok(Number.isFinite(v) && v > 0, JSON.stringify(r));
});

test('benchmark deterministiktir: aynı ayarlarla aynı son dünya durumu', () => {
  const a = runBenchmark({ width: 80, height: 60, warmup: 0, ticks: 50 });
  const b = runBenchmark({ width: 80, height: 60, warmup: 0, ticks: 50 });
  assert.equal(a.stateHash, b.stateHash);
});
