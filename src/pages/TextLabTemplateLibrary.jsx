import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  TEXTLAB_TEMPLATES,
  buildInteractiveHtml,
  downloadHtml,
  sampleFor,
} from '../utils/textlabInteractive.js';
import '../styles/textlab-proposal-one.css';

const CATEGORY_ORDER = [
  'Tất cả',
  'Kiểm tra',
  'Từ vựng',
  'Câu & đoạn văn',
  'Ngữ pháp',
  'Trò chơi',
  'Nói & viết',
];

const QUICK_ACTIVITY_IDS = [
  { id: 'quiz', label: 'Quiz', tone: 'violet', icon: 'quiz' },
  { id: 'match-up', label: 'Matching', tone: 'blue', icon: 'matching' },
  { id: 'word-search', label: 'Word Search', tone: 'green', icon: 'wordsearch' },
  { id: 'hangman', label: 'Hangman', tone: 'orange', icon: 'hangman' },
];

const CATEGORY_META = {
  'Kiểm tra': { icon: 'quiz', tone: 'blue' },
  'Từ vựng': { icon: 'vocabulary', tone: 'green' },
  'Câu & đoạn văn': { icon: 'paragraph', tone: 'orange' },
  'Ngữ pháp': { icon: 'grammar', tone: 'violet' },
  'Trò chơi': { icon: 'game', tone: 'orange' },
  'Nói & viết': { icon: 'writing', tone: 'violet' },
};

const TEMPLATE_ICON_MAP = {
  quiz: 'quiz',
  'true-false': 'truefalse',
  'match-up': 'matching',
  'matching-pairs': 'matching',
  'memory-match': 'memory',
  'find-match': 'matching',
  'category-sort': 'sort',
  'rank-order': 'order',
  'sentence-builder': 'sentence',
  'paragraph-builder': 'paragraph',
  'missing-word': 'missing',
  'cloze-passage': 'paragraph',
  'word-scramble': 'scramble',
  'word-search': 'wordsearch',
  crossword: 'crossword',
  hangman: 'hangman',
  bingo: 'bingo',
  flashcards: 'cards',
  'spin-selector': 'wheel',
  'open-box': 'box',
  'flip-tiles': 'cards',
  'random-cards': 'cards',
  'speaking-cards': 'speaking',
  'evidence-hunt': 'evidence',
  'reference-chain': 'reference',
  'heading-match': 'heading',
  'main-idea': 'idea',
  'sentence-insertion': 'insertion',
  'error-correction': 'grammar',
  'summary-builder': 'summary',
  retelling: 'retelling',
  'creative-ending': 'writing',
  'debate-cards': 'debate',
  'one-minute-speaking': 'speaking',
  'whack-answer': 'game',
  'conveyor-memory': 'memory',
};

