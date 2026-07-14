import React, { useMemo, useState } from 'react';
import { callAI } from '../utils/gemini.js';
import { addHistoryEntry, exportAsHtml, exportAsWord, savePromptEntry, slugify as librarySlugify } from '../utils/library.js';
import { loadMammoth, loadPdfjs } from '../utils/documentParsers.js';
import LessonArchitectCurriculumBuilder from '../components/LessonArchitectCurriculumBuilder.jsx';

const METHODS = ['TBLT', 'CLT', 'ESA', 'PPP', 'Project-based', 'Flipped classroom', 'Blended learning'];
const GRADES = ['Grade 6', 'Grade 7', 'Grade 8', 'Grade 9', 'Grade 10', 'Grade 11', 'Grade 12', 'THPT mixed'];
const BOOKS = ['Global Success', 'Friends Global', 'i-Learn Smart World', 'Bright', 'English Discovery', 'Explore New Worlds', 'Other / Custom'];
const LESSON_TYPES = ['Getting Started', 'Language / Grammar', 'A Closer Look', 'Reading', 'Speaking', 'Listening', 'Writing', 'Communication and Culture', 'Looking Back', 'Project', 'Review'];

const DIGITAL_COMPETENCE_DOMAINS = [
  { id: 'info', code: '1', title: 'Data and information literacy', vi: 'Khai thác dữ liệu và thông tin', sample: '1.1 search and filter; 1.2 evaluate sources; 1.3 manage digital information.' },
  { id: 'comm', code: '2', title: 'Communication and collaboration in digital environments', vi: 'Giao tiếp và hợp tác trong môi trường số', sample: '2.1 interact; 2.2 share; 2.4 collaborate; 2.5 apply netiquette; 2.6 manage digital identity.' },
  { id: 'content', code: '3', title: 'Digital content creation', vi: 'Sáng tạo nội dung số', sample: '3.1 develop content; 3.2 integrate and re-elaborate; 3.3 respect copyright and licences.' },
  { id: 'safety', code: '4', title: 'Safety', vi: 'An toàn', sample: '4.1 protect devices; 4.2 protect personal data and privacy; 4.3 protect health and well-being; 4.4 protect the environment.' },
  { id: 'problem', code: '5', title: 'Problem solving', vi: 'Giải quyết vấn đề', sample: '5.1 solve technical problems; 5.2 identify needs and technological responses; 5.3 use digital technology creatively; 5.4 identify competence gaps.' },
  { id: 'ai', code: '6', title: 'Artificial intelligence application', vi: 'Ứng dụng trí tuệ nhân tạo', sample: '6.1 understand AI and GenAI; 6.2 use AI ethically and responsibly; 6.3 evaluate AI tools.' },
];

const LESSON_WORKFLOWS = [
  {
    id: 'existing-plan',
    icon: '🧾',
    titleVi: 'Bổ sung giáo án có sẵn',
    title: 'Improve existing lesson plan',
    descVi: 'Dán/tải giáo án cũ, chọn năng lực số, AI viết phần bổ sung phù hợp.',
    desc: 'Upload/paste a plan, select competences, and let AI add the needed section.',
  },
  {
    id: 'material-to-plan',
    icon: '📚',
    titleVi: 'Từ tài liệu/bài dạy',
    title: 'From materials',
    descVi: 'Dán/tải học liệu, AI phân tích, gợi ý hướng dạy và năng lực số.',
    desc: 'Upload materials; AI analyses them and suggests a lesson direction.',
  },
  {
    id: 'keyword-to-plan',
    icon: '✨',
    titleVi: 'Từ từ khóa/yêu cầu',
    title: 'From keywords',
    descVi: 'Nhập chủ điểm/từ khóa, AI đề xuất hướng dạy và hoàn thiện giáo án.',
    desc: 'Enter keywords; AI suggests a direction and completes the lesson plan.',
  },
];

function getWorkflowLabel(id, language = 'vi') {
  const found = LESSON_WORKFLOWS.find((item) => item.id === id) || LESSON_WORKFLOWS[1];
  return language === 'vi' ? found.titleVi : found.title;
}


