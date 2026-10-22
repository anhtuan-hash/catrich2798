import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const read=(path)=>readFileSync(path,'utf8');
const bridge=read('src/supplementalSingleModalBridge.js');
const admin=read('src/supplementalLearningBootstrap.js');
const layout=read('src/styles/SupplementalWorkspaceUnified.css');
const modal=read('src/styles/SupplementalSingleModal.css');
const attendance=read('src/components/GlobalAttendanceNavigationTab.jsx');
assert.match(modal, /:not\(\.bes-supplemental-workspace-host\):not\(\.awu-feature-deck\)/, 'Six feature cards must remain visible while supplemental workspace is open.');
assert.match(bridge, /\.attendance-tabs button, \.awu-feature-tile/, 'Clicking regular feature cards must close supplemental workspace.');
assert.match(bridge, /button\.classList\.contains\('is-supplemental'\)/, 'Supplemental card must not close its own workspace.');
assert.match(layout, /\.awu-feature-tile\.is-supplemental/, 'Supplemental feature card must reflect active state.');
assert.match(layout, /max-width:740px/, 'Mobile layouts must keep horizontal scrolling cards.');
assert.match(layout, /bes-supplemental-class-toolbar/, 'Supplemental toolbar must share the same control density.');
assert.match(admin, /message \?/, 'Empty feedback banner must not be rendered.');
assert.match(admin, /function restoreSupplementalRoute/, 'Supplemental direct link should re-open the workspace.');
assert.match(admin, /#\/attendance\?tab=supplemental/, 'Supplemental workspace should use its own URL.');
for(const cmd of ['upsertSupplementalClass','upsertSupplementalClassMember','deleteSupplementalClass','setSupplementalClassMemberStatus','importMembersFromFile']) {
  assert.ok(admin.includes(cmd),'Supplemental class and roster behavior preserved: '+cmd);
}
assert.match(attendance, /<AttendanceFeatureDeck/, 'Navigation feature deck must remain mounted.');
console.log('PASS: supplemental workspace matches attendance layout without changing class/rollcall APIs.');
