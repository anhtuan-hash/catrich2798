import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const globalMotion = await readFile(new URL('../src/utils/globalMotionSystem.js', import.meta.url), 'utf8');
const quickAccess = await readFile(new URL('../src/components/GlobalQuickAccessRail.jsx', import.meta.url), 'utf8');
const editorialRuntime = await readFile(new URL('../src/components/GlobalEditorialAuthorityRuntime.jsx', import.meta.url), 'utf8');
const textCare = await readFile(new URL('../src/pages/TextCareCompactStudio.jsx', import.meta.url), 'utf8');

assert.ok(
  globalMotion.includes("observer.observe(document.body, { childList: true, subtree: true });"),
  'Global Motion may watch new nodes, but it must not watch document-wide style/class attributes.',
);
assert.ok(
  !globalMotion.includes("attributes: true, attributeFilter: ['class', 'hidden', 'aria-hidden', 'aria-selected', 'style']"),
  'Global Motion must not wake on every app style/class mutation.',
);
assert.ok(
  globalMotion.includes("document.visibilityState === 'hidden'")
    && globalMotion.includes("shell?.dataset.performance === 'low'"),
  'Global Motion must skip decorative entrance work while hidden or in low-performance mode.',
);

assert.ok(
  quickAccess.includes("const badgeHost = document.querySelector('.brian-nav__primary')")
    && quickAccess.includes("observer?.observe(badgeHost, { childList: true, subtree: true, characterData: true })"),
  'Quick Access badge observation must stay scoped to the navigation subtree.',
);
assert.ok(
  !quickAccess.includes("observer.observe(document.body, { childList: true, subtree: true, characterData: true })"),
  'Quick Access must not observe all page text mutations.',
);

assert.ok(
  editorialRuntime.includes('const rootObserver = new MutationObserver(promote)')
    && editorialRuntime.includes("const navRoot = document.querySelector('.brian-nav__primary')")
    && editorialRuntime.includes("rootObserver.observe(navRoot, { childList: true, subtree: true })"),
  'Editorial navigation rebinding must be navigation-scoped and animation-frame coalesced.',
);
assert.ok(
  !editorialRuntime.includes("rootObserver.observe(root, { childList: true, subtree: true })"),
  'Editorial navigation must not observe the complete React application root.',
);
assert.ok(
  editorialRuntime.includes("set('opacity', '0')")
    && editorialRuntime.includes('if (animation) startRunner()')
    && !editorialRuntime.includes("bindings.set(config.key, { button, runner, release });\n      startRunner();"),
  'Decorative navigation runners must animate on interaction, not continuously while idle.',
);

assert.ok(
  textCare.includes('data-global-motion-isolate="true"'),
  'TextCare must opt out of generic descendant entrance scanning.',
);
assert.ok(
  textCare.includes('const [previewFrameHtml, setPreviewFrameHtml] = useState(previewHtml)')
    && textCare.includes('srcDoc={previewFrameHtml}'),
  'TextCare A4 iframe updates must be coalesced instead of rebuilding on every keystroke.',
);
assert.ok(
  textCare.includes("window.requestIdleCallback(saveDraft, { timeout: 500 })"),
  'TextCare autosave must defer synchronous localStorage serialization to idle time when available.',
);
assert.ok(
  textCare.includes('setFrameHeight((current) => current === height ? current : height)')
    && textCare.includes('setPageCount((current) => current === nextPageCount ? current : nextPageCount)'),
  'TextCare preview measurements must avoid redundant React renders.',
);

console.log('PASS: site-wide jank guards keep global observers scoped and TextCare preview/autosave work coalesced.');
