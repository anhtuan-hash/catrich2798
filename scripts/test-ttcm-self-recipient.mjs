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

// Phone presentation is layered around the canonical TTCM component so data,
// permissions and handlers remain single-source while the desktop reader stays intact.
const adapterUrl = new URL('../src/components/GlobalTtcmMobileAdapter.jsx', import.meta.url);
const mobileCssUrl = new URL('../src/components/GlobalTtcmMobile.css', import.meta.url);
assert.ok(fs.existsSync(adapterUrl), 'TTCM needs a phone presentation adapter around the canonical component');
assert.ok(fs.existsSync(mobileCssUrl), 'TTCM needs a dedicated final mobile stylesheet');
const adapter = fs.existsSync(adapterUrl) ? fs.readFileSync(adapterUrl, 'utf8') : '';
const mobileCss = fs.existsSync(mobileCssUrl) ? fs.readFileSync(mobileCssUrl, 'utf8') : '';
const flatNavigation = fs.readFileSync(new URL('../src/components/GlobalFlatNavigation.jsx', import.meta.url), 'utf8');

assert.match(flatNavigation, /GlobalTtcmMobileAdapter/, 'Global navigation must mount the TTCM mobile adapter instead of bypassing it');
assert.match(adapter, /GlobalTtcmNavigationTab/, 'Mobile adapter must reuse the canonical TTCM component rather than duplicate its business logic');
assert.match(adapter, /GlobalTtcmMobile\.css/, 'Mobile adapter must load the final phone-only stylesheet');
assert.match(adapter, /data-mobile-detail-open/, 'Mobile adapter must track explicit notification selection for the bottom sheet');
assert.match(adapter, /closest\('\.ttcm-reader-card'\)/, 'Tapping a notification card must open the phone detail sheet');
assert.match(adapter, /closest\('\.ttcm-reader-back'\)/, 'Back from detail must close the phone sheet without closing TTCM');
assert.match(adapter, /matchMedia\('\(max-width: 760px\)'\)/, 'DOM adaptation must only run on phone layout');

assert.match(mobileCss, /@media\s*\(max-width:\s*760px\)/, 'TTCM mobile redesign must be phone-scoped');
assert.match(mobileCss, /\.ttcm-reader-sidebar[\s\S]*display:\s*flex\s*!important[\s\S]*overflow-x:\s*auto/, 'Desktop mailbox rail must become horizontally scrollable filter chips on phones');
assert.match(mobileCss, /\.ttcm-reader-detail[\s\S]*display:\s*none\s*!important/, 'Phone detail must stay hidden until the user chooses a notification');
assert.match(mobileCss, /\[data-mobile-detail-open=['"]true['"]\][\s\S]*\.ttcm-reader-detail[\s\S]*position:\s*fixed\s*!important[\s\S]*bottom:\s*0/, 'Explicit TTCM selection must open as a bottom sheet on phones');
assert.match(mobileCss, /\.ttcm-reader-detail-footer[\s\S]*position:\s*sticky/, 'Mobile detail actions must remain reachable at the bottom of the sheet');
assert.match(mobileCss, /min-height:\s*44px/, 'Mobile TTCM controls must preserve a 44px minimum touch target');
assert.match(mobileCss, /overflow-x:\s*(?:auto|hidden|clip)/, 'Mobile TTCM must prevent destructive horizontal overflow');

console.log('TTCM self-recipient and mobile workspace contract OK');
