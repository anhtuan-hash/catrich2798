const CATEGORY_LABELS = {
  check: 'Kiểm tra',
  vocabulary: 'Từ vựng',
  structure: 'Câu & đoạn',
  reading: 'Đọc hiểu',
  speaking: 'Nói & viết',
  game: 'Trò chơi',
};

const FAMILY_PRESETS = {
  quiz: {
    syntax: 'Mỗi dòng: Câu hỏi | Đáp án A | Đáp án B | Đáp án C | Đáp án D | A/B/C/D | Giải thích',
    blank: 'TITLE: Tên hoạt động\n\nCâu hỏi 1 | Đáp án A | Đáp án B | Đáp án C | Đáp án D | A | Giải thích\nCâu hỏi 2 | Đáp án A | Đáp án B | Đáp án C | Đáp án D | C | Giải thích',
    example: 'TITLE: Healthy Habits Quiz\n\nWhich habit supports better sleep? | Exercising regularly | Drinking coffee late | Using a phone in bed | Skipping dinner | A | Regular physical activity can improve sleep quality.\nWhich drink is usually the best everyday choice? | Energy drink | Water | Sugary soda | Strong coffee | B | Water supports hydration without added sugar.',
  },
  boolean: {
    syntax: 'Mỗi dòng: Nhận định | TRUE/FALSE | Nội dung sửa hoặc giải thích',
    blank: 'TITLE: Tên hoạt động\n\nNhận định 1 | TRUE | Giải thích\nNhận định 2 | FALSE | Câu sửa đúng',
    example: 'TITLE: Healthy Habits\n\nRegular physical activity can improve sleep quality. | TRUE | Physical activity can support sleep quality.\nSkipping breakfast always improves concentration. | FALSE | A balanced breakfast can support concentration for many learners.',
  },
  pairs: {
    syntax: 'Mỗi dòng: Nội dung bên trái | Nội dung tương ứng bên phải',
    blank: 'TITLE: Tên hoạt động\n\nMục 1 | Cặp tương ứng 1\nMục 2 | Cặp tương ứng 2\nMục 3 | Cặp tương ứng 3',
    example: 'TITLE: Environmental Vocabulary\n\nrenewable energy | energy from sources that can naturally be replaced\ncarbon footprint | the greenhouse gases produced by a person or activity\nbiodiversity | the variety of living things in an ecosystem\nconservation | the protection of nature and resources',
  },
  memory: {
    syntax: 'Mỗi dòng: Mặt thẻ 1 | Mặt thẻ 2',
    blank: 'TITLE: Tên hoạt động\n\nThẻ A1 | Thẻ A2\nThẻ B1 | Thẻ B2\nThẻ C1 | Thẻ C2',
    example: 'TITLE: Verb Forms Memory\n\ngo | went\nsee | saw\nwrite | wrote\nchoose | chose\nbuild | built\nteach | taught',
  },
  sort: {
    syntax: 'Mỗi dòng: Tên nhóm :: mục 1; mục 2; mục 3',
    blank: 'TITLE: Tên hoạt động\n\nNhóm 1 :: mục A; mục B; mục C\nNhóm 2 :: mục D; mục E; mục F',
    example: 'TITLE: Personality Traits\n\nPositive traits :: reliable; considerate; determined; patient\nNegative traits :: arrogant; dishonest; impatient; careless\nNeutral traits :: quiet; reserved; competitive; cautious',
  },
  order: {
    syntax: 'Mỗi dòng là một mục theo thứ tự đúng. Ứng dụng sẽ tự xáo trộn.',
    blank: 'TITLE: Tên hoạt động\n\nBước hoặc câu thứ nhất\nBước hoặc câu thứ hai\nBước hoặc câu thứ ba\nBước hoặc câu thứ tư',
    example: 'TITLE: Writing a Paragraph\n\nWrite a clear topic sentence.\nExplain the main idea.\nProvide a relevant example.\nConnect the example to the main idea.\nEnd with a concluding sentence.',
  },
  cloze: {
    syntax: 'Đặt đáp án trong [[ngoặc kép vuông]]. Mỗi dòng có thể là một câu hoặc đoạn.',
    blank: 'TITLE: Tên hoạt động\n\nCâu có [[đáp án 1]] cần điền.\nCâu tiếp theo có [[đáp án 2]] cần điền.',
    example: 'TITLE: Climate Action Cloze\n\nMany cities are investing in [[public transport]] to reduce traffic congestion.\nHouseholds can lower energy use by choosing [[efficient appliances]].\nPlanting trees can help absorb [[carbon dioxide]] from the atmosphere.',
  },
  wordlist: {
    syntax: 'Mỗi dòng là một từ. Có thể thêm gợi ý sau dấu |.',
    blank: 'TITLE: Tên hoạt động\n\nword one | clue one\nword two | clue two\nword three | clue three',
    example: 'TITLE: School Vocabulary\n\nassignment | work given by a teacher\ncurriculum | subjects taught in a course\nscholarship | financial support for study\nlaboratory | a room for scientific work\nattendance | being present at school',
  },
  bingo: {
    syntax: 'Mỗi dòng: Từ hoặc cụm từ | Gợi ý để giáo viên gọi',
    blank: 'TITLE: Tên hoạt động\n\nMục 1 | Gợi ý 1\nMục 2 | Gợi ý 2\nMục 3 | Gợi ý 3',
    example: 'TITLE: Academic Vocabulary Bingo\n\nevidence | information that supports a claim\ncontrast | show differences\nconsequence | a result of an action\nreliable | able to be trusted\ninterpret | explain the meaning of something\nassess | evaluate quality or performance\ntrend | a general direction of change\nfactor | something that influences a result\nvalid | logically or factually sound',
  },
  random: {
    syntax: 'Mỗi dòng là một câu hỏi, nhiệm vụ, thẻ hoặc mục ngẫu nhiên.',
    blank: 'TITLE: Tên hoạt động\n\nNhiệm vụ hoặc câu hỏi 1\nNhiệm vụ hoặc câu hỏi 2\nNhiệm vụ hoặc câu hỏi 3',
    example: 'TITLE: Speaking Prompts\n\nDescribe one habit that helps you learn effectively.\nExplain how technology can support classroom learning.\nGive one advantage and one disadvantage of studying online.\nDescribe a person who has influenced your education.\nSuggest one way to make your school more environmentally friendly.',
  },
  writing: {
    syntax: 'Dòng đầu có thể là chủ đề. Các dòng sau là tiêu chí hoặc gợi ý viết.',
    blank: 'TITLE: Tên hoạt động\n\nĐề bài hoặc chủ đề\nTiêu chí 1\nTiêu chí 2\nTiêu chí 3',
    example: 'TITLE: Summary Builder\n\nSummarise the text in 80–100 words.\nInclude the central idea.\nMention two important supporting details.\nUse your own words.\nAvoid adding personal opinions.',
  },
  conveyor: {
    syntax: 'Mỗi dòng: Mục cần ghi nhớ | Câu hỏi kiểm tra sau khi quan sát',
    blank: 'TITLE: Tên hoạt động\n\nMục 1 | Câu hỏi về mục 1\nMục 2 | Câu hỏi về mục 2',
    example: 'TITLE: Quick Recall\n\nsolar panels | Which item converts sunlight into electricity?\nwind turbines | Which item uses moving air to generate power?\nhydroelectric dam | Which item uses flowing water?\ngeothermal plant | Which item uses heat from beneath the Earth?',
  },
};

