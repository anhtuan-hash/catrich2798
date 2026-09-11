import './styles/SupplementalSingleModal.css';

const INSTALL_KEY = '__besSupplementalSingleModalBridgeInstalled';
const ADMIN_ID = 'bes-supplemental-learning-admin';
const ROLLCALL_ID = 'bes-supplemental-rollcall';
const REPORT_ID = 'bes-supplemental-reporting-panel';
const ACTIVE_CLASS = 'bes-supplemental-workspace-active';
const HOST_CLASS = 'bes-supplemental-workspace-host';

function attendanceShell() {
  return document.querySelector('.attendance-shell');
}

function attendanceContent() {
  return document.querySelector('.attendance-shell .attendance-content');
}

function moveIntoAttendanceContent(node) {
  const content = attendanceContent();
  if (!node || !content) return false;
  if (node.parentElement !== content) content.append(node);
  node.classList.add(HOST_CLASS);
  content.classList.add(ACTIVE_CLASS);
  return true;
}

function stripNestedModalSemantics(node) {
  if (!node) return;
  node.removeAttribute('role');
  node.removeAttribute('aria-modal');
}

function normalizeAdmin() {
  const host = document.getElementById(ADMIN_ID);
  if (!host || !moveIntoAttendanceContent(host)) return;
  host.querySelectorAll('.bes-supplemental-backdrop').forEach((node) => node.remove());
  const panel = host.querySelector('.bes-supplemental-dialog');
  if (panel) {
    panel.classList.add('bes-supplemental-admin-workspace');
    stripNestedModalSemantics(panel);
  }
  attendanceShell()?.classList.add('bes-supplemental-admin-open');
}

function normalizeRollcall() {
  const host = document.getElementById(ROLLCALL_ID);
  if (!host || !moveIntoAttendanceContent(host)) return;
  host.querySelectorAll('.bes-supplemental-backdrop').forEach((node) => node.remove());
  const panel = host.querySelector('.bes-supplemental-rollcall');
  if (panel) {
    panel.classList.add('bes-supplemental-rollcall-workspace');
    stripNestedModalSemantics(panel);
  }
}

function normalizeReporting() {
  const panel = document.getElementById(REPORT_ID);
  if (!panel || !panel.classList.contains('is-exclusive')) return;
  if (!moveIntoAttendanceContent(panel)) return;
  panel.classList.add('bes-supplemental-reporting-workspace');
  stripNestedModalSemantics(panel);
  document.body.classList.remove('bes-supplemental-report-exclusive');
}

function updateWorkspaceState() {
  const content = attendanceContent();
  const shell = attendanceShell();
  const admin = document.getElementById(ADMIN_ID);
  const rollcall = document.getElementById(ROLLCALL_ID);
  const report = document.getElementById(REPORT_ID);
  const reportActive = Boolean(report?.classList.contains('is-exclusive'));
  const active = Boolean(admin || rollcall || reportActive);

  content?.classList.toggle(ACTIVE_CLASS, active);
  shell?.classList.toggle('bes-supplemental-admin-open', Boolean(admin));
  document.querySelector('.bes-supplemental-nav-tab')?.classList.toggle('is-active', Boolean(admin));

  if (!reportActive) report?.classList.remove('bes-supplemental-reporting-workspace', HOST_CLASS);
  if (!active) document.body.classList.remove('bes-supplemental-report-exclusive');
}

function normalize() {
  normalizeAdmin();
  normalizeRollcall();
  normalizeReporting();
  updateWorkspaceState();
}

function closeSupplementalWorkspaceForNativeTab(event) {
  const button = event.target?.closest?.('.attendance-tabs button');
  if (!button || button.classList.contains('bes-supplemental-nav-tab')) return;

  const admin = document.getElementById(ADMIN_ID);
  const rollcall = document.getElementById(ROLLCALL_ID);
  if (admin) admin.querySelector('[data-action="close"]')?.click();
  if (rollcall) rollcall.querySelector('[data-rollcall-close]')?.click();
}

function install() {
  if (window[INSTALL_KEY]) return;
  window[INSTALL_KEY] = true;
  document.addEventListener('click', closeSupplementalWorkspaceForNativeTab, true);
  const observer = new MutationObserver(normalize);
  observer.observe(document.documentElement, { childList: true, subtree: true, attributes: true, attributeFilter: ['class', 'role', 'aria-modal'] });
  normalize();
}

if (typeof window !== 'undefined' && typeof document !== 'undefined') install();

export { attendanceContent, moveIntoAttendanceContent as mountSupplementalWorkspace, normalize as normalizeSupplementalWorkspace };