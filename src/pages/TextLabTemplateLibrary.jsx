import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  TEXTLAB_TEMPLATES,
  buildInteractiveHtml,
  downloadHtml,
  sampleFor,
} from '../utils/textlabInteractive.js';
import '../styles/textlab-proposal-one-immersive.css';

const CATEGORY_ORDER = ['Tất cả', 'Kiểm tra', 'Từ vựng', 'Câu & đoạn văn', 'Ngữ pháp', 'Trò chơi', 'Nói & viết'];
const CATEGORY_META = {
  'Kiểm tra': { color: 'blue', label: 'KIỂM TRA' },
  'Từ vựng': { color: 'green', label: 'TỪ VỰNG' },
  'Câu & đoạn văn': { color: 'orange', label: 'CÂU & ĐOẠN VĂN' },
  'Ngữ pháp': { color: 'violet', label: 'NGỮ PHÁP' },
  'Trò chơi': { color: 'orange', label: 'TRÒ CHƠI' },
  'Nói & viết': { color: 'violet', label: 'NÓI & VIẾT' },
};
const TOP_SHORTCUTS = [
  { type: 'nav', id: 'templates', label: 'Templates', icon: 'templates' },
  { type: 'tab', id: 'blank', label: 'Mẫu trống', icon: 'blank' },
  { type: 'tab', id: 'sample', label: 'Ví dụ hoàn chỉnh', icon: 'sample' },
  { type: 'tab', id: 'guide', label: 'Cách nhập', icon: 'guide' },
  { type: 'nav', id: 'preview', label: 'Live Preview', icon: 'preview' },
  { type: 'action', id: 'download', label: 'Tải HTML', icon: 'download' },
];
const QUICK_GAMES = [
  { id: 'quiz', label: 'Quiz', icon: 'quiz', tone: 'violet' },
  { id: 'match-up', label: 'Matching', icon: 'matching', tone: 'blue' },
  { id: 'word-search', label: 'Word Search', icon: 'wordsearch', tone: 'green' },
  { id: 'hangman', label: 'Hangman', icon: 'hangman', tone: 'orange' },
];
const TEMPLATE_ICON_MAP = {
  quiz: 'quiz', 'true-false': 'truefalse', 'match-up': 'matching', 'matching-pairs': 'matching', 'memory-match': 'memory',
  'find-match': 'matching', 'category-sort': 'sort', 'rank-order': 'order', 'sentence-builder': 'sentence',
  'paragraph-builder': 'paragraph', 'missing-word': 'missing', 'cloze-passage': 'paragraph', 'word-scramble': 'scramble',
  'word-search': 'wordsearch', crossword: 'crossword', hangman: 'hangman', bingo: 'bingo', flashcards: 'cards',
  'spin-selector': 'wheel', 'open-box': 'box', 'flip-tiles': 'cards', 'random-cards': 'cards', 'speaking-cards': 'speaking',
  'evidence-hunt': 'evidence', 'reference-chain': 'reference', 'heading-match': 'heading', 'main-idea': 'idea',
  'sentence-insertion': 'insertion', 'error-correction': 'game', 'summary-builder': 'summary', retelling: 'retelling',
  'creative-ending': 'writing', 'debate-cards': 'debate', 'one-minute-speaking': 'speaking', 'whack-answer': 'game', 'conveyor-memory': 'memory'
};

