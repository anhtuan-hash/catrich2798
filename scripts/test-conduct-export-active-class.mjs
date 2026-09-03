import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolveHomeroomExportWorkspaceId } from '../src/utils/homeroomExportWorkspace.js';

const v2 = await readFile(new URL('../src/conductMidFinalReportsV2.js', import.meta.url), 'utf8');
const v5 = await readFile(new URL('../src/conductMidFinalReportsV5.js', import.meta.url), 'utf8');
const hero = await readFile(new URL('../src/components/homeroom/HomeroomGlassHero.jsx', import.meta.url), 'utf8');

assert.ok(
  v2.includes("document.querySelector('#hr-material-hero-title')?.textContent"),
  'The legacy conduct panel still reads the Homeroom class name through #hr-material-hero-title.',
);
assert.ok(
  hero.includes('<em id="hr-material-hero-title">{className}</em>'),
  'The current Homeroom hero must expose exactly the active class name through the conduct panel compatibility hook.',
);

assert.ok(
  v5.includes('resolveHomeroomExportWorkspaceId({')
    && v5.includes('renderedWorkspaceId: renderedWorkspaceId()')
    && v5.includes('assignedWorkspaceId: typeof window !== \'undefined\' ? window.__besAssignedHomeroomWorkspaceId : \'\'')
    && v5.includes('panelWorkspaceId: panel?.dataset?.workspaceId')
    && v5.includes('currentWorkspaceId: getCurrentHomeroomWorkspaceId(user)'),
  'Live conduct export must resolve the active Homeroom workspace through the shared source-of-truth resolver.',
);

assert.equal(
  resolveHomeroomExportWorkspaceId({
    renderedWorkspaceId: 'rendered-class',
    assignedWorkspaceId: 'assigned-class',
    panelWorkspaceId: 'stale-panel-class',
    currentWorkspaceId: 'stale-current-class',
  }),
  'rendered-class',
  'The class actually rendered in Homeroom must win over stale panel/current workspace ids.',
);
assert.equal(
  resolveHomeroomExportWorkspaceId({
    assignedWorkspaceId: 'assigned-class',
    panelWorkspaceId: 'stale-panel-class',
    currentWorkspaceId: 'stale-current-class',
  }),
  'assigned-class',
  'The assigned Homeroom workspace must be used when no rendered workspace id is available.',
);
assert.equal(
  resolveHomeroomExportWorkspaceId({
    panelWorkspaceId: 'panel-class',
    currentWorkspaceId: 'current-class',
  }),
  'panel-class',
  'The live panel workspace remains a fallback before the persisted current-workspace id.',
);

assert.ok(
  v5.includes('const originalPanelWorkspaceId = panel.dataset.workspaceId;')
    && v5.includes('panel.dataset.workspaceId = workspaceId;')
    && v5.includes('if (originalPanelWorkspaceId == null) delete panel.dataset.workspaceId;')
    && v5.includes('else panel.dataset.workspaceId = originalPanelWorkspaceId;'),
  'During replay, the exporter must temporarily pin the panel to the freshly loaded workspace and then restore the legacy panel id to avoid rebuild loops.',
);

console.log('PASS: conduct export is pinned to the active Homeroom class without rebuilding the legacy panel.');
