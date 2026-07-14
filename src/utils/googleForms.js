import { downloadFile, slugify } from './library.js';

export function getAnswerIndex(question) {
  const raw = String(question?.answer || '').trim();
  if (!raw) return -1;
  const letter = raw.match(/^[A-D]/i)?.[0]?.toUpperCase();
  if (letter) return letter.charCodeAt(0) - 65;
  const options = question?.options || [];
  const normalized = raw.toLowerCase().replace(/^answer\s*[:\-]?\s*/i, '').trim();
  return options.findIndex((option) => String(option || '').trim().toLowerCase() === normalized);
}

export function normalizeQuestionsForGoogleForms(questions = []) {
  return (Array.isArray(questions) ? questions : [])
    .filter((q) => q && String(q.question || '').trim() && Array.isArray(q.options) && q.options.length >= 2)
    .map((q, index) => {
      const options = q.options.map((option) => String(option || '').trim()).filter(Boolean);
      const answerIndex = getAnswerIndex({ ...q, options });
      return {
        number: index + 1,
        question: String(q.question || '').trim(),
        options,
        answer: String(q.answer || '').trim(),
        answerIndex,
        explanation: String(q.explanation || '').trim(),
        level: String(q.level || '').trim(),
        topic: String(q.topic || '').trim(),
      };
    });
}

export function buildGoogleFormsCsv(questions = []) {
  const esc = (value) => `"${String(value || '').replace(/"/g, '""')}"`;
  const rows = [['Question', 'Option A', 'Option B', 'Option C', 'Option D', 'Answer', 'Explanation', 'Level', 'Topic']];
  normalizeQuestionsForGoogleForms(questions).forEach((item) => {
    rows.push([
      item.question,
      item.options[0] || '',
      item.options[1] || '',
      item.options[2] || '',
      item.options[3] || '',
      item.answer || (item.answerIndex >= 0 ? String.fromCharCode(65 + item.answerIndex) : ''),
      item.explanation,
      item.level,
      item.topic,
    ]);
  });
  return rows.map((row) => row.map(esc).join(',')).join('\n');
}

export function buildGoogleFormsAppsScript(title = 'Brian English Form', questions = [], options = {}) {
  const items = normalizeQuestionsForGoogleForms(questions);
  const formTitle = String(title || 'Brian English Form').trim();
  const makeQuiz = options.makeQuiz ?? items.some((item) => item.answerIndex >= 0);
  const points = Number(options.points || 1) || 1;
  const description = options.description || 'Created by Brian English Studio. Run this script once to create a real Google Form in your Drive.';
  const payload = JSON.stringify(items, null, 2);
  return `/**
 * Brian English Studio - Google Form Creator
 * How to use:
 * 1. Open https://script.new
 * 2. Paste this whole script
 * 3. Click Run: createBrianEnglishGoogleForm
 * 4. Authorize with your Google account
 * 5. Check View > Logs for the edit/live URLs
 */
function createBrianEnglishGoogleForm() {
  const TITLE = ${JSON.stringify(formTitle)};
  const DESCRIPTION = ${JSON.stringify(description)};
  const MAKE_QUIZ = ${makeQuiz ? 'true' : 'false'};
  const POINTS = ${points};
  const QUESTIONS = ${payload};

  const form = FormApp.create(TITLE);
  form.setDescription(DESCRIPTION);
  form.setCollectEmail(false);
  form.setAllowResponseEdits(false);
  form.setProgressBar(true);
  form.setShuffleQuestions(false);
  if (MAKE_QUIZ) form.setIsQuiz(true);

  QUESTIONS.forEach(function(q, index) {
    const item = form.addMultipleChoiceItem();
    const title = (index + 1) + '. ' + q.question;
    item.setTitle(title).setRequired(true);

    const hasCorrect = MAKE_QUIZ && typeof q.answerIndex === 'number' && q.answerIndex >= 0;
    const choices = q.options.map(function(option, optionIndex) {
      return hasCorrect ? item.createChoice(option, optionIndex === q.answerIndex) : item.createChoice(option);
    });
    item.setChoices(choices);

    if (MAKE_QUIZ && hasCorrect) {
      item.setPoints(POINTS);
      if (q.explanation) {
        const feedback = FormApp.createFeedback().setText(q.explanation).build();
        item.setFeedbackForCorrect(feedback);
        item.setFeedbackForIncorrect(feedback);
      }
    }
  });

  Logger.log('EDIT URL: ' + form.getEditUrl());
  Logger.log('LIVE URL: ' + form.getPublishedUrl());
}
`;
}

export function buildGoogleFormsGuideHtml(title, questions, script) {
  const safe = (value) => String(value || '').replace(/[&<>"']/g, (ch) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;',
  }[ch]));
  const items = normalizeQuestionsForGoogleForms(questions);
  const rows = items.map((item) => `<tr><td>${item.number}</td><td>${safe(item.question)}</td><td>${safe(item.options.join(' | '))}</td><td>${safe(item.answer || (item.answerIndex >= 0 ? String.fromCharCode(65 + item.answerIndex) : ''))}</td></tr>`).join('');
  return `<!doctype html><html lang="vi"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${safe(title)} - Google Form</title><style>@font-face{font-family:BrianGesco;src:url('/bes-fonts/brian-personal-font.ttf?v=12.0.0') format('truetype');font-weight:100 900;font-style:normal;font-display:swap;}body{font-family:BrianGesco,Arial,sans-serif;background:#f3f6fb;color:#102040;margin:0}.wrap{max-width:1100px;margin:28px auto;background:#fff;padding:28px;border-radius:0;box-shadow:none;border:1px solid #b9d2e8}h1{margin-top:0}.steps{background:#eef5ff;border:1px solid #c7ddff;padding:16px;border-radius:0}pre{white-space:pre-wrap;background:#0f172a;color:#e2e8f0;padding:18px;border-radius:0;overflow:auto;max-height:520px}table{width:100%;border-collapse:collapse;margin-top:16px}td,th{border:1px solid #e5e7eb;padding:9px;text-align:left;vertical-align:top}th{background:#f8fafc}</style></head><body><main class="wrap"><h1>${safe(title)} - Google Form Creator</h1><div class="steps"><b>Cách tạo Google Form thật:</b><ol><li>Mở <b>https://script.new</b></li><li>Dán toàn bộ script bên dưới vào Apps Script.</li><li>Chạy hàm <b>createBrianEnglishGoogleForm</b>.</li><li>Cho phép quyền truy cập Google Forms.</li><li>Mở Logs để lấy link chỉnh sửa và link làm bài.</li></ol></div><h2>Danh sách câu hỏi (${items.length})</h2><table><thead><tr><th>#</th><th>Câu hỏi</th><th>Phương án</th><th>Đáp án</th></tr></thead><tbody>${rows}</tbody></table><h2>Apps Script</h2><pre>${safe(script)}</pre></main></body></html>`;
}

export function downloadGoogleFormsBundle(title, questions) {
  const script = buildGoogleFormsAppsScript(title, questions);
  downloadFile(`${slugify(title)}-google-form.gs`, script, 'text/plain;charset=utf-8');
}
