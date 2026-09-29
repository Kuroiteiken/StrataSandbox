// requestAnimationFrame döngüsü. Fizik zamanlaması Simulation.update içindedir;
// bu modül yalnızca kare süresini iletir ve sekme gizlenince döngüyü durdurur.

export function createLoop({ onFrame, onResume }) {
  let rafId = 0;
  let last = 0;
  let running = false;

  const frame = (now) => {
    const dt = last === 0 ? 0 : now - last;
    last = now;
    onFrame(dt, now);
    rafId = requestAnimationFrame(frame);
  };

  const start = () => {
    if (running) return;
    running = true;
    last = 0; // ilk kare dt = 0: uzun beklemeden sonra devasa delta yok
    rafId = requestAnimationFrame(frame);
  };

  const stop = () => {
    running = false;
    cancelAnimationFrame(rafId);
  };

  const onVisibility = () => {
    if (document.visibilityState === 'hidden') {
      stop();
    } else if (!running) {
      onResume?.();
      start();
    }
  };
  document.addEventListener('visibilitychange', onVisibility);

  return {
    start,
    stop,
    get running() {
      return running;
    },
  };
}