const RAW_TEMPLATES = [
  ['quiz-show', 'Quiz Show', 'Trắc nghiệm trực tiếp', 'check', 'quiz', '❓', 'Câu hỏi nhiều lựa chọn có chấm điểm và giải thích.'],
  ['true-false', 'True / False', 'Đúng hoặc sai', 'check', 'boolean', '🔎', 'Kiểm tra nhận định đúng hoặc sai và hiện phần sửa.'],
  ['match-up', 'Match Up', 'Nối thuật ngữ', 'vocabulary', 'pairs', '🔗', 'Nối hai nội dung tương ứng bằng thao tác chọn.'],
  ['matching-pairs', 'Matching Pairs', 'Ghép cặp', 'vocabulary', 'pairs', '🧷', 'Ghép từ, nghĩa, ví dụ hoặc dữ kiện.'],
  ['memory-match', 'Memory Match', 'Ghép cặp ghi nhớ', 'vocabulary', 'memory', '🧠', 'Lật thẻ và tìm các cặp nội dung tương ứng.'],
  ['find-the-match', 'Find the Match', 'Tìm cặp đúng', 'vocabulary', 'pairs', '🎯', 'Chọn mục bên trái rồi chọn nội dung đúng bên phải.'],
  ['category-sort', 'Category Sort', 'Phân loại theo nhóm', 'structure', 'sort', '🧺', 'Kéo từng mục vào nhóm phù hợp.'],
  ['rank-order', 'Rank Order', 'Sắp xếp thứ tự', 'structure', 'order', '↕️', 'Sắp xếp quy trình, sự kiện hoặc ý theo thứ tự.'],
  ['sentence-builder', 'Sentence Builder', 'Ghép câu', 'structure', 'order', '🧩', 'Sắp xếp các phần để tạo câu đúng.'],
  ['paragraph-builder', 'Paragraph Builder', 'Xây dựng đoạn văn', 'structure', 'order', '📝', 'Sắp xếp câu chủ đề, giải thích, dẫn chứng và kết luận.'],
  ['sentence-insertion', 'Sentence Insertion', 'Chèn câu', 'reading', 'order', '📌', 'Sắp xếp câu bị lấy ra vào đúng vị trí.'],
  ['blank-builder', 'Blank Builder', 'Điền chỗ trống', 'structure', 'cloze', '✍️', 'Điền từ hoặc cụm từ vào từng chỗ trống.'],
  ['cloze-passage', 'Cloze Passage', 'Đoạn văn điền khuyết', 'reading', 'cloze', '📄', 'Hoàn thành đoạn văn bằng các đáp án được ẩn.'],
  ['word-scramble', 'Word Scramble', 'Xáo chữ', 'vocabulary', 'wordlist', '🔤', 'Sắp xếp lại chữ cái để tìm từ đúng.'],
  ['word-search', 'Word Search', 'Tìm từ', 'vocabulary', 'wordlist', '🔍', 'Tìm từ trong bảng chữ tương tác.'],
  ['crossword-lite', 'Crossword Lite', 'Ô chữ gợi ý', 'vocabulary', 'wordlist', '🧱', 'Nhập từ dựa trên các gợi ý.'],
  ['hangman', 'Hangman', 'Đoán từ', 'vocabulary', 'wordlist', '🪢', 'Đoán chữ cái để hoàn thành từ.'],
  ['vocabulary-bingo', 'Vocabulary Bingo', 'Bingo từ vựng', 'game', 'bingo', '▦', 'Đánh dấu các ô theo gợi ý ngẫu nhiên.'],
  ['spin-selector', 'Spin Selector', 'Vòng quay lựa chọn', 'game', 'random', '🎡', 'Quay ngẫu nhiên một câu hỏi hoặc nhiệm vụ.'],
  ['random-cards', 'Random Cards', 'Thẻ ngẫu nhiên', 'game', 'random', '🃏', 'Rút ngẫu nhiên một thẻ nhiệm vụ.'],
  ['open-the-box', 'Open the Box', 'Mở hộp bí mật', 'game', 'random', '🎁', 'Mở hộp để hiện câu hỏi hoặc phần thưởng.'],
  ['flip-tiles', 'Flip Tiles', 'Lật ô khám phá', 'game', 'random', '◫', 'Lật từng ô để khám phá nội dung.'],
  ['speaking-cards', 'Speaking Cards', 'Thẻ nói', 'speaking', 'random', '🎙️', 'Chọn thẻ câu hỏi nói và bật bộ đếm thời gian.'],
  ['one-minute-speaking', 'One-minute Speaking', 'Nói một phút', 'speaking', 'random', '⏱️', 'Chọn chủ đề ngẫu nhiên và nói trong 60 giây.'],
  ['debate-cards', 'Debate Cards', 'Thẻ tranh biện', 'speaking', 'random', '⚖️', 'Rút một quan điểm để chuẩn bị lập luận.'],
  ['summary-builder', 'Summary Builder', 'Viết tóm tắt', 'speaking', 'writing', 'Σ', 'Viết tóm tắt và theo dõi số từ ngay trên trang.'],
  ['retelling', 'Retelling Cards', 'Kể lại nội dung', 'speaking', 'random', '🔁', 'Dùng thẻ gợi ý để kể lại văn bản hoặc sự kiện.'],
  ['creative-ending', 'Creative Ending', 'Viết kết thúc mới', 'speaking', 'writing', '✨', 'Viết một phần kết thúc khác dựa trên các tiêu chí.'],
  ['evidence-hunt', 'Evidence Hunt', 'Truy tìm bằng chứng', 'reading', 'quiz', '🕵️', 'Chọn bằng chứng phù hợp cho từng nhận định.'],
  ['reference-chain', 'Reference Chain', 'Theo dấu từ quy chiếu', 'reading', 'quiz', '⛓️', 'Xác định từ quy chiếu đang thay cho nội dung nào.'],
  ['heading-match', 'Heading Match', 'Ghép tiêu đề đoạn', 'reading', 'pairs', '🏷️', 'Ghép đoạn hoặc ý chính với tiêu đề phù hợp.'],
  ['main-idea', 'Main Idea Challenge', 'Ý chính', 'reading', 'quiz', '💡', 'Chọn ý chính phù hợp nhất.'],
  ['whack-a-mole', 'Whack-a-Mole', 'Đập đáp án', 'game', 'quiz', '🔨', 'Chọn nhanh đáp án đúng trước khi hết giờ.'],
  ['balloon-pop', 'Balloon Pop', 'Nổ bóng đáp án', 'game', 'quiz', '🎈', 'Chọn bóng mang đáp án đúng.'],
  ['maze-chase', 'Maze Chase', 'Mê cung đáp án', 'game', 'quiz', '🌀', 'Chọn cổng đúng để tiến qua mê cung.'],
  ['conveyor-belt', 'Conveyor Belt', 'Băng chuyền ghi nhớ', 'game', 'conveyor', '📦', 'Quan sát mục chạy qua rồi trả lời câu hỏi ghi nhớ.'],
];

