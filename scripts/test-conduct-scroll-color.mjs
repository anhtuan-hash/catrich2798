import assert from 'node:assert/strict';
import fs from 'node:fs';

const component = fs.readFileSync(new URL('../src/components/HomeroomConductTab.jsx', import.meta.url), 'utf8');
const css = fs.readFileSync(new URL('../src/components/HomeroomConductScrollColor.css', import.meta.url), 'utf8');

assert.match(component, /import '\.\/HomeroomConductScrollColor\.css'/);
assert.equal((component.match(/<ConductTableGuide \/>/g) || []).length, 2);
assert.equal((component.match(/hr-conduct-scroll-region/g) || []).length, 2);
assert.equal((component.match(/className=\{`hr-conduct-data-row \$\{scoreTone\(row\.classification\)\}`\}/g) || []).length, 2);
assert.match(component, /role="region" aria-label="Bảng điểm rèn luyện theo tuần" tabIndex=\{0\}/);
assert.match(component, /role="region" aria-label="Bảng tổng hợp rèn luyện định kỳ" tabIndex=\{0\}/);

assert.match(css, /overflow-y:\s*scroll\s*!important/);
assert.match(css, /max-height:\s*clamp\(430px,\s*68vh,\s*720px\)/);
assert.match(css, /scrollbar-gutter:\s*stable both-edges/);
assert.match(css, /::-webkit-scrollbar-thumb/);
assert.match(css, /position:\s*sticky/);
assert.match(css, /\.hr-conduct-data-row\.good/);
assert.match(css, /\.hr-conduct-data-row\.fair/);
assert.match(css, /\.hr-conduct-data-row\.pass/);
assert.match(css, /\.hr-conduct-data-row\.fail/);
assert.match(css, /#188038/);
assert.match(css, /#1a73e8/);
assert.match(css, /#f9ab00/);
assert.match(css, /#d93025/);

console.log('✓ Hai bảng rèn luyện dài có thanh cuộn, header cố định và màu Google theo kết quả.');
