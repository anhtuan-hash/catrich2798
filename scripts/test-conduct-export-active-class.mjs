import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const v2 = await readFile(new URL('../src/conductMidFinalReportsV2.js', import.meta.url), 'utf8');
const v5 = await readFile(new URL('../src/conductMidFinalReportsV5.js', import.meta.url), 'utf8');

assert.ok(
  v2.includes("document.querySelector('#hr-editorial-hero-title em')"),
  'Conduct report panel must identify the class from the current Homeroom editorial hero instead of the retired hero selector.',
);

const officialCurrentIndex = v5.indexOf('getCurrentHomeroomWorkspaceId(user)');
const panelWorkspaceIndex = v5.indexOf('panel?.dataset?.workspaceId');
assert.ok(
  officialCurrentIndex >= 0 && panelWorkspaceIndex >= 0 && officialCurrentIndex < panelWorkspaceIndex,
  'Live conduct export must prefer the official current Homeroom workspace id over the panel dataset, which can be stale.',
);

assert.ok(
  v5.includes('const previousPanelWorkspaceId = panel.dataset.workspaceId;')
    && v5.includes('panel.dataset.workspaceId = workspaceId;')
    && v5.includes('panel.dataset.workspaceId = previousPanelWorkspaceId || workspaceId;'),
  'During replay, the exporter must temporarily pin the panel to the freshly loaded workspace so V2 cannot fall back to another class.',
);

console.log('PASS: conduct export is pinned to the active Homeroom class.');
