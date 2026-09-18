
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { parseMoetMatrix } from '../src/utils/moetExcelImport.js';

const matrix=[
  ['SỞ GIÁO DỤC VÀ ĐÀO TẠO THÀNH PHỐ HỒ CHÍ MINH'],
  ['DANH SÁCH HỌC SINH LỚP 12.6'],
  [],
  ['STT','Mã định danh Bộ GD&ĐT','Họ tên','Ngày sinh','Giới tính','Dân tộc','Trạng thái','SĐT liên hệ','Nơi sinh chi tiết','Tổ/thôn Hộ khẩu thường trú','Tỉnh thành quê quán','Phường Xã quê quán','Chỗ ở hiện nay','Số CMND','Ngày cấp','Nơi cấp','Tên cha','Nghề nghiệp cha','Năm sinh cha','Tên mẹ','Nghề nghiệp mẹ','Năm sinh mẹ','Lớp học','Khối học','Số định danh cá nhân'],
  [1,'7407137235','Trần Tuấn Anh','15/02/2009','Nam','Kinh','Đang học','0949858499','Sở y tế tỉnh Bình Dương','44 tổ 2 khu 1','Thành phố Hồ Chí Minh','Phường Chánh Phú Hòa','44 tổ 2 khu 1','074209009517','17/04/2023','Cục cảnh sát','Trần Văn Tấn','Tài xế','1972','Nguyễn Thị Thùy Trang','Nội trợ','1978','12.6','Khối 12','074209009517'],
];

const parsed=parseMoetMatrix(matrix,'Sheet1');
assert.equal(parsed.students.length,1);
assert.equal(parsed.students[0].fields.fullName,'Trần Tuấn Anh');
assert.equal(parsed.students[0].fields.birthDate,'15/02/2009');
assert.equal(parsed.students[0].fields.citizenId,'074209009517');
assert.equal(parsed.students[0].fields.phone,'0949858499');
assert.equal(parsed.students[0].identifiers.ministryId,'7407137235');
assert.equal(parsed.students[0].rawColumns['Trạng thái'],'Đang học');
assert.ok(parsed.students[0].mappedCount>=20);

const component=await readFile(new URL('../src/components/homeroom/StudentRecordsTab.jsx',import.meta.url),'utf8');
assert.match(component,/Nhập Excel MOET/);
assert.match(component,/importMoetExcel/);
assert.match(component,/MoetFullProfile/);
assert.match(component,/Chính sách & hỗ trợ/);
assert.match(component,/Học tập & hoạt động/);
assert.match(component,/Thông tin gia đình/);
assert.match(component,/Mã định danh Bộ GD&ĐT/);
assert.match(component,/Xác nhận nhập MOET cho/);

console.log('PASS: whole-class MOET Excel import and grouped MOET profile are integrated.');
