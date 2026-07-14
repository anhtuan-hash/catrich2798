export const ACTIVITY_TEMPLATES = [
  {
    id: 'quiz',
    icon: '❓',
    title: 'Quiz',
    descVi: 'Câu hỏi trắc nghiệm có chấm điểm.',
    desc: 'Auto-scored multiple-choice questions.',
    hintVi: 'Mỗi dòng: Câu hỏi | A | B | C | D | Đáp án. Đáp án có thể là A/B/C/D hoặc nội dung đúng.',
    hint: 'One line: Question | A | B | C | D | Answer. Answer can be A/B/C/D or the correct option text.',
  },
  {
    id: 'match',
    icon: '🔗',
    title: 'Match Up',
    descVi: 'Nối thuật ngữ với nghĩa/định nghĩa.',
    desc: 'Match terms to definitions.',
    hintVi: 'Mỗi dòng: Thuật ngữ | Định nghĩa / nghĩa / ví dụ.',
    hint: 'One line: Term | Definition / meaning / example.',
  },
  {
    id: 'pairs',
    icon: '🧠',
    title: 'Matching Pairs',
    descVi: 'Lật thẻ và tìm cặp đúng.',
    desc: 'Flip cards and find matching pairs.',
    hintVi: 'Mỗi dòng: Thẻ 1 | Thẻ 2. Phù hợp cho word form, collocation, synonym.',
    hint: 'One line: Card 1 | Card 2. Good for word forms, collocations and synonyms.',
  },
  {
    id: 'cards',
    icon: '🎙️',
    title: 'Speaking Cards',
    descVi: 'Thẻ câu hỏi speaking, có nút random/next.',
    desc: 'Speaking prompt cards with random/next controls.',
    hintVi: 'Mỗi dòng là một câu hỏi hoặc nhiệm vụ speaking.',
    hint: 'Each line is one speaking question or task.',
  },
  {
    id: 'box',
    icon: '🎁',
    title: 'Open the Box',
    descVi: 'Mở hộp để hiện câu hỏi/nhiệm vụ.',
    desc: 'Open boxes to reveal questions or tasks.',
    hintVi: 'Mỗi dòng là nội dung một hộp. Có thể thêm điểm: 10 | Câu hỏi...',
    hint: 'Each line is one box. Optional: 10 | Question...',
  },
  {
    id: 'sort',
    icon: '🧩',
    title: 'Group Sort',
    descVi: 'Kéo/thả hoặc bấm để phân loại vào nhóm.',
    desc: 'Drag/drop or click to sort items into groups.',
    hintVi: 'Mỗi dòng: Nhóm | item 1, item 2, item 3. Ví dụ: Noun | teacher, happiness.',
    hint: 'One line: Group | item 1, item 2, item 3. Example: Noun | teacher, happiness.',
  },
  {
    id: 'unjumble',
    icon: '🔀',
    title: 'Unjumble',
    descVi: 'Sắp xếp từ thành câu đúng.',
    desc: 'Arrange jumbled words into correct sentences.',
    hintVi: 'Mỗi dòng là một câu hoàn chỉnh. App sẽ tự xáo trộn từ.',
    hint: 'Each line is a complete sentence. The app will shuffle the words.',
  },
  {
    id: 'wordsearch',
    icon: '🔎',
    title: 'Wordsearch',
    descVi: 'Tạo bảng tìm từ kèm clue.',
    desc: 'Generate a wordsearch grid with clues.',
    hintVi: 'Mỗi dòng: WORD | clue. Chỉ nên dùng từ không dấu cách, tối đa 15 chữ.',
    hint: 'One line: WORD | clue. Use single words, max 15 letters.',
  },
];

