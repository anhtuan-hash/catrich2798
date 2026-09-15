import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const homeroom = fs.readFileSync(new URL('../../src/components/homeroom/HomeroomCoreTabs.jsx', import.meta.url), 'utf8');
const gradebook = fs.readFileSync(new URL('../../src/components/gradebook/GradebookWorkspace.jsx', import.meta.url), 'utf8');
const api = fs.readFileSync(new URL('../../src/studentSupport/studentSupportApi.js', import.meta.url), 'utf8');
const migrationUrl = new URL('../../supabase/migrations/20260915093000_student_support_archive_governance.sql', import.meta.url);

test('Homeroom and Gradebook expose exact Student Support deep links', () => {
  assert.match(homeroom, /buildStudentSupportHash/);
  assert.match(homeroom, /Xem hồ sơ hỗ trợ/);
  assert.match(gradebook, /buildStudentSupportHash/);
  assert.match(gradebook, /Xem hồ sơ hỗ trợ/);
});

test('archive path uses governance RPC and has no ordinary hard delete', () => {
  assert.match(api, /bes_archive_student_support_case/);
  assert.doesNotMatch(api, /export\s+async\s+function\s+(?:delete|hardDelete|permanentDelete)SupportCase/i);
  assert.equal(fs.existsSync(migrationUrl), true);
  if (fs.existsSync(migrationUrl)) {
    const migration = fs.readFileSync(migrationUrl, 'utf8');
    assert.match(migration, /entity_type\s*=\s*'student_support_case'|student_support_case/);
    assert.match(migration, /CASE_ARCHIVED/);
    assert.match(migration, /CASE_RESTORED/);
    assert.match(migration, /status\s*=\s*'purged'|status\s*=\s*''purged''/);
  }
});
