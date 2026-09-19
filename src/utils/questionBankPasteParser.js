function clean(value) {
  return String(value ?? '').replace(/\r\n?/g, '\n').trim();
}

function stripMarkdown(value) {
  return clean(value)
    .replace(/^\s*```(?:json|text|markdown)?\s*/i, '')
    .replace(/\s*```\s*$/i, '')
    .replace(/\*\*/g, '')
    .trim();
}

function safeGrade(value) {
  const match = String(value ?? '').match(/(?:grade|khối|lớp)?\s*(10|11|12)\b/i);
  return match ? Number(match[1]) : null;
}

function labelValue(source, labels) {
  const expression = new RegExp(`^(?:${labels.join('|')})\\s*[:：-]\\s*(.+)$`, 'im');
  return clean(source.match(expression)?.[1] || '');
}

function answerFrom(value) {
  const match = clean(value).match(/(?:answer|correct\s*answer|đáp\s*án)\s*[:：-]?\s*\**([A-D])\**\b/i);
  return match ? match[1].toUpperCase() : '';
}

function normalizeQuestion(question, index, defaults = {}) {
  const rawOptions = Array.isArray(question?.options)
    ? question.options
    : question?.choices && typeof question.choices === 'object'
      ? Object.entries(question.choices).sort(([a], [b]) => a.localeCompare(b)).map(([, value]) => value)
      : [];
  const options = rawOptions.map((item) => clean(item)).filter(Boolean).slice(0, 12);
  const cognitiveRaw = clean(question?.cognitiveLevel ?? question?.cognitive_level ?? defaults.cognitiveLevel).toLowerCase();
  const cognitiveLevel = /application|vận dụng/.test(cognitiveRaw)
    ? 'application'
    : /comprehension|thông hiểu/.test(cognitiveRaw)
      ? 'comprehension'
      : 'recognition';
  return {
    number: Number(question?.number || index + 1),
    stem: clean(question?.stem ?? question?.question ?? ''),
    options,
    correctAnswer: clean(question?.correctAnswer ?? question?.correct_answer ?? question?.answer ?? '').replace(/[^A-D]/gi, '').slice(0, 1).toUpperCase(),
    explanation: clean(question?.explanation ?? question?.rationale ?? ''),
    questionType: clean(question?.questionType ?? question?.question_type ?? defaults.questionType ?? (options.length ? 'mcq' : 'short_answer')) || 'mcq',
    skill: clean(question?.skill ?? defaults.skill ?? 'Use of English') || 'Use of English',
    cefr: clean(question?.cefr ?? defaults.cefr ?? 'B1').toUpperCase() || 'B1',
    topic: clean(question?.topic ?? defaults.topic ?? ''),
    cognitiveLevel,
    difficulty: Math.max(1, Math.min(5, Number(question?.difficulty ?? defaults.difficulty ?? 2) || 2)),
    grade: safeGrade(question?.grade ?? defaults.grade),
    unitName: clean(question?.unitName ?? question?.unit_name ?? defaults.unitName ?? ''),
    schoolYear: clean(question?.schoolYear ?? question?.school_year ?? defaults.schoolYear ?? ''),
    grammarPoint: clean(question?.grammarPoint ?? question?.grammar_point ?? defaults.grammarPoint ?? ''),
    tags: Array.isArray(question?.tags)
      ? question.tags.map(clean).filter(Boolean)
      : clean(question?.tags ?? defaults.tags ?? '').split(',').map((item) => item.trim()).filter(Boolean),
    points: Number(question?.points || 1) || 1,
  };
}

