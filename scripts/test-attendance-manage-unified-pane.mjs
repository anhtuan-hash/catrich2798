import fs from 'node:fs';
import assert from 'node:assert/strict';

const index = fs.readFileSync('index.html', 'utf8');
const cssPath = 'public/attendance-manage-scrollbar-fix.css';
const css = fs.readFileSync(cssPath, 'utf8');

assert.match(index, /attendance-manage-scrollbar-fix\.css\?v=1/,
  'Manage-only stylesheet must remain loaded');

assert.match(css, /\.attendance-manage-layout \.attendance-member-manager[\s\S]*background:\s*#fff\s*!important;/,
  'Right pane must be one white surface');
assert.match(css, /\.attendance-manage-layout \.attendance-class-info-card[\s\S]*border:\s*0\s*!important;[\s\S]*border-radius:\s*0\s*!important;[\s\S]*background:\s*transparent\s*!important;/,
  'Class information must no longer render as a detached card');
assert.match(css, /\.attendance-manage-layout \.attendance-member-tools[\s\S]*background:\s*transparent\s*!important;/,
  'Action/search toolbar must sit directly on the unified surface');
assert.match(css, /\.attendance-manage-layout \.attendance-member-table[\s\S]*border-top:/,
  'Student list must continue the same surface with only a divider');
assert.match(css, /\.attendance-manage-layout \.attendance-class-info-grid article[\s\S]*border:/,
  'Metadata cells may remain individually readable inside the continuous surface');

// The previous scrollbar regression must remain fixed while the visual treatment changes.
assert.match(css, /\.attendance-content:has\(\.attendance-manage-layout\)[\s\S]*overflow:\s*hidden\s*!important;/,
  'Manage tab must not regain an outer scrollbar');
assert.match(css, /\.attendance-manage-layout \.attendance-manage-classes[\s\S]*overflow-y:\s*auto\s*!important;/,
  'Left class list must remain internally scrollable');
assert.match(css, /\.attendance-manage-layout \.attendance-member-table[\s\S]*overflow-y:\s*auto\s*!important;/,
  'Right student list must remain internally scrollable');

console.log('PASS: class-management right pane is a single continuous surface without regressing scrolling.');
