export const APP_DESIGN_PROFILES = {

  'work-dashboard': {
    accent: '#315FC4',
    soft: '#EAF3FF',
    ink: '#10264A',
    icon: 'dashboard',
    style: 'Role-aware operations dashboard',
    styleVi: 'Bảng điều hành theo vai trò'},

  'thpt-practice-hub': {
    accent: '#D85F2A',
    soft: '#FFF0DF',
    ink: '#3B1B0D',
    icon: 'exam',
    style: 'Interactive THPT practice library',
    styleVi: 'Kho luyện thi THPT tương tác'},
  'textlab-activities': {
    accent: '#2F73D9',
    soft: '#DDEBFF',
    ink: '#0B2A55',
    icon: 'activity',
    style: 'Interactive activity lab',
    styleVi: 'Phòng tạo hoạt động tương tác'},
  'assessment-core': {
    accent: '#315FC4',
    soft: '#EAF0FF',
    ink: '#14213D',
    icon: 'exam',
    style: 'Question bank workspace',
    styleVi: 'Ngân hàng câu hỏi & đề thi'},

  'vietnam-tax': {
    accent: '#1769AA',
    soft: '#E8F3FF',
    ink: '#0D355C',
    icon: 'tax',
    style: 'Salary and tax simulator',
    styleVi: 'Mô phỏng lương và thuế'},
  'news-reader': {
    accent: '#167D78',
    soft: '#DDF5F1',
    ink: '#083B38',
    icon: 'news',
    style: 'Live editorial reader',
    styleVi: 'Trình đọc báo trực tiếp'},
  textcare: {
    accent: '#B8332A',
    soft: '#FFE0DD',
    ink: '#35110E',
    icon: 'textcare',
    style: 'Clean document stack',
    styleVi: 'Chồng văn bản chuẩn hoá'},
  'homeroom-hub': {
    accent: '#1F8F70',
    soft: '#DDF7ED',
    ink: '#0B382B',
    icon: 'homeroom',
    style: 'Homeroom command center',
    styleVi: 'Trung tâm công tác chủ nhiệm'},
  'student-practice': {
    accent: '#FF7A54',
    soft: '#FFE4DA',
    ink: '#361509',
    icon: 'practice',
    style: 'Practice sprint card',
    styleVi: 'Thẻ luyện tập tốc độ'},
  'admin-hub': {
    accent: '#D13438',
    soft: '#FFE1E3',
    ink: '#351014',
    icon: 'admin',
    style: 'Control room',
    styleVi: 'Phòng điều khiển'}};

export function getAppDesignProfile(slug) {
  return APP_DESIGN_PROFILES[slug] || {
    accent: '#191515',
    soft: '#F3DFD8',
    ink: '#191515',
    icon: 'apps',
    style: 'Creative app window',
    styleVi: 'Cửa sổ ứng dụng sáng tạo'};
}