function parseJsonPayload(source, defaults) {
  const candidate = stripMarkdown(source);
  if (!/^[\[{]/.test(candidate)) return null;
  try {
    const parsed = JSON.parse(candidate);
    const exam = Array.isArray(parsed) ? { questions: parsed } : (parsed.exam || parsed);
    const questionSource = Array.isArray(exam?.questions) ? exam.questions : [];
    if (!questionSource.length) return null;
    const questions = questionSource.map((question, index) => normalizeQuestion(question, index, defaults)).filter((item) => item.stem);
    const bundleInput = exam.bundle && typeof exam.bundle === 'object' ? exam.bundle : null;
    const contextText = clean(bundleInput?.contextText ?? bundleInput?.context_text ?? bundleInput?.passage ?? '');
    return {
      format: 'json',
      title: clean(exam.title || parsed.title || defaults.title || ''),
      instructions: clean(exam.instructions || ''),
      questions,
      bundle: contextText ? {
        title: clean(bundleInput?.title || exam.title || 'Ngữ liệu chung'),
        bundleType: clean(bundleInput?.bundleType ?? bundleInput?.bundle_type ?? 'passage') || 'passage',
        contextText,
        instructions: clean(bundleInput?.instructions || ''),
        topic: clean(bundleInput?.topic || defaults.topic || ''),
        skill: clean(bundleInput?.skill || defaults.skill || ''),
        grade: safeGrade(bundleInput?.grade ?? defaults.grade),
      } : null,
      metadata: {
        grade: safeGrade(exam.grade ?? defaults.grade),
        cefr: clean(exam.cefr ?? defaults.cefr ?? 'B1').toUpperCase(),
        schoolYear: clean(exam.schoolYear ?? exam.school_year ?? defaults.schoolYear ?? ''),
      },
      warnings: questions.some((item) => !item.correctAnswer) ? ['Một số câu chưa nhận diện được đáp án.'] : [],
    };
  } catch {
    return null;
  }
}

function collectAnswerKey(source) {
  const result = new Map();
  const marker = source.search(/(?:^|\n)\s*(?:ANSWER\s*KEY|KEY|ĐÁP\s*ÁN)(?:\s*[:：-]|\s*$)/im);
  if (marker < 0) return result;
  const section = source.slice(marker);
  const regex = /(?:Question|Câu|Q)?\s*(\d{1,3})\s*[.)\]:-]?\s*[-–—:]?\s*\**([A-D])\**\b/gi;
  let match;
  while ((match = regex.exec(section))) result.set(Number(match[1]), match[2].toUpperCase());
  return result;
}

function optionParts(block) {
  const matches = [...block.matchAll(/(?:^|\n|\s{2,})([A-D])\s*[.)]\s*/g)];
  if (matches.length < 2) return { before: block, options: [], after: '' };
  const firstIndex = matches[0].index + matches[0][0].length - (matches[0][0].match(/([A-D])\s*[.)]\s*$/)?.[0].length || 0);
  const before = block.slice(0, firstIndex).trim();
  const options = [];
  for (let i = 0; i < matches.length; i += 1) {
    const current = matches[i];
    const labelMatch = current[0].match(/([A-D])\s*[.)]\s*$/);
    if (!labelMatch) continue;
    const label = labelMatch[1];
    const valueStart = current.index + current[0].length;
    const valueEnd = i + 1 < matches.length ? matches[i + 1].index : block.length;
    let value = block.slice(valueStart, valueEnd).trim();
    value = value.split(/\n\s*(?:Answer|Correct\s*answer|Đáp\s*án|Explanation|Giải\s*thích|Rationale)\s*[:：-]/i)[0].trim();
    options.push({ label, value });
  }
  return { before, options, after: block.slice(matches[matches.length - 1].index).trim() };
}

