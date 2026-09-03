import {
  activeHomeroomRosterSignature,
  resolveRenderedHomeroomWorkspace,
} from './utils/homeroomExportWorkspace.js';

const PANEL_ID = 'bes-conduct-mid-final-reports';
const STYLE_ID = 'bes-conduct-report-rendered-roster-guard-style';
const WORKSPACE_PREFIX = 'bes-homeroom-workspace-v1:';

function text(value, fallback = '') {
  const normalized = String(value ?? '').trim();
  return normalized || fallback;
}

function parseWorkspace(raw) {
  try {
    const value = JSON.parse(raw || 'null');
    return value && typeof value === 'object' ? value : null;
  } catch {
    return null;
  }
}

function renderedWorkspaceId() {
  return text(document.querySelector('.hr-editorial-hero[data-workspace-id]')?.dataset?.workspaceId);
}

function workspaceCandidates() {
  const items = [];
  const seen = new Set();
  try {
    for (let index = 0; index < localStorage.length; index += 1) {
      const key = localStorage.key(index);
      if (!key?.startsWith(WORKSPACE_PREFIX)) continue;
      const workspace = parseWorkspace(localStorage.getItem(key));
      if (!workspace) continue;
      const signature = `${text(workspace.id)}:${text(workspace.classProfile?.adviserEmail)}:${text(workspace.updatedAt)}`;
      if (seen.has(signature)) continue;
      seen.add(signature);
      items.push(workspace);
    }
  } catch {
    return [];
  }
  return items;
}

function exactRenderedWorkspace(panel) {
  const renderedId = renderedWorkspaceId();
  const panelId = text(panel?.dataset?.workspaceId);
  const workspace = resolveRenderedHomeroomWorkspace(workspaceCandidates(), {
    renderedWorkspaceId: renderedId,
    panelWorkspaceId: panelId,
  });
  if (!workspace) return null;
  if (renderedId && text(workspace.id) !== renderedId) return null;
  return workspace;
}

function injectStyle() {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
#${PANEL_ID} [data-mf-student-field][hidden]{display:none!important}
#${PANEL_ID}[data-rendered-roster-guard="v12"] [data-mf-student-field][style*="display: none"]{display:none!important}
`;
  document.head.appendChild(style);
}

function syncScopeVisibility(panel) {
  const personal = panel?.querySelector('[data-mf-scope]')?.value === 'personal';
  const field = panel?.querySelector('[data-mf-student-field]');
  if (!field) return personal;
  field.hidden = !personal;
  if (personal) field.style.removeProperty('display');
  else field.style.setProperty('display', 'none', 'important');
  return personal;
}

function syncStudentOptions(panel, workspace) {
  const select = panel?.querySelector('[data-mf-student]');
  if (!select || !workspace) return;
  const students = (Array.isArray(workspace.students) ? workspace.students : [])
    .filter((student) => student?.active !== false)
    .sort((left, right) => text(left.fullName).localeCompare(text(right.fullName), 'vi'));
  const signature = activeHomeroomRosterSignature(workspace);
  const previous = text(select.value);

  if (panel.dataset.renderedRosterSignature !== signature) {
    select.replaceChildren(...students.map((student) => {
      const option = document.createElement('option');
      option.value = text(student.id);
      option.textContent = text(student.code)
        ? `${text(student.code)} · ${text(student.fullName)}`
        : text(student.fullName);
      return option;
    }));
    panel.dataset.renderedRosterSignature = signature;
  }

  const previousStillExists = previous && students.some((student) => text(student.id) === previous);
  if (previousStillExists) select.value = previous;
  else if (syncScopeVisibility(panel)) select.value = '';
  else select.value = text(students[0]?.id);
}

function syncPanel() {
  const panel = document.getElementById(PANEL_ID);
  if (!panel) return;
  injectStyle();
  syncScopeVisibility(panel);

  const workspace = exactRenderedWorkspace(panel);
  if (!workspace) return;

  panel.dataset.workspaceId = text(workspace.id, 'default');
  panel.dataset.renderedRosterGuard = 'v12';
  syncStudentOptions(panel, workspace);
}

let timer = 0;
function scheduleSync(delay = 0) {
  window.clearTimeout(timer);
  timer = window.setTimeout(syncPanel, Math.max(0, Number(delay) || 0));
}

function install() {
  injectStyle();

  const observer = new MutationObserver((records) => {
    const panelAppeared = records.some((record) => Array.from(record.addedNodes || []).some((node) => (
      node?.nodeType === 1
      && (node.id === PANEL_ID || node.querySelector?.(`#${PANEL_ID}`))
    )));
    if (panelAppeared) scheduleSync(0);
  });
  observer.observe(document.documentElement, { childList: true, subtree: true });

  document.addEventListener('change', (event) => {
    if (event.target?.closest?.(`#${PANEL_ID} [data-mf-scope]`)) scheduleSync(0);
  }, true);

  window.addEventListener('bes-homeroom-store-updated', () => scheduleSync(20));
  window.addEventListener('bes-school-class-assignment-synced', () => scheduleSync(40));
  window.addEventListener('bes-homeroom-command', () => scheduleSync(80));
  window.addEventListener('hashchange', () => scheduleSync(100));

  scheduleSync(0);
  window.setTimeout(() => scheduleSync(0), 250);
  window.setTimeout(() => scheduleSync(0), 900);
}

install();
if (typeof window !== 'undefined') {
  window.__besConductReportRenderedRosterGuardVersion = 'v12-v2-source-boundary';
}