export const TEXTLAB_TEMPLATES = RAW_TEMPLATES.map(([id, title, titleVi, category, family, icon, descriptionVi]) => ({
  id,
  title,
  titleVi,
  category,
  categoryLabel: CATEGORY_LABELS[category],
  family,
  icon,
  descriptionVi,
  recommended: family === 'quiz' || family === 'boolean' ? '6–15 câu' : family === 'wordlist' ? '8–20 mục' : family === 'random' ? '6–24 mục' : '6–16 mục',
  ...FAMILY_PRESETS[family],
}));

export const TEXTLAB_CATEGORIES = [
  { id: 'all', label: 'Tất cả' },
  ...Object.entries(CATEGORY_LABELS).map(([id, label]) => ({ id, label })),
];

function normaliseLines(text) {
  return String(text || '')
    .replace(/\r/g, '')
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line && !/^TITLE\s*:/i.test(line));
}

function titleFrom(text, fallback) {
  const match = String(text || '').match(/^\s*TITLE\s*:\s*(.+)$/im);
  return match?.[1]?.trim() || fallback || 'Brian TextLab Activity';
}

function parsePipe(line) {
  return line.split('|').map((part) => part.trim());
}

export function parseTemplateContent(template, text) {
  const lines = normaliseLines(text);
  const title = titleFrom(text, template.titleVi || template.title);
  const family = template.family;

  if (family === 'quiz') {
    const items = lines.map((line, index) => {
      const parts = parsePipe(line);
      if (parts.length < 6) return null;
      const options = parts.slice(1, 5);
      const answerToken = String(parts[5] || 'A').toUpperCase();
      const answer = Math.max(0, Math.min(3, ['A', 'B', 'C', 'D'].indexOf(answerToken)));
      return { id: `q${index + 1}`, question: parts[0], options, answer, explanation: parts.slice(6).join(' | ') };
    }).filter(Boolean);
    return { title, family, items, errors: items.length ? [] : ['Cần ít nhất một dòng có đủ 6 trường phân cách bằng dấu |.'] };
  }

  if (family === 'boolean') {
    const items = lines.map((line, index) => {
      const parts = parsePipe(line);
      if (parts.length < 2) return null;
      const token = String(parts[1]).toLowerCase();
      return { id: `b${index + 1}`, statement: parts[0], answer: ['true', 'đúng', 'dung', 't', '1'].includes(token), correction: parts.slice(2).join(' | ') };
    }).filter(Boolean);
    return { title, family, items, errors: items.length ? [] : ['Cần ít nhất một nhận định với định dạng: Nhận định | TRUE/FALSE | Giải thích.'] };
  }

  if (family === 'pairs' || family === 'memory') {
    const items = lines.map((line, index) => {
      const parts = parsePipe(line);
      return parts.length >= 2 ? { id: `p${index + 1}`, left: parts[0], right: parts.slice(1).join(' | ') } : null;
    }).filter(Boolean);
    return { title, family, items, errors: items.length ? [] : ['Cần ít nhất một cặp nội dung, phân cách bằng dấu |.'] };
  }

  if (family === 'sort') {
    const groups = lines.map((line, index) => {
      const [name, rawItems] = line.split('::').map((part) => part.trim());
      if (!name || !rawItems) return null;
      return { id: `g${index + 1}`, name, items: rawItems.split(';').map((item) => item.trim()).filter(Boolean) };
    }).filter(Boolean);
    return { title, family, groups, errors: groups.length ? [] : ['Cần ít nhất một nhóm theo định dạng: Tên nhóm :: mục 1; mục 2.'] };
  }

  if (family === 'order') {
    const items = lines.map((value, index) => ({ id: `o${index + 1}`, value, order: index }));
    return { title, family, items, errors: items.length >= 2 ? [] : ['Cần ít nhất hai mục theo thứ tự đúng.'] };
  }

  if (family === 'cloze') {
    const body = lines.join('\n');
    const answers = [];
    const html = body.replace(/\[\[([^\]]+)\]\]/g, (_, answer) => {
      const id = answers.length;
      answers.push(String(answer).trim());
      return `{{BLANK_${id}}}`;
    });
    return { title, family, body: html, answers, errors: answers.length ? [] : ['Hãy đặt ít nhất một đáp án trong [[ngoặc kép vuông]].'] };
  }

  if (family === 'wordlist' || family === 'bingo') {
    const items = lines.map((line, index) => {
      const parts = parsePipe(line);
      return { id: `w${index + 1}`, word: parts[0], clue: parts.slice(1).join(' | ') || `Gợi ý cho ${parts[0]}` };
    }).filter((item) => item.word);
    return { title, family, items, errors: items.length ? [] : ['Cần ít nhất một từ hoặc cụm từ.'] };
  }

  if (family === 'random' || family === 'writing') {
    const items = lines.map((value, index) => ({ id: `r${index + 1}`, value }));
    return { title, family, items, errors: items.length ? [] : ['Cần ít nhất một câu hỏi hoặc nhiệm vụ.'] };
  }

  if (family === 'conveyor') {
    const items = lines.map((line, index) => {
      const parts = parsePipe(line);
      return { id: `c${index + 1}`, value: parts[0], question: parts.slice(1).join(' | ') || `Bạn nhớ gì về “${parts[0]}”?` };
    }).filter((item) => item.value);
    return { title, family, items, errors: items.length ? [] : ['Cần ít nhất một mục trên băng chuyền.'] };
  }

  return { title, family, items: [], errors: ['Template chưa được hỗ trợ.'] };
}

