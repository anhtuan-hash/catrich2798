const STORAGE = {
  'top-five-arena': 'brian-top-five-arena-v2',
  'flying-words': 'brian-flying-words-draft-v1',
  'crossword-trial': 'brian-crossword-trial-v1',
  'knowledge-train': 'brian-knowledge-train-draft-v1',
  'word-orbit': 'brian-word-orbit-draft-v1',
};

function readStored(key, fallback = {}) {
  try {
    const parsed = JSON.parse(localStorage.getItem(key) || 'null');
    return parsed && typeof parsed === 'object' ? parsed : fallback;
  } catch {
    return fallback;
  }
}

function text(value, fallback = '') {
  const normalized = String(value ?? '').trim();
  return normalized || fallback;
}

function list(value) {
  return Array.isArray(value) ? value.filter(Boolean) : [];
}

function uid(prefix, index) {
  return `${prefix}-${Date.now().toString(36)}-${index}-${Math.random().toString(36).slice(2, 7)}`;
}

function normalizeCrossword(value) {
  return String(value || '')
    .trim()
    .toUpperCase()
    .replace(/Đ/g, 'D')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, 12);
}

function nativeSetter(element, value) {
  if (!element) return false;
  const prototype = element instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
  const setter = Object.getOwnPropertyDescriptor(prototype, 'value')?.set;
  if (!setter) return false;
  setter.call(element, value);
  element.dispatchEvent(new Event('input', { bubbles: true }));
  element.dispatchEvent(new Event('change', { bubbles: true }));
  return true;
}

function adaptTopFive(data) {
  const key = STORAGE['top-five-arena'];
  const current = readStored(key, {});
  const rounds = list(data?.rounds).slice(0, 30).map((round, roundIndex) => {
    const answers = list(round?.answers).slice(0, 5);
    while (answers.length < 5) answers.push({ text: `Đáp án ${answers.length + 1}`, points: [10, 7, 5, 3, 2][answers.length] });
    return {
      id: uid('round-ai', roundIndex),
      question: text(round?.question, `Câu hỏi ${roundIndex + 1}`),
      explanation: text(round?.explanation),
      multiplier: 1,
      answers: answers.map((answer, answerIndex) => {
        const answerText = text(answer?.text, `Đáp án ${answerIndex + 1}`);
        return {
          text: answerText,
          points: Math.max(0, Math.min(999, Number(answer?.points) || [10, 7, 5, 3, 2][answerIndex])),
          aliases: list(answer?.aliases).length ? list(answer.aliases).map(String) : [answerText],
        };
      }),
    };
  });
  if (!rounds.length) throw new Error('AI chưa tạo được vòng chơi hợp lệ.');
  return {
    key,
    value: {
      ...current,
      title: text(data?.title, current.title || 'Brian Top 5 Arena'),
      subtitle: text(data?.subtitle, current.subtitle || 'Đoán 5 đáp án hàng đầu'),
      rounds,
    },
  };
}

function adaptFlyingWords(data) {
  const key = STORAGE['flying-words'];
  const current = readStored(key, {});
  const sentences = list(data?.items)
    .map((item) => text(item?.sentence || (list(item?.words).length ? item.words.join(' ') : item?.answer)))
    .filter(Boolean)
    .join('\n');
  if (!sentences) throw new Error('AI chưa tạo được câu hợp lệ cho Từ Ngữ Biết Bay.');
  return {
    key,
    value: {
      ...current,
      title: text(data?.title, current.title || 'Từ Ngữ Biết Bay'),
      subtitle: text(data?.subtitle, current.subtitle || 'Bắn chạm để sắp xếp câu'),
      sentences,
      seconds: Number(current.seconds) || 30,
      speed: Number(current.speed) || 1,
      wrongPenalty: Number(current.wrongPenalty) || 3,
      autoAdvance: Boolean(current.autoAdvance),
      sound: current.sound !== false,
    },
  };
}

function adaptCrossword(data) {
  const key = STORAGE['crossword-trial'];
  const current = readStored(key, {});
  const items = list(data?.items).slice(0, 12).map((item) => ({
    clue: text(item?.clue),
    answer: normalizeCrossword(item?.answer),
    hint: text(item?.hint || item?.category),
  })).filter((item) => item.clue && item.answer);
  if (items.length < 3) throw new Error('Ô chữ cần ít nhất 3 câu hỏi hợp lệ.');

  const requestedKeyword = normalizeCrossword(data?.keyword);
  const keywordLetters = items.map((item, index) => {
    const requested = requestedKeyword[index];
    return requested && item.answer.includes(requested) ? requested : item.answer[0];
  });
  const keyword = keywordLetters.join('');
  const rows = items.map((item) => ({ ...item, answer: item.answer.slice(0, 12) }));
  return {
    key,
    value: {
      ...current,
      title: text(data?.title, current.title || 'Ô CHỮ BÀN THỬ'),
      subtitle: text(data?.subtitle, current.subtitle || 'Khám phá từ khóa qua các câu hỏi hàng ngang'),
      keyword,
      keywordColumn: 5,
      duration: Number(current.duration) || 600,
      rows,
    },
  };
}

