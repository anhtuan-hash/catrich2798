function valueText(value) {
  return String(value ?? '').trim();
}

function escapeHtml(value) {
  return valueText(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export function blockTypeForItem(item = {}) {
  const tags = Array.isArray(item.tags) ? item.tags.map((tag) => valueText(tag).toLowerCase()) : [];
  const grammar = valueText(item.grammar_point).toLowerCase();
  const skill = valueText(item.skill).toLowerCase();
  const stem = valueText(item.stem).toLowerCase();

  if (tags.some((tag) => tag.includes('arrangement')) || /correct order/.test(stem)) return 'arrangement_5';
  if (tags.some((tag) => tag.includes('discourse-cloze')) || /best completes each blank/.test(stem) && skill === 'discourse') return 'discourse_cloze_5';
  if (tags.some((tag) => tag.includes('reading-10'))) return 'reading_10';
  if (tags.some((tag) => tag.includes('reading-8'))) return 'reading_8';
  if (tags.some((tag) => tag.includes('functional-cloze')) || /functional[_ -]?cloze/.test(grammar)) return 'functional_cloze_6';
  if (item.bundle_type) return valueText(item.bundle_type).toLowerCase();
  if (skill === 'reading') return 'reading';
  if (/blank \(\d+\)/.test(stem)) return 'cloze';
  return 'other';
}

export function blockLabel(type) {
  const labels = {
    arrangement_5: 'Arrangement · 5 câu',
    discourse_cloze_5: 'Discourse Cloze · 5 câu',
    reading_8: 'Reading Comprehension · 8 câu',
    reading_10: 'Reading Comprehension · 10 câu',
    functional_cloze_6: 'Functional Cloze · 6 câu',
    reading: 'Reading',
    cloze: 'Cloze',
    other: 'Câu hỏi',
  };
  return labels[type] || valueText(type).replace(/_/g, ' ');
}

function isSectionIntro(stem) {
  return /^\s*Questions?\s+\d+\s*[–-]\s*\d+\s*:/i.test(valueText(stem));
}

export function splitExamStem(stem, position) {
  const raw = valueText(stem);
  if (!raw) return { context: '', question: '' };
  const marker = new RegExp('(?:^|\\n)\\s*Question\\s+' + Number(position || 0) + '\\s*[.)：:-]\\s*', 'i');
  const match = marker.exec(raw);
  if (match && match.index > 0) {
    const context = raw.slice(0, match.index).trim();
    const question = raw.slice(match.index + match[0].length).trim();
    return { context, question };
  }
  return {
    context: '',
    question: raw.replace(/^\s*(?:Question|Câu|Q)\s*\d+\s*[.)：:-]?\s*/i, '').trim() || raw,
  };
}

export function buildExamSections(items = []) {
  const ordered = [...items].sort((a, b) => Number(a.position || 0) - Number(b.position || 0));
  const sections = [];
  ordered.forEach((item) => {
    const type = blockTypeForItem(item);
    const shouldStartNew = !sections.length
      || sections[sections.length - 1].type !== type
      || (isSectionIntro(item.stem) && sections[sections.length - 1].items.length > 0);

    if (shouldStartNew) {
      sections.push({
        key: `${type}-${item.position || sections.length + 1}`,
        type,
        label: blockLabel(type),
        items: [],
        bundle: item._bundle || null,
        start: Number(item.position || 0),
        end: Number(item.position || 0),
      });
    }

    const section = sections[sections.length - 1];
    section.items.push(item);
    section.end = Number(item.position || section.end || 0);
    if (!section.bundle && item._bundle) section.bundle = item._bundle;
  });

  return sections.map((section, index) => {
    let context = valueText(section.bundle?.context_text || section.bundle?.contextText);
    let instructions = valueText(section.bundle?.instructions);
    if (!context && section.items.length) {
      const first = section.items[0];
      const split = splitExamStem(first.stem, first.position);
      if (split.context) context = split.context;
    }
    return {
      ...section,
      index: index + 1,
      title: valueText(section.bundle?.title) || blockLabel(section.type),
      context,
      instructions,
    };
  });
}

export function optionOrderForItem(item = {}) {
  const options = Array.isArray(item.options) ? item.options : [];
  const supplied = Array.isArray(item.option_order) ? item.option_order.map(Number) : [];
  if (
    supplied.length === options.length
    && supplied.every((value) => Number.isInteger(value) && value >= 0 && value < options.length)
    && new Set(supplied).size === options.length
  ) return supplied;
  return options.map((_, index) => index);
}

export function visibleOptions(item = {}) {
  const options = Array.isArray(item.options) ? item.options : [];
  return optionOrderForItem(item).map((sourceIndex) => ({
    sourceIndex,
    text: valueText(options[sourceIndex]),
  }));
}

export function effectiveAnswer(item = {}) {
  const raw = valueText(item.correct_answer || item.correctAnswer).toUpperCase();
  const originalIndex = /^[A-Z]$/.test(raw) ? raw.charCodeAt(0) - 65 : -1;
  if (originalIndex < 0) return raw || '—';
  const visibleIndex = optionOrderForItem(item).indexOf(originalIndex);
  return visibleIndex >= 0 ? String.fromCharCode(65 + visibleIndex) : raw;
}

function hashSeed(value) {
  let hash = 2166136261;
  const input = String(value || '');
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function seededRandom(seed) {
  let state = seed >>> 0;
  return () => {
    state += 0x6D2B79F5;
    let next = state;
    next = Math.imul(next ^ (next >>> 15), next | 1);
    next ^= next + Math.imul(next ^ (next >>> 7), next | 61);
    return ((next ^ (next >>> 14)) >>> 0) / 4294967296;
  };
}

export function createVariantOptionOrder(item = {}, examCode = '101') {
  const count = Array.isArray(item.options) ? item.options.length : 0;
  const order = Array.from({ length: count }, (_, index) => index);
  if (count < 2) return order;
  const random = seededRandom(hashSeed(`${examCode}:${item.id || item.position || ''}`));
  for (let i = count - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  const identity = order.every((value, index) => value === index);
  if (identity) order.push(order.shift());
  return order;
}

export function nextExamCode(tests = []) {
  const codes = tests
    .map((test) => Number.parseInt(test?.settings?.examCode, 10))
    .filter((value) => Number.isFinite(value));
  return String(codes.length ? Math.max(...codes) + 1 : 101);
}

function exportQuestionHtml(item, teacherMode) {
  const position = Number(item.position || 0);
  const stemParts = splitExamStem(item.stem, position);
  const questionText = stemParts.question || valueText(item.stem);
  const options = visibleOptions(item);
  const metadata = [
    item.cefr,
    item.cognitive_level,
    item.difficulty ? `D${item.difficulty}` : '',
    item.grammar_point,
  ].filter(Boolean).map(escapeHtml).join(' · ');

  return `
    <div class="question">
      <div class="qhead"><strong>Question ${position}.</strong> ${escapeHtml(questionText).replace(/\n/g, '<br>')}</div>
      ${options.length ? `<div class="options">${options.map((option, index) => `<div><b>${String.fromCharCode(65 + index)}.</b> ${escapeHtml(option.text)}</div>`).join('')}</div>` : ''}
      ${teacherMode ? `<div class="answer"><b>Answer:</b> ${escapeHtml(effectiveAnswer(item))}${item.explanation ? ` · <b>Explanation:</b> ${escapeHtml(item.explanation)}` : ''}</div><div class="meta">${metadata}</div>` : ''}
    </div>`;
}

export function buildExamExportHtml({ test, items, teacherMode = false }) {
  const sections = buildExamSections(items);
  const duration = test?.settings?.durationMinutes || 50;
  const code = valueText(test?.settings?.examCode);
  const title = valueText(test?.title || 'Brian English Exam');
  const body = sections.map((section) => `
    <section>
      <h2>Part ${section.index}. ${escapeHtml(section.label)}</h2>
      ${section.context ? `<div class="passage">${escapeHtml(section.context).replace(/\n/g, '<br>')}</div>` : ''}
      ${section.items.map((item) => exportQuestionHtml(item, teacherMode)).join('')}
    </section>`).join('');

  return `<!doctype html>
<html><head><meta charset="utf-8"><title>${escapeHtml(title)}</title>
<style>
@page{size:A4;margin:16mm}body{font-family:Arial,"Times New Roman",sans-serif;color:#111;font-size:11.5pt;line-height:1.45}
h1{text-align:center;font-size:17pt;margin:0 0 5px} .sub{text-align:center;margin-bottom:18px;color:#444}
h2{font-size:13pt;border-bottom:1px solid #777;padding-bottom:5px;margin:20px 0 10px}
.passage{white-space:normal;background:#f7f7f7;border:1px solid #ddd;padding:10px;margin:8px 0 12px}
.question{page-break-inside:avoid;margin:0 0 13px}.qhead{margin-bottom:6px}.options{display:grid;grid-template-columns:1fr 1fr;gap:4px 18px;margin-left:14px}
.answer{margin-top:6px;padding:6px 8px;background:#fff7db;border-left:3px solid #d9a400}.meta{font-size:9pt;color:#666;margin-top:4px}
</style></head><body>
<h1>${escapeHtml(title)}</h1>
<div class="sub">English · Grade ${escapeHtml(test?.grade || 12)} · ${escapeHtml(test?.school_year || '')} · ${duration} minutes${code ? ` · Code ${escapeHtml(code)}` : ''}${teacherMode ? ' · Teacher version' : ''}</div>
${body}
</body></html>`;
}