function Icon({ name, size = 18 }) {
  const common = { width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.9, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true };
  const icons = {
    brand: <><rect x="3" y="3" width="18" height="18" rx="4"/><path d="M8 7h5a3 3 0 0 1 0 6H8z"/><path d="M8 13h6a3 3 0 0 1 0 6H8z"/></>,
    templates: <><rect x="4" y="4" width="6" height="6" rx="1.2"/><rect x="14" y="4" width="6" height="6" rx="1.2"/><rect x="4" y="14" width="6" height="6" rx="1.2"/><rect x="14" y="14" width="6" height="6" rx="1.2"/></>,
    blank: <><path d="M7 3h8l4 4v14H7z"/><path d="M15 3v5h5"/></>,
    sample: <><rect x="4" y="5" width="16" height="14" rx="2"/><path d="M8 9h8M8 13h6"/></>,
    guide: <><path d="M4 5.5A3.5 3.5 0 0 1 7.5 2H11v18H7.5A3.5 3.5 0 0 0 4 23z"/><path d="M20 5.5A3.5 3.5 0 0 0 16.5 2H13v18h3.5A3.5 3.5 0 0 1 20 23z"/></>,
    preview: <><path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6z"/><circle cx="12" cy="12" r="2.5"/></>,
    download: <><path d="M12 4v10"/><path d="m8 10 4 4 4-4"/><path d="M5 20h14"/></>,
    quiz: <><rect x="4" y="3" width="16" height="18" rx="2"/><path d="M8 8h8M8 12h5M8 16h3"/></>,
    matching: <><circle cx="7" cy="8" r="3"/><circle cx="17" cy="16" r="3"/><path d="M9.2 10.2 14.8 13.8"/></>,
    wordsearch: <><rect x="3" y="3" width="14" height="14" rx="2"/><path d="M7 3v14M12 3v14M3 7h14M3 12h14"/><circle cx="17" cy="17" r="4"/><path d="m20 20 2 2"/></>,
    hangman: <><path d="M5 21h12M8 21V4h9M17 4v3"/><circle cx="17" cy="10" r="2.5"/><path d="M17 12.5v5M14 15h6M17 17.5l-2 3M17 17.5l2 3"/></>,
    chevron: <path d="m9 18 6-6-6-6"/>, chevrondown: <path d="m6 9 6 6 6-6"/>, search: <><circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/></>,
    close: <><path d="m7 7 10 10M17 7 7 17"/></>, gear: <><circle cx="12" cy="12" r="3"/><path d="M19 12a7 7 0 0 0-.1-1l2-1.2-2-3.5-2.2.6a7 7 0 0 0-1.8-1l-.3-2.3h-4l-.3 2.3a7 7 0 0 0-1.8 1l-2.2-.6-2 3.5L5.1 11a7 7 0 0 0 0 2l-2 1.2 2 3.5 2.2-.6a7 7 0 0 0 1.8 1l.3 2.3h4l.3-2.3a7 7 0 0 0 1.8-1l2.2.6 2-3.5-2-1.2c.1-.3.1-.7.1-1z"/></>,
    more: <><circle cx="5" cy="12" r="1.3" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="1.3" fill="currentColor" stroke="none"/><circle cx="19" cy="12" r="1.3" fill="currentColor" stroke="none"/></>,
    play: <path d="m8 5 11 7-11 7z"/>, copy: <><rect x="8" y="8" width="11" height="11" rx="2"/><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"/></>,
    upload: <><path d="M12 16V4M7 9l5-5 5 5"/><path d="M5 18v2h14v-2"/></>, save: <><path d="M5 3h12l2 2v16H5z"/><path d="M8 3v5h7V3"/></>,
    external: <><path d="M14 4h6v6"/><path d="M20 4 10 14"/><path d="M18 13v6H5V6h6"/></>, refresh: <><path d="M20 7v5h-5"/><path d="M4 17v-5h5"/><path d="M6 10a7 7 0 0 1 12-2l2 2M18 14a7 7 0 0 1-12 2l-2-2"/></>, fullscreen: <><path d="M8 3H3v5M16 3h5v5M8 21H3v-5M16 21h5v-5"/></>,
    sun: <><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.42 1.42M17.65 17.65l1.42 1.42M2 12h2M20 12h2M4.93 19.07l1.42-1.42M17.65 6.35l1.42-1.42"/></>,
    bell: <><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9"/><path d="M10 21h4"/></>, person: <><circle cx="12" cy="8" r="4"/><path d="M5 20a7 7 0 0 1 14 0"/></>,
    summary: <><path d="M5 5h14M5 9h14M5 13h10M5 17h7"/><path d="m16 16 2 2 3-4"/></>, retelling: <><path d="M4 5h16v14H4z"/><path d="m8 9 3 3-3 3"/></>, debate: <><path d="M4 5h10v8H8l-4 3zM12 10h8v8h-4l-4 3z"/></>, writing: <><path d="m4 20 4.5-1 10-10-3.5-3.5-10 10z"/><path d="m14 6 3.5 3.5"/></>, game: <><path d="M8 8h8a5 5 0 0 1 4.5 7.2l-1.2 2.4a2 2 0 0 1-3.2.5L14 16h-4l-2.1 2.1a2 2 0 0 1-3.2-.5l-1.2-2.4A5 5 0 0 1 8 8z"/></>
  };
  return <svg {...common}>{icons[name] || icons.templates}</svg>;
}

