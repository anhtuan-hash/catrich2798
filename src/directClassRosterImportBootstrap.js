// Legacy 27-class Excel importer bootstrap.
//
// The school roster has already moved into the normal registry/assignment flow.
// This module remains as a compatibility stub because applicationBootstrap still
// imports it, but it must never open a modal automatically on admin/TTCM login.

const ROOT_ID = 'bes-direct-class-import-root';
const STYLE_ID = `${ROOT_ID}-style`;

function removeLegacyImporterUi() {
  if (typeof document === 'undefined') return;
  document.getElementById(ROOT_ID)?.remove();
  document.getElementById(STYLE_ID)?.remove();
}

export function installDirectClassRosterImport() {
  // Intentionally disabled. Do not register DOM-ready/auth listeners and do not
  // inspect the current user's registry merely to offer the one-time importer.
  // If an old HMR/session left the legacy overlay mounted, clean it up safely.
  removeLegacyImporterUi();
}

installDirectClassRosterImport();
