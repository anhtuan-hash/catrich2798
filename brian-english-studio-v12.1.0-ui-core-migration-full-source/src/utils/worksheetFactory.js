const STOPWORDS = new Set([
  'about','after','again','against','also','among','because','before','being','between','both','could','does','doing','during','each','from','further','have','having','into','itself','more','most','other','over','same','should','some','such','than','that','their','theirs','them','themselves','then','there','these','they','this','those','through','under','until','very','what','when','where','which','while','who','whom','with','would','your','yours','you','were','will','shall','been','are','was','is','am','the','and','for','not','but','can','may','might','must','our','out','too','use','using','used','has','had','its','his','her','she','him','he','we','us','a','an','of','to','in','on','at','by','or','as','if','be','do','did','so','no','yes','one','two','three','four','five'
]);

export const WORKSHEET_ACTIVITY_TYPES = [
  {
    id: 'multiple_choice',
    label: 'Multiple Choice',
    labelVi: 'Trắc nghiệm',
    desc: 'Four-option questions with one correct answer.',
    descVi: 'Câu hỏi 4 phương án, có một đáp án đúng.',
    icon: 'A',
  },
  {
    id: 'gap_fill',
    label: 'Gap Filling',
    labelVi: 'Điền từ',
    desc: 'Contextual sentences with answer keys.',
    descVi: 'Câu có ngữ cảnh và chỗ trống cần hoàn thành.',
    icon: '…',
  },
  {
    id: 'matching',
    label: 'Matching',
    labelVi: 'Nối cặp',
    desc: 'Match terms, meanings, examples or halves.',
    descVi: 'Nối từ, nghĩa, ví dụ hoặc hai nửa câu.',
    icon: '↔',
  },
  {
    id: 'word_formation',
    label: 'Word Formation',
    labelVi: 'Word form',
    desc: 'Complete sentences with the correct word form.',
    descVi: 'Hoàn thành câu bằng dạng đúng của từ.',
    icon: 'W',
  },
  {
    id: 'error_correction',
    label: 'Error Correction',
    labelVi: 'Sửa lỗi sai',
    desc: 'Identify and correct grammar or vocabulary errors.',
    descVi: 'Nhận diện và sửa lỗi ngữ pháp hoặc từ vựng.',
    icon: '✎',
  },
  {
    id: 'cloze',
    label: 'Cloze Text',
    labelVi: 'Cloze text',
    desc: 'A connected passage with numbered gaps.',
    descVi: 'Đoạn văn liên kết có các khoảng trống đánh số.',
    icon: '¶',
  },
  {
    id: 'reading_comprehension',
    label: 'Reading Comprehension',
    labelVi: 'Đọc hiểu',
    desc: 'Reading questions grounded in the source text.',
    descVi: 'Câu hỏi đọc hiểu bám sát văn bản nguồn.',
    icon: 'R',
  },
  {
    id: 'true_false',
    label: 'True / False',
    labelVi: 'Đúng / Sai',
    desc: 'Statements checked against the source.',
    descVi: 'Xác định nhận định đúng hay sai theo văn bản.',
    icon: 'T/F',
  },
  {
    id: 'sentence_transformation',
    label: 'Sentence Transformation',
    labelVi: 'Viết lại câu',
    desc: 'Rewrite sentences without changing meaning.',
    descVi: 'Viết lại câu mà không thay đổi nghĩa.',
    icon: '⇄',
  },
  {
    id: 'vocabulary_context',
    label: 'Vocabulary in Context',
    labelVi: 'Từ vựng ngữ cảnh',
    desc: 'Infer meaning and usage from context.',
    descVi: 'Suy luận nghĩa và cách dùng từ trong ngữ cảnh.',
    icon: 'V',
  },
  {
    id: 'ordering',
    label: 'Ordering',
    labelVi: 'Sắp xếp',
    desc: 'Put words, sentences or events in order.',
    descVi: 'Sắp xếp từ, câu hoặc sự kiện theo thứ tự.',
    icon: '1–4',
  },
  {
    id: 'verb_form',
    label: 'Verb Form',
    labelVi: 'Dạng động từ',
    desc: 'Use the correct tense, infinitive or gerund form.',
    descVi: 'Dùng đúng thì, nguyên mẫu hoặc danh động từ.',
    icon: 'Vƒ',
  },
  {
    id: 'sentence_combination',
    label: 'Sentence Combination',
    labelVi: 'Kết hợp câu',
    desc: 'Combine ideas using a target structure.',
    descVi: 'Kết hợp ý bằng cấu trúc ngữ pháp mục tiêu.',
    icon: '＋',
  },
  {
    id: 'vocabulary_categorisation',
    label: 'Vocabulary Categorisation',
    labelVi: 'Phân loại từ vựng',
    desc: 'Sort words into meaningful groups.',
    descVi: 'Phân loại từ vào các nhóm có ý nghĩa.',
    icon: '▦',
  },
  {
    id: 'collocation_matching',
    label: 'Collocation Matching',
    labelVi: 'Nối collocation',
    desc: 'Match word partners and useful phrases.',
    descVi: 'Nối các từ thường đi cùng và cụm từ hữu ích.',
    icon: '⛓',
  },
  {
    id: 'dialogue_completion',
    label: 'Dialogue Completion',
    labelVi: 'Hoàn thành hội thoại',
    desc: 'Complete a contextual conversation.',
    descVi: 'Hoàn thành đoạn hội thoại theo ngữ cảnh.',
    icon: '☏',
  },
  {
    id: 'short_answer',
    label: 'Short Answer',
    labelVi: 'Trả lời ngắn',
    desc: 'Answer concise questions from the source.',
    descVi: 'Trả lời ngắn các câu hỏi dựa trên nguồn.',
    icon: '?',
  },
  {
    id: 'information_transfer',
    label: 'Information Transfer',
    labelVi: 'Chuyển đổi thông tin',
    desc: 'Transfer text into a table, timeline or notes.',
    descVi: 'Chuyển văn bản thành bảng, dòng thời gian hoặc ghi chú.',
    icon: '⇥',
  },
  {
    id: 'graphic_organiser',
    label: 'Graphic Organiser',
    labelVi: 'Sơ đồ tổ chức ý',
    desc: 'Complete a mind map, flowchart or comparison frame.',
    descVi: 'Hoàn thành sơ đồ tư duy, quy trình hoặc bảng so sánh.',
    icon: '⌘',
  },
  {
    id: 'editing_task',
    label: 'Editing Task',
    labelVi: 'Biên tập văn bản',
    desc: 'Improve a short text for accuracy and clarity.',
    descVi: 'Chỉnh một đoạn văn để tăng độ chính xác và rõ ràng.',
    icon: '⌫',
  },
  {
    id: 'reflection_exit_ticket',
    label: 'Reflection / Exit Ticket',
    labelVi: 'Phản tư / Exit ticket',
    desc: 'Close the lesson with reflection or evidence of learning.',
    descVi: 'Kết thúc bài bằng phản tư hoặc minh chứng học tập.',
    icon: '✓',
  },
];

