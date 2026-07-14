import JSZip from 'jszip';
import { downloadFile, slugify } from './library.js';

export const CURRICULUM_PROJECT_KEY = 'bes-lesson-architect-curriculum-v1131';

export const DIGITAL_COMPETENCE_FRAMEWORK = [
  {
    domain: '1',
    title: 'Data and information literacy',
    components: [
      ['1.1', 'Browsing, searching and filtering data, information and digital content'],
      ['1.2', 'Evaluating data, information and digital content'],
      ['1.3', 'Managing data, information and digital content'],
    ],
  },
  {
    domain: '2',
    title: 'Communication and collaboration in digital environments',
    components: [
      ['2.1', 'Interacting through digital technologies'],
      ['2.2', 'Sharing through digital technologies'],
      ['2.3', 'Engaging in citizenship through digital technologies'],
      ['2.4', 'Collaborating through digital technologies'],
      ['2.5', 'Netiquette'],
      ['2.6', 'Managing digital identity'],
    ],
  },
  {
    domain: '3',
    title: 'Digital content creation',
    components: [
      ['3.1', 'Developing digital content'],
      ['3.2', 'Integrating and re-elaborating digital content'],
      ['3.3', 'Copyright and licences'],
      ['3.4', 'Programming'],
    ],
  },
  {
    domain: '4',
    title: 'Safety',
    components: [
      ['4.1', 'Protecting devices'],
      ['4.2', 'Protecting personal data and privacy'],
      ['4.3', 'Protecting health and well-being'],
      ['4.4', 'Protecting the environment'],
    ],
  },
  {
    domain: '5',
    title: 'Problem solving',
    components: [
      ['5.1', 'Solving technical problems'],
      ['5.2', 'Identifying needs and technological responses'],
      ['5.3', 'Creatively using digital technologies'],
      ['5.4', 'Identifying digital competence gaps'],
    ],
  },
  {
    domain: '6',
    title: 'Artificial intelligence application',
    components: [
      ['6.1', 'Understanding AI, including generative AI'],
      ['6.2', 'Using AI ethically and responsibly'],
      ['6.3', 'Evaluating AI tools'],
    ],
  },
];

export const DEFAULT_CURRICULUM_PROFILE = {
  subject: 'English',
  outputLanguage: 'English',
  yearsExperience: 10,
  level: 'Upper Secondary Education',
  grade: '11',
  orientation: 'Communicative competence development with digital competence integration',
  schoolYear: '2025–2026',
  bookSeries: 'Global Success',
  school: '',
  department: 'Foreign Languages Department',
  teacher: '',
  totalPeriods: '',
  weeks: '35',
  semester1Periods: '',
  semester2Periods: '',
  expectedLessonCount: '',
  firstLessonTitle: '',
  lastLessonTitle: '',
  curriculumUrl: '',
  textbookUrl: '',
  digitalFramework: 'Circular No. 02/2025/TT-BGDĐT',
  digitalCompetenceRequired: true,
  digitalTargetLevel: 'Select an appropriate proficiency descriptor for Grade 11 from the curriculum context',
  englishOnlyOutput: true,
};

