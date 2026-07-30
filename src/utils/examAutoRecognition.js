const LETTERS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
const BAND_ORDER = ['NB', 'TH', 'VD', 'VDC'];

function clean(value = '') {
  return String(value)
    .replace(/\u00a0/g, ' ')
    .replace(/[\t ]+/g, ' ')
    .replace(/\s+$/g, '')
    .trim();
}

function normalizeSource(value = '') {
  return String(value)
    .replace(/^\uFEFF/, '')
    .replace(/\r\n?/g, '\n')
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/[‐‑‒–—]/g, '-')
    .replace(/\u00a0/g, ' ')
    .replace(/\n{4,}/g, '\n\n\n')
    .trim();
}

function stripMarkdown(value = '') {
  return clean(String(value)
    .replace(/^#{1,6}\s*/, '')
    .replace(/^[-*•]\s+/, '')
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/__(.*?)__/g, '$1'));
}

function questionStart(line = '') {
  const text = stripMarkdown(line);
  const patterns = [
    /^(?:question|câu|cau)\s*(\d{1,3})\s*(?:[).:\-]|\s)\s*(.+)$/i,
    /^\(?\s*(\d{1,3})\s*\)?\s*[).:\-]\s*(.+)$/,
    /^(\d{1,3})\s+(.{8,})$/,
  ];
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match && !/^\d{1,3}[./-]\d{1,2}[./-]\d{2,4}/.test(text)) {
      return { number: Number(match[1]), text: clean(match[2]) };
    }
  }
  return null;
}

function optionLine(line = '') {
  const text = stripMarkdown(line);
  const match = text.match(/^\s*(?:\[\s*([xX✓])\s*\]\s*)?([A-Ha-h])\s*[).:：\-]\s*(.+)$/);
  if (!match) return null;
  const raw = clean(match[3]);
  const marked = Boolean(match[1]) || /(?:\s|^)(?:\*|✓|✔)\s*$/.test(raw) || /^\s*(?:\*|✓|✔)\s*/.test(raw);
  return {
    key: match[2].toUpperCase(),
    text: clean(raw.replace(/^\s*(?:\*|✓|✔)\s*/, '').replace(/(?:\s|^)(?:\*|✓|✔)\s*$/, '')),
    marked,
  };
}

function splitInlineOptions(value = '') {
  const text = clean(value);
  const marker = /(?:^|\s|\|)(?:\[\s*([xX✓])\s*\]\s*)?([A-Ha-h])\s*[).:：\-]\s+/g;
  const positions = [];
  let match;
  while ((match = marker.exec(text))) {
    positions.push({ index: match.index, end: marker.lastIndex, key: match[2].toUpperCase(), marked: Boolean(match[1]) });
  }
  if (positions.length < 2) return null;
  const stem = clean(text.slice(0, positions[0].index).replace(/\|+$/g, ''));
  const options = positions.map((position, index) => {
    const end = positions[index + 1]?.index ?? text.length;
    const raw = clean(text.slice(position.end, end).replace(/\|+$/g, ''));
    const marked = position.marked || /(?:\s|^)(?:\*|✓|✔)\s*$/.test(raw);
    return {
      key: position.key,
      text: clean(raw.replace(/(?:\s|^)(?:\*|✓|✔)\s*$/, '')),
      marked,
    };
  });
  return { stem, options };
}

function answerValue(value = '') {
  const raw = clean(value).replace(/[).,;:]$/, '').toUpperCase();
  if (/^[A-H]$/.test(raw)) return raw;
  if (/^(TRUE|T|ĐÚNG|DUNG)$/.test(raw)) return 'TRUE';
  if (/^(FALSE|F|SAI)$/.test(raw)) return 'FALSE';
  return clean(value);
}

function parseAnswerKey(text = '') {
  const map = new Map();
  const source = normalizeSource(text);
  const heading = /(?:^|\n)\s*(?:#{1,6}\s*)?(?:answer\s*key|answers?|đáp\s*án|dap\s*an|keys?)\s*[:\-]?\s*(?:\n|$)/ig;
  let section = '';
  let last;
  while ((last = heading.exec(source))) section = source.slice(last.index + last[0].length);
  const pools = section ? [section, source] : [source];
  const patterns = [
    /(?:^|[\n\s|;,])(?:question|câu|cau)?\s*(\d{1,3})\s*[).:\-]?\s*(?:answer|đáp\s*án|dap\s*an|chọn|chon)?\s*[:=\-]?\s*(A|B|C|D|E|F|G|H|TRUE|FALSE|T|F|ĐÚNG|DUNG|SAI)(?=$|[\n\s|;,])/gi,
    /(?:answer|đáp\s*án|dap\s*an)\s*(?:for\s*)?(?:question|câu|cau)?\s*(\d{1,3})\s*[:=\-]\s*(A|B|C|D|E|F|G|H|TRUE|FALSE|T|F|ĐÚNG|DUNG|SAI)\b/gi,
  ];
  for (const pool of pools) {
    for (const pattern of patterns) {
      for (const match of pool.matchAll(pattern)) {
        const number = Number(match[1]);
        if (!map.has(number)) map.set(number, answerValue(match[2]));
      }
    }
    if (map.size) break;
  }
  return map;
}

