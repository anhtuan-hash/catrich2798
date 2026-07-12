export const RESOURCE_CATEGORY_FALLBACK = [
  { slug: 'lesson-plan', name_vi: 'Giáo án – Kế hoạch bài dạy', name_en: 'Lesson Plans', description_vi: 'Giáo án, kế hoạch bài dạy và tiến trình tổ chức hoạt động.', description_en: 'Lesson plans, teaching plans and classroom procedures.', icon: 'book-open', tone: 'blue', drive_folder_name: '01_GIAO_AN_KE_HOACH_BAI_DAY', sort_order: 10 },
  { slug: 'presentation', name_vi: 'Bài giảng PowerPoint', name_en: 'Presentations', description_vi: 'Slide bài giảng và học liệu trình chiếu.', description_en: 'Teaching slides and presentation materials.', icon: 'presentation', tone: 'violet', drive_folder_name: '02_BAI_GIANG_TRINH_CHIEU', sort_order: 20 },
  { slug: 'worksheet', name_vi: 'Worksheet – Phiếu học tập', name_en: 'Worksheets', description_vi: 'Phiếu học tập, bài luyện tập và handout.', description_en: 'Worksheets, practice sheets and handouts.', icon: 'file-text', tone: 'green', drive_folder_name: '03_WORKSHEET_PHIEU_HOC_TAP', sort_order: 30 },
  { slug: 'assessment', name_vi: 'Đề kiểm tra', name_en: 'Assessments', description_vi: 'Đề thường xuyên, giữa kì, cuối kì và đề luyện.', description_en: 'Quizzes, midterms, finals and practice tests.', icon: 'clipboard-check', tone: 'red', drive_folder_name: '04_DE_KIEM_TRA', sort_order: 40 },
  { slug: 'answer-key', name_vi: 'Đáp án – Hướng dẫn chấm', name_en: 'Answer Keys', description_vi: 'Đáp án, biểu điểm, rubric và hướng dẫn chấm.', description_en: 'Answer keys, marking schemes and rubrics.', icon: 'key-round', tone: 'amber', drive_folder_name: '05_DAP_AN_HUONG_DAN_CHAM', sort_order: 50 },
  { slug: 'thpt-exam', name_vi: 'Tài liệu ôn thi THPT', name_en: 'THPT Exam Preparation', description_vi: 'Chuyên đề và tài liệu luyện thi tốt nghiệp THPT.', description_en: 'National high-school exam preparation resources.', icon: 'graduation-cap', tone: 'cyan', drive_folder_name: '06_ON_THI_THPT', sort_order: 60 },
  { slug: 'gifted', name_vi: 'Tài liệu học sinh giỏi', name_en: 'Gifted Student Materials', description_vi: 'Chuyên đề nâng cao, đề HSG và tài liệu C1–C2.', description_en: 'Advanced topics, gifted tests and C1–C2 resources.', icon: 'trophy', tone: 'orange', drive_folder_name: '07_HOC_SINH_GIOI', sort_order: 70 },
  { slug: 'audio', name_vi: 'Audio – Listening', name_en: 'Audio & Listening', description_vi: 'File nghe, transcript và tài liệu luyện nghe.', description_en: 'Audio files, transcripts and listening resources.', icon: 'headphones', tone: 'pink', drive_folder_name: '08_AUDIO_LISTENING', sort_order: 80 },
  { slug: 'media', name_vi: 'Video – Hình ảnh', name_en: 'Video & Images', description_vi: 'Video, hình ảnh, infographic và học liệu trực quan.', description_en: 'Videos, images, infographics and visual resources.', icon: 'image', tone: 'indigo', drive_folder_name: '09_VIDEO_HINH_ANH', sort_order: 90 },
  { slug: 'professional-form', name_vi: 'Biểu mẫu chuyên môn', name_en: 'Professional Forms', description_vi: 'Biểu mẫu, biên bản, báo cáo và hồ sơ tổ.', description_en: 'Forms, minutes, reports and department records.', icon: 'files', tone: 'teal', drive_folder_name: '10_BIEU_MAU_CHUYEN_MON', sort_order: 100 },
  { slug: 'reference', name_vi: 'Sách – Tài liệu tham khảo', name_en: 'Books & References', description_vi: 'Sách, giáo trình, nghiên cứu và tài liệu tham khảo.', description_en: 'Books, textbooks, research and references.', icon: 'library', tone: 'slate', drive_folder_name: '11_SACH_TAI_LIEU_THAM_KHAO', sort_order: 110 },
  { slug: 'other', name_vi: 'Chưa phân loại', name_en: 'Uncategorised', description_vi: 'Tài liệu chưa được xếp vào danh mục chính thức.', description_en: 'Resources not yet assigned to a category.', icon: 'folder-question', tone: 'gray', drive_folder_name: '99_CHUA_PHAN_LOAI', sort_order: 999 },
];

const ICONS = {
  'book-open': '📘', presentation: '▣', 'file-text': '📝',
  'clipboard-check': '✓', 'key-round': '⌘', 'graduation-cap': '🎓',
  trophy: '★', headphones: '♫', image: '▶', files: '▤',
  library: '▥', 'folder-question': '?', folder: '□',
};

const ALIASES = {
  books: 'reference', book: 'reference', references: 'reference', textbooks: 'reference',
  'lesson-plans': 'lesson-plan', lesson_plan: 'lesson-plan', 'lesson plan': 'lesson-plan', professional: 'professional-form',
  slides: 'presentation', slide: 'presentation', ppt: 'presentation', pptx: 'presentation', powerpoint: 'presentation',
  worksheets: 'worksheet', handout: 'worksheet', practice: 'worksheet',
  tests: 'assessment', test: 'assessment', exam: 'assessment', exams: 'assessment', quiz: 'assessment',
  answers: 'answer-key', answer: 'answer-key', answer_key: 'answer-key', rubric: 'answer-key',
  thpt: 'thpt-exam', 'national-exam': 'thpt-exam', 'exam-prep': 'thpt-exam',
  hsg: 'gifted', advanced: 'gifted',
  listening: 'audio', mp3: 'audio', wav: 'audio',
  video: 'media', images: 'media', visual: 'media',
  forms: 'professional-form', form: 'professional-form', template: 'professional-form', internal: 'professional-form',
  games: 'other', game: 'other',
};

const VALID = new Set(RESOURCE_CATEGORY_FALLBACK.map((category) => category.slug));

export function normaliseResourceCategory(value) {
  const raw = String(value || '').trim().toLowerCase();
  const slug = ALIASES[raw] || raw;
  return VALID.has(slug) ? slug : 'other';
}

export function decorateCategory(category) {
  return {
    ...category,
    slug: normaliseResourceCategory(category?.slug),
    displayIcon: ICONS[category?.icon] || category?.icon || '□',
    item_count: Number(category?.item_count || 0),
    new_count: Number(category?.new_count || 0),
  };
}

export function categoryName(category, language = 'vi') {
  return language === 'en' ? category?.name_en : category?.name_vi;
}

export function categoryDescription(category, language = 'vi') {
  return language === 'en' ? category?.description_en : category?.description_vi;
}

export function findResourceCategory(value) {
  const slug = normaliseResourceCategory(value);
  return RESOURCE_CATEGORY_FALLBACK.find((category) => category.slug === slug) || RESOURCE_CATEGORY_FALLBACK.at(-1);
}