export function uid(prefix = 'lesson') {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function safeText(value, max = 120000) {
  const text = String(value || '').replace(/\r/g, '').replace(/[ \t]+\n/g, '\n').replace(/\n{4,}/g, '\n\n').trim();
  if (text.length <= max) return text;
  return `${text.slice(0, max)}\n\n[Nội dung đã được rút gọn do vượt giới hạn xử lý.]`;
}

export function normalizeSearch(value) {
  return String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function extractGoogleDriveId(url) {
  const raw = String(url || '').trim();
  return raw.match(/\/file\/d\/([a-zA-Z0-9_-]+)/)?.[1]
    || raw.match(/[?&]id=([a-zA-Z0-9_-]+)/)?.[1]
    || '';
}

export function classifyReferenceName(filename = '') {
  const name = normalizeSearch(filename);
  if (/khgd|ke hoach giao duc|ke hoach day hoc|ppct|phan phoi chuong trinh/.test(name)) return 'curriculum';
  if (/sach giao khoa|sgk|textbook|student book|global success|english 11|tieng anh 11/.test(name)) return 'textbook';
  return 'unknown';
}

function termsForLesson(row = {}) {
  const source = `${row.title || ''} ${row.theme || ''}`;
  return [...new Set(normalizeSearch(source).split(' ').filter((word) => word.length >= 3 && !['bai', 'thuc', 'hanh', 'chu', 'de', 'tiet', 'lop', 'phan', 'unit', 'lesson', 'review', 'period', 'grade'].includes(word)))].slice(0, 20);
}

export function selectRelevantText(text, row, maxChars = 22000) {
  const raw = safeText(text, 300000);
  if (!raw) return '';
  if (raw.length <= maxChars) return raw;
  const terms = termsForLesson(row);
  const blocks = raw.split(/\n\s*\n|(?=\[PAGE\s+\d+\])/i).map((block) => block.trim()).filter(Boolean);
  const scored = blocks.map((block, index) => {
    const haystack = normalizeSearch(block);
    const score = terms.reduce((sum, term) => sum + (haystack.includes(term) ? Math.max(1, term.length / 3) : 0), 0);
    return { block, index, score };
  });
  scored.sort((a, b) => b.score - a.score || a.index - b.index);
  const selected = [];
  let length = 0;
  for (const item of scored) {
    if (!item.score && selected.length >= 5) continue;
    if (length + item.block.length > maxChars && selected.length) continue;
    selected.push(item);
    length += item.block.length + 2;
    if (length >= maxChars) break;
  }
  if (!selected.length) return raw.slice(0, maxChars);
  return selected.sort((a, b) => a.index - b.index).map((item) => item.block).join('\n\n').slice(0, maxChars);
}

export function buildCurriculumExtractionPrompt({ profile, curriculumText }) {
  return `You are an expert in analysing Vietnamese school curriculum plans.
Extract the COMPLETE teaching sequence for Grade ${profile.grade} English from the curriculum plan below.

CONTEXT
- Subject: ${profile.subject}
- Grade: ${profile.grade}
- School level: ${profile.level}
- School year: ${profile.schoolYear}
- Textbook series: ${profile.bookSeries}
- Expected number of teaching entries: ${profile.expectedLessonCount || 'not predetermined; infer from the curriculum plan'}

EXTRACTION RULES
- Preserve the official Unit, Review and Test sequence.
- Preserve official English lesson titles whenever the source provides them.
- Include Getting Started, Language, Reading, Speaking, Listening, Writing, Communication and Culture/CLIL, Looking Back and Project, Reviews, periodic tests and revision periods.
- Identify exact starting period, ending period and duration.
- Extract learning outcomes, language/skill focus, equipment and digital competence hints where stated.
- Do not invent missing curriculum entries.
- Return valid JSON only, without markdown.

SCHEMA
{
  "summary": {
    "totalPeriods": 0,
    "weeks": 0,
    "semester1Periods": 0,
    "semester2Periods": 0,
    "notes": ""
  },
  "lessons": [
    {
      "order": 1,
      "periodStart": 1,
      "periodEnd": 1,
      "title": "Unit 1: ... - Getting Started",
      "periods": 1,
      "theme": "Unit 1: ...",
      "lessonType": "Getting Started",
      "skillFocus": "Integrated skills",
      "languageFocus": "Vocabulary / pronunciation / grammar",
      "digitalCompetences": "Suggested component codes, if the source provides or clearly implies them",
      "requirements": "Learning outcomes",
      "equipment": "Teaching equipment and learning materials"
    }
  ]
}

CURRICULUM PLAN CONTENT
${safeText(curriculumText, 70000)}`;
}

export function parseCurriculumJson(raw) {
  const cleaned = String(raw || '').replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```$/i, '').trim();
  let parsed;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (match) parsed = JSON.parse(match[0]);
  }
  if (!parsed) throw new Error('AI không trả về JSON hợp lệ.');
  const source = Array.isArray(parsed) ? parsed : parsed.lessons;
  if (!Array.isArray(source)) throw new Error('Không tìm thấy danh sách lessons trong kết quả AI.');
  const rows = source.map((item, index) => {
    const start = Number(item.periodStart || item.period || item.from || index + 1) || index + 1;
    const periods = Math.max(1, Number(item.periods || item.duration || 1) || 1);
    const end = Number(item.periodEnd || item.to || (start + periods - 1)) || (start + periods - 1);
    return {
      id: uid('row'),
      order: Number(item.order) || index + 1,
      periodStart: Math.min(start, end),
      periodEnd: Math.max(start, end),
      title: String(item.title || item.lessonTitle || `Bài ${index + 1}`).trim(),
      periods: Math.max(1, Number(item.periods) || Math.abs(end - start) + 1),
      theme: String(item.theme || item.topic || item.unit || '').trim(),
      lessonType: String(item.lessonType || item.section || '').trim(),
      skillFocus: String(item.skillFocus || item.skills || '').trim(),
      languageFocus: String(item.languageFocus || item.language || '').trim(),
      digitalCompetences: String(item.digitalCompetences || item.digitalCompetenceHints || '').trim(),
      requirements: String(item.requirements || item.outcomes || '').trim(),
      equipment: String(item.equipment || item.materials || '').trim(),
      selected: true,
    };
  }).sort((a, b) => a.order - b.order || a.periodStart - b.periodStart);
  return { rows, summary: parsed.summary || {} };
}

export function parseCurriculumLocally(text) {
  const rows = [];
  const lines = String(text || '').split('\n').map((line) => line.replace(/\s+/g, ' ').trim()).filter(Boolean);
  for (const line of lines) {
    const match = line.match(/^(?:tiết\s*)?(\d{1,3})(?:\s*[-–]\s*(\d{1,3}))?\s*[|.:;-]?\s*(.+)$/i);
    if (!match) continue;
    const start = Number(match[1]);
    const end = Number(match[2] || match[1]);
    let title = match[3].replace(/^\d+\s*[|.;:-]\s*/, '').trim();
    if (title.length < 4 || title.length > 220) continue;
    rows.push({
      id: uid('row'),
      order: rows.length + 1,
      periodStart: Math.min(start, end),
      periodEnd: Math.max(start, end),
      periods: Math.abs(end - start) + 1,
      title,
      theme: '',
      lessonType: '',
      skillFocus: '',
      languageFocus: '',
      digitalCompetences: '',
      requirements: '',
      equipment: '',
      selected: true,
    });
  }
  return rows;
}

export function validateCurriculum(profile, rows) {
  const issues = [];
  const sorted = [...rows].sort((a, b) => Number(a.periodStart) - Number(b.periodStart));
  const total = rows.reduce((sum, row) => sum + (Number(row.periods) || Math.abs(Number(row.periodEnd) - Number(row.periodStart)) + 1 || 1), 0);
  const expectedCount = Number(profile.expectedLessonCount || 0);
  const expectedPeriods = Number(profile.totalPeriods || 0);
  if (!rows.length) issues.push({ level: 'error', message: 'Chưa có danh sách bài dạy.' });
  if (expectedCount && rows.length !== expectedCount) issues.push({ level: 'warning', message: `Số bài hiện có ${rows.length}, khác số bài dự kiến ${expectedCount}.` });
  if (expectedPeriods && total !== expectedPeriods) issues.push({ level: 'warning', message: `Tổng số tiết từ bảng là ${total}, khác tổng số tiết khai báo ${expectedPeriods}.` });
  for (let i = 1; i < sorted.length; i += 1) {
    const previous = sorted[i - 1];
    const current = sorted[i];
    if (Number(current.periodStart) <= Number(previous.periodEnd)) issues.push({ level: 'error', message: `Tiết bị trùng giữa “${previous.title}” và “${current.title}”.` });
    if (Number(current.periodStart) > Number(previous.periodEnd) + 1) issues.push({ level: 'warning', message: `Thiếu tiết ${Number(previous.periodEnd) + 1}–${Number(current.periodStart) - 1}.` });
  }
  if (profile.firstLessonTitle && rows[0] && !normalizeSearch(rows[0].title).includes(normalizeSearch(profile.firstLessonTitle))) {
    issues.push({ level: 'warning', message: `Bài đầu chưa khớp “${profile.firstLessonTitle}”.` });
  }
  if (profile.lastLessonTitle && rows.at(-1) && !normalizeSearch(rows.at(-1).title).includes(normalizeSearch(profile.lastLessonTitle))) {
    issues.push({ level: 'warning', message: `Bài cuối chưa khớp “${profile.lastLessonTitle}”.` });
  }
  return { issues, totalPeriods: total, lessonCount: rows.length, ok: !issues.some((item) => item.level === 'error') };
}

function labelPeriod(row) {
  const start = Number(row.periodStart) || 1;
  const end = Number(row.periodEnd) || start;
  return start === end ? String(start) : `${start}–${end}`;
}

export function buildAnnualLessonPrompt({ profile, row, curriculumText, textbookText, extraRequirements = '' }) {
  const relevantBook = selectRelevantText(textbookText, row, 26000);
  const relevantPlan = selectRelevantText(curriculumText, row, 12000);
  return `You are an experienced Grade ${profile.grade} English teacher with ${profile.yearsExperience || 'many'} years of teaching experience at ${profile.level} level.
Write a COMPLETE LESSON PLAN in ENGLISH for the ${profile.subject} curriculum, aligned with the ${profile.schoolYear} school curriculum plan and the Grade ${profile.grade} ${profile.bookSeries} textbook.

NON-NEGOTIABLE LANGUAGE RULE
- The entire exported lesson plan must be written in English.
- Vietnamese may appear only inside proper names of the school, department or teacher, and in official legal document numbers.
- Do not use Vietnamese headings, instructions, activity labels, worksheet directions or answer keys.
- Do not explain that the document was generated by AI.

LESSON CONTEXT
- Sequence number: ${row.order}
- Period(s) in the curriculum distribution: ${labelPeriod(row)}
- Lesson title: ${row.title}
- Duration: ${row.periods} period(s)
- Unit/theme: ${row.theme || '(according to the curriculum plan)'}
- Lesson type: ${row.lessonType || '(infer from the curriculum plan and textbook)'}
- Skill focus: ${row.skillFocus || '(infer carefully)'}
- Language focus: ${row.languageFocus || '(infer carefully)'}
- Required learning outcomes: ${row.requirements || '(infer cautiously from the curriculum plan and textbook)'}
- Equipment/materials in the curriculum plan: ${row.equipment || '(propose suitable items)'}
- Existing digital competence hints: ${row.digitalCompetences || '(select relevant components from the official framework)'}

INSTITUTIONAL INFORMATION
- School: ${profile.school || '[SCHOOL]'}
- Department: ${profile.department || '[DEPARTMENT]'}
- Teacher: ${profile.teacher || '[TEACHER]'}

MANDATORY DOCUMENT FORMAT
- A4; margins: left 2 cm, right 1.5 cm, top 2 cm, bottom 2 cm.
- Times New Roman, 13 pt; single line spacing; 6 pt after each paragraph.
- Do not use separator lines such as ---, ***, ___ or similar.
- Keep the lesson plan continuous and separate sections only with headings.
- Activities 1 and 2 must use exactly one two-column table: “Teacher’s and Students’ Activities” and “Expected Outcomes / Products”.
- Tables must have light borders and no background fill.
- Activities 3 and 4 must be normal text, not tables.

MANDATORY STRUCTURE
LESSON PLAN
${profile.school || '[SCHOOL]'}
${profile.department || '[DEPARTMENT]'}
${profile.teacher || '[TEACHER]'}

UNIT / THEME: ${row.theme || '[UNIT / THEME]'}
LESSON TITLE: ${row.title}
Subject: English; Grade: ${profile.grade}
Duration: ${row.periods} period(s)
Period(s) in the Curriculum Distribution: ${labelPeriod(row)}

I. OBJECTIVES
1. Knowledge and Language
- State precise vocabulary, pronunciation, grammar, discourse or skill knowledge appropriate to this lesson.
2. Competences
2.1. General Competences
- Include self-directed learning, communication, collaboration, problem solving or creativity only when demonstrated by the lesson.
2.2. English Communicative Competences
- State observable listening, speaking, reading and/or writing outcomes with appropriate performance conditions.
2.3. Digital Competences
- Integrate the Digital Competence Framework for Learners under Circular No. 02/2025/TT-BGDĐT.
- Select only 1–3 component competences that are genuinely relevant to this lesson; never list all six domains mechanically.
- For each selected component, write: code and English name; lesson-specific performance indicator; digital tool/resource; observable evidence or product; safety, privacy, copyright or AI-ethics condition where relevant.
- Use the following official six-domain catalogue:
1. Data and information literacy: 1.1 Browsing, searching and filtering data, information and digital content; 1.2 Evaluating data, information and digital content; 1.3 Managing data, information and digital content
2. Communication and collaboration in digital environments: 2.1 Interacting through digital technologies; 2.2 Sharing through digital technologies; 2.3 Engaging in citizenship through digital technologies; 2.4 Collaborating through digital technologies; 2.5 Netiquette; 2.6 Managing digital identity
3. Digital content creation: 3.1 Developing digital content; 3.2 Integrating and re-elaborating digital content; 3.3 Copyright and licences; 3.4 Programming
4. Safety: 4.1 Protecting devices; 4.2 Protecting personal data and privacy; 4.3 Protecting health and well-being; 4.4 Protecting the environment
5. Problem solving: 5.1 Solving technical problems; 5.2 Identifying needs and technological responses; 5.3 Creatively using digital technologies; 5.4 Identifying digital competence gaps
6. Artificial intelligence application: 6.1 Understanding AI, including generative AI; 6.2 Using AI ethically and responsibly; 6.3 Evaluating AI tools
3. Personal Qualities
- State relevant qualities such as responsibility, diligence, honesty, respect, cooperation or global citizenship.

II. TEACHING EQUIPMENT AND LEARNING MATERIALS
1. Teacher
2. Students
- Include digital tools only when they add pedagogical value.
- Provide a non-digital alternative when internet access or devices may be unavailable.

III. TEACHING PROCEDURE
1. Class Organisation
2. Review / Checking the Previous Lesson, if applicable
3. New Lesson

Activity 1: Warm-up
- Objectives
- Content
- Expected product
- Organisation: use one two-column table.
The left column must contain four clearly labelled steps:
Step 1. Task Assignment
- Give 2–3 specific, actionable tasks.
Step 2. Task Performance
- Describe individual, pair or group work and teacher support.
Step 3. Reporting and Discussion
- Describe presentation, questioning, peer feedback and teacher facilitation.
Step 4. Conclusion and Transition
- Consolidate outcomes and lead into the lesson.
The right column must list corresponding learner products/evidence for each step.
When a digital competence is practised, tag the relevant evidence with its code, for example [DC 1.2].

Activity 2: Language and Skill Development
- Divide into 2–4 sub-activities when needed.
- Each sub-activity must include Objectives, Content, Expected product and the same two-column four-step procedure.
- Adapt the sequence to the Global Success lesson type:
  - Reading/Listening: pre-, while- and post-task stages.
  - Speaking: preparation, controlled practice, guided interaction and freer production.
  - Writing: analysis, planning, drafting, peer review and revision.
  - Language: vocabulary, pronunciation and grammar in context.
  - Getting Started/Communication and Culture/CLIL/Project: integrated communicative tasks.
- Use the textbook content and learning outcomes; avoid generic activities.

Activity 3: Practice
- Write in normal text, not a table.
- Include Objectives, Content, Expected product and four steps:
Step 1. Task Assignment
Step 2. Task Performance
Step 3. Reporting and Discussion
Step 4. Feedback and Consolidation
- Provide sufficient exercises or communicative tasks for the stated duration.
- Include differentiation for learners who need support and extension for stronger learners.

Activity 4: Application / Production
- Write in normal text, not a table.
- Use a meaningful real-life or authentic communication task.
- Include Objectives, Content, Expected product and the same four steps.
- When technology is used, require responsible use, source acknowledgement, privacy protection and an offline alternative.

WORKSHEET
- Normal text only, no table.
- Include all learner tasks and clear English instructions.
- Assign specific responsibilities to 2–4 groups when group work is appropriate.
- Include prompts, organisers, diagrams or fill-in sections when suitable.
- The worksheet must be usable without additional teacher rewriting.

MULTIPLE-CHOICE / TRUE-FALSE QUESTIONS
- Exactly 5 items aligned with the lesson.
- Use English only.
- Include an answer key at the end in this format: Answer key: 1.C, 2.B, 3.A, 4.D, 5.C.

DIGITAL COMPETENCE QUALITY RULES
- Digital competence must be visible in learner actions and products, not merely listed in Objectives.
- Do not force AI into every lesson.
- If generative AI is used, require verification of output, disclosure of AI assistance, protection of personal data, respect for copyright, and independent learner judgement.
- Never ask students to upload sensitive personal information.
- Ensure accessibility and inclusive participation for learners with limited devices or connectivity.
- Add a concise “Digital Competence Evidence” note at the end of each relevant activity.

QUALITY REQUIREMENTS
- Align with the curriculum outcomes, the Global Success textbook and the spirit of Official Dispatch No. 5512/BGDĐT-GDTrH.
- Use active, communicative and learner-centred pedagogy.
- Ensure time allocation is realistic.
- Do not invent textbook content. If source evidence is insufficient, write “[Further textbook verification required]” at the exact point concerned.
- Complete the entire lesson without truncation.

RELEVANT CURRICULUM EXCERPT
${relevantPlan || '(no extracted curriculum text available)'}

RELEVANT TEXTBOOK EXCERPT
${relevantBook || '(no extracted textbook text available)'}

ADDITIONAL TEACHER REQUIREMENTS
${extraRequirements || '(none)'}`;
}

export function validateEnglishLessonOutput(text) {
  const source = String(text || '');
  const required = [
    'LESSON PLAN',
    'I. OBJECTIVES',
    'II. TEACHING EQUIPMENT AND LEARNING MATERIALS',
    'III. TEACHING PROCEDURE',
    'Activity 1: Warm-up',
    'Activity 2:',
    'Activity 3: Practice',
    'Activity 4: Application',
    'WORKSHEET',
    'Answer key:',
  ];
  const vietnameseMarkers = [
    'KẾ HOẠCH BÀI DẠY', 'Mục tiêu', 'Năng lực', 'Thiết bị dạy học',
    'Tiến trình dạy học', 'Hoạt động 1', 'Hoạt động 2', 'Hoạt động 3',
    'Hoạt động 4', 'Phiếu học tập', 'Câu hỏi trắc nghiệm', 'Bước 1',
    'Giáo viên giao nhiệm vụ', 'Học sinh thực hiện nhiệm vụ', 'Đáp án:',
  ];
  const missing = required.filter((item) => !source.toLowerCase().includes(item.toLowerCase()));
  const vietnamese = vietnameseMarkers.filter((item) => source.toLowerCase().includes(item.toLowerCase()));
  const digitalCodeCount = new Set(source.match(/(?:DC\s*)?[1-6]\.[1-6]/g) || []).size;
  return {
    ok: missing.length === 0 && vietnamese.length === 0 && digitalCodeCount >= 1,
    missing,
    vietnamese,
    digitalCodeCount,
  };
}

export function buildEnglishCorrectionPrompt(original, validation) {
  return `Rewrite the lesson plan below so that it complies fully with the requirements.
- Use English only, except proper names and official document numbers.
- Preserve the lesson content, timing and factual alignment.
- Restore every mandatory heading that is missing.
- Remove all Vietnamese instructional language.
- Include 1–3 relevant digital competence component codes from Circular No. 02/2025/TT-BGDĐT and show evidence in activities.
- Keep Activities 1 and 2 as two-column markdown tables and Activities 3 and 4 as normal text.
- Do not add separator lines.
Missing headings: ${validation.missing.join(', ') || 'none'}
Vietnamese markers detected: ${validation.vietnamese.join(', ') || 'none'}
Digital competence codes detected: ${validation.digitalCodeCount}

LESSON PLAN TO REVISE
${String(original || '').slice(0, 90000)}`;
}

export function stripForbiddenSeparators(text) {
  return String(text || '')
    .split('\n')
    .filter((line) => !/^\s*(?:-{3,}|\*{3,}|_{3,})\s*$/.test(line))
    .join('\n')
    .replace(/\n{4,}/g, '\n\n')
    .trim();
}

function inlineMarkup(value) {
  return String(value || '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/__(.+?)__/g, '<strong>$1</strong>');
}

function isTableSeparator(line) {
  return /^\s*\|?\s*:?-{3,}:?\s*(?:\|\s*:?-{3,}:?\s*)+\|?\s*$/.test(line);
}

function parseTableRow(line) {
  return String(line || '').trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map((cell) => cell.trim());
}

export function lessonTextToHtml(text) {
  const clean = stripForbiddenSeparators(text);
  const lines = clean.split('\n');
  const html = [];
  let index = 0;
  let firstPlan = true;
  while (index < lines.length) {
    const line = lines[index].trim();
    if (!line) { index += 1; continue; }
    if (line.includes('|') && index + 1 < lines.length && isTableSeparator(lines[index + 1])) {
      const headers = parseTableRow(line);
      index += 2;
      const rows = [];
      while (index < lines.length && lines[index].includes('|') && lines[index].trim()) {
        rows.push(parseTableRow(lines[index]));
        index += 1;
      }
      html.push(`<table class="activity-table"><thead><tr>${headers.map((cell) => `<th>${inlineMarkup(cell)}</th>`).join('')}</tr></thead><tbody>${rows.map((row) => `<tr>${row.map((cell) => `<td>${inlineMarkup(cell).replace(/&lt;br\s*\/?\s*&gt;/gi, '<br>')}</td>`).join('')}</tr>`).join('')}</tbody></table>`);
      continue;
    }
    if (/^(KẾ HOẠCH BÀI DẠY|LESSON PLAN)$/i.test(line)) {
      if (!firstPlan) html.push('<div class="page-break"></div>');
      firstPlan = false;
      html.push(`<h1>${inlineMarkup(line)}</h1>`);
    } else if (/^(CHỦ ĐỀ|TÊN BÀI DẠY|Môn:|Thời lượng:|Tiết theo PPCT:|UNIT \/ THEME:|LESSON TITLE:|Subject:|Duration:|Period\(s\) in the Curriculum Distribution:)/i.test(line)) {
      html.push(`<p class="lesson-meta"><strong>${inlineMarkup(line)}</strong></p>`);
    } else if (/^(I|II|III|IV|V|VI|VII)\.\s+/i.test(line)) {
      html.push(`<h2>${inlineMarkup(line)}</h2>`);
    } else if (/^(Hoạt động\s+\d+|PHIẾU HỌC TẬP|CÂU HỎI TRẮC NGHIỆM|Activity\s+\d+|WORKSHEET|MULTIPLE-CHOICE|TRUE-FALSE)/i.test(line)) {
      html.push(`<h3>${inlineMarkup(line)}</h3>`);
    } else if (/^(Bước\s+\d+\.|Step\s+\d+\.|\d+\.\d+\.|\d+\.)\s+/i.test(line)) {
      html.push(`<p class="step"><strong>${inlineMarkup(line)}</strong></p>`);
    } else if (/^-\s+/.test(line)) {
      const items = [];
      while (index < lines.length && /^-\s+/.test(lines[index].trim())) {
        items.push(lines[index].trim().replace(/^-\s+/, ''));
        index += 1;
      }
      html.push(`<ul>${items.map((item) => `<li>${inlineMarkup(item)}</li>`).join('')}</ul>`);
      continue;
    } else {
      html.push(`<p>${inlineMarkup(line)}</p>`);
    }
    index += 1;
  }
  return html.join('\n');
}

function documentStyles() {
  return `
@page Section1 { size: 21cm 29.7cm; margin: 2cm 1.5cm 2cm 2cm; }
div.Section1 { page: Section1; }
body { font-family: "Times New Roman", serif; font-size: 13pt; line-height: 1; color: #000; }
p { margin: 0 0 6pt 0; }
h1 { text-align: center; font-size: 13pt; margin: 0 0 6pt; font-weight: 700; }
h2 { font-size: 13pt; margin: 12pt 0 6pt; font-weight: 700; }
h3 { font-size: 13pt; margin: 10pt 0 6pt; font-weight: 700; }
ul { margin: 0 0 6pt 22pt; padding: 0; }
li { margin: 0 0 3pt 0; }
table { width: 100%; border-collapse: collapse; margin: 6pt 0; page-break-inside: auto; }
th, td { border: 0.5pt solid #777; padding: 5pt; vertical-align: top; font-size: 13pt; line-height: 1; }
th { background: transparent; text-align: center; font-weight: 700; }
.activity-table th:first-child, .activity-table td:first-child { width: 68%; }
.activity-table th:nth-child(2), .activity-table td:nth-child(2) { width: 32%; }
.curriculum-table th, .curriculum-table td { font-size: 12pt; }
.page-break { page-break-before: always; }
.lesson-meta { margin-bottom: 3pt; }
.step { margin-top: 4pt; }
`;
}

function wrapWord(title, body) {
  return `<!doctype html><html><head><meta charset="utf-8"><title>${inlineMarkup(title)}</title><style>${documentStyles()}</style></head><body><div class="Section1">${body}</div></body></html>`;
}

export function curriculumTableHtml(rows) {
  return `<h1>ANNUAL TEACHING SEQUENCE FROM THE SCHOOL CURRICULUM PLAN</h1><table class="curriculum-table"><thead><tr><th>Period(s)</th><th>Unit / Lesson</th><th>Duration</th><th>Lesson type</th><th>Skill / Language focus</th><th>Digital competence</th></tr></thead><tbody>${rows.map((row) => `<tr><td>${inlineMarkup(labelPeriod(row))}</td><td>${inlineMarkup(row.title)}</td><td>${inlineMarkup(row.periods)}</td><td>${inlineMarkup(row.lessonType || row.theme)}</td><td>${inlineMarkup([row.skillFocus, row.languageFocus].filter(Boolean).join(' / '))}</td><td>${inlineMarkup(row.digitalCompetences || '')}</td></tr>`).join('')}</tbody></table>`;
}

export function buildCombinedWordDoc(profile, rows, generatedLessons) {
  const ordered = [...rows].sort((a, b) => a.order - b.order);
  const lessons = ordered.map((row) => generatedLessons[row.id]).filter(Boolean).map((lesson) => lessonTextToHtml(lesson)).join('\n');
  const cover = `<h1>ANNUAL LESSON PLANS FOR GRADE ${inlineMarkup(profile.grade)} ENGLISH</h1><p style="text-align:center"><strong>${inlineMarkup(profile.bookSeries)} · School Year ${inlineMarkup(profile.schoolYear)}</strong></p><p style="text-align:center">School: ${inlineMarkup(profile.school || '')}</p><p style="text-align:center">Department: ${inlineMarkup(profile.department || '')}</p><p style="text-align:center">Teacher: ${inlineMarkup(profile.teacher || '')}</p><p style="text-align:center">Digital Competence Framework: ${inlineMarkup(profile.digitalFramework || 'Circular No. 02/2025/TT-BGDĐT')}</p><div class="page-break"></div>`;
  return wrapWord(`Grade ${profile.grade} English Lesson Plans ${profile.schoolYear}`, `${cover}${curriculumTableHtml(ordered)}<div class="page-break"></div>${lessons}`);
}

export function buildSingleWordDoc(profile, row, content) {
  return wrapWord(`${row.title} - Tiết ${labelPeriod(row)}`, lessonTextToHtml(content));
}

export function downloadCombinedWord(profile, rows, lessons) {
  const filename = `${slugify(`annual-lesson-plans-${profile.subject}-${profile.grade}-${profile.schoolYear}`)}.doc`;
  downloadFile(filename, buildCombinedWordDoc(profile, rows, lessons), 'application/msword;charset=utf-8');
}

export async function downloadLessonZip(profile, rows, lessons) {
  const zip = new JSZip();
  zip.file('00-Annual-Teaching-Sequence.doc', wrapWord('Danh sách bài dạy', curriculumTableHtml(rows)));
  rows.forEach((row) => {
    const content = lessons[row.id];
    if (!content) return;
    const period = labelPeriod(row).replace(/–/g, '-');
    zip.file(`${String(row.order).padStart(2, '0')}-Periods-${period}-${slugify(row.title)}.doc`, buildSingleWordDoc(profile, row, content));
  });
  zip.file('du-an-giao-an.json', JSON.stringify({ version: '11.3.1', profile, rows, lessons }, null, 2));
  const blob = await zip.generateAsync({ type: 'blob' });
  downloadFile(`${slugify(`english-lesson-plans-${profile.grade}`)}-word.zip`, blob, 'application/zip');
}

export function saveCurriculumDraft(ownerId, payload) {
  const key = `${CURRICULUM_PROJECT_KEY}:${ownerId || 'guest'}`;
  const compact = { ...payload, curriculumText: safeText(payload.curriculumText, 180000), textbookText: safeText(payload.textbookText, 420000) };
  localStorage.setItem(key, JSON.stringify(compact));
}

export function loadCurriculumDraft(ownerId) {
  try {
    const key = `${CURRICULUM_PROJECT_KEY}:${ownerId || 'guest'}`;
    return JSON.parse(localStorage.getItem(key) || 'null');
  } catch {
    return null;
  }
}

export function exportCurriculumProject(profile, rows, lessons, curriculumText = '', textbookText = '') {
  const payload = { version: '11.3.1', exportedAt: new Date().toISOString(), profile, rows, lessons, curriculumText, textbookText };
  downloadFile(`${slugify(`lesson-plan-project-${profile.subject}-${profile.grade}`)}.json`, JSON.stringify(payload, null, 2), 'application/json;charset=utf-8');
}
