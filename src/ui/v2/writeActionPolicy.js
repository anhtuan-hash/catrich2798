export const V2_FIRST_RELEASE_WRITE_POLICY = [
  { area: 'Homeroom', read: 'native-v2', write: 'delegate-v1', examples: 'Attendance, conduct, incidents, support plans' },
  { area: 'Classes & Students', read: 'native-v2', write: 'delegate-v1', examples: 'Roster changes, assignments, profile edits' },
  { area: 'Resource Library', read: 'native-v2', write: 'delegate-v1', examples: 'Upload, edit metadata, approve, delete' },
  { area: 'Work Hub', read: 'native-v2', write: 'delegate-v1', examples: 'Create task, assign, approve, archive' },
  { area: 'Assessment', read: 'native-v2', write: 'delegate-v1', examples: 'Create assessment, publish, scoring mutations' },
  { area: 'Collaboration', read: 'native-v2', write: 'delegate-v1', examples: 'Governance changes, sharing mutations' },
  { area: 'Admin & Cloud', read: 'native-v2-diagnostics', write: 'delegate-v1', examples: 'Roles, accounts, backup/restore, destructive actions' },
  { area: 'Tool runtime', read: 'v1-engine-in-v2-shell', write: 'v1-engine', examples: 'Tool-specific save/import/export stays inside existing engine' },
  { area: 'V2 preferences', read: 'native-v2', write: 'local-only', examples: 'Shadow opt-in, rollback latch, QA checklist' },
];

export function getWritePolicySummary() {
  const delegated = V2_FIRST_RELEASE_WRITE_POLICY.filter((item) => item.write === 'delegate-v1').length;
  const engineOwned = V2_FIRST_RELEASE_WRITE_POLICY.filter((item) => item.write === 'v1-engine').length;
  const localOnly = V2_FIRST_RELEASE_WRITE_POLICY.filter((item) => item.write === 'local-only').length;
  return { total: V2_FIRST_RELEASE_WRITE_POLICY.length, delegated, engineOwned, localOnly, nativeProductionMutations: 0 };
}
