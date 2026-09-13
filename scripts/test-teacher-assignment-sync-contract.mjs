import fs from 'node:fs';

const files = {
  sql: fs.readFileSync(new URL('../supabase/brian-teacher-assignment-sync.sql', import.meta.url), 'utf8'),
  client: fs.readFileSync(new URL('../src/utils/teacherAssignments.js', import.meta.url), 'utf8'),
  portal: fs.readFileSync(new URL('../src/pages/BrianTeamPortal.jsx', import.meta.url), 'utf8'),
  workspace: fs.readFileSync(new URL('../src/pages/MonthlyReportsWorkspace.jsx', import.meta.url), 'utf8'),
  styles: fs.readFileSync(new URL('../src/pages/MonthlyReportsWorkspace.css', import.meta.url), 'utf8'),
};

const checks = [
  ['Materialized teacher sync table exists', files.sql.includes('create table if not exists public.department_teacher_sync')],
  ['Workspace trigger automatically refreshes synchronized assignments', files.sql.includes('create trigger bes_department_workspace_sync') && files.sql.includes('update of payload')],
  ['Existing assignments are backfilled', files.sql.includes('Backfill every assignment already stored') && files.sql.includes('from public.department_team_workspaces')],
  ['Teacher can read only synchronized rows for own account', files.sql.includes('teacher_id = auth.uid()') && files.sql.includes('enable row level security')],
  ['Classes and homeroom remain inside synchronized member payload', files.client.includes('teachingClasses') && files.client.includes('homeroomClass')],
  ['Professional tasks and document requirements sync to teacher', files.sql.includes("d -> 'assignments'") && files.sql.includes("d -> 'documentRequirements'")],
  ['Monthly reports use synchronized source of truth', files.sql.includes('create or replace function public.bes_monthly_report_context()') && files.sql.includes('from public.department_teacher_sync s')],
  ['Shared assignment client is available for other teacher modules', files.client.includes('loadMyTeacherAssignments') && files.client.includes('summarizeTeacherAssignments')],
  ['Brian Team mounts the active monthly report workspace', files.portal.includes('MonthlyReportsWorkspace') && files.portal.includes('<MonthlyReportsWorkspace')],
  ['Report workspace owns its consolidated stylesheet', files.workspace.includes("import './MonthlyReportsWorkspace.css';") && files.styles.includes('.mr-teacher-shell') && files.styles.includes('.mr-manager')],
  ['Synchronized report states remain visibly represented', ['.mr-notice', '.mr-revision', '.mr-lock'].every((selector) => files.styles.includes(selector))],
];

const failed = checks.filter(([, ok]) => !ok);
for (const [label, ok] of checks) console.log(`${ok ? '✓' : '✗'} ${label}`);
if (failed.length) process.exit(1);
console.log(`\n${checks.length}/${checks.length} teacher-assignment sync checks passed.`);
