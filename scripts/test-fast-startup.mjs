import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const source = await readFile(new URL('../src/applicationBootstrap.jsx', import.meta.url), 'utf8');
const startup = source.indexOf('async function startApplication()');

assert.ok(startup >= 0, 'Thiếu hàm khởi động ứng dụng.');

const mainImport = source.indexOf("import('./main.jsx')", startup);
const fontRefresh = source.indexOf('refreshSiteFontInBackground(cachedFont)', startup);
const assignedSync = source.indexOf('startAssignedClassSync()', startup);
const recovery = source.indexOf('startClass126Recovery()', startup);

assert.ok(mainImport >= 0, 'Thiếu entry React chính.');
assert.ok(fontRefresh > mainImport, 'Đồng bộ font phải bắt đầu sau khi đã khởi tạo tải React shell.');
assert.ok(assignedSync > mainImport, 'Đồng bộ lớp phải chạy sau khi React shell đã tải xong.');
assert.ok(recovery > mainImport, 'Khôi phục dữ liệu phải chạy sau khi React shell đã tải xong.');
assert.ok(!source.includes('await loadSiteFontSetting(null)'), 'Không được chặn khởi động để chờ cài đặt font từ mạng.');
assert.ok(!source.includes('await assignedSchoolClassModule.prepareAssignedSchoolClasses()'), 'Không được chặn khởi động để chờ Supabase.');
assert.ok(!source.includes('class126RecoveryResult = await class126RecoveryModule.recoverClass126Data()'), 'Không được chặn khởi động để chờ khôi phục lớp 12.6.');
assert.match(source, /requestIdleCallback/, 'Tác vụ không thiết yếu phải được trì hoãn bằng idle callback.');
assert.match(source, /isBrianTeamRoute\(\).*schoolRegistryLoaded/s, 'Danh mục lớp chỉ tải khi vào Brian Team.');
assert.match(source, /isHomeroomRoute\(\).*homeroomExtrasLoaded/s, 'Tiện ích rèn luyện chỉ tải khi vào app GVCN.');

console.log('fast-startup: ok');