function parseTextPayload(source, defaults) {
  const normalized = stripMarkdown(source).replace(/\u00a0/g, ' ');
  const questionRegex = /(?:^|\n)\s*(?:\*\*)?(?:Question|Câu|Q)?\s*(\d{1,3})\s*[.)：:-]\s*(?:\*\*)?/gi;
  const starts = [...normalized.matchAll(questionRegex)];
  if (!starts.length) {
    return {
      format: 'text',
      title: defaults.title || '',
      instructions: '',
      questions: [],
      bundle: null,
      metadata: { grade: safeGrade(defaults.grade), cefr: clean(defaults.cefr || 'B1').toUpperCase(), schoolYear: clean(defaults.schoolYear || '') },
      warnings: ['Không tìm thấy câu hỏi có đánh số. Hãy dùng dạng “Question 1.”, “Câu 1.” hoặc “1.”.'],
    };
  }

  const answerKey = collectAnswerKey(normalized);
  const keyMarker = normalized.search(/(?:^|\n)\s*(?:ANSWER\s*KEY|KEY|ĐÁP\s*ÁN)(?:\s*[:：-]|\s*$)/im);
  const contentEnd = keyMarker >= 0 ? keyMarker : normalized.length;
  const prefix = normalized.slice(0, starts[0].index).trim();
  const questions = [];

  starts.forEach((start, index) => {
    if (start.index >= contentEnd) return;
    const nextStart = starts[index + 1]?.index ?? contentEnd;
    const number = Number(start[1]);
    const bodyStart = start.index + start[0].length;
    const block = normalized.slice(bodyStart, Math.min(nextStart, contentEnd)).trim();
    const inlineAnswer = answerFrom(block);
    const explanation = labelValue(block, ['Explanation', 'Giải\\s*thích', 'Rationale']);
    const parts = optionParts(block);
    let stem = parts.before || block;
    stem = stem
      .replace(/(?:^|\n)\s*(?:Answer|Correct\s*answer|Đáp\s*án)\s*[:：-]?.*$/gim, '')
      .replace(/(?:^|\n)\s*(?:Explanation|Giải\s*thích|Rationale)\s*[:：-].*$/gim, '')
      .trim();

    const perQuestionDefaults = {
      ...defaults,
      topic: labelValue(block, ['Topic', 'Chủ\\s*đề']) || defaults.topic,
      grammarPoint: labelValue(block, ['Grammar(?:\\s*point)?', 'Ngữ\\s*pháp']) || defaults.grammarPoint,
      skill: labelValue(block, ['Skill', 'Kỹ\\s*năng']) || defaults.skill,
      cefr: labelValue(block, ['CEFR']) || defaults.cefr,
      cognitiveLevel: labelValue(block, ['Cognitive(?:\\s*level)?', 'Mức\\s*nhận\\s*thức']) || defaults.cognitiveLevel,
    };

    questions.push(normalizeQuestion({
      number,
      stem,
      options: parts.options.map((item) => item.value),
      correctAnswer: inlineAnswer || answerKey.get(number) || '',
      explanation,
    }, index, perQuestionDefaults));
  });

  const detectedTitle = labelValue(prefix, ['Title', 'Tên\\s*đề', 'Đề']) || clean(prefix.split('\n').find((line) => /(?:test|exam|đề\s*(?:kiểm tra|thi))/i.test(line)) || defaults.title || '');
  const contextCandidate = prefix
    .split('\n')
    .filter((line) => !/^(?:title|grade|khối|lớp|cefr|topic|chủ đề|skill|kỹ năng|school year|năm học|duration|thời gian)\s*[:：-]/i.test(line.trim()))
    .join('\n')
    .trim();
  const bundleSignal = /\b(?:read(?:ing)?|passage|cloze|notice|dialogue|conversation|advertisement|announcement|text)\b|(?:đọc|đoạn văn|thông báo|hội thoại|ngữ liệu)/i.test(contextCandidate);
  const bundle = contextCandidate.length >= 120 && bundleSignal ? {
    title: detectedTitle || 'Ngữ liệu chung',
    bundleType: /dialogue|conversation|hội thoại/i.test(contextCandidate)
      ? 'dialogue'
      : /cloze/i.test(contextCandidate)
        ? 'cloze'
        : /notice|announcement|thông báo/i.test(contextCandidate)
          ? 'notice'
          : 'passage',
    contextText: contextCandidate,
    instructions: '',
    topic: clean(defaults.topic || ''),
    skill: clean(defaults.skill || (/read/i.test(contextCandidate) ? 'Reading' : '')),
    grade: safeGrade(defaults.grade),
  } : null;

  const warnings = [];
  if (questions.some((item) => item.options.length > 0 && item.options.length < 4)) warnings.push('Có câu trắc nghiệm nhận diện được ít hơn 4 phương án.');
  if (questions.some((item) => !item.correctAnswer)) warnings.push('Một số câu chưa nhận diện được đáp án.');
  if (bundle) warnings.push('Brian phát hiện ngữ liệu chung và sẽ giữ nguyên thành Chùm bài.');

  return {
    format: 'text',
    title: detectedTitle,
    instructions: contextCandidate && !bundle ? contextCandidate.slice(0, 4000) : '',
    questions,
    bundle,
    metadata: {
      grade: safeGrade(defaults.grade) || safeGrade(prefix),
      cefr: (labelValue(prefix, ['CEFR']) || clean(defaults.cefr || 'B1')).toUpperCase(),
      schoolYear: labelValue(prefix, ['School\\s*year', 'Năm\\s*học']) || clean(defaults.schoolYear || ''),
    },
    warnings,
  };
}

export function parseQuestionBankPaste(source, defaults = {}) {
  const value = clean(source);
  if (!value) return {
    format: 'empty',
    title: clean(defaults.title || ''),
    instructions: '',
    questions: [],
    bundle: null,
    metadata: { grade: safeGrade(defaults.grade), cefr: clean(defaults.cefr || 'B1').toUpperCase(), schoolYear: clean(defaults.schoolYear || '') },
    warnings: ['Chưa có nội dung để phân tích.'],
  };
  return parseJsonPayload(value, defaults) || parseTextPayload(value, defaults);
}
