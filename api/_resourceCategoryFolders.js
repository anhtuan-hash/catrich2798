export const RESOURCE_CATEGORY_FOLDERS = Object.freeze({
  'lesson-plan': '01_GIAO_AN_KE_HOACH_BAI_DAY',
  presentation: '02_BAI_GIANG_TRINH_CHIEU',
  worksheet: '03_WORKSHEET_PHIEU_HOC_TAP',
  assessment: '04_DE_KIEM_TRA',
  'answer-key': '05_DAP_AN_HUONG_DAN_CHAM',
  'thpt-exam': '06_ON_THI_THPT',
  gifted: '07_HOC_SINH_GIOI',
  audio: '08_AUDIO_LISTENING',
  media: '09_VIDEO_HINH_ANH',
  'professional-form': '10_BIEU_MAU_CHUYEN_MON',
  reference: '11_SACH_TAI_LIEU_THAM_KHAO',
  other: '99_CHUA_PHAN_LOAI',
});

const ALIASES = Object.freeze({
  books: 'reference', book: 'reference', references: 'reference',
  'lesson-plans': 'lesson-plan', lesson_plan: 'lesson-plan', professional: 'professional-form',
  slides: 'presentation', slide: 'presentation', ppt: 'presentation', pptx: 'presentation',
  worksheets: 'worksheet', handout: 'worksheet',
  tests: 'assessment', test: 'assessment', exam: 'assessment', quiz: 'assessment',
  answers: 'answer-key', answer: 'answer-key', answer_key: 'answer-key', rubric: 'answer-key',
  thpt: 'thpt-exam', hsg: 'gifted', listening: 'audio', video: 'media', images: 'media',
  forms: 'professional-form', form: 'professional-form', template: 'professional-form', internal: 'professional-form',
});

export function normaliseResourceCategory(value) {
  const raw = String(value || '').trim().toLowerCase();
  const slug = ALIASES[raw] || raw;
  return Object.prototype.hasOwnProperty.call(RESOURCE_CATEGORY_FOLDERS, slug) ? slug : 'other';
}

export function resourceCategoryFolderName(value) {
  return RESOURCE_CATEGORY_FOLDERS[normaliseResourceCategory(value)];
}
