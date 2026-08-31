(() => {
  const OVERLAY_ID = 'bes-global-cube-transition';
  let activePromise = null;

  function buildOverlay() {
    document.getElementById(OVERLAY_ID)?.remove();

    const overlay = document.createElement('div');
    overlay.id = OVERLAY_ID;
    overlay.setAttribute('role', 'status');
    overlay.setAttribute('aria-live', 'polite');
    overlay.setAttribute('aria-label', 'Đang mở trang');

    const loader = document.createElement('div');
    loader.className = 'bes3d-loader';

    for (let index = 0; index < 8; index += 1) {
      const box = document.createElement('div');
      box.className = `bes3d-box bes3d-box${index}`;
      box.appendChild(document.createElement('div'));
      loader.appendChild(box);
    }

    const ground = document.createElement('div');
    ground.className = 'bes3d-ground';
    ground.appendChild(document.createElement('div'));
    loader.appendChild(ground);

    overlay.appendChild(loader);
    document.body.appendChild(overlay);
    document.documentElement.classList.add('bes-global-cube-active');
    return overlay;
  }

  function play(options = {}) {
    if (activePromise) return activePromise;

    const visibleMs = Math.max(900, Number(options.visibleMs || 1280));
    const fadeMs = Math.max(80, Number(options.fadeMs || 120));
    const overlay = buildOverlay();

    activePromise = new Promise((resolve) => {
      window.setTimeout(() => {
        overlay.classList.add('is-leaving');
        window.setTimeout(() => {
          overlay.remove();
          document.documentElement.classList.remove('bes-global-cube-active');
          activePromise = null;
          resolve();
        }, fadeMs);
      }, visibleMs);
    });

    return activePromise;
  }

  function cancel() {
    document.getElementById(OVERLAY_ID)?.remove();
    document.documentElement.classList.remove('bes-global-cube-active');
    activePromise = null;
  }

  window.BESCubeTransition = Object.freeze({
    play,
    cancel,
    isRunning: () => Boolean(activePromise),
  });
})();