function Icon({ name, size = 20, strokeWidth = 1.8 }) {
  const common = {
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth,
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
    'aria-hidden': true,
  };

  const paths = {
    brand: (
      <>
        <path d="M7 4h7.2a4 4 0 0 1 0 8H7z" />
        <path d="M7 12h8a4 4 0 0 1 0 8H7z" />
        <path d="M7 4v16" />
      </>
    ),
    templates: (
      <>
        <rect x="3" y="3" width="7" height="7" rx="1.5" />
        <rect x="14" y="3" width="7" height="7" rx="1.5" />
        <rect x="3" y="14" width="7" height="7" rx="1.5" />
        <rect x="14" y="14" width="7" height="7" rx="1.5" />
      </>
    ),
    blank: (
      <>
        <path d="M7 3h7l4 4v14H7z" />
        <path d="M14 3v5h5" />
        <path d="M10 13h5M10 17h4" />
      </>
    ),
    sample: (
      <>
        <rect x="4" y="5" width="16" height="15" rx="2.5" />
        <path d="M8 3v4M16 3v4M8 11h8M8 15h5" />
      </>
    ),
    guide: (
      <>
        <path d="M4 5.5A3.5 3.5 0 0 1 7.5 2H11v17H7.5A3.5 3.5 0 0 0 4 22z" />
        <path d="M20 5.5A3.5 3.5 0 0 0 16.5 2H13v17h3.5A3.5 3.5 0 0 1 20 22z" />
      </>
    ),
    preview: (
      <>
        <path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6z" />
        <circle cx="12" cy="12" r="2.5" />
      </>
    ),
    download: (
      <>
        <path d="M12 3v12" />
        <path d="m7.5 10.5 4.5 4.5 4.5-4.5" />
        <path d="M5 20h14" />
      </>
    ),
    quiz: (
      <>
        <rect x="4" y="3" width="16" height="18" rx="2.5" />
        <path d="M8 8h8M8 12h5M8 16h3" />
        <path d="m15.5 15.5 1.3 1.3 2.7-3" />
      </>
    ),
    matching: (
      <>
        <circle cx="7" cy="7" r="3" />
        <circle cx="17" cy="17" r="3" />
        <path d="M9.2 9.2 14.8 14.8M14 6h4v4M10 18H6v-4" />
      </>
    ),
    wordsearch: (
      <>
        <rect x="3" y="3" width="14" height="14" rx="2" />
        <path d="M7 3v14M12 3v14M3 7h14M3 12h14" />
        <circle cx="16.5" cy="16.5" r="3.5" />
        <path d="m19 19 2 2" />
      </>
    ),
    hangman: (
      <>
        <path d="M5 21h12M8 21V3h9M17 3v3" />
        <circle cx="17" cy="9" r="2.5" />
        <path d="M17 11.5v5M14 14h6M17 16.5l-2 3M17 16.5l2 3" />
      </>
    ),
    sun: (
      <>
        <circle cx="12" cy="12" r="4" />
        <path d="M12 2v2M12 20v2M4.93 4.93l1.42 1.42M17.65 17.65l1.42 1.42M2 12h2M20 12h2M4.93 19.07l1.42-1.42M17.65 6.35l1.42-1.42" />
      </>
    ),
    bell: (
      <>
        <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" />
        <path d="M10 21h4" />
      </>
    ),
    chevron: <path d="m9 18 6-6-6-6" />,
    chevrondown: <path d="m6 9 6 6 6-6" />,
    search: (
      <>
        <circle cx="11" cy="11" r="7" />
        <path d="m20 20-4-4" />
      </>
    ),
    filter: (
      <>
        <path d="M4 6h16M7 12h10M10 18h4" />
      </>
    ),
    settings: (
      <>
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.7 1.7 0 0 0 .34 1.88l.06.06-2.83 2.83-.06-.06A1.7 1.7 0 0 0 15 19.4a1.7 1.7 0 0 0-1 .6 1.7 1.7 0 0 0-.4 1.1V21h-4v-.09A1.7 1.7 0 0 0 8.5 19.4a1.7 1.7 0 0 0-1.88.34l-.06.06-2.83-2.83.06-.06A1.7 1.7 0 0 0 4.6 15a1.7 1.7 0 0 0-.6-1 1.7 1.7 0 0 0-1.1-.4H3v-4h.09A1.7 1.7 0 0 0 4.6 8.5a1.7 1.7 0 0 0-.34-1.88l-.06-.06 2.83-2.83.06.06A1.7 1.7 0 0 0 9 4.6a1.7 1.7 0 0 0 1-.6 1.7 1.7 0 0 0 .4-1.1V3h4v.09A1.7 1.7 0 0 0 15.5 4.6a1.7 1.7 0 0 0 1.88-.34l.06-.06 2.83 2.83-.06.06A1.7 1.7 0 0 0 19.4 9c.16.38.38.72.66 1 .3.28.68.44 1.1.4H21v4h-.09A1.7 1.7 0 0 0 19.4 15z" />
      </>
    ),
    more: (
      <>
        <circle cx="5" cy="12" r="1" fill="currentColor" stroke="none" />
        <circle cx="12" cy="12" r="1" fill="currentColor" stroke="none" />
        <circle cx="19" cy="12" r="1" fill="currentColor" stroke="none" />
      </>
    ),
    play: <path d="m8 5 11 7-11 7z" />,
    copy: (
      <>
        <rect x="8" y="8" width="11" height="11" rx="2" />
        <path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2" />
      </>
    ),
    upload: (
      <>
        <path d="M12 16V4M7 9l5-5 5 5" />
        <path d="M5 14v6h14v-6" />
      </>
    ),
    save: (
      <>
        <path d="M5 3h12l2 2v16H5z" />
        <path d="M8 3v6h8V3M8 21v-7h8v7" />
      </>
    ),
    external: (
      <>
        <path d="M14 4h6v6M20 4l-9 9" />
        <path d="M18 13v6H5V6h6" />
      </>
    ),
    refresh: (
      <>
        <path d="M20 7v5h-5" />
        <path d="M4 17v-5h5" />
        <path d="M6.1 9A7 7 0 0 1 18 6l2 2M18 15a7 7 0 0 1-12 3l-2-2" />
      </>
    ),
    fullscreen: (
      <>
        <path d="M8 3H3v5M16 3h5v5M8 21H3v-5M16 21h5v-5" />
      </>
    ),
    clock: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v5l3 2" />
      </>
    ),
    close: (
      <>
        <path d="m7 7 10 10M17 7 7 17" />
      </>
    ),
    reset: (
      <>
        <path d="M4 4v6h6" />
        <path d="M5.5 15a8 8 0 1 0 .5-7L4 10" />
      </>
    ),
    vocabulary: (
      <>
        <path d="M4 5h7v14H4zM13 5h7v14h-7z" />
        <path d="M7 9h1M7 13h1M16 9h1M16 13h1" />
      </>
    ),
    paragraph: (
      <>
        <path d="M5 5h14M5 9h14M5 13h10M5 17h12" />
      </>
    ),
    grammar: (
      <>
        <path d="M5 5h14M8 5v14M5 19h6M14 9h5M16.5 9v10" />
      </>
    ),
    game: (
      <>
        <path d="M8 8h8a5 5 0 0 1 4.5 7.2l-1.2 2.4a2 2 0 0 1-3.2.5L14 16h-4l-2.1 2.1a2 2 0 0 1-3.2-.5l-1.2-2.4A5 5 0 0 1 8 8z" />
        <path d="M8 11v4M6 13h4M16 12h.01M18 14h.01" />
      </>
    ),
    writing: (
      <>
        <path d="m4 20 4.5-1 10-10-3.5-3.5-10 10z" />
        <path d="m14 6 3.5 3.5M4 20h5" />
      </>
    ),
    truefalse: (
      <>
        <path d="m4 12 4 4L18 6" />
        <path d="m15 15 5 5M20 15l-5 5" />
      </>
    ),
    memory: (
      <>
        <rect x="3" y="5" width="8" height="12" rx="2" />
        <rect x="13" y="7" width="8" height="12" rx="2" />
      </>
    ),
    sort: (
      <>
        <path d="M8 6h12M8 12h8M8 18h4" />
        <path d="m4 4 2 2-2 2M4 10l2 2-2 2M4 16l2 2-2 2" />
      </>
    ),
    order: (
      <>
        <path d="M8 6h12M8 12h12M8 18h12" />
        <path d="M4 5h1v3M4 11h2l-2 3h2M4 17h2v3H4" />
      </>
    ),
    sentence: (
      <>
        <path d="M4 6h5v5H4zM10 13h5v5h-5zM16 6h4v5h-4z" />
        <path d="m9 8.5 7 0M12.5 11v2" />
      </>
    ),
    missing: (
      <>
        <path d="M4 7h6M14 7h6M4 17h6M14 17h6" />
        <path d="M12 4v16" strokeDasharray="2 3" />
      </>
    ),
    scramble: (
      <>
        <rect x="3" y="4" width="7" height="7" rx="1.5" />
        <rect x="14" y="13" width="7" height="7" rx="1.5" />
        <path d="m7 7 10 10M14 7h6M17 4l3 3-3 3M10 17H4M7 14l-3 3 3 3" />
      </>
    ),
    crossword: (
      <>
        <rect x="3" y="3" width="18" height="18" rx="2" />
        <path d="M9 3v18M15 3v18M3 9h18M3 15h18" />
      </>
    ),
    bingo: (
      <>
        <rect x="3" y="3" width="18" height="18" rx="2" />
        <path d="M9 3v18M15 3v18M3 9h18M3 15h18" />
        <path d="m10 12 1.5 1.5L15 10" />
      </>
    ),
    cards: (
      <>
        <rect x="5" y="4" width="14" height="16" rx="2" />
        <path d="M8 8h8M8 12h5" />
      </>
    ),
    wheel: (
      <>
        <circle cx="12" cy="12" r="8" />
        <path d="M12 4v8l6 4M12 12 6 6" />
      </>
    ),
    box: (
      <>
        <path d="M4 8h16v12H4zM3 5h18v3H3zM12 5v15" />
      </>
    ),
    speaking: (
      <>
        <path d="M12 3a4 4 0 0 1 4 4v5a4 4 0 0 1-8 0V7a4 4 0 0 1 4-4z" />
        <path d="M5 11v1a7 7 0 0 0 14 0v-1M12 19v3M8 22h8" />
      </>
    ),
    evidence: (
      <>
        <path d="M4 4h12v16H4z" />
        <circle cx="16" cy="15" r="4" />
        <path d="m19 18 2 2M7 8h6M7 12h4" />
      </>
    ),
    reference: (
      <>
        <path d="M8 7h8M8 12h8M8 17h5" />
        <path d="m4 7 1.5 1.5L7 6M4 12l1.5 1.5L7 11M4 17l1.5 1.5L7 16" />
      </>
    ),
    heading: (
      <>
        <path d="M5 5v14M19 5v14M5 12h14" />
      </>
    ),
    idea: (
      <>
        <path d="M9 18h6M10 22h4" />
        <path d="M8 14a6 6 0 1 1 8 0c-1.2.8-1.6 1.5-1.7 2H9.7c-.1-.5-.5-1.2-1.7-2z" />
      </>
    ),
    insertion: (
      <>
        <path d="M4 6h16M4 12h7M15 12h5M4 18h16" />
        <path d="M13 9v6M10 12h6" />
      </>
    ),
    summary: (
      <>
        <path d="M5 5h14M5 9h14M5 13h10M5 17h7" />
        <path d="m16 16 2 2 3-4" />
      </>
    ),
    retelling: (
      <>
        <path d="M4 5h16v14H4z" />
        <path d="m8 9 3 3-3 3M13 15h3" />
      </>
    ),
    debate: (
      <>
        <path d="M4 5h10v8H8l-4 3zM12 10h8v8h-4l-4 3z" />
      </>
    ),
  };

  return <svg {...common}>{paths[name] || paths.templates}</svg>;
}

