(() => {
  if (new URLSearchParams(location.search).get('embedded') === '1') document.body.classList.add('embedded');
  const status = document.getElementById('resultCount');
  const loadScript = (src) => new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = src;
    script.onload = resolve;
    script.onerror = reject;
    document.body.appendChild(script);
  });

  const loadFallbackCatalog = async () => {
    window.MOTION_LAB_FALLBACK_CHUNKS = [];
    for (let index = 1; index <= 4; index += 1) {
      await loadScript(`/motion-lab-fallback-${index}.js`);
    }
    const effects = window.MOTION_LAB_FALLBACK_CHUNKS.flat();
    if (effects.length !== 100) throw new Error(`Fallback catalog incomplete: ${effects.length}/100`);
    window.MOTION_LAB_EFFECTS = effects;
    return effects;
  };

  const loadCatalog = async () => {
    try {
      const effects = await Promise.resolve(window.MOTION_LAB_EFFECTS_READY);
      if (!Array.isArray(effects) || effects.length !== 100) throw new Error('Compressed catalog is incomplete.');
      return effects;
    } catch (error) {
      console.warn('Motion Lab compressed catalog unavailable; using universal fallback.', error);
      if (status) status.textContent = 'Đang nạp bộ tương thích 100 hiệu ứng…';
      return loadFallbackCatalog();
    }
  };

  loadCatalog()
    .then(() => loadScript('/motion-lab-runtime.js'))
    .then(() => loadScript('/motion-lab-apply.js'))
    .catch((error) => {
      console.error(error);
      if (status) status.textContent = 'Không thể nạp Motion Lab trên trình duyệt này';
    });
})();
