import fs from 'node:fs';
import assert from 'node:assert/strict';

const ttcm = fs.readFileSync(new URL('../src/components/GlobalTtcmNavigationTab.jsx', import.meta.url), 'utf8');
const notifications = fs.readFileSync(new URL('../src/components/GlobalWorkHubNotificationBridge.jsx', import.meta.url), 'utf8');

assert.match(ttcm, /function userIsAssignee\(item, userId\)/, 'TTCM feed must use a shared assignee check for the current user');
assert.match(ttcm, /const departmentRecipients = useMemo\(/, 'Recipient list must include a dedicated departmentRecipients collection');
assert.match(ttcm, /currentProfile[\s\S]*departmentTeachers/, 'Department recipients must include the current TTCM profile as well as teachers');
assert.ok(!ttcm.includes("if (!person?.id || person.id === currentUser?.id) return false;"), 'TTCM must no longer be excluded from recipient eligibility');

const forcedSelfRecipientMatches = ttcm.match(/const recipients = uniqueIds\(\[\.\.\.selectedRecipients,\s*currentUser\?\.id\]\);/g) || [];
assert.ok(forcedSelfRecipientMatches.length >= 2, 'Both create and edit flows must force the TTCM account into assignee_ids');

assert.match(ttcm, /function toggleRecipient\(id\)[\s\S]*String\(id\) === String\(currentUser\?\.id\)[\s\S]*return/, 'TTCM self-recipient must not be removable in the composer');
assert.match(ttcm, /const unseenCount = useMemo\(\(\) => items\.filter\(\(item\) => userIsAssignee\(item, currentUser\?\.id\) && !readIds\.has\(String\(item\.id\)\)\)\.length/, 'Unread badge must count self-assigned TTCM content');
assert.match(ttcm, /responseItem && userIsAssignee\(responseItem, currentUser\?\.id\)/, 'A self-assigned TTCM action must open the same response flow used by teachers');
assert.match(ttcm, /selectedItem && userIsAssignee\(selectedItem, currentUser\?\.id\) && isActionItem\(selectedItem\)/, 'TTCM detail actions must be enabled when the leader is an assignee');

assert.match(notifications, /function isTtcmSelfAssignment\(item, userId\)/, 'Global notifications need a narrow TTCM self-assignment exception');
assert.match(notifications, /owner_id[\s\S]*!isTtcmSelfAssignment\(item, userId\)/, 'Self-owned tasks must remain hidden except for TTCM self-assignments');

console.log('TTCM self-recipient contract OK');
