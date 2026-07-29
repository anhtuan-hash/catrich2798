import fs from 'node:fs';

const BUILD_ID = '20260729-r2';

function read(path) {
  if (!fs.existsSync(path)) throw new Error(`Missing home cutover target: ${path}`);
  return fs.readFileSync(path, 'utf8');
}

function writeIfChanged(path, before, after) {
  if (before !== after) fs.writeFileSync(path, after);
}

function replaceRequired(source, from, to, label) {
  if (source.includes(to)) return source;
  if (!source.includes(from)) throw new Error(`Unable to apply home cutover patch: ${label}`);
  return source.replace(from, to);
}

// Force Vite to create a brand-new lazy chunk for the approved homepage.
{
  const path = 'src/main.jsx';
  const before = read(path);
  let after = before;
  after = replaceRequired(
    after,
    "const Home = lazy(() => import('./pages/Home.jsx'));",
    `const Home = lazy(() => import('./pages/Home.jsx?home-build=${BUILD_ID}'));`,
    'home lazy chunk cache bust',
  );
  writeIfChanged(path, before, after);
}

// Load the final homepage shell reset after every legacy home stylesheet.
{
  const path = 'src/components/GlobalFlatNavigation.jsx';
  const before = read(path);
  let after = before;
  const importLine = "import './GlobalHomeScreenshotCutover.css';";
  if (!after.includes(importLine)) {
    const anchor = "import './GlobalWeeklyPracticeStudentProof.css';";
    if (!after.includes(anchor)) throw new Error('Unable to find final navigation stylesheet anchor.');
    after = after.replace(anchor, `${anchor}\n${importLine}`);
  }
  writeIfChanged(path, before, after);
}

// Add an unmistakable build marker and ensure the approved screenshot stylesheet is active.
{
  const path = 'src/pages/Home.jsx';
  const before = read(path);
  let after = before;
  after = after.replace("import './HomeHeroProposal2.css';", "import './HomeExactScreenshot.css';");
  const oldRoot = '<div className="eh5-home eh7-home" aria-label="English Hub homepage">';
  const newRoot = `<div id="english-hub-home-${BUILD_ID}" data-home-build="${BUILD_ID}" className="eh5-home eh7-home" aria-label="English Hub homepage">`;
  if (!after.includes('data-home-build=')) {
    if (!after.includes(oldRoot)) throw new Error('Unable to find approved homepage root marker.');
    after = after.replace(oldRoot, newRoot);
  }
  writeIfChanged(path, before, after);
}

// Bypass HTTP caching when checking the service worker.
{
  const path = 'src/utils/pwa.js';
  const before = read(path);
  let after = before;
  after = replaceRequired(
    after,
    "const registration = await navigator.serviceWorker.register('/sw.js', { scope: '/' });",
    `const registration = await navigator.serviceWorker.register('/sw.js?build=${BUILD_ID}', { scope: '/', updateViaCache: 'none' });`,
    'service worker cache bypass',
  );
  if (!after.includes('registration.update().catch')) {
    after = after.replace(
      '    state.offlineReady = true;\n',
      "    state.offlineReady = true;\n    registration.update().catch(() => {});\n",
    );
  }
  writeIfChanged(path, before, after);
}

// Give the worker a new cache namespace and make navigation fetch the current HTML.
{
  const path = 'public/sw.js';
  const before = read(path);
  let after = before;
  after = after.replace(/const VERSION = '[^']+';/, `const VERSION = '11.6.8-home-${BUILD_ID}';`);
  after = after.replace(
    '    const response = await fetch(request);',
    "    const response = await fetch(new Request(request, { cache: 'no-store' }));",
  );
  writeIfChanged(path, before, after);
}

// One-time migration: remove the old worker and BES caches, then reload once.
{
  const path = 'index.html';
  const before = read(path);
  let after = before;
  const marker = `bes-home-hard-cutover-${BUILD_ID}`;
  if (!after.includes(marker)) {
    const anchor = '    <script type="module" src="/src/main.jsx"></script>';
    if (!after.includes(anchor)) throw new Error('Unable to find main entry script in index.html.');
    const script = `    <script id="${marker}">\n      (() => {\n        const build = '${BUILD_ID}';\n        const key = 'bes-home-build-id';\n        try {\n          if (localStorage.getItem(key) === build) return;\n          localStorage.setItem(key, build);\n          const jobs = [];\n          if ('caches' in window) {\n            jobs.push(caches.keys().then((keys) => Promise.all(keys.filter((name) => name.startsWith('bes-')).map((name) => caches.delete(name)))));\n          }\n          if ('serviceWorker' in navigator) {\n            jobs.push(navigator.serviceWorker.getRegistrations().then((items) => Promise.all(items.map((item) => item.unregister()))));\n          }\n          Promise.allSettled(jobs).finally(() => window.location.reload());\n        } catch { /* cache migration is best effort */ }\n      })();\n    </script>\n`;
    after = after.replace(anchor, `${script}${anchor}`);
  }
  writeIfChanged(path, before, after);
}

console.log(`Homepage hard cutover applied: ${BUILD_ID}`);
