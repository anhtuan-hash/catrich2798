
import assert from 'node:assert/strict';
import { STANDARD_COMPARE_FIELDS, compareStandardizedValue, standardizeStudentSource } from '../src/utils/studentRecordCompareStandardizer.js';

const vnedu={
  fields:{fullName:'Nguyễn Hoàng Minh Khang',birthDate:'15/07/2009',gender:'Nam',citizenId:'074209010550',birthPlace:'Bệnh viện Từ Dũ, TP Hồ Chí Minh',currentAddress:'Chung cư Sora Garden, đường Hùng Vương',fatherName:'Nguyễn Hoàng Thanh',motherName:'Nguyễn Thị Mỹ Trang'},
  excel:{identifiers:{moetCode:'7456839782'},extra:{ethnicity:'Kinh',nationality:'Việt Nam',contactPhone:'0936885579',citizenIdIssueDate:'24/07/2023',citizenIdIssuePlace:'Cục cảnh sát quản lý hành chính về trật tự xã hội',fatherBirthYear:'1982',motherBirthYear:'1984',fatherOccupation:'Kinh doanh',motherOccupation:'Kế Toán',residenceType:'Bán trú'},rawColumns:{'Cột 13':'Phường Bình Dương','Cột 14':'TP. Hồ Chí Minh','Cột 20':'Phường Bến Thành','Cột 21':'TP. Hồ Chí Minh','Cột 23':'Phường Dĩ An','Cột 24':'TP. Hồ Chí Minh','Cột 26':'TP. Hồ Chí Minh','Quê quán':'Bình Dương','Nơi khai sinh':'Phường Dĩ An','Hộ khẩu thường trú':'9/19, đường Nguyễn An Ninh, Bình Minh 1','Cột 17':'Phường Dĩ An','Cột 18':'TP. Hồ Chí Minh','Đội viên':'x'}}
};
const moet={
  fields:{fullName:'Nguyễn Hoàng Minh Khang',birthDate:'15/07/2009',gender:'Nam',citizenId:'074209010550',phone:'0936885579',birthPlace:'Bệnh viện Từ Dũ',currentAddress:'Chung cư Sora Garden, đường Hùng Vương',fatherName:'Nguyễn Hoàng Thanh',motherName:'Nguyễn Thị Mỹ Trang'},
  excel:{identifiers:{ministryId:'7456839782',personalId:'074209010550'},rawColumns:{'Dân tộc':'Kinh','Quốc tịch':'Việt Nam','Ngày cấp':'24/07/2023','Nơi cấp':'Cục cảnh sát quản lý hành chính về trật tự xã hội','Phường/Xã nơi sinh':'Phường Bến Thành','Nơi sinh Tỉnh (cũ)':'Thành phố Hồ Chí Minh','Phường/Xã khai sinh':'Phường Dĩ An','Tỉnh thành khai sinh':'Thành phố Hồ Chí Minh','Tổ thôn quê quán':'Bình Dương','Phường Xã quê quán':'Phường Dĩ An','Tỉnh thành quê quán':'Thành phố Hồ Chí Minh','Phường/Xã chỗ ở hiện nay':'Phường Bình Dương','Tỉnh thành chỗ ở hiện nay':'Thành phố Hồ Chí Minh','Tổ/thôn Hộ khẩu thường trú':'9/19, đường Nguyễn An Ninh, Bình Minh 1','Nơi thường trú Xã (cũ)':'Phường Dĩ An','Nơi thường trú Tỉnh (cũ)':'Tỉnh Bình Dương','Năm sinh cha':'1982','Nghề nghiệp cha':'Kinh doanh','Năm sinh mẹ':'1984','Nghề nghiệp mẹ':'Kế Toán','Đội viên':'Có','Học bán trú':'Tự nguyện'}}
};
const v=standardizeStudentSource('vnedu',vnedu);
const m=standardizeStudentSource('moet',moet);
assert.equal(v.ministryId,m.ministryId);
assert.equal(v.citizenId,m.citizenId);
assert.equal(compareStandardizedValue(STANDARD_COMPARE_FIELDS.find(f=>f.key==='birthPlace'),v.birthPlace,m.birthPlace).id,'match');
assert.equal(compareStandardizedValue(STANDARD_COMPARE_FIELDS.find(f=>f.key==='teamMember'),v.teamMember,m.teamMember).id,'match');
assert.equal(compareStandardizedValue(STANDARD_COMPARE_FIELDS.find(f=>f.key==='semiBoarding'),v.semiBoarding,m.semiBoarding).id,'match');
assert.ok(STANDARD_COMPARE_FIELDS.length>=30);
console.log('PASS: vnEdu and MOET are normalized to one comparable schema.');