function parseExplanationKey(text = '') {
  const map = new Map();
  const source = normalizeSource(text);
  const sectionMatch = source.match(/(?:^|\n)\s*(?:#{1,6}\s*)?(?:explanations?|giải\s*thích|loi\s*giai|rationales?)\s*[:\-]?\s*\n([\s\S]*)$/i);
  if (!sectionMatch) return map;
  const lines = sectionMatch[1].split('\n');
  let current = null;
  for (const line of lines) {
    const start = questionStart(line);
    if (start) {
      current = start.number;
      map.set(current, start.text);
    } else if (current && clean(line)) {
      map.set(current, clean(`${map.get(current)} ${stripMarkdown(line)}`));
    }
  }
  return map;
}

function isSectionHeading(line = '') {
  const text = stripMarkdown(line);
  if (!text || text.length > 150) return false;
  return /^(?:(?:part|section|test|exercise|task|bài|phần)\s+[A-Z0-9IVX]+\b|[IVX]{1,8}\s*[.):-]\s+|[A-Z]\s*[.):-]\s+)(?![A-H]\s*[).:-]\s)/i.test(text)
    || /^(?:grammar|vocabulary|pronunciation|stress|reading|listening|writing|speaking|cloze|word\s*form|error\s*correction)\b/i.test(text);
}

function isInstruction(line = '') {
  const text = stripMarkdown(line);
  return /^(?:choose|select|read|listen|complete|fill|rewrite|match|identify|circle|underline|decide|answer|write|use|find|mark|hãy|chọn|đọc|nghe|điền|viết|nối|xác định|trả lời)\b/i.test(text)
    && !questionStart(text);
}

