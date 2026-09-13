import fs from 'node:fs';
import assert from 'node:assert/strict';

const launchCss = fs.readFileSync(new URL('../public/attendance-windows8-launch.css', import.meta.url), 'utf8');
const sourceCss = fs.readFileSync(new URL('../src/components/GlobalAttendanceNavigationTab.css', import.meta.url), 'utf8');
const componentSource = fs.readFileSync(new URL('../src/components/GlobalAttendanceNavigationTab.jsx', import.meta.url), 'utf8');
const historyCss = fs.readFileSync(new URL('../public/attendance-history-mockup-v4.css', import.meta.url), 'utf8');
const frameCss = fs.readFileSync(new URL('../public/attendance-card-size-sync-v1.css', import.meta.url), 'utf8');

// History and Học bổ sung are the approved large-footprint reference. The shared
// Attendance shell used by Lịch điểm danh / Quản lý lớp / Báo cáo must match History
// instead of falling back to the older compact 1360x840 frame.
assert.match(historyCss, /\.attendance-shell\.ah-history-mockup\s*\{[\s\S]*?width:\s*min\(1460px,\s*calc\(100vw\s*-\s*54px\)\)/, 'History keeps the approved 1460px desktop reference width');
assert.match(historyCss, /\.attendance-shell\.ah-history-mockup\s*\{[\s\S]*?height:\s*min\(910px,\s*calc\(100vh\s*-\s*54px\)\)/, 'History keeps the approved 910px desktop reference height');
assert.match(launchCss, /\.attendance-shell\.attendance-shell\s*\{[\s\S]*?width:\s*min\(1460px,\s*calc\(100vw\s*-\s*54px\)\)/, 'Shared Attendance modal should match History desktop width');
assert.match(launchCss, /\.attendance-shell\.attendance-shell\s*\{[\s\S]*?height:\s*min\(910px,\s*calc\(100vh\s*-\s*54px\)\)/, 'Shared Attendance modal should match History desktop height');
assert.doesNotMatch(launchCss, /\.attendance-shell\.attendance-shell\s*\{[\s\S]*?width:\s*min\(1360px,\s*calc\(100vw\s*-\s*96px\)\)/, 'Legacy compact desktop width must not shrink the three standard Attendance tabs');
assert.doesNotMatch(launchCss, /\.attendance-shell\.attendance-shell\s*\{[\s\S]*?height:\s*min\(840px,\s*calc\(100vh\s*-\s*92px\)\)/, 'Legacy compact desktop height must not shrink the three standard Attendance tabs');
assert.match(launchCss, /\.attendance-content\s*\{[\s\S]*?overflow-y:\s*auto/, 'Attendance content keeps its general modal scroll behavior');
assert.match(launchCss, /\.attendance-content\s*\{[\s\S]*?scrollbar-gutter:\s*stable/, 'Attendance content scrollbar should remain stable');

// Quản lý lớp remains bounded inside the larger modal. Its right pane owns one
// continuous scrollbar from the class header through the student rows.
assert.match(sourceCss, /\.attendance-manage-layout\s*\{[\s\S]*?display:\s*flex;[\s\S]*?overflow:\s*hidden;/, 'Manage view should consume the remaining modal height');
assert.match(sourceCss, /\.attendance-management-grid\s*\{[\s\S]*?flex:\s*1\s+1\s+0;[\s\S]*?overflow:\s*hidden;/, 'Management grid must stay bounded inside the modal');
assert.match(sourceCss, /\.attendance-member-manager\s*\{[^}]*overflow-y:\s*auto;/s, 'Member manager must own the single right-pane scrollbar');
assert.match(sourceCss, /\.attendance-member-table\s*\{[^}]*overflow:\s*visible;/s, 'Student rows must participate in the member-manager scroll flow');
assert.doesNotMatch(sourceCss, /\.attendance-member-table\s*\{[^}]*overflow:\s*auto;/s, 'Student table must not create a nested scrollbar');

// Mobile modal-frame contract. Every Attendance modal must be centered in the
// visual viewport and must never grow wider than the padded viewport on iPhone/iPad.
assert.match(frameCss, /@media\s*\(max-width:\s*900px\)/, 'Attendance must expose a final <=900px mobile frame override');
assert.match(frameCss, /html body \.attendance-layer\s*\{[^}]*box-sizing:\s*border-box\s*!important;[^}]*height:\s*100dvh\s*!important;/s, 'Mobile overlay uses border-box sizing and the dynamic iOS viewport');
assert.match(frameCss, /html body \.attendance-layer\s*\{[^}]*padding:\s*max\(10px,\s*env\(safe-area-inset-top\)\)\s+max\(10px,\s*env\(safe-area-inset-right\)\)\s+max\(10px,\s*env\(safe-area-inset-bottom\)\)\s+max\(10px,\s*env\(safe-area-inset-left\)\)\s*!important;/s, 'Mobile overlay respects all four safe-area insets');
assert.match(frameCss, /html body \.attendance-shell\.attendance-shell,[\s\S]*?html body \.attendance-shell\.ah-history-mockup\s*\{[^}]*width:\s*100%\s*!important;[^}]*min-width:\s*0\s*!important;[^}]*max-width:\s*680px\s*!important;[^}]*height:\s*100%\s*!important;[^}]*overflow-x:\s*hidden\s*!important;/s, 'Shared and History mobile shells use one centered, no-horizontal-overflow frame contract');
assert.match(frameCss, /html body \.attendance-shell \.attendance-content\s*\{[^}]*width:\s*100%\s*!important;[^}]*min-width:\s*0\s*!important;[^}]*max-width:\s*100%\s*!important;[^}]*overflow-x:\s*hidden\s*!important;/s, 'Mobile modal content cannot widen the shell');
assert.match(frameCss, /html body \.attendance-shell \.attendance-tabs\s*\{[^}]*max-width:\s*100%\s*!important;[^}]*overflow-x:\s*auto\s*!important;/s, 'Mobile tab strip scrolls internally instead of shifting the dialog');
assert.match(frameCss, /html body \.attendance-shell \.attendance-title\s*\{[^}]*min-width:\s*0\s*!important;[^}]*flex:\s*1\s+1\s+auto\s*!important;/s, 'Mobile title is allowed to shrink beside action buttons');
assert.match(frameCss, /html body \.bes-supplemental-dialog\s*\{[^}]*width:\s*min\(100%,\s*680px\)\s*!important;[^}]*overflow-x:\s*hidden\s*!important;/s, 'Supplemental-learning dialogs share the same mobile width contract');

