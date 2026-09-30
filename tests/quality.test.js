import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createQualityGovernor, LEVELS } from '../js/app/quality.js';

// Sabit aralıklarla (16 ms) verilen iş süreleriyle yöneticiyi sürer; son seviyeyi döner.
function drive(gov, workMs, durationMs, start = 0) {
  let level = gov.level;
  for (let t = start; t < start + durationMs; t += 16) level = gov.update(t, workMs);
  return level;
}

test('seviyeler yüksekten düşüğe sıralıdır', () => {
  assert.deepEqual([...LEVELS], ['high', 'medium', 'low']);
});

test('otomatik modda düşük yükte yüksek kalitede kalır', () => {
  const gov = createQualityGovernor('auto');
  assert.equal(drive(gov, 3, 10000), 'high');
});

test('sürekli yüksek yükte bir kademe düşer; tek bir ani sıçrama düşürmez', () => {
  const gov = createQualityGovernor('auto');
  drive(gov, 3, 1000);
  assert.equal(gov.update(1000, 40), 'high', 'tek kare sıçraması yok sayılmalı');
  assert.equal(drive(gov, 18, 2600, 1016), 'medium');
});

test('düşüşten sonra hemen tekrar düşmez (histerezis), yük sürerse en düşüğe iner', () => {
  const gov = createQualityGovernor('auto');
  drive(gov, 18, 2600);
  assert.equal(gov.level, 'medium');
  assert.equal(drive(gov, 18, 500, 2600), 'medium', 'bekleme süresi dolmadan ikinci düşüş olmamalı');
  assert.equal(drive(gov, 18, 3000, 3100), 'low');
});

test('yük azalınca daha uzun bir bekleme sonrası kaliteyi geri yükseltir', () => {
  const gov = createQualityGovernor('auto');
  drive(gov, 18, 2600);
  assert.equal(gov.level, 'medium');
  assert.equal(drive(gov, 3, 2000, 2600), 'medium', 'yükseltme düşüşten daha temkinli olmalı');
  assert.equal(drive(gov, 3, 5000, 4600), 'high');
});

test('elle seçilen seviye yük ne olursa olsun değişmez', () => {
  for (const fixed of LEVELS) {
    const gov = createQualityGovernor(fixed);
    assert.equal(drive(gov, 40, 8000), fixed);
    assert.equal(drive(gov, 1, 8000, 8000), fixed);
  }
});

test('mod değiştirilebilir; otomatiğe dönünce yüksekten başlar', () => {
  const gov = createQualityGovernor('low');
  gov.setMode('auto');
  assert.equal(gov.level, 'high');
  gov.setMode('medium');
  assert.equal(gov.level, 'medium');
  assert.equal(gov.mode, 'medium');
});
