import { cleanText, parseOptions } from './questModel.mjs';

// Read-only adapter. The teacher reviews imported question content before saving a snapshot.
export function assessmentToPuzzleDraft(item) {
  if (!item || typeof item !== 'object') return null;
  const raw = item.options;
  let labels = [];
  if (Array.isArray(raw)) {
    labels = raw.map((o) => typeof o === 'string' ? o : (o?.text ?? o?.content ?? o?.value ?? o?.label ?? ''));
  } else if (raw && typeof raw === 'object') {
    labels = ['A','B','C','D'].map((k) => raw[k] ?? raw[k.toLowerCase()] ?? '');
  }
  const opts = parseOptions(labels);
  if (opts.length !== 4) return null;
  const answer = cleanText(item.correct_answer, 180);
  const byLetter = /^[A-D]$/i.test(answer) ? opts[answer.toUpperCase().charCodeAt(0) - 65] : '';
  const normalized = answer.replace(/^[A-D][.)]\s*/i, '').trim();
  const resolvedAnswer = byLetter || opts.find((o) => o.toLocaleLowerCase() === normalized.toLocaleLowerCase()) || '';
  return {
    sourceQuestionId: item.id ?? null,
    stem: cleanText(item.stem, 500),
    options: opts,
    correct_answer: resolvedAnswer,
    clue: cleanText(item.explanation || '', 400),
  };
}
