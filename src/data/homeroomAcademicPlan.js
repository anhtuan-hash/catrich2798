export const PETRUS_KY_ACADEMIC_PLAN_DOCUMENT = {
  id: 'petrus-ky-academic-plan-2026-2027',
  title: 'Khung kế hoạch thời gian năm học 2026-2027',
  school: 'Trường Trung – Tiểu học Pétrus Ký',
  schoolYear: '2026-2027',
  documentNumber: 'Dự thảo Quyết định QĐ-PEK năm 2026',
  path: '/documents/Khung-ke-hoach-thoi-gian-nam-hoc-2026-2027-Petrus-Ky.pdf',
  pageCount: 4,
};


const preAcademicSummerRows = [
  {
    row: 'H1',
    id: 'summer-prep-01',
    startDate: '2026-06-15', endDate: '2026-06-20',
    semester: 'SUMMER_PREP', schoolWeekNumber: 1,
    schoolPlanLabel: 'Tuần hè 1 (Khối 12)',
    curriculumPlanLabel: 'Lớp 12 tựu trường từ 15/06/2026',
    notes: 'Tuần hè bổ sung theo mốc tựu trường của khối 12 trong Khung kế hoạch năm học 2026-2027.',
    kind: 'summer-prep', conductEligible: true, includeInAverage: false,
  },
  {
    row: 'H2',
    id: 'summer-prep-02',
    startDate: '2026-06-22', endDate: '2026-06-27',
    semester: 'SUMMER_PREP', schoolWeekNumber: 2,
    schoolPlanLabel: 'Tuần hè 2 (Khối 12)',
    curriculumPlanLabel: 'Giai đoạn hè trước Tuần 0',
    notes: 'Theo dõi rèn luyện riêng; không tính vào trung bình học kỳ hoặc cả năm.',
    kind: 'summer-prep', conductEligible: true, includeInAverage: false,
  },
  {
    row: 'H3',
    id: 'summer-prep-03',
    startDate: '2026-06-29', endDate: '2026-07-04',
    semester: 'SUMMER_PREP', schoolWeekNumber: 3,
    schoolPlanLabel: 'Tuần hè 3 (Khối 12)',
    curriculumPlanLabel: 'Giai đoạn hè trước Tuần 0',
    notes: 'Theo dõi rèn luyện riêng; không tính vào trung bình học kỳ hoặc cả năm.',
    kind: 'summer-prep', conductEligible: true, includeInAverage: false,
  },
  {
    row: 'H4',
    id: 'summer-prep-04',
    startDate: '2026-07-06', endDate: '2026-07-11',
    semester: 'SUMMER_PREP', schoolWeekNumber: 4,
    schoolPlanLabel: 'Tuần hè 4 (Khối 12)',
    curriculumPlanLabel: 'Giai đoạn hè trước Tuần 0',
    notes: 'Kết thúc 4 tuần hè trước Tuần 0 từ 13/07/2026.',
    kind: 'summer-prep', conductEligible: true, includeInAverage: false,
  },
];

