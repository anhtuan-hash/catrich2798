
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
const workspace = await readFile(new URL('../src/pages/HomeroomWorkspace.jsx', import.meta.url), 'utf8');
const data = await readFile(new URL('../src/data/homeroom.js', import.meta.url), 'utf8');
const component = await readFile(new URL('../src/components/homeroom/StudentRecordsTab.jsx', import.meta.url), 'utf8');
const scanner = await readFile(new URL('../src/utils/studentRecordScanner.js', import.meta.url), 'utf8');
const store = await readFile(new URL('../src/utils/homeroomStore.js', import.meta.url), 'utf8');
assert.match(data,/key: 'studentRecords'.*Hồ sơ học sinh/);
assert.match(workspace,/<StudentRecordsTab workspace=\{workspace\} onCommit=\{commit\} currentUser=\{currentUser\}/);
assert.match(store,/studentRecords:\s*\{\}/);
assert.match(component,/Quét hồ sơ thông minh/);
assert.match(component,/Quét màn hình/);
assert.match(component,/Đối chiếu 3 nguồn/);
assert.match(component,/Xuất biên bản/);
assert.match(component,/saveStudentRecordMedia/);
assert.match(component,/uploadStudentRecordCloudMedia/);
assert.match(component,/downloadStudentRecordCloudMedia/);
assert.match(component,/Đồng bộ ảnh/);
assert.match(component,/Nhập tay/);
assert.match(component,/Xóa sạch dữ liệu/);
assert.match(component,/Lưu thay đổi/);
assert.match(component,/saveSourceManual/);
assert.match(component,/clearSourceInfo/);
assert.match(component,/cleanupStudentRecordCloudOrphans/);
assert.match(component,/captures:\[\]/);
assert.match(component,/Đã xóa thông tin.*đồng bộ thay đổi/);
assert.match(component,/readOnly=\{!editing\}/);
assert.doesNotMatch(component,/onChange=\{\(e\)=>\{const source=selectedRecord\.sources\[section\];patchRecord/, 'vnEdu/MOET fields must not auto-save on every keystroke.');
assert.match(scanner,/TextDetector/);
assert.match(scanner,/Tesseract\.js|tesseract\.js/);
assert.match(scanner,/vie\+eng/);
assert.match(scanner,/parseStudentRecordTsv/);
assert.match(scanner,/tessedit_pageseg_mode/);
assert.match(scanner,/SPARSE_TEXT/);
assert.match(scanner,/Never infer a phone from an arbitrary number/);
const cloud = await readFile(new URL('../src/utils/studentRecordCloudStore.js', import.meta.url), 'utf8');
const vneduExcel = await readFile(new URL('../src/utils/vneduExcelImport.js', import.meta.url), 'utf8');
assert.match(cloud,/student-records-private/);
assert.match(cloud,/optimizeStudentRecordImage/);
assert.match(cloud,/cleanupStudentRecordCloudOrphans/);
assert.match(vneduExcel,/\.xls\|xlsx/);
assert.match(vneduExcel,/xlsx@0\.18\.5/);
assert.match(vneduExcel,/parseVneduMatrix/);
assert.match(vneduExcel,/matchVneduImportRows/);
assert.match(vneduExcel,/rawColumns/);
assert.match(vneduExcel,/unmappedColumns/);
assert.match(component,/Thông tin cá nhân/);
assert.match(component,/Thông tin cư trú/);
assert.match(component,/Thông tin học sinh trong hệ thống/);
assert.match(component,/Thông tin gia đình/);
assert.match(component,/Thông tin bổ sung/);
assert.match(component,/Các cột khác từ file Excel/);
assert.match(component,/Mã VEMIS/);
assert.match(component,/Số đăng bộ/);
assert.match(component,/Đơn vị công tác cha/);
assert.match(component,/Đơn vị công tác mẹ/);
assert.match(component,/Nhập Excel vnEdu/);
assert.match(component,/Xác nhận nhập thông tin cho/);
assert.match(component,/sr-excel-confirm-top/);
assert.match(component,/sr-excel-confirm-bottom/);
assert.match(component,/className="sr-outline sr-excel-global"/);
assert.doesNotMatch(component,/section==='vnedu'\?<button[^>]*is-excel/, 'Whole-class Excel import must not live inside a single-student vnEdu toolbar.');
assert.doesNotMatch(component,/rawText:scanResult/, 'Raw OCR text must not be persisted in workspace metadata.');
const scannerModule = await import(new URL('../src/utils/studentRecordScanner.js', import.meta.url));
const excelModule = await import(new URL('../src/utils/vneduExcelImport.js', import.meta.url));
const excelMatrix = [
  ['TRƯỜNG TRUNG - TIỂU HỌC PÉTRUS KÝ'],
  ['DANH SÁCH HỌC SINH'],
  ['Mã học sinh','Mã VEMIS','Mã MOET','Số đăng bộ','Họ và tên','Giới tính','Dân tộc','Ngày sinh','Chỗ ở hiện nay','Nơi thường trú','Quê quán','Nơi sinh','Nơi khai sinh','Căn cước','Tên cha','Đ.thoại cha','Tên mẹ','Đ.thoại mẹ','Điện thoại HS'],
  ['2004949387','','7456839782','7456839782','Nguyễn Hoàng Minh Khang','Nam','Kinh','15/07/2009','Chung cư Sora Garden','19/19 Nguyễn An Ninh','Bình Dương','Bệnh viện Từ Dũ','TP Hồ Chí Minh','074209010550','Nguyễn Hoàng Thanh','0913954019','Nguyễn Thị Mỹ Trang','0936885579',''],
];
const parsedExcel = excelModule.parseVneduMatrix(excelMatrix,'Danh sách học sinh');
assert.equal(parsedExcel.students.length,1);
assert.equal(parsedExcel.students[0].fields.fullName,'Nguyễn Hoàng Minh Khang');
assert.equal(parsedExcel.students[0].fields.citizenId,'074209010550');
assert.equal(excelModule.parseVneduMatrix([
  ['Họ và tên','Căn cước','Ngày sinh'],
  ['Nguyễn A','074209006607','01/01/2009'],
],'ds học sinh').students[0].fields.citizenId,'074209006607');
assert.equal(parsedExcel.students[0].identifiers.studentCode,'2004949387');
assert.equal(parsedExcel.students[0].rawColumns['Họ và tên'],'Nguyễn Hoàng Minh Khang');
assert.ok(Object.keys(parsedExcel.students[0].rawColumns).length >= 10);
const matchedExcel = excelModule.matchVneduImportRows(parsedExcel.students,[{id:'s1',fullName:'Nguyễn Hoàng Minh Khang',birthDate:'15/07/2009',active:true}]);
assert.equal(matchedExcel[0].studentId,'s1');
assert.equal(matchedExcel[0].matchStatus,'exact');
const sampleTsv = [
  'level\tpage_num\tblock_num\tpar_num\tline_num\tword_num\tleft\ttop\twidth\theight\tconf\ttext',
  '5\t1\t1\t1\t1\t1\t10\t10\t30\t12\t95\tHọ',
  '5\t1\t1\t1\t1\t2\t45\t10\t20\t12\t95\tvà',
  '5\t1\t1\t1\t1\t3\t70\t10\t25\t12\t95\ttên:',
  '5\t1\t1\t1\t1\t4\t110\t10\t55\t12\t95\tNguyễn',
  '5\t1\t1\t1\t1\t5\t170\t10\t50\t12\t95\tHoàng',
  '5\t1\t1\t1\t1\t6\t225\t10\t35\t12\t95\tMinh',
  '5\t1\t1\t1\t1\t7\t265\t10\t45\t12\t95\tKhang',
  '5\t1\t1\t1\t1\t8\t350\t10\t35\t12\t95\tNgày',
  '5\t1\t1\t1\t1\t9\t390\t10\t35\t12\t95\tsinh:',
  '5\t1\t1\t1\t1\t10\t440\t10\t75\t12\t95\t15/07/2009',
  '5\t1\t1\t1\t2\t1\t10\t40\t30\t12\t95\tSố',
  '5\t1\t1\t1\t2\t2\t45\t40\t55\t12\t95\tcăn',
  '5\t1\t1\t1\t2\t3\t105\t40\t55\t12\t95\tcước:',
  '5\t1\t1\t1\t2\t4\t170\t40\t95\t12\t95\t074209010550',
  '5\t1\t1\t1\t2\t5\t350\t40\t55\t12\t95\tĐ.thoại',
  '5\t1\t1\t1\t2\t6\t410\t40\t35\t12\t95\tSLL:',
  '5\t1\t1\t1\t2\t7\t455\t40\t85\t12\t95\t0936885579',
].join('\n');
const parsedLayout = scannerModule.parseStudentRecordTsv(sampleTsv, 'vnedu', { fullName: 'Nguyễn Hoàng Minh Khang' });
assert.equal(parsedLayout.fields.fullName, 'Nguyễn Hoàng Minh Khang');
assert.equal(parsedLayout.fields.birthDate, '15/07/2009');
assert.equal(parsedLayout.fields.citizenId, '074209010550');
assert.equal(parsedLayout.fields.phone, '0936885579');
const numericGuard = scannerModule.parseStudentRecordText('CCCD: 074209010550');
assert.equal(numericGuard.fields.phone, undefined);
console.log('PASS: homeroom student-records app integrated with layout-aware OCR.');

assert.match(component,/sr-vnedu-color-layout/);
assert.match(component,/tone="blue"/);
assert.match(component,/tone="green"/);
assert.match(component,/tone="violet"/);
assert.match(component,/tone="orange"/);
assert.match(component,/tone-father/);
assert.match(component,/tone-mother/);
assert.match(component,/tone-guardian/);
assert.match(component,/Thông tin mở rộng/);
assert.match(component,/sr-vnedu-extended/);

assert.match(component,/CompareDashboard/);
assert.match(component,/sr-compare-dashboard/);
assert.match(component,/Khớp hoàn toàn/);
assert.match(component,/Cần xác nhận/);
assert.match(component,/Sai lệch/);
assert.match(component,/Đã chốt hồ sơ gốc/);

assert.match(component,/sr-compare-dashboard-v2/);
assert.match(component,/Hiển thị tất cả/);
assert.match(component,/Tìm trường thông tin/);
assert.match(component,/compareGroupTone/);
assert.match(component,/Khớp hoàn toàn/);
assert.match(component,/Sai lệch/);

assert.match(component,/is-compare-scroll/);