function categoryOf(template) {
  const id = template.id;
  if (['quiz', 'true-false', 'evidence-hunt', 'main-idea', 'reference-chain', 'sentence-insertion', 'whack-answer'].includes(id)) {
    return 'Kiểm tra';
  }
  if (['match-up', 'matching-pairs', 'memory-match', 'find-match', 'word-scramble', 'word-search', 'crossword', 'hangman', 'bingo', 'flashcards', 'flip-tiles', 'conveyor-memory'].includes(id)) {
    return 'Từ vựng';
  }
  if (['category-sort', 'rank-order', 'sentence-builder', 'paragraph-builder', 'missing-word', 'cloze-passage', 'heading-match'].includes(id)) {
    return 'Câu & đoạn văn';
  }
  if (['error-correction'].includes(id)) {
    return 'Ngữ pháp';
  }
  if (['spin-selector', 'open-box', 'random-cards'].includes(id)) {
    return 'Trò chơi';
  }
  return 'Nói & viết';
}

function normalizeSample(template) {
  return String(sampleFor(template) || '').replace(/\\n/g, '\n');
}

function splitRawContent(raw, fallbackTitle) {
  const normalized = String(raw || '').replace(/\\n/g, '\n');
  const lines = normalized.split(/\r?\n/);
  const titleIndex = lines.findIndex((line) => /^title\s*:/i.test(line.trim()));
  const title = titleIndex >= 0
    ? lines[titleIndex].replace(/^title\s*:/i, '').trim()
    : fallbackTitle;
  const body = lines
    .filter((_, index) => index !== titleIndex)
    .join('\n')
    .replace(/^\s+/, '');
  return { title, body };
}