export const SAMPLE_CONTENT = {
  quiz: `While I _____ dinner, the phone rang. | was cooking | cooked | have cooked | cook | A
They _____ TV when the lights went out. | watched | were watching | have watched | are watching | B
I _____ my keys yesterday morning. | lose | lost | was losing | have lost | B
She _____ to school when it started to rain. | walked | was walking | has walked | walks | B`,
  match: `allegation | a claim that someone has done something wrong
harmful | causing damage or injury
mobilization | the act of organizing people or resources for action
confrontation | a direct conflict or disagreement
deterioration | the process of becoming worse`,
  pairs: `happy | happiness
strong | strength
decide | decision
accurate | accuracy
perform | performance
responsible | responsibility`,
  cards: `Describe a time when you had to make an important decision.
Do you think students should be allowed to use AI for homework? Why?
Compare studying online and studying in a traditional classroom.
What makes a teacher memorable?
Talk about one habit that helps you learn English better.`,
  box: `10 | Use "while" in a sentence about the past.
20 | Correct the mistake: I was see him yesterday.
30 | Give three verbs that are often used in Past Continuous.
40 | Make a sentence with Past Simple and Past Continuous.
50 | Explain the difference between when and while.`,
  sort: `Nouns | happiness, decision, performance, responsibility, accuracy
Adjectives | happy, strong, accurate, responsible, harmful
Verbs | decide, perform, strengthen, harm, allege
Adverbs | accurately, responsibly, strongly, happily`,
  unjumble: `I was cooking dinner when the phone rang.
They were watching TV when the lights went out.
She was walking to school when it started to rain.
We did not stay at home last night.`,
  wordsearch: `ALLEGATION | a claim that someone has done something wrong
HARMFUL | causing damage or injury
MOBILIZATION | organizing people or resources for action
CONFRONTATION | a direct conflict
DETERIORATION | becoming worse
VALIDATION | the process of proving something is correct`,
};

function cleanLine(line) {
  return line.replace(/\s+/g, ' ').trim();
}

function splitPipe(line) {
  return line.split('|').map((part) => cleanLine(part)).filter(Boolean);
}