const TYPE_MAP = new Map(WORKSHEET_ACTIVITY_TYPES.map((type) => [type.id, type]));

function uid(prefix = 'wf') {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function text(value = '') {
  return String(value ?? '').replace(/\r\n?/g, '\n').trim();
}

function cleanSpace(value = '') {
  return text(value).replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n');
}

function normalizeForCompare(value = '') {
  return text(value)
    .toLocaleLowerCase('en')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function escapeHtml(value = '') {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function xmlEscape(value = '') {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function clip(value = '', max = 32000) {
  const clean = cleanSpace(value);
  return clean.length > max ? `${clean.slice(0, max)}\n\n[Source clipped]` : clean;
}

export function splitSourceUnits(source = '') {
  const raw = cleanSpace(source);
  if (!raw) return [];
  const paragraphs = raw
    .split(/\n{2,}|(?<=[.!?])\s+(?=[A-ZÀ-Ỵ0-9"“])/u)
    .map((item) => item.replace(/^[-•*\d.)\s]+/, '').trim())
    .filter((item) => item.length >= 18 && item.length <= 600);
  if (paragraphs.length >= 4) return paragraphs.slice(0, 120);
  return raw
    .split(/\n+/)
    .map((item) => item.replace(/^[-•*\d.)\s]+/, '').trim())
    .filter((item) => item.length >= 10)
    .slice(0, 120);
}

export function extractKeywords(source = '', limit = 80) {
  const words = cleanSpace(source)
    .match(/[A-Za-zÀ-Ỵà-ỵ][A-Za-zÀ-Ỵà-ỵ'-]{3,}/gu) || [];
  const seen = new Set();
  const scored = [];
  for (const word of words) {
    const normalized = normalizeForCompare(word);
    if (!normalized || STOPWORDS.has(normalized) || seen.has(normalized)) continue;
    seen.add(normalized);
    const score = word.length + (/[A-ZÀ-Ỵ]/.test(word[0]) ? 0.5 : 0);
    scored.push({ word, normalized, score });
  }
  return scored.sort((a, b) => b.score - a.score).slice(0, limit).map((item) => item.word);
}

function replaceFirstInsensitive(sentence, target, replacement = '_____') {
  const index = sentence.toLocaleLowerCase('en').indexOf(target.toLocaleLowerCase('en'));
  if (index < 0) return `${sentence} (${replacement})`;
  return `${sentence.slice(0, index)}${replacement}${sentence.slice(index + target.length)}`;
}

function pickKeyword(sentence, keywords, index = 0) {
  const local = extractKeywords(sentence, 12);
  const candidate = local.find((word) => word.length >= 5) || local[0] || keywords[index % Math.max(keywords.length, 1)] || 'language';
  return candidate;
}

function distinctOptions(answer, keywords, count = 4) {
  const output = [answer];
  for (const keyword of keywords) {
    if (normalizeForCompare(keyword) === normalizeForCompare(answer)) continue;
    if (output.some((item) => normalizeForCompare(item) === normalizeForCompare(keyword))) continue;
    output.push(keyword);
    if (output.length >= count) break;
  }
  while (output.length < count) output.push(`Option ${output.length + 1}`);
  return output.slice(0, count);
}

function deterministicRotate(items, offset) {
  if (!items.length) return items;
  const safe = ((offset % items.length) + items.length) % items.length;
  return [...items.slice(safe), ...items.slice(0, safe)];
}

function defaultActivityTitle(type, language) {
  const item = TYPE_MAP.get(type);
  return language === 'vi' ? item?.labelVi || type : item?.label || type;
}

function defaultInstructions(type, language) {
  const vi = {
    multiple_choice: 'Chọn phương án đúng nhất A, B, C hoặc D.',
    gap_fill: 'Điền từ hoặc cụm từ phù hợp vào mỗi chỗ trống.',
    matching: 'Nối mỗi mục ở cột A với đáp án phù hợp ở cột B.',
    word_formation: 'Dùng dạng đúng của từ trong ngoặc để hoàn thành câu.',
    error_correction: 'Tìm và sửa một lỗi trong mỗi câu.',
    cloze: 'Hoàn thành đoạn văn bằng từ hoặc cụm từ phù hợp.',
    reading_comprehension: 'Đọc văn bản và trả lời các câu hỏi.',
    true_false: 'Xác định mỗi nhận định là Đúng hay Sai.',
    sentence_transformation: 'Viết lại câu sao cho nghĩa không đổi.',
    vocabulary_context: 'Chọn từ hoặc nghĩa phù hợp nhất với ngữ cảnh.',
    ordering: 'Sắp xếp các thành phần theo đúng thứ tự.',
    verb_form: 'Dùng dạng đúng của động từ trong ngoặc.',
    sentence_combination: 'Kết hợp các câu bằng cấu trúc được yêu cầu.',
    vocabulary_categorisation: 'Phân loại các từ vào nhóm phù hợp.',
    collocation_matching: 'Nối các từ để tạo collocation hoặc cụm từ đúng.',
    dialogue_completion: 'Hoàn thành đoạn hội thoại bằng câu hoặc cụm từ phù hợp.',
    short_answer: 'Trả lời ngắn dựa trên văn bản nguồn.',
    information_transfer: 'Chuyển thông tin từ văn bản vào bảng hoặc khung ghi chú.',
    graphic_organiser: 'Hoàn thành sơ đồ tổ chức ý theo nội dung nguồn.',
    editing_task: 'Biên tập đoạn văn theo yêu cầu về độ chính xác và rõ ràng.',
    reflection_exit_ticket: 'Hoàn thành câu hỏi phản tư hoặc exit ticket.',
  };
  const en = {
    multiple_choice: 'Choose the best answer A, B, C or D.',
    gap_fill: 'Complete each gap with the most suitable word or phrase.',
    matching: 'Match each item in column A with the correct item in column B.',
    word_formation: 'Use the correct form of the word in brackets.',
    error_correction: 'Find and correct one error in each sentence.',
    cloze: 'Complete the passage with suitable words or phrases.',
    reading_comprehension: 'Read the text and answer the questions.',
    true_false: 'Decide whether each statement is True or False.',
    sentence_transformation: 'Rewrite each sentence without changing its meaning.',
    vocabulary_context: 'Choose the word or meaning that best fits the context.',
    ordering: 'Put the parts in the correct order.',
    verb_form: 'Use the correct form of the verb in brackets.',
    sentence_combination: 'Combine the sentences using the required structure.',
    vocabulary_categorisation: 'Sort the words into the correct categories.',
    collocation_matching: 'Match the words to make correct collocations or phrases.',
    dialogue_completion: 'Complete the dialogue with suitable sentences or phrases.',
    short_answer: 'Answer briefly using information from the source.',
    information_transfer: 'Transfer information from the text into the table or notes.',
    graphic_organiser: 'Complete the organiser using ideas from the source.',
    editing_task: 'Edit the text for accuracy and clarity.',
    reflection_exit_ticket: 'Complete the reflection or exit ticket.',
  };
  return (language === 'vi' ? vi : en)[type] || '';
}

function createItem(type, unit, keywords, index, language) {
  const target = pickKeyword(unit, keywords, index);
  const base = {
    id: uid('item'),
    prompt: unit,
    options: [],
    answer: target,
    explanation: language === 'vi'
      ? `Đáp án được lấy từ ngữ cảnh của văn bản nguồn: “${target}”.`
      : `The answer is grounded in the source context: “${target}”.`,
  };

  if (type === 'multiple_choice' || type === 'vocabulary_context') {
    const options = deterministicRotate(distinctOptions(target, keywords, 4), index % 4);
    return {
      ...base,
      prompt: replaceFirstInsensitive(unit, target),
      options,
      answer: target,
    };
  }

  if (type === 'gap_fill') {
    return { ...base, prompt: replaceFirstInsensitive(unit, target) };
  }

  if (type === 'matching') {
    return {
      ...base,
      prompt: target,
      answer: unit.length > 180 ? `${unit.slice(0, 177)}…` : unit,
      explanation: '',
    };
  }

  if (type === 'word_formation') {
    return {
      ...base,
      prompt: `${replaceFirstInsensitive(unit, target)} (${target.toUpperCase()})`,
      answer: target,
    };
  }

  if (type === 'error_correction') {
    const wrong = unit.includes(' is ')
      ? unit.replace(' is ', ' are ')
      : unit.includes(' are ')
        ? unit.replace(' are ', ' is ')
        : `The ${target.toLocaleLowerCase('en')} are an important idea in this context.`;
    const corrected = unit.includes(' is ') || unit.includes(' are ')
      ? unit
      : `The ${target.toLocaleLowerCase('en')} is an important idea in this context.`;
    return { ...base, prompt: wrong, answer: corrected };
  }

  if (type === 'true_false') {
    const falseItem = index % 2 === 1;
    const replacement = keywords.find((word) => normalizeForCompare(word) !== normalizeForCompare(target)) || 'another concept';
    const prompt = falseItem ? replaceFirstInsensitive(unit, target, replacement) : unit;
    return {
      ...base,
      prompt,
      options: ['True', 'False'],
      answer: falseItem ? 'False' : 'True',
      explanation: falseItem
        ? (language === 'vi' ? `Văn bản nguồn dùng “${target}”, không phải “${replacement}”.` : `The source uses “${target}”, not “${replacement}”.`)
        : (language === 'vi' ? 'Nhận định phù hợp với văn bản nguồn.' : 'The statement matches the source text.'),
    };
  }

  if (type === 'sentence_transformation') {
    return {
      ...base,
      prompt: language === 'vi'
        ? `Viết lại câu sau mà không thay đổi nghĩa, bắt đầu bằng “According to the text”: ${unit}`
        : `Rewrite without changing the meaning, beginning with “According to the text”: ${unit}`,
      answer: `According to the text, ${unit.charAt(0).toLocaleLowerCase('en')}${unit.slice(1)}`,
    };
  }

  if (type === 'verb_form') {
    return { ...base, prompt: `${replaceFirstInsensitive(unit, target)} (${target})`, answer: target };
  }

  if (type === 'sentence_combination') {
    const second = `This idea is important for ${target.toLocaleLowerCase('en')}.`;
    return {
      ...base,
      prompt: language === 'vi' ? `Kết hợp hai câu bằng “because”: ${unit} ${second}` : `Combine using “because”: ${unit} ${second}`,
      answer: `${unit.replace(/[.!?]+$/, '')} because this idea is important for ${target.toLocaleLowerCase('en')}.`,
    };
  }

  if (type === 'vocabulary_categorisation' || type === 'collocation_matching') {
    return { ...base, prompt: target, answer: unit.length > 180 ? `${unit.slice(0, 177)}…` : unit, explanation: '' };
  }

  if (type === 'dialogue_completion') {
    return {
      ...base,
      prompt: `A: What does the text say about ${target}?
B: __________`,
      answer: unit,
    };
  }

  if (type === 'short_answer') {
    return {
      ...base,
      prompt: language === 'vi' ? `Theo văn bản, ${target} có vai trò gì?` : `According to the text, what role does ${target} play?`,
      answer: unit,
    };
  }

  if (type === 'information_transfer' || type === 'graphic_organiser') {
    return {
      ...base,
      prompt: language === 'vi' ? `Hoàn thành mục “${target}” trong bảng/sơ đồ từ thông tin nguồn.` : `Complete the “${target}” entry in the organiser using the source.`,
      answer: unit,
    };
  }

  if (type === 'editing_task') {
    return {
      ...base,
      prompt: `${unit.replace(/is/i, 'are')}`,
      answer: unit,
      explanation: language === 'vi' ? 'Khôi phục cấu trúc đúng theo văn bản nguồn.' : 'Restore the accurate structure from the source.',
    };
  }

  if (type === 'reflection_exit_ticket') {
    return {
      ...base,
      prompt: language === 'vi' ? `Viết một điều em đã học về ${target} và một câu hỏi còn lại.` : `Write one thing you learned about ${target} and one remaining question.`,
      answer: language === 'vi' ? 'Câu trả lời cá nhân, cần bám nội dung nguồn.' : 'Personal response grounded in the source.',
    };
  }

  if (type === 'ordering') {
    const chunks = unit.split(/\s+/).filter(Boolean);
    const grouped = [];
    const size = Math.max(2, Math.ceil(chunks.length / 5));
    for (let cursor = 0; cursor < chunks.length; cursor += size) grouped.push(chunks.slice(cursor, cursor + size).join(' '));
    const scrambled = deterministicRotate(grouped, Math.max(1, index % Math.max(grouped.length, 1))).reverse();
    return {
      ...base,
      prompt: scrambled.map((chunk, chunkIndex) => `${String.fromCharCode(65 + chunkIndex)}. ${chunk}`).join(' / '),
      answer: grouped.join(' '),
      explanation: '',
    };
  }

  return base;
}

function buildClozeActivity(units, keywords, itemCount, language) {
  const chosen = units.slice(0, Math.max(3, Math.min(itemCount, 8)));
  const answers = [];
  const passage = chosen.map((unit, index) => {
    const keyword = pickKeyword(unit, keywords, index);
    answers.push(`${index + 1}. ${keyword}`);
    return replaceFirstInsensitive(unit, keyword, `(${index + 1}) _____`);
  }).join(' ');
  return {
    id: uid('activity'),
    type: 'cloze',
    title: defaultActivityTitle('cloze', language),
    instructions: defaultInstructions('cloze', language),
    items: [{
      id: uid('item'),
      prompt: passage,
      options: [],
      answer: answers.join('; '),
      explanation: '',
    }],
  };
}

function buildReadingActivity(source, units, keywords, itemCount, language) {
  const readingText = clip(source, 2200) || units.slice(0, 5).join(' ');
  const items = [];
  for (let index = 0; index < itemCount; index += 1) {
    const unit = units[index % units.length];
    const target = pickKeyword(unit, keywords, index);
    const options = deterministicRotate(distinctOptions(target, keywords, 4), index % 4);
    items.push({
      id: uid('item'),
      prompt: language === 'vi'
        ? `Từ nào trong văn bản hoàn thành chính xác ý sau? ${replaceFirstInsensitive(unit, target)}`
        : `Which word from the text correctly completes this idea? ${replaceFirstInsensitive(unit, target)}`,
      options,
      answer: target,
      explanation: language === 'vi'
        ? `Câu hỏi bám trực tiếp vào nội dung: “${unit}”`
        : `The question is directly grounded in: “${unit}”`,
    });
  }
  return {
    id: uid('activity'),
    type: 'reading_comprehension',
    title: defaultActivityTitle('reading_comprehension', language),
    instructions: defaultInstructions('reading_comprehension', language),
    passage: readingText,
    items,
  };
}

export function generateOfflineWorksheet({
  sourceText = '',
  title = '',
  topic = '',
  level = 'B2',
  audience = 'THPT',
  activityTypes = ['multiple_choice', 'gap_fill', 'true_false'],
  itemsPerActivity = 5,
  language = 'vi',
} = {}) {
  const fallbackText = topic || (language === 'vi'
    ? 'English learning helps students communicate confidently, develop critical thinking, and access global knowledge.'
    : 'English learning helps students communicate confidently, develop critical thinking, and access global knowledge.');
  const source = cleanSpace(sourceText || fallbackText);
  const units = splitSourceUnits(source);
  const safeUnits = units.length ? units : [fallbackText];
  const keywords = extractKeywords(source, 100);
  const safeKeywords = keywords.length >= 4 ? keywords : ['learning', 'students', 'language', 'knowledge', 'communication', 'education'];
  const count = Math.min(20, Math.max(2, Number(itemsPerActivity) || 5));
  const selected = [...new Set(activityTypes.filter((type) => TYPE_MAP.has(type)))].slice(0, 8);
  const activities = selected.map((type) => {
    if (type === 'cloze') return buildClozeActivity(safeUnits, safeKeywords, count, language);
    if (type === 'reading_comprehension') return buildReadingActivity(source, safeUnits, safeKeywords, count, language);
    return {
      id: uid('activity'),
      type,
      title: defaultActivityTitle(type, language),
      instructions: defaultInstructions(type, language),
      items: Array.from({ length: count }, (_, index) => createItem(type, safeUnits[index % safeUnits.length], deterministicRotate(safeKeywords, index), index, language)),
    };
  });

  return normalizeWorksheet({
    id: uid('worksheet'),
    title: title || topic || (language === 'vi' ? 'Phiếu học tập tiếng Anh' : 'English Worksheet'),
    subtitle: `${level} · ${audience}`,
    level,
    audience,
    topic: topic || '',
    estimatedMinutes: Math.max(15, activities.length * 7),
    teacherNotes: language === 'vi'
      ? 'Bản nháp offline được tạo từ văn bản nguồn. Nên kiểm tra lại câu hỏi trước khi sử dụng chính thức.'
      : 'This offline draft was generated from the source text. Review the items before classroom use.',
    activities,
  }, { language });
}

export function normalizeWorksheet(raw = {}, { language = 'vi' } = {}) {
  const activities = (Array.isArray(raw.activities) ? raw.activities : [])
    .map((activity, activityIndex) => {
      const type = TYPE_MAP.has(activity?.type) ? activity.type : 'multiple_choice';
      const items = (Array.isArray(activity?.items) ? activity.items : [])
        .map((item) => ({
          id: text(item?.id) || uid('item'),
          prompt: cleanSpace(item?.prompt || item?.question || ''),
          options: (Array.isArray(item?.options) ? item.options : [])
            .map((option) => cleanSpace(typeof option === 'object' ? option.text || option.label || '' : option))
            .filter(Boolean)
            .slice(0, 8),
          answer: cleanSpace(item?.answer || item?.correctAnswer || ''),
          explanation: cleanSpace(item?.explanation || item?.rationale || ''),
        }))
        .filter((item) => item.prompt)
        .slice(0, 40);
      return {
        id: text(activity?.id) || uid('activity'),
        type,
        title: cleanSpace(activity?.title) || `${activityIndex + 1}. ${defaultActivityTitle(type, language)}`,
        instructions: cleanSpace(activity?.instructions) || defaultInstructions(type, language),
        passage: cleanSpace(activity?.passage || ''),
        items,
      };
    })
    .filter((activity) => activity.items.length)
    .slice(0, 12);

  return {
    id: text(raw.id) || uid('worksheet'),
    title: cleanSpace(raw.title) || (language === 'vi' ? 'Phiếu học tập tiếng Anh' : 'English Worksheet'),
    subtitle: cleanSpace(raw.subtitle || ''),
    level: cleanSpace(raw.level || 'B2'),
    audience: cleanSpace(raw.audience || 'THPT'),
    topic: cleanSpace(raw.topic || ''),
    estimatedMinutes: Math.min(180, Math.max(5, Number(raw.estimatedMinutes) || activities.length * 8 || 30)),
    teacherNotes: cleanSpace(raw.teacherNotes || ''),
    createdAt: raw.createdAt || new Date().toISOString(),
    activities,
  };
}

function contentTokens(value = '') {
  return new Set(normalizeForCompare(value).split(' ').filter((token) => token.length >= 4 && !STOPWORDS.has(token)));
}

function jaccard(a, b) {
  if (!a.size || !b.size) return 0;
  let intersection = 0;
  for (const token of a) if (b.has(token)) intersection += 1;
  return intersection / (a.size + b.size - intersection);
}

export function auditWorksheet(worksheet) {
  const normalized = normalizeWorksheet(worksheet);
  const allItems = normalized.activities.flatMap((activity) => activity.items.map((item) => ({ ...item, type: activity.type, activityTitle: activity.title })));
  const exactDuplicates = [];
  const nearDuplicates = [];
  const missingAnswers = [];
  const invalidOptions = [];
  const seen = new Map();
  const tokenRows = [];

  allItems.forEach((item, index) => {
    const key = normalizeForCompare(item.prompt);
    if (key && seen.has(key)) exactDuplicates.push([seen.get(key) + 1, index + 1]);
    else if (key) seen.set(key, index);

    if (!item.answer) missingAnswers.push(index + 1);
    if (['multiple_choice', 'vocabulary_context', 'reading_comprehension'].includes(item.type)) {
      const uniqueOptions = new Set(item.options.map(normalizeForCompare).filter(Boolean));
      const answerKey = normalizeForCompare(item.answer);
      if (item.options.length < 4 || uniqueOptions.size !== item.options.length || (answerKey && !uniqueOptions.has(answerKey))) invalidOptions.push(index + 1);
    }

    tokenRows.push({ index, tokens: contentTokens(item.prompt) });
  });

  for (let a = 0; a < tokenRows.length; a += 1) {
    for (let b = a + 1; b < tokenRows.length; b += 1) {
      const score = jaccard(tokenRows[a].tokens, tokenRows[b].tokens);
      if (score >= 0.82 && tokenRows[a].tokens.size >= 4 && tokenRows[b].tokens.size >= 4) nearDuplicates.push([a + 1, b + 1, Number(score.toFixed(2))]);
      if (nearDuplicates.length >= 25) break;
    }
    if (nearDuplicates.length >= 25) break;
  }

  const total = allItems.length;
  const penalty = exactDuplicates.length * 8 + nearDuplicates.length * 3 + missingAnswers.length * 8 + invalidOptions.length * 5;
  const score = Math.max(0, Math.min(100, 100 - penalty));
  return {
    score,
    totalItems: total,
    activityCount: normalized.activities.length,
    exactDuplicates,
    nearDuplicates,
    missingAnswers,
    invalidOptions,
    passed: score >= 85 && !missingAnswers.length && !invalidOptions.length,
  };
}

export function buildWorksheetPrompt({
  sourceText = '',
  sourceName = '',
  title = '',
  topic = '',
  level = 'B2',
  audience = 'THPT',
  activityTypes = [],
  itemsPerActivity = 8,
  language = 'vi',
  includeExplanations = true,
  avoidRepeatedContentWords = true,
  customInstruction = '',
} = {}) {
  const selectedTypes = activityTypes.filter((type) => TYPE_MAP.has(type));
  const typeDetails = selectedTypes.map((type) => {
    const item = TYPE_MAP.get(type);
    return `- ${type}: ${item?.label || type}`;
  }).join('\n');

  return `You are Worksheet Factory inside Brian English Studio. Create a complete, classroom-ready English worksheet from the teacher's source material.

TEACHER SETTINGS
- Worksheet title: ${title || '(AI should create a concise title)'}
- Topic: ${topic || '(infer from source)'}
- Learner level: ${level}
- Audience: ${audience}
- Interface language: ${language === 'vi' ? 'Vietnamese' : 'English'}
- Items per activity: ${Math.min(20, Math.max(2, Number(itemsPerActivity) || 8))}
- Include concise explanations: ${includeExplanations ? 'yes' : 'no'}
- Avoid repeated content words and sentence frames: ${avoidRepeatedContentWords ? 'strictly yes' : 'preferred'}
- Source name: ${sourceName || '(pasted text)'}
- Additional teacher instruction: ${customInstruction || '(none)'}

REQUIRED ACTIVITY TYPES
${typeDetails || '- multiple_choice\n- gap_fill\n- reading_comprehension'}

SOURCE MATERIAL
${clip(sourceText || topic || 'General English learning content', 30000)}

QUALITY RULES
1. Generate exactly one activity for each requested activity type and approximately the requested number of items per activity.
2. Every answer must be correct, unambiguous and supported by the source or by standard English usage.
3. Avoid duplicate questions, duplicated sentence frames, repeated answers and repeated content words across items whenever possible.
4. For multiple_choice, vocabulary_context and reading_comprehension, provide exactly four distinct options and make the answer text exactly match one option.
5. For true_false, use options ["True", "False"] and answer exactly "True" or "False".
6. For matching, each item prompt is the left item and answer is its matching right item.
7. For cloze, include the connected text in the activity passage or item prompt and number all gaps.
8. For word_formation, include the base word in brackets and answer with the correct derived form.
9. For error_correction, the prompt must contain a genuine error and the answer must be the fully corrected sentence.
10. For sentence_transformation, the prompt must specify the cue word or required beginning; answer with a complete rewritten sentence.
11. Keep student-facing English natural and level-appropriate. Vietnamese may be used only for instructions or teacher notes when the interface language is Vietnamese.
12. Do not include markdown or code fences.

Return STRICT JSON only with this exact structure:
{
  "title": "worksheet title",
  "subtitle": "short topic and level line",
  "level": "${level}",
  "audience": "${audience}",
  "topic": "topic",
  "estimatedMinutes": 45,
  "teacherNotes": "short practical notes",
  "activities": [
    {
      "type": "one requested type id",
      "title": "activity title",
      "instructions": "clear student instruction",
      "passage": "optional reading or cloze passage, otherwise empty string",
      "items": [
        {
          "prompt": "question or task",
          "options": ["A option", "B option", "C option", "D option"],
          "answer": "exact answer",
          "explanation": "${includeExplanations ? 'concise explanation' : ''}"
        }
      ]
    }
  ]
}`;
}

export function shuffleWorksheet(worksheet) {
  const shuffle = (input) => {
    const array = [...input];
    for (let index = array.length - 1; index > 0; index -= 1) {
      const swap = Math.floor(Math.random() * (index + 1));
      [array[index], array[swap]] = [array[swap], array[index]];
    }
    return array;
  };
  return {
    ...worksheet,
    activities: worksheet.activities.map((activity) => ({
      ...activity,
      items: shuffle(activity.items).map((item) => {
        if (!['multiple_choice', 'vocabulary_context', 'reading_comprehension'].includes(activity.type)) return item;
        return { ...item, options: shuffle(item.options) };
      }),
    })),
  };
}

function renderOptions(options = []) {
  if (!options.length) return '';
  return `<ol class="options" type="A">${options.map((option) => `<li>${escapeHtml(option)}</li>`).join('')}</ol>`;
}

export function worksheetToHtml(worksheet, { teacherVersion = false, language = 'vi', standalone = true } = {}) {
  const data = normalizeWorksheet(worksheet, { language });
  const answerLabel = language === 'vi' ? 'Đáp án' : 'Answer';
  const explanationLabel = language === 'vi' ? 'Giải thích' : 'Explanation';
  const body = `
    <main class="worksheet">
      <header>
        <div class="brand">BRIAN ENGLISH · WORKSHEET FACTORY</div>
        <h1>${escapeHtml(data.title)}</h1>
        <p class="subtitle">${escapeHtml(data.subtitle || `${data.level} · ${data.audience}`)}</p>
        <div class="student-line"><span>${language === 'vi' ? 'Họ và tên' : 'Name'}: ______________________________</span><span>${language === 'vi' ? 'Lớp' : 'Class'}: __________</span><span>${language === 'vi' ? 'Ngày' : 'Date'}: __________</span></div>
      </header>
      ${data.activities.map((activity, activityIndex) => `
        <section class="activity">
          <h2>${activityIndex + 1}. ${escapeHtml(activity.title)}</h2>
          <p class="instructions">${escapeHtml(activity.instructions)}</p>
          ${activity.passage ? `<div class="passage">${escapeHtml(activity.passage).replace(/\n/g, '<br>')}</div>` : ''}
          <ol class="items">
            ${activity.items.map((item) => `
              <li>
                <div class="prompt">${escapeHtml(item.prompt).replace(/\n/g, '<br>')}</div>
                ${renderOptions(item.options)}
                ${teacherVersion ? `<div class="answer"><strong>${answerLabel}:</strong> ${escapeHtml(item.answer || '—')}</div>${item.explanation ? `<div class="explanation"><strong>${explanationLabel}:</strong> ${escapeHtml(item.explanation)}</div>` : ''}` : '<div class="response-space"></div>'}
              </li>
            `).join('')}
          </ol>
        </section>
      `).join('')}
      ${teacherVersion && data.teacherNotes ? `<section class="teacher-notes"><h2>${language === 'vi' ? 'Ghi chú giáo viên' : 'Teacher notes'}</h2><p>${escapeHtml(data.teacherNotes)}</p></section>` : ''}
    </main>`;

  if (!standalone) return body;
  return `<!doctype html><html lang="${language === 'vi' ? 'vi' : 'en'}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(data.title)}</title><style>
    *{box-sizing:border-box}body{margin:0;background:#f4f1ec;color:#172019;font-family:Arial,sans-serif}.worksheet{width:min(100%,900px);margin:28px auto;background:#fff;padding:42px 52px;box-shadow:0 16px 50px rgba(20,30,24,.12)}header{border-bottom:3px solid #172019;padding-bottom:22px;margin-bottom:26px}.brand{font-size:10px;letter-spacing:.16em;font-weight:700;color:#b43a59}h1{font-size:34px;margin:8px 0}.subtitle{font-size:15px;color:#59645c}.student-line{display:flex;gap:22px;flex-wrap:wrap;margin-top:22px;font-size:13px}.activity{margin:30px 0;break-inside:avoid}.activity h2{font-size:21px;margin:0 0 8px}.instructions{font-style:italic;color:#59645c}.passage{background:#f8f5ef;border-left:4px solid #d64e70;padding:18px;line-height:1.7;white-space:normal}.items{padding-left:25px}.items>li{padding:7px 0 13px;line-height:1.55;break-inside:avoid}.prompt{font-weight:600}.options{margin:8px 0 0;padding-left:28px}.options li{padding:2px 0}.response-space{min-height:18px;border-bottom:1px dotted #b9b9b9;margin-top:12px}.answer,.explanation{margin-top:8px;padding:8px 10px;background:#fff0f4;border-left:3px solid #d64e70}.explanation{background:#f5f7f5;border-color:#7aa284}.teacher-notes{border-top:2px solid #172019;padding-top:16px;margin-top:32px}@page{size:A4;margin:14mm}@media print{body{background:#fff}.worksheet{width:auto;margin:0;box-shadow:none;padding:0}}
  </style></head><body>${body}</body></html>`;
}

export function worksheetToPlainText(worksheet, { teacherVersion = true, language = 'vi' } = {}) {
  const data = normalizeWorksheet(worksheet, { language });
  const lines = [data.title, data.subtitle || `${data.level} · ${data.audience}`, ''];
  data.activities.forEach((activity, activityIndex) => {
    lines.push(`${activityIndex + 1}. ${activity.title}`);
    lines.push(activity.instructions);
    if (activity.passage) lines.push('', activity.passage, '');
    activity.items.forEach((item, itemIndex) => {
      lines.push(`${itemIndex + 1}. ${item.prompt}`);
      item.options.forEach((option, optionIndex) => lines.push(`${String.fromCharCode(65 + optionIndex)}. ${option}`));
      if (teacherVersion) {
        lines.push(`${language === 'vi' ? 'Đáp án' : 'Answer'}: ${item.answer || '—'}`);
        if (item.explanation) lines.push(`${language === 'vi' ? 'Giải thích' : 'Explanation'}: ${item.explanation}`);
      }
      lines.push('');
    });
  });
  if (teacherVersion && data.teacherNotes) lines.push(language === 'vi' ? 'GHI CHÚ GIÁO VIÊN' : 'TEACHER NOTES', data.teacherNotes);
  return lines.join('\n').trim();
}

function docxParagraph(content, style = '', options = {}) {
  const preserve = /\s{2,}|^\s|\s$/.test(content) ? ' xml:space="preserve"' : '';
  const styleXml = style ? `<w:pStyle w:val="${style}"/>` : '';
  const before = options.before ? `<w:spacing w:before="${options.before}"/>` : '';
  const bold = options.bold ? '<w:b/>' : '';
  const italic = options.italic ? '<w:i/>' : '';
  const size = options.size ? `<w:sz w:val="${options.size}"/><w:szCs w:val="${options.size}"/>` : '';
  return `<w:p><w:pPr>${styleXml}${before}</w:pPr><w:r><w:rPr>${bold}${italic}${size}<w:rFonts w:ascii="Arial" w:hAnsi="Arial"/></w:rPr><w:t${preserve}>${xmlEscape(content)}</w:t></w:r></w:p>`;
}

function docxAnswerParagraph(label, content) {
  return `<w:p><w:pPr><w:shd w:fill="FCE8EE"/><w:spacing w:before="80" w:after="80"/></w:pPr><w:r><w:rPr><w:b/><w:color w:val="9B2748"/><w:rFonts w:ascii="Arial" w:hAnsi="Arial"/></w:rPr><w:t>${xmlEscape(label)}: </w:t></w:r><w:r><w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial"/></w:rPr><w:t>${xmlEscape(content || '—')}</w:t></w:r></w:p>`;
}

export async function worksheetToDocxBlob(worksheet, { teacherVersion = false, language = 'vi' } = {}) {
  const data = normalizeWorksheet(worksheet, { language });
  const { default: JSZip } = await import('jszip');
  const zip = new JSZip();
  const paragraphs = [];
  paragraphs.push(docxParagraph('BRIAN ENGLISH · WORKSHEET FACTORY', '', { bold: true, size: 18 }));
  paragraphs.push(docxParagraph(data.title, 'Title'));
  paragraphs.push(docxParagraph(data.subtitle || `${data.level} · ${data.audience}`, 'Subtitle'));
  paragraphs.push(docxParagraph(`${language === 'vi' ? 'Họ và tên' : 'Name'}: ______________________________    ${language === 'vi' ? 'Lớp' : 'Class'}: __________    ${language === 'vi' ? 'Ngày' : 'Date'}: __________`, '', { before: 180 }));

  data.activities.forEach((activity, activityIndex) => {
    paragraphs.push(docxParagraph(`${activityIndex + 1}. ${activity.title}`, 'Heading1', { before: 220 }));
    paragraphs.push(docxParagraph(activity.instructions, '', { italic: true }));
    if (activity.passage) paragraphs.push(docxParagraph(activity.passage, 'Quote'));
    activity.items.forEach((item, itemIndex) => {
      paragraphs.push(docxParagraph(`${itemIndex + 1}. ${item.prompt}`, '', { bold: true, before: 120 }));
      item.options.forEach((option, optionIndex) => paragraphs.push(docxParagraph(`${String.fromCharCode(65 + optionIndex)}. ${option}`)));
      if (teacherVersion) {
        paragraphs.push(docxAnswerParagraph(language === 'vi' ? 'Đáp án' : 'Answer', item.answer));
        if (item.explanation) paragraphs.push(docxParagraph(`${language === 'vi' ? 'Giải thích' : 'Explanation'}: ${item.explanation}`, '', { italic: true }));
      } else {
        paragraphs.push(docxParagraph('________________________________________________________________________________'));
      }
    });
  });
  if (teacherVersion && data.teacherNotes) {
    paragraphs.push(docxParagraph(language === 'vi' ? 'Ghi chú giáo viên' : 'Teacher notes', 'Heading1', { before: 220 }));
    paragraphs.push(docxParagraph(data.teacherNotes));
  }

  const documentXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>${paragraphs.join('')}<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1134" w:right="1134" w:bottom="1134" w:left="1134" w:header="708" w:footer="708" w:gutter="0"/></w:sectPr></w:body></w:document>`;
  const stylesXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
<w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial"/><w:sz w:val="22"/><w:szCs w:val="22"/></w:rPr></w:rPrDefault><w:pPrDefault><w:pPr><w:spacing w:after="100" w:line="300" w:lineRule="auto"/></w:pPr></w:pPrDefault></w:docDefaults>
<w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/></w:style>
<w:style w:type="paragraph" w:styleId="Title"><w:name w:val="Title"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/><w:qFormat/><w:rPr><w:b/><w:sz w:val="34"/><w:szCs w:val="34"/><w:color w:val="172019"/></w:rPr></w:style>
<w:style w:type="paragraph" w:styleId="Subtitle"><w:name w:val="Subtitle"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/><w:qFormat/><w:rPr><w:i/><w:color w:val="59645C"/><w:sz w:val="22"/></w:rPr></w:style>
<w:style w:type="paragraph" w:styleId="Heading1"><w:name w:val="heading 1"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/><w:qFormat/><w:rPr><w:b/><w:color w:val="9B2748"/><w:sz w:val="28"/></w:rPr></w:style>
<w:style w:type="paragraph" w:styleId="Quote"><w:name w:val="Quote"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/><w:qFormat/><w:pPr><w:ind w:left="420" w:right="420"/><w:shd w:fill="F7F4EF"/></w:pPr><w:rPr><w:color w:val="343B36"/></w:rPr></w:style>
</w:styles>`;

  zip.file('[Content_Types].xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/><Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/><Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/></Types>`);
  zip.folder('_rels').file('.rels', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/><Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/></Relationships>`);
  zip.folder('word').file('document.xml', documentXml);
  zip.folder('word').file('styles.xml', stylesXml);
  zip.folder('word').folder('_rels').file('document.xml.rels', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`);
  zip.folder('docProps').file('core.xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:dcmitype="http://purl.org/dc/dcmitype/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"><dc:title>${xmlEscape(data.title)}</dc:title><dc:creator>Brian English Studio</dc:creator><cp:lastModifiedBy>Worksheet Factory</cp:lastModifiedBy><dcterms:created xsi:type="dcterms:W3CDTF">${new Date().toISOString()}</dcterms:created><dcterms:modified xsi:type="dcterms:W3CDTF">${new Date().toISOString()}</dcterms:modified></cp:coreProperties>`);
  zip.folder('docProps').file('app.xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties" xmlns:vt="http://schemas.openxmlformats.org/officeDocument/2006/docPropsVTypes"><Application>Brian English Studio Worksheet Factory</Application></Properties>`);
  return zip.generateAsync({ type: 'blob', mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', compression: 'DEFLATE' });
}

export function worksheetMcqBankItems(worksheet, { level = 'B2', source = 'Worksheet Factory' } = {}) {
  const data = normalizeWorksheet(worksheet);
  return data.activities.flatMap((activity) => {
    if (!['multiple_choice', 'vocabulary_context', 'reading_comprehension', 'true_false'].includes(activity.type)) return [];
    return activity.items.filter((item) => item.options.length >= 2).map((item) => {
      const options = item.options.slice(0, 4);
      const answerIndex = options.findIndex((option) => normalizeForCompare(option) === normalizeForCompare(item.answer));
      return {
        type: 'mcq',
        level,
        topic: data.topic || data.title,
        source,
        sourceApp: 'worksheet-factory',
        question: item.prompt,
        options,
        answer: answerIndex >= 0 ? String.fromCharCode(65 + answerIndex) : item.answer,
        explanation: item.explanation,
      };
    });
  });
}
