import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const read=path=>fs.readFileSync(new URL('../'+path,import.meta.url),'utf8');
const page=read('src/pages/LessonCheckStudio.jsx');
const style=read('src/pages/LessonCheckApprovedMockupOne.css');
const save=page.slice(page.indexOf('  async function saveActivity() {'),page.indexOf('  async function duplicateActivity('));
const batch=page.slice(page.indexOf('  async function saveBatchActivities() {'),page.indexOf('  function showSaveError('));

test('single save reports missing focus and embedded HTML validation locally',()=>{
 assert.match(save,/draft\.focusArea === 'unclassified'/);
 assert.match(save,/showSaveError\([^;]*'focus'\)/);
 assert.match(save,/if \(!previewReady\)/);
 assert.match(page,/className=\{`lcs-save-feedback is-\$\{builderFeedback\.kind\}`\}/);
 assert.match(page,/role=\{builderFeedback\.kind==='error'\?'alert':'status'\}/);
 assert.match(page,/ref=\{saveFocusRef\} aria-invalid=\{builderFeedback\?\.field==='focus'\}/);
 assert.match(page,/\.scrollIntoView\(\{ block: 'center', behavior: 'smooth' \}\)/);
 assert.match(style,/\.lcs-save-feedback/);
 assert.match(style,/\[aria-invalid="true"\]/);
});

test('single save never remains locked after network exception, and no duplicate insert on partial save',()=>{
 assert.match(save,/saveInFlightRef\.current = true/);
 assert.match(save,/finally \{\s*saveInFlightRef\.current = false;\s*setSaving\(false\)/);
 assert.match(save,/catch \(exception\)/);
 assert.match(save,/if \(result\.id && !draft\.id\) setSingleDraft\(current=>\(\{\.\.\.current,id:result\.id\}\)\)/);
 assert.match(save,/setShowBuilder\(false\)/);
 assert.doesNotMatch(save,/await loadActivities\(\{ silent: true \}\)/);
 assert.doesNotMatch(save,/window\.setTimeout\(.*saveActivity/);
});

test('batch mode (Lưu 1 hoạt động) keeps validation visible and guards repeated clicks',()=>{
 assert.match(batch,/saveInFlightRef\.current/);
 assert.match(batch,/item\.focusArea === 'unclassified'/);
 assert.match(batch,/setBuilderFeedback\(\{kind:'error',field:/);
 assert.match(batch,/setActiveBatchIndex\(index\)/);
 assert.match(batch,/saveInFlightRef\.current = true/);
 assert.match(batch,/saveInFlightRef\.current = false/);
 assert.match(batch,/setBatchDrafts\(remaining\)/);
 assert.match(batch,/if \(result\.id\) remaining\[index\] = \{ \.\.\.item, id: result\.id \}/);
 assert.match(batch,/resetActivityBuilder\(\)/);
 assert.match(page,/onClick=\{saveActivity\} disabled=\{saving \|\| thumbnailBusy\}/);
 assert.match(page,/aria-busy=\{saving\}/);
});

test('only Lesson Check scoped styles and validation are touched',()=>{
 assert.doesNotMatch(style,/^body\s*\{/m);
 assert.doesNotMatch(save,/localStorage|deleteLessonCheckActivity|window\.location\.reload/);
});
