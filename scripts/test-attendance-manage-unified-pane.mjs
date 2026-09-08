import fs from 'node:fs';
import assert from 'node:assert/strict';

const index = fs.readFileSync('index.html', 'utf8');
const parent = fs.readFileSync('src/components/GlobalAttendanceNavigationTab.jsx', 'utf8');
const editor = fs.readFileSync('src/components/attendance/AttendanceClassEditor.jsx', 'utf8');
const cssPath = 'public/attendance-manage-unified-pane.css';

assert.ok(fs.existsSync(cssPath), 'Unified manage-pane stylesheet must exist');
const css = fs.readFileSync(cssPath, 'utf8');

const scrollFixPos = index.indexOf('/attendance-manage-scrollbar-fix.css?v=1');
const unifiedPos = index.indexOf('/attendance-manage-unified-pane.css?v=1');
assert.ok(scrollFixPos >= 0, 'Existing manage scrollbar fix must remain loaded');
assert.ok(unifiedPos > scrollFixPos, 'Unified pane CSS must load after scrollbar fix');

assert.match(parent, /className="attendance-member-tools"[^>]*>[\s\S]*?Thêm học sinh[\s\S]*?Xóa lớp/,
  'Top actions must remain together');
assert.doesNotMatch(parent, /className="attendance-member-tools"[^>]*>[\s\S]*?<input[^>]+memberQuery/,
  'Student search must not remain in the top action row');
assert.match(parent, /memberQuery=\{memberQuery\}/, 'Parent must pass search state into the editor');
assert.match(parent, /onMemberQueryChange=\{setMemberQuery\}/, 'Parent must pass search setter into the editor');
assert.match(editor, /attendance-student-list-toolbar/, 'Editor must render an inline student-list toolbar');
assert.match(editor, /Danh sách học sinh/, 'Editor must label the student list section');

assert.match(css, /\.attendance-member-manager[\s\S]*background:\s*#fff\s*!important;/,
  'Right pane must be one white surface');
assert.match(css, /\.attendance-class-info-card[\s\S]*border:\s*0\s*!important;[\s\S]*border-radius:\s*0\s*!important;[\s\S]*background:\s*transparent\s*!important;/,
  'Class info must no longer be a detached card');
assert.match(css, /\.attendance-member-tools[\s\S]*background:\s*transparent\s*!important;/,
  'Top actions must sit directly on the unified surface');
assert.match(css, /\.attendance-student-list-toolbar[\s\S]*border-top:/,
  'Student section must be separated only by an inline divider');

console.log('PASS: class-management right pane is a single continuous surface.');
