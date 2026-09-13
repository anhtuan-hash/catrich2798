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

// Mobile TTCM must be a true phone composition rather than the desktop three-pane
// reader compressed into a narrow viewport. Keep the same state/handlers, but
// expose phone-only navigation, filters and an explicit-selection detail sheet.
assert.match(ttcm, /import '\.\/GlobalTtcmMobile\.css';/, 'TTCM must load its final mobile-only stylesheet after the desktop reader layers');
assert.match(ttcm, /ttcm-mobile-back/, 'Mobile TTCM must expose a large back/close control in the app header');
assert.match(ttcm, /ttcm-mobile-filter-strip/, 'Mobile TTCM must render horizontal filter chips instead of relying on the desktop mailbox rail');
assert.match(ttcm, /ttcm-mobile-more/, 'Mobile TTCM must keep secondary actions and Personnel reachable from the compact header');
assert.match(ttcm, /ttcm-reader-detail[^"`]*\$\{selectedItemId\s*\?\s*'is-mobile-open'\s*:\s*''\}/, 'Mobile detail sheet must only open after an explicit notification selection');

const mobileCssUrl = new URL('../src/components/GlobalTtcmMobile.css', import.meta.url);
assert.ok(fs.existsSync(mobileCssUrl), 'TTCM needs a dedicated final mobile stylesheet');
const mobileCss = fs.existsSync(mobileCssUrl) ? fs.readFileSync(mobileCssUrl, 'utf8') : '';
assert.match(mobileCss, /@media\s*\(max-width:\s*760px\)/, 'TTCM mobile redesign must be phone-scoped');
assert.match(mobileCss, /\.ttcm-reader-sidebar[\s\S]*display:\s*none\s*!important/, 'Desktop mailbox sidebar must be removed from phone composition');
assert.match(mobileCss, /\.ttcm-mobile-filter-strip[\s\S]*display:\s*flex\s*!important/, 'Phone filter chips must be visible and horizontally scrollable');
assert.match(mobileCss, /\.ttcm-reader-detail\.is-mobile-open[\s\S]*position:\s*fixed\s*!important[\s\S]*bottom:\s*0/, 'Selected TTCM content must open as a bottom sheet on phones');
assert.match(mobileCss, /\.ttcm-reader-detail-footer[\s\S]*position:\s*sticky/, 'Mobile detail actions must remain reachable at the bottom of the sheet');
assert.match(mobileCss, /min-height:\s*44px/, 'Mobile TTCM controls must preserve a 44px minimum touch target');
assert.match(mobileCss, /overflow-x:\s*(?:auto|hidden|clip)/, 'Mobile TTCM must prevent destructive horizontal overflow');

console.log('TTCM self-recipient and mobile workspace contract OK');
