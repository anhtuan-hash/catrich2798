export const RELEASE_INFO = {
  version: '10.87.0',
  codename: 'Release, Security & Performance',
  releasedAt: '2026-07-12',
  schemaVersion: 1,
  requiresSql: true,
  requiresEnv: false,
  highlights: [
    'Feature Flags and safe rollback snapshots',
    'Release Guard and bundle budget audit',
    'Server-side AI gateway hardening',
    'Unified upload security validation',
    'Global audit log and in-app Update Center',
  ],
};

export function getRuntimeBuildInfo() {
  return {
    ...RELEASE_INFO,
    commit: import.meta.env.VITE_VERCEL_GIT_COMMIT_SHA || import.meta.env.VITE_GIT_COMMIT || 'local',
    environment: import.meta.env.MODE || 'production',
  };
}