function categoryOf(template) {
  const id = template.id;
  if (['quiz', 'true-false', 'evidence-hunt', 'main-idea', 'reference-chain', 'sentence-insertion', 'whack-answer'].includes(id)) return 'Kiểm tra';
  if (['match-up', 'matching-pairs', 'memory-match', 'find-match', 'word-scramble', 'word-search', 'crossword', 'hangman', 'bingo', 'flashcards', 'flip-tiles', 'conveyor-memory'].includes(id)) return 'Từ vựng';
  if (['category-sort', 'rank-order', 'sentence-builder', 'paragraph-builder', 'missing-word', 'cloze-passage', 'heading-match'].includes(id)) return 'Câu & đoạn văn';
  if (['error-correction'].includes(id)) return 'Ngữ pháp';
  if (['spin-selector', 'open-box', 'random-cards'].includes(id)) return 'Trò chơi';
  return 'Nói & viết';
}
function normalizeSample(template) { return String(sampleFor(template) || '').replace(/\\n/g, '\n'); }
function splitRawContent(raw, fallbackTitle) {
  const normalized = String(raw || '').replace(/\\n/g, '\n');
  const lines = normalized.split(/\r?\n/);
  const titleIndex = lines.findIndex((line) => /^title\s*:/i.test(line.trim()));
  const title = titleIndex >= 0 ? lines[titleIndex].replace(/^title\s*:/i, '').trim() : fallbackTitle;
  const body = lines.filter((_, idx) => idx !== titleIndex).join('\n').replace(/^\s+/, '');
  return { title, body };
}
function filenameFor(template, title) {
  const source = title || template.title || template.id;
  const slug = source.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  return `${slug || template.id}.html`;
}
function guideFor(template) {
  const format = template.format || 'Mỗi dòng là một mục';
  return `Mỗi dòng là một mục. Dùng dấu | để ngăn cách các phần theo cấu trúc: ${format}.`;
}
function formatTime(value) {
  if (!value) return 'Chưa lưu';
  return new Intl.DateTimeFormat('vi-VN', { hour: '2-digit', minute: '2-digit' }).format(value);
}

