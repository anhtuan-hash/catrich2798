import {
  blockLabel,
  blockTypeForItem,
  buildExamSections,
  effectiveAnswer,
  splitExamStem,
  visibleOptions,
} from './questionBankExamManager.js';

function valueText(value) {
  return String(value ?? '').trim();
}

function cognitiveLabel(value) {
  const normalized = valueText(value).toLowerCase();
  if (normalized === 'recognition') return 'Nhận biết';
  if (normalized === 'comprehension') return 'Thông hiểu';
  if (normalized === 'application') return 'Vận dụng';
  return valueText(value);
}

function scriptSafeJson(value) {
  return JSON.stringify(value)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029');
}

function answerIndex(item) {
  const answer = effectiveAnswer(item);
  if (!/^[A-D]$/.test(answer)) return -1;
  return answer.charCodeAt(0) - 65;
}

export function buildInteractiveExamPayload({ test, items = [] } = {}) {
  const ordered = [...items].sort((a, b) => Number(a.position || 0) - Number(b.position || 0));
  const sections = buildExamSections(ordered);
  const sectionByPosition = new Map();

  sections.forEach((section) => {
    section.items.forEach((item) => {
      sectionByPosition.set(Number(item.position || 0), section);
    });
  });

  const questions = ordered.map((item, index) => {
    const position = Number(item.position || index + 1);
    const section = sectionByPosition.get(position);
    const split = splitExamStem(item.stem, position);
    const options = visibleOptions(item).map((option) => valueText(option.text));
    const context = valueText(section?.context || split.context);
    const type = blockTypeForItem(item);
    const meta = [
      valueText(item.topic),
      valueText(item.skill),
      valueText(item.cefr),
      cognitiveLabel(item.cognitive_level),
      item.difficulty ? `Mức ${item.difficulty}` : '',
    ].filter(Boolean);

    return {
      id: valueText(item.id) || `q-${position}`,
      position,
      type: [blockLabel(type), valueText(item.cefr)].filter(Boolean).join(' · '),
      q: valueText(split.question || item.stem),
      o: options,
      a: answerIndex(item),
      ctx: context,
      exp: valueText(item.explanation),
      meta,
      section: {
        index: Number(section?.index || 0),
        title: valueText(section?.title),
        instructions: valueText(section?.instructions),
      },
    };
  });

  const duration = Number(test?.settings?.durationMinutes || 50);
  return {
    schema: 'brian-interactive-assessment/v1',
    generatedAt: new Date().toISOString(),
    test: {
      id: valueText(test?.id),
      title: valueText(test?.title || 'Brian English Exam'),
      grade: valueText(test?.grade || 12),
      schoolYear: valueText(test?.school_year),
      examCode: valueText(test?.settings?.examCode),
    },
    defaults: {
      durationMinutes: Number.isFinite(duration) && duration >= 0 ? duration : 50,
      shuffleOptions: false,
      showExplanation: true,
      sound: true,
      motion: 'soft',
    },
    questions,
  };
}

export function validateInteractiveExamPayload(payload) {
  const errors = [];
  if (!payload?.questions?.length) errors.push('Đề chưa có câu hỏi để xuất HTML tương tác.');

  (payload?.questions || []).forEach((question, index) => {
    const position = Number(question.position || index + 1);
    if (!valueText(question.q)) errors.push(`Câu ${position}: thiếu nội dung.`);
    if (!Array.isArray(question.o) || question.o.length !== 4) errors.push(`Câu ${position}: cần đúng 4 phương án.`);
    if (!Number.isInteger(question.a) || question.a < 0 || question.a > 3) errors.push(`Câu ${position}: đáp án đúng không hợp lệ.`);
  });

  return { valid: errors.length === 0, errors };
}

export async function buildInteractiveExamHtml({ test, items, templateUrl = '/templates/brian-interactive-exam-v3.1.html' } = {}) {
  const payload = buildInteractiveExamPayload({ test, items });
  const validation = validateInteractiveExamPayload(payload);
  if (!validation.valid) throw new Error(validation.errors[0]);

  const response = await fetch(templateUrl, { cache: 'no-store' });
  if (!response.ok) throw new Error(`Không tải được template HTML tương tác (HTTP ${response.status}).`);

  const template = await response.text();
  const marker = '__BRIAN_EXAM_DATA__';
  if (!template.includes(marker)) throw new Error('Template HTML tương tác không hợp lệ.');

  return template.replace(marker, scriptSafeJson(payload));
}

export { scriptSafeJson };