function filenameFor(template, title) {
  const source = title || template.title || template.id;
  const slug = source
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  return `${slug || template.id}.html`;
}

function formatTime(value) {
  if (!value) return 'Chưa lưu';
  return new Intl.DateTimeFormat('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(value);
}

function guideFor(template) {
  const format = template.format || 'Mỗi dòng là một mục';
  return `Mỗi dòng là một mục. Dùng dấu | để ngăn cách các phần theo cấu trúc: ${format}.`;
}

function TemplateCard({ template, selected, onSelect }) {
  const category = categoryOf(template);
  const meta = CATEGORY_META[category] || CATEGORY_META['Từ vựng'];
  return (
    <button
      type="button"
      className={`tlp-template-card ${selected ? 'is-selected' : ''}`}
      onClick={() => onSelect(template.id)}
      aria-pressed={selected}
    >
      <span className={`tlp-template-icon is-${meta.tone}`}>
        <Icon name={TEMPLATE_ICON_MAP[template.id] || meta.icon} size={22} />
      </span>
      <span className="tlp-template-copy">
        <strong>{template.title}</strong>
        <small>{template.titleVi}</small>
        <em>{template.index} mẫu</em>
      </span>
      <Icon name="chevron" size={17} />
    </button>
  );
}

export default function TextLabTemplateLibrary() {
  const initialTemplate = TEXTLAB_TEMPLATES.find((item) => item.id === 'hangman') || TEXTLAB_TEMPLATES[0];
  const [selectedId, setSelectedId] = useState(() => {
    try {
      return localStorage.getItem('brian-textlab-selected-template') || initialTemplate.id;
    } catch {
      return initialTemplate.id;
    }
  });
  const selected = TEXTLAB_TEMPLATES.find((item) => item.id === selectedId) || initialTemplate;

  const firstContent = useMemo(() => {
    const sample = normalizeSample(selected);
    return splitRawContent(sample, selected.title);
  }, []);

  const [title, setTitle] = useState(firstContent.title);
  const [body, setBody] = useState(firstContent.body);
  const [instructions, setInstructions] = useState(guideFor(selected));
  const [activeTab, setActiveTab] = useState('content');
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('Tất cả');
  const [previewKey, setPreviewKey] = useState(0);
  const [savedAt, setSavedAt] = useState(null);
  const [showSettings, setShowSettings] = useState(false);
  const [showMore, setShowMore] = useState(false);
  const [autoSave, setAutoSave] = useState(true);
  const [toast, setToast] = useState('');
  const [showAllTemplates, setShowAllTemplates] = useState(true);

  const libraryRef = useRef(null);
  const workspaceRef = useRef(null);
  const previewRef = useRef(null);
  const iframeRef = useRef(null);
  const importRef = useRef(null);

  const draftKey = `brian-textlab-proposal-one:${selected.id}`;

  useEffect(() => {
    const sample = splitRawContent(normalizeSample(selected), selected.title);
    let restored = null;
    try {
      const stored = localStorage.getItem(`brian-textlab-proposal-one:${selected.id}`);
      if (stored) restored = JSON.parse(stored);
      localStorage.setItem('brian-textlab-selected-template', selected.id);
    } catch {
      restored = null;
    }

    setTitle(restored?.title || sample.title);
    setBody(restored?.body || sample.body);
    setInstructions(restored?.instructions || guideFor(selected));
    setSavedAt(restored?.savedAt ? new Date(restored.savedAt) : null);
    setActiveTab('content');
    setPreviewKey((value) => value + 1);
    setShowSettings(false);
    setShowMore(false);
  }, [selected.id]);

  useEffect(() => {
    if (!autoSave) return undefined;
    const timer = window.setTimeout(() => {
      const now = new Date();
      try {
        localStorage.setItem(draftKey, JSON.stringify({
          title,
          body,
          instructions,
          savedAt: now.toISOString(),
        }));
        setSavedAt(now);
      } catch {
        // Local persistence is optional; the editor remains usable.
      }
    }, 650);
    return () => window.clearTimeout(timer);
  }, [autoSave, body, draftKey, instructions, title]);

  useEffect(() => {
    if (!toast) return undefined;
    const timer = window.setTimeout(() => setToast(''), 2200);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const rawContent = useMemo(
    () => `TITLE: ${title.trim() || selected.title}\n\n${body.trim()}`,
    [body, selected.title, title],
  );

  const interactiveHtml = useMemo(
    () => buildInteractiveHtml(selected, rawContent),
    [previewKey, rawContent, selected],
  );

  const filteredTemplates = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return TEXTLAB_TEMPLATES.filter((template) => {
      const categoryMatch = category === 'Tất cả' || categoryOf(template) === category;
      const searchMatch = !needle || `${template.title} ${template.titleVi} ${categoryOf(template)}`
        .toLowerCase()
        .includes(needle);
      return categoryMatch && searchMatch;
    });
  }, [category, query]);

  const groupedTemplates = useMemo(() => {
    return CATEGORY_ORDER.slice(1).map((group) => ({
      group,
      items: filteredTemplates.filter((template) => categoryOf(template) === group),
    })).filter(({ items }) => items.length > 0);
  }, [filteredTemplates]);

  const jumpTo = (ref) => {
    ref.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const selectQuickActivity = (id) => {
    const target = TEXTLAB_TEMPLATES.find((template) => template.id === id);
    if (!target) return;
    setSelectedId(target.id);
    window.setTimeout(() => jumpTo(workspaceRef), 80);
  };

  const saveDraft = () => {
    const now = new Date();
    try {
      localStorage.setItem(draftKey, JSON.stringify({
        title,
        body,
        instructions,
        savedAt: now.toISOString(),
      }));
      setSavedAt(now);
      setToast('Đã lưu bản nháp trên thiết bị');
    } catch {
      setToast('Không thể lưu bản nháp trên thiết bị');
    }
  };

  const resetToSample = () => {
    const sample = splitRawContent(normalizeSample(selected), selected.title);
    setTitle(sample.title);
    setBody(sample.body);
    setInstructions(guideFor(selected));
    setPreviewKey((value) => value + 1);
    setToast('Đã khôi phục ví dụ hoàn chỉnh');
  };

  const clearDraft = () => {
    setBody('');
    setPreviewKey((value) => value + 1);
    setToast('Đã xóa nội dung');
  };

  const copyText = async (value, message) => {
    try {
      await navigator.clipboard.writeText(value);
      setToast(message);
    } catch {
      const temporary = document.createElement('textarea');
      temporary.value = value;
      temporary.style.position = 'fixed';
      temporary.style.opacity = '0';
      document.body.appendChild(temporary);
      temporary.select();
      document.execCommand('copy');
      temporary.remove();
      setToast(message);
    }
  };

  const openPreview = () => {
    const win = window.open('', '_blank', 'noopener,noreferrer');
    if (!win) {
      setToast('Trình duyệt đang chặn cửa sổ mới');
      return;
    }
    win.document.open();
    win.document.write(interactiveHtml);
    win.document.close();
  };

  const handleImport = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const imported = splitRawContent(String(reader.result || ''), file.name.replace(/\.[^.]+$/, ''));
      setTitle(imported.title);
      setBody(imported.body);
      setPreviewKey((value) => value + 1);
      setToast(`Đã nhập ${file.name}`);
    };
    reader.onerror = () => setToast('Không thể đọc tệp');
    reader.readAsText(file);
    event.target.value = '';
  };

  const tabContent = {
    blank: `TITLE: Tên hoạt động\n\n${selected.format || 'ITEM 1\nITEM 2'}`,
    sample: normalizeSample(selected),
    guide: `${guideFor(selected)}\n\nVí dụ:\n${normalizeSample(selected)}`,
  };

  return (
    <div className="textlab-proposal-one">
      {toast && <div className="tlp-toast" role="status">{toast}</div>}

      <nav className="tlp-app-nav" aria-label="Điều hướng Brian TextLab">
        <button type="button" className="tlp-brand" onClick={() => jumpTo(workspaceRef)}>
          <span className="tlp-brand-mark"><Icon name="brand" size={25} strokeWidth={2.2} /></span>
          <span>
            <strong>Brian TextLab · No AI</strong>
            <small>Interactive HTML Studio</small>
          </span>
        </button>

        <div className="tlp-primary-shortcuts">
          <button type="button" onClick={() => jumpTo(libraryRef)}>
            <Icon name="templates" /><span>Templates</span>
          </button>
          <button type="button" onClick={() => { setActiveTab('blank'); jumpTo(workspaceRef); }}>
            <Icon name="blank" /><span>Mẫu trống</span>
          </button>
          <button type="button" onClick={() => { setActiveTab('sample'); jumpTo(workspaceRef); }}>
            <Icon name="sample" /><span>Ví dụ hoàn chỉnh</span>
          </button>
          <button type="button" onClick={() => { setActiveTab('guide'); jumpTo(workspaceRef); }}>
            <Icon name="guide" /><span>Cách nhập</span>
          </button>
          <button type="button" onClick={() => jumpTo(previewRef)}>
            <Icon name="preview" /><span>Live Preview</span>
          </button>
          <button
            type="button"
            onClick={() => downloadHtml(filenameFor(selected, title), interactiveHtml)}
          >
            <Icon name="download" /><span>Tải HTML</span>
          </button>
        </div>

        <div className="tlp-activity-shortcuts">
          {QUICK_ACTIVITY_IDS.map((item) => (
            <button
              type="button"
              key={item.id}
              className={`is-${item.tone}`}
              onClick={() => selectQuickActivity(item.id)}
            >
              <Icon name={item.icon} /><span>{item.label}</span>
            </button>
          ))}
        </div>

        <div className="tlp-account-tools">
          <button type="button" aria-label="Giao diện sáng"><Icon name="sun" /></button>
          <button type="button" aria-label="Thông báo"><Icon name="bell" /></button>
          <button type="button" className="tlp-profile">
            <span className="tlp-avatar">B</span>
            <span><strong>Brian English</strong><small>Giáo viên</small></span>
            <Icon name="chevrondown" size={16} />
          </button>
        </div>
      </nav>

      <main className="tlp-shell">
        <aside ref={libraryRef} className="tlp-library">
          <div className="tlp-library-heading">
            <div>
              <h1>Thư viện mẫu</h1>
              <p>Chọn mẫu, nhập nội dung và tạo hoạt động học tập tương tác.</p>
            </div>
            <span className="tlp-count">{TEXTLAB_TEMPLATES.length}</span>
          </div>

          <label className="tlp-search">
            <Icon name="search" />
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Tìm template..."
            />
            {query && (
              <button type="button" onClick={() => setQuery('')} aria-label="Xóa tìm kiếm">
                <Icon name="close" size={16} />
              </button>
            )}
          </label>

          <div className="tlp-filter-row" role="tablist" aria-label="Lọc template">
            {CATEGORY_ORDER.map((item) => (
              <button
                type="button"
                key={item}
                className={category === item ? 'is-active' : ''}
                onClick={() => setCategory(item)}
              >
                {item}
              </button>
            ))}
          </div>

          <div className={`tlp-template-groups ${showAllTemplates ? 'is-expanded' : ''}`}>
            {groupedTemplates.map(({ group, items }) => (
              <section key={group} className="tlp-template-group">
                <h2>{group.toUpperCase()}</h2>
                <div className="tlp-template-grid">
                  {items.map((template) => (
                    <TemplateCard
                      key={template.id}
                      template={template}
                      selected={template.id === selected.id}
                      onSelect={(id) => {
                        setSelectedId(id);
                        window.setTimeout(() => jumpTo(workspaceRef), 70);
                      }}
                    />
                  ))}
                </div>
              </section>
            ))}
          </div>

          <button
            type="button"
            className="tlp-show-all"
            onClick={() => setShowAllTemplates((value) => !value)}
          >
            <span>{showAllTemplates ? 'Thu gọn thư viện' : 'Xem tất cả 36 template'}</span>
            <Icon name={showAllTemplates ? 'chevrondown' : 'chevron'} size={17} />
          </button>
        </aside>

        <section ref={workspaceRef} className="tlp-workspace">
          <header className="tlp-workspace-header">
            <div className="tlp-editing-title">
              <span className="tlp-live-dot" />
              <small>Đang chỉnh sửa</small>
              <h2>{selected.title}</h2>
              <p>
                Loại hoạt động:
                <span className="tlp-tag is-violet">{categoryOf(selected).toUpperCase()}</span>
                Định dạng:
                <span className="tlp-tag is-blue">{selected.format || 'TEXT'}</span>
              </p>
            </div>

            <div className="tlp-workspace-actions">
              <span className="tlp-save-state">
                <Icon name="clock" size={16} />
                {savedAt ? `Đã lưu lúc ${formatTime(savedAt)}` : 'Chưa lưu bản nháp'}
              </span>

              <div className="tlp-menu-anchor">
                <button
                  type="button"
                  className="tlp-icon-button"
                  aria-label="Thiết lập"
                  aria-expanded={showSettings}
                  onClick={() => { setShowSettings((value) => !value); setShowMore(false); }}
                >
                  <Icon name="settings" />
                </button>
                {showSettings && (
                  <div className="tlp-popover">
                    <label className="tlp-switch">
                      <input
                        type="checkbox"
                        checked={autoSave}
                        onChange={(event) => setAutoSave(event.target.checked)}
                      />
                      <span />
                      Tự động lưu
                    </label>
                    <button type="button" onClick={resetToSample}>
                      <Icon name="reset" size={17} /> Khôi phục ví dụ
                    </button>
                  </div>
                )}
              </div>

              <div className="tlp-menu-anchor">
                <button
                  type="button"
                  className="tlp-icon-button"
                  aria-label="Tùy chọn khác"
                  aria-expanded={showMore}
                  onClick={() => { setShowMore((value) => !value); setShowSettings(false); }}
                >
                  <Icon name="more" />
                </button>
                {showMore && (
                  <div className="tlp-popover">
                    <button type="button" onClick={() => copyText(interactiveHtml, 'Đã sao chép mã HTML')}>
                      <Icon name="copy" size={17} /> Sao chép HTML
                    </button>
                    <button type="button" onClick={clearDraft}>
                      <Icon name="close" size={17} /> Xóa nội dung
                    </button>
                  </div>
                )}
              </div>

              <button
                type="button"
                className="tlp-create-button"
                onClick={() => {
                  setActiveTab('content');
                  setPreviewKey((value) => value + 1);
                  jumpTo(previewRef);
                }}
              >
                <Icon name="play" size={18} />
                Tạo hoạt động
              </button>
            </div>
          </header>

          <div className="tlp-workspace-body">
            <section className="tlp-editor-card">
              <nav className="tlp-editor-tabs" aria-label="Chế độ nội dung">
                <button
                  type="button"
                  className={activeTab === 'content' ? 'is-active' : ''}
                  onClick={() => setActiveTab('content')}
                >
                  <Icon name="writing" size={17} /> Nội dung
                </button>
                <button
                  type="button"
                  className={activeTab === 'blank' ? 'is-active' : ''}
                  onClick={() => setActiveTab('blank')}
                >
                  <Icon name="blank" size={17} /> Mẫu trống
                </button>
                <button
                  type="button"
                  className={activeTab === 'sample' ? 'is-active' : ''}
                  onClick={() => setActiveTab('sample')}
                >
                  <Icon name="sample" size={17} /> Ví dụ hoàn chỉnh
                </button>
                <button
                  type="button"
                  className={activeTab === 'guide' ? 'is-active' : ''}
                  onClick={() => setActiveTab('guide')}
                >
                  <Icon name="guide" size={17} /> Cách nhập
                </button>
              </nav>

              {activeTab === 'content' ? (
                <div className="tlp-editor-form">
                  <label>
                    <span>Tiêu đề hoạt động</span>
                    <input
                      value={title}
                      onChange={(event) => setTitle(event.target.value)}
                      placeholder="Nhập tiêu đề..."
                    />
                  </label>

                  <label>
                    <span>
                      Hướng dẫn <em>(không bắt buộc)</em>
                      <small>{instructions.length}/200</small>
                    </span>
                    <textarea
                      className="tlp-instruction-field"
                      maxLength={200}
                      value={instructions}
                      onChange={(event) => setInstructions(event.target.value)}
                    />
                  </label>

                  <label>
                    <span>Chủ đề / Danh mục</span>
                    <div className="tlp-topic-field">
                      <span className="tlp-topic-chip">
                        {categoryOf(selected)} · {selected.titleVi}
                        <button type="button" aria-label="Bỏ chủ đề"><Icon name="close" size={13} /></button>
                      </span>
                      <Icon name="chevrondown" size={16} />
                    </div>
                  </label>

                  <label>
                    <span>
                      Danh sách nội dung
                      <em>Mỗi dòng theo định dạng: {selected.format || 'một mục'}</em>
                    </span>
                    <textarea
                      className="tlp-content-field"
                      value={body}
                      onChange={(event) => setBody(event.target.value)}
                      spellCheck={false}
                    />
                  </label>

                  <div className="tlp-editor-footer">
                    <input
                      ref={importRef}
                      type="file"
                      hidden
                      accept=".txt,.csv,text/plain,text/csv"
                      onChange={handleImport}
                    />
                    <button type="button" className="tlp-secondary-button" onClick={() => importRef.current?.click()}>
                      <Icon name="upload" size={17} />
                      Nhập dữ liệu (CSV / TXT)
                    </button>
                    <div>
                      <button type="button" className="tlp-text-button" onClick={saveDraft}>
                        <Icon name="save" size={17} />
                        Lưu nháp
                      </button>
                      <button
                        type="button"
                        className="tlp-create-button"
                        onClick={() => {
                          setPreviewKey((value) => value + 1);
                          jumpTo(previewRef);
                        }}
                      >
                        <Icon name="play" size={17} />
                        Tạo hoạt động
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="tlp-reference-panel">
                  <div className="tlp-reference-header">
                    <span>
                      {activeTab === 'blank' && 'MẪU TRỐNG'}
                      {activeTab === 'sample' && 'VÍ DỤ HOÀN CHỈNH'}
                      {activeTab === 'guide' && 'CÁCH NHẬP'}
                    </span>
                    <button
                      type="button"
                      onClick={() => copyText(tabContent[activeTab], 'Đã sao chép nội dung mẫu')}
                    >
                      <Icon name="copy" size={16} /> Sao chép
                    </button>
                  </div>
                  <pre>{tabContent[activeTab]}</pre>
                  <div className="tlp-reference-actions">
                    <button
                      type="button"
                      className="tlp-secondary-button"
                      onClick={() => {
                        const imported = splitRawContent(tabContent[activeTab], selected.title);
                        setTitle(imported.title);
                        setBody(imported.body);
                        setActiveTab('content');
                        setPreviewKey((value) => value + 1);
                        setToast('Đã đưa nội dung mẫu vào trình soạn thảo');
                      }}
                    >
                      Dùng nội dung này
                    </button>
                  </div>
                </div>
              )}
            </section>

            <section ref={previewRef} className="tlp-preview-card">
              <header className="tlp-preview-header">
                <div>
                  <small>LIVE PREVIEW</small>
                  <h3>Hoạt động tương tác trực tiếp</h3>
                </div>
                <div className="tlp-preview-buttons">
                  <button type="button" onClick={() => setPreviewKey((value) => value + 1)}>
                    <Icon name="refresh" size={17} /> Chạy lại
                  </button>
                  <button type="button" onClick={openPreview}>
                    <Icon name="external" size={17} /> Mở riêng
                  </button>
                  <button type="button" onClick={() => iframeRef.current?.requestFullscreen?.()}>
                    <Icon name="fullscreen" size={17} /> Toàn màn hình
                  </button>
                  <button
                    type="button"
                    className="is-download"
                    onClick={() => downloadHtml(filenameFor(selected, title), interactiveHtml)}
                  >
                    <Icon name="download" size={17} /> Tải HTML
                  </button>
                </div>
              </header>

              <div className="tlp-preview-frame">
                <iframe
                  key={previewKey}
                  ref={iframeRef}
                  title={`Xem trước ${selected.title}`}
                  srcDoc={interactiveHtml}
                  sandbox="allow-scripts allow-forms allow-modals allow-popups allow-downloads"
                />
              </div>

              <footer className="tlp-preview-footer">
                <span><Icon name="preview" size={16} /> Chỉnh sửa nội dung ở bên trái.</span>
                <button type="button" onClick={openPreview}>
                  Mở trong tab mới <Icon name="external" size={16} />
                </button>
              </footer>

              <div className="tlp-preview-note">
                <span className="tlp-info-icon">i</span>
                <p>
                  Bạn có thể chỉnh sửa nội dung ở bên trái.
                  <strong> Live Preview cập nhật ngay khi bấm “Tạo hoạt động”.</strong>
                </p>
              </div>
            </section>
          </div>
        </section>
      </main>

      <footer className="tlp-status-footer">
        <span><span className="tlp-live-dot" /> Sẵn sàng</span>
        <span>Dữ liệu được lưu trên thiết bị</span>
        <span>Không sử dụng AI</span>
        <span>HTML hoạt động ngoại tuyến 100%</span>
      </footer>
    </div>
  );
}