function escapeStandalone(value = '') {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function buildProposalHangmanHtml(raw) {
  const parsed = splitRawContent(raw, 'Hangman');
  const items = parsed.body
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [word = '', ...clueParts] = line.split('|');
      return {
        word: word.trim().toUpperCase(),
        clue: clueParts.join('|').trim(),
      };
    })
    .filter((item) => item.word);

  const safeItems = items.length ? items : [{ word: 'TEXTLAB', clue: 'A tool for creating interactive learning activities.' }];
  const dataJson = JSON.stringify(safeItems).replace(/</g, '\\u003c');

  return `<!doctype html>
<html lang="vi">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${escapeStandalone(parsed.title)}</title>
<style>
*{box-sizing:border-box}body{margin:0;background:#f5f8fc;color:#10243f;font:16px/1.45 "1FTV HF Gesco","SF Pro Display",Inter,Arial,sans-serif}.game{max-width:920px;margin:auto;padding:22px}.top,.board{border:1px solid #dbe3ec;border-radius:20px;background:#fff;box-shadow:0 16px 36px rgba(20,43,69,.09)}.top{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:16px 18px;margin-bottom:16px}.top small{display:block;color:#6b7c90;font-weight:800}.top strong{font-size:24px}.score{padding:8px 13px;border-radius:999px;background:#edf5ff;color:#2b69bf;font-weight:900}.board{display:grid;grid-template-columns:280px minmax(0,1fr);gap:24px;padding:22px}.stage{display:grid;justify-items:center;align-content:center;gap:14px;padding:8px;border-radius:18px;background:linear-gradient(180deg,#fbfdff,#f4f8fc)}.figure{width:245px;height:245px}.gallows{fill:none;stroke:#23384f;stroke-width:4.5;stroke-linecap:round;stroke-linejoin:round}.part{fill:none;stroke:#dc4e65;stroke-width:5.5;stroke-linecap:round;stroke-linejoin:round;opacity:.08;transition:opacity .25s ease,filter .25s ease}.part.show{opacity:1;filter:drop-shadow(0 4px 5px rgba(220,78,101,.18))}.hearts{display:flex;gap:8px;justify-content:center;flex-wrap:wrap}.heart{font-size:23px;line-height:1}.heart.alive{color:#ff5268}.heart.lost{color:#d7dee7;transform:scale(.86)}.content{display:grid;align-content:center;gap:15px;min-width:0}.clue-card{padding:15px 17px;border:1px solid #e0e7ef;border-radius:16px;background:#fbfdff}.clue-label{display:inline-flex;align-items:center;min-height:29px;padding:0 11px;border-radius:999px;background:#f1ebff;color:#7352c9;font-size:12px;font-weight:900}.clue{margin:9px 0 0;color:#334a62;font-size:18px;font-weight:750}.mask{overflow-wrap:anywhere;padding:4px 0;font-size:clamp(30px,5vw,48px);font-weight:950;letter-spacing:.18em}.lives{font-weight:850;color:#4a6077}.letters{display:grid;grid-template-columns:repeat(13,minmax(0,1fr));gap:7px}.letter{min-width:0;min-height:43px;padding:0;border:2px solid #d9e2ec;border-radius:11px;background:#fff;color:#2e4863;font:inherit;font-weight:900;cursor:pointer;transition:.16s}.letter:hover:not(:disabled){transform:translateY(-2px);border-color:#8aadd2}.letter.correct{background:#e8f8ef;border-color:#2bad69;color:#147342}.letter.wrong{background:#fff0f2;border-color:#ee98a8;color:#c74a62}.letter:disabled{cursor:default}.summary{position:fixed;inset:0;display:grid;place-items:center;padding:20px;background:rgba(8,26,46,.68)}.summary-card{width:min(520px,100%);padding:28px;border:2px solid #10243f;border-radius:24px;background:#fff;text-align:center;box-shadow:0 14px 0 #10243f}.summary-card h2{font-size:38px;margin:8px 0}.summary-card button{min-height:44px;padding:0 18px;border:0;border-radius:999px;background:#082b58;color:#fff;font:inherit;font-weight:900;cursor:pointer}@media(max-width:720px){.game{padding:10px}.board{grid-template-columns:1fr}.figure{width:205px;height:205px}.letters{grid-template-columns:repeat(7,minmax(0,1fr))}}
</style>
</head>
<body>
<main class="game">
  <header class="top"><div><small>BRIAN TEXTLAB · HANGMAN</small><strong>${escapeStandalone(parsed.title)}</strong></div><span id="score" class="score">Điểm 0</span></header>
  <section class="board">
    <div class="stage">
      <svg viewBox="0 0 250 250" class="figure" aria-label="Nhân vật Hangman">
        <path d="M25 224h140M54 224V28h104M54 28h130M158 28v27" class="gallows"/>
        <circle cx="158" cy="79" r="19" class="part part-1"/>
        <path d="M158 98v51" class="part part-2"/>
        <path d="M158 113l-29 22" class="part part-3"/>
        <path d="M158 113l29 22" class="part part-4"/>
        <path d="M158 149l-23 36" class="part part-5"/>
        <path d="M158 149l23 36" class="part part-6"/>
      </svg>
      <div id="hearts" class="hearts"></div>
    </div>
    <div class="content">
      <div class="clue-card"><span class="clue-label">Gợi ý</span><p id="clue" class="clue"></p></div>
      <div id="mask" class="mask"></div>
      <div id="lives" class="lives"></div>
      <div id="letters" class="letters"></div>
    </div>
  </section>
</main>
<script>
const WORDS=${dataJson};
let index=0,score=0,lives=6,found=new Set();
const alphabet='ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
const parts=()=>[...document.querySelectorAll('.part')];
function renderHearts(){const box=document.getElementById('hearts');box.innerHTML='';for(let i=0;i<6;i++){const el=document.createElement('span');el.className='heart '+(i<lives?'alive':'lost');el.textContent='❤';box.appendChild(el)}}
function renderFigure(){const lost=6-lives;parts().forEach((part,i)=>part.classList.toggle('show',i<lost))}
function mask(word){return [...word].map(char=>char===' '?' ':found.has(char)?char:'_').join(' ')}
function finish(){document.body.insertAdjacentHTML('beforeend','<div class="summary"><section class="summary-card"><div style="font-size:62px">🏆</div><h2>Hoàn thành!</h2><p>Bạn đoán đúng <strong>'+score+'/'+WORDS.length+'</strong> từ.</p><button onclick="location.reload()">Chơi lại</button></section></div>')}
function next(){index++;if(index>=WORDS.length){finish();return}lives=6;found=new Set();render()}
function guess(letter,button){if(button.disabled)return;button.disabled=true;const word=WORDS[index].word;if(word.includes(letter)){found.add(letter);button.classList.add('correct')}else{lives=Math.max(0,lives-1);button.classList.add('wrong')}document.getElementById('mask').textContent=mask(word);document.getElementById('lives').textContent='Lượt sai còn lại: '+lives;renderHearts();renderFigure();if([...word].every(char=>char===' '||found.has(char))){score++;document.getElementById('score').textContent='Điểm '+score;setTimeout(next,650)}else if(lives<=0){setTimeout(next,850)}}
function render(){const item=WORDS[index];document.getElementById('clue').textContent=item.clue||'Không có gợi ý';document.getElementById('mask').textContent=mask(item.word);document.getElementById('lives').textContent='Lượt sai còn lại: '+lives;document.getElementById('score').textContent='Điểm '+score;renderHearts();renderFigure();const area=document.getElementById('letters');area.innerHTML='';alphabet.forEach(letter=>{const button=document.createElement('button');button.className='letter';button.textContent=letter;button.onclick=()=>guess(letter,button);area.appendChild(button)})}
render();
<\/script>
</body>
</html>`;
}