const rows = [
  {
    row: 1,
    id: 'orientation-0',
    startDate: '2026-07-13', endDate: '2026-07-18',
    semester: 'ORIENTATION', schoolWeekNumber: 0,
    schoolPlanLabel: 'Tuần 0 - Ổn định tổ chức',
    curriculumPlanLabel: 'Lớp 12 tựu trường từ 15/06/2026',
    notes: 'Tựu trường năm học mới. Lớp 1, 2, 6-11 tựu trường ngày 15/07/2026; lớp 3, 4, 5 tựu trường ngày 16/07/2026.',
    kind: 'orientation', conductEligible: true, includeInAverage: false,
  },
  {
    row: 2, id: 'hki-01', startDate: '2026-07-20', endDate: '2026-07-25', semester: 'HKI', schoolWeekNumber: 1,
    schoolPlanLabel: 'Tuần 1 (HKI)', curriculumPlanLabel: '',
    notes: 'Thời gian thực hiện kế hoạch giáo dục của nhà trường từ 20/07/2026 đến 29/08/2026.', kind: 'instruction', conductEligible: true, includeInAverage: true,
  },
  {
    row: 3, id: 'hki-02', startDate: '2026-07-27', endDate: '2026-08-01', semester: 'HKI', schoolWeekNumber: 2,
    schoolPlanLabel: 'Tuần 2 (HKI)', curriculumPlanLabel: '', notes: 'Chủ điểm tháng 8: Truyền thống nhà trường.', kind: 'instruction', conductEligible: true, includeInAverage: true,
  },
  { row: 4, id: 'hki-03', startDate: '2026-08-03', endDate: '2026-08-08', semester: 'HKI', schoolWeekNumber: 3, schoolPlanLabel: 'Tuần 3 (HKI)', curriculumPlanLabel: '', notes: '', kind: 'instruction', conductEligible: true, includeInAverage: true },
  { row: 5, id: 'hki-04', startDate: '2026-08-10', endDate: '2026-08-15', semester: 'HKI', schoolWeekNumber: 4, schoolPlanLabel: 'Tuần 4 (HKI)', curriculumPlanLabel: '', notes: 'Trung học: Đại hội phụ huynh học sinh, họp Ban đại diện phụ huynh học sinh lần 1.', kind: 'instruction', conductEligible: true, includeInAverage: true },
  { row: 6, id: 'hki-05', startDate: '2026-08-17', endDate: '2026-08-22', semester: 'HKI', schoolWeekNumber: 5, schoolPlanLabel: 'Tuần 5 (HKI)', curriculumPlanLabel: '', notes: 'Tiểu học: Đại hội phụ huynh học sinh, họp Ban đại diện phụ huynh học sinh lần 1.', kind: 'instruction', conductEligible: true, includeInAverage: true },
  { row: 7, id: 'hki-06', startDate: '2026-08-24', endDate: '2026-08-29', semester: 'HKI', schoolWeekNumber: 6, schoolPlanLabel: 'Tuần 6 (HKI)', curriculumPlanLabel: 'Tuần 0 - Ổn định tổ chức', notes: 'Chủ điểm tháng 9: Chào mừng năm học mới.', kind: 'instruction', conductEligible: true, includeInAverage: true },
  { row: 8, id: 'hki-07', startDate: '2026-08-31', endDate: '2026-09-05', semester: 'HKI', schoolWeekNumber: 7, schoolPlanLabel: 'Tuần 7 (HKI)', curriculumPlanLabel: 'Tuần 1 (HKI)', notes: 'Nghỉ lễ Quốc khánh 02/09 vào thứ 3, 4. Khai giảng: C1+C3 ngày 04/09 và C2 ngày 05/09.', kind: 'instruction', conductEligible: true, includeInAverage: true },
  { row: 9, id: 'hki-08', startDate: '2026-09-07', endDate: '2026-09-12', semester: 'HKI', schoolWeekNumber: 8, schoolPlanLabel: 'Tuần 8 (HKI)', curriculumPlanLabel: 'Tuần 2 (HKI)', notes: '', kind: 'instruction', conductEligible: true, includeInAverage: true },
  { row: 10, id: 'hki-09', startDate: '2026-09-14', endDate: '2026-09-19', semester: 'HKI', schoolWeekNumber: 9, schoolPlanLabel: 'Tuần 9 (HKI)', curriculumPlanLabel: 'Tuần 3 (HKI)', notes: 'Tiểu học: Kiểm tra giữa Học kỳ 1.', kind: 'instruction', conductEligible: true, includeInAverage: true },
  { row: 11, id: 'hki-10', startDate: '2026-09-21', endDate: '2026-09-26', semester: 'HKI', schoolWeekNumber: 10, schoolPlanLabel: 'Tuần 10 (HKI)', curriculumPlanLabel: 'Tuần 4 (HKI)', notes: 'Trung học: Kiểm tra giữa Học kỳ 1. TTCM kiểm tra HSSS lần 1.', kind: 'instruction', conductEligible: true, includeInAverage: true, milestone: 'midterm1' },
  { row: 12, id: 'hki-11', startDate: '2026-09-28', endDate: '2026-10-03', semester: 'HKI', schoolWeekNumber: 11, schoolPlanLabel: 'Tuần 11 (HKI)', curriculumPlanLabel: 'Tuần 5 (HKI)', notes: 'Chủ điểm tháng 10: Vâng lời Bác dạy.', kind: 'instruction', conductEligible: true, includeInAverage: true },
  { row: 13, id: 'hki-12', startDate: '2026-10-05', endDate: '2026-10-10', semester: 'HKI', schoolWeekNumber: 12, schoolPlanLabel: 'Tuần 12 (HKI)', curriculumPlanLabel: 'Tuần 6 (HKI)', notes: 'Thi giáo viên dạy giỏi cấp Phường, cấp Thành phố.', kind: 'instruction', conductEligible: true, includeInAverage: true },
  { row: 14, id: 'hki-13', startDate: '2026-10-12', endDate: '2026-10-17', semester: 'HKI', schoolWeekNumber: 13, schoolPlanLabel: 'Tuần 13 (HKI)', curriculumPlanLabel: 'Tuần 7 (HKI)', notes: '', kind: 'instruction', conductEligible: true, includeInAverage: true },
  { row: 15, id: 'hki-14', startDate: '2026-10-19', endDate: '2026-10-24', semester: 'HKI', schoolWeekNumber: 14, schoolPlanLabel: 'Tuần 14 (HKI)', curriculumPlanLabel: 'Tuần 8 (HKI)', notes: 'Kỷ niệm 96 năm Ngày thành lập Hội Liên hiệp Phụ nữ Việt Nam (20/10).', kind: 'instruction', conductEligible: true, includeInAverage: true },
  { row: 16, id: 'hki-15', startDate: '2026-10-26', endDate: '2026-10-31', semester: 'HKI', schoolWeekNumber: 15, schoolPlanLabel: 'Tuần 15 (HKI)', curriculumPlanLabel: 'Tuần 9 (HKI)', notes: '', kind: 'instruction', conductEligible: true, includeInAverage: true },
  { row: 17, id: 'hki-16', startDate: '2026-11-02', endDate: '2026-11-07', semester: 'HKI', schoolWeekNumber: 16, schoolPlanLabel: 'Tuần 16 (HKI)', curriculumPlanLabel: 'Tuần 10 (HKI)', notes: 'Chủ điểm tháng 11: Tôn sư trọng đạo.', kind: 'instruction', conductEligible: true, includeInAverage: true },
  { row: 18, id: 'hki-17', startDate: '2026-11-09', endDate: '2026-11-14', semester: 'HKI', schoolWeekNumber: 17, schoolPlanLabel: 'Tuần 17 (HKI)', curriculumPlanLabel: 'Tuần 11 (HKI)', notes: '', kind: 'instruction', conductEligible: true, includeInAverage: true },
  { row: 19, id: 'hki-18', startDate: '2026-11-16', endDate: '2026-11-21', semester: 'HKI', schoolWeekNumber: 18, schoolPlanLabel: 'Tuần 18 (HKI)', curriculumPlanLabel: 'Tuần 12 (HKI)', notes: 'Sinh hoạt ngoại khóa HKI. Kỷ niệm 44 năm Ngày Nhà giáo Việt Nam (20/11).', kind: 'instruction', conductEligible: true, includeInAverage: true },
  { row: 20, id: 'hki-19', startDate: '2026-11-23', endDate: '2026-11-28', semester: 'HKI', schoolWeekNumber: 19, schoolPlanLabel: 'Tuần 19 (HKI)', curriculumPlanLabel: 'Tuần 13 (HKI)', notes: 'TTCM, BGH kiểm tra HSSS lần 2. Nghỉ lễ Ngày Văn hóa Việt Nam 24/11.', kind: 'instruction', conductEligible: true, includeInAverage: true },
  { row: 21, id: 'hki-20', startDate: '2026-11-30', endDate: '2026-12-05', semester: 'HKI', schoolWeekNumber: 20, schoolPlanLabel: 'Tuần 20 (HKI)', curriculumPlanLabel: 'Tuần 14 (HKI)', notes: 'Chủ điểm tháng 12: Uống nước nhớ nguồn. Kiểm tra HK1 các môn không tập trung.', kind: 'instruction', conductEligible: true, includeInAverage: true },
  { row: 22, id: 'hki-21', startDate: '2026-12-07', endDate: '2026-12-12', semester: 'HKI', schoolWeekNumber: 21, schoolPlanLabel: 'Tuần 21 (HKI)', curriculumPlanLabel: 'Tuần 15 (HKI)', notes: 'Kiểm tra cuối Học kỳ 1.', kind: 'instruction', conductEligible: true, includeInAverage: true, milestone: 'semester1End' },
  { row: 23, id: 'hkii-01', startDate: '2026-12-14', endDate: '2026-12-19', semester: 'HKII', schoolWeekNumber: 1, schoolPlanLabel: 'Tuần 1 (HKII)', curriculumPlanLabel: 'Tuần 16 (HKI)', notes: 'Hoàn thành kế hoạch học kỳ 1. Tiểu học: Họp phụ huynh lần 2 ngày 19/12/2026.', kind: 'instruction', conductEligible: true, includeInAverage: true },
  { row: 24, id: 'hkii-02', startDate: '2026-12-21', endDate: '2026-12-26', semester: 'HKII', schoolWeekNumber: 2, schoolPlanLabel: 'Tuần 2 (HKII)', curriculumPlanLabel: 'Tuần 17 (HKI)', notes: 'Trung học: Họp phụ huynh, Ban đại diện lần 2, xét thi đua HK1. Tiểu học: Sơ kết HKI ngày 21/12/2026.', kind: 'instruction', conductEligible: true, includeInAverage: true },
  { row: 25, id: 'hkii-03', startDate: '2026-12-28', endDate: '2027-01-02', semester: 'HKII', schoolWeekNumber: 3, schoolPlanLabel: 'Tuần 3 (HKII)', curriculumPlanLabel: 'Tuần 18 (HKI)', notes: 'Trung học: Sơ kết HKI ngày 28/12/2026. Nghỉ Tết Dương lịch ngày thứ 6, 7.', kind: 'instruction', conductEligible: true, includeInAverage: true },
  { row: 26, id: 'hkii-04', startDate: '2027-01-04', endDate: '2027-01-09', semester: 'HKII', schoolWeekNumber: 4, schoolPlanLabel: 'Tuần 4 (HKII)', curriculumPlanLabel: 'Kiểm tra, sơ kết HKI và các hoạt động khác', notes: 'Chủ điểm tháng 1: Truyền thống học sinh - sinh viên.', kind: 'instruction', conductEligible: true, includeInAverage: true },
  { row: 27, id: 'hkii-05', startDate: '2027-01-11', endDate: '2027-01-16', semester: 'HKII', schoolWeekNumber: 5, schoolPlanLabel: 'Tuần 5 (HKII)', curriculumPlanLabel: 'Tuần 1 (HKII)', notes: '', kind: 'instruction', conductEligible: true, includeInAverage: true },
  { row: 28, id: 'hkii-06', startDate: '2027-01-18', endDate: '2027-01-23', semester: 'HKII', schoolWeekNumber: 6, schoolPlanLabel: 'Tuần 6 (HKII)', curriculumPlanLabel: 'Tuần 2 (HKII)', notes: '', kind: 'instruction', conductEligible: true, includeInAverage: true },
  { row: 29, id: 'hkii-07', startDate: '2027-01-25', endDate: '2027-01-30', semester: 'HKII', schoolWeekNumber: 7, schoolPlanLabel: 'Tuần 7 (HKII)', curriculumPlanLabel: 'Tuần 3 (HKII)', notes: 'Chủ điểm tháng 2: Mừng Đảng - Mừng Xuân. Ngày 30/01 tổ chức các hoạt động chào Xuân 2027.', kind: 'instruction', conductEligible: true, includeInAverage: true },
  { row: 30, id: 'tet-break-1', startDate: '2027-02-01', endDate: '2027-02-06', semester: 'BREAK', schoolWeekNumber: null, schoolPlanLabel: 'Nghỉ Tết Nguyên đán Đinh Mùi 2027', curriculumPlanLabel: 'Tuần 4 (HKII)', notes: '', kind: 'break', conductEligible: false, includeInAverage: false },
  { row: 31, id: 'tet-break-2', startDate: '2027-02-08', endDate: '2027-02-13', semester: 'BREAK', schoolWeekNumber: null, schoolPlanLabel: 'Nghỉ Tết Nguyên đán Đinh Mùi 2027', curriculumPlanLabel: 'Nghỉ Tết Nguyên đán Đinh Mùi 2027', notes: 'Họp mặt đầu năm ngày 13/02 (mùng 08 tháng Giêng âm lịch).', kind: 'break', conductEligible: false, includeInAverage: false },
  { row: 32, id: 'hkii-08', startDate: '2027-02-15', endDate: '2027-02-20', semester: 'HKII', schoolWeekNumber: 8, schoolPlanLabel: 'Tuần 8 (HKII)', curriculumPlanLabel: 'Tuần 5 (HKII)', notes: '', kind: 'instruction', conductEligible: true, includeInAverage: true },
  { row: 33, id: 'hkii-09', startDate: '2027-02-22', endDate: '2027-02-27', semester: 'HKII', schoolWeekNumber: 9, schoolPlanLabel: 'Tuần 9 (HKII)', curriculumPlanLabel: 'Tuần 6 (HKII)', notes: '', kind: 'instruction', conductEligible: true, includeInAverage: true },
  { row: 34, id: 'hkii-10', startDate: '2027-03-01', endDate: '2027-03-06', semester: 'HKII', schoolWeekNumber: 10, schoolPlanLabel: 'Tuần 10 (HKII)', curriculumPlanLabel: 'Tuần 7 (HKII)', notes: 'Chủ điểm tháng 3: Tiến bước lên Đoàn. Kiểm tra giữa Học kỳ 2.', kind: 'instruction', conductEligible: true, includeInAverage: true, milestone: 'midterm2' },
  { row: 35, id: 'hkii-11', startDate: '2027-03-08', endDate: '2027-03-13', semester: 'HKII', schoolWeekNumber: 11, schoolPlanLabel: 'Tuần 11 (HKII)', curriculumPlanLabel: 'Tuần 8 (HKII)', notes: 'TTCM kiểm tra HSSS lần 3. Thi học sinh giỏi các cấp.', kind: 'instruction', conductEligible: true, includeInAverage: true },
  { row: 36, id: 'hkii-12', startDate: '2027-03-15', endDate: '2027-03-20', semester: 'HKII', schoolWeekNumber: 12, schoolPlanLabel: 'Tuần 12 (HKII)', curriculumPlanLabel: 'Tuần 9 (HKII)', notes: 'Sinh hoạt ngoại khóa HKII khối THPT.', kind: 'instruction', conductEligible: true, includeInAverage: true },
  { row: 37, id: 'hkii-13', startDate: '2027-03-22', endDate: '2027-03-27', semester: 'HKII', schoolWeekNumber: 13, schoolPlanLabel: 'Tuần 13 (HKII)', curriculumPlanLabel: 'Tuần 10 (HKII)', notes: 'Sinh hoạt ngoại khóa HKII khối THCS.', kind: 'instruction', conductEligible: true, includeInAverage: true },
  { row: 38, id: 'hkii-14', startDate: '2027-03-29', endDate: '2027-04-03', semester: 'HKII', schoolWeekNumber: 14, schoolPlanLabel: 'Tuần 14 (HKII)', curriculumPlanLabel: 'Tuần 11 (HKII)', notes: 'Chủ điểm tháng 4: Tổ quốc mến yêu.', kind: 'instruction', conductEligible: true, includeInAverage: true },
  { row: 39, id: 'hkii-15', startDate: '2027-04-05', endDate: '2027-04-10', semester: 'HKII', schoolWeekNumber: 15, schoolPlanLabel: 'Tuần 15 (HKII)', curriculumPlanLabel: 'Tuần 12 (HKII)', notes: 'Kiểm tra nói tiếng Anh khối 9.', kind: 'instruction', conductEligible: true, includeInAverage: true },
  { row: 40, id: 'hkii-16', startDate: '2027-04-12', endDate: '2027-04-17', semester: 'HKII', schoolWeekNumber: 16, schoolPlanLabel: 'Tuần 16 (HKII)', curriculumPlanLabel: 'Tuần 13 (HKII)', notes: 'Nghỉ Giỗ Tổ Hùng Vương (10/3 âm lịch) vào thứ 6, thứ 7.', kind: 'instruction', conductEligible: true, includeInAverage: true },
  { row: 41, id: 'hkii-17', startDate: '2027-04-19', endDate: '2027-04-24', semester: 'HKII', schoolWeekNumber: 17, schoolPlanLabel: 'Tuần 17 (HKII)', curriculumPlanLabel: 'Tuần 14 (HKII)', notes: 'Khối 9, 12 kiểm tra HKII. Ôn tập, kiểm tra các môn không tập trung.', kind: 'instruction', conductEligible: true, includeInAverage: true },
  { row: 42, id: 'hkii-18', startDate: '2027-04-26', endDate: '2027-05-01', semester: 'HKII', schoolWeekNumber: 18, schoolPlanLabel: 'Tuần 18 (HKII)', curriculumPlanLabel: 'Tuần 15 (HKII)', notes: 'Nghỉ lễ 30/04, 01/05 vào thứ 6, thứ 7.', kind: 'instruction', conductEligible: true, includeInAverage: true },
  { row: 43, id: 'hkii-19', startDate: '2027-05-03', endDate: '2027-05-08', semester: 'HKII', schoolWeekNumber: 19, schoolPlanLabel: 'Tuần 19 (HKII)', curriculumPlanLabel: 'Tuần 16 (HKII)', notes: 'Xét công nhận hoàn thành chương trình lớp 9. Kiểm tra cuối Học kỳ 2.', kind: 'instruction', conductEligible: true, includeInAverage: true },
  { row: 44, id: 'hkii-20', startDate: '2027-05-10', endDate: '2027-05-15', semester: 'HKII', schoolWeekNumber: 20, schoolPlanLabel: 'Tuần 20 (HKII)', curriculumPlanLabel: 'Tuần 17 (HKII)', notes: 'Ngày 12/05 cấp giấy hoàn thành chương trình lớp 9. Kiểm tra HSSS lần 4. Họp phụ huynh lần 3.', kind: 'instruction', conductEligible: true, includeInAverage: true },
  { row: 45, id: 'hkii-21', startDate: '2027-05-17', endDate: '2027-05-22', semester: 'HKII', schoolWeekNumber: 21, schoolPlanLabel: 'Tuần 21 (HKII)', curriculumPlanLabel: 'Kiểm tra, tổ chức các hoạt động khác và Tổng kết', notes: 'Sinh hoạt ngoại khóa HKII khối Tiểu học. Tổng kết năm học ngày 26/05/2027.', kind: 'instruction', conductEligible: true, includeInAverage: true, milestone: 'semester2End' },
  { row: 46, id: 'summer-46', startDate: '2027-05-24', endDate: '2027-05-29', semester: 'SUMMER', schoolWeekNumber: null, schoolPlanLabel: 'Học sinh khối 1-11 nghỉ hè; khối 12 ôn thi Tốt nghiệp 2027', curriculumPlanLabel: '', notes: 'Hoàn thành HSSS năm học 2026-2027.', kind: 'summer', conductEligible: false, includeInAverage: false },
  { row: 47, id: 'summer-47', startDate: '2027-05-31', endDate: '2027-06-05', semester: 'SUMMER', schoolWeekNumber: null, schoolPlanLabel: 'Học sinh khối 1-11 nghỉ hè; khối 12 ôn thi Tốt nghiệp 2027', curriculumPlanLabel: '', notes: 'Thi tuyển sinh năm học 2027-2028.', kind: 'summer', conductEligible: false, includeInAverage: false },
  { row: 48, id: 'summer-48', startDate: '2027-06-07', endDate: '2027-06-12', semester: 'SUMMER', schoolWeekNumber: null, schoolPlanLabel: 'Học sinh khối 1-11 nghỉ hè; khối 12 ôn thi Tốt nghiệp 2027', curriculumPlanLabel: '', notes: 'Học sinh lớp 12 năm học 2026-2027 dự thi Tốt nghiệp THPT.', kind: 'summer', conductEligible: false, includeInAverage: false },
  { row: 49, id: 'summer-49', startDate: '2027-06-14', endDate: '2027-06-19', semester: 'SUMMER', schoolWeekNumber: null, schoolPlanLabel: 'Tập trung học sinh khối 12 năm học 2027-2028 từ 15/06/2027', curriculumPlanLabel: '', notes: '', kind: 'summer', conductEligible: false, includeInAverage: false },
  { row: 50, id: 'summer-50', startDate: '2027-06-21', endDate: '2027-06-26', semester: 'SUMMER', schoolWeekNumber: null, schoolPlanLabel: 'Khối 1-11 trải nghiệm khóa hè (Tuần 1)', curriculumPlanLabel: '', notes: '', kind: 'summer', conductEligible: false, includeInAverage: false },
  { row: 51, id: 'summer-51', startDate: '2027-06-28', endDate: '2027-07-03', semester: 'SUMMER', schoolWeekNumber: null, schoolPlanLabel: 'Khối 1-11 trải nghiệm khóa hè (Tuần 2)', curriculumPlanLabel: '', notes: '', kind: 'summer', conductEligible: false, includeInAverage: false },
  { row: 52, id: 'summer-52', startDate: '2027-07-05', endDate: '2027-07-10', semester: 'SUMMER', schoolWeekNumber: null, schoolPlanLabel: 'Khối 1-11 trải nghiệm khóa hè (Tuần 3)', curriculumPlanLabel: '', notes: 'Tập huấn chuyên môn nghiệp vụ hè 2027.', kind: 'summer', conductEligible: false, includeInAverage: false },
  { row: 53, id: 'summer-53', startDate: '2027-07-12', endDate: '2027-07-17', semester: 'SUMMER', schoolWeekNumber: null, schoolPlanLabel: 'Khối 1-11 trải nghiệm khóa hè (Tuần 4)', curriculumPlanLabel: '', notes: 'Dự kiến học sinh lớp 1-11 tựu trường thứ Hai 19/07/2027. Giáo viên làm việc từ 13/07.', kind: 'summer', conductEligible: false, includeInAverage: false },
];

