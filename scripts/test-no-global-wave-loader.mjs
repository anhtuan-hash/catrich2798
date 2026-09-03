import assert from 'node:assert/strict';
import fs from 'node:fs';

const cleanupFile = 'src/utils/legacyInternalLoadingCleanup.js';
const unifiedFile = 'src/utils/globalUnifiedWaveLoading.js';
const visualFile = 'src/utils/globalWaveLoaderExactVisual.js';

const cleanup = fs.readFileSync(cleanupFile, 'utf8');

assert.ok(
  !cleanup.includes('installGlobalUnifiedWaveLoading') && !cleanup.includes('globalUnifiedWaveLoading'),
  'Brian shell must not install or import the retired global Wave Loader.',
);
assert.ok(
  !cleanup.includes('installGlobalWaveLoaderExactVisual') && !cleanup.includes('globalWaveLoaderExactVisual'),
  'Brian shell must not install or import the retired 10-bar Wave Loader visual.',
);
assert.equal(
  fs.existsSync(unifiedFile),
  false,
  'Retired globalUnifiedWaveLoading.js must be deleted so fetch() cannot be globally wrapped again.',
);
assert.equal(
  fs.existsSync(visualFile),
  false,
  'Retired globalWaveLoaderExactVisual.js must be deleted so the 10 red bars cannot return.',
);

console.log('PASS: Global 10-bar Wave Loader is fully retired.');