function hashString(input) {
  let hash = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

export function seededShuffle(items, seedText = '') {
  const arr = [...items];
  let seed = hashString(seedText || JSON.stringify(items) || 'brian');
  const rand = () => {
    seed = (1664525 * seed + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rand() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function normalizeAnswer(answer, options) {
  const raw = cleanLine(answer || '');
  const letterMap = { A: 0, B: 1, C: 2, D: 3 };
  const maybeLetter = raw.toUpperCase();
  if (Object.hasOwn(letterMap, maybeLetter)) return letterMap[maybeLetter];
  const found = options.findIndex((option) => option.toLowerCase() === raw.toLowerCase());
  return found >= 0 ? found : 0;
}

function parseQuiz(lines) {
  const questions = lines.map((line, index) => {
    const parts = splitPipe(line);
    if (parts.length >= 6) {
      const options = parts.slice(1, 5);
      return {
        id: `q${index + 1}`,
        question: parts[0],
        options,
        answerIndex: normalizeAnswer(parts[5], options),
        explanation: parts.slice(6).join(' | '),
      };
    }
    return {
      id: `q${index + 1}`,
      question: parts[0] || line,
      options: ['True', 'False', 'Not given', 'Need context'],
      answerIndex: 0,
      explanation: '',
    };
  });
  return { questions };
}

function parsePairs(lines) {
  const pairs = lines.map((line, index) => {
    const parts = splitPipe(line);
    return {
      id: `p${index + 1}`,
      left: parts[0] || line,
      right: parts[1] || 'Definition / answer',
    };
  }).filter((pair) => pair.left && pair.right);
  return { pairs };
}

function parseCards(lines) {
  return {
    prompts: lines.map((line, index) => ({ id: `card${index + 1}`, text: line })),
  };
}

function parseBoxes(lines) {
  return {
    boxes: lines.map((line, index) => {
      const parts = splitPipe(line);
      if (parts.length >= 2 && /^[-+]?\d+$/.test(parts[0])) {
        return { id: `box${index + 1}`, points: Number(parts[0]), text: parts.slice(1).join(' | ') };
      }
      return { id: `box${index + 1}`, points: null, text: line };
    }),
  };
}

function parseSort(lines) {
  const categories = [];
  const items = [];
  lines.forEach((line) => {
    const parts = splitPipe(line);
    if (parts.length >= 2) {
      const category = parts[0];
      const rawItems = parts.slice(1).join(',').split(',').map(cleanLine).filter(Boolean);
      if (!categories.includes(category)) categories.push(category);
      rawItems.forEach((item) => items.push({ id: `item${items.length + 1}`, text: item, category }));
    }
  });
  return { categories, items: seededShuffle(items, lines.join('|')) };
}

function parseUnjumble(lines) {
  return {
    sentences: lines.map((line, index) => {
      const words = line.match(/\S+/g) || [];
      return {
        id: `s${index + 1}`,
        text: line,
        words: seededShuffle(words, line),
      };
    }),
  };
}

function getWordParts(line) {
  const parts = splitPipe(line);
  const word = (parts[0] || line).toUpperCase().replace(/[^A-Z]/g, '').slice(0, 15);
  return { word, clue: parts[1] || '' };
}

function placeWord(grid, word, rng) {
  const size = grid.length;
  const dirs = [
    [1, 0],
    [0, 1],
    [1, 1],
    [-1, 1],
  ];
  const attempts = 300;
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    const [dx, dy] = dirs[Math.floor(rng() * dirs.length)];
    const reverse = rng() > 0.5;
    const letters = reverse ? [...word].reverse() : [...word];
    const startX = Math.floor(rng() * size);
    const startY = Math.floor(rng() * size);
    const endX = startX + dx * (letters.length - 1);
    const endY = startY + dy * (letters.length - 1);
    if (endX < 0 || endY < 0 || endX >= size || endY >= size) continue;
    let ok = true;
    for (let i = 0; i < letters.length; i += 1) {
      const x = startX + dx * i;
      const y = startY + dy * i;
      if (grid[y][x] && grid[y][x] !== letters[i]) {
        ok = false;
        break;
      }
    }
    if (!ok) continue;
    for (let i = 0; i < letters.length; i += 1) {
      const x = startX + dx * i;
      const y = startY + dy * i;
      grid[y][x] = letters[i];
    }
    return true;
  }
  return false;
}

function makeRng(seedText) {
  let seed = hashString(seedText || 'wordsearch');
  return () => {
    seed = (1664525 * seed + 1013904223) >>> 0;
    return seed / 4294967296;
  };
}

function parseWordsearch(lines) {
  const entries = lines.map(getWordParts).filter((entry) => entry.word.length >= 2);
  const longest = Math.max(8, ...entries.map((entry) => entry.word.length));
  const size = Math.min(18, Math.max(10, longest + 3, Math.ceil(entries.length * 1.8)));
  const grid = Array.from({ length: size }, () => Array.from({ length: size }, () => ''));
  const rng = makeRng(lines.join('|'));
  entries.forEach((entry) => placeWord(grid, entry.word, rng));
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      if (!grid[y][x]) grid[y][x] = alphabet[Math.floor(rng() * alphabet.length)];
    }
  }
  return { entries, grid };
}

export function parseActivity(templateId, content) {
  const lines = content.split('\n').map(cleanLine).filter(Boolean);
  if (!lines.length) return { ok: false, error: 'No content yet.', data: {} };
  if (templateId === 'quiz') return { ok: true, data: parseQuiz(lines) };
  if (templateId === 'match' || templateId === 'pairs') return { ok: true, data: parsePairs(lines) };
  if (templateId === 'cards') return { ok: true, data: parseCards(lines) };
  if (templateId === 'box') return { ok: true, data: parseBoxes(lines) };
  if (templateId === 'sort') return { ok: true, data: parseSort(lines) };
  if (templateId === 'unjumble') return { ok: true, data: parseUnjumble(lines) };
  if (templateId === 'wordsearch') return { ok: true, data: parseWordsearch(lines) };
  return { ok: false, error: 'Unsupported template.', data: {} };
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function escapeScript(value) {
  return JSON.stringify(value).replace(/<\//g, '<\\/');
}

export function buildTeacherText(title, templateId, activity) {
  const header = `${title}\nTemplate: ${templateId}\n${'-'.repeat(40)}`;
  if (templateId === 'quiz') {
    const body = activity.questions.map((q, i) => {
      const options = q.options.map((opt, j) => `${String.fromCharCode(65 + j)}. ${opt}`).join('\n');
      return `${i + 1}. ${q.question}\n${options}\nAnswer: ${String.fromCharCode(65 + q.answerIndex)}${q.explanation ? `\nExplanation: ${q.explanation}` : ''}`;
    }).join('\n\n');
    return `${header}\n${body}`;
  }
  if (templateId === 'match' || templateId === 'pairs') {
    return `${header}\n${activity.pairs.map((p, i) => `${i + 1}. ${p.left} = ${p.right}`).join('\n')}`;
  }
  if (templateId === 'cards') return `${header}\n${activity.prompts.map((p, i) => `${i + 1}. ${p.text}`).join('\n')}`;
  if (templateId === 'box') return `${header}\n${activity.boxes.map((b, i) => `${i + 1}. ${b.points ? `[${b.points} pts] ` : ''}${b.text}`).join('\n')}`;
  if (templateId === 'sort') return `${header}\n${activity.categories.map((cat) => `${cat}: ${activity.items.filter((item) => item.category === cat).map((item) => item.text).join(', ')}`).join('\n')}`;
  if (templateId === 'unjumble') return `${header}\n${activity.sentences.map((s, i) => `${i + 1}. ${s.words.join(' / ')}\nAnswer: ${s.text}`).join('\n\n')}`;
  if (templateId === 'wordsearch') return `${header}\n${activity.grid.map((row) => row.join(' ')).join('\n')}\n\nWords:\n${activity.entries.map((entry, i) => `${i + 1}. ${entry.word}${entry.clue ? ` - ${entry.clue}` : ''}`).join('\n')}`;
  return header;
}

export function downloadFile(filename, content, mimeType = 'text/plain;charset=utf-8') {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export function slugify(text) {
  return String(text || 'activity')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'activity';
}

export function buildStandaloneHtml({ title, templateId, activity }) {
  const safeTitle = escapeHtml(title || 'Brian English Activity');
  const data = escapeScript(activity);
  const tpl = escapeScript(templateId);
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${safeTitle}</title>
<style>@font-face{font-family:BrianGesco;src:url('/bes-fonts/brian-personal-font.ttf?v=12.0.0') format('truetype');font-weight:100 900;font-style:normal;font-display:swap;}
:root{font-family:BrianGesco,Inter,system-ui,-apple-system,Segoe UI,sans-serif;color:#08213f;background:#eef6ff;--panel:#ffffff;--line:#b9d2e8;--primary:#0078d4;--muted:#49647f;--green:#13c27e;--red:#ff5050;--orange:#ff9e18}*{box-sizing:border-box}body{margin:0;min-height:100vh;background:#eef6ff;color:#08213f}.wrap{width:min(1100px,calc(100% - 28px));margin:0 auto;padding:34px 0 60px}.hero,.panel{border:1px solid var(--line);background:var(--panel);border-radius:0;box-shadow:none}.hero{padding:28px;margin-bottom:18px}.hero h1{margin:0 0 8px;font-size:clamp(2rem,5vw,3.4rem);letter-spacing:-.05em}.hero p{margin:0;color:var(--muted)}.panel{padding:22px}.grid{display:grid;gap:12px}.cols{grid-template-columns:repeat(auto-fit,minmax(220px,1fr))}button{border:1px solid var(--line);border-radius:0;padding:12px 14px;background:#e7f2ff;color:#08213f;font:inherit;font-weight:800;cursor:pointer}button.primary{background:var(--primary);border:1px solid var(--primary);color:#fff}.card,.item,.box{border:1px solid var(--line);background:#e7f2ff;border-radius:0;padding:16px}.muted{color:var(--muted)}.ok{border-color:rgba(19,194,126,.6)!important;background:rgba(19,194,126,.14)!important}.bad{border-color:rgba(255,80,80,.6)!important;background:rgba(255,80,80,.14)!important}.letters{display:grid;gap:4px;justify-content:start}.letters span{display:grid;place-items:center;width:32px;height:32px;border-radius:0;background:#e7f2ff;border:1px solid var(--line);font-weight:900}.bank{display:flex;gap:8px;flex-wrap:wrap}.small{font-size:.9rem}.hidden{display:none}.word{background:rgba(61,133,246,.16)}.score{font-size:1.2rem;font-weight:900;color:#0078d4}.box{min-height:110px;display:grid;place-items:center;text-align:center;font-weight:900}.select{outline:3px solid #00b9ff}.row{display:flex;gap:10px;flex-wrap:wrap;align-items:center}.drop{min-height:90px}.drop h3{margin:0 0 10px}.pill{display:inline-flex;margin:4px;padding:8px 10px;border-radius:0;background:#e7f2ff;border:1px solid var(--line)}@media(max-width:640px){.letters span{width:24px;height:24px;font-size:.8rem}}
</style>
</head>
<body>
<div class="wrap">
  <section class="hero"><h1>${safeTitle}</h1><p>Created with Brian English Studio · ${escapeHtml(templateId)}</p></section>
  <section class="panel"><div id="app"></div></section>
</div>
<script>
const templateId = ${tpl};
const activity = ${data};
const $ = (s) => document.querySelector(s);
const app = $('#app');
function esc(v){return String(v).replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));}
function shuffle(a){return [...a].sort(()=>Math.random()-.5)}
function renderQuiz(){app.innerHTML='<div class="grid">'+activity.questions.map((q,i)=>'<div class="card"><h3>'+(i+1)+'. '+esc(q.question)+'</h3><div class="grid cols">'+q.options.map((o,j)=>'<button data-q="'+i+'" data-a="'+j+'">'+String.fromCharCode(65+j)+'. '+esc(o)+'</button>').join('')+'</div><p class="muted" id="fb'+i+'"></p></div>').join('')+'</div><p class="score" id="score"></p>';const answers={};app.onclick=e=>{if(e.target.tagName!=='BUTTON')return;let q=+e.target.dataset.q,a=+e.target.dataset.a;answers[q]=a;[...document.querySelectorAll('[data-q="'+q+'"]')].forEach(b=>b.classList.remove('ok','bad'));e.target.classList.add(a===activity.questions[q].answerIndex?'ok':'bad');document.querySelector('#fb'+q).textContent=a===activity.questions[q].answerIndex?'Correct!':('Answer: '+String.fromCharCode(65+activity.questions[q].answerIndex));let correct=Object.entries(answers).filter(([qi,ai])=>activity.questions[qi].answerIndex===ai).length;$('#score').textContent='Score: '+correct+'/'+activity.questions.length;}}
function renderCards(){let i=0;function show(){app.innerHTML='<div class="card"><p class="muted">Card '+(i+1)+'/'+activity.prompts.length+'</p><h2>'+esc(activity.prompts[i].text)+'</h2><div class="row"><button class="primary" id="next">Next</button><button id="rand">Random</button></div></div>';$('#next').onclick=()=>{i=(i+1)%activity.prompts.length;show()};$('#rand').onclick=()=>{i=Math.floor(Math.random()*activity.prompts.length);show()}}show()}
function renderBox(){app.innerHTML='<div class="grid cols">'+activity.boxes.map((b,i)=>'<button class="box" data-i="'+i+'">Box '+(i+1)+'</button>').join('')+'</div>';app.onclick=e=>{if(!e.target.dataset.i)return;let b=activity.boxes[e.target.dataset.i];e.target.innerHTML=(b.points?'<span>'+b.points+' pts</span><br>':'')+esc(b.text);e.target.classList.add('word')}}
function renderMatch(){let defs=shuffle(activity.pairs.map(p=>p.right));let selected=null;app.innerHTML='<div class="grid cols"><div><h2>Terms</h2>'+activity.pairs.map((p,i)=>'<button class="item" data-left="'+i+'">'+esc(p.left)+'</button>').join('')+'</div><div><h2>Definitions</h2>'+defs.map((d,i)=>'<button class="item" data-right="'+i+'">'+esc(d)+'</button>').join('')+'</div></div><p class="score" id="mScore">Matched: 0/'+activity.pairs.length+'</p>';let matched=0;app.onclick=e=>{if(e.target.dataset.left){selected=+e.target.dataset.left;document.querySelectorAll('[data-left]').forEach(b=>b.classList.remove('select'));e.target.classList.add('select')}if(e.target.dataset.right&&selected!==null){let ok=activity.pairs[selected].right===defs[+e.target.dataset.right];e.target.classList.add(ok?'ok':'bad');document.querySelector('[data-left="'+selected+'"]').classList.add(ok?'ok':'bad');if(ok)matched++;$('#mScore').textContent='Matched: '+matched+'/'+activity.pairs.length;selected=null;}}}
function renderPairs(){let cards=shuffle(activity.pairs.flatMap((p,i)=>[{pair:i,text:p.left},{pair:i,text:p.right}]));let open=[];let done=new Set();app.innerHTML='<div class="grid cols">'+cards.map((c,i)=>'<button class="card" data-i="'+i+'">?</button>').join('')+'</div>';app.onclick=e=>{if(e.target.tagName!=='BUTTON')return;let idx=+e.target.dataset.i;if(done.has(idx)||open.includes(idx))return;e.target.textContent=cards[idx].text;open.push(idx);if(open.length===2){let [a,b]=open;let ok=cards[a].pair===cards[b].pair;if(ok){done.add(a);done.add(b);document.querySelector('[data-i="'+a+'"]').classList.add('ok');document.querySelector('[data-i="'+b+'"]').classList.add('ok');open=[]}else setTimeout(()=>{document.querySelector('[data-i="'+a+'"]').textContent='?';document.querySelector('[data-i="'+b+'"]').textContent='?';open=[]},800)}}}
function renderSort(){let assign={};let selected=null;app.innerHTML='<h2>Items</h2><div class="bank">'+activity.items.map(item=>'<button data-item="'+item.id+'">'+esc(item.text)+'</button>').join('')+'</div><div class="grid cols">'+activity.categories.map(c=>'<div class="card drop" data-cat="'+esc(c)+'"><h3>'+esc(c)+'</h3></div>').join('')+'</div><button class="primary" id="check">Check</button><p class="score" id="sortScore"></p>';app.onclick=e=>{if(e.target.dataset.item){selected=e.target.dataset.item;document.querySelectorAll('[data-item]').forEach(b=>b.classList.remove('select'));e.target.classList.add('select')}else if(e.target.closest('[data-cat]')&&selected){let drop=e.target.closest('[data-cat]');assign[selected]=drop.dataset.cat;let item=activity.items.find(it=>it.id===selected);drop.insertAdjacentHTML('beforeend','<span class="pill">'+esc(item.text)+'</span>');document.querySelector('[data-item="'+selected+'"]').remove();selected=null}else if(e.target.id==='check'){let right=activity.items.filter(it=>assign[it.id]===it.category).length;$('#sortScore').textContent='Score: '+right+'/'+activity.items.length;}}
}
function renderUnjumble(){app.innerHTML='<div class="grid">'+activity.sentences.map((s,i)=>'<div class="card"><h3>Sentence '+(i+1)+'</h3><div class="bank">'+s.words.map(w=>'<button data-s="'+i+'" data-w="'+esc(w)+'">'+esc(w)+'</button>').join('')+'</div><p class="item" id="built'+i+'"></p><button class="primary" data-check="'+i+'">Check</button><p class="muted" id="ufb'+i+'"></p></div>').join('')+'</div>';let built={};app.onclick=e=>{if(e.target.dataset.w){let i=e.target.dataset.s;built[i]=built[i]||[];built[i].push(e.target.dataset.w);e.target.disabled=true;$('#built'+i).textContent=built[i].join(' ')}if(e.target.dataset.check){let i=e.target.dataset.check;$('#ufb'+i).textContent=((built[i]||[]).join(' ')===activity.sentences[i].text)?'Correct!':'Answer: '+activity.sentences[i].text}}
}
function renderWordsearch(){let size=activity.grid.length;app.innerHTML='<div class="letters" style="grid-template-columns:repeat('+size+',auto)">'+activity.grid.flat().map(l=>'<span>'+l+'</span>').join('')+'</div><h2>Words</h2><div class="bank">'+activity.entries.map(e=>'<button>'+esc(e.word)+(e.clue?' — '+esc(e.clue):'')+'</button>').join('')+'</div>';}
if(templateId==='quiz')renderQuiz();else if(templateId==='cards')renderCards();else if(templateId==='box')renderBox();else if(templateId==='match')renderMatch();else if(templateId==='pairs')renderPairs();else if(templateId==='sort')renderSort();else if(templateId==='unjumble')renderUnjumble();else if(templateId==='wordsearch')renderWordsearch();
</script>
</body>
</html>`;
}
