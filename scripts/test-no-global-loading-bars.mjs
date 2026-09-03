import assert from 'node:assert/strict';
import { access, readFile } from 'node:fs/promises';
import { constants } from 'node:fs';

async function exists(url) {
  try {
    await access(url, constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

const root = new URL('../', import.meta.url);
const bootstrap = await readFile(new URL('src/applicationBootstrap.jsx', root), 'utf8');
const tabResume = await readFile(new URL('src/tabResumeStability.js', root), 'utf8');
const cleanup = await readFile(new URL('src/utils/legacyInternalLoadingCleanup.js', root), 'utf8');

assert.ok(
  bootstrap.includes("import './globalLoadingBarRetirement.js';"),
  'Application bootstrap must install the global loading-bar retirement guard before main renders.',
);
assert.ok(
  !tabResume.includes('globalWindowsPhoneLoadingIndicator'),
  'Tab resume stability must not boot the retired Windows Phone global loader.',
);
assert.ok(
  !cleanup.includes('installGlobalUnifiedWaveLoading') && !cleanup.includes('globalUnifiedWaveLoading'),
  'Legacy loading cleanup must not install the retired unified Wave Loader.',
);
assert.ok(
  !cleanup.includes('installGlobalWaveLoaderExactVisual') && !cleanup.includes('globalWaveLoaderExactVisual'),
  'Legacy loading cleanup must not install the retired 10-bar Wave Loader visual.',
);

for (const path of [
  'src/globalWindowsPhoneLoadingIndicator.js',
  'src/utils/globalUnifiedWaveLoading.js',
  'src/utils/globalWaveLoaderExactVisual.js',
]) {
  assert.equal(
    await exists(new URL(path, root)),
    false,
    `${path} is retired and must not ship in production.`,
  );
}

const retirement = await readFile(new URL('src/globalLoadingBarRetirement.js', root), 'utf8');
for (const token of [
  'bes-global-wave-loader',
  'bes-wp8-global-loader',
  'bes-wave-loader__wave',
  'bes-wp8-loader-dot',
]) {
  assert.ok(retirement.includes(token), `Retirement guard must suppress stale ${token} markup.`);
}
assert.ok(
  retirement.includes('MutationObserver'),
  'Retirement guard must remove stale loader markup that appears after lazy chunks mount.',
);

console.log('PASS: all global loading-bar runtimes are retired and stale loader markup is suppressed.');
