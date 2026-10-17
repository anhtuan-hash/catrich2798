process.env.TZ = 'Asia/Saigon'; // kiểm tra theo giờ Việt Nam, đặt trước khi dùng Date
import assert from 'node:assert/strict';
import { buildZaloUrl, fillMessageTemplate, localDateIso, localDateTimeInput, normalizeVnPhone, selectDueMessages } from '../src/utils/zaloLink.js';

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

// Ngày theo giờ địa phương: 06:00 sáng 17/10 ở Việt Nam = 23:00 UTC ngày 16/10
const earlyMorning = new Date('2026-10-16T23:00:00Z');
assert.equal(earlyMorning.toISOString().slice(0, 10), '2026-10-16'); // đây là cái bẫy của todayIso()
assert.equal(localDateIso(earlyMorning), '2026-10-17');
assert.equal(localDateTimeInput(earlyMorning), '2026-10-17T06:00');
// Tin hẹn 07:30 hôm nay phải hiện trong "Cần gửi hôm nay" lúc 06:00 sáng
assert.deepEqual(selectDueMessages([{ id: 'x', status: 'scheduled', sendAt: '2026-10-17T07:30' }], localDateIso(earlyMorning)).map((item) => item.id), ['x']);

// Điền tin mẫu
const student = { fullName: 'Nguyễn Văn An', parentName: 'Chị Lan' };
assert.equal(fillMessageTemplate('Chào {phụ huynh}, em {tên học sinh} nghỉ hôm nay.', student), 'Chào Chị Lan, em Nguyễn Văn An nghỉ hôm nay.');
assert.equal(fillMessageTemplate('{Phụ Huynh} - {TÊN HỌC SINH}', student), 'Chị Lan - Nguyễn Văn An');
assert.equal(fillMessageTemplate('Chào {phụ huynh}', { fullName: 'B' }), 'Chào Quý phụ huynh');
assert.equal(fillMessageTemplate('Không có biến', student), 'Không có biến');
assert.equal(fillMessageTemplate(undefined, student), '');

console.log('zaloLink: all checks passed');