function adaptKnowledgeTrain(data) {
  const key = STORAGE['knowledge-train'];
  const current = readStored(key, {});
  const items = list(data?.items).slice(0, 14).map((item) => ({
    question: text(item?.question),
    answer: text(item?.answer),
    visual: text(item?.link || item?.visual),
  })).filter((item) => item.question && item.answer);
  if (items.length < 2) throw new Error('Đoàn Tàu Tri Thức cần ít nhất 2 cặp câu hỏi–đáp án.');
  const cars = items.map((item, index) => {
    const next = items[index + 1];
    return {
      id: uid('car-ai', index),
      leftLabel: item.answer,
      question: next?.question || '',
      nextAnswer: next?.answer || '',
      visualType: item.visual ? 'image' : 'none',
      visual: item.visual,
      order: index,
    };
  });
  return {
    key,
    value: {
      ...current,
      title: text(data?.title, current.title || 'Đoàn Tàu Tri Thức'),
      subtitle: text(data?.subtitle, current.subtitle || 'Nối chuỗi câu hỏi và đáp án'),
      starterQuestion: items[0].question,
      starterAnswer: items[0].answer,
      cars,
      settings: current.settings || {
        shuffle: true,
        penaltyPerCheck: 5,
        timeLimit: 0,
        showWrong: true,
        celebration: true,
      },
    },
  };
}

function adaptWordOrbit(data) {
  const key = STORAGE['word-orbit'];
  const current = readStored(key, {});
  const words = list(data?.items).slice(0, 30).map((item, index) => ({
    id: uid('wo-ai', index),
    word: text(item?.prompt || item?.word),
    meaning: text(item?.answer || item?.meaning),
    distractors: list(item?.distractors).slice(0, 3).map(String),
    example: text(item?.explanation || item?.example),
  })).filter((item) => item.word && item.meaning);
  if (words.length < 2) throw new Error('Word Orbit cần ít nhất 2 mục từ hợp lệ.');
  return {
    key,
    value: {
      ...current,
      title: text(data?.title, current.title || 'Word Orbit'),
      subtitle: text(data?.subtitle, current.subtitle || 'Đưa từ vào đúng trạm nghĩa'),
      theme: text(data?.theme, current.theme || 'AI lesson'),
      words,
      settings: current.settings || { timePerRound: 18, shuffle: true, sound: true },
    },
  };
}

function applyDomino(data) {
  const items = list(data?.items).map((item) => {
    const left = text(item?.left);
    const right = text(item?.right || item?.answer);
    return left && right ? `${left} | ${right}` : '';
  }).filter(Boolean);
  if (items.length < 2) throw new Error('Domino cần ít nhất 2 tile hợp lệ.');
  const root = document.querySelector('.domino-page');
  const textarea = root?.querySelector('textarea');
  if (!textarea || !nativeSetter(textarea, items.join('\n'))) throw new Error('Không tìm thấy vùng nhập dữ liệu Domino.');
  const titleInput = root?.querySelector('.builder-panel input[type="text"], .builder-panel input:not([type])');
  if (titleInput && data?.title) nativeSetter(titleInput, text(data.title));
  window.setTimeout(() => {
    const newGameButton = [...(root?.querySelectorAll('button.primary') || [])]
      .find((button) => /tạo ván|new game/i.test(button.textContent || ''));
    newGameButton?.click();
  }, 80);
  return { remount: false, appliedCount: items.length };
}

function classroomLines(slug, data) {
  const rows = [];
  const push = (category, points, question, answer) => {
    const q = text(question);
    const a = text(answer);
    if (!q || !a) return;
    rows.push(`${text(category, 'General')} | ${Number(points) || 100} | ${q} | ${a} | — | — | — | A`);
  };
  if (slug === 'jeopardy-builder') {
    list(data?.categories).forEach((category) => list(category?.questions).forEach((item) => push(category?.name, item?.points, item?.question, item?.answer)));
  } else if (slug === 'open-the-box') {
    list(data?.boxes).forEach((item, index) => push(item?.label || `Box ${index + 1}`, 100, item?.question, item?.answer));
  } else if (slug === 'matching-battle') {
    list(data?.pairs).forEach((item, index) => push('Matching', 100 + (index % 5) * 100, `Match “${text(item?.left)}” with the correct answer.`, item?.right));
  } else {
    list(data?.items).forEach((item, index) => push(item?.label || item?.difficulty || 'General', 100 + (index % 5) * 100, item?.question, item?.answer));
  }
  return rows;
}

function applyClassroom(slug, data) {
  const lines = classroomLines(slug, data);
  if (!lines.length) throw new Error('AI chưa tạo được thẻ câu hỏi hợp lệ.');
  const root = document.querySelector('.classroom-game-page');
  const textarea = root?.querySelector('textarea');
  if (!textarea || !nativeSetter(textarea, lines.join('\n'))) throw new Error('Không tìm thấy vùng dữ liệu game lớp học.');
  return { remount: false, appliedCount: lines.length };
}

export function applyGeneratedGameContent(slug, data) {
  if (!data || typeof data !== 'object') throw new Error('Dữ liệu AI không hợp lệ.');

  if (slug === 'domino-wordform') return applyDomino(data);
  if (['jeopardy-builder', 'open-the-box', 'team-race', 'lucky-wheel', 'matching-battle'].includes(slug)) {
    return applyClassroom(slug, data);
  }

  const adapters = {
    'top-five-arena': adaptTopFive,
    'flying-words': adaptFlyingWords,
    'crossword-trial': adaptCrossword,
    'knowledge-train': adaptKnowledgeTrain,
    'word-orbit': adaptWordOrbit,
  };
  const adapter = adapters[slug];
  if (!adapter) throw new Error('Trò chơi này chưa có bộ nhận dữ liệu AI trực tiếp.');
  const adapted = adapter(data);
  localStorage.setItem(adapted.key, JSON.stringify(adapted.value));
  return {
    remount: true,
    appliedCount: adapted.value.rounds?.length || adapted.value.words?.length || adapted.value.rows?.length || adapted.value.cars?.length || String(adapted.value.sentences || '').split('\n').filter(Boolean).length || 0,
  };
}
