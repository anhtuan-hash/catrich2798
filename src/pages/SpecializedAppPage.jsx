import React, { useEffect, useMemo, useState } from 'react';
import { readDocxTextFromBuffer, readPdfTextFromBuffer } from '../utils/documentParsers.js';
import { extractJson } from '../utils/gemini.js';
import { runAITask } from '../utils/aiTaskRuntime.js';
import {
  analyzeExamRequirement,
  buildExamOutputFromQuestions,
  createDefaultExamProject,
  EXAM_TYPE_OPTIONS,
  generateExamWorkflowOutput,
  getSpecializedConfig,
  QUESTION_FORMAT_GROUPS,
  recognizeExamQuestionsFromText,
  SKILL_OPTIONS,
  SOURCE_MODE_OPTIONS,
  SPECIALIZED_TOOL_SLUGS,
} from '../utils/specializedAppEngines.js';

const VAULT_KEY = 'bes-exam-studio-v949-vault';
const STEP_LABELS = ['Loại bài kiểm tra', 'Nguồn tạo đề', 'Preview & chỉnh sửa', 'Xuất file / HTML'];

function escapeHtml(text) {
  return String(text || '').replace(/[&<>'"]/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[ch]));
}

function markdownToHtml(markdown) {
  const rows = String(markdown || '').split(/\r?\n/);
  let inTable = false;
  let inList = false;
  const html = [];
  rows.forEach((line) => {
    const text = line.trim();
    if (!text) {
      if (inTable) { html.push('</tbody></table>'); inTable = false; }
      if (inList) { html.push('</ul>'); inList = false; }
      html.push('<p></p>');
      return;
    }
    if (/^\|/.test(text)) {
      if (!inTable) { html.push('<table><tbody>'); inTable = true; }
      if (/^\|[-: ]+\|/.test(text)) return;
      const cells = text.split('|').slice(1, -1).map((cell) => `<td>${escapeHtml(cell.trim())}</td>`).join('');
      html.push(`<tr>${cells}</tr>`);
      return;
    }
    if (inTable) { html.push('</tbody></table>'); inTable = false; }
    if (/^###\s+/.test(text)) { if (inList) { html.push('</ul>'); inList = false; } html.push(`<h3>${escapeHtml(text.replace(/^###\s+/, ''))}</h3>`); return; }
    if (/^##\s+/.test(text)) { if (inList) { html.push('</ul>'); inList = false; } html.push(`<h2>${escapeHtml(text.replace(/^##\s+/, ''))}</h2>`); return; }
    if (/^#\s+/.test(text)) { if (inList) { html.push('</ul>'); inList = false; } html.push(`<h1>${escapeHtml(text.replace(/^#\s+/, ''))}</h1>`); return; }
    if (/^[-*]\s+/.test(text)) {
      if (!inList) { html.push('<ul>'); inList = true; }
      html.push(`<li>${escapeHtml(text.replace(/^[-*]\s+/, ''))}</li>`);
      return;
    }
    if (inList) { html.push('</ul>'); inList = false; }
    html.push(`<p>${escapeHtml(text)}</p>`);
  });
  if (inTable) html.push('</tbody></table>');
  if (inList) html.push('</ul>');
  return html.join('\n');
}

function slugify(text) {
  return String(text || 'exam-studio-output').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '').slice(0, 70) || 'exam-studio-output';
}

function downloadBlob(filename, content, type = 'text/plain;charset=utf-8') {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function exportDoc(title, markdown) {
  const html = `<!doctype html><html><head><meta charset="utf-8"><title>${escapeHtml(title)}</title><style>body{font-family:Arial,sans-serif;line-height:1.55;color:#111827}h1,h2,h3{color:#075985}table{border-collapse:collapse;width:100%;margin:12px 0}td,th{border:1px solid #d1d5db;padding:7px}li{margin:5px 0}</style></head><body>${markdownToHtml(markdown)}</body></html>`;
  downloadBlob(`${slugify(title)}.doc`, html, 'application/msword;charset=utf-8');
}

function printOutput(title, markdown) {
  const win = window.open('', '_blank', 'noopener,noreferrer');
  if (!win) return;
  win.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>${escapeHtml(title)}</title><style>body{font-family:Arial,sans-serif;line-height:1.55;padding:24px;color:#111827}h1,h2,h3{color:#075985}table{border-collapse:collapse;width:100%;margin:12px 0}td,th{border:1px solid #d1d5db;padding:7px}@media print{button{display:none}}</style></head><body><button onclick="window.print()">Print / Save as PDF</button>${markdownToHtml(markdown)}</body></html>`);
  win.document.close();
}

async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text || '');
  } catch {
    const area = document.createElement('textarea');
    area.value = text || '';
    document.body.appendChild(area);
    area.select();
    document.execCommand('copy');
    area.remove();
  }
}

function loadVault() {
  try {
    const parsed = JSON.parse(localStorage.getItem(VAULT_KEY) || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveVault(item) {
  const next = [item, ...loadVault()].slice(0, 40);
  localStorage.setItem(VAULT_KEY, JSON.stringify(next));
  return next;
}


function compactText(value, max = 9000) {
  const text = String(value || '').trim();
  return text.length > max ? `${text.slice(0, max)}\n\n[TRUNCATED]` : text;
}

const VIETNAMESE_SIGNAL_RE = /[ăâđêôơưáàảãạấầẩẫậắằẳẵặéèẻẽẹếềểễệíìỉĩịóòỏõọốồổỗộớờởỡợúùủũụứừửữựýỳỷỹỵ]/i;
const VIETNAMESE_COMMON_RE = /\b(ai|là|người|đứng|đầu|tổ chức|cuộc thi|diễn ra|ở đâu|chọn|đáp án|giải thích|câu hỏi|theo đoạn|trong bài|hãy|điền|sửa lỗi|từ nào|phương án)\b/i;

function hasVietnameseExamText(text) {
  const value = String(text || '').trim();
  if (!value) return false;
  return VIETNAMESE_SIGNAL_RE.test(value) || VIETNAMESE_COMMON_RE.test(value);
}

function assertEnglishOnlyQuestions(questions, passages = []) {
  const offenders = [];
  (questions || []).forEach((question, index) => {
    const fields = [question.stem, question.explanation, question.sampleAnswer, question.rubric, question.passageTitle, question.passageText, ...(question.options || []).map((option) => option.text)];
    if (fields.some(hasVietnameseExamText)) offenders.push(index + 1);
  });
  const badPassages = (passages || []).filter((passage) => [passage.title, passage.text].some(hasVietnameseExamText));
  if (offenders.length || badPassages.length) {
    const questionText = offenders.length ? `question(s): ${offenders.slice(0, 8).join(', ')}` : '';
    const passageText = badPassages.length ? `${questionText ? '; ' : ''}reading passage(s): ${badPassages.map((p) => p.title || p.id).slice(0, 4).join(', ')}` : '';
    throw new Error(`AI returned Vietnamese text in ${questionText}${passageText}. English-only generation is required.`);
  }
}

function isReadingProject(project) {
  const haystack = [
    project?.skill,
    project?.topic,
    project?.purpose,
    project?.aiBrief,
    project?.aiRequirement,
    ...(project?.selectedFormats || []),
  ].join(' ').toLowerCase();
  return /reading|passage|comprehension|đọc|doc|reading-mcq|heading-matching|information-matching|give-evidence|summary-completion|reading-response|reading-timer/.test(haystack);
}

function fallbackReadingPassage(project) {
  const topic = String(project?.topic || project?.aiRequirement || 'modern learning').replace(/\s+/g, ' ').trim().slice(0, 80) || 'modern learning';
  return {
    id: 'passage-1',
    title: `${topic} — Reading Passage`,
    text: `In recent years, ${topic.toLowerCase()} has become an important topic in schools and communities. Many learners encounter it through classroom discussions, online materials, and real-life situations. Supporters argue that understanding this topic helps students think more critically, use language more accurately, and connect new knowledge with familiar experiences. However, teachers often need to guide students carefully because the topic may include details, examples, and viewpoints that are easy to confuse. A good reading task should therefore encourage learners to identify main ideas, locate specific information, infer meaning from context, and evaluate the writer's purpose. When students practise these skills regularly, they become more confident readers and can respond to exam questions more effectively.`,
  };
}

function selectedFormatLabels(project) {
  const formats = QUESTION_FORMAT_GROUPS.flatMap((group) => group.formats);
  return (project.selectedFormats || [])
    .map((id) => formats.find((format) => format.id === id)?.label || id)
    .join(', ');
}

function buildAiBriefPrompt(project) {
  return `You are an expert Vietnamese high-school English test designer. Analyze the teacher's request and convert it into a concrete exam brief. Return STRICT JSON only.

VERY IMPORTANT LANGUAGE RULE:
- The final exam content MUST be written in English only.
- The brief must preserve the teacher's requirement, but topic, formats, section titles, requirements, and briefText should be written in English.
- Do NOT plan Vietnamese questions, Vietnamese stems, or Vietnamese answer choices.

Teacher request:
${compactText(project.aiRequirement || project.aiBrief || project.topic)}

Current selections:
- Exam type: ${project.examType}
- Level: ${project.level}
- Question count: ${project.questionCount}
- Skill: ${project.skill}
- Selected formats: ${selectedFormatLabels(project)}
- Question language: English only
- If this is a reading test, the brief must include a reading passage requirement before the questions.

JSON schema:
{
  "topic": "short English topic",
  "level": "B2-C1",
  "purpose": "15-minute test / THPT-oriented test / ...",
  "questionCount": 30,
  "skill": "grammar | vocabulary | reading | listening | writing | speaking | mixed-skills | thpt-format",
  "formats": ["Multiple Choice 4 options", "Cloze Test"],
  "sections": [
    {"title": "Part 1", "format": "Multiple Choice", "count": 15, "focus": "English-only focus"}
  ],
  "requirements": ["English-only requirement"],
  "briefText": "editable English brief for the teacher"
}`;
}

function buildAiQuestionPrompt(project, strictEnglishRetry = false) {
  const englishOnlyWarning = strictEnglishRetry
    ? '\nCRITICAL RETRY: Your previous answer contained Vietnamese or non-English question text. Regenerate everything in natural English only. Any Vietnamese word in title, stem, options, answer, explanation, sampleAnswer, or rubric is invalid.'
    : '';
  return `You are an expert English test writer for Vietnamese high-school teachers. Create REAL exam questions, not placeholders. Return STRICT JSON only. Do not use markdown fences.${englishOnlyWarning}

NON-NEGOTIABLE LANGUAGE RULES:
1. The exam itself MUST be 100% ENGLISH.
2. Write title, topic, purpose, stem, options, answer text, explanation, sampleAnswer, and rubric in English only.
3. Do NOT write Vietnamese question stems such as "Ai là...", "Chọn...", "Đáp án...", "Giải thích...".
4. Do NOT translate answer options into Vietnamese.
5. The app interface may be Vietnamese, but generated exam content must remain English.

EXAM BRIEF:
${compactText(project.aiBrief || project.aiRequirement || project.topic)}

TEACHER SELECTIONS:
- Exam type/purpose: ${project.purpose || project.examType}
- Topic: ${project.topic}
- Level: ${project.level}
- Question count: ${project.questionCount}
- Skill: ${project.skill}
- Selected question formats: ${selectedFormatLabels(project)}
- Question language: English only
- Explanation language: English only
- Include answer key: yes
- Include short explanations/rubrics: yes

Rules:
1. Generate EXACTLY ${Math.max(1, Math.min(Number(project.questionCount) || 10, 80))} questions. This is non-negotiable. Do not generate fewer questions. Do not generate more questions. The reading passage is NOT counted as a question.
2. Use the selected formats when possible. Mix MCQ, cloze, word formation, short answer, or other selected types.
3. Each MCQ must have 4 options A-D and exactly one correct answer.
4. Questions must be classroom-ready and related to the teacher's topic.
5. Avoid duplicate stems and avoid generic placeholder wording.
6. For open-ended questions, provide a sampleAnswer and a scoring rubric.
7. If the teacher request is written in Vietnamese, understand it, then generate the exam in English.
8. READING TEST RULE: If Skill is reading, selected formats include reading, or the brief asks for reading comprehension, you MUST create at least one full English reading passage BEFORE the questions. The questions must refer to that passage and include a passageId. Do not create isolated reading questions without a passage.
9. Reading passage length guide: B1-B2 = 180-250 words; B2-C1 = 250-380 words; C1 = 350-500 words. The passage must be coherent, original, and classroom-ready.
10. Before returning JSON, count the questions array. It must contain exactly ${Math.max(1, Math.min(Number(project.questionCount) || 10, 80))} items.

JSON schema:
{
  "title": "short English exam title",
  "topic": "English topic",
  "level": "B2-C1",
  "purpose": "English purpose",
  "duration": 15,
  "passages": [
    {
      "id": "passage-1",
      "title": "English reading passage title",
      "text": "Full English reading passage. Required for reading tests. Omit only if the exam is not a reading test."
    }
  ],
  "questions": [
    {
      "kind": "Grammar MCQ or Reading Comprehension MCQ",
      "formatLabel": "Multiple Choice 4 options",
      "band": "NB | TH | VD | VDC",
      "passageId": "passage-1 for reading questions only",
      "stem": "English question text without question number",
      "options": [
        {"key":"A", "text":"English option"},
        {"key":"B", "text":"English option"},
        {"key":"C", "text":"English option"},
        {"key":"D", "text":"English option"}
      ],
      "answer": "A",
      "explanation": "short English explanation that cites the passage when relevant",
      "sampleAnswer": "English sample answer for open-ended questions only",
      "rubric": "English rubric for open-ended questions only"
    }
  ]
}`;
}

function normalizeAiBriefJson(json, currentProject) {
  const topic = String(json.topic || currentProject.topic || 'English test').trim();
  const level = String(json.level || currentProject.level || 'B2-C1').trim();
  const purpose = String(json.purpose || currentProject.purpose || '15-minute test').trim();
  const questionCount = Math.max(1, Math.min(Number(json.questionCount || currentProject.questionCount || 10), 120));
  const skill = String(json.skill || currentProject.skill || 'grammar').trim();
  const sectionText = Array.isArray(json.sections) && json.sections.length
    ? json.sections.map((section, index) => `Part ${index + 1}: ${section.title || section.format || 'Section'} — ${section.count || ''} questions — ${section.focus || ''}`).join('\n')
    : '';
  const requirements = Array.isArray(json.requirements) ? json.requirements.map((item) => `- ${item}`).join('\n') : '';
  const briefText = String(json.briefText || '').trim() || [
    `Topic: ${topic}`, 
    `Level: ${level}`,
    `Purpose: ${purpose}`, 
    `Number of questions: ${questionCount}`, 
    `Skill focus: ${skill}`, 
    Array.isArray(json.formats) ? `Question formats: ${json.formats.join(', ')}` : `Question formats: ${selectedFormatLabels(currentProject)}`,
    sectionText ? `Structure:\n${sectionText}` : '',
    requirements ? `Specific requirements:\n${requirements}` : '',
  ].filter(Boolean).join('\n');
  return {
    topic,
    level,
    purpose,
    questionCount,
    skill,
    aiBrief: briefText,
    sourceMode: 'ai-topic',
  };
}


function targetQuestionCount(project) {
  return Math.max(1, Math.min(Number(project?.questionCount) || 10, 120));
}

function renumberExamQuestions(questions) {
  return (questions || []).map((question, index) => ({
    ...question,
    id: question.id || `q-${Date.now()}-${index + 1}`,
    no: index + 1,
    stem: `${index + 1}. ${String(question.stem || question.question || '').replace(/^\d+\.\s*/, '').trim()}`,
  }));
}

function fallbackQuestionsForMissingCount(project, count, startIndex = 0, passages = []) {
  if (count <= 0) return [];
  const output = generateExamWorkflowOutput({
    ...project,
    questionCount: count,
    passages: passages?.length ? passages : project?.passages,
    recognizedQuestions: [],
  });
  return (output.questions || []).slice(0, count).map((question, index) => {
    const no = startIndex + index + 1;
    const passage = passages?.[0];
    return {
      ...question,
      id: `count-fix-${Date.now()}-${no}`,
      no,
      passageId: question.passageId || passage?.id || '',
      passageTitle: question.passageTitle || passage?.title || '',
      passageText: question.passageText || passage?.text || '',
      stem: `${no}. ${String(question.stem || '').replace(/^\d+\.\s*/, '').trim()}`,
    };
  });
}

function adjustNormalizedQuestionCount(normalized, project) {
  const expected = targetQuestionCount(project);
  const current = normalized.questions.length;
  if (current === expected) return normalized;
  const passages = normalized.passages || [];
  let questions = normalized.questions;
  if (current > expected) {
    questions = questions.slice(0, expected);
  } else {
    const missing = expected - current;
    questions = [
      ...questions,
      ...fallbackQuestionsForMissingCount(project, missing, current, passages),
    ];
  }
  questions = renumberExamQuestions(questions).slice(0, expected);
  return {
    ...normalized,
    questions,
    projectPatch: {
      ...normalized.projectPatch,
      questionCount: expected,
      recognizedQuestions: questions,
      passages,
    },
  };
}

async function ensureExactAiQuestionCount(normalized, project, apiKey, aiModel) {
  const expected = targetQuestionCount(project);
  let fixed = adjustNormalizedQuestionCount(normalized, project);
  if ((normalized.questions || []).length >= expected || !apiKey) return fixed;

  const missing = expected - (normalized.questions || []).length;
  if (missing <= 0) return fixed;

  try {
    const existingStems = (normalized.questions || []).map((q) => q.stem).join('\n');
    const readingPassage = (normalized.passages || []).map((p) => `${p.title}\n${p.text}`).join('\n\n');
    const supplementProject = {
      ...project,
      questionCount: missing,
      passages: normalized.passages,
      aiBrief: `${project.aiBrief || project.aiRequirement || project.topic}\n\nCOUNT FIX: The previous response produced only ${normalized.questions.length}/${expected} questions. Generate EXACTLY ${missing} additional English-only question(s), not a full new exam. Do not duplicate these existing stems:\n${existingStems}${readingPassage ? `\n\nUse this same reading passage when relevant:\n${readingPassage}` : ''}`,
    };
    const supplementJson = await callExamAI({ project: supplementProject, mode: 'questions', apiKey, aiModel, strictEnglishRetry: true });
    const supplement = normalizeAiQuestionsJson(supplementJson, supplementProject);
    const mergedQuestions = [...(normalized.questions || []), ...(supplement.questions || [])];
    fixed = adjustNormalizedQuestionCount({
      ...normalized,
      passages: normalized.passages?.length ? normalized.passages : supplement.passages,
      questions: mergedQuestions,
      projectPatch: { ...normalized.projectPatch, recognizedQuestions: mergedQuestions },
    }, project);
  } catch {
    fixed = adjustNormalizedQuestionCount(normalized, project);
  }
  return fixed;
}

function normalizeAiQuestionsJson(json, currentProject) {
  const needsReadingPassage = isReadingProject(currentProject) || isReadingProject(json || {});
  let passages = Array.isArray(json.passages)
    ? json.passages.map((passage, index) => ({
        id: String(passage.id || `passage-${index + 1}`).trim() || `passage-${index + 1}`,
        title: String(passage.title || `Reading Passage ${index + 1}`).trim(),
        text: String(passage.text || passage.passage || '').replace(/\s+/g, ' ').trim(),
      })).filter((passage) => passage.text.length > 80)
    : [];

  if (needsReadingPassage && !passages.length) {
    passages = [fallbackReadingPassage(currentProject)];
  }

  const passageById = new Map(passages.map((passage) => [passage.id, passage]));
  const rawQuestions = Array.isArray(json.questions) ? json.questions : [];
  const questions = rawQuestions.map((q, index) => {
    const answer = String(q.answer || '').trim().toUpperCase();
    const hasOptions = Array.isArray(q.options) && q.options.length;
    const options = hasOptions
      ? q.options.slice(0, 4).map((option, optionIndex) => {
          const key = String(option.key || String.fromCharCode(65 + optionIndex)).trim().toUpperCase().slice(0, 1) || String.fromCharCode(65 + optionIndex);
          return {
            key: ['A', 'B', 'C', 'D'][optionIndex] || key,
            text: String(option.text || option.label || option || '').trim(),
            isCorrect: (['A', 'B', 'C', 'D'][optionIndex] || key) === answer,
          };
        })
      : [];
    if (options.length && !options.some((option) => option.isCorrect)) options[0].isCorrect = true;
    const correct = options.find((option) => option.isCorrect)?.key || answer || String(q.sampleAnswer || q.answer || '').trim() || 'Open response';
    const rawPassageId = String(q.passageId || q.passage_id || '').trim();
    const passageId = rawPassageId && passageById.has(rawPassageId) ? rawPassageId : (needsReadingPassage && passages[0] ? passages[0].id : '');
    const passage = passageId ? passageById.get(passageId) : null;
    return {
      id: `ai-${Date.now()}-${index + 1}`,
      no: index + 1,
      kind: String(q.kind || q.type || (passageId ? 'Reading Comprehension MCQ' : 'AI Generated Question')).trim(),
      formatId: String(q.formatId || (passageId ? 'reading-mcq' : 'ai-generated')).trim(),
      formatLabel: String(q.formatLabel || q.kind || (passageId ? 'Reading Comprehension' : 'AI Generated')).trim(),
      band: ['NB', 'TH', 'VD', 'VDC'].includes(String(q.band || '').toUpperCase()) ? String(q.band).toUpperCase() : ['NB', 'TH', 'VD', 'VDC'][index % 4],
      passageId,
      passageTitle: passage?.title || '',
      passageText: passage?.text || '',
      stem: `${index + 1}. ${String(q.stem || q.question || '').replace(/^\d+\.\s*/, '').trim()}`,
      options,
      answer: correct,
      explanation: String(q.explanation || q.teacherNote || '').trim(),
      sampleAnswer: String(q.sampleAnswer || (!options.length ? correct : '') || '').trim(),
      rubric: String(q.rubric || '').trim(),
      sourceFocus: currentProject.topic,
    };
  }).filter((q) => q.stem.replace(/^\d+\.\s*/, '').trim().length > 4);
  if (!questions.length) throw new Error('AI response did not include usable questions.');
  if (needsReadingPassage && !passages.length) throw new Error('Reading output requires a passage before questions.');
  return {
    projectPatch: {
      topic: String(json.topic || currentProject.topic || '').trim() || currentProject.topic,
      level: String(json.level || currentProject.level || '').trim() || currentProject.level,
      purpose: String(json.purpose || currentProject.purpose || '').trim() || currentProject.purpose,
      duration: Number(json.duration || currentProject.duration || 15),
      questionCount: targetQuestionCount(currentProject),
      sourceMode: 'ai-topic',
      passages,
      recognizedQuestions: questions,
    },
    passages,
    questions,
  };
}

async function callExamAI({ project, mode, apiKey, aiModel, strictEnglishRetry = false }) {
  const prompt = mode === 'brief' ? buildAiBriefPrompt(project) : buildAiQuestionPrompt(project, strictEnglishRetry);
  const systemInstruction = mode === 'brief'
    ? 'You analyze exam requirements for an English teacher. Return strict JSON only. The exam plan must target English-only generated content.'
    : 'You create accurate English exam questions. Return strict JSON only. All generated exam content must be English only.';
  const text = await runAITask('teaching.specializedGenerate', {
    apiKey,
    model: aiModel,
    prompt,
    systemInstruction,
    temperature: mode === 'brief' ? 0.3 : 0.65,
    responseMimeType: 'application/json',
  });
  return extractJson(text);
}

function Field({ label, children }) {
  return <label className="exam-field"><span>{label}</span>{children}</label>;
}

function Stepper({ step, setStep, output }) {
  const stepMeta = [
    { icon: '☷', label: 'Loại bài kiểm tra', desc: 'Chọn dạng câu hỏi' },
    { icon: '▤', label: 'Nguồn tạo đề', desc: 'Chọn hoặc nhập nội dung' },
    { icon: '◉', label: 'Preview & chỉnh sửa', desc: 'Xem trước và hiệu chỉnh đề' },
    { icon: '⇩', label: 'Xuất file / HTML', desc: 'Xuất đề ra file hoặc HTML' },
  ];
  return (
    <nav className="exam-stepper exam-stepper-v946 exam-v19-stepper" aria-label="Exam Studio workflow">
      {stepMeta.map((item, index) => {
        const locked = index >= 2 && !output;
        return (
          <button key={item.label} type="button" disabled={locked} className={`${index === step ? 'active' : ''} ${index < step ? 'done' : ''}`} onClick={() => !locked && setStep(index)}>
            <span className="exam-v19-step-icon" aria-hidden="true">{item.icon}</span>
            <i>{index + 1}</i>
            <b>{item.label}</b>
            <small>{item.desc}</small>
          </button>
        );
      })}
    </nav>
  );
}

function SummaryCard({ project, output }) {
  const formats = QUESTION_FORMAT_GROUPS.flatMap((group) => group.formats);
  const selectedFormats = (project.selectedFormats || [])
    .map((id) => formats.find((format) => format.id === id)?.label || id)
    .filter(Boolean);
  const now = new Date();
  const lastUpdated = `${now.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })} · ${now.toLocaleDateString('vi-VN')}`;
  return (
    <section className="panel exam-v35-summary-bar" aria-label="Tóm tắt đề hiện tại">
      <div className="exam-v35-summary-title">
        <span className="exam-v35-live-mark" aria-hidden="true" />
        <div><strong>Tóm tắt</strong><small>đề hiện tại</small></div>
      </div>
      <div className="exam-v35-summary-item exam-v35-format-summary">
        <span>Dạng câu đã chọn</span>
        <div className="exam-v35-format-chips">
          {selectedFormats.length ? selectedFormats.slice(0, 3).map((format, index) => <b key={format} data-tone={index % 3}>{format}</b>) : <em>Chưa chọn</em>}
          {selectedFormats.length > 3 ? <b data-tone="more">+{selectedFormats.length - 3}</b> : null}
        </div>
      </div>
      <div className="exam-v35-summary-item">
        <span>Số câu (dự kiến)</span>
        <strong>{project.questionCount || 0} <small>câu</small></strong>
      </div>
      <div className="exam-v35-summary-item">
        <span>Thời gian làm bài</span>
        <strong><i aria-hidden="true">◷</i>{project.duration || 0} phút</strong>
      </div>
      <div className="exam-v35-summary-item">
        <span>Độ khó trung bình</span>
        <strong><i aria-hidden="true">▥</i>{project.level || '—'}</strong>
      </div>
      <div className="exam-v35-summary-item">
        <span>Cập nhật lần cuối</span>
        <strong><i aria-hidden="true">□</i>{lastUpdated}</strong>
      </div>
      {output ? <div className="exam-v35-output-ready" title="Đã có bản xem trước">Preview sẵn sàng</div> : null}
    </section>
  );
}

function toggleValue(list, value) {
  return list.includes(value) ? list.filter((item) => item !== value) : [...list, value];
}

function StepType({ project, setProject }) {
  const selectedFormatCount = (project.selectedFormats || []).length;
  return (
    <section className="panel exam-work-panel exam-v946-panel">
      <span className="eyebrow">Bước 1</span>
      <h2>Chọn loại bài kiểm tra</h2>
      <p className="muted-line">Chọn mục tiêu, kỹ năng và dạng câu hỏi.</p>

      <div className="exam-v946-block">
        <h3>1. Mục tiêu bài kiểm tra</h3>
        <div className="exam-type-grid exam-type-grid-v946">
          {EXAM_TYPE_OPTIONS.map((item) => (
            <button key={item.id} type="button" className={project.examType === item.id ? 'selected' : ''} onClick={() => setProject((prev) => ({ ...prev, examType: item.id, purpose: item.label }))}>
              <span>{item.icon}</span><strong>{item.label}</strong><small>{item.desc}</small>
            </button>
          ))}
        </div>
      </div>

      <div className="exam-v946-block">
        <h3>2. Nhóm kỹ năng / nội dung</h3>
        <div className="exam-chip-grid">
          {SKILL_OPTIONS.map((item) => <button key={item.id} type="button" className={project.skill === item.id ? 'active' : ''} onClick={() => setProject((prev) => ({ ...prev, skill: item.id }))}>{item.label}</button>)}
        </div>
      </div>

      <div className="exam-v946-block">
        <div className="exam-v946-section-head"><h3>3. Dạng câu hỏi</h3><span>{selectedFormatCount} dạng đã chọn</span></div>
        <div className="question-format-groups">
          {QUESTION_FORMAT_GROUPS.map((group) => (
            <details key={group.id} open={group.id === 'mcq' || group.id === 'short-response'} className="question-format-group">
              <summary><strong>{group.title}</strong><small>{group.desc}</small></summary>
              <div className="question-format-grid">
                {group.formats.map((format) => (
                  <label key={format.id} className={project.selectedFormats?.includes(format.id) ? 'selected' : ''}>
                    <input type="checkbox" checked={project.selectedFormats?.includes(format.id) || false} onChange={() => setProject((prev) => ({ ...prev, selectedFormats: toggleValue(prev.selectedFormats || [], format.id) }))} />
                    <span>{format.label}</span>
                  </label>
                ))}
              </div>
            </details>
          ))}
        </div>
      </div>

      <div className="exam-v946-settings-row">
        <Field label="Ngôn ngữ đề"><select value="en" disabled><option>English only</option></select></Field>
        <Field label="Số câu"><input type="number" min="3" max="120" value={project.questionCount} onChange={(e) => setProject((prev) => ({ ...prev, questionCount: Number(e.target.value) || 10 }))} /></Field>
        <Field label="Level"><select value={project.level} onChange={(e) => setProject((prev) => ({ ...prev, level: e.target.value }))}>{['A2', 'B1', 'B1-B2', 'B2', 'B2-C1', 'C1', 'C2'].map((item) => <option key={item}>{item}</option>)}</select></Field>
        <Field label="Thời gian"><input type="number" min="5" max="180" value={project.duration} onChange={(e) => setProject((prev) => ({ ...prev, duration: Number(e.target.value) || 15 }))} /></Field>
        <Field label="Số mã đề"><input type="number" min="1" max="12" value={project.codes} onChange={(e) => setProject((prev) => ({ ...prev, codes: Number(e.target.value) || 1 }))} /></Field>
      </div>
    </section>
  );
}

function StepSource({ project, setProject, onRecognize, onAnalyze, onGenerate, recognition, language, aiLoading = false, aiError = '', aiNotice = '', hasApiKey = false }) {
  const [fileState, setFileState] = useState('');
  const handleFile = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setFileState(language === 'vi' ? 'Đang đọc file...' : 'Reading file...');
    try {
      const buffer = await file.arrayBuffer();
      let text = '';
      if (/\.pdf$/i.test(file.name)) text = await readPdfTextFromBuffer(buffer, { maxPages: 25, maxChars: 80000 });
      else if (/\.docx$/i.test(file.name)) text = await readDocxTextFromBuffer(buffer);
      else text = new TextDecoder('utf-8').decode(buffer);
      setProject((prev) => ({ ...prev, sourceText: text, sourceMode: 'paste' }));
      setFileState(`${language === 'vi' ? 'Đã nhập' : 'Imported'} ${file.name}`);
    } catch (error) {
      setFileState(`${language === 'vi' ? 'Không đọc được file:' : 'Cannot read file:'} ${error.message || error}`);
    }
  };

  return (
    <section className="panel exam-work-panel exam-v946-panel">
      <span className="eyebrow">Bước 2</span>
      <h2>Chọn 1 trong 2 cách tạo đề</h2>
      <p className="muted-line">Chọn Upload/Paste để nhận dạng, hoặc AI Keyword để tạo đề theo yêu cầu.</p>
      <div className="exam-source-mode-row exam-v946-tabs">
        {SOURCE_MODE_OPTIONS.map((item, index) => <button type="button" key={item.id} className={project.sourceMode === item.id ? 'active' : ''} onClick={() => setProject((prev) => ({ ...prev, sourceMode: item.id }))}><b>Cách {index + 1}</b><span>{item.label}</span></button>)}
      </div>

      {aiNotice && <div className="hint-box success-box">{aiNotice}</div>}
      {aiError && <div className="hint-box error-box">{aiError}</div>}

      {project.sourceMode === 'paste' ? (
        <div className="exam-source-grid">
          <div>
            <div className="upload-zone exam-v946-upload">
              <input type="file" accept=".txt,.md,.pdf,.docx" onChange={handleFile} />
              <strong>Cách 1 · Upload PDF / DOCX / TXT</strong>
              <small>{fileState || 'Hoặc dán đề thô, bài đọc, danh sách câu hỏi vào ô bên dưới.'}</small>
            </div>
            <Field label="Dán nội dung / đề thô / bài đọc / danh sách từ vựng">
              <textarea rows={12} value={project.sourceText} onChange={(e) => setProject((prev) => ({ ...prev, sourceText: e.target.value }))} placeholder="Dán nội dung ở đây. Ví dụ: câu hỏi có A-D, đáp án, bài đọc, danh sách từ vựng..." />
            </Field>
          </div>
          <div className="panel inner-panel recognition-panel">
            <span className="eyebrow">Cách 1 · Hệ thống nhận dạng</span>
            <h3>Hệ thống nhận dạng câu hỏi</h3>
            <p className="muted-line">Tách câu hỏi, phương án, đáp án, phát hiện lỗi format và chuẩn hoá thành preview.</p>
            <div className="preview-actions wrap-actions">
              <button className="primary" onClick={onRecognize}>Nhận dạng nội dung</button>
              <button onClick={onRecognize}>Chuẩn hoá đề</button>
              <button onClick={onRecognize}>Kiểm tra lỗi</button>
            </div>
            {recognition?.diagnostics?.length ? <ul className="recognition-list">{recognition.diagnostics.map((item) => <li key={item}>{item}</li>)}</ul> : <p className="muted-line">Chưa nhận dạng. Sau khi bấm, kết quả sẽ chuyển sang Preview.</p>}
          </div>
        </div>
      ) : (
        <div className="ai-keyword-flow ai-keyword-flow-compact">
          <div className="exam-inline-ai-head"><span className="eyebrow">Cách 2 · AI Keyword Generator</span><h3>Tạo đề bằng AI</h3><p className="muted-line">Nhập yêu cầu bằng tiếng Việt hoặc tiếng Anh. Nội dung câu hỏi tạo ra sẽ bằng tiếng Anh.</p><div className="english-only-lock"><b>EN</b><span>Question language: English only</span></div></div>
          <Field label="Nhập từ khoá / yêu cầu cho AI">
            <textarea rows={7} value={project.aiRequirement} onChange={(e) => setProject((prev) => ({ ...prev, aiRequirement: e.target.value }))} placeholder="Ví dụ: Tạo 30 câu kiểm tra Past Simple vs Past Continuous, level B2-C1, bám sát THPT. AI tạo câu hỏi, phương án, đáp án và giải thích bằng tiếng Anh." />
          </Field>
          <div className="ai-brief-actions-only">
            <button className="primary large-action" onClick={onAnalyze} disabled={aiLoading}>{aiLoading ? 'AI đang tạo brief...' : 'AI tạo brief'}</button>
            <button className="primary large-action" onClick={onGenerate} disabled={aiLoading}>{aiLoading ? 'AI đang tạo câu hỏi...' : 'AI tạo câu hỏi'}</button>
          </div>
          <Field label="Exam Brief có thể chỉnh sửa">
            <textarea rows={8} value={project.aiBrief} onChange={(e) => setProject((prev) => ({ ...prev, aiBrief: e.target.value }))} placeholder="Brief sẽ xuất hiện ở đây sau khi bấm AI tạo brief. Có thể chỉnh sửa trước khi bấm AI tạo câu hỏi." />
          </Field>
          <p className="muted-line compact-ai-note">{hasApiKey ? 'AI sẽ gọi provider đã cấu hình trong Settings.' : 'Chưa có API key: app sẽ tạo demo offline; vào Settings để dùng AI thật.'}</p>
        </div>
      )}
    </section>
  );
}

function OptionEditor({ option, onChange }) {
  return (
    <div className="option-editor-row">
      <b>{option.key}</b>
      <input value={option.text} onChange={(e) => onChange({ ...option, text: e.target.value })} />
      <label><input type="radio" checked={option.isCorrect} onChange={() => onChange({ ...option, isCorrect: true })} /> Correct</label>
    </div>
  );
}

function QuestionCard({ question, onUpdate, onDelete, onDuplicate }) {
  const [editing, setEditing] = useState(false);
  const updateOption = (nextOption) => {
    const options = (question.options || []).map((option) => ({ ...option, isCorrect: option.key === nextOption.key ? nextOption.isCorrect : false, text: option.key === nextOption.key ? nextOption.text : option.text }));
    onUpdate(question.id, { options, answer: options.find((option) => option.isCorrect)?.key || question.answer });
  };
  return (
    <article className="question-editor-card">
      <div className="question-editor-head">
        <div><span className="eyebrow">Câu {question.no} · {question.kind} · {question.band}</span><h3>{question.stem.replace(/^\d+\.\s*/, '')}</h3></div>
        <div className="preview-actions wrap-actions"><button onClick={() => setEditing((v) => !v)}>{editing ? 'Xong' : 'Sửa'}</button><button onClick={onDuplicate}>Nhân bản</button><button onClick={onDelete}>Xoá</button></div>
      </div>
      {!editing ? (
        <>
          {question.passageTitle ? <p className="question-passage-link">Reading passage: {question.passageTitle}</p> : null}
          {(question.options || []).length ? <div className="clean-options">{question.options.map((option) => <p key={option.key} className={option.isCorrect ? 'correct' : ''}><b>{option.key}.</b> {option.text}</p>)}</div> : <p className="open-answer-box">Open response: {question.sampleAnswer || question.answer}</p>}
          <p className="explanation-line"><b>Answer:</b> {question.answer}</p>
          <p className="explanation-line"><b>Explanation:</b> {question.explanation || question.rubric || '—'}</p>
        </>
      ) : (
        <div className="question-edit-form">
          <Field label="Stem"><textarea rows={3} value={question.stem} onChange={(e) => onUpdate(question.id, { stem: e.target.value })} /></Field>
          {(question.options || []).length ? <div>{question.options.map((option) => <OptionEditor key={option.key} option={option} onChange={updateOption} />)}</div> : <Field label="Sample answer"><textarea rows={3} value={question.sampleAnswer || question.answer || ''} onChange={(e) => onUpdate(question.id, { sampleAnswer: e.target.value, answer: e.target.value })} /></Field>}
          <Field label="Explanation / rubric"><textarea rows={3} value={question.explanation || question.rubric || ''} onChange={(e) => onUpdate(question.id, { explanation: e.target.value })} /></Field>
        </div>
      )}
    </article>
  );
}

function PreviewTabs({ output, previewTab, setPreviewTab, selectedCode, setSelectedCode }) {
  if (!output) return <p className="muted-line">Chưa có đề. Hãy nhận dạng nội dung hoặc tạo bằng AI ở bước 2.</p>;
  const code = output.codeSets.find((item) => item.codeNumber === selectedCode) || output.codeSets[0];
  const map = {
    student: code.studentMarkdown,
    teacher: code.teacherMarkdown,
    answers: code.answersMarkdown,
    explanations: code.explanationsMarkdown,
    matrix: output.markdown.split('## 3. Quality report')[0],
    google: code.googleFormText,
    html: output.interactiveHtml,
    bank: output.bankJson,
  };
  const tabs = [
    ['student', 'Bản học sinh'], ['teacher', 'Bản giáo viên'], ['answers', 'Đáp án'], ['explanations', 'Giải thích'], ['matrix', 'Ma trận'], ['google', 'Google Form'], ['html', 'HTML tương tác'], ['bank', 'Bank JSON'],
  ];
  return (
    <>
      <div className="exam-preview-tools">
        <div className="preview-actions left wrap-actions">{tabs.map(([id, label]) => <button key={id} className={previewTab === id ? 'active' : ''} onClick={() => setPreviewTab(id)}>{label}</button>)}</div>
        <select value={selectedCode} onChange={(e) => setSelectedCode(Number(e.target.value))}>{output.codeSets.map((item) => <option key={item.codeNumber} value={item.codeNumber}>Mã đề {item.codeNumber}</option>)}</select>
      </div>
      <div className={`preview-box specialized-markdown-preview exam-preview-box ${previewTab === 'html' ? 'html-code-preview' : ''}`}>
        <pre>{map[previewTab]}</pre>
      </div>
    </>
  );
}

function QualityPanel({ output }) {
  if (!output) return null;
  return (
    <aside className="panel inner-panel quality-panel-v946">
      <span className="eyebrow">Quality Check</span>
      <h3>Quality Score: {output.quality.score}/100</h3>
      <div className="quality-check-grid">{output.quality.checks.map((check) => <span key={check.label} className={check.ok ? 'ok' : 'warn'}>{check.ok ? '✓' : '⚠'} {check.label}</span>)}</div>
      {output.quality.warnings.length ? <ul>{output.quality.warnings.map((item) => <li key={item}>{item}</li>)}</ul> : <p className="muted-line">Chưa phát hiện lỗi lớn.</p>}
    </aside>
  );
}

function ReadingPassagePreview({ output }) {
  const passages = output?.passages || [];
  if (!passages.length) return null;
  return (
    <section className="reading-passage-preview">
      <span className="eyebrow">Reading passage</span>
      {passages.map((passage, index) => (
        <article key={passage.id || index} className="reading-passage-card">
          <h3>{passage.title || `Passage ${index + 1}`}</h3>
          <p>{passage.text}</p>
        </article>
      ))}
    </section>
  );
}

function StepPreview({ output, previewTab, setPreviewTab, selectedCode, setSelectedCode, onQuestionUpdate, onQuestionDelete, onQuestionDuplicate }) {
  return (
    <section className="panel exam-work-panel exam-v946-panel">
      <span className="eyebrow">Bước 3</span>
      <h2>Preview & chỉnh sửa</h2>
      <p className="muted-line">Xem câu hỏi đã tạo, chỉnh nhanh trước khi xuất.</p>
      <ReadingPassagePreview output={output} />
      <QualityPanel output={output} />
      <div className="question-editor-list">
        {output?.questions?.map((question) => <QuestionCard key={question.id} question={question} onUpdate={onQuestionUpdate} onDelete={() => onQuestionDelete(question.id)} onDuplicate={() => onQuestionDuplicate(question.id)} />)}
      </div>
    </section>
  );
}



function InlineInteractiveQuiz({ output, onClose }) {
  const codeSet = output?.codeSets?.[0];
  const questions = useMemo(() => (codeSet?.questions || output?.questions || []).map((q, index) => ({ ...q, no: index + 1 })), [codeSet, output]);
  const [answers, setAnswers] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [mode, setMode] = useState('all');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [seconds, setSeconds] = useState(() => Math.max(1, Number(output?.project?.duration) || 15) * 60);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [fontScale, setFontScale] = useState(1);
  const contentRef = useRef(null);
  const questionListRef = useRef(null);

  useEffect(() => {
    if (submitted) return undefined;
    const timer = window.setInterval(() => {
      setSeconds((value) => {
        if (value <= 1) {
          window.clearInterval(timer);
          setSubmitted(true);
          return 0;
        }
        return value - 1;
      });
    }, 1000);
    return () => window.clearInterval(timer);
  }, [submitted]);

  const passages = useMemo(() => {
    const fromOutput = output?.passages || [];
    if (fromOutput.length) return fromOutput;
    const unique = new Map();
    questions.forEach((question) => {
      if (question.passageText) unique.set(question.passageId || question.passageTitle || question.no, { id: question.passageId || String(question.no), title: question.passageTitle || 'Reading Passage', text: question.passageText });
    });
    return Array.from(unique.values());
  }, [output, questions]);

  const mcqQuestions = questions.filter((q) => (q.options || []).length);
  const correct = mcqQuestions.filter((q) => answers[q.id] === q.answer).length;
  const answered = Object.keys(answers).length;
  const completion = questions.length ? Math.round((answered / questions.length) * 100) : 0;
  const minutes = Math.floor(seconds / 60);
  const sec = String(seconds % 60).padStart(2, '0');
  const visibleQuestions = mode === 'one' ? questions.slice(currentIndex, currentIndex + 1) : questions;

  const choose = (question, key) => {
    if (submitted) return;
    setAnswers((prev) => ({ ...prev, [question.id]: key }));
  };

  const reset = () => {
    setAnswers({});
    setSubmitted(false);
    setCurrentIndex(0);
    setSeconds(Math.max(1, Number(output?.project?.duration) || 15) * 60);
  };

  useEffect(() => {
    const syncFullscreen = () => setIsFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener('fullscreenchange', syncFullscreen);
    return () => document.removeEventListener('fullscreenchange', syncFullscreen);
  }, []);

  const toggleFullscreen = () => {
    const node = document.getElementById('direct-interactive-runner');
    if (!node) return;
    if (document.fullscreenElement) {
      document.exitFullscreen?.();
    } else {
      node.requestFullscreen?.();
    }
  };

  const adjustFontScale = (delta) => {
    setFontScale((value) => Math.max(0.9, Math.min(1.25, Number((value + delta).toFixed(2)))));
  };

  const scrollToQuestions = () => {
    if (mode !== 'all') {
      setMode('all');
      window.setTimeout(() => questionListRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 80);
      return;
    }
    questionListRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    contentRef.current?.focus?.();
  };

  if (!questions.length) {
    return <div className="panel inner-panel"><p className="muted-line">Chưa có câu hỏi để mở chế độ tương tác.</p></div>;
  }

  return (
    <section className="direct-interactive-runner panel inner-panel" id="direct-interactive-runner" style={{ '--interactive-font-scale': fontScale }}>
      <div className="direct-interactive-topbar">
        <div className="direct-interactive-branding">
          <span className="eyebrow">Student workspace</span>
          <h3>{output.title}</h3>
          <p>{output?.project?.topic || 'Interactive assessment'} · {questions.length} câu hỏi · {passages.length ? `${passages.length} passage` : 'Practice mode'}</p>
        </div>
        <div className="direct-interactive-stats">
          <span><b>{minutes}:{sec}</b>Thời gian</span>
          <span><b>{answered}/{questions.length}</b>Đã trả lời</span>
          <span><b>{submitted ? `${correct}/${mcqQuestions.length}` : `${completion}%`}</b>{submitted ? 'Điểm MCQ' : 'Tiến độ'}</span>
        </div>
      </div>

      <div className="direct-interactive-toolbar">
        <div className="direct-toolbar-group">
          <span className="direct-toolbar-label">Chế độ hiển thị</span>
          <div className="direct-segmented-controls">
            <button className={mode === 'all' ? 'active' : ''} onClick={() => setMode('all')}>Toàn bộ đề</button>
            <button className={mode === 'one' ? 'active' : ''} onClick={() => setMode('one')}>Từng câu</button>
          </div>
        </div>

        <div className="direct-toolbar-group">
          <span className="direct-toolbar-label">Cỡ chữ</span>
          <div className="direct-font-controls">
            <button onClick={() => adjustFontScale(-0.05)}>A−</button>
            <button onClick={() => setFontScale(1)} className={fontScale === 1 ? 'active' : ''}>Mặc định</button>
            <button onClick={() => adjustFontScale(0.05)}>A+</button>
          </div>
        </div>

        <div className="direct-toolbar-group direct-toolbar-actions">
          <button onClick={reset}>Làm lại</button>
          <button className="direct-scroll-question-btn" onClick={scrollToQuestions}>Xem câu hỏi</button>
          <button onClick={toggleFullscreen}>{isFullscreen ? 'Thu nhỏ' : 'Toàn màn hình'}</button>
          <button onClick={onClose}>Đóng</button>
          <button className="primary" onClick={() => setSubmitted(true)} disabled={submitted}>Nộp bài & chấm điểm</button>
        </div>
      </div>

      <div className="direct-progress-strip">
        <div className="direct-progress-track"><span style={{ width: `${completion}%` }} /></div>
        <div className="direct-progress-meta">
          <strong>Tiến độ làm bài</strong>
          <span>{completion}% hoàn thành</span>
        </div>
      </div>

      <div className="direct-interactive-body">
        <aside className="direct-interactive-sidebar">
          <div className="direct-side-card">
            <span className="eyebrow">Điều hướng</span>
            <h4>Bảng câu hỏi</h4>
            <div className="direct-question-palette">
              {questions.map((question, index) => {
                const answeredClass = answers[question.id] ? 'answered' : '';
                const activeClass = mode === 'one' && currentIndex === index ? 'active' : '';
                const submittedClass = submitted && answers[question.id] === question.answer ? 'correct' : submitted && answers[question.id] && answers[question.id] !== question.answer ? 'wrong' : '';
                return (
                  <button
                    key={question.id}
                    className={`${answeredClass} ${activeClass} ${submittedClass}`.trim()}
                    onClick={() => {
                      setMode('one');
                      setCurrentIndex(index);
                    }}
                  >
                    {index + 1}
                  </button>
                );
              })}
            </div>
          </div>

          {passages.length ? (
            <div className="direct-side-card direct-reading-side-card">
              <span className="eyebrow">Reading assets</span>
              <h4>Đoạn văn</h4>
              <ul>
                {passages.map((passage, index) => <li key={passage.id || index}>{passage.title || `Passage ${index + 1}`}</li>)}
              </ul>
            </div>
          ) : null}
        </aside>

        <div className="direct-interactive-content" ref={contentRef} tabIndex={-1}>
          {passages.length ? (
            <section className="direct-reading-passage">
              {passages.map((passage, index) => (
                <article key={passage.id || index}>
                  <span className="eyebrow">Reading passage</span>
                  <h4>{passage.title || `Passage ${index + 1}`}</h4>
                  <p>{passage.text}</p>
                </article>
              ))}
            </section>
          ) : null}

          {mode === 'one' && (
            <div className="direct-question-nav">
              <button onClick={() => setCurrentIndex((value) => Math.max(0, value - 1))} disabled={currentIndex === 0}>← Câu trước</button>
              <strong>Câu {currentIndex + 1}/{questions.length}</strong>
              <button onClick={() => setCurrentIndex((value) => Math.min(questions.length - 1, value + 1))} disabled={currentIndex >= questions.length - 1}>Câu tiếp →</button>
            </div>
          )}

          {submitted && (
            <div className="direct-result-card">
              <strong>Kết quả:</strong> {correct}/{mcqQuestions.length} câu trắc nghiệm đúng.
              <span>Đáp án và giải thích đã được mở bên dưới từng câu.</span>
            </div>
          )}

          <div className="direct-question-list" ref={questionListRef}>
            {visibleQuestions.map((question) => {
              const selected = answers[question.id];
              const isMcq = (question.options || []).length > 0;
              return (
                <article key={question.id} className={`direct-question-card ${submitted ? 'submitted' : ''}`}>
                  <div className="direct-question-head">
                    <span>Câu {question.no}</span>
                    <small>{question.kind} · {question.band}</small>
                  </div>
                  {question.passageTitle ? <p className="direct-passage-chip">Based on: {question.passageTitle}</p> : null}
                  <h4>{question.stem.replace(/^\d+\.\s*/, '')}</h4>
                  {isMcq ? (
                    <div className="direct-options">
                      {question.options.map((option) => {
                        const selectedClass = selected === option.key ? 'selected' : '';
                        const correctClass = submitted && option.key === question.answer ? 'correct' : '';
                        const wrongClass = submitted && selected === option.key && option.key !== question.answer ? 'wrong' : '';
                        return (
                          <button key={option.key} className={`${selectedClass} ${correctClass} ${wrongClass}`} onClick={() => choose(question, option.key)}>
                            <b>{option.key}</b><span>{option.text}</span>
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    <textarea rows={4} disabled={submitted} value={answers[question.id] || ''} onChange={(e) => setAnswers((prev) => ({ ...prev, [question.id]: e.target.value }))} placeholder="Nhập câu trả lời tự luận..." />
                  )}
                  {submitted && (
                    <div className="direct-explanation">
                      <p><b>Đáp án / Sample:</b> {isMcq ? question.answer : (question.sampleAnswer || question.answer || 'Giáo viên chấm theo rubric.')}</p>
                      <p><b>Giải thích / Rubric:</b> {question.explanation || question.rubric || '—'}</p>
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}

function StepExport({ output, onCopy, copied, onSave, vault, directInteractive, setDirectInteractive }) {
  const title = output?.title || 'Exam Studio Draft';
  return (
    <section className="panel exam-work-panel exam-v946-panel">
      <span className="eyebrow">Bước 4</span>
      <h2>Xuất file / sử dụng trực tiếp</h2>
      {!output ? <p className="muted-line">Hãy tạo hoặc nhận dạng đề trước.</p> : (
        <>
          <div className="exam-export-grid exam-export-grid-v946">
            <button onClick={onCopy}>{copied ? 'Đã copy' : 'Copy toàn bộ'}</button>
            <button onClick={() => exportDoc(`${title} - Student`, output.studentMarkdown)}>DOCX/DOC bản học sinh</button>
            <button onClick={() => exportDoc(`${title} - Teacher`, output.teacherMarkdown)}>DOCX/DOC bản giáo viên</button>
            <button onClick={() => printOutput(`${title} - Student`, output.studentMarkdown)}>PDF bản học sinh</button>
            <button onClick={() => printOutput(`${title} - Teacher`, output.teacherMarkdown)}>PDF bản giáo viên</button>
            <button onClick={() => downloadBlob(`${slugify(title)}-answer-key.txt`, output.answersMarkdown)}>Answer Key</button>
            <button onClick={() => downloadBlob(`${slugify(title)}-google-form.txt`, output.googleFormText)}>Google Form text</button>
            <button onClick={() => downloadBlob(`${slugify(title)}-question-bank.json`, output.bankJson, 'application/json;charset=utf-8')}>Question Bank JSON</button>
            <button className="primary" onClick={() => setDirectInteractive(true)}>Mở tương tác trực tiếp</button>
            <button onClick={() => downloadBlob(`${slugify(title)}-interactive.html`, output.interactiveHtml, 'text/html;charset=utf-8')}>Tải HTML offline</button>
            <button onClick={onSave}>Lưu vault cục bộ</button>
          </div>
          {directInteractive && <InlineInteractiveQuiz output={output} onClose={() => setDirectInteractive(false)} />}
          <p className="muted-line">Vault hiện có {vault.length} bản lưu cục bộ. Tạo phòng thi online sẽ dùng bản export này làm nguồn.</p>
        </>
      )}
    </section>
  );
}

function aiTaskForStep(step, project) {
  const tasks = [
    `Gợi ý loại bài kiểm tra và dạng câu hỏi phù hợp cho chủ điểm ${project.topic}.`,
    project.sourceMode === 'paste' ? 'Nhận dạng, chuẩn hoá câu hỏi từ nội dung giáo viên dán/upload; bổ sung đáp án nếu thiếu.' : `Phân tích yêu cầu sau thành Exam Brief rồi tạo đề: ${project.aiRequirement}`,
    'Sửa từng câu hỏi, nâng độ khó, viết lại distractors, bổ sung giải thích và rubric.',
    'Định dạng output thành DOCX/PDF/Google Form/HTML tương tác có thể dùng trực tiếp.',
  ];
  return tasks[step] || tasks[0];
}

export default function SpecializedAppPage({ tool, language = 'vi', apiKey = '', aiModel = '', hasApiKey = false }) {
  const config = useMemo(() => getSpecializedConfig(tool?.slug) || getSpecializedConfig('exam-studio'), [tool?.slug]);
  const [project, setProject] = useState(() => createDefaultExamProject());
  const [step, setStep] = useState(0);
  const [status, setStatus] = useState('Draft');
  const [output, setOutput] = useState(null);
  const [previewTab, setPreviewTab] = useState('student');
  const [selectedCode, setSelectedCode] = useState(101);
  const [vault, setVault] = useState(() => loadVault());
  const [copied, setCopied] = useState(false);
  const [recognition, setRecognition] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState('');
  const [aiNotice, setAiNotice] = useState('');
  const [directInteractive, setDirectInteractive] = useState(false);

  useEffect(() => {
    setProject(createDefaultExamProject());
    setStep(0);
    setStatus('Draft');
    setOutput(null);
    setPreviewTab('student');
    setSelectedCode(101);
    setCopied(false);
    setRecognition(null);
    setAiLoading(false);
    setAiError('');
    setAiNotice('');
    setDirectInteractive(false);
  }, [tool?.slug]);

  const title = language === 'vi' ? config.titleVi || config.title : config.title;

  const rebuildOutput = (nextProject, questions) => {
    const next = buildExamOutputFromQuestions(nextProject, questions);
    setOutput(next);
    setSelectedCode(next.codeSets[0]?.codeNumber || 101);
    setCopied(false);
    setDirectInteractive(false);
    return next;
  };

  const handleAnalyze = async () => {
    setAiError('');
    setAiNotice('');
    if (!project.aiRequirement.trim()) {
      setAiError('Hãy nhập từ khoá hoặc yêu cầu trước khi AI nhận diện.');
      return;
    }
    setAiLoading(true);
    try {
      if (hasApiKey) {
        const json = await callExamAI({ project, mode: 'brief', apiKey, aiModel });
        const patch = normalizeAiBriefJson(json, project);
        setProject((prev) => ({ ...prev, ...patch }));
        setAiNotice('AI đã tạo Exam Brief. Bạn có thể chỉnh brief rồi bấm AI tạo câu hỏi.');
      } else {
        const result = analyzeExamRequirement(project.aiRequirement, project);
        setProject((prev) => ({ ...prev, ...result.projectPatch, aiBrief: result.briefText }));
        setAiNotice('Chưa có API key, app đã tạo brief bằng bộ nhận diện offline. Vào Settings để dùng AI thật.');
      }
      setStatus('Brief ready');
    } catch (err) {
      const result = analyzeExamRequirement(project.aiRequirement, project);
      setProject((prev) => ({ ...prev, ...result.projectPatch, aiBrief: result.briefText }));
      setAiError(`AI nhận diện lỗi: ${err.message || err}. App đã tạo brief offline để bạn vẫn tiếp tục được.`);
      setStatus('Brief fallback');
    } finally {
      setAiLoading(false);
    }
  };

  const handleGenerate = async () => {
    setAiError('');
    setAiNotice('');
    const requirement = project.aiBrief || project.aiRequirement;
    if (!requirement.trim()) {
      setAiError('Hãy nhập yêu cầu hoặc tạo Exam Brief trước.');
      return;
    }
    const result = analyzeExamRequirement(requirement, project);
    const briefProject = { ...project, ...result.projectPatch, aiBrief: project.aiBrief || result.briefText, sourceMode: 'ai-topic' };
    setAiLoading(true);
    try {
      if (!hasApiKey) {
        const offlineProject = { ...briefProject, recognizedQuestions: [] };
        setProject(offlineProject);
        rebuildOutput(offlineProject);
        setAiNotice('Chưa có API key, app đã tạo đề demo offline. Vào Settings để dùng AI thật.');
        setStatus('Generated offline');
        setStep(2);
        return;
      }
      let json = await callExamAI({ project: briefProject, mode: 'questions', apiKey, aiModel });
      let normalized = normalizeAiQuestionsJson(json, briefProject);
      normalized = await ensureExactAiQuestionCount(normalized, briefProject, apiKey, aiModel);
      try {
        assertEnglishOnlyQuestions(normalized.questions, normalized.passages);
      } catch (languageError) {
        const retryProject = {
          ...briefProject,
          aiBrief: `${briefProject.aiBrief || ''}

English-only correction: Regenerate the exam in English only. No Vietnamese stems, options, answers, explanations, rubrics, or sample answers.`,
        };
        json = await callExamAI({ project: retryProject, mode: 'questions', apiKey, aiModel, strictEnglishRetry: true });
        normalized = normalizeAiQuestionsJson(json, retryProject);
        normalized = await ensureExactAiQuestionCount(normalized, retryProject, apiKey, aiModel);
        assertEnglishOnlyQuestions(normalized.questions, normalized.passages);
      }
      const nextProject = { ...briefProject, ...normalized.projectPatch, aiBrief: briefProject.aiBrief, recognizedQuestions: normalized.questions, contentLanguage: 'en', explanationLanguage: 'en' };
      setProject(nextProject);
      rebuildOutput(nextProject, normalized.questions);
      setAiNotice(`AI đã tạo đủ ${normalized.questions.length}/${targetQuestionCount(briefProject)} câu hỏi tiếng Anh theo yêu cầu.`);
      setStatus('AI Generated · English');
      setStep(2);
    } catch (err) {
      const fallbackProject = { ...briefProject, recognizedQuestions: [] };
      setProject(fallbackProject);
      rebuildOutput(fallbackProject);
      setAiError(`AI tạo câu hỏi lỗi: ${err.message || err}. App đã dùng generator offline để không mất quy trình. Kiểm tra API key/model trong Settings nếu muốn AI thật.`);
      setStatus('Generated fallback');
      setStep(2);
    } finally {
      setAiLoading(false);
    }
  };

  const handleRecognize = () => {
    setAiError('');
    setAiNotice('');
    const recognized = recognizeExamQuestionsFromText(project.sourceText, project);
    const nextProject = { ...project, sourceMode: 'paste', recognizedQuestions: recognized.questions };
    setRecognition(recognized);
    setProject(nextProject);
    if (recognized.questions.length) {
      rebuildOutput(nextProject, recognized.questions);
      setStatus('Recognized');
      setStep(2);
    } else {
      setStatus('Needs clearer source');
    }
  };

  const handleQuestionUpdate = (id, patch) => {
    if (!output) return;
    const questions = output.questions.map((question) => (question.id === id ? { ...question, ...patch } : question));
    const nextProject = { ...project, recognizedQuestions: questions };
    setProject(nextProject);
    rebuildOutput(nextProject, questions);
    setStatus('Edited');
  };

  const handleQuestionDelete = (id) => {
    if (!output) return;
    const questions = output.questions.filter((question) => question.id !== id).map((question, index) => ({ ...question, no: index + 1 }));
    const nextProject = { ...project, questionCount: questions.length, recognizedQuestions: questions };
    setProject(nextProject);
    rebuildOutput(nextProject, questions);
    setStatus('Edited');
  };

  const handleQuestionDuplicate = (id) => {
    if (!output) return;
    const index = output.questions.findIndex((question) => question.id === id);
    if (index < 0) return;
    const copy = { ...output.questions[index], id: `q-copy-${Date.now()}`, stem: `${output.questions[index].stem} (variation)` };
    const questions = [...output.questions.slice(0, index + 1), copy, ...output.questions.slice(index + 1)].map((question, qIndex) => ({ ...question, no: qIndex + 1 }));
    const nextProject = { ...project, questionCount: questions.length, recognizedQuestions: questions };
    setProject(nextProject);
    rebuildOutput(nextProject, questions);
    setStatus('Edited');
  };

  const handleCopy = async () => {
    await copyText(output?.markdown || '');
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1300);
  };

  const handleSave = () => {
    if (!output) return;
    const next = saveVault({ id: `exam-studio-${Date.now()}`, title: output.title, markdown: output.markdown, project, createdAt: new Date().toISOString() });
    setVault(next);
    setStatus('Ready');
  };

  const nextStep = () => {
    if (step === 1 && !output) {
      if (project.sourceMode === 'paste') handleRecognize();
      else handleGenerate();
      return;
    }
    setStep((prev) => Math.min(3, prev + 1));
  };

  if (!tool || !SPECIALIZED_TOOL_SLUGS.includes(tool.slug)) {
    return (
      <div className="page narrow"><section className="panel empty-state"><h1>{language === 'vi' ? 'Không tìm thấy ứng dụng chuyên biệt' : 'Specialized app not found'}</h1><button className="primary" onClick={() => (window.location.hash = '#/apps')}>Back to Apps</button></section></div>
    );
  }

  const stepPanels = [
    <StepType key="type" project={project} setProject={setProject} />,
    <StepSource key="source" project={project} setProject={setProject} onRecognize={handleRecognize} onAnalyze={handleAnalyze} onGenerate={handleGenerate} recognition={recognition} language={language} aiLoading={aiLoading} aiError={aiError} aiNotice={aiNotice} hasApiKey={hasApiKey} />,
    <StepPreview key="preview" output={output} previewTab={previewTab} setPreviewTab={setPreviewTab} selectedCode={selectedCode} setSelectedCode={setSelectedCode} onQuestionUpdate={handleQuestionUpdate} onQuestionDelete={handleQuestionDelete} onQuestionDuplicate={handleQuestionDuplicate} />,
    <StepExport key="export" output={output} onCopy={handleCopy} copied={copied} onSave={handleSave} vault={vault} directInteractive={directInteractive} setDirectInteractive={setDirectInteractive} />,
  ];
  const selectedType = EXAM_TYPE_OPTIONS.find((item) => item.id === project.examType)?.label || (language === 'vi' ? 'Chưa chọn' : 'Not selected');
  const selectedSkill = SKILL_OPTIONS.find((item) => item.id === project.skill)?.label || (language === 'vi' ? 'Nội dung tổng hợp' : 'Mixed focus');
  const selectedFormatCount = (project.selectedFormats || []).length;
  const sourceModeLabel = project.sourceMode === 'ai-topic' ? (language === 'vi' ? 'AI keyword' : 'AI keyword') : (language === 'vi' ? 'Upload / paste' : 'Upload / paste');

  return (
    <div className="page tool-page exam-studio-page real-exam-workflow exam-v946-page exam-v947-page exam-v949-page exam-v95-page exam-v96-page">
      <button className="back-btn" onClick={() => window.history.back()}>← {language === 'vi' ? 'Quay lại' : 'Back'}</button>

      <section className="panel exam-v96-hero-shell exam-v35-hero-shell">
        <div className="exam-v96-hero-main exam-v35-hero-main">
          <div className="exam-v96-hero-art exam-v35-hero-art" aria-hidden="true">
            <div className="exam-v35-grade-sheet">
              <span>A+</span>
              <i /><i /><i />
            </div>
            <div className="exam-v35-builder-window">
              <div className="exam-v35-window-bar"><span /><span /><span /></div>
              <strong>Đề kiểm tra – Unit 4</strong>
              <div className="exam-v35-question-row"><i /><b /><em>✓</em></div>
              <div className="exam-v35-question-row"><i /><b /><em>✓</em></div>
              <div className="exam-v35-question-row"><i /><b /><em>✓</em></div>
              <div className="exam-v35-question-row"><i /><b /><em>✓</em></div>
            </div>
            <div className="exam-v35-type-chips">
              <span data-tone="blue">MCQ</span>
              <span data-tone="amber">Cloze</span>
              <span data-tone="green">Word form</span>
            </div>
            <div className="exam-v35-preview-tile"><span>◉</span><b>Preview</b></div>
            <div className="exam-v35-export-tile"><span>⇧</span><b>Export</b></div>
            <div className="exam-v35-pencil-cup"><i /><i /><i /></div>
            <span className="exam-v35-art-path" />
          </div>

          <div className="exam-v96-hero-copy exam-v35-hero-copy">
            <span className="exam-v96-tag exam-v35-tag">Exam Studio&nbsp; • &nbsp;Structured assessment workflow</span>
            <h1>{title}</h1>
            <p>{language === 'vi' ? 'Tạo đề kiểm tra có cấu trúc, tối ưu cho tạo đề, preview, chỉnh sửa và xuất file.' : 'Create structured assessments with an optimized workflow for drafting, previewing, editing and exporting.'}</p>
            <div className="exam-v35-feature-list">
              <span><i>✓</i>Đa dạng dạng câu</span>
              <span><i>✓</i>Quy trình rõ ràng</span>
              <span><i>✓</i>Xuất file linh hoạt</span>
            </div>
          </div>
        </div>

        <div className="exam-v96-stat-grid exam-v35-action-grid">
          <button type="button" className="exam-v96-stat-card exam-v35-action-card" onClick={() => setStatus(hasApiKey ? 'AI ready' : 'Optional AI')}>
            <span className="exam-v35-action-icon is-ai">✦</span>
            <span className="exam-v35-action-copy"><strong>{hasApiKey ? (language === 'vi' ? 'AI sẵn sàng' : 'AI ready') : (language === 'vi' ? 'AI tuỳ chọn' : 'Optional AI')}</strong><small>{hasApiKey ? 'OpenAI / Gemini' : (language === 'vi' ? 'Có thể cấu hình sau' : 'Can be configured later')}</small></span>
            <em className="exam-v35-ready-pill">{hasApiKey ? 'Sẵn sàng' : 'Tuỳ chọn'}</em>
            <i className="exam-v35-action-arrow">›</i>
          </button>
          <button type="button" className="exam-v96-stat-card exam-v35-action-card" onClick={() => { setProject((prev) => ({ ...prev, sourceMode: 'paste' })); setStep(1); }}>
            <span className="exam-v35-action-icon is-upload">⇧</span>
            <span className="exam-v35-action-copy"><strong>Upload / paste</strong><small>{language === 'vi' ? 'Nguồn tạo đề hiện tại' : 'Current source mode'}</small></span>
            <i className="exam-v35-action-arrow">›</i>
          </button>
          <button type="button" className="exam-v96-stat-card exam-v35-action-card" onClick={() => output && setStep(2)} aria-disabled={!output}>
            <span className="exam-v35-action-icon is-draft">▤</span>
            <span className="exam-v35-action-copy"><strong>{output ? 'Preview' : 'Draft'}</strong><small>{output ? (language === 'vi' ? 'Đã có output' : 'Output available') : (language === 'vi' ? 'Chưa có output' : 'No output yet')}</small></span>
            <i className="exam-v35-action-arrow">›</i>
          </button>
        </div>
      </section>

      <SummaryCard project={project} output={output} status={status} />

      <Stepper step={step} setStep={setStep} output={output} />

      <section className="exam-workspace-grid exam-workspace-grid-v947 exam-v96-workspace exam-v35-workspace">
        <main className="exam-center-workflow exam-v96-center">
          {stepPanels[step]}
          <div className="exam-footer-actions exam-footer-actions-v946 exam-v96-footer-actions">
            <button onClick={() => setStep((prev) => Math.max(0, prev - 1))} disabled={step === 0}>Quay lại</button>
            <button onClick={() => setStatus('Draft saved')}>Lưu nháp</button>
            {step === 1 && project.sourceMode === 'paste' && <button className="primary" onClick={handleRecognize}>Nhận dạng nội dung</button>}
            {step === 1 && project.sourceMode === 'ai-topic' && <button className="primary" onClick={handleAnalyze} disabled={aiLoading}>{aiLoading ? 'AI đang xử lý...' : 'AI tạo brief'}</button>}
            {step === 1 && project.sourceMode === 'ai-topic' && <button className="primary" onClick={handleGenerate} disabled={aiLoading}>{aiLoading ? 'AI đang tạo câu hỏi...' : 'AI tạo câu hỏi'}</button>}
            {step !== 1 && <button className="primary" onClick={nextStep}>{step === 3 ? 'Hoàn tất' : 'Tiếp tục'}</button>}
          </div>
        </main>
      </section>
    </div>
  );
}
