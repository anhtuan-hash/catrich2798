export const DEFAULT_GEMINI_MODEL = '';
export const DEFAULT_MAX_OUTPUT_TOKENS = 0;
export const ACTIVITY_OUTPUT_FORMATS = {};

const WORDGRAPH_DEFAULT_INSTRUCTION = 'Tạo WordGraph cho danh sách từ vựng. Mỗi từ gồm Word Family, Collocations, Meaning, Examples và Teaching Note. Giữ nội dung ngắn gọn, rõ ràng và phù hợp học sinh THPT.';

export const AI_TOOL_PRESETS = {
  word2graph: {
    defaultInstruction: WORDGRAPH_DEFAULT_INSTRUCTION,
  },
};

function removedError() {
  const error = new Error('Các tính năng AI đã được gỡ khỏi Brian English Studio.');
  error.code = 'AI_FEATURE_REMOVED';
  return error;
}

function cleanWordGraphCandidate(value = '') {
  return String(value)
    .replace(/^[-*•\d.)\s]+/, '')
    .replace(/^(create|make|draw|generate|tạo|vẽ)\s+/i, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function buildOfflineWordGraphOutline({ instruction = '', sourceText = '', itemCount = 10 } = {}) {
  const source = String(sourceText || '').trim();
  const seed = source || String(instruction || WORDGRAPH_DEFAULT_INSTRUCTION);
  const rawItems = seed
    .replace(/\band\b/gi, ',')
    .replace(/\bvà\b/gi, ',')
    .split(/[\n,;|]+/)
    .map(cleanWordGraphCandidate)
    .filter((item) => item.length >= 2 && item.length <= 48)
    .filter((item) => !/(wordgraph|word family|collocation|meaning|example|teaching note|danh sách từ vựng)/i.test(item));

  const words = [...new Set(rawItems)].slice(0, Math.max(1, Math.min(Number(itemCount) || 10, 14)));
  const selected = words.length ? words : ['Vocabulary'];

  return selected.map((word, index) => {
    const title = word.charAt(0).toUpperCase() + word.slice(1);
    const lower = word.toLowerCase();
    return [
      `## ${index + 1}. ${title}`,
      '### Word Family',
      `- Base: ${lower}`,
      `- Noun: ${lower}`,
      `- Adjective: ${lower}`,
      '### Collocations',
      `- ${lower} in context`,
      `- common ${lower} expression`,
      '### Meaning',
      `- Meaning and usage of ${lower}.`,
      '### Examples',
      `- Students use ${lower} in a clear sentence.`,
      '### Teaching Note',
      `- Ask learners to create one original sentence with ${lower}.`,
    ].join('\n');
  }).join('\n\n');
}

export async function callAI() { throw removedError(); }
export async function callGemini() { throw removedError(); }
export async function generateActivityWithGemini() { throw removedError(); }
export async function generateGenericToolOutput(options = {}) {
  if (options?.slug === 'word2graph') return buildOfflineWordGraphOutline(options);
  throw removedError();
}
export function extractJson(text) {
  const raw = String(text || '').trim();
  if (!raw) return null;
  try { return JSON.parse(raw); } catch { return null; }
}