function isAnswerHeading(line = '') {
  return /^(?:#{1,6}\s*)?(?:answer\s*key|answers?|đáp\s*án|dap\s*an|keys?|explanations?|giải\s*thích|rationales?)\s*[:\-]?$/i.test(stripMarkdown(line));
}

function isPassageTrigger(line = '') {
  const text = stripMarkdown(line);
  return /^(?:reading\s*)?(?:passage|text)\s*\d*\b|^read\s+the\s+(?:following\s+)?(?:passage|text)|^đọc\s+(?:đoạn|bài)/i.test(text);
}

function looksLikeParagraph(line = '') {
  const text = stripMarkdown(line);
  return text.length >= 90 && !questionStart(text) && !optionLine(text) && !isInstruction(text) && !isSectionHeading(text);
}

function inferKind(stem, section = '', instruction = '', hasOptions = false, hasPassage = false) {
  const haystack = `${section} ${instruction} ${stem}`.toLowerCase();
  if (hasPassage) return hasOptions ? ['Reading Comprehension MCQ', 'reading-mcq', 'Reading Comprehension'] : ['Reading Response', 'reading-response', 'Reading Response'];
  if (/true\s*\/\s*false|true\s+or\s+false|đúng\s*\/\s*sai|đúng\s+hay\s+sai/.test(haystack)) return ['True / False', 'true-false', 'True / False'];
  if (/word\s*form|word\s*formation|correct\s+form\s+of\s+the\s+word|dạng\s+đúng\s+của\s+từ/.test(haystack) || /\([A-Z][A-Z-]{2,}\)\s*$/.test(stem)) return [hasOptions ? 'Word formation' : 'Word formation open', hasOptions ? 'word-formation-mcq' : 'word-form-open', 'Word Formation'];
  if (/verb\s*form|correct\s+form\s+of\s+the\s+verb|chia\s+động\s+từ/.test(haystack)) return [hasOptions ? 'Grammar MCQ' : 'Verb form open', hasOptions ? 'grammar-gap-mcq' : 'verb-form-open', 'Verb Form'];
  if (/cloze|gap[- ]?fill|fill\s+in\s+the\s+blank|complete\s+the\s+(?:text|passage)|điền\s+(?:từ|vào)/.test(haystack) || /_{3,}|\.{4,}|\[\s*\]/.test(stem)) return [hasOptions ? 'Multiple-choice Cloze' : 'Open gap-fill', hasOptions ? 'mc-cloze' : 'open-gapfill', hasOptions ? 'Multiple-choice Cloze' : 'Open Gap-fill'];
  if (/error|mistake|incorrect|underlined\s+part|sửa\s+lỗi|tìm\s+lỗi/.test(haystack)) return [hasOptions ? 'Error correction' : 'Correct the mistake', hasOptions ? 'error-correction-mcq' : 'correct-mistake', 'Error Correction'];
  if (/rewrite|sentence\s+transformation|complete\s+the\s+second\s+sentence|viết\s+lại/.test(haystack)) return ['Rewrite', 'rewrite', 'Rewrite the Sentence'];
  if (/pronunciation|underlined\s+(?:part|sound)|phát\s+âm/.test(haystack)) return ['Pronunciation', 'pronunciation', 'Pronunciation'];
  if (/stress|stressed\s+syllable|trọng\s+âm/.test(haystack)) return ['Stress', 'stress', 'Stress'];
  if (/matching|match\s+|nối\s+/.test(haystack)) return ['Matching', 'matching', 'Matching'];
  if (/short\s+answer|answer\s+the\s+question|trả\s+lời\s+ngắn/.test(haystack)) return ['Short answer', 'short-answer', 'Short Answer'];
  if (/essay|paragraph|email|letter|report|write\s+(?:about|an?|the)|viết\s+(?:đoạn|bài|thư)/.test(haystack)) return ['Paragraph writing', 'paragraph-writing', 'Writing'];
  return hasOptions ? ['Recognized MCQ', 'mcq-4', 'Multiple Choice'] : ['Short answer', 'short-answer', 'Short Answer'];
}

function bandFor(index, project = {}) {
  const values = [Number(project.nb) || 25, Number(project.th) || 35, Number(project.vd) || 30, Number(project.vdc) || 10];
  const total = values.reduce((sum, value) => sum + value, 0) || 100;
  const point = ((index * 37) % 100) / 100 * total;
  let cursor = 0;
  for (let i = 0; i < values.length; i += 1) {
    cursor += values[i];
    if (point < cursor) return BAND_ORDER[i];
  }
  return 'VDC';
}

function normalizeOptions(rawOptions, localAnswer = '') {
  const unique = [];
  const seen = new Set();
  rawOptions.forEach((option, index) => {
    const text = clean(option.text);
    if (!text) return;
    const signature = text.toLowerCase();
    if (seen.has(signature)) return;
    seen.add(signature);
    unique.push({ key: LETTERS[index] || option.key || String(index + 1), text, marked: option.marked === true, originalKey: option.key || LETTERS[index] });
  });
  const marked = unique.find((option) => option.marked);
  const rawAnswer = answerValue(localAnswer || marked?.originalKey || '');
  let mappedAnswer = '';
  if (/^[A-H]$/.test(rawAnswer)) {
    const originalIndex = unique.findIndex((option) => option.originalKey === rawAnswer);
    mappedAnswer = unique[originalIndex >= 0 ? originalIndex : LETTERS.indexOf(rawAnswer)]?.key || '';
  } else if (rawAnswer === 'TRUE' || rawAnswer === 'FALSE') {
    mappedAnswer = rawAnswer === 'TRUE' ? 'A' : 'B';
  }
  return {
    answer: mappedAnswer,
    options: unique.slice(0, 8).map((option) => ({ key: option.key, text: option.text, isCorrect: option.key === mappedAnswer })),
  };
}

function collectPassages(lines) {
  const passages = [];
  const consumed = new Set();
  let active = null;
  let beforeFirstQuestion = true;
  let preface = [];

  const flush = () => {
    if (!active) return;
    const text = active.lines.map(stripMarkdown).filter(Boolean).join(' ').replace(/\s+/g, ' ').trim();
    if (text.length >= 80) {
      passages.push({ id: `passage-${passages.length + 1}`, title: active.title || `Reading Passage ${passages.length + 1}`, text });
      active.indices.forEach((index) => consumed.add(index));
    }
    active = null;
  };

  lines.forEach((line, index) => {
    const text = stripMarkdown(line);
    const q = questionStart(text);
    if (q) {
      beforeFirstQuestion = false;
      flush();
      return;
    }
    if (isAnswerHeading(text)) {
      flush();
      return;
    }
    if (isPassageTrigger(text)) {
      flush();
      active = { title: text, lines: [], indices: [index] };
      return;
    }
    if (active) {
      if (isSectionHeading(text) && active.lines.length) {
        flush();
      } else if (text && !optionLine(text)) {
        active.lines.push(text);
        active.indices.push(index);
      }
      return;
    }
    if (beforeFirstQuestion && looksLikeParagraph(text)) {
      preface.push({ text, index });
    }
  });
  flush();

  if (!passages.length && preface.length) {
    const text = preface.map((item) => item.text).join(' ').replace(/\s+/g, ' ').trim();
    if (text.length >= 180) {
      passages.push({ id: 'passage-1', title: 'Reading Passage', text });
      preface.forEach((item) => consumed.add(item.index));
    }
  }
  return { passages, consumed };
}

function sourceStatistics(questions, passages, sections, answerKey) {
  return {
    total: questions.length,
    mcq: questions.filter((question) => question.options.length > 0).length,
    open: questions.filter((question) => question.options.length === 0).length,
    answered: questions.filter((question) => Boolean(question.answer || question.sampleAnswer)).length,
    passages: passages.length,
    sections: sections.length,
    answerKeys: answerKey.size,
  };
}

export function recognizeExamSourceAutomatically(rawText, project = {}) {
  const source = normalizeSource(rawText);
  if (!source) {
    return {
      questions: [], passages: [], sections: [], diagnostics: ['Chưa có nội dung để nhận dạng.'], warnings: [], detectedCount: 0, confidence: 0,
      stats: { total: 0, mcq: 0, open: 0, answered: 0, passages: 0, sections: 0, answerKeys: 0 },
      inferredFormats: [],
    };
  }

  const lines = source.split('\n');
  const answerKey = parseAnswerKey(source);
  const explanationKey = parseExplanationKey(source);
  const { passages, consumed } = collectPassages(lines);
  const sections = [];
  const questions = [];
  const warnings = [];
  let currentSection = '';
  let currentInstruction = '';
  let current = null;
  let inAnswers = false;

  const flush = () => {
    if (!current) return;
    const originalNumber = current.number || questions.length + 1;
    const stem = clean(current.stemParts.join(' '));
    if (!stem || stem.length < 3) {
      current = null;
      return;
    }
    let localAnswer = current.answer || answerKey.get(originalNumber) || '';
    let rawOptions = current.options;
    const combinedContext = `${current.section} ${current.instruction}`;
    const trueFalse = /true\s*\/\s*false|true\s+or\s+false|đúng\s*\/\s*sai|đúng\s+hay\s+sai/i.test(combinedContext);
    if (!rawOptions.length && trueFalse) {
      rawOptions = [{ key: 'A', text: 'True' }, { key: 'B', text: 'False' }];
    }
    const normalized = normalizeOptions(rawOptions, localAnswer);
    const hasPassage = passages.length > 0 && (/read|passage|text|reading|đọc/i.test(combinedContext) || current.section.toLowerCase().includes('reading'));
    const passage = hasPassage ? passages[Math.min(current.passageIndex || 0, passages.length - 1)] : null;
    const [kind, formatId, formatLabel] = inferKind(stem, current.section, current.instruction, normalized.options.length > 0, Boolean(passage));
    const explanation = clean(current.explanationParts.join(' ') || explanationKey.get(originalNumber) || '');
    const openAnswer = normalized.options.length ? '' : clean(localAnswer);
    const issues = [];
    if (normalized.options.length && !normalized.answer) issues.push('Thiếu đáp án đúng');
    if (normalized.options.length === 1) issues.push('Chỉ nhận dạng được 1 phương án');
    if (!normalized.options.length && !openAnswer) issues.push('Câu tự luận chưa có đáp án mẫu');
    const confidence = Math.max(35, Math.min(100,
      42 + (stem.length > 12 ? 18 : 0) + (normalized.options.length >= 2 ? 22 : 0) + (normalized.answer || openAnswer ? 12 : 0) + (current.section ? 4 : 0) + (passage ? 2 : 0) - issues.length * 8));
    const no = questions.length + 1;
    questions.push({
      id: `auto-${Date.now()}-${no}`,
      no,
      originalNo: originalNumber,
      kind,
      formatId,
      formatLabel,
      band: bandFor(no - 1, project),
      section: current.section,
      instruction: current.instruction,
      stem: `${no}. ${stem}`,
      options: normalized.options,
      answer: normalized.options.length ? normalized.answer : openAnswer,
      sampleAnswer: normalized.options.length ? '' : openAnswer,
      explanation,
      rubric: '',
      passageId: passage?.id || '',
      passageTitle: passage?.title || '',
      passageText: passage?.text || '',
      sourceFocus: current.section || project.topic || 'Imported source',
      recognitionConfidence: confidence,
      recognitionIssues: issues,
    });
    current = null;
  };

  lines.forEach((rawLine, index) => {
    if (consumed.has(index)) return;
    const line = stripMarkdown(rawLine);
    if (!line) return;
    if (isAnswerHeading(line)) {
      flush();
      inAnswers = true;
      return;
    }
    if (inAnswers) return;
    if (isSectionHeading(line)) {
      flush();
      currentSection = line;
      currentInstruction = '';
      sections.push({ id: `section-${sections.length + 1}`, title: line });
      return;
    }
    if (isInstruction(line)) {
      flush();
      currentInstruction = line;
      return;
    }

    const start = questionStart(line);
    if (start) {
      flush();
      const inline = splitInlineOptions(start.text);
      current = {
        number: start.number,
        section: currentSection,
        instruction: currentInstruction,
        stemParts: [inline?.stem || start.text],
        options: inline?.options || [],
        answer: '',
        explanationParts: [],
        passageIndex: Math.max(0, passages.length - 1),
      };
      return;
    }

    if (!current) return;
    const option = optionLine(line);
    if (option) {
      current.options.push(option);
      return;
    }
    const inlineOptions = splitInlineOptions(line);
    if (inlineOptions && !inlineOptions.stem) {
      current.options.push(...inlineOptions.options);
      return;
    }
    const answer = line.match(/^(?:answer|correct\s*answer|key|đáp\s*án|dap\s*an|chọn|chon)\s*[:=\-]?\s*(.+)$/i);
    if (answer) {
      current.answer = answerValue(answer[1]);
      return;
    }
    const explanation = line.match(/^(?:explanation|rationale|teacher\s*note|giải\s*thích|loi\s*giai)\s*[:=\-]?\s*(.+)$/i);
    if (explanation) {
      current.explanationParts.push(explanation[1]);
      return;
    }
    if (current.options.length) {
      const last = current.options[current.options.length - 1];
      if (line.length < 180 && !questionStart(line)) last.text = clean(`${last.text} ${line}`);
    } else {
      current.stemParts.push(line);
    }
  });
  flush();

  const deduped = [];
  const signatures = new Set();
  questions.forEach((question) => {
    const signature = question.stem.replace(/^\d+\.\s*/, '').toLowerCase().replace(/\W+/g, ' ').trim();
    if (!signature || signatures.has(signature)) return;
    signatures.add(signature);
    deduped.push({ ...question, no: deduped.length + 1, stem: `${deduped.length + 1}. ${question.stem.replace(/^\d+\.\s*/, '')}` });
  });

  const stats = sourceStatistics(deduped, passages, sections, answerKey);
  const issueCount = deduped.reduce((sum, question) => sum + question.recognitionIssues.length, 0);
  const confidence = deduped.length
    ? Math.round(deduped.reduce((sum, question) => sum + question.recognitionConfidence, 0) / deduped.length)
    : 0;
  if (!deduped.length) warnings.push('Chưa tìm thấy câu hỏi có số thứ tự rõ ràng. Hãy giữ số câu và phương án A–D trong file nguồn.');
  if (stats.mcq && stats.answered < stats.mcq) warnings.push(`${stats.mcq - deduped.filter((question) => question.options.length && question.answer).length} câu trắc nghiệm chưa xác định được đáp án.`);
  if (issueCount) warnings.push(`Có ${issueCount} điểm cần giáo viên kiểm tra lại trong Preview.`);

  const inferredFormats = [...new Set(deduped.map((question) => question.formatId).filter(Boolean))];
  const diagnostics = [
    `Đã đọc ${lines.filter((line) => clean(line)).length} dòng và tự động phân tích toàn bộ nguồn.`,
    `Nhận dạng ${stats.total} câu: ${stats.mcq} câu lựa chọn, ${stats.open} câu trả lời mở.`,
    `Tìm thấy ${stats.passages} bài đọc, ${stats.sections} phần và ${stats.answered}/${stats.total} câu có đáp án hoặc đáp án mẫu.`,
    `Độ tin cậy nhận dạng trung bình: ${confidence}%.`,
  ];

  return {
    questions: deduped,
    passages,
    sections,
    diagnostics,
    warnings,
    detectedCount: deduped.length,
    confidence,
    stats,
    inferredFormats,
  };
}