function safeJson(value) {
  return JSON.stringify(value).replace(/</g, '\\u003c').replace(/>/g, '\\u003e').replace(/&/g, '\\u0026');
}

const BASE_CSS = `
:root{--ink:#102033;--muted:#65758a;--paper:#fffdf8;--soft:#eaf4ff;--accent:#0878c9;--accent2:#ff5c8a;--good:#16865b;--bad:#c63b4d;--line:#c9d8e6;--shadow:0 14px 40px rgba(16,32,51,.12)}
*{box-sizing:border-box}body{margin:0;font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;background:linear-gradient(145deg,#eef7ff,#fff9f1);color:var(--ink);min-height:100vh}.app{max-width:1050px;margin:0 auto;padding:24px}.hero{border:2px solid var(--ink);border-radius:22px;background:var(--paper);box-shadow:var(--shadow);padding:22px 24px;margin-bottom:18px}.hero small{font-weight:900;letter-spacing:.16em;color:var(--accent)}.hero h1{margin:7px 0 4px;font-size:clamp(26px,5vw,46px);line-height:1}.hero p{margin:0;color:var(--muted)}.panel{border:2px solid var(--ink);border-radius:22px;background:var(--paper);box-shadow:var(--shadow);overflow:hidden}.toolbar{display:flex;gap:10px;flex-wrap:wrap;padding:14px;border-bottom:2px solid var(--ink);background:#111b24;color:white}.toolbar button,.btn{border:2px solid var(--ink);border-radius:999px;background:white;color:var(--ink);font-weight:900;padding:10px 16px;cursor:pointer;box-shadow:3px 3px 0 var(--ink);transition:.15s}.toolbar button:hover,.btn:hover{transform:translate(-1px,-1px);box-shadow:5px 5px 0 var(--ink)}.toolbar .primary,.btn.primary{background:var(--accent);color:white}.content{padding:24px}.question{font-size:clamp(22px,4vw,34px);font-weight:900;margin:0 0 18px}.options{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}.option{min-height:72px;border:2px solid var(--ink);border-radius:16px;background:white;font-size:17px;font-weight:800;text-align:left;padding:14px;cursor:pointer}.option:hover{background:var(--soft)}.option.good{background:#dff7ea;border-color:var(--good)}.option.bad{background:#ffe1e5;border-color:var(--bad)}.feedback{margin-top:16px;padding:14px;border-radius:14px;background:var(--soft);font-weight:700}.progress{display:flex;justify-content:space-between;gap:12px;color:var(--muted);font-weight:800;margin-bottom:16px}.pair-grid{display:grid;grid-template-columns:1fr 1fr;gap:16px}.pair-col{display:grid;gap:10px}.pair-item{border:2px solid var(--ink);border-radius:14px;background:white;padding:14px;text-align:left;font-weight:800;cursor:pointer}.pair-item.selected{background:#fff0b8}.pair-item.matched{background:#dff7ea;opacity:.72;cursor:default}.memory-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(120px,1fr));gap:12px}.memory-card{min-height:100px;perspective:800px;cursor:pointer}.memory-inner{position:relative;width:100%;height:100%;min-height:100px;transition:transform .45s;transform-style:preserve-3d}.memory-card.flipped .memory-inner{transform:rotateY(180deg)}.memory-face{position:absolute;inset:0;display:grid;place-items:center;padding:12px;border:2px solid var(--ink);border-radius:16px;backface-visibility:hidden;font-weight:900;text-align:center}.memory-front{background:var(--accent);color:white;font-size:28px}.memory-back{background:white;transform:rotateY(180deg)}.sort-source{display:flex;gap:10px;flex-wrap:wrap;margin-bottom:18px;padding:14px;background:var(--soft);border-radius:16px;min-height:72px}.chip{border:2px solid var(--ink);background:white;border-radius:999px;padding:9px 13px;font-weight:800;cursor:grab}.drop-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:14px}.drop-zone{min-height:180px;border:2px dashed var(--accent);border-radius:18px;padding:14px;background:#f8fcff}.drop-zone h3{margin:0 0 12px}.drop-zone.good{background:#e6f8ee}.order-list{display:grid;gap:10px}.order-item{display:flex;align-items:center;gap:12px;border:2px solid var(--ink);border-radius:14px;background:white;padding:13px;font-weight:800;cursor:grab}.order-item span{display:grid;place-items:center;width:32px;height:32px;border-radius:50%;background:var(--soft)}.cloze-text{font-size:20px;line-height:1.9;white-space:pre-wrap}.cloze-input{display:inline-block;min-width:120px;border:none;border-bottom:3px solid var(--accent);background:#edf7ff;padding:4px 8px;font:inherit;font-weight:800}.word-card{text-align:center}.scramble{font-size:clamp(34px,8vw,72px);font-weight:950;letter-spacing:.12em;color:var(--accent);margin:20px 0}.answer-input{width:min(100%,420px);border:2px solid var(--ink);border-radius:14px;padding:13px 15px;font-size:19px}.grid{display:grid;gap:3px;justify-content:center}.cell{width:32px;height:32px;display:grid;place-items:center;border:1px solid #aac4da;background:white;font-weight:900;cursor:pointer;user-select:none}.cell.selected{background:#ffe18a}.cell.found{background:#bfeecf}.clue-list{display:grid;gap:12px}.clue-row{display:grid;grid-template-columns:minmax(150px,1fr) minmax(140px,260px);gap:12px;align-items:center}.bingo-grid{display:grid;grid-template-columns:repeat(4,minmax(100px,1fr));gap:8px}.bingo-cell{min-height:92px;border:2px solid var(--ink);border-radius:14px;background:white;padding:8px;font-weight:800;cursor:pointer}.bingo-cell.marked{background:#ffe18a}.random-stage{text-align:center;padding:20px}.random-card{min-height:260px;display:grid;place-items:center;border:3px solid var(--ink);border-radius:28px;background:linear-gradient(135deg,#e9f5ff,#fff2d7);padding:30px;font-size:clamp(24px,5vw,42px);font-weight:950;box-shadow:8px 8px 0 var(--ink)}.writing textarea{width:100%;min-height:260px;border:2px solid var(--ink);border-radius:16px;padding:16px;font:inherit;font-size:18px;line-height:1.6}.criteria{background:var(--soft);padding:14px;border-radius:16px;margin-bottom:14px}.conveyor-window{overflow:hidden;border:3px solid var(--ink);border-radius:22px;background:#111b24;padding:22px}.conveyor-item{min-height:160px;display:grid;place-items:center;border-radius:16px;background:white;font-size:clamp(24px,5vw,42px);font-weight:950;text-align:center;padding:20px}.timer{font-size:18px;font-weight:900;color:var(--accent2)}.score-card{text-align:center;padding:24px}.score-card strong{display:block;font-size:64px;color:var(--accent)}@media(max-width:680px){.app{padding:12px}.options,.pair-grid{grid-template-columns:1fr}.content{padding:16px}.bingo-grid{grid-template-columns:repeat(3,1fr)}.cell{width:26px;height:26px;font-size:12px}.clue-row{grid-template-columns:1fr}}
`;

