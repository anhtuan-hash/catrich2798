import assert from 'node:assert/strict';
import { buildZaloUrl, normalizeVnPhone, selectDueMessages } from '../src/utils/zaloLink.js';

// Chuẩn hóa số điện thoại
assert.equal(normalizeVnPhone('0912345678'), '84912345678');
assert.equal(normalizeVnPhone('0912 345 678'), '84912345678');
assert.equal(normalizeVnPhone('091.234.5678'), '84912345678');
assert.equal(normalizeVnPhone('+84912345678'), '84912345678');
assert.equal(normalizeVnPhone('84912345678'), '84912345678');
assert.equal(normalizeVnPhone('0084912345678'), '84912345678');
assert.equal(normalizeVnPhone('0334567890'), '84334567890');

// Số không hợp lệ
assert.equal(normalizeVnPhone(''), '');
assert.equal(normalizeVnPhone(null), '');
assert.equal(normalizeVnPhone(undefined), '');
assert.equal(normalizeVnPhone('12345'), '');
assert.equal(normalizeVnPhone('0212345678'), '');
assert.equal(normalizeVnPhone('abc'), '');

// Liên kết Zalo
assert.equal(buildZaloUrl('0912345678'), 'https://zalo.me/84912345678');
assert.equal(buildZaloUrl('không có'), '');

// Danh sách cần gửi hôm nay
const list = [
  { id: 'a', status: 'scheduled', sendAt: '2026-10-17T07:30' },
  { id: 'b', status: 'scheduled', sendAt: '2026-10-16T20:00' },
  { id: 'c', status: 'scheduled', sendAt: '2026-10-18T08:00' },
  { id: 'd', status: 'sent-manually', sendAt: '2026-10-17T06:00' },
  { id: 'e', status: 'scheduled', sendAt: '2026-10-17T23:59' },
];
assert.deepEqual(selectDueMessages(list, '2026-10-17').map((item) => item.id), ['b', 'a', 'e']);
assert.deepEqual(selectDueMessages(undefined, '2026-10-17'), []);

console.log('zaloLink: all checks passed');
