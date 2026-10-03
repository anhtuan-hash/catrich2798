import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const workspace = await readFile(new URL('../src/pages/TextCareGoogleWorkspace.jsx', import.meta.url), 'utf8');

assert.ok(
  workspace.includes("observer.observe(statusSummary")
    && workspace.includes("observer.observe(autosave"),
  'TextCare hero snapshot observer must watch only the compact status sources.',
);

assert.ok(
  !workspace.includes("observer.observe(page, { childList: true, subtree: true"),
  'TextCare must not observe its whole page because the portal hero lives inside that subtree.',
);

assert.ok(
  workspace.includes("current.score === next.score")
    && workspace.includes("current.autosave === next.autosave"),
  'TextCare snapshot updates must be deduplicated before triggering a React render.',
);

assert.ok(
  workspace.includes("const scheduleSnapshot = () =>")
    && workspace.includes("window.requestAnimationFrame(updateSnapshot)"),
  'TextCare status mutations must be coalesced to one animation frame.',
);

assert.ok(
  workspace.includes("window.cancelAnimationFrame(snapshotFrame)"),
  'TextCare must cancel pending snapshot frames during reschedule and cleanup.',
);

console.log('PASS: TextCare hero status syncing is scoped, deduplicated and frame-coalesced, preventing portal mutation feedback jitter.');
