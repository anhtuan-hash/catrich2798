const STYLE_ID = 'bes-global-wave-loader-exact-visual';

const EXACT_WAVE_CSS = `
/* Approved Wave Loader visual — mirrors the user's original demo. */
#bes-global-wave-loader {
  background: transparent !important;
  transition: none !important;
}

#bes-global-wave-loader .bes-wave-loader__surface {
  display: flex !important;
  justify-content: center !important;
  align-items: center !important;
  min-width: 0 !important;
  min-height: 0 !important;
  padding: 0 !important;
  border: 0 !important;
  border-radius: 0 !important;
  background: transparent !important;
  box-shadow: none !important;
  -webkit-backdrop-filter: none !important;
  backdrop-filter: none !important;
  overflow: visible !important;
}

#bes-global-wave-loader .bes-wave-loader__center {
  display: flex !important;
  justify-content: center !important;
  align-items: center !important;
  margin: 5px !important;
  overflow: visible !important;
}

#bes-global-wave-loader .bes-wave-loader__wave {
  width: 1.8rem !important;
  min-width: 1.8rem !important;
  height: 150px !important;
  min-height: 150px !important;
  background-color: #ff6b6b !important;
  margin: 0 4px !important;
  border: 0 !important;
  border-radius: .4rem !important;
  box-shadow: none !important;
  animation: bes-unified-wave 1.5s linear infinite !important;
  transform-origin: center !important;
  will-change: transform, filter !important;
}

@keyframes bes-unified-wave {
  0% {
    transform: scale(0);
    filter: hue-rotate(90deg) blur(100px);
  }
  25% {
    transform: scale(0);
    filter: hue-rotate(120deg) blur(50px);
  }
  50% {
    transform: scale(1);
    filter: hue-rotate(180deg) blur(25px);
  }
  75% {
    transform: scale(0);
    filter: hue-rotate(360deg) blur(2px);
  }
  100% {
    transform: scale(0);
    filter: hue-rotate(0deg) blur(0);
  }
}

#bes-global-wave-loader .bes-wave-loader__wave:nth-child(2) { animation-delay: .1s !important; }
#bes-global-wave-loader .bes-wave-loader__wave:nth-child(3) { animation-delay: .2s !important; }
#bes-global-wave-loader .bes-wave-loader__wave:nth-child(4) { animation-delay: .3s !important; }
#bes-global-wave-loader .bes-wave-loader__wave:nth-child(5) { animation-delay: .4s !important; }
#bes-global-wave-loader .bes-wave-loader__wave:nth-child(6) { animation-delay: .5s !important; }
#bes-global-wave-loader .bes-wave-loader__wave:nth-child(7) { animation-delay: .6s !important; }
#bes-global-wave-loader .bes-wave-loader__wave:nth-child(8) { animation-delay: .7s !important; }
#bes-global-wave-loader .bes-wave-loader__wave:nth-child(9) { animation-delay: .8s !important; }
#bes-global-wave-loader .bes-wave-loader__wave:nth-child(10) { animation-delay: .9s !important; }

@media (max-width: 420px) {
  #bes-global-wave-loader .bes-wave-loader__center {
    transform: scale(.82) !important;
    transform-origin: center !important;
  }
}

@media (prefers-reduced-motion: reduce) {
  #bes-global-wave-loader .bes-wave-loader__wave {
    animation: none !important;
    transform: scale(.55) !important;
    filter: none !important;
  }
}
`;

export function installGlobalWaveLoaderExactVisual() {
  if (typeof document === 'undefined') return () => {};

  let style = document.getElementById(STYLE_ID);
  if (!style) {
    style = document.createElement('style');
    style.id = STYLE_ID;
    style.dataset.besWaveLoaderExactVisual = 'true';
    style.textContent = EXACT_WAVE_CSS;
    document.head.appendChild(style);
  } else {
    style.textContent = EXACT_WAVE_CSS;
    document.head.appendChild(style);
  }

  return () => {
    document.getElementById(STYLE_ID)?.remove();
  };
}

export default installGlobalWaveLoaderExactVisual;
