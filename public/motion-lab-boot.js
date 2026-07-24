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

  Promise.resolve(window.MOTION_LAB_EFFECTS_READY)
    .then(() => loadScript('/motion-lab-runtime.js'))
    .then(() => loadScript('/motion-lab-apply.js'))
    .catch((error) => {
      console.error(error);
      if (status) status.textContent = 'Không thể nạp Motion Lab trên trình duyệt này';
    });
})();