function downloadFile(filename, content, type = 'text/plain;charset=utf-8') {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function escapeHtml(value) {
  return String(value || '').replace(/[&<>"']/g, (char) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  }[char]));
}

function safeTrim(text, max = 32000) {
  const clean = String(text || '').replace(/\r/g, '').replace(/[ \t]+/g, ' ').replace(/\n{4,}/g, '\n\n').trim();
  if (clean.length <= max) return clean;
  return `${clean.slice(0, max)}\n\n[TRIMMED: original file was longer. Use only the most relevant lesson content above.]`;
}

function stripHtml(html) {
  return String(html || '')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>|<\/div>|<\/h\d>|<\/li>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function parsePageRange(rangeText, maxPages) {
  const raw = String(rangeText || '').trim();
  if (!raw) return Array.from({ length: Math.min(maxPages, 80) }, (_, i) => i + 1);
  const pages = new Set();
  raw.split(',').map((part) => part.trim()).filter(Boolean).forEach((part) => {
    const match = part.match(/^(\d+)\s*-\s*(\d+)$/);
    if (match) {
      const a = Math.max(1, Number(match[1]));
      const b = Math.min(maxPages, Number(match[2]));
      for (let n = Math.min(a, b); n <= Math.max(a, b); n += 1) pages.add(n);
    } else {
      const n = Number(part);
      if (n >= 1 && n <= maxPages) pages.add(n);
    }
  });
  return pages.size ? [...pages].sort((a, b) => a - b) : Array.from({ length: Math.min(maxPages, 80) }, (_, i) => i + 1);
}

function normalizeForSearch(value) {
  return String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function getPdfFocusTerms({ form = {}, pdfFocus = '' } = {}) {
  const source = [pdfFocus, form.lessonTitle, form.unit, form.query]
    .filter(Boolean)
    .join(' ')
    .replace(/create|lesson|plan|unit|period|grade|minutes|for|about|level|tạo|soạn|giáo án/gi, ' ');
  const terms = normalizeForSearch(source)
    .split(/\s+/)
    .filter((word) => word.length >= 4 && !['english', 'global', 'success', 'lesson', 'grade', 'unit', 'closer', 'look', 'reading', 'speaking', 'writing', 'language'].includes(word));
  return [...new Set(terms)].slice(0, 18);
}

function estimateItemHeight(item) {
  const t = item.transform || [];
  return Math.abs(t[3] || item.height || 10) || 10;
}

function extractLinesFromPdfItems(items, viewportWidth = 800) {
  const normalized = items
    .map((item) => {
      const str = String(item.str || '').replace(/\s+/g, ' ').trim();
      if (!str) return null;
      const transform = item.transform || [1, 0, 0, 10, 0, 0];
      return {
        str,
        x: Number(transform[4] || 0),
        y: Number(transform[5] || 0),
        width: Number(item.width || 0),
        height: estimateItemHeight(item),
      };
    })
    .filter(Boolean)
    .sort((a, b) => (Math.abs(b.y - a.y) > 3 ? b.y - a.y : a.x - b.x));

  const lineBuckets = [];
  normalized.forEach((item) => {
    const tolerance = Math.max(2.5, Math.min(7, item.height * 0.45));
    let line = lineBuckets.find((bucket) => Math.abs(bucket.y - item.y) <= tolerance);
    if (!line) {
      line = { y: item.y, height: item.height, items: [] };
      lineBuckets.push(line);
    }
    line.items.push(item);
    line.y = (line.y * (line.items.length - 1) + item.y) / line.items.length;
    line.height = Math.max(line.height, item.height);
  });

  lineBuckets.sort((a, b) => b.y - a.y);

  const lines = lineBuckets.map((line) => {
    const sorted = line.items.sort((a, b) => a.x - b.x);
    let output = '';
    let lastRight = null;
    let lastCharWidth = 4;
    sorted.forEach((item, idx) => {
      const charWidth = item.width && item.str.length ? Math.max(2, item.width / item.str.length) : lastCharWidth;
      if (idx > 0 && lastRight !== null) {
        const gap = item.x - lastRight;
        if (gap > charWidth * 7) output += '\n    '; // likely second column or side note on same baseline
        else if (gap > charWidth * 0.6) output += ' ';
      }
      output += item.str;
      lastRight = item.x + (item.width || item.str.length * charWidth);
      lastCharWidth = charWidth;
    });
    const minX = Math.min(...sorted.map((i) => i.x));
    const maxX = Math.max(...sorted.map((i) => i.x + (i.width || 0)));
    const zone = minX < viewportWidth * 0.45 && maxX > viewportWidth * 0.55 ? 'full' : (maxX < viewportWidth * 0.58 ? 'left' : 'right');
    return { text: output.trim(), y: line.y, minX, maxX, zone };
  }).filter((line) => line.text);

  // If a textbook page has two columns, reading pure top-to-bottom can mix left and right columns.
  // This heuristic reads a page by columns when most lines sit clearly on left/right.
  const columnLines = lines.filter((line) => line.zone !== 'full');
  const shouldColumnize = columnLines.length >= Math.max(6, lines.length * 0.45);
  if (shouldColumnize) {
    const full = lines.filter((line) => line.zone === 'full');
    const left = lines.filter((line) => line.zone === 'left');
    const right = lines.filter((line) => line.zone === 'right');
    const topFull = full.filter((line) => line.y > Math.max(...left.concat(right).map((x) => x.y), 0));
    const bodyFull = full.filter((line) => !topFull.includes(line));
    return [...topFull, ...left, ...right, ...bodyFull]
      .map((line) => line.text)
      .filter(Boolean);
  }
  return lines.map((line) => line.text).filter(Boolean);
}

function removeRepeatedPdfHeaders(pages) {
  const candidates = new Map();
  pages.forEach((page) => {
    const edgeLines = [...page.lines.slice(0, 3), ...page.lines.slice(-3)]
      .map((line) => line.trim())
      .filter((line) => line.length >= 3 && line.length <= 90);
    edgeLines.forEach((line) => candidates.set(line, (candidates.get(line) || 0) + 1));
  });
  const repeated = new Set([...candidates.entries()].filter(([, count]) => count >= Math.max(3, Math.ceil(pages.length * 0.45))).map(([line]) => line));
  return pages.map((page) => ({
    ...page,
    lines: page.lines.filter((line) => !repeated.has(line.trim())),
  }));
}

function focusPdfPages(pages, focusTerms, enabled = true) {
  if (!enabled || !focusTerms.length || pages.length <= 3) return pages;
  const hits = new Set();
  pages.forEach((page, idx) => {
    const haystack = normalizeForSearch(page.lines.join(' '));
    const score = focusTerms.reduce((sum, term) => sum + (haystack.includes(term) ? 1 : 0), 0);
    if (score >= 1) {
      hits.add(idx);
      if (idx > 0) hits.add(idx - 1);
      if (idx < pages.length - 1) hits.add(idx + 1);
    }
  });
  if (!hits.size) return pages;
  return pages.filter((_, idx) => hits.has(idx));
}

function formatPdfExtraction(pages, { mode = 'smart' } = {}) {
  return pages.map((page) => {
    const lines = page.lines
      .map((line) => line.replace(/\s{3,}/g, '    ').trimEnd())
      .filter(Boolean);
    const body = mode === 'compact'
      ? lines.join(' ').replace(/\s+/g, ' ')
      : lines.join('\n');
    return `--- PDF Page ${page.pageNumber} ---\n${body}`;
  }).join('\n\n');
}

async function readTextFile(file, options = {}) {
  const name = file.name.toLowerCase();
  const buffer = await file.arrayBuffer();
  if (name.endsWith('.docx')) {
    try {
      const mammoth = await loadMammoth();
      const result = await mammoth.extractRawText({ arrayBuffer: buffer });
      return result.value || '';
    } catch (err) {
      throw new Error(`Không đọc được DOCX. Hãy lưu file thành TXT/PDF hoặc dán nội dung. Chi tiết: ${err.message}`);
    }
  }
  if (name.endsWith('.pdf')) {
    try {
      const pdfjs = await loadPdfjs();
      const pdf = await pdfjs.getDocument({ data: buffer, useSystemFonts: true, disableFontFace: false }).promise;
      const pagesToRead = parsePageRange(options.pdfPageRange, pdf.numPages);
      const focusTerms = getPdfFocusTerms({ form: options.form, pdfFocus: options.pdfFocus });
      const pages = [];
      for (const pageNumber of pagesToRead) {
        const page = await pdf.getPage(pageNumber);
        const viewport = page.getViewport({ scale: 1 });
        const textContent = await page.getTextContent({ normalizeWhitespace: true, disableCombineTextItems: false });
        const lines = extractLinesFromPdfItems(textContent.items || [], viewport.width);
        pages.push({ pageNumber, lines });
      }
      const cleaned = removeRepeatedPdfHeaders(pages);
      const focused = focusPdfPages(cleaned, focusTerms, options.pdfFocusEnabled);
      const result = formatPdfExtraction(focused, { mode: options.pdfMode });
      const charCount = result.replace(/\s+/g, '').length;
      if (charCount < 80) {
        throw new Error('PDF có vẻ là bản scan/ảnh hoặc bị khóa text. Hãy dùng OCR trước, tải bản text PDF, hoặc dán nội dung bài vào ô trích xuất.');
      }
      const note = [
        `[PDF extraction: ${focused.length}/${pdf.numPages} page(s) used${options.pdfPageRange ? ` · range ${options.pdfPageRange}` : ''}${options.pdfFocusEnabled && focusTerms.length ? ` · focused by: ${focusTerms.slice(0, 8).join(', ')}` : ''}]`,
      ].join('');
      return `${note}\n\n${result}`;
    } catch (err) {
      throw new Error(`Không đọc được PDF tốt trong trình duyệt này. Hãy thử nhập khoảng trang, tắt bám tên bài, hoặc dán nội dung bài. Chi tiết: ${err.message}`);
    }
  }
  const decoded = new TextDecoder('utf-8').decode(buffer);
  if (name.endsWith('.html') || name.endsWith('.htm')) return stripHtml(decoded);
  return decoded;
}

function buildLessonPrompt({ form, selectedDomains, uploadedText, extraNotes }) {
  const domains = DIGITAL_COMPETENCE_DOMAINS.filter((d) => selectedDomains.includes(d.id));
  return `You are an expert Vietnamese high-school English lesson plan writer.
Create a complete ENGLISH lesson plan based on the uploaded textbook content and teacher requirements.

STRICT OUTPUT LANGUAGE: English only. Vietnamese may appear only in proper names and official legal document numbers.

LESSON INFORMATION
- Grade: ${form.grade}
- Book series: ${form.book}
- Unit / Theme: ${form.unit || '(teacher did not specify)'}
- Lesson title: ${form.lessonTitle || form.query}
- Period / lesson type: ${form.lessonType}
- Duration: ${form.duration} minutes
- Main method: ${form.method}
- Class profile: ${form.classProfile || 'Vietnamese high-school English learners'}
- Main teacher request: ${form.query}

UPLOADED TEXTBOOK / SOURCE EXTRACT
${uploadedText || '(No file extracted. Use the teacher request and notes.)'}

ADDITIONAL NOTES
${extraNotes || '(none)'}

MANDATORY FORMAT: Lesson plan according to the Vietnamese MOET lesson-plan framework commonly used from Công văn 5512/BGDĐT-GDTrH, Appendix IV.
Use this structure exactly:

A. GENERAL INFORMATION
- School / Teacher / Subject: English / Grade / Unit / Lesson / Period / Duration

B. OBJECTIVES
1. Knowledge
- Vocabulary
- Grammar / Language focus
- Skills
2. Competences
- General competences: self-study, communication, cooperation, problem solving
- Specific English competences: listening, speaking, reading, writing, language use
3. Qualities
- Patriotism / kindness / diligence / honesty / responsibility where relevant
4. Digital competences integrated in the lesson under Circular No. 02/2025/TT-BGDĐT
${domains.length ? domains.map((d, i) => `${i + 1}. Domain ${d.code} — ${d.title}: ${d.sample}`).join('\n') : '- Select 1–3 suitable component competences from Circular No. 02/2025/TT-BGDĐT based on the lesson.'}

C. TEACHING AIDS AND LEARNING MATERIALS
- Teacher: textbook, slides, projector, board, handouts, digital tools, AI/dictionary/quiz tools if appropriate
- Students: textbook, notebook, device if available
- Digital safety note: source citation, privacy, responsible AI use where relevant

D. PROCEDURE / LEARNING ACTIVITIES
Follow the 5512-style activity design. For EVERY activity, provide:
- Aim
- Content
- Product
- Organization / Teacher and student activities
- Assessment / Feedback

Use this sequence:
1. Warm-up / Lead-in
2. Presentation / Knowledge formation
3. Practice
4. Production / Application
5. Consolidation and homework

For each activity, include:
- time allocation
- interaction pattern (T-Ss, pair work, group work, individual work)
- teacher instructions in classroom English
- expected student responses/products
- differentiation/support for weaker students and extension for stronger students
- digital competence integration where appropriate

E. ASSESSMENT
- Formative assessment during the lesson
- Criteria / checklist / rubric
- Evidence of learning

F. BOARD PLAN / SLIDE PLAN
- Key vocabulary
- Key structures
- Activity flow

G. APPENDIX
- Worksheets / task cards / answer keys / sample expected answers

QUALITY RULES
- Use content from the uploaded textbook extract as the primary source.
- If source text is insufficient, state "Source limitation" briefly and create a plausible lesson based on the teacher's input.
- Do not produce a generic lesson. It must match the named unit/lesson and uploaded content.
- Activities must be classroom-ready and realistic for ${form.duration} minutes.
- Digital competence must be explicit, evidence-based and mapped to component codes from Circular No. 02/2025/TT-BGDĐT, not decorative.
- Do not mention that you are an AI.
`;
}

function buildDigitalSupplementPrompt({ form, selectedDomains, existingPlan, extraNotes }) {
  const domains = DIGITAL_COMPETENCE_DOMAINS.filter((d) => selectedDomains.includes(d.id));
  return `You are an expert Vietnamese high-school English teacher and lesson-plan reviewer.
The teacher already has a lesson plan. Do NOT rewrite the whole lesson unless necessary.
Your task is to add and integrate DIGITAL COMPETENCE into the existing lesson plan.

OUTPUT LANGUAGE: English only. Vietnamese may appear only in proper names and official legal document numbers.

LESSON INFORMATION
- Grade: ${form.grade}
- Book series: ${form.book}
- Unit / Theme: ${form.unit || '(not specified)'}
- Lesson title: ${form.lessonTitle || form.query}
- Lesson type: ${form.lessonType}
- Duration: ${form.duration} minutes
- Main method: ${form.method}
- Class profile: ${form.classProfile || 'Vietnamese high-school English learners'}

SELECTED DIGITAL COMPETENCE DOMAINS
${domains.length ? domains.map((d, i) => `${i + 1}. Domain ${d.code} — ${d.title}: ${d.sample}`).join('\n') : '- Suggest 1–3 suitable component competences from Circular No. 02/2025/TT-BGDĐT.'}

TEACHER NOTES
${extraNotes || '(none)'}

EXISTING LESSON PLAN
${existingPlan || '(No existing plan pasted/uploaded. Ask the teacher to provide one.)'}

REQUIRED OUTPUT
1. Brief diagnosis: what digital competence is missing or weak in the existing plan.
2. A revised B. OBJECTIVES section, adding "Digital competences integrated in the lesson".
3. Digital competence integration table:
   - Lesson stage/activity
   - Digital competence component code and English name
   - Digital tool or digital behavior
   - Student product/evidence
   - Assessment/feedback
4. Exact insertions to add into D. PROCEDURE / LEARNING ACTIVITIES.
5. Digital safety, privacy, copyright and responsible AI note suitable for the lesson.
6. If the teacher wants a full revised plan, provide a clean revised version after the supplement.

QUALITY RULES
- Keep the original lesson content and method as much as possible.
- Do not add technology for decoration only. Every digital task must produce observable learning evidence.
- Make the additions practical for a Vietnamese classroom.
- Do not mention that you are an AI.`;
}

function buildAnalysisPrompt({ workflowMode, form, sourceText, extraNotes }) {
  return `You are an expert English lesson planner for Vietnamese secondary/high-school education.
Analyse the teacher's input and suggest suitable lesson parameters and digital competences.

WORKFLOW: ${workflowMode}

TEACHER REQUEST / KEYWORDS
${form.query || '(none)'}

UPLOADED / PASTED MATERIALS
${sourceText || '(none)'}

EXTRA NOTES
${extraNotes || '(none)'}

Return ONLY valid JSON, no markdown fences, using this schema:
{
  "grade": "one of: Grade 6, Grade 7, Grade 8, Grade 9, Grade 10, Grade 11, Grade 12, THPT mixed",
  "book": "book series if inferable, otherwise Other / Custom",
  "unit": "suggested unit/theme",
  "lessonTitle": "suggested lesson title",
  "lessonType": "one of the common lesson types",
  "duration": 45,
  "method": "TBLT/CLT/ESA/PPP/Project-based/Flipped classroom/Blended learning",
  "classProfile": "brief learner profile",
  "digitalDomainIds": ["info", "comm", "content", "safety", "problem", "ai"],
  "analysis": "short Vietnamese explanation of why these settings fit",
  "lessonFocus": ["main knowledge", "main skill", "expected product"]
}

Rules:
- Infer from source content, not from generic defaults.
- Choose only 2-4 most relevant digitalDomainIds.
- If the input is only keywords, propose realistic parameters and clearly state assumptions in analysis.`;
}

function parseAnalysisJson(raw) {
  const text = cleanJsonText(raw || '');
  try {
    return JSON.parse(text);
  } catch {
    const match = text.match(/\{[\s\S]*\}/);
    if (match) {
      try { return JSON.parse(match[0]); } catch { return null; }
    }
  }
  return null;
}


function buildSlidePrompt({ form, lessonPlan, slideCount, slideStyle, slideAudience, slideLanguage }) {
  return `You are an expert English teacher and slide designer.
Create a classroom-ready slide deck from the lesson plan below.

OUTPUT FORMAT: Return ONLY valid JSON. No markdown fences. No explanation outside JSON.

JSON SCHEMA:
{
  "deckTitle": "string",
  "lessonMeta": "string",
  "slides": [
    {
      "number": 1,
      "type": "Title | Objective | Lead-in | Vocabulary | Grammar | Task | Practice | Production | Assessment | Homework | Closing",
      "title": "short slide title",
      "subtitle": "optional short subtitle",
      "bullets": ["max 5 short bullets"],
      "teacherNotes": "teacher instruction / script",
      "studentTask": "what students do",
      "timing": "e.g. 5 minutes",
      "visualSuggestion": "simple visual/icon/layout suggestion"
    }
  ]
}

SLIDE REQUIREMENTS
- Number of slides: about ${slideCount}; do not exceed ${Number(slideCount) + 2}.
- Slide style: ${slideStyle}.
- Audience: ${slideAudience}.
- Language on slides: ${slideLanguage}.
- Use the generated lesson plan as the source. Do not add unrelated content.
- Make slides concise: no long paragraphs.
- Include interactive instructions for pair/group work when the lesson plan has activities.
- Include visible timing and teacher notes.
- Include digital competence activity/slide if the lesson integrates technology.
- Create slide-friendly titles, not document headings.

LESSON INFORMATION
- Grade: ${form.grade}
- Book: ${form.book}
- Unit: ${form.unit || '(not specified)'}
- Lesson title: ${form.lessonTitle || form.query}
- Lesson type: ${form.lessonType}
- Duration: ${form.duration} minutes
- Method: ${form.method}

LESSON PLAN SOURCE
${safeTrim(lessonPlan, 50000)}
`;
}

function cleanJsonText(raw) {
  return String(raw || '')
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/```$/i, '')
    .trim();
}

function parseSlideDeck(raw, fallbackTitle = 'Lesson Slide Deck') {
  const text = String(raw || '').trim();
  if (!text) return { deckTitle: fallbackTitle, lessonMeta: '', slides: [] };
  try {
    const parsed = JSON.parse(cleanJsonText(text));
    const slides = Array.isArray(parsed) ? parsed : (Array.isArray(parsed.slides) ? parsed.slides : []);
    return {
      deckTitle: parsed.deckTitle || fallbackTitle,
      lessonMeta: parsed.lessonMeta || '',
      slides: slides.map((slide, idx) => ({
        number: Number(slide.number) || idx + 1,
        type: slide.type || 'Slide',
        title: slide.title || `Slide ${idx + 1}`,
        subtitle: slide.subtitle || '',
        bullets: Array.isArray(slide.bullets) ? slide.bullets.filter(Boolean).slice(0, 7) : String(slide.bullets || '').split(/\n|;|•/).map((x) => x.trim()).filter(Boolean).slice(0, 7),
        teacherNotes: slide.teacherNotes || slide.notes || '',
        studentTask: slide.studentTask || slide.task || '',
        timing: slide.timing || '',
        visualSuggestion: slide.visualSuggestion || slide.visual || '',
      })),
    };
  } catch {
    const chunks = text.split(/\n(?=#{1,3}\s+|Slide\s+\d+[:.])/i).map((x) => x.trim()).filter(Boolean);
    const slides = chunks.slice(0, 24).map((chunk, idx) => {
      const lines = chunk.split('\n').map((x) => x.replace(/^[-*•]\s*/, '').trim()).filter(Boolean);
      const first = lines[0] || `Slide ${idx + 1}`;
      return {
        number: idx + 1,
        type: 'Slide',
        title: first.replace(/^#{1,3}\s*/, '').replace(/^Slide\s+\d+[:.]\s*/i, '').slice(0, 90) || `Slide ${idx + 1}`,
        subtitle: '',
        bullets: lines.slice(1, 6),
        teacherNotes: lines.slice(6).join('\n'),
        studentTask: '',
        timing: '',
        visualSuggestion: '',
      };
    });
    return { deckTitle: fallbackTitle, lessonMeta: '', slides };
  }
}

function slideDeckToMarkdown(deck) {
  const slides = deck.slides || [];
  return `# ${deck.deckTitle || 'Lesson Slide Deck'}\n\n${deck.lessonMeta ? `${deck.lessonMeta}\n\n` : ''}${slides.map((slide) => `## Slide ${slide.number}: ${slide.title}\n${slide.subtitle ? `_${slide.subtitle}_\n` : ''}${slide.timing ? `**Timing:** ${slide.timing}\n` : ''}${slide.type ? `**Type:** ${slide.type}\n` : ''}\n${(slide.bullets || []).map((b) => `- ${b}`).join('\n')}\n${slide.studentTask ? `\n**Student task:** ${slide.studentTask}` : ''}${slide.teacherNotes ? `\n**Teacher notes:** ${slide.teacherNotes}` : ''}${slide.visualSuggestion ? `\n**Visual:** ${slide.visualSuggestion}` : ''}`).join('\n\n---\n\n')}`;
}

function buildSlideDeckHtml(deck) {
  const slides = deck.slides || [];
  const title = deck.deckTitle || 'Lesson Slide Deck';
  const slideHtml = slides.map((slide, idx) => `
<section class="slide ${idx === 0 ? 'active' : ''}" data-slide="${idx}">
  <div class="slide-top"><span>${escapeHtml(slide.type || 'Slide')}</span><strong>${escapeHtml(slide.timing || '')}</strong></div>
  <h1>${escapeHtml(slide.title)}</h1>
  ${slide.subtitle ? `<h2>${escapeHtml(slide.subtitle)}</h2>` : ''}
  <ul>${(slide.bullets || []).map((b) => `<li>${escapeHtml(b)}</li>`).join('')}</ul>
  ${slide.studentTask ? `<div class="task"><b>Student task</b><p>${escapeHtml(slide.studentTask)}</p></div>` : ''}
  ${slide.visualSuggestion ? `<div class="visual">${escapeHtml(slide.visualSuggestion)}</div>` : ''}
  ${slide.teacherNotes ? `<details><summary>Teacher notes</summary><p>${escapeHtml(slide.teacherNotes)}</p></details>` : ''}
</section>`).join('\n');
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(title)}</title>
<style>@font-face{font-family:BrianGesco;src:url('/bes-fonts/brian-personal-font.ttf?v=12.0.0') format('truetype');font-weight:100 900;font-style:normal;font-display:swap;}
:root{font-family:BrianGesco,Inter,Arial,sans-serif;color:#13254b;background:#eef5ff}body{margin:0;min-height:100vh;background:#eef6ff}.deck{min-height:100vh;display:grid;grid-template-rows:auto 1fr auto}.bar{display:flex;gap:12px;align-items:center;justify-content:space-between;padding:14px 22px;background:rgba(255,255,255,.88);box-shadow:none;border-bottom:1px solid #b9d2e8;position:sticky;top:0;z-index:2}.bar h1{font-size:18px;margin:0}.controls{display:flex;gap:8px;align-items:center}.controls button{border:0;border-radius:0;padding:10px 14px;font-weight:800;background:#5b3df5;color:white;cursor:pointer}.progress{font-weight:900}.stage{display:grid;place-items:center;padding:26px}.slide{display:none;width:min(1120px,94vw);min-height:min(650px,78vh);background:#fff;border-radius:0;box-shadow:none;border:1px solid #b9d2e8;padding:44px;box-sizing:border-box;position:relative;overflow:auto}.slide.active{display:block}.slide-top{display:flex;justify-content:space-between;color:#5b3df5;font-weight:900;text-transform:uppercase;letter-spacing:.08em}.slide h1{font-size:clamp(34px,4vw,58px);line-height:1.04;margin:28px 0 10px;color:#102a56}.slide h2{font-size:clamp(18px,2vw,28px);color:#637083;margin:0 0 26px}.slide ul{display:grid;gap:14px;margin:30px 0 0;padding-left:28px;font-size:clamp(20px,2.2vw,31px);line-height:1.35}.task{margin-top:28px;border-radius:0;background:#eefdf9;border:1px solid #45d3bd;padding:18px}.visual{position:absolute;right:30px;bottom:28px;max-width:300px;color:#7a7f8a;font-weight:700}.slide details{margin-top:24px;border-radius:0;background:#f6f7fb;padding:14px;color:#334155}.thumbs{display:flex;gap:8px;overflow:auto;padding:12px 20px;background:rgba(255,255,255,.72)}.thumbs button{border:1px solid #dbe5f4;border-radius:0;background:#fff;padding:8px 11px;font-weight:900;cursor:pointer}.thumbs button.active{background:#5b3df5;color:white}@media print{.bar,.thumbs{display:none}.stage{display:block;padding:0}.slide{display:block;box-shadow:none;border-radius:0;page-break-after:always;width:100vw;height:100vh;overflow:hidden}.slide:not(.active){display:block}}
</style></head><body>
<div class="deck"><header class="bar"><h1>${escapeHtml(title)}</h1><div class="controls"><button onclick="prev()">←</button><span class="progress" id="progress"></span><button onclick="next()">→</button><button onclick="document.documentElement.requestFullscreen?.()">Fullscreen</button><button onclick="print()">Print</button></div></header><main class="stage">${slideHtml || '<section class="slide active"><h1>No slides</h1></section>'}</main><nav class="thumbs">${slides.map((s, i) => `<button onclick="go(${i})" data-thumb="${i}">${i + 1}</button>`).join('')}</nav></div>
<script>
let current=0;const slides=[...document.querySelectorAll('.slide')];const thumbs=[...document.querySelectorAll('[data-thumb]')];
function render(){slides.forEach((s,i)=>s.classList.toggle('active',i===current));thumbs.forEach((t,i)=>t.classList.toggle('active',i===current));document.getElementById('progress').textContent=(current+1)+' / '+slides.length;}
function go(i){current=Math.max(0,Math.min(slides.length-1,i));render();}
function next(){go(current+1)}function prev(){go(current-1)}document.addEventListener('keydown',e=>{if(e.key==='ArrowRight'||e.key===' ')next();if(e.key==='ArrowLeft')prev();});render();
</script></body></html>`;
}

function buildPptHtml(deck) {
  const slides = deck.slides || [];
  const title = deck.deckTitle || 'Lesson Slide Deck';
  return `<!doctype html><html><head><meta charset="utf-8"><title>${escapeHtml(title)}</title>
<style>@page{size:13.333in 7.5in;margin:0}.slide{width:13.333in;height:7.5in;box-sizing:border-box;padding:.55in;font-family:BrianGesco,Arial,sans-serif;page-break-after:always;background:#ffffff;color:#123}.label{font-size:12pt;color:#5b3df5;text-transform:uppercase;font-weight:bold;letter-spacing:1px}.title{font-size:38pt;font-weight:bold;margin:.25in 0 .12in}.subtitle{font-size:20pt;color:#667085}.bullets{font-size:22pt;line-height:1.35}.notes{font-size:12pt;color:#667085;margin-top:.3in;border-top:1px solid #ddd;padding-top:.12in}.task{font-size:16pt;background:#eefdf9;padding:.15in;border-radius:.1in;margin-top:.2in}</style></head><body>
${slides.map((slide) => `<section class="slide"><div class="label">${escapeHtml(slide.type || 'Slide')} ${slide.timing ? ' · ' + escapeHtml(slide.timing) : ''}</div><div class="title">${escapeHtml(slide.title)}</div>${slide.subtitle ? `<div class="subtitle">${escapeHtml(slide.subtitle)}</div>` : ''}<ul class="bullets">${(slide.bullets || []).map((b) => `<li>${escapeHtml(b)}</li>`).join('')}</ul>${slide.studentTask ? `<div class="task"><b>Student task:</b> ${escapeHtml(slide.studentTask)}</div>` : ''}${slide.teacherNotes ? `<div class="notes"><b>Teacher notes:</b> ${escapeHtml(slide.teacherNotes)}</div>` : ''}</section>`).join('')}
</body></html>`;
}

function createOfflineSlidesFromLesson(lessonPlan, form, count = 10) {
  const sections = String(lessonPlan || '').split(/\n(?=[A-G]\.\s+|\d+\.\s+|#{1,3}\s+)/).map((x) => x.trim()).filter(Boolean);
  const base = [
    { type: 'Title', title: form.lessonTitle || form.query || 'English Lesson', subtitle: `${form.grade} · ${form.book}`, bullets: [`${form.lessonType}`, `${form.duration} minutes`, `${form.method}`], teacherNotes: 'Introduce the lesson aims and learning pathway.', studentTask: 'Get ready for the lesson.', timing: '1 minute', visualSuggestion: 'Lesson title with unit image/icon' },
    { type: 'Objective', title: 'Learning objectives', subtitle: '', bullets: ['Understand the key language focus', 'Practise the target skill or structure', 'Complete a communicative task', 'Use digital tools responsibly'], teacherNotes: 'Read the objectives and connect them with the final task.', studentTask: 'Listen and identify what they will be able to do.', timing: '2 minutes', visualSuggestion: 'Checklist layout' },
  ];
  const dynamic = sections.slice(0, Math.max(3, Number(count) - base.length - 1)).map((section, idx) => {
    const lines = section.split('\n').map((x) => x.replace(/^[-*•]\s*/, '').trim()).filter(Boolean);
    const title = lines[0].replace(/^[A-G]\.\s+|^\d+\.\s+|^#{1,3}\s+/, '').slice(0, 72) || `Activity ${idx + 1}`;
    return {
      type: idx < 2 ? 'Lead-in' : idx < 5 ? 'Task' : 'Practice',
      title,
      subtitle: '',
      bullets: lines.slice(1, 6).map((x) => x.slice(0, 110)),
      teacherNotes: 'Use the generated lesson plan details for instructions, feedback and timing.',
      studentTask: 'Follow the teacher instructions and complete the task.',
      timing: '',
      visualSuggestion: 'Clean two-column classroom slide',
    };
  });
  const closing = { type: 'Closing', title: 'Consolidation and homework', subtitle: '', bullets: ['Review key learning points', 'Check understanding', 'Assign homework or extension task'], teacherNotes: 'Summarise the lesson and assign follow-up work.', studentTask: 'Reflect on what they learned and note the homework.', timing: '3 minutes', visualSuggestion: 'Exit ticket / homework checklist' };
  return { deckTitle: form.lessonTitle || form.query || 'Lesson Slide Deck', lessonMeta: `${form.grade} · ${form.book} · ${form.duration} minutes`, slides: [...base, ...dynamic, closing].slice(0, count) };
}

export default function LessonArchitect({ language, hasApiKey, aiModel, currentUser }) {
  const [workflowMode, setWorkflowMode] = useState('curriculum-batch');
  const [form, setForm] = useState({
    query: 'Create a 45-minute TBLT lesson plan for Past Simple vs Past Continuous, level B2',
    grade: 'Grade 10',
    book: 'Global Success',
    unit: '',
    lessonTitle: '',
    lessonType: 'Language / Grammar',
    duration: 45,
    method: 'TBLT',
    classProfile: 'B2 high-school students; mixed ability class',
  });
  const [selectedDomains, setSelectedDomains] = useState(['info', 'comm', 'content', 'safety']);
  const [analysisOutput, setAnalysisOutput] = useState('');
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [files, setFiles] = useState([]);
  const [fileText, setFileText] = useState('');
  const [fileStatus, setFileStatus] = useState('');
  const [pdfOptions, setPdfOptions] = useState({ pageRange: '', focus: '', focusEnabled: true, mode: 'smart' });
  const [extracting, setExtracting] = useState(false);
  const [cleaningExtract, setCleaningExtract] = useState(false);
  const [extraNotes, setExtraNotes] = useState('');
  const [promptPreview, setPromptPreview] = useState('');
  const [output, setOutput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');
  const [slideCount, setSlideCount] = useState(12);
  const [slideStyle, setSlideStyle] = useState('Flat material, classroom-friendly, large text, minimal paragraphs');
  const [slideAudience, setSlideAudience] = useState('Teacher-led classroom presentation');
  const [slideLanguage, setSlideLanguage] = useState('English');
  const [slideOutput, setSlideOutput] = useState('');
  const [slideLoading, setSlideLoading] = useState(false);
  const [slideError, setSlideError] = useState('');
  const [activeSlide, setActiveSlide] = useState(0);

  const titleSlug = useMemo(() => librarySlugify(form.lessonTitle || form.query || 'lesson-plan-5512'), [form.lessonTitle, form.query]);
  const slideDeck = useMemo(() => parseSlideDeck(slideOutput, form.lessonTitle || form.query || 'Lesson Slide Deck'), [slideOutput, form.lessonTitle, form.query]);
  const currentSlide = slideDeck.slides[activeSlide] || slideDeck.slides[0];

  const patch = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));
  const showToast = (msg) => {
    setToast(msg);
    window.clearTimeout(showToast.timer);
    showToast.timer = window.setTimeout(() => setToast(''), 2500);
  };

  const toggleDomain = (id) => {
    setSelectedDomains((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  };

  const readSelectedFiles = async (selectedFiles = files) => {
    const selected = Array.from(selectedFiles || []);
    if (!selected.length) {
      setError(language === 'vi' ? 'Chưa chọn file nào.' : 'No file selected.');
      return;
    }
    setFiles(selected);
    setExtracting(true);
    setFileStatus(language === 'vi' ? 'Đang đọc file và giữ bố cục PDF...' : 'Reading files and preserving PDF layout...');
    setError('');
    try {
      const chunks = [];
      for (const file of selected) {
        const raw = await readTextFile(file, {
          form,
          pdfPageRange: pdfOptions.pageRange,
          pdfFocus: pdfOptions.focus,
          pdfFocusEnabled: pdfOptions.focusEnabled,
          pdfMode: pdfOptions.mode,
        });
        chunks.push(`===== FILE: ${file.name} =====\n${safeTrim(raw, 26000)}`);
      }
      const joined = safeTrim(chunks.join('\n\n'), 62000);
      setFileText(joined);
      setFileStatus(language === 'vi'
        ? `Đã đọc ${selected.length} file. Nếu PDF dài, hãy nhập khoảng trang hoặc tên bài rồi bấm “Đọc lại file”.`
        : `Read ${selected.length} file(s). For long PDFs, set page range or focus words and re-read.`);
    } catch (err) {
      setFileStatus('');
      setError(err.message || String(err));
    } finally {
      setExtracting(false);
    }
  };

  const handleFiles = async (event) => {
    const selected = Array.from(event.target.files || []);
    await readSelectedFiles(selected);
  };

  const cleanExtractWithAI = async () => {
    setError('');
    if (!fileText.trim()) {
      setError(language === 'vi' ? 'Chưa có nội dung trích xuất để làm sạch.' : 'No extracted text to clean.');
      return;
    }
    if (!hasApiKey) {
      setError(language === 'vi' ? 'Cần API key để AI làm sạch nội dung PDF.' : 'API key is required to clean PDF text with AI.');
      return;
    }
    setCleaningExtract(true);
    try {
      const prompt = `Clean and reconstruct this textbook PDF extraction for lesson planning.\n\nTASKS:\n- Keep only useful textbook/lesson content.\n- Restore headings, sections, vocabulary lists, grammar boxes, tasks, questions, answer choices and instructions.\n- Remove repeated headers, footers, page numbers, broken line artifacts and irrelevant navigation text.\n- Preserve the original language.\n- Do not summarize too much; keep enough detail for an English lesson plan.\n- If the text is not enough, clearly mark missing parts.\n\nFOCUS LESSON / KEYWORDS:\n${form.lessonTitle || form.query || pdfOptions.focus || '(not specified)'}\n\nRAW PDF EXTRACT:\n${safeTrim(fileText, 42000)}`;
      const cleaned = await callAI({
        prompt,
        model: aiModel,
        systemInstruction: 'You clean textbook PDF extraction for English lesson planning. Preserve lesson content and structure accurately.',
        temperature: 0.15,
        fallback: true,
      });
      setFileText(cleaned);
      setFileStatus(language === 'vi' ? 'AI đã làm sạch nội dung trích xuất. Hãy kiểm tra nhanh trước khi soạn giáo án.' : 'AI cleaned the extracted content. Review it before generating the lesson.');
      showToast(language === 'vi' ? 'Đã làm sạch nội dung PDF.' : 'PDF extract cleaned.');
    } catch (err) {
      setError(err.message || String(err));
    } finally {
      setCleaningExtract(false);
    }
  };

  const buildPromptNow = () => {
    const prompt = workflowMode === 'existing-plan'
      ? buildDigitalSupplementPrompt({ form, selectedDomains, existingPlan: safeTrim(fileText, 42000), extraNotes })
      : buildLessonPrompt({
          form: {
            ...form,
            query: workflowMode === 'keyword-to-plan'
              ? `${form.query}

First analyse the keywords, infer suitable lesson parameters, then write the complete lesson plan.`
              : form.query,
          },
          selectedDomains,
          uploadedText: safeTrim(fileText, 32000),
          extraNotes: `${analysisOutput ? `AI ANALYSIS / TEACHER-APPROVED SUGGESTIONS:
${analysisOutput}

` : ''}${extraNotes || ''}`,
        });
    setPromptPreview(prompt);
    return prompt;
  };

  const analyseLessonInput = async () => {
    setError('');
    if (!hasApiKey) {
      setError(language === 'vi' ? 'Cần API key để AI phân tích nội dung.' : 'API key is required for AI analysis.');
      return;
    }
    if (!form.query.trim() && !fileText.trim()) {
      setError(language === 'vi' ? 'Nhập từ khóa/yêu cầu hoặc tải/dán nội dung trước khi phân tích.' : 'Enter keywords/request or upload/paste content before analysis.');
      return;
    }
    setAnalysisLoading(true);
    try {
      const prompt = buildAnalysisPrompt({ workflowMode, form, sourceText: safeTrim(fileText, 36000), extraNotes });
      const raw = await callAI({
        prompt,
        model: aiModel,
        systemInstruction: 'You analyse lesson inputs and return valid JSON only. You are precise and practical for Vietnamese English teachers.',
        temperature: 0.25,
        fallback: true,
      });
      const parsed = parseAnalysisJson(raw);
      if (parsed) {
        setForm((prev) => ({
          ...prev,
          grade: GRADES.includes(parsed.grade) ? parsed.grade : prev.grade,
          book: BOOKS.includes(parsed.book) ? parsed.book : (parsed.book ? 'Other / Custom' : prev.book),
          unit: parsed.unit || prev.unit,
          lessonTitle: parsed.lessonTitle || prev.lessonTitle,
          lessonType: LESSON_TYPES.includes(parsed.lessonType) ? parsed.lessonType : prev.lessonType,
          duration: Number(parsed.duration) || prev.duration,
          method: METHODS.includes(parsed.method) ? parsed.method : prev.method,
          classProfile: parsed.classProfile || prev.classProfile,
        }));
        if (Array.isArray(parsed.digitalDomainIds) && parsed.digitalDomainIds.length) {
          const valid = parsed.digitalDomainIds.filter((id) => DIGITAL_COMPETENCE_DOMAINS.some((d) => d.id === id));
          if (valid.length) setSelectedDomains(valid);
        }
        const summary = [
          parsed.analysis ? `Phân tích: ${parsed.analysis}` : '',
          Array.isArray(parsed.lessonFocus) && parsed.lessonFocus.length ? `Trọng tâm bài dạy:\n${parsed.lessonFocus.map((x, i) => `${i + 1}. ${x}`).join('\n')}` : '',
          Array.isArray(parsed.digitalDomainIds) && parsed.digitalDomainIds.length ? `Năng lực số gợi ý: ${parsed.digitalDomainIds.join(', ')}` : '',
        ].filter(Boolean).join('\n\n');
        setAnalysisOutput(summary || JSON.stringify(parsed, null, 2));
      } else {
        setAnalysisOutput(raw);
      }
      showToast(language === 'vi' ? 'AI đã phân tích và gợi ý thông số.' : 'AI analysed the input and suggested settings.');
    } catch (err) {
      setError(err.message || String(err));
    } finally {
      setAnalysisLoading(false);
    }
  };

  const saveLessonToProfile = () => {
    if (!output.trim()) {
      showToast(language === 'vi' ? 'Chưa có giáo án để lưu.' : 'No lesson plan to save.');
      return;
    }
    addHistoryEntry({
      kind: workflowMode === 'existing-plan' ? 'digital-competence-lesson-supplement' : 'lesson-plan-5512',
      toolSlug: 'lesson-plan-ai',
      toolTitle: 'Lesson Architect',
      title: form.lessonTitle || form.query || 'Lesson plan 5512',
      content: output,
      level: form.grade,
      itemCount: form.duration,
      tags: ['teacher-profile', 'lesson-plan', workflowMode, 'digital-competence', form.book, form.grade],
      model: aiModel,
    });
    showToast(language === 'vi' ? 'Đã lưu giáo án vào hồ sơ cá nhân trong Thư viện.' : 'Lesson plan saved to your personal profile in Library.');
  };

  const generate = async () => {
    setError('');
    if (!hasApiKey) {
      setError(language === 'vi' ? 'Chưa có AI provider. Vào Settings để cấu hình API key trước.' : 'Missing AI provider. Configure API key in Settings first.');
      return;
    }
    if (workflowMode === 'existing-plan' && !fileText.trim()) {
      setError(language === 'vi' ? 'Ở chế độ bổ sung giáo án có sẵn, hãy tải lên hoặc dán giáo án trước.' : 'In existing-plan mode, upload or paste the existing lesson plan first.');
      return;
    }
    if (workflowMode !== 'existing-plan' && !form.query.trim() && !form.lessonTitle.trim() && !fileText.trim()) {
      setError(language === 'vi' ? 'Nhập từ khóa/yêu cầu hoặc tải file học liệu trước.' : 'Enter keywords/request or upload lesson materials first.');
      return;
    }
    setLoading(true);
    try {
      const prompt = buildPromptNow();
      const text = await callAI({
        prompt,
        model: aiModel,
        systemInstruction: 'You write official, practical English lesson plans for Vietnamese secondary/high-school teachers. Follow required structure exactly and avoid generic filler.',
        temperature: 0.45,
        fallback: true,
      });
      setOutput(text);
      setSlideOutput('');
      setActiveSlide(0);
      addHistoryEntry({
        kind: workflowMode === 'existing-plan' ? 'digital-competence-lesson-supplement' : 'lesson-plan-5512',
        toolSlug: 'lesson-plan-ai',
        toolTitle: 'Lesson Architect',
        title: form.lessonTitle || form.query || 'Lesson plan 5512',
        content: text,
        level: form.grade,
        itemCount: form.duration,
        tags: ['teacher-profile', 'lesson-plan', '5512', workflowMode, 'digital-competence', form.book, form.grade],
        model: aiModel,
      });
      showToast(language === 'vi' ? 'Đã tạo giáo án và lưu tạm vào hồ sơ cá nhân.' : 'Lesson plan generated and saved to your personal profile.');
    } catch (err) {
      setError(err.message || String(err));
    } finally {
      setLoading(false);
    }
  };

  const generateSlides = async () => {
    setSlideError('');
    if (!output.trim()) {
      setSlideError(language === 'vi' ? 'Cần có giáo án trước khi soạn slide.' : 'Generate the lesson plan first.');
      return;
    }
    if (!hasApiKey) {
      setSlideError(language === 'vi' ? 'Chưa có API key/provider để tạo slide bằng AI.' : 'Missing API key/provider for AI slide generation.');
      return;
    }
    setSlideLoading(true);
    try {
      const prompt = buildSlidePrompt({ form, lessonPlan: output, slideCount, slideStyle, slideAudience, slideLanguage });
      const text = await callAI({
        prompt,
        model: aiModel,
        systemInstruction: 'You convert lesson plans into concise, classroom-ready slide decks. You return valid JSON only.',
        temperature: 0.35,
        fallback: true,
      });
      const parsed = parseSlideDeck(text, form.lessonTitle || form.query || 'Lesson Slide Deck');
      const normalised = JSON.stringify(parsed, null, 2);
      setSlideOutput(normalised);
      setActiveSlide(0);
      addHistoryEntry({
        kind: 'lesson-slide-deck',
        toolSlug: 'lesson-plan-ai',
        toolTitle: 'Lesson Architect Slides',
        title: `${form.lessonTitle || form.query || 'Lesson'} - Slide deck`,
        content: slideDeckToMarkdown(parsed),
        level: form.grade,
        itemCount: parsed.slides.length,
        tags: ['slides', 'lesson-plan', form.book, form.grade],
        model: aiModel,
      });
      showToast(language === 'vi' ? 'Đã soạn slide từ giáo án.' : 'Slide deck generated from lesson plan.');
    } catch (err) {
      setSlideError(err.message || String(err));
    } finally {
      setSlideLoading(false);
    }
  };

  const generateSlidesOffline = () => {
    if (!output.trim()) {
      setSlideError(language === 'vi' ? 'Cần có giáo án trước khi tạo slide nhanh.' : 'Generate the lesson plan first.');
      return;
    }
    const deck = createOfflineSlidesFromLesson(output, form, Number(slideCount) || 10);
    setSlideOutput(JSON.stringify(deck, null, 2));
    setActiveSlide(0);
    setSlideError('');
    showToast(language === 'vi' ? 'Đã tạo bản slide nhanh từ giáo án.' : 'Quick slide draft created from lesson plan.');
  };

  const savePrompt = () => {
    const prompt = promptPreview || buildPromptNow();
    savePromptEntry({
      title: `5512 Lesson Plan - ${form.lessonTitle || form.query}`.slice(0, 90),
      category: 'Lesson Architect',
      body: prompt,
    });
    showToast(language === 'vi' ? 'Đã lưu prompt.' : 'Prompt saved.');
  };

  const copyOutput = async () => {
    try {
      await navigator.clipboard.writeText(output || promptPreview);
      showToast(language === 'vi' ? 'Đã copy.' : 'Copied.');
    } catch {
      showToast(language === 'vi' ? 'Không copy được.' : 'Copy failed.');
    }
  };

  const copySlides = async () => {
    try {
      await navigator.clipboard.writeText(slideDeckToMarkdown(slideDeck));
      showToast(language === 'vi' ? 'Đã copy slide outline.' : 'Slide outline copied.');
    } catch {
      showToast(language === 'vi' ? 'Không copy được.' : 'Copy failed.');
    }
  };

  const exportSlideHtml = () => downloadFile(`${titleSlug}-slides.html`, buildSlideDeckHtml(slideDeck), 'text/html;charset=utf-8');
  const exportSlidePpt = () => downloadFile(`${titleSlug}-slides.ppt`, buildPptHtml(slideDeck), 'application/vnd.ms-powerpoint;charset=utf-8');

  const isVi = language === 'vi';
  const profileName = currentUser?.fullName || currentUser?.name || currentUser?.email?.split('@')[0] || 'anhtuan';
  const profileRole = currentUser?.role || (isVi ? 'Giáo viên' : 'Teacher');
  const selectedDomainCards = DIGITAL_COMPETENCE_DOMAINS.filter((domain) => selectedDomains.includes(domain.id));
  const visibleDomainCards = (selectedDomainCards.length ? selectedDomainCards : DIGITAL_COMPETENCE_DOMAINS.slice(0, 4)).slice(0, 4);
  const sourceLabel = workflowMode === 'keyword-to-plan'
    ? (isVi ? 'Từ khóa' : 'Keywords')
    : files.length
      ? `${files.length} ${isVi ? 'tệp' : 'file(s)'}`
      : (isVi ? 'Tài liệu' : 'Materials');
  const starterCards = [
    {
      id: 'curriculum-batch',
      tone: 'purple',
      icon: '🗓️',
      title: isVi ? 'Giáo án cả năm' : 'Full-year curriculum',
      desc: isVi ? 'KHGD + SGK → danh sách bài → soạn hàng loạt' : 'Curriculum + textbook → full lesson-plan set',
    },
    {
      id: 'existing-plan',
      tone: 'mint',
      icon: '📝',
      title: isVi ? 'Giáo án có sẵn' : 'Existing plan',
      desc: isVi ? 'Chọn mẫu giáo án phù hợp' : 'Use an existing lesson plan',
    },
    {
      id: 'material-to-plan',
      tone: 'sky',
      icon: '📁',
      title: isVi ? 'Từ tài liệu' : 'From materials',
      desc: isVi ? 'Tạo giáo án từ tài liệu của bạn' : 'Build from your materials',
    },
    {
      id: 'keyword-to-plan',
      tone: 'coral',
      icon: '🔎',
      title: isVi ? 'Từ từ khóa' : 'From keywords',
      desc: isVi ? 'Nhập từ khóa, AI gợi ý đề xuất' : 'Enter keywords and let AI suggest',
    },
  ];
  const progressSteps = isVi
    ? ['Tài liệu', 'AI phân tích', 'Gợi ý', 'Chỉnh sửa', 'Hoàn thiện']
    : ['Source', 'AI analyse', 'Suggest', 'Refine', 'Complete'];
  const aiSuggestionCards = [
    {
      no: '01',
      icon: '📈',
      title: isVi ? 'Phân tích' : 'Analyse',
      desc: isVi ? 'Hiểu nội dung tài liệu' : 'Understand the source',
    },
    {
      no: '02',
      icon: '🎯',
      title: isVi ? 'Mục tiêu' : 'Objectives',
      desc: isVi ? 'Đề xuất mục tiêu bài học' : 'Suggest lesson objectives',
    },
    {
      no: '03',
      icon: '🛡️',
      title: isVi ? 'Năng lực số' : 'Digital skills',
      desc: isVi ? 'Gợi ý năng lực phù hợp' : 'Match useful competences',
    },
    {
      no: '04',
      icon: '🧩',
      title: isVi ? 'Hoạt động' : 'Activities',
      desc: isVi ? 'Đề xuất hoạt động học' : 'Propose learning activities',
    },
  ];
  const domainToneMap = {
    info: 'blue',
    comm: 'green',
    content: 'coral',
    safety: 'purple',
    problem: 'amber',
    learning: 'mint',
  };
  const shortDomainLabel = (domain) => (isVi ? domain.vi : domain.title);
  const aiBusy = loading || analysisLoading || cleaningExtract || slideLoading;
  const aiBusyLabel = loading
    ? (isVi ? 'AI đang soạn giáo án...' : 'AI is generating the lesson plan...')
    : analysisLoading
      ? (isVi ? 'AI đang phân tích nguồn...' : 'AI is analysing the source...')
      : cleaningExtract
        ? (isVi ? 'AI đang làm sạch nội dung...' : 'AI is cleaning the source...')
        : (isVi ? 'AI đang xử lý...' : 'AI is working...');

  return (
    <div className="page tool-page lesson-architect-page lesson-architect-v50">
      <button className="lesson-v50-back" onClick={() => window.history.back()}>
        ← {isVi ? 'Quay lại' : 'Back'}
      </button>

      <section className="panel lesson-v50-hero">
        <div className="lesson-v50-hero-illustration" aria-hidden="true">
          <div className="lesson-v50-book-stack">
            <span className="book one" />
            <span className="book two" />
            <span className="book three" />
          </div>
          <div className="lesson-v50-clipboard">
            <span />
            <span />
            <span />
            <i>✓</i>
          </div>
          <div className="lesson-v50-pencil" />
        </div>

        <div className="lesson-v50-hero-copy">
          <span className="lesson-v50-tag">Lesson Architect • Curriculum-to-Lesson Workflow</span>
          <h1>{isVi ? 'Thiết kế giáo án một bài hoặc trọn năm học' : 'Design one lesson or a complete school-year plan'}</h1>
          <p>{isVi ? 'Đọc KHGD, đối chiếu SGK, soạn tuần tự và xuất Word đúng chuẩn.' : 'Read curriculum plans, align textbooks, generate sequentially and export to Word.'}</p>
        </div>

        <div className="lesson-v50-stat-grid">
          <div className="lesson-v50-stat-card">
            <strong>{hasApiKey ? (isVi ? 'AI sẵn sàng' : 'AI ready') : (isVi ? 'Cần API' : 'Need API')}</strong>
            <small>{aiModel || 'GPT-4o mini'}</small>
          </div>
          <div className="lesson-v50-stat-card">
            <strong>{isVi ? 'Nguồn' : 'Source'}: {workflowMode === 'curriculum-batch' ? (isVi ? 'KHGD + SGK' : 'Curriculum + textbook') : sourceLabel}</strong>
            <small>{workflowMode === 'curriculum-batch' ? (isVi ? 'Google Drive, PDF, DOCX' : 'Google Drive, PDF, DOCX') : (workflowMode === 'keyword-to-plan' ? 'Prompt' : 'PDF, DOCX, TXT')}</small>
          </div>
          <div className="lesson-v50-stat-card">
            <strong>{selectedDomains.length} {isVi ? 'năng lực' : 'skills'}</strong>
            <small>{isVi ? 'Khung năng lực số' : 'Digital competence framework — Circular 02/2025/TT-BGDĐT'}</small>
          </div>
        </div>
      </section>

      <section className="lesson-v50-starter-grid">
        {starterCards.map((card) => (
          <button
            key={card.id}
            type="button"
            className={workflowMode === card.id ? `lesson-v50-starter-card active tone-${card.tone}` : `lesson-v50-starter-card tone-${card.tone}`}
            onClick={() => {
              setWorkflowMode(card.id);
              setAnalysisOutput('');
              setPromptPreview('');
              setOutput('');
            }}
          >
            <span className="lesson-v50-starter-icon" aria-hidden="true">{card.icon}</span>
            <div>
              <strong>{card.title}</strong>
              <small>{card.desc}</small>
            </div>
            <span className="lesson-v50-starter-cta">{isVi ? 'Bắt đầu' : 'Start'} →</span>
          </button>
        ))}
      </section>

      {workflowMode === 'curriculum-batch' ? (
        <LessonArchitectCurriculumBuilder
          language={language}
          hasApiKey={hasApiKey}
          aiModel={aiModel}
          currentUser={currentUser}
          readTextFile={readTextFile}
          onExit={() => setWorkflowMode('material-to-plan')}
        />
      ) : (
        <>
      <section className="lesson-v50-main-grid">
        <div className="lesson-v50-main-left">
          <article className="panel lesson-v50-source-card">
            <div className="lesson-v50-section-head">
              <div>
                <span className="eyebrow">1. {isVi ? 'Tài liệu đầu vào' : 'Input source'}</span>
                <h2>{workflowMode === 'keyword-to-plan'
                  ? (isVi ? 'Nhập từ khóa / yêu cầu' : 'Enter keywords / request')
                  : (isVi ? 'Tài liệu / nội dung bài dạy' : 'Lesson materials / content')}</h2>
              </div>
              {workflowMode !== 'existing-plan' && (
                <button type="button" className="secondary lesson-v50-inline-btn" onClick={analyseLessonInput} disabled={analysisLoading}>
                  {analysisLoading ? (isVi ? 'Đang phân tích...' : 'Analysing...') : (isVi ? 'AI phân tích' : 'AI analyse')}
                </button>
              )}
            </div>

            {workflowMode !== 'keyword-to-plan' ? (
              <div className="lesson-v50-input-grid">
                <div className="lesson-v50-upload-box">
                  <label className="lesson-v50-dropzone">
                    <span className="lesson-v50-drop-icon">☁️</span>
                    <strong>{isVi ? 'Kéo thả tệp vào đây' : 'Drop files here'}</strong>
                    <small>{isVi ? 'PDF, DOCX, TXT (tối đa 50MB)' : 'PDF, DOCX, TXT (up to 50MB)'}</small>
                    <input className="lesson-v50-file-input" type="file" multiple accept=".pdf,.docx,.txt,.md,.html,.htm,.csv" onChange={handleFiles} />
                  </label>
                  <div className="lesson-v50-upload-actions">
                    <button type="button" className="secondary" onClick={() => readSelectedFiles(files)} disabled={!files.length || extracting}>
                      {extracting ? (isVi ? 'Đang đọc...' : 'Reading...') : (isVi ? 'Đọc lại file' : 'Re-read')}
                    </button>
                    <button type="button" className="secondary" onClick={cleanExtractWithAI} disabled={!fileText || cleaningExtract}>
                      {cleaningExtract ? (isVi ? 'Đang làm sạch...' : 'Cleaning...') : (isVi ? 'AI làm sạch' : 'AI clean')}
                    </button>
                  </div>
                  {files.length > 0 && <div className="lesson-v50-file-chip-row">{files.map((f) => <span key={f.name}>{f.name}</span>)}</div>}
                </div>

                <div className="lesson-v50-text-stack">
                  <label>{isVi ? 'Hoặc nhập nội dung' : 'Or paste the content'}</label>
                  <textarea
                    className="lesson-v50-main-textarea"
                    rows={7}
                    value={fileText}
                    onChange={(e) => setFileText(e.target.value)}
                    placeholder={isVi ? 'Nhập hoặc dán nội dung bài dạy...' : 'Type or paste lesson content...'}
                  />
                  <small className="lesson-v50-char-count">{(fileText || '').length}/5000</small>
                </div>
              </div>
            ) : (
              <div className="lesson-v50-keyword-box">
                <textarea
                  className="lesson-v50-main-textarea"
                  rows={6}
                  value={form.query}
                  onChange={(e) => patch('query', e.target.value)}
                  placeholder={isVi ? 'Ví dụ: Past Simple vs Past Continuous, lớp 10, B2, 45 phút, TBLT...' : 'Example: Past Simple vs Past Continuous, Grade 10, B2, 45 minutes, TBLT...'}
                />
              </div>
            )}

            <div className="lesson-v50-note-box">
              <label>{isVi ? 'Yêu cầu thêm' : 'Extra requirements'}</label>
              <textarea
                rows={3}
                value={extraNotes}
                onChange={(e) => setExtraNotes(e.target.value)}
                placeholder={isVi ? 'Ví dụ: thêm trò chơi, tăng hoạt động nhóm, đánh giá cuối tiết...' : 'Example: add games, more group work, quick exit ticket...'}
              />
            </div>

            {fileStatus && <p className="success-note lesson-v50-status-note">✅ {fileStatus}</p>}
            {analysisOutput && (
              <details className="lesson-v50-analysis" open>
                <summary>{isVi ? 'Gợi ý từ AI' : 'AI suggestions'}</summary>
                <pre>{analysisOutput}</pre>
              </details>
            )}
          </article>

          <article className="panel lesson-v50-ai-card">
            <div className="lesson-v50-section-head compact">
              <div>
                <span className="eyebrow">2. {isVi ? 'AI gợi ý' : 'AI support'}</span>
                <h2>{isVi ? 'Quy trình gợi ý nhanh' : 'Quick suggestion flow'}</h2>
              </div>
            </div>
            <div className="lesson-v50-ai-grid">
              {aiSuggestionCards.map((card) => (
                <div key={card.no} className="lesson-v50-ai-item">
                  <span className="lesson-v50-ai-icon" aria-hidden="true">{card.icon}</span>
                  <strong>{card.title}</strong>
                  <p>{card.desc}</p>
                  <em>{card.no}</em>
                </div>
              ))}
            </div>
          </article>
        </div>

        <aside className="lesson-v50-main-right">
          <article className="panel lesson-v50-progress-card">
            <div className="lesson-v50-section-head compact">
              <div>
                <span className="eyebrow">{isVi ? 'Tiến trình' : 'Progress'}</span>
                <h2>{isVi ? 'Lộ trình thiết kế' : 'Design workflow'}</h2>
              </div>
            </div>
            <div className="lesson-v50-progress-line">
              {progressSteps.map((step, index) => (
                <div key={step} className={index === 0 ? 'lesson-v50-progress-step active' : 'lesson-v50-progress-step'}>
                  <span>{index + 1}</span>
                  <small>{step}</small>
                </div>
              ))}
            </div>
          </article>

          <article className="panel lesson-v50-domain-card">
            <div className="lesson-v50-section-head compact">
              <div>
                <span className="eyebrow">{isVi ? 'Năng lực số' : 'Digital competences'}</span>
                <h2>{isVi ? 'Chọn năng lực số' : 'Choose digital skills'}</h2>
              </div>
            </div>
            <div className="lesson-v50-domain-grid">
              {DIGITAL_COMPETENCE_DOMAINS.map((domain) => (
                <button
                  key={domain.id}
                  type="button"
                  className={selectedDomains.includes(domain.id) ? `lesson-v50-domain-chip active tone-${domainToneMap[domain.id] || 'mint'}` : `lesson-v50-domain-chip tone-${domainToneMap[domain.id] || 'mint'}`}
                  onClick={() => toggleDomain(domain.id)}
                >
                  <span className="lesson-v50-domain-check" aria-hidden="true">✓</span>
                  <strong>{shortDomainLabel(domain)}</strong>
                </button>
              ))}
            </div>
          </article>

          <article className="panel lesson-v50-profile-card">
            <div className="lesson-v50-section-head compact">
              <div>
                <span className="eyebrow">{isVi ? 'Hồ sơ' : 'Profile'}</span>
                <h2>{profileName}</h2>
              </div>
            </div>
            <div className="lesson-v50-profile-row">
              <span className="lesson-v50-avatar">{String(profileName).trim().charAt(0).toUpperCase() || 'A'}</span>
              <div>
                <strong>{profileRole}</strong>
                <small>{isVi ? 'Môn: Tiếng Anh' : 'Subject: English'}</small>
              </div>
              <button className="secondary" onClick={() => (window.location.hash = '#/library')}>{isVi ? 'Xem hồ sơ' : 'View profile'}</button>
            </div>
          </article>

          <article className="panel lesson-v50-action-card">
            {error && <p className="error-box">⚠️ {error}</p>}
            <button className="primary lesson-v50-primary-action" onClick={generate} disabled={loading}>
              {loading ? (isVi ? 'Đang xử lý...' : 'Processing...') : (workflowMode === 'existing-plan' ? (isVi ? 'AI bổ sung giáo án' : 'AI enrich plan') : (isVi ? 'AI soạn giáo án' : 'AI generate lesson'))}
            </button>
            <div className="lesson-v50-action-row">
              {!hasApiKey && <button className="secondary" onClick={() => (window.location.hash = '#/settings')}>{isVi ? 'Cấu hình AI' : 'Configure AI'}</button>}
              <button className="secondary" onClick={buildPromptNow}>{isVi ? 'Xem prompt' : 'Preview prompt'}</button>
              <button className="secondary" onClick={savePrompt}>{isVi ? 'Lưu prompt' : 'Save prompt'}</button>
            </div>
          </article>
        </aside>
      </section>

      <section className="panel lesson-v50-output-card">
        <div className="lesson-v50-section-head">
          <div>
            <span className="eyebrow">3. {isVi ? 'Kết quả' : 'Result'}</span>
            <h2>{isVi ? 'Giáo án AI tạo ra' : 'AI-generated lesson plan'}</h2>
          </div>
          <div className="preview-actions wrap-actions">
            <button onClick={copyOutput} disabled={!output}>{isVi ? 'Copy' : 'Copy'}</button>
            <button onClick={() => downloadFile(`${titleSlug}.txt`, output)} disabled={!output}>TXT</button>
            <button onClick={() => downloadFile(`${titleSlug}.md`, output)} disabled={!output}>MD</button>
            <button onClick={() => exportAsHtml(form.lessonTitle || 'Lesson Plan 5512', output)} disabled={!output}>HTML</button>
            <button onClick={() => exportAsWord(form.lessonTitle || 'Lesson Plan 5512', output)} disabled={!output}>Word</button>
            <button className="primary" onClick={saveLessonToProfile} disabled={!output}>{isVi ? 'Lưu hồ sơ' : 'Save'}</button>
          </div>
        </div>

        {promptPreview && !output && (
          <details className="lesson-v50-analysis" open>
            <summary>{isVi ? 'Prompt xem trước' : 'Prompt preview'}</summary>
            <pre>{promptPreview}</pre>
          </details>
        )}

        {output ? (
          <pre className="ai-output lesson-v50-output">{output}</pre>
        ) : (
          <div className="lesson-v50-empty">
            <span>✨</span>
            <strong>{isVi ? 'Giáo án sẽ hiện ở đây' : 'The lesson plan will appear here'}</strong>
            <p>{isVi ? 'Nhập nguồn, chọn năng lực số và bấm AI soạn giáo án.' : 'Add source content, choose skills, then generate the lesson plan.'}</p>
          </div>
        )}
      </section>
        </>
      )}

      {aiBusy && (
        <div className="lesson-v50-ai-overlay" role="status" aria-live="polite">
          <div className="lesson-v50-ai-indicator">
            <div className="lesson-v50-ai-rings" aria-hidden="true">
              <span />
              <span />
              <span />
            </div>
            <strong>{aiBusyLabel}</strong>
            <small>{isVi ? 'Vui lòng chờ, hệ thống đang xử lý nội dung.' : 'Please wait while the system processes your content.'}</small>
          </div>
        </div>
      )}

      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}