export const PETRUS_KY_ACADEMIC_PLAN_2026_2027 = {
  id: 'petrus-ky-2026-2027',
  school: 'Trường Trung – Tiểu học Pétrus Ký',
  schoolYear: '2026-2027',
  title: 'Khung kế hoạch thời gian năm học 2026-2027',
  document: PETRUS_KY_ACADEMIC_PLAN_DOCUMENT,
  calendar: {
    schoolYearStart: '2026-06-15',
    schoolYearEnd: '2027-05-26',
    semester1Start: '2026-07-20',
    midterm1End: '2026-09-26',
    semester1End: '2026-12-12',
    semester2Start: '2026-12-14',
    midterm2End: '2027-03-06',
    semester2End: '2027-05-22',
  },
  sourceRows: rows,
  supplementalRows: preAcademicSummerRows,
  rows: [...preAcademicSummerRows, ...rows],
};

const allPlanRows = PETRUS_KY_ACADEMIC_PLAN_2026_2027.rows;

export const PETRUS_KY_CONDUCT_WEEKS = allPlanRows.filter((item) => item.conductEligible);
export const PETRUS_KY_AVERAGE_WEEKS = allPlanRows.filter((item) => item.includeInAverage);

export function findPetrusKyPlanRow(value) {
  const date = String(value || '').slice(0, 10);
  if (!date) return null;
  return allPlanRows.find((item) => date >= item.startDate && date <= item.endDate) || null;
}

export function findPetrusKyConductWeek(value) {
  const row = findPetrusKyPlanRow(value);
  return row?.conductEligible ? row : null;
}

function displayDate(value) {
  const match = String(value || '').match(/^(\d{4})-(\d{2})-(\d{2})$/);
  return match ? `${match[3]}/${match[2]}/${match[1]}` : String(value || '');
}

export function formatPetrusKyWeekOption(row) {
  if (!row) return '';
  const label = row.schoolPlanLabel || `Dòng ${row.row}`;
  const curriculum = row.curriculumPlanLabel ? ` · Chính khóa: ${row.curriculumPlanLabel}` : '';
  return `${label} · ${displayDate(row.startDate)} – ${displayDate(row.endDate)}${curriculum}`;
}
