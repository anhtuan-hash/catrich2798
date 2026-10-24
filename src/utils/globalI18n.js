import { assessmentText } from './assessmentBilingual.js';
import { LEGACY_SITE_EN } from './legacySiteTranslations.js';

const COUNT_TERMS = Object.freeze({
  'học sinh':'students', 'giáo viên':'teachers', 'lớp':'classes',
  'hoạt động':'activities', 'yêu cầu':'requests', 'sự kiện':'events',
  'nhiệm vụ':'tasks', 'câu hỏi':'questions', 'bài kiểm tra':'assessments',
});

// Strictly anchored status strings. Captured names, file paths, class names and
// counts are reused unchanged; unknown user-authored text is never translated.
const DYNAMIC_UI = [
  [/^Đã nhận diện (\d+) câu hỏi( và 1 chùm ngữ liệu)?\. Hãy kiểm tra bản xem trước rồi lưu\.$/, m => 'Detected '+m[1]+' questions'+(m[2]?' and 1 shared passage':'')+'. Review before saving.'],
  [/^Đã lưu: (\d+) câu mới · (\d+) câu đã có( · 1 đề thi)?( · 1 chùm bài)?\.$/, m => 'Saved: '+m[1]+' new questions · '+m[2]+' existing questions'+(m[3]?' · 1 test':'')+(m[4]?' · 1 question set':'')+'.'],
  [/^Bản ráp hiện còn (\d+) lỗi bắt buộc\. Chưa thể lưu đề\.$/, m => 'The assembled test has '+m[1]+' critical errors and cannot be saved.'],
  [/^Đã tạo đề (\d+) câu từ ma trận “(.+)”, không gọi AI và không phát sinh phí AI\.$/, m => 'Created a '+m[1]+'-question test using blueprint “'+m[2]+'” with no AI calls or fees.'],
  [/^Chưa thể phát hành: còn (\d+) lỗi bắt buộc trong Quality Audit\.$/, m => 'Cannot publish: '+m[1]+' critical Quality Audit errors remain.'],
  [/^Đã phát hành đề sau khi Quality Audit đạt yêu cầu\. Còn (\d+) cảnh báo tham khảo\.$/, m => 'Test published after passing Quality Audit. '+m[1]+' advisory warnings remain.'],
  [/^Đã xuất Word (bản giáo viên|bản học sinh)\.$/, m => 'Exported the '+(m[1]==='bản giáo viên'?'teacher':'student')+' Word version.'],
  [/^Đã tạo (\d+) mã đề: (.+)\. Câu hỏi gốc không bị nhân bản\.$/, m => 'Created '+m[1]+' test codes: '+m[2]+'. Original questions were not duplicated.'],
  [/^Kiểm tra kết nối thất bại: (.+)$/, m => 'Connection check failed: '+m[1]],
  [/^Đã tạo lớp (.+)\. Hãy nhập danh sách học sinh để bắt đầu\.$/, m => 'Created class '+m[1]+'. Import the student roster to begin.'],
  [/^Đã mở Sổ điểm lớp (.+) · (.+)\.$/, m => 'Opened Gradebook for class '+m[1]+' · '+m[2]+'.'],
  [/^Đã khởi tạo Sổ điểm (.+) · (.+) từ phân công TTCM\.$/, m => 'Created Gradebook '+m[1]+' · '+m[2]+' from department assignments.'],
  [/^Đã nhập (\d+) mục vào lịch làm việc dùng chung\.$/, m => 'Imported '+m[1]+' entries into the shared work schedule.'],
  [/^Đã nhận diện và đồng bộ (\d+) hoạt động vào lịch chung toàn hệ thống\.$/, m => 'Detected and synced '+m[1]+' activities to the shared calendar.'],
  [/^(\d+) hoạt động mới từ file (.+)$/, m => m[1]+' new activities from file '+m[2]],
  [/^(\d+) ngày trước$/, m => m[1]+' days ago'],
  [/^Còn (\d+) ngày$/, m => m[1]+' days left'],
  [/^Còn (\d+) giờ$/, m => m[1]+' hours left'],
  [/^(\d+) đang làm việc$/, m => m[1]+' active staff'],
  [/^(\d+) việc trễ hạn$/, m => m[1]+' overdue tasks'],
  [/^(\d+) hồ sơ chưa nộp$/, m => m[1]+' pending documents'],
  [/^(\d+) chưa gửi$/, m => m[1]+' not submitted'],
  [/^(\d+) đã duyệt$/, m => m[1]+' approved'],
  [/^(\d+) báo cáo cần sửa$/, m => m[1]+' reports require revision'],
  [/^Còn (\d+) mục bắt buộc cần hoàn thiện\.$/, m => m[1]+' required items remain incomplete.'],
  [/^Đã ghi nhận vi phạm và trừ (\d+) điểm rèn luyện\.$/, m => 'Violation recorded and '+m[1]+' conduct points deducted.'],
  [/^Đã cộng (\d+) điểm rèn luyện cho (.+)\.$/, m => 'Added '+m[1]+' conduct points for '+m[2]+'.'],
  [/^Đã thêm (.+) vào lớp (.+)\.$/, m => 'Added '+m[1]+' to class '+m[2]+'.'],
  [/^Đã hủy buổi học (.+) ngày (.+)\.$/, m => 'Canceled class session '+m[1]+' on '+m[2]+'.'],
  [/^Đã xử lý (\d+) học sinh từ (.+)\. Danh sách hiện có được giữ nguyên nếu không xuất hiện trong tệp\.$/, m => 'Processed '+m[1]+' students from '+m[2]+'. Existing students not in the file were preserved.'],
  [/^Đang xem ô điểm còn thiếu của (.+)\.$/, m => 'Viewing missing scores for '+m[1]+'.'],
];

// Translate only a known interface label, never arbitrary text or user data.
// Returning null tells the caller to preserve the original content untouched.
export function lookupLegacyUiEnglish(source) {
  if (!source || typeof source !== 'string') return null;
  if (Object.hasOwn(LEGACY_SITE_EN, source)) return LEGACY_SITE_EN[source];
  // JSX source contains HTML entities; browser DOM exposes decoded text.
  // Do not decode via innerHTML: this is a pure, safe string lookup.
  if (source.includes('&') && !source.includes('&amp;')) {
    const encoded = source.replaceAll('&', '&amp;');
    if (Object.hasOwn(LEGACY_SITE_EN, encoded)) {
      return LEGACY_SITE_EN[encoded].replaceAll('&amp;', '&');
    }
  }
  const assessment = assessmentText(source, 'en');
  if (assessment !== source) return assessment;
  const count = /^(\d{1,6})\s+(học sinh|giáo viên|lớp|hoạt động|yêu cầu|sự kiện|nhiệm vụ|câu hỏi|bài kiểm tra)$/.exec(source);
  if (count) return count[1] + ' ' + COUNT_TERMS[count[2]];
  for (const [pattern, translate] of DYNAMIC_UI) {
    const match = pattern.exec(source);
    if (match) return translate(match);
  }
  return null;
}

export function translateLegacyUi(source, language='vi') {
  if (language !== 'en' || typeof source !== 'string') return source;
  return lookupLegacyUiEnglish(source) ?? source;
}
