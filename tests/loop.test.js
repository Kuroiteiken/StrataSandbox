// app/loop.js tarayıcı API'lerine (rAF, document) bağlı; burada küçük sahte
// uygulamalarla sürülür. Her test dosyası ayrı süreçte çalıştığı için global
// stub'lar başka testlere sızmaz.
import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

let frames;
let listeners;
let nextId;
let cancelled;

beforeEach(() => {
  frames = new Map();
  listeners = {};
  nextId = 1;
  cancelled = [];
  globalThis.requestAnimationFrame = (cb) => {
    const id = nextId++;
    frames.set(id, cb);
    return id;
  };
  globalThis.cancelAnimationFrame = (id) => {
    cancelled.push(id);
    frames.delete(id);
  };
  globalThis.document = {
    visibilityState: 'visible',
    addEventListener: (type, fn) => {
      listeners[type] = fn;
    },
  };
});

// Bekleyen tek karenin callback'ini verilen zamanla çalıştırır.
function runFrame(now) {
  assert.equal(frames.size, 1, 'tam olarak bir kare planlanmış olmalı');
  const [[id, cb]] = frames;
  frames.delete(id);
  cb(now);
}

const { createLoop } = await import('../js/app/loop.js');

test('ilk kare dt = 0, sonraki kareler gerçek geçen süreyi iletir', () => {
  const dts = [];
  const loop = createLoop({ onFrame: (dt) => dts.push(dt) });
  loop.start();
  runFrame(1000);
  runFrame(1016);
  assert.deepEqual(dts, [0, 16]);
});

test('onFrame hata fırlatsa bile döngü sonraki kareyi planlamaya devam eder', () => {
  let calls = 0;
  const loop = createLoop({
    onFrame: () => {
      calls++;
      if (calls === 1) throw new Error('beklenmeyen hata');
    },
  });
  loop.start();
  assert.throws(() => runFrame(0), /beklenmeyen/);
  runFrame(16); // döngü ölmüş olsaydı planlanmış kare olmazdı
  assert.equal(calls, 2);
  assert.equal(loop.running, true);
});

test('sekme gizlenince durur, görünür olunca onResume çağrılıp yeniden başlar', () => {
  let resumed = 0;
  const dts = [];
  const loop = createLoop({ onFrame: (dt) => dts.push(dt), onResume: () => resumed++ });
  loop.start();
  runFrame(0);
  document.visibilityState = 'hidden';
  listeners.visibilitychange();
  assert.equal(loop.running, false);
  assert.equal(frames.size, 0);
  document.visibilityState = 'visible';
  listeners.visibilitychange();
  assert.equal(resumed, 1);
  runFrame(60000); // uzun gizlilikten sonra devasa delta yok
  assert.deepEqual(dts, [0, 0]);
});

test('onFrame içinde stop() çağrılırsa döngü yeniden planlanmaz', () => {
  const loop = createLoop({ onFrame: () => loop.stop() });
  loop.start();
  runFrame(0);
  assert.equal(frames.size, 0);
  assert.equal(loop.running, false);
});
