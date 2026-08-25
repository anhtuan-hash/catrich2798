/* BURS typography scaling is retired.
   Keep a compatibility API for older callers without writing typography,
   density, scale or layout tokens back onto the document. */

const RETIRED_DATASETS = [
  'burs',
  'fontScaleRequested',
  'fontScale',
  'typographyMode',
];

const RETIRED_VARS = [
  '--bes-ds-scale',
  '--bes-font-scale',
  '--brian-font-body',
  '--brian-font-body-lg',
  '--brian-font-support',
  '--brian-font-label',
  '--brian-font-caption',
  '--brian-font-control',
  '--brian-font-card-title',
  '--brian-font-section-title',
  '--brian-font-kpi',
];

function cleanupLegacyBursState() {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  RETIRED_DATASETS.forEach((key) => { delete root.dataset[key]; });
  RETIRED_VARS.forEach((name) => root.style.removeProperty(name));
  try { window.localStorage.removeItem('bes-font-scale'); } catch { /* optional */ }
}

export function installBursReadability() {
  if (typeof window === 'undefined') return;
  cleanupLegacyBursState();
  window.__BURS_READABILITY_INSTALLED__ = true;
  window.BURS = Object.freeze({
    mode: 'retired',
    cardTypography: false,
    scales: [100],
    applyScale: () => ({ requested: 100, effective: 100 }),
    rescan: () => {
      cleanupLegacyBursState();
      return { requested: 100, effective: 100 };
    },
  });
}