function LibraryCard({ template, selected, onSelect }) {
  const category = categoryOf(template);
  const meta = CATEGORY_META[category] || CATEGORY_META['Từ vựng'];
  return (
    <button type="button" className={`p1-card ${selected ? 'is-selected' : ''}`} onClick={() => onSelect(template.id)}>
      <span className={`p1-card-icon is-${meta.color}`}><Icon name={TEMPLATE_ICON_MAP[template.id] || 'templates'} size={22} /></span>
      <span className="p1-card-copy">
        <strong>{template.titleVi || template.title}</strong>
        <small>{template.title}</small>
        <em>Mẫu #{template.index || 0}</em>
      </span>
      <span className="p1-card-arrow"><Icon name="chevron" size={16} /></span>
    </button>
  );
}

export default function TextLabTemplateLibrary() {
  const defaultTemplate = TEXTLAB_TEMPLATES.find((item) => item.id === 'hangman') || TEXTLAB_TEMPLATES[0];
  const [selectedId, setSelectedId] = useState(() => {
    try { return localStorage.getItem('brian-textlab-selected-template') || defaultTemplate.id; } catch { return defaultTemplate.id; }
  });
  const selected = TEXTLAB_TEMPLATES.find((item) => item.id === selectedId) || defaultTemplate;
  const initial = useMemo(() => splitRawContent(normalizeSample(selected), selected.title), []);
  const [title, setTitle] = useState(initial.title);
  const [body, setBody] = useState(initial.body);
  const [instructions, setInstructions] = useState(guideFor(selected));
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('Tất cả');
  const [activeTab, setActiveTab] = useState('content');
  const [previewKey, setPreviewKey] = useState(0);
  const [savedAt, setSavedAt] = useState(null);
  const [toast, setToast] = useState('');
  const [showSettings, setShowSettings] = useState(false);
  const [showMore, setShowMore] = useState(false);
  const [autoSave, setAutoSave] = useState(true);

  const libraryRef = useRef(null);
  const previewRef = useRef(null);
  const iframeRef = useRef(null);
  const importRef = useRef(null);
  const draftKey = `brian-textlab-proposal1:${selected.id}`;

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    const previousBackground = document.body.style.background;
    document.body.style.overflow = 'hidden';
    document.body.style.background = '#f7f2e8';
    document.documentElement.classList.add('textlab-immersive-active');
    return () => {
      document.body.style.overflow = previousOverflow;
      document.body.style.background = previousBackground;
      document.documentElement.classList.remove('textlab-immersive-active');
    };
  }, []);

  useEffect(() => {
    const sample = splitRawContent(normalizeSample(selected), selected.title);
    let restored = null;
    try {
      const raw = localStorage.getItem(draftKey);
      if (raw) restored = JSON.parse(raw);
      localStorage.setItem('brian-textlab-selected-template', selected.id);
    } catch {}
    setTitle(restored?.title || sample.title);
    setBody(restored?.body || sample.body);
    setInstructions(restored?.instructions || guideFor(selected));
    setSavedAt(restored?.savedAt ? new Date(restored.savedAt) : null);
    setActiveTab('content');
    setPreviewKey((x) => x + 1);
    setShowSettings(false); setShowMore(false);
  }, [selected.id]);

  useEffect(() => {
    if (!autoSave) return undefined;
    const timer = window.setTimeout(() => {
      const now = new Date();
      try {
        localStorage.setItem(draftKey, JSON.stringify({ title, body, instructions, savedAt: now.toISOString() }));
        setSavedAt(now);
      } catch {}
    }, 600);
    return () => window.clearTimeout(timer);
  }, [autoSave, draftKey, title, body, instructions]);

  useEffect(() => {
    if (!toast) return undefined;
    const timer = window.setTimeout(() => setToast(''), 2200);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const rawContent = useMemo(() => `TITLE: ${title.trim() || selected.title}\n\n${body.trim()}`, [title, body, selected.title]);
  const interactiveHtml = useMemo(
    () => selected.id === 'hangman' ? buildProposalHangmanHtml(rawContent) : buildInteractiveHtml(selected, rawContent),
    [selected, rawContent, previewKey],
  );

  const filteredTemplates = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return TEXTLAB_TEMPLATES.filter((template) => {
      const categoryMatch = category === 'Tất cả' || categoryOf(template) === category;
      const searchHaystack = `${template.title} ${template.titleVi || ''} ${categoryOf(template)}`.toLowerCase();
      return categoryMatch && (!needle || searchHaystack.includes(needle));
    });
  }, [query, category]);

  const groupedTemplates = useMemo(() => CATEGORY_ORDER.slice(1).map((group) => ({ group, items: filteredTemplates.filter((item) => categoryOf(item) === group) })).filter((entry) => entry.items.length), [filteredTemplates]);

  const tabContent = {
    blank: `TITLE: Tên hoạt động\n\n${selected.format || 'ITEM 1\nITEM 2'}`,
    sample: normalizeSample(selected),
    guide: `${guideFor(selected)}\n\nVí dụ:\n${normalizeSample(selected)}`,
  };

  const scrollToPreview = () => {
    const node = previewRef.current;
    if (!node) return;
    node.classList.add('is-highlighted');
    window.setTimeout(() => node.classList.remove('is-highlighted'), 720);
  };
  const chooseQuick = (id) => {
    const match = TEXTLAB_TEMPLATES.find((item) => item.id === id); if (!match) return;
    setSelectedId(match.id); setTimeout(() => scrollToPreview(), 120);
  };
  const saveDraft = () => {
    const now = new Date();
    try {
      localStorage.setItem(draftKey, JSON.stringify({ title, body, instructions, savedAt: now.toISOString() }));
      setSavedAt(now); setToast('Đã lưu bản nháp');
    } catch { setToast('Không thể lưu bản nháp'); }
  };
  const resetToSample = () => {
    const sample = splitRawContent(normalizeSample(selected), selected.title);
    setTitle(sample.title); setBody(sample.body); setInstructions(guideFor(selected)); setPreviewKey((x) => x + 1); setToast('Đã khôi phục ví dụ hoàn chỉnh');
  };
  const openPreview = () => {
    const win = window.open('', '_blank', 'noopener,noreferrer');
    if (!win) { setToast('Trình duyệt đang chặn cửa sổ mới'); return; }
    win.document.open(); win.document.write(interactiveHtml); win.document.close();
  };
  const copyText = async (value, message) => {
    try { await navigator.clipboard.writeText(value); setToast(message); }
    catch {
      const area = document.createElement('textarea'); area.value = value; area.style.position = 'fixed'; area.style.opacity = '0'; document.body.appendChild(area); area.select(); document.execCommand('copy'); area.remove(); setToast(message);
    }
  };
  const importData = (event) => {
    const file = event.target.files?.[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = () => { const parsed = splitRawContent(String(reader.result || ''), file.name.replace(/\.[^.]+$/, '')); setTitle(parsed.title); setBody(parsed.body); setPreviewKey((x) => x + 1); setToast(`Đã nhập ${file.name}`); };
    reader.onerror = () => setToast('Không thể đọc tệp');
    reader.readAsText(file); event.target.value = '';
  };

  return (
    <div className="proposal-one-page">
      {toast && <div className="p1-toast">{toast}</div>}
      <div className="p1-topbar">
        <button type="button" className="p1-brand-box" onClick={() => { window.location.hash = '#/apps'; }} title="Trở về ứng dụng Brian">
          <span className="p1-brand-mark"><Icon name="brand" size={26} /></span>
          <span className="p1-brand-copy">
            <strong>Brian TextLab · No AI</strong>
            <small>Interactive HTML Studio</small>
          </span>
        </button>

        <div className="p1-shortcut-row">
          {TOP_SHORTCUTS.map((item) => (
            <button key={item.id} type="button" className="p1-shortcut-button" onClick={() => {
              if (item.type === 'tab') setActiveTab(item.id);
              if (item.id === 'templates') libraryRef.current?.querySelector('.p1-search-box input')?.focus();
              if (item.id === 'preview') scrollToPreview();
              if (item.id === 'download') downloadHtml(filenameFor(selected, title), interactiveHtml);
            }}>
              <Icon name={item.icon} /><span>{item.label}</span>
            </button>
          ))}
          {QUICK_GAMES.map((game) => (
            <button key={game.id} type="button" className={`p1-shortcut-button is-${game.tone}`} onClick={() => chooseQuick(game.id)}>
              <Icon name={game.icon} /><span>{game.label}</span>
            </button>
          ))}
        </div>

        <div className="p1-account-box">
          <button type="button" className="p1-circle-icon"><Icon name="sun" /></button>
          <button type="button" className="p1-circle-icon"><Icon name="bell" /></button>
          <button type="button" className="p1-profile-button"><span className="p1-avatar"><Icon name="person" size={16} /></span><span><strong>Brian English</strong><small>Giáo viên</small></span><Icon name="chevrondown" size={16} /></button>
        </div>
      </div>

      <div className="p1-layout">
        <aside className="p1-sidebar" ref={libraryRef}>
          <div className="p1-sidebar-header">
            <h2>Thư viện mẫu</h2>
            <p>Chọn mẫu, nhập nội dung và tạo hoạt động học tập tương tác.</p>
          </div>
          <label className="p1-search-box">
            <Icon name="search" />
            <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Tìm template..." />
            {query && <button type="button" onClick={() => setQuery('')}><Icon name="close" size={14} /></button>}
          </label>
          <div className="p1-filter-row">
            {CATEGORY_ORDER.map((item) => (
              <button key={item} type="button" className={category === item ? 'is-active' : ''} onClick={() => setCategory(item)}>{item}</button>
            ))}
          </div>

          <div className="p1-sidebar-groups">
            {groupedTemplates.map(({ group, items }) => (
              <section key={group} className="p1-group">
                <h3>{(CATEGORY_META[group]?.label || group)}</h3>
                <div className="p1-group-list">
                  {items.map((template) => <LibraryCard key={template.id} template={template} selected={template.id === selected.id} onSelect={setSelectedId} />)}
                </div>
              </section>
            ))}
          </div>
          <button type="button" className="p1-view-all" onClick={() => { setCategory('Tất cả'); setQuery(''); libraryRef.current?.querySelector('.p1-sidebar-groups')?.scrollTo({ top: 0, behavior: 'smooth' }); }}>{`Xem tất cả ${TEXTLAB_TEMPLATES.length} template`} <Icon name="chevron" size={16} /></button>
        </aside>

        <section className="p1-main">
          <div className="p1-main-header">
            <div className="p1-main-title">
              <div className="p1-status-line"><span className="p1-status-dot" />Đang chỉnh sửa</div>
              <h1>{selected.title}</h1>
              <div className="p1-meta-line">
                <span>Loại hoạt động:</span><b className="p1-pill violet">{categoryOf(selected).toUpperCase()}</b>
                <span>Định dạng:</span><b className="p1-pill blue">{selected.format || 'TEXT'}</b>
              </div>
            </div>
            <div className="p1-header-actions">
              <span className="p1-save-info">Đã lưu {savedAt ? formatTime(savedAt) : 'gần đây'}</span>
              <div className="p1-menu-wrap">
                <button type="button" className="p1-mini-button" onClick={() => { setShowSettings(!showSettings); setShowMore(false); }}><Icon name="gear" /></button>
                {showSettings && <div className="p1-popover"><label className="p1-switch"><input type="checkbox" checked={autoSave} onChange={(e) => setAutoSave(e.target.checked)} /><span />Tự động lưu</label><button type="button" onClick={resetToSample}>Khôi phục ví dụ</button></div>}
              </div>
              <div className="p1-menu-wrap">
                <button type="button" className="p1-mini-button" onClick={() => { setShowMore(!showMore); setShowSettings(false); }}><Icon name="more" /></button>
                {showMore && <div className="p1-popover"><button type="button" onClick={() => copyText(rawContent, 'Đã sao chép nội dung')}>Sao chép nội dung</button><button type="button" onClick={() => copyText(interactiveHtml, 'Đã sao chép HTML')}>Sao chép HTML</button></div>}
              </div>
              <button type="button" className="p1-create-button" onClick={() => { setPreviewKey((x) => x + 1); scrollToPreview(); }}><Icon name="play" />Tạo hoạt động</button>
            </div>
          </div>

          <div className="p1-work-grid">
            <div className="p1-editor-panel">
              <div className="p1-tabs">
                <button type="button" className={activeTab === 'content' ? 'is-active' : ''} onClick={() => setActiveTab('content')}><Icon name="writing" />Nội dung</button>
                <button type="button" className={activeTab === 'blank' ? 'is-active' : ''} onClick={() => setActiveTab('blank')}><Icon name="blank" />Mẫu trống</button>
                <button type="button" className={activeTab === 'sample' ? 'is-active' : ''} onClick={() => setActiveTab('sample')}><Icon name="sample" />Ví dụ hoàn chỉnh</button>
                <button type="button" className={activeTab === 'guide' ? 'is-active' : ''} onClick={() => setActiveTab('guide')}><Icon name="guide" />Cách nhập</button>
              </div>
              {activeTab === 'content' ? (
                <div className="p1-editor-form">
                  <label><span>Tiêu đề hoạt động</span><input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Nhập tiêu đề..." /></label>
                  <label><span>Hướng dẫn <em>(không bắt buộc)</em><small>{instructions.length}/200</small></span><textarea className="p1-instructions" maxLength={200} value={instructions} onChange={(e) => setInstructions(e.target.value)} /></label>
                  <label><span>Chủ đề / Danh mục</span><div className="p1-topic-box"><span className="p1-topic-chip">{selected.titleVi || selected.title}</span><Icon name="chevrondown" size={16} /></div></label>
                  <label><span>Danh sách từ và gợi ý <em>Mỗi dòng: {selected.format || 'ITEM'}</em></span><textarea className="p1-content" spellCheck={false} value={body} onChange={(e) => setBody(e.target.value)} /></label>
                  <div className="p1-editor-actions">
                    <input type="file" hidden ref={importRef} accept=".txt,.csv,text/plain,text/csv" onChange={importData} />
                    <button type="button" className="p1-outline-button" onClick={() => importRef.current?.click()}><Icon name="upload" />Nhập dữ liệu (CSV / TXT)</button>
                    <div className="p1-editor-actions-right">
                      <button type="button" className="p1-outline-button" onClick={saveDraft}><Icon name="save" />Lưu nháp</button>
                      <button type="button" className="p1-create-button" onClick={() => { setPreviewKey((x) => x + 1); scrollToPreview(); }}><Icon name="play" />Tạo hoạt động</button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p1-reference-panel">
                  <div className="p1-reference-head"><span>{activeTab === 'blank' ? 'Mẫu trống' : activeTab === 'sample' ? 'Ví dụ hoàn chỉnh' : 'Cách nhập'}</span><button type="button" onClick={() => copyText(tabContent[activeTab], 'Đã sao chép nội dung mẫu')}><Icon name="copy" />Sao chép</button></div>
                  <pre>{tabContent[activeTab]}</pre>
                  <div className="p1-reference-actions"><button type="button" className="p1-outline-button" onClick={() => { const parsed = splitRawContent(tabContent[activeTab], selected.title); setTitle(parsed.title); setBody(parsed.body); setActiveTab('content'); setPreviewKey((x) => x + 1); }}>Dùng nội dung này</button></div>
                </div>
              )}
            </div>

            <div className="p1-preview-panel" ref={previewRef}>
              <div className="p1-preview-head"><div><small>Live Preview</small><h3>Hoạt động tương tác trực tiếp</h3></div><button type="button" className="p1-open-link" onClick={openPreview}><Icon name="external" /></button></div>
              <div className="p1-preview-box"><iframe key={previewKey} ref={iframeRef} title={`Preview ${selected.title}`} srcDoc={interactiveHtml} sandbox="allow-scripts allow-forms allow-modals allow-popups allow-downloads" /></div>
              <div className="p1-preview-controls">
                <button type="button" className="p1-preview-button" onClick={() => setPreviewKey((x) => x + 1)}><Icon name="refresh" />Chạy lại</button>
                <button type="button" className="p1-preview-button" onClick={openPreview}><Icon name="external" />Mở riêng</button>
                <button type="button" className="p1-preview-button" onClick={() => iframeRef.current?.requestFullscreen?.()}><Icon name="fullscreen" />Toàn màn hình</button>
                <button type="button" className="p1-preview-button is-download" onClick={() => downloadHtml(filenameFor(selected, title), interactiveHtml)}><Icon name="download" />Tải HTML</button>
              </div>
              <div className="p1-preview-footer"><span><strong>i</strong> Bạn có thể chỉnh sửa nội dung ở bên trái. Live Preview sẽ cập nhật ngay lập tức.</span><button type="button" onClick={openPreview}>Mở trong tab mới <Icon name="external" size={14} /></button></div>
            </div>
          </div>
        </section>
      </div>
      <div className="p1-bottom-status"><span><span className="p1-status-dot" /> Sẵn sàng</span><span>Dữ liệu được lưu trên thiết bị này</span><span>Không sử dụng AI</span><span>Hoạt động ngoại tuyến 100%</span></div>
    </div>
  );
}