const RUNTIME_JS = `
const DATA = __DATA__;
const TEMPLATE_ID = __TEMPLATE_ID__;
const root = document.getElementById('activity');
const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[ch]));
const shuffle = (list) => [...list].sort(() => Math.random() - .5);
const normal = (value) => String(value ?? '').trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');
const button = (label, id, primary=false) => '<button class="'+(primary?'primary':'')+'" id="'+id+'">'+label+'</button>';
function shell(body, controls=''){root.innerHTML='<section class="panel"><div class="toolbar">'+controls+'</div><div class="content">'+body+'</div></section>'}
function done(score,total){shell('<div class="score-card"><p>HOÀN THÀNH</p><strong>'+score+'/'+total+'</strong><p>'+(score===total?'Xuất sắc!':'Hãy thử lại để cải thiện kết quả.')+'</p></div>',button('Làm lại','restart',true));document.getElementById('restart').onclick=render}
function renderQuiz(){let index=0,score=0,locked=false;const items=DATA.items||[];function show(){if(index>=items.length)return done(score,items.length);const item=items[index];const skin=TEMPLATE_ID.includes('whack')?'🔨 ':TEMPLATE_ID.includes('balloon')?'🎈 ':TEMPLATE_ID.includes('maze')?'🌀 ':'';shell('<div class="progress"><span>Câu '+(index+1)+'/'+items.length+'</span><span>Điểm: '+score+'</span></div><h2 class="question">'+skin+escapeHtml(item.question)+'</h2><div class="options">'+item.options.map((opt,i)=>'<button class="option" data-i="'+i+'">'+String.fromCharCode(65+i)+'. '+escapeHtml(opt)+'</button>').join('')+'</div><div id="feedback"></div>',button('Bắt đầu lại','restart'));document.getElementById('restart').onclick=render;document.querySelectorAll('.option').forEach(el=>el.onclick=()=>{if(locked)return;locked=true;const selected=Number(el.dataset.i);if(selected===item.answer){score++;el.classList.add('good')}else{el.classList.add('bad');document.querySelectorAll('.option')[item.answer]?.classList.add('good')}document.getElementById('feedback').innerHTML='<div class="feedback">'+(selected===item.answer?'✓ Chính xác':'✗ Chưa đúng')+(item.explanation?'<br>'+escapeHtml(item.explanation):'')+'</div>'+button(index===items.length-1?'Xem kết quả':'Câu tiếp theo','next',true);document.getElementById('next').onclick=()=>{index++;locked=false;show()}})}show()}
function renderBoolean(){let index=0,score=0;const items=DATA.items||[];function show(){if(index>=items.length)return done(score,items.length);const item=items[index];shell('<div class="progress"><span>Nhận định '+(index+1)+'/'+items.length+'</span><span>Điểm: '+score+'</span></div><h2 class="question">'+escapeHtml(item.statement)+'</h2><div class="options"><button class="option" data-v="true">TRUE · ĐÚNG</button><button class="option" data-v="false">FALSE · SAI</button></div><div id="feedback"></div>',button('Làm lại','restart'));document.getElementById('restart').onclick=render;document.querySelectorAll('.option').forEach(el=>el.onclick=()=>{const value=el.dataset.v==='true';document.querySelectorAll('.option').forEach(x=>x.disabled=true);if(value===item.answer){score++;el.classList.add('good')}else{el.classList.add('bad');document.querySelector('[data-v="'+item.answer+'"]')?.classList.add('good')}document.getElementById('feedback').innerHTML='<div class="feedback">'+(value===item.answer?'✓ Chính xác':'✗ Chưa đúng')+(item.correction?'<br>'+escapeHtml(item.correction):'')+'</div>'+button(index===items.length-1?'Xem kết quả':'Tiếp tục','next',true);document.getElementById('next').onclick=()=>{index++;show()}})}show()}
function renderPairs(){const items=DATA.items||[];let selectedLeft=null,matched=new Set();const rights=shuffle(items.map((x,i)=>({...x,index:i})));function show(){shell('<div class="progress"><span>Đã ghép '+matched.size+'/'+items.length+'</span><span>Chọn một mục ở mỗi cột</span></div><div class="pair-grid"><div class="pair-col">'+items.map((x,i)=>'<button class="pair-item '+(matched.has(i)?'matched':'')+'" data-left="'+i+'">'+escapeHtml(x.left)+'</button>').join('')+'</div><div class="pair-col">'+rights.map(x=>'<button class="pair-item '+(matched.has(x.index)?'matched':'')+'" data-right="'+x.index+'">'+escapeHtml(x.right)+'</button>').join('')+'</div></div><div id="feedback"></div>',button('Xáo trộn lại','restart'));document.getElementById('restart').onclick=render;document.querySelectorAll('[data-left]').forEach(el=>el.onclick=()=>{const i=Number(el.dataset.left);if(matched.has(i))return;selectedLeft=i;document.querySelectorAll('[data-left]').forEach(x=>x.classList.toggle('selected',x===el))});document.querySelectorAll('[data-right]').forEach(el=>el.onclick=()=>{if(selectedLeft===null)return;const r=Number(el.dataset.right);if(r===selectedLeft){matched.add(r);selectedLeft=null;show();if(matched.size===items.length)setTimeout(()=>done(items.length,items.length),300)}else{el.classList.add('bad');setTimeout(()=>el.classList.remove('bad'),500)}})}show()}
function renderMemory(){const source=DATA.items||[];const cards=shuffle(source.flatMap((item,index)=>[{pair:index,text:item.left},{pair:index,text:item.right}]));let open=[],matched=new Set(),moves=0;function show(){shell('<div class="progress"><span>Cặp: '+matched.size+'/'+source.length+'</span><span>Lượt: '+moves+'</span></div><div class="memory-grid">'+cards.map((card,i)=>'<div class="memory-card '+(open.includes(i)||matched.has(card.pair)?'flipped':'')+'" data-card="'+i+'"><div class="memory-inner"><div class="memory-face memory-front">?</div><div class="memory-face memory-back">'+escapeHtml(card.text)+'</div></div></div>').join('')+'</div>',button('Chơi lại','restart'));document.getElementById('restart').onclick=render;document.querySelectorAll('[data-card]').forEach(el=>el.onclick=()=>{const i=Number(el.dataset.card),card=cards[i];if(open.includes(i)||matched.has(card.pair)||open.length===2)return;open.push(i);show();if(open.length===2){moves++;const [a,b]=open;if(cards[a].pair===cards[b].pair){matched.add(cards[a].pair);open=[];setTimeout(()=>matched.size===source.length?done(source.length,source.length):show(),350)}else setTimeout(()=>{open=[];show()},850)}})}show()}
function renderSort(){const groups=DATA.groups||[];const all=shuffle(groups.flatMap(g=>g.items.map(value=>({value,group:g.id}))));let placed={};function show(){const unplaced=all.filter((_,i)=>!placed[i]);shell('<div class="sort-source" id="source">'+unplaced.map((x,i)=>{const real=all.indexOf(x);return '<div class="chip" draggable="true" data-chip="'+real+'">'+escapeHtml(x.value)+'</div>'}).join('')+'</div><div class="drop-grid">'+groups.map(g=>'<div class="drop-zone" data-zone="'+g.id+'"><h3>'+escapeHtml(g.name)+'</h3><div>'+Object.entries(placed).filter(([,v])=>v===g.id).map(([i])=>'<div class="chip">'+escapeHtml(all[Number(i)].value)+'</div>').join('')+'</div></div>').join('')+'</div><div id="feedback"></div>',button('Kiểm tra','check',true)+button('Làm lại','restart'));document.getElementById('restart').onclick=render;document.querySelectorAll('[data-chip]').forEach(el=>el.ondragstart=e=>e.dataTransfer.setData('text/plain',el.dataset.chip));document.querySelectorAll('[data-zone]').forEach(zone=>{zone.ondragover=e=>e.preventDefault();zone.ondrop=e=>{e.preventDefault();placed[e.dataTransfer.getData('text/plain')]=zone.dataset.zone;show()}});document.getElementById('check').onclick=()=>{const correct=all.filter((x,i)=>placed[i]===x.group).length;document.getElementById('feedback').innerHTML='<div class="feedback">Đúng '+correct+'/'+all.length+' mục.</div>';if(correct===all.length)setTimeout(()=>done(correct,all.length),500)}}show()}
function renderOrder(){const correct=DATA.items||[];let current=shuffle(correct.map(x=>({...x})));let dragIndex=null;function show(){shell('<div class="order-list">'+current.map((x,i)=>'<div class="order-item" draggable="true" data-i="'+i+'"><span>'+(i+1)+'</span>'+escapeHtml(x.value)+'</div>').join('')+'</div><div id="feedback"></div>',button('Kiểm tra','check',true)+button('Xáo lại','restart'));document.getElementById('restart').onclick=render;document.querySelectorAll('[data-i]').forEach(el=>{el.ondragstart=()=>dragIndex=Number(el.dataset.i);el.ondragover=e=>e.preventDefault();el.ondrop=e=>{e.preventDefault();const to=Number(el.dataset.i);const [moved]=current.splice(dragIndex,1);current.splice(to,0,moved);show()}});document.getElementById('check').onclick=()=>{const score=current.filter((x,i)=>x.order===i).length;document.getElementById('feedback').innerHTML='<div class="feedback">'+(score===correct.length?'✓ Thứ tự hoàn toàn chính xác.':'Đúng vị trí '+score+'/'+correct.length+' mục.')+'</div>';if(score===correct.length)setTimeout(()=>done(score,correct.length),500)}}show()}
function renderCloze(){const answers=DATA.answers||[];let html=escapeHtml(DATA.body||'').replace(/\{\{BLANK_(\d+)\}\}/g,(_,i)=>'<input class="cloze-input" data-blank="'+i+'" autocomplete="off">').replace(/\n/g,'<br>');shell('<div class="cloze-text">'+html+'</div><div id="feedback"></div>',button('Kiểm tra','check',true)+button('Làm lại','restart'));document.getElementById('restart').onclick=render;document.getElementById('check').onclick=()=>{let score=0;document.querySelectorAll('[data-blank]').forEach(input=>{const i=Number(input.dataset.blank);const ok=normal(input.value)===normal(answers[i]);input.style.background=ok?'#dff7ea':'#ffe1e5';if(ok)score++});document.getElementById('feedback').innerHTML='<div class="feedback">Đúng '+score+'/'+answers.length+' chỗ trống.</div>';if(score===answers.length)setTimeout(()=>done(score,answers.length),600)}}
function scramble(word){return shuffle(word.split('')).join('')}
function renderWordList(){const items=DATA.items||[];if(TEMPLATE_ID==='word-search')return renderWordSearch(items);if(TEMPLATE_ID==='crossword-lite')return renderCrossword(items);if(TEMPLATE_ID==='hangman')return renderHangman(items);let index=0,score=0;function show(){if(index>=items.length)return done(score,items.length);const item=items[index];shell('<div class="word-card"><p>'+escapeHtml(item.clue)+'</p><div class="scramble">'+escapeHtml(scramble(item.word.toUpperCase()))+'</div><input class="answer-input" id="answer" placeholder="Nhập từ đúng"><div id="feedback"></div></div>',button('Kiểm tra','check',true)+button('Bỏ qua','skip'));document.getElementById('check').onclick=()=>{const ok=normal(document.getElementById('answer').value)===normal(item.word);if(ok)score++;document.getElementById('feedback').innerHTML='<div class="feedback">'+(ok?'✓ Chính xác':'Đáp án: '+escapeHtml(item.word))+'</div>'+button('Tiếp tục','next',true);document.getElementById('next').onclick=()=>{index++;show()}};document.getElementById('skip').onclick=()=>{index++;show()}}show()}
function renderCrossword(items){shell('<div class="clue-list">'+items.map((item,i)=>'<label class="clue-row"><span><b>'+(i+1)+'.</b> '+escapeHtml(item.clue)+'</span><input class="answer-input" data-answer="'+i+'" placeholder="Đáp án"></label>').join('')+'</div><div id="feedback"></div>',button('Kiểm tra','check',true)+button('Làm lại','restart'));document.getElementById('restart').onclick=render;document.getElementById('check').onclick=()=>{let score=0;document.querySelectorAll('[data-answer]').forEach(input=>{const i=Number(input.dataset.answer),ok=normal(input.value)===normal(items[i].word);input.style.background=ok?'#dff7ea':'#ffe1e5';if(ok)score++});document.getElementById('feedback').innerHTML='<div class="feedback">Đúng '+score+'/'+items.length+' từ.</div>';if(score===items.length)setTimeout(()=>done(score,items.length),500)}}
function renderHangman(items){let index=0,guessed=new Set(),wrong=0;function show(){if(index>=items.length)return done(items.length,items.length);const item=items[index],letters=[...item.word.toUpperCase()],solved=letters.every(ch=>!/[A-ZÀ-Ỹ]/.test(ch)||guessed.has(normal(ch)));shell('<div class="word-card"><p>'+escapeHtml(item.clue)+'</p><div class="scramble">'+letters.map(ch=>/[A-ZÀ-Ỹ]/.test(ch)?(guessed.has(normal(ch))?escapeHtml(ch):'_'):escapeHtml(ch)).join(' ')+'</div><p>Sai: '+wrong+'/7</p><div class="options">'+[...'ABCDEFGHIJKLMNOPQRSTUVWXYZ'].map(ch=>'<button class="option" data-letter="'+ch+'" '+(guessed.has(ch.toLowerCase())?'disabled':'')+'>'+ch+'</button>').join('')+'</div></div>',button('Từ mới','skip'));document.getElementById('skip').onclick=()=>{index++;guessed=new Set();wrong=0;show()};document.querySelectorAll('[data-letter]').forEach(el=>el.onclick=()=>{const ch=el.dataset.letter.toLowerCase();guessed.add(ch);if(!normal(item.word).includes(ch))wrong++;const nowSolved=[...item.word.toUpperCase()].every(c=>!/[A-ZÀ-Ỹ]/.test(c)||guessed.has(normal(c)));if(nowSolved||wrong>=7){setTimeout(()=>{alert(nowSolved?'Chính xác!':'Đáp án: '+item.word);index++;guessed=new Set();wrong=0;show()},120)}else show()})}show()}
function makeGrid(items){const words=items.map(x=>normal(x.word).replace(/[^a-z]/g,'').toUpperCase()).filter(Boolean).slice(0,12);const size=Math.max(10,Math.min(16,Math.max(...words.map(w=>w.length),10)+2));const grid=Array.from({length:size},()=>Array.from({length:size},()=>String.fromCharCode(65+Math.floor(Math.random()*26))));const placed=[];words.forEach((word,idx)=>{let ok=false;for(let tries=0;tries<80&&!ok;tries++){const vertical=Math.random()>.5,row=Math.floor(Math.random()*(vertical?size-word.length+1:size)),col=Math.floor(Math.random()*(vertical?size:size-word.length+1));let can=true;for(let i=0;i<word.length;i++){const r=row+(vertical?i:0),c=col+(vertical?0:i);if(grid[r][c]!==word[i]&&placed.some(p=>p.cells.some(([pr,pc])=>pr===r&&pc===c)))can=false}if(can){const cells=[];for(let i=0;i<word.length;i++){const r=row+(vertical?i:0),c=col+(vertical?0:i);grid[r][c]=word[i];cells.push([r,c])}placed.push({word,index:idx,cells});ok=true}}});return{grid,placed,size}}
function renderWordSearch(items){const state=makeGrid(items),found=new Set();let first=null;function show(){shell('<div class="progress"><span>Tìm được '+found.size+'/'+state.placed.length+'</span><span>Chọn chữ đầu và chữ cuối</span></div><div class="grid" style="grid-template-columns:repeat('+state.size+',32px)">'+state.grid.flatMap((row,r)=>row.map((ch,c)=>'<button class="cell '+(state.placed.some((p,i)=>found.has(i)&&p.cells.some(([pr,pc])=>pr===r&&pc===c))?'found':'')+'" data-r="'+r+'" data-c="'+c+'">'+ch+'</button>')).join('')+'</div><p>'+state.placed.map((p,i)=>'<span style="margin-right:12px;text-decoration:'+(found.has(i)?'line-through':'none')+'">'+escapeHtml(items[p.index].word)+'</span>').join('')+'</p>',button('Tạo bảng mới','restart'));document.getElementById('restart').onclick=render;document.querySelectorAll('.cell').forEach(el=>el.onclick=()=>{const point=[Number(el.dataset.r),Number(el.dataset.c)];if(!first){first=point;el.classList.add('selected');return}const match=state.placed.findIndex((p,i)=>!found.has(i)&&((p.cells[0][0]===first[0]&&p.cells[0][1]===first[1]&&p.cells.at(-1)[0]===point[0]&&p.cells.at(-1)[1]===point[1])||(p.cells.at(-1)[0]===first[0]&&p.cells.at(-1)[1]===first[1]&&p.cells[0][0]===point[0]&&p.cells[0][1]===point[1])));document.querySelectorAll('.cell').forEach(x=>x.classList.remove('selected'));first=null;if(match>=0){found.add(match);show();if(found.size===state.placed.length)setTimeout(()=>done(found.size,state.placed.length),400)}})}show()}
function renderBingo(){const items=shuffle(DATA.items||[]).slice(0,16);let marked=new Set(),current=null;function win(){const lines=[];for(let r=0;r<4;r++)lines.push([0,1,2,3].map(c=>r*4+c));for(let c=0;c<4;c++)lines.push([0,1,2,3].map(r=>r*4+c));lines.push([0,5,10,15],[3,6,9,12]);return lines.some(line=>line.every(i=>marked.has(i)))}function show(){shell('<div class="progress"><span>'+(current?'Gợi ý: '+escapeHtml(current.clue):'Nhấn “Gọi mục” để bắt đầu')+'</span><span>Đã đánh dấu '+marked.size+'</span></div><div class="bingo-grid">'+items.map((x,i)=>'<button class="bingo-cell '+(marked.has(i)?'marked':'')+'" data-cell="'+i+'">'+escapeHtml(x.word)+'</button>').join('')+'</div><div id="feedback"></div>',button('Gọi mục ngẫu nhiên','call',true)+button('Bảng mới','restart'));document.getElementById('restart').onclick=render;document.getElementById('call').onclick=()=>{const remaining=items.filter((_,i)=>!marked.has(i));current=remaining[Math.floor(Math.random()*remaining.length)]||items[Math.floor(Math.random()*items.length)];show()};document.querySelectorAll('[data-cell]').forEach(el=>el.onclick=()=>{const i=Number(el.dataset.cell);marked.has(i)?marked.delete(i):marked.add(i);show();if(win())setTimeout(()=>done(marked.size,items.length),300)})}show()}
function renderRandom(){const items=DATA.items||[];let current=0,seconds=TEMPLATE_ID==='one-minute-speaking'?60:0,timer=null;function show(){shell('<div class="random-stage"><div class="random-card">'+escapeHtml(items[current]?.value||'Chưa có nội dung')+'</div>'+(seconds?'<p class="timer" id="timer">'+seconds+' giây</p>':'')+'</div>',button(TEMPLATE_ID==='spin-selector'?'QUAY':'CHỌN NGẪU NHIÊN','random',true)+button('Trước','prev')+button('Sau','next'));document.getElementById('random').onclick=()=>{current=Math.floor(Math.random()*items.length);if(TEMPLATE_ID==='one-minute-speaking'){seconds=60;clearInterval(timer);timer=setInterval(()=>{seconds--;const el=document.getElementById('timer');if(el)el.textContent=seconds+' giây';if(seconds<=0){clearInterval(timer);alert('Hết thời gian!')}},1000)}show()};document.getElementById('prev').onclick=()=>{current=(current-1+items.length)%items.length;show()};document.getElementById('next').onclick=()=>{current=(current+1)%items.length;show()}}show()}
function renderWriting(){const items=DATA.items||[];const prompt=items[0]?.value||'';const criteria=items.slice(1);shell('<div class="writing"><div class="criteria"><h2>'+escapeHtml(prompt)+'</h2><ul>'+criteria.map(x=>'<li>'+escapeHtml(x.value)+'</li>').join('')+'</ul></div><textarea id="writing" placeholder="Viết nội dung tại đây..."></textarea><p><b id="count">0 từ</b></p></div>',button('Xóa nội dung','restart')+button('Tải bài viết TXT','save',true));document.getElementById('restart').onclick=()=>{if(confirm('Xóa nội dung đang viết?'))render()};const area=document.getElementById('writing');area.value=localStorage.getItem('textlab-writing-'+TEMPLATE_ID)||'';const update=()=>{const n=area.value.trim()?area.value.trim().split(/\s+/).length:0;document.getElementById('count').textContent=n+' từ';localStorage.setItem('textlab-writing-'+TEMPLATE_ID,area.value)};area.oninput=update;update();document.getElementById('save').onclick=()=>{const blob=new Blob([area.value],{type:'text/plain;charset=utf-8'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=(DATA.title||'writing')+'.txt';a.click();setTimeout(()=>URL.revokeObjectURL(url),500)}}
function renderConveyor(){const items=DATA.items||[];let index=0,stage='watch',score=0;function watch(){if(index>=items.length){stage='quiz';index=0;return quiz()}shell('<div class="conveyor-window"><div class="conveyor-item">'+escapeHtml(items[index].value)+'</div></div><p class="timer">Quan sát mục '+(index+1)+'/'+items.length+'</p>',button('Bỏ qua phần quan sát','quiz'));document.getElementById('quiz').onclick=()=>{stage='quiz';index=0;quiz()};setTimeout(()=>{if(stage==='watch'){index++;watch()}},1800)}function quiz(){if(index>=items.length)return done(score,items.length);const item=items[index],options=shuffle([item.value,...shuffle(items.filter(x=>x!==item)).slice(0,3).map(x=>x.value)]);shell('<div class="progress"><span>Câu '+(index+1)+'/'+items.length+'</span><span>Điểm '+score+'</span></div><h2 class="question">'+escapeHtml(item.question)+'</h2><div class="options">'+options.map(x=>'<button class="option" data-value="'+encodeURIComponent(x)+'">'+escapeHtml(x)+'</button>').join('')+'</div>',button('Xem lại băng chuyền','restart'));document.getElementById('restart').onclick=render;document.querySelectorAll('[data-value]').forEach(el=>el.onclick=()=>{const ok=decodeURIComponent(el.dataset.value)===item.value;if(ok)score++;el.classList.add(ok?'good':'bad');setTimeout(()=>{index++;quiz()},600)})}watch()}
function render(){clearInterval(window.__textlabTimer);if(DATA.errors?.length){shell('<h2>Chưa thể tạo hoạt động</h2><ul>'+DATA.errors.map(x=>'<li>'+escapeHtml(x)+'</li>').join('')+'</ul>');return}if(DATA.family==='quiz')return renderQuiz();if(DATA.family==='boolean')return renderBoolean();if(DATA.family==='pairs')return renderPairs();if(DATA.family==='memory')return renderMemory();if(DATA.family==='sort')return renderSort();if(DATA.family==='order')return renderOrder();if(DATA.family==='cloze')return renderCloze();if(DATA.family==='wordlist')return renderWordList();if(DATA.family==='bingo')return renderBingo();if(DATA.family==='random')return renderRandom();if(DATA.family==='writing')return renderWriting();if(DATA.family==='conveyor')return renderConveyor();shell('<p>Template chưa được hỗ trợ.</p>')}
render();
`;