// Mobile inner-layout regressions captured from real iPhone screenshots.
assert.match(frameCss, /html body \.attendance-shell \.attendance-daily-summary\s*\{[^}]*display:\s*grid\s*!important;[^}]*grid-template-columns:\s*repeat\(2,\s*minmax\(0,\s*1fr\)\)\s*!important;[^}]*overflow-x:\s*hidden\s*!important;/s, 'Daily summary must wrap into a 2x2 mobile grid instead of clipping the fourth metric');
assert.match(frameCss, /html body \.attendance-shell \.attendance-daily-summary-item\s*\{[^}]*min-width:\s*0\s*!important;[^}]*width:\s*auto\s*!important;[^}]*flex:\s*none\s*!important;/s, 'Daily summary items must not keep the legacy 125px flex basis on phones');
assert.match(frameCss, /html body \.attendance-shell \.attendance-manage-class-tile\s*\{[^}]*min-height:\s*148px\s*!important;[^}]*overflow:\s*hidden\s*!important;/s, 'Manage class cards must retain enough mobile height for their class metadata');
assert.match(frameCss, /html body \.attendance-shell \.attendance-manage-tile__title\s*\{[^}]*display:\s*-webkit-box\s*!important;[^}]*visibility:\s*visible\s*!important;[^}]*color:\s*#0f2238\s*!important;/s, 'Manage class names must stay visible on mobile');
assert.match(frameCss, /html body \.attendance-shell \.attendance-manage-tile__subtitle\s*\{[^}]*display:\s*block\s*!important;[^}]*visibility:\s*visible\s*!important;/s, 'Manage class subjects must stay visible on mobile');
assert.match(frameCss, /html body \.attendance-shell \.attendance-manage-tile__meta\s*\{[^}]*display:\s*grid\s*!important;[^}]*visibility:\s*visible\s*!important;/s, 'Manage class metadata must stay visible on mobile');

