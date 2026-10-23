import assert from 'node:assert/strict';
import { dashboardHeroNameLines } from '../src/utils/dashboardHeroName.js';

const examples = [
  ['Tuấn Nguyễn Anh', ['Tuấn Nguyễn Anh']],
  ['Nguyễn Đăng Minh Hoa', ['Nguyễn Đăng', 'Minh Hoa']],
  ['Nguyễn Thị Minh Khánh', ['Nguyễn Thị', 'Minh Khánh']],
  ['Trần', ['Trần']],
  ['Tuấn Nguyễn Anh', ['Tuấn Nguyễn Anh']],
  ['  Nguyễn    Đăng   Minh Hoa  ', ['Nguyễn Đăng', 'Minh Hoa']],
  ['Phạm Văn Nguyễn Đức Minh', ['Phạm Văn Nguyễn', 'Đức Minh']],
];

for (const [name, lines] of examples) {
  const actual = dashboardHeroNameLines(name);
  assert.deepEqual(actual, lines, `Balanced name: ${name}`);
  assert.equal(actual.join(' '), name.trim().replace(/\s+/g, ' '),
    `Never change the signed-in user's actual displayed name: ${name}`);
  assert.ok(actual.length <= 2, 'No needless multiple forced line breaks');
  assert.ok(actual.every(Boolean), 'No empty display lines');
}
console.log('PASS: account-specific Dashboard Hero names split deterministically without truncation.');
