
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { parsePaperRecordsMatrix, parsePaperReviewMatrix } from '../src/utils/paperRecordsExcelImport.js';

const headers=['STT','Họ và tên','Ngày sinh','Nơi sinh','Giới tính','Dân tộc','Học sinh trường','Năm tốt nghiệp','Xếp loại tốt nghiệp','Hình thức đào tạo','Nơi cấp bằng','Ngày cấp bằng','Số hiệu','Số vào sổ cấp bằng','Trang PDF - Bằng THCS','Ghi chú - Bằng THCS','Loại GCN lớp 10','Nơi sinh theo GCN','Trường trúng tuyển lớp 10','Năm học trúng tuyển','Cơ quan cấp GCN','Ngày ký GCN','Số GCN / Số vào sổ','Hội đồng thi','Tổng điểm tuyển sinh','Trang PDF - GCN lớp 10','Ghi chú đối chiếu','Loại giấy khai sinh','Nơi sinh theo khai sinh','Quê quán theo khai sinh','Quốc tịch theo khai sinh','Họ tên cha','Năm sinh cha','Dân tộc cha','Quốc tịch cha','Nơi cư trú cha','Họ tên mẹ','Năm sinh mẹ','Dân tộc mẹ','Quốc tịch mẹ','Nơi cư trú mẹ','Người đi khai sinh','Quan hệ với người được khai sinh','Nơi đăng ký khai sinh','Ngày đăng ký khai sinh','Số khai sinh / Số đăng ký','Quyển số','Số bản sao / trích lục','Ngày cấp bản sao / trích lục','Trang PDF - Khai sinh','Ghi chú - Khai sinh'];
const row=[1,'TRẦN TUẤN ANH','15/02/2009','Bình Dương','Nam','Kinh','THCS Nguyễn Khuyến',2024,'Khá','Giáo dục phổ thông','Thủ Dầu Một','20/12/2024','S06150459','24/01/17 022',8,'','Tư thục','Bình Dương','Trung - Tiểu học Pétrus Ký','2024-2025','Sở Giáo dục và Đào tạo tỉnh Bình Dương','18/09/2024','2024/0437','','',21,'','Giấy khai sinh (Bản sao)','Sở y tế tỉnh Bình Dương','','Việt Nam','TRẦN VĂN TÂN',1975,'Kinh','Việt Nam','Ấp Phú Hòa','NGUYỄN THỊ THÚY TRANG',1978,'Kinh','Việt Nam','Ấp 1','NGUYỄN THỊ THÚY TRANG','Mẹ','UBND xã Chánh Phú Hòa','21/02/2011','','','','',8,'Nơi sinh được nhập nguyên văn theo giấy.'];
const parsed=parsePaperRecordsMatrix([['TITLE'],[],[],headers,row],'Du lieu hoc sinh');
assert.equal(parsed.students.length,1);
assert.equal(parsed.students[0].fields.fullName,'TRẦN TUẤN ANH');
assert.equal(parsed.students[0].fields.birthPlace,'Sở y tế tỉnh Bình Dương');
assert.equal(parsed.students[0].sections.diploma['Số hiệu'],'S06150459');
assert.equal(parsed.students[0].sections.admission['Trường trúng tuyển lớp 10'],'Trung - Tiểu học Pétrus Ký');
assert.equal(parsed.students[0].sections.birth['Họ tên mẹ'],'NGUYỄN THỊ THÚY TRANG');
assert.equal(parsed.students[0].mappedCount,42);

const checks=parsePaperReviewMatrix([['Mục kiểm tra','Giá trị','Ghi chú','Nguồn'],['Nguồn ghi lạ','TRẦN TUẤN ANH','Nơi sinh ghi nguyên văn “Sở y tế tỉnh Bình Dương”','Khai sinh trang 8']]);
assert.equal(checks.length,1);
assert.equal(checks[0].type,'Nguồn ghi lạ');

const component=await readFile(new URL('../src/components/homeroom/StudentRecordsTab.jsx',import.meta.url),'utf8');
assert.match(component,/Nhập Excel hồ sơ giấy/);
assert.match(component,/importPaperExcel/);
assert.match(component,/PaperFullProfile/);
assert.match(component,/Bằng \/ GCN tốt nghiệp THCS/);
assert.match(component,/GCN trúng tuyển lớp 10/);
assert.match(component,/Giấy \/ Trích lục khai sinh/);
assert.match(component,/Ghi chú kiểm tra từ file tổng hợp/);
console.log('PASS: whole-class paper-record Excel import and grouped paper profile are integrated.');