// History mobile UX approved in the mockup: the list remains the primary full-height
// screen and selecting a session opens a modal bottom sheet over that list. The old
// selected-session split layout must not return.
assert.match(componentSource, /ahv3__shell[^\n]*is-mobile-detail-open/s, 'History root must expose a selected-session mobile sheet state');
assert.match(componentSource, /className="ahv3__mobile-sheet-backdrop"/, 'History must render a backdrop behind the mobile detail sheet');
assert.match(componentSource, /className="ahv3__mobile-sheet-chrome"/, 'History detail must render mobile bottom-sheet chrome');
assert.match(componentSource, /className="ahv3__mobile-sheet-close"/, 'Mobile detail sheet must have an explicit close action');
assert.match(frameCss, /html body \.attendance-shell \.ahv3__shell\s*\{[^}]*position:\s*relative\s*!important;[^}]*height:\s*100%\s*!important;[^}]*display:\s*block\s*!important;/s, 'History list remains a full-height relative viewport on mobile');
assert.match(frameCss, /html body \.attendance-shell \.ahv3__list\s*\{[^}]*height:\s*100%\s*!important;[^}]*display:\s*flex\s*!important;[^}]*flex-direction:\s*column\s*!important;/s, 'History list must stay full-height even after a session is selected');
assert.match(frameCss, /html body \.attendance-shell \.ahv3__items\s*\{[^}]*flex:\s*1\s+1\s+auto\s*!important;[^}]*overflow-y:\s*auto\s*!important;/s, 'History cards own the remaining list height and scroll normally');
assert.match(frameCss, /html body \.attendance-shell \.ahv3__mobile-sheet-backdrop\s*\{[^}]*position:\s*absolute\s*!important;[^}]*inset:\s*0\s*!important;[^}]*z-index:\s*30\s*!important;/s, 'Selected History session must dim the list with an in-modal backdrop');
assert.match(frameCss, /html body \.attendance-shell \.ahv3__shell\.is-mobile-detail-open \.ahv3__detail\s*\{[^}]*position:\s*absolute\s*!important;[^}]*bottom:\s*0\s*!important;[^}]*max-height:\s*78%\s*!important;[^}]*overflow-y:\s*auto\s*!important;[^}]*z-index:\s*40\s*!important;/s, 'Selected History detail must open as a bounded bottom sheet');
assert.match(frameCss, /html body \.attendance-shell \.ahv3__mobile-sheet-chrome\s*\{[^}]*position:\s*sticky\s*!important;[^}]*top:\s*0\s*!important;/s, 'Bottom sheet close/drag chrome remains reachable while detail scrolls');
assert.doesNotMatch(frameCss, /grid-template-rows:\s*minmax\(92px,\s*24%\)\s+minmax\(0,\s*1fr\)/, 'The old selected-session 24/76 split must be removed');
assert.doesNotMatch(frameCss, /grid-template-rows:\s*minmax\(88px,\s*22%\)\s+minmax\(0,\s*1fr\)/, 'The old narrow-phone 22/78 split must be removed');
assert.doesNotMatch(frameCss, /grid-template-rows:\s*minmax\(240px,\s*42%\)\s+minmax\(0,\s*1fr\)/, 'The broken 42/58 History split must remain removed');
assert.doesNotMatch(frameCss, /grid-template-rows:\s*minmax\(230px,\s*40%\)\s+minmax\(0,\s*1fr\)/, 'The broken phone 40/60 History split must remain removed');

console.log('Attendance modal frame + mobile daily/manage/history bottom-sheet contracts OK');