export function buildStandaloneHtml(template, text, options = {}) {
  const data = parseTemplateContent(template, text);
  const title = data.title || options.title || template.titleVi || template.title;
  const runtime = RUNTIME_JS
    .replace('__DATA__', safeJson(data))
    .replace('__TEMPLATE_ID__', safeJson(template.id));
  return `<!doctype html>
<html lang="vi">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${String(title).replace(/[<>&"]/g, '')}</title>
<style>${BASE_CSS}</style>
</head>
<body>
<main class="app">
<header class="hero"><small>BRIAN TEXTLAB · OFFLINE HTML</small><h1>${String(title).replace(/[<>&]/g, '')}</h1><p>${template.titleVi} · Không AI · Hoạt động chạy trực tiếp trên trình duyệt</p></header>
<div id="activity"></div>
</main>
<script>${runtime.replace(/<\/script/gi, '<\\/script')}</script>
</body>
</html>`;
}

export function slugifyFilename(value) {
  return String(value || 'textlab-activity')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'textlab-activity';
}

export function downloadStandaloneHtml(template, text) {
  const data = parseTemplateContent(template, text);
  const html = buildStandaloneHtml(template, text);
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${slugifyFilename(data.title)}-${template.id}.html`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1200);
}

export function downloadTemplateText(template, text) {
  const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${template.id}-content.txt`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1200);
}
