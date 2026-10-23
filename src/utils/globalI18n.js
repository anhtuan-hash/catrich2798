import { assessmentText } from './assessmentBilingual.js';
import { LEGACY_SITE_EN } from './legacySiteTranslations.js';

const COUNT_TERMS = Object.freeze({
  'học sinh':'students', 'giáo viên':'teachers', 'lớp':'classes',
  'hoạt động':'activities', 'yêu cầu':'requests', 'sự kiện':'events',
  'nhiệm vụ':'tasks', 'câu hỏi':'questions', 'bài kiểm tra':'assessments',
});

// Translate only a known interface label, never arbitrary text or user data.
// Returning null tells the caller to preserve the original content untouched.
export function lookupLegacyUiEnglish(source) {
  if (!source || typeof source !== 'string') return null;
  if (Object.hasOwn(LEGACY_SITE_EN, source)) return LEGACY_SITE_EN[source];
  const assessment = assessmentText(source, 'en');
  if (assessment !== source) return assessment;
  const count = /^(\d{1,6})\s+(học sinh|giáo viên|lớp|hoạt động|yêu cầu|sự kiện|nhiệm vụ|câu hỏi|bài kiểm tra)$/.exec(source);
  if (count) return count[1] + ' ' + COUNT_TERMS[count[2]];
  return null;
}

export function translateLegacyUi(source, language='vi') {
  if (language !== 'en' || typeof source !== 'string') return source;
  return lookupLegacyUiEnglish(source) ?? source;
}
