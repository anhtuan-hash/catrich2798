import assert from 'node:assert/strict';
import fs from 'node:fs';

const syncSource = fs.readFileSync(new URL('../src/assignedSchoolClassBootstrap.js', import.meta.url), 'utf8');
const bootstrapSource = fs.readFileSync(new URL('../src/applicationBootstrap.jsx', import.meta.url), 'utf8');
const sqlSource = fs.readFileSync(new URL('../supabase/school-class-registry.sql', import.meta.url), 'utf8');

assert.match(syncSource, /get_my_assigned_school_classes/);
assert.match(syncSource, /reconcileWorkspaceRoster/);
assert.match(syncSource, /item\.students\.length\s*\?\s*reconcileWorkspaceRoster/);
assert.match(syncSource, /assignmentType === 'homeroom'/);
assert.match(syncSource, /HOMEROOM_CLASS_TYPE/);
assert.match(syncSource, /SUBJECT_CLASS_TYPE/);
assert.match(syncSource, /homeroomWorkspaceId/);
assert.match(syncSource, /preferHomeroom/);
assert.match(syncSource, /openDefaultHomeroom/);
assert.match(syncSource, /setCurrentHomeroomWorkspaceId\(user, homeroomWorkspaceId\)/);
assert.match(syncSource, /enteringHomeroomApp/);
assert.match(syncSource, /bes-school-class-assignment-synced/);

const prepareIndex = bootstrapSource.indexOf('prepareAssignedSchoolClasses');
const mainIndex = bootstrapSource.indexOf("import('./main.jsx')");
assert.ok(prepareIndex > 0 && mainIndex > prepareIndex, 'Assigned class bootstrap must be registered before the React shell import declaration.');

assert.match(sqlSource, /security definer/i);
assert.match(sqlSource, /p\.approved = true/);
assert.match(sqlSource, /is_homeroom_teacher/);
assert.match(sqlSource, /is_subject_teacher/);
assert.match(sqlSource, /grant execute on function public\.get_my_assigned_school_classes\(\) to authenticated/i);

console.log('assigned-school-class-bootstrap: ok');
