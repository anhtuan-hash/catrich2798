import React, { useEffect, useMemo, useRef, useState } from 'react';
import SectionHeader from '../components/SectionHeader.jsx';
import AppCard from '../components/AppCard.jsx';
import { GAME_APPS } from '../data/apps.js';
import { canPublishDepartment, hasToolAccess } from '../utils/permissions.js';
import {
  CUSTOM_GAMES_EVENT,
  canEditCustomGame,
  createCustomGame,
  deleteCustomGame,
  isCustomGameOwner,
  listCustomGames,
  requestCustomGameApproval,
  updateCustomGameStatus,
} from '../utils/customGames.js';

const SAVED_KEY = 'bes-game-hub-links-v1';

const CUSTOM_GAME_TONES = ['blue', 'green', 'orange', 'violet', 'cyan', 'pink', 'amber', 'teal'];

function ensureWebUrl(value) {
  const raw = String(value || '').trim();
  if (!raw) return '';
  if (/^https?:\/\//i.test(raw)) return raw;
  if (raw.startsWith('//')) return `https:${raw}`;
  return `https://${raw}`;
}

function CustomGameDialog({ language, open, draft, setDraft, onClose, onSavePrivate, onSubmitForReview, isLeader, busy, message }) {
  if (!open) return null;
  const valid = Boolean(draft.label.trim() && draft.home.trim());
  return (
    <div className="games-v46-dialog-backdrop" role="presentation" onMouseDown={onClose}>
      <section className="games-v46-dialog" role="dialog" aria-modal="true" aria-label={language === 'vi' ? 'Thêm trò chơi tùy chỉnh' : 'Add custom game'} onMouseDown={(event) => event.stopPropagation()}>
        <header>
          <div>
            <span className="games-v46-dialog-kicker">＋ {language === 'vi' ? 'Trò chơi tùy chỉnh' : 'Custom game'}</span>
            <h3>{language === 'vi' ? 'Thêm trò chơi vào bảng chọn' : 'Add a game to the board'}</h3>
            <p>{language === 'vi'
              ? 'Lưu riêng để chỉ bạn và TTCM thấy, hoặc gửi TTCM duyệt để đề xuất dùng chung cho toàn bộ giáo viên.'
              : 'Save privately for you and department leaders, or submit it for approval so every teacher can use it.'}</p>
          </div>
          <button type="button" className="games-v46-dialog-close" onClick={onClose}>×</button>
        </header>

        <div className="games-v46-form-grid">
          <label>
            <span>{language === 'vi' ? 'Tên trò chơi / nền tảng' : 'Game or platform name'}</span>
            <input value={draft.label} onChange={(event) => setDraft((prev) => ({ ...prev, label: event.target.value }))} placeholder="Quizizz, Blooket, Nearpod..." autoFocus />
          </label>
          <label>
            <span>{language === 'vi' ? 'Biểu tượng' : 'Icon'}</span>
            <input value={draft.icon} onChange={(event) => setDraft((prev) => ({ ...prev, icon: event.target.value.slice(0, 3) }))} placeholder="🎮" />
          </label>
          <label className="wide">
            <span>{language === 'vi' ? 'Đường dẫn trò chơi' : 'Game URL'}</span>
            <input value={draft.home} onChange={(event) => setDraft((prev) => ({ ...prev, home: event.target.value }))} placeholder="https://..." />
          </label>
          <label>
            <span>{language === 'vi' ? 'Cách mở' : 'Launch mode'}</span>
            <select value={draft.embedMode} onChange={(event) => setDraft((prev) => ({ ...prev, embedMode: event.target.value }))}>
              <option value="iframe">{language === 'vi' ? 'Nhúng trong Live Game' : 'Embed in Live Game'}</option>
              <option value="newtab">{language === 'vi' ? 'Mở tab mới' : 'Open in new tab'}</option>
            </select>
          </label>
          <label>
            <span>{language === 'vi' ? 'Màu thẻ' : 'Card color'}</span>
            <select value={draft.color} onChange={(event) => setDraft((prev) => ({ ...prev, color: event.target.value }))}>
              {CUSTOM_GAME_TONES.map((tone) => <option key={tone} value={tone}>{tone}</option>)}
            </select>
          </label>
        </div>

        {message ? <div className="games-v58-dialog-message">{message}</div> : null}

        <footer className="games-v58-dialog-actions">
          <button type="button" className="secondary" onClick={onClose}>{language === 'vi' ? 'Hủy' : 'Cancel'}</button>
          <button type="button" className="secondary" onClick={onSavePrivate} disabled={!valid || busy}>{language === 'vi' ? 'Lưu riêng vào tài khoản' : 'Save privately'}</button>
          <button type="button" className="primary" onClick={onSubmitForReview} disabled={!valid || busy}>
            {isLeader
              ? (language === 'vi' ? 'Thêm mặc định cho toàn tổ' : 'Add for all teachers')
              : (language === 'vi' ? 'Gửi TTCM duyệt' : 'Submit for approval')}
          </button>
        </footer>
      </section>
    </div>
  );
}

const PLATFORMS = {
  games4esl: {
    label: 'Games4ESL',
    icon: '🎲',
    home: 'https://games4esl.com/teacher-tools/',
    color: 'games4esl',
    embed: true,
    supportsIframeCode: false,
    descriptionVi: 'Cổng mở nhanh Games4ESL: vòng quay, memory, hangman, pass the ball, hot seat, mystery box, wordsearch, bingo, worksheet và scoreboard.',
    descriptionEn: 'Quick launcher for Games4ESL: spinner, memory, hangman, pass the ball, hot seat, mystery box, wordsearch, bingo, worksheets and scoreboard.',
    quickLinks: [
      ['Tất cả tool', 'All tools', 'https://games4esl.com/teacher-tools/'],
      ['Vòng quay', 'Spin the Wheel', 'https://games4esl.com/teacher-tools/spin-the-wheel/'],
      ['Lật thẻ', 'Memory Game', 'https://games4esl.com/teacher-tools/memory-game/'],
      ['Hangman', 'Hangman', 'https://games4esl.com/teacher-tools/hangman/'],
      ['Pass the Ball', 'Pass the Ball', 'https://games4esl.com/teacher-tools/pass-the-ball-online/'],
      ['Hot Seat', 'Hot Seat', 'https://games4esl.com/teacher-tools/hot-seat-game/'],
      ['Mystery Box', 'Mystery Box', 'https://games4esl.com/teacher-tools/mystery-box-online/'],
      ['Word Search', 'Word Search', 'https://games4esl.com/teacher-tools/word-search-generator/'],
      ['Bingo', 'Bingo', 'https://games4esl.com/teacher-tools/bingo-card-generator/'],
      ['Missing Letter', 'Missing Letter', 'https://games4esl.com/teacher-tools/missing-letter-worksheet-generator/'],
      ['Unscramble', 'Unscramble', 'https://games4esl.com/teacher-tools/unscramble-worksheet-generator/'],
      ['Scrambled Sentences', 'Scrambled Sentences', 'https://games4esl.com/teacher-tools/scrambled-sentences/'],
      ['Fill Blank', 'Fill Blank', 'https://games4esl.com/teacher-tools/fill-in-the-blank/'],
      ['Writing Practice', 'Writing Practice', 'https://games4esl.com/teacher-tools/writing-practice-worksheet-generator/'],
      ['Chia nhóm', 'Random Groups', 'https://games4esl.com/teacher-tools/random-group-generator/'],
      ['Scoreboard', 'Scoreboard', 'https://games4esl.com/teacher-tools/game-scoreboard/'],
    ],
  },
  wordwall: {
    label: 'Wordwall',
    icon: '🧱',
    home: 'https://wordwall.net/community',
    color: 'teal',
    embed: true,
    supportsIframeCode: true,
    descriptionVi: 'Vocabulary games, matching, quiz, random wheel, group sort, open box, maze chase.',
    descriptionEn: 'Vocabulary games, matching, quiz, random wheel, group sort, open box, maze chase.',
    quickLinks: [
      ['Cộng đồng', 'Community', 'https://wordwall.net/community'],
      ['Hoạt động của tôi', 'My activities', 'https://wordwall.net/myactivities'],
      ['Tạo hoạt động', 'Create', 'https://wordwall.net/create/picktemplate'],
      ['Đăng nhập', 'Sign in', 'https://wordwall.net/account/login'],
    ],
  },
  educaplay: {
    label: 'Educaplay',
    icon: '🐸',
    home: 'https://www.educaplay.com/learning-resources/',
    color: 'green',
    embed: true,
    supportsIframeCode: true,
    descriptionVi: 'Crossword, Froggy Jumps, matching, memory, quiz, dictation, word search, fill in blanks.',
    descriptionEn: 'Crosswords, Froggy Jumps, matching, memory, quizzes, dictation, word search, fill-in-the-blanks.',
    quickLinks: [
      ['Kho hoạt động', 'Activities', 'https://www.educaplay.com/learning-resources/'],
      ['Tạo hoạt động', 'Create', 'https://www.educaplay.com/editor/'],
      ['Đăng nhập', 'Sign in', 'https://www.educaplay.com/login/'],
    ],
  },
  learningapps: {
    label: 'LearningApps',
    icon: '🧩',
    home: 'https://learningapps.org/',
    color: 'blue',
    embed: true,
    supportsIframeCode: true,
    descriptionVi: 'Mini-game miễn phí: matching, ordering, fill gaps, memory, group sort.',
    descriptionEn: 'Free mini-games: matching, ordering, fill gaps, memory, group sort.',
    quickLinks: [
      ['Trang chủ', 'Home', 'https://learningapps.org/'],
      ['Duyệt app', 'Browse apps', 'https://learningapps.org/index.php?overview&s=&category=0&tool='],
      ['Tạo app', 'Create app', 'https://learningapps.org/createApp.php'],
      ['Đăng nhập', 'Sign in', 'https://learningapps.org/login.php'],
    ],
  },
  h5p: {
    label: 'H5P',
    icon: '🎛️',
    home: 'https://h5p.org/content-types-and-applications',
    color: 'navy',
    embed: true,
    supportsIframeCode: true,
    descriptionVi: 'Interactive video, drag-drop, quiz, memory game, course presentation. Dán iframe embed của nội dung H5P để chạy đẹp nhất.',
    descriptionEn: 'Interactive video, drag-drop, quizzes, memory games, course presentations. Paste the H5P content iframe for best results.',
    quickLinks: [
      ['Content types', 'Content types', 'https://h5p.org/content-types-and-applications'],
      ['H5P.com', 'H5P.com', 'https://h5p.com/'],
      ['Examples', 'Examples', 'https://h5p.org/content-types-and-applications'],
    ],
  },
  genially: {
    label: 'Genially',
    icon: '✨',
    home: 'https://view.genially.com/',
    color: 'orange',
    embed: true,
    supportsIframeCode: true,
    descriptionVi: 'Escape room, board game, interactive presentation, gamified lesson. Nên dán link view.genially hoặc iframe embed.',
    descriptionEn: 'Escape rooms, board games, interactive presentations, gamified lessons. Paste a view.genially link or iframe embed.',
    quickLinks: [
      ['Templates', 'Templates', 'https://genially.com/templates/'],
      ['Dashboard', 'Dashboard', 'https://app.genially.com/'],
      ['Đăng nhập', 'Sign in', 'https://app.genially.com/login'],
    ],
  },
  bookwidgets: {
    label: 'BookWidgets',
    icon: '📘',
    home: 'https://www.bookwidgets.com/',
    color: 'cyan',
    embed: true,
    supportsIframeCode: true,
    descriptionVi: 'Worksheet, quiz, bingo, memory, crossword, live widgets. Dùng link play hoặc iframe từ BookWidgets.',
    descriptionEn: 'Worksheets, quizzes, bingo, memory, crosswords, live widgets. Use a play link or iframe from BookWidgets.',
    quickLinks: [
      ['Trang chủ', 'Home', 'https://www.bookwidgets.com/'],
      ['Dashboard', 'Dashboard', 'https://www.bookwidgets.com/dashboard'],
      ['Đăng nhập', 'Sign in', 'https://www.bookwidgets.com/login'],
    ],
  },
  classtools: {
    label: 'ClassTools.net',
    icon: '🧰',
    home: 'https://www.classtools.net/',
    color: 'gray',
    embed: true,
    supportsIframeCode: true,
    descriptionVi: 'Arcade game, random picker, countdown, dustbin game, quiz, diagram tools.',
    descriptionEn: 'Arcade games, random picker, countdown, dustbin game, quizzes, diagram tools.',
    quickLinks: [
      ['Trang chủ', 'Home', 'https://www.classtools.net/'],
      ['Random picker', 'Random picker', 'https://www.classtools.net/random-name-picker/'],
      ['Countdown', 'Countdown', 'https://www.classtools.net/timer/'],
      ['Arcade', 'Arcade', 'https://www.classtools.net/arcade/'],
    ],
  },
  kahoot: {
    label: 'Kahoot',
    icon: '🟣',
    home: 'https://kahoot.com/',
    color: 'purple',
    embed: 'limited',
    supportsIframeCode: true,
    descriptionVi: 'Live quiz và review game. Public/unlisted kahoot có thể nhúng; private kahoot thường phải mở tab riêng.',
    descriptionEn: 'Live quiz and review games. Public/unlisted kahoots may embed; private kahoots usually need a new tab.',
    quickLinks: [
      ['Trang chủ', 'Home', 'https://kahoot.com/'],
      ['Discover', 'Discover', 'https://create.kahoot.it/discover'],
      ['Đăng nhập', 'Sign in', 'https://create.kahoot.it/auth/login'],
    ],
  },
  scattergories: {
    label: 'Scattergories',
    icon: '🔤',
    home: 'https://swellgarfo.com/scattergories/',
    color: 'pink',
    embed: true,
    supportsIframeCode: false,
    descriptionVi: 'Scattergories online để warm-up, từ vựng, brainstorming theo chủ điểm.',
    descriptionEn: 'Online Scattergories for warm-ups, vocabulary review, and topic brainstorming.',
    quickLinks: [
      ['Scattergories', 'Scattergories', 'https://swellgarfo.com/scattergories/'],
    ],
  },
  baamboozle: {
    label: 'Baamboozle',
    icon: '🅱️',
    home: 'https://www.baamboozle.com/games',
    color: 'amber',
    embed: false,
    supportsIframeCode: false,
    descriptionVi: 'Baamboozle mở bằng tab mới vì website chặn iframe. Studio vẫn lưu link và tạo prompt nội dung nhanh.',
    descriptionEn: 'Baamboozle opens in a new tab because it blocks iframe embedding. Studio still saves links and prepares content quickly.',
    quickLinks: [
      ['Kho game', 'Games', 'https://www.baamboozle.com/games'],
      ['Trang chủ', 'Home', 'https://www.baamboozle.com/'],
      ['Class PIN', 'Class PIN', 'https://www.baamboozle.com/join'],
      ['Đăng nhập', 'Sign in', 'https://www.baamboozle.com/login'],
    ],
  },
};

const DEFAULT_SAVED = Object.fromEntries(Object.keys(PLATFORMS).map((key) => [key, []]));


const HERO_PLATFORM_ORDER = ['wordwall', 'educaplay', 'learningapps', 'h5p', 'genially', 'bookwidgets', 'classtools'];

const GAME_HERO_SPOTLIGHTS = [
  {
    platform: 'games4esl',
    icon: '🧰',
    title: 'Treasure Hunt',
    descVi: 'Lưu nhanh platform yêu thích và mở dạy trực tiếp.',
    desc: 'Save favorite platforms and launch them live in class.',
    tone: 'mint',
    quickUrl: 'https://games4esl.com/teacher-tools/',
  },
  {
    platform: 'wordwall',
    icon: '🔤',
    title: 'Word Rush',
    descVi: 'Ôn tập nhanh bằng quiz, timed, memory và nhiều game lớp học.',
    desc: 'Fast review with quiz, timed challenges, memory and class games.',
    tone: 'violet',
    quickUrl: 'https://wordwall.net/community',
  },
];

const GAME_HERO_QUICK_ITEMS = [
  {
    platform: 'games4esl',
    icon: '🧰',
    title: 'Treasure Hunt',
    descVi: 'Lưu nhanh platform yêu thích và mở dạy trực tiếp.',
    desc: 'Save favorite platforms and launch them live in class.',
    tone: 'mint',
    quickUrl: 'https://games4esl.com/teacher-tools/',
  },
  {
    platform: 'wordwall',
    icon: '🏆',
    title: 'Quiz Arena',
    descVi: 'Chạy iframe hoặc mở trực tiếp trên website.',
    desc: 'Run inside an iframe or open directly on the website.',
    tone: 'sky',
    quickUrl: 'https://wordwall.net/community',
  },
  {
    platform: 'classtools',
    icon: '⚡',
    title: 'Warm-up tools',
    descVi: 'Hot seat, random picker, scoreboard và nhiều launcher khác.',
    desc: 'Hot seat, random picker, scoreboards and more launchers.',
    tone: 'peach',
    quickUrl: 'https://www.classtools.net/',
  },
];

function GamesHeroIllustration() {
  return (
    <div className="games-hero-illustration" aria-hidden="true">
      <span className="games-hero-cube cube-a" />
      <span className="games-hero-cube cube-b" />
      <span className="games-hero-cube cube-c" />
      <span className="games-hero-cube cube-d" />
      <span className="games-hero-dot dot-a" />
      <span className="games-hero-dot dot-b" />
      <span className="games-hero-dot dot-c" />

      <div className="games-console-center">
        <span className="games-console-dot" />
        <div className="games-console-screen">
          <div className="games-console-chart"><i /><i /><i /></div>
          <div className="games-console-stars"><span>★</span><span>★</span></div>
        </div>
        <div className="games-console-pad">
          <span className="dpad"><i /><i /></span>
          <span className="buttons"><b /><b /><b /><b /></span>
        </div>
      </div>

      <div className="games-float-card treasure-card">
        <strong>Treasure Hunt</strong>
        <div className="icon-card">🧰</div>
        <small>Launcher nhanh</small>
      </div>

      <div className="games-float-card wordrush-card">
        <strong>Word Rush</strong>
        <div className="abc-card"><span>A</span><span>B</span><span>C</span></div>
        <small>Ôn tập tốc độ</small>
      </div>

      <div className="games-float-card quizarena-card">
        <strong>Quiz Arena</strong>
        <div className="trophy-card">🏆</div>
        <small>Thi đua nhóm</small>
      </div>

      <div className="games-float-card warmup-card">
        <strong>Warm-up Tools</strong>
        <div className="bolt-card">⚡</div>
        <small>Khởi động nhanh</small>
      </div>

      <div className="games-float-card picker-card">
        <strong>Random Picker</strong>
        <div className="question-card">?</div>
        <small>Chọn ngẫu nhiên</small>
      </div>

      <div className="games-float-card battle-card">
        <strong>Team Battle</strong>
        <div className="team-card"><span /><span /></div>
        <small>Thi đấu lớp học</small>
      </div>
    </div>
  );
}

function GamesSpotlightCard({ item, language, onOpen }) {
  return (
    <button type="button" className={`games-spotlight-card tone-${item.tone}`} onClick={() => onOpen(item.platform, item.quickUrl)}>
      <span className="games-soft-icon">{item.icon}</span>
      <strong>{item.title}</strong>
      <small>{language === 'vi' ? item.descVi : item.desc}</small>
      <em>{language === 'vi' ? 'Mở ngay' : 'Open now'}</em>
    </button>
  );
}

function GamesQuickRow({ item, language, onOpen }) {
  return (
    <button type="button" className={`games-quick-row tone-${item.tone}`} onClick={() => onOpen(item.platform, item.quickUrl)}>
      <span className="games-soft-icon">{item.icon}</span>
      <span>
        <strong>{item.title}</strong>
        <small>{language === 'vi' ? item.descVi : item.desc}</small>
      </span>
      <b>›</b>
    </button>
  );
}

function GamePopularPlatformTile({ item, active, onSelect }) {
  return (
    <button type="button" className={`games-popular-tile ${active ? 'is-active' : ''}`} onClick={() => onSelect(item.key)}>
      <span>{item.icon}</span>
      <strong>{item.label}</strong>
    </button>
  );
}

function GamesShowcaseHero({ language, totalSaved, activeLabel, onPlayNow, onOpenPlatform, onSelectPlatform }) {
  const popularPlatforms = HERO_PLATFORM_ORDER
    .map((key) => ({ key, ...(PLATFORMS[key] || {}) }))
    .filter((item) => item.label);

  return (
    <>
      <section className="games-showcase-hero" aria-label={language === 'vi' ? 'Hero trò chơi' : 'Games hero'}>
        <div className="games-hero-main-card">
          <div className="games-hero-copy-v58">
            <div className="games-mini-brand">
              <img src="/logo-brian-english.png" alt="Brian English logo" />
              <span>Brian English Studio</span>
            </div>
            <h1>{language === 'vi' ? 'Học mà chơi Lớp học sôi động' : 'Play to learn A lively classroom'}</h1>
            <p>
              {language === 'vi'
                ? 'Kho trò chơi và nền tảng tương tác giúp tạo tiết học sôi động, luyện tập nhanh, thi đua nhóm và tăng hứng thú học tập.'
                : 'A game-based teaching hub for fast review, team competition, warm-ups and lively classroom interaction.'}
            </p>
            <div className="games-hero-buttons">
              <button type="button" className="primary" onClick={onPlayNow}>
                {language === 'vi' ? 'Chơi ngay' : 'Play now'}
              </button>
              <button type="button" className="secondary" onClick={() => (window.location.hash = '#/library')}>
                {language === 'vi' ? 'Xem thư viện' : 'View library'}
              </button>
            </div>
            <div className="games-hero-stats-v58">
              <span><b>{Object.keys(PLATFORMS).length}</b><small>{language === 'vi' ? 'nền tảng game' : 'game platforms'}</small></span>
              <span><b>{totalSaved}</b><small>{language === 'vi' ? 'liên kết đã lưu' : 'saved links'}</small></span>
              <span><b>{activeLabel}</b><small>{language === 'vi' ? 'đang mở' : 'live platform'}</small></span>
            </div>
          </div>
          <GamesHeroIllustration />
        </div>

        <aside className="games-hero-side-panel">
          <div className="games-spotlight-grid">
            {GAME_HERO_SPOTLIGHTS.map((item) => (
              <GamesSpotlightCard key={item.title} item={item} language={language} onOpen={onOpenPlatform} />
            ))}
          </div>
          <div className="games-quick-panel">
            <h2>{language === 'vi' ? 'Truy cập nhanh các trò chơi dạy học' : 'Quick access to classroom games'}</h2>
            {GAME_HERO_QUICK_ITEMS.map((item) => (
              <GamesQuickRow key={item.title} item={item} language={language} onOpen={onOpenPlatform} />
            ))}
          </div>
        </aside>
      </section>

      <div className="games-popular-strip">
        <div className="games-popular-head">
          <strong>{language === 'vi' ? 'Nền tảng game phổ biến' : 'Popular game platforms'}</strong>
        </div>
        <div className="games-popular-list">
          {popularPlatforms.map((item) => (
            <GamePopularPlatformTile key={item.key} item={item} onSelect={onSelectPlatform} />
          ))}
        </div>
      </div>
    </>
  );
}

function slugifyKeyword(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/^#+/, '')
    .replace(/[^a-z0-9\s-]/g, ' ')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

function extractIframeSrc(value) {
  const raw = String(value || '').trim();
  if (!raw) return '';
  const match = raw.match(/<iframe[^>]+src=["']([^"']+)["'][^>]*>/i);
  if (match?.[1]) return match[1].replace(/&amp;/g, '&');
  return '';
}

function makeSearchUrl(platform, raw) {
  const q = encodeURIComponent(raw);
  const slug = slugifyKeyword(raw) || 'english';
  switch (platform) {
    case 'games4esl': return `https://games4esl.com/?s=${q}`;
    case 'wordwall': return `https://wordwall.net/community/${slug}`;
    case 'educaplay': return `https://www.educaplay.com/learning-resources/?q=${q}`;
    case 'learningapps': return `https://learningapps.org/index.php?s=${q}`;
    case 'classtools': return `https://www.classtools.net/?s=${q}`;
    case 'kahoot': return `https://create.kahoot.it/discover?query=${q}`;
    case 'baamboozle': return `https://www.baamboozle.com/search?q=${q}`;
    case 'genially': return `https://genially.com/templates/?s=${q}`;
    default: return PLATFORMS[platform]?.home || PLATFORMS.wordwall.home;
  }
}

function normalizeUrl(platform, value) {
  const rawInput = String(value || '').trim();
  const config = PLATFORMS[platform] || PLATFORMS.wordwall;
  const iframeSrc = extractIframeSrc(rawInput);
  const raw = iframeSrc || rawInput;
  if (!raw) return config.home;

  if (platform === 'scattergories') return 'https://swellgarfo.com/scattergories/';

  if (platform === 'games4esl') {
    if (/^https?:\/\//i.test(raw)) return raw;
    if (raw.startsWith('//')) return `https:${raw}`;
    if (raw.startsWith('/')) return `https://games4esl.com${raw}`;
    const lowered = raw.toLowerCase();
    const toolMap = {
      wheel: 'spin-the-wheel', spinner: 'spin-the-wheel', spin: 'spin-the-wheel',
      memory: 'memory-game', matching: 'memory-game',
      hangman: 'hangman', ball: 'pass-the-ball-online', pass: 'pass-the-ball-online',
      hotseat: 'hot-seat-game', 'hot seat': 'hot-seat-game',
      mystery: 'mystery-box-online', box: 'mystery-box-online',
      wordsearch: 'word-search-generator', 'word search': 'word-search-generator',
      bingo: 'bingo-card-generator', missing: 'missing-letter-worksheet-generator',
      unscramble: 'unscramble-worksheet-generator', scramble: 'scrambled-sentences', sentence: 'scrambled-sentences',
      blank: 'fill-in-the-blank', cloze: 'fill-in-the-blank', writing: 'writing-practice-worksheet-generator',
      group: 'random-group-generator', groups: 'random-group-generator', scoreboard: 'game-scoreboard', score: 'game-scoreboard',
    };
    const hit = Object.entries(toolMap).find(([key]) => lowered.includes(key));
    if (hit) return `https://games4esl.com/teacher-tools/${hit[1]}/`;
    return makeSearchUrl(platform, raw);
  }

  if (/^https?:\/\//i.test(raw)) {
    if (platform === 'learningapps' && /learningapps\.org\/(display\?|watch\?)/i.test(raw)) return raw;
    return raw;
  }

  if (raw.startsWith('//')) return `https:${raw}`;

  if (platform === 'baamboozle') {
    if (/^\d{3,}$/.test(raw)) return `https://www.baamboozle.com/game/${raw}`;
    if (raw.startsWith('/')) return `https://www.baamboozle.com${raw}`;
    return makeSearchUrl(platform, raw);
  }

  if (platform === 'wordwall') {
    if (/^\d{3,}$/.test(raw)) return `https://wordwall.net/resource/${raw}`;
    if (raw.startsWith('/')) return `https://wordwall.net${raw}`;
    return makeSearchUrl(platform, raw);
  }

  if (platform === 'learningapps') {
    if (/^[a-z0-9]{5,}$/i.test(raw)) return `https://learningapps.org/watch?v=${raw}`;
    if (raw.startsWith('/')) return `https://learningapps.org${raw}`;
    return makeSearchUrl(platform, raw);
  }

  if (platform === 'educaplay') {
    if (raw.startsWith('/')) return `https://www.educaplay.com${raw}`;
    return makeSearchUrl(platform, raw);
  }

  return makeSearchUrl(platform, raw);
}

function getSavedLinks() {
  try {
    const data = JSON.parse(localStorage.getItem(SAVED_KEY) || '{}');
    return { ...DEFAULT_SAVED, ...Object.fromEntries(Object.keys(PLATFORMS).map((key) => [key, Array.isArray(data[key]) ? data[key] : []])) };
  } catch {
    return DEFAULT_SAVED;
  }
}

function saveLinks(saved) {
  const compact = Object.fromEntries(Object.keys(PLATFORMS).map((key) => [key, (saved[key] || []).slice(0, 20)]));
  localStorage.setItem(SAVED_KEY, JSON.stringify(compact));
}

function getTitle(platform, input, url) {
  const raw = String(input || '').trim();
  if (raw && !/^\s*</.test(raw) && !/^https?:\/\//i.test(raw) && raw.length < 90) return raw;
  const label = PLATFORMS[platform]?.label || 'Game';
  return url
    .replace(/^https?:\/\/(www\.)?/, `${label} / `)
    .replace(/\?.*$/, '')
    .replace(/\/$/, '')
    .slice(0, 90);
}

function platformEmbedStatus(item, language) {
  if (item.embed === true) return language === 'vi' ? 'Nhúng iframe' : 'Iframe';
  if (item.embed === 'limited') return language === 'vi' ? 'Iframe giới hạn' : 'Limited iframe';
  return language === 'vi' ? 'Tab mới' : 'New tab';
}



const GAMES_V44_LIBRARY = [
  { key: 'games4esl', icon: '▣', titleVi: 'Treasure Hunt', title: 'Treasure Hunt', descVi: 'Tìm từ vựng ẩn trong bản đồ kho báu.', desc: 'Find hidden words on a treasure map.', tagVi: 'Từ vựng', tag: 'Vocabulary' },
  { key: 'wordwall', icon: '◉', titleVi: 'Word Rush', title: 'Word Rush', descVi: 'Trả lời nhanh theo chủ đề và thời gian.', desc: 'Fast topic review against the clock.', tagVi: 'Từ vựng', tag: 'Vocabulary' },
  { key: 'kahoot', icon: '◆', titleVi: 'Quiz Arena', title: 'Quiz Arena', descVi: 'Trắc nghiệm nhanh với câu hỏi thách thức.', desc: 'Live quiz with fast challenge questions.', tagVi: 'Ngữ pháp', tag: 'Grammar' },
  { key: 'baamboozle', icon: '✦', titleVi: 'Team Battle', title: 'Team Battle', descVi: 'Thi đấu giữa các đội trong lớp học.', desc: 'Team-vs-team classroom competition.', tagVi: 'Thi đấu', tag: 'Battle' },
  { key: 'learningapps', icon: '▦', titleVi: 'Memory Match', title: 'Memory Match', descVi: 'Ghép cặp và rèn trí nhớ từ vựng.', desc: 'Match pairs and strengthen vocabulary recall.', tagVi: 'Từ vựng', tag: 'Vocabulary' },
];

const GAMES_V44_QUICK = [
  { key: 'classtools', icon: '♨', tone: 'green', titleVi: 'Dụng cụ khởi động', title: 'Warm-up tools', descVi: 'Nóng ghế, vòng quay, bảng điểm...', desc: 'Hot seat, spinner, scoreboard...', actionVi: 'Mở ngay', action: 'Open now' },
  { key: 'baamboozle', icon: '♙', tone: 'amber', titleVi: 'Thi đấu đội nhóm', title: 'Team competition', descVi: 'Tạo phòng, chia đội và tính điểm.', desc: 'Create rooms, teams, and scores.', actionVi: 'Bắt đầu', action: 'Start' },
  { key: 'kahoot', icon: '?', tone: 'blue', titleVi: 'Trò chơi trắc nghiệm', title: 'Quiz games', descVi: 'Câu hỏi, quiz và kiểm tra nhanh.', desc: 'Questions, quizzes, and quick checks.', actionVi: 'Tạo quiz', action: 'Create quiz' },
  { key: 'classtools', icon: '⬡', tone: 'violet', titleVi: 'Bộ chọn ngẫu nhiên', title: 'Random picker', descVi: 'Chọn học sinh, nhóm và phần thưởng.', desc: 'Pick students, groups, and rewards.', actionVi: 'Chọn ngay', action: 'Choose now' },
  { key: 'genially', icon: '+', tone: 'sky', titleVi: 'Tạo trò chơi mới', title: 'Create a new game', descVi: 'Thiết kế trò chơi của riêng bạn.', desc: 'Design a game for your own class.', actionVi: '+ Tạo mới', action: '+ Create' },
  { key: 'wordwall', icon: '♥', tone: 'rose', titleVi: 'Danh sách yêu thích', title: 'Favorites', descVi: 'Trò chơi và công cụ yêu thích.', desc: 'Favorite games and classroom tools.', actionVi: 'Xem ngay', action: 'View now' },
];

const GAMES_V44_RECENT = [
  { key: 'games4esl', title: 'Treasure Hunt', className: 'Lớp 6A', date: '10/06/2026', students: 24 },
  { key: 'wordwall', title: 'Word Rush', className: 'Lớp 6B', date: '10/06/2026', students: 28 },
  { key: 'kahoot', title: 'Quiz Arena', className: 'Lớp 7A', date: '09/06/2026', students: 26 },
  { key: 'baamboozle', title: 'Team Battle', className: 'Lớp 7B', date: '09/06/2026', students: 30 },
  { key: 'learningapps', title: 'Memory Match', className: 'Lớp 6A', date: '08/06/2026', students: 23 },
];

function scrollGamesSection(id) {
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function GamesV44Sidebar({ language, currentUser, onSelectPlatform, totalSaved }) {
  const items = [
    ['games-v44-home', '⌂', 'Trang chủ', 'Home'],
    ['games-v44-library', '⌘', 'Thư viện trò chơi', 'Game library'],
    ['games-v44-quick', '⊕', 'Trò chơi nhanh', 'Quick games'],
    ['games-v44-quick', '⚡', 'Dụng cụ khởi động', 'Warm-up tools'],
    ['games-v44-quick', '♙', 'Thi đấu đội nhóm', 'Team competition'],
    ['games-v44-workspace', '▣', 'Trò chơi trắc nghiệm', 'Quiz games'],
    ['games-v44-workspace', '◇', 'Bộ chọn ngẫu nhiên', 'Random picker'],
    ['games-v44-recent', '◷', 'Phiên gần đây', 'Recent sessions'],
    ['games-v44-library', '☆', 'Yêu thích', 'Favorites'],
    ['games-v44-workspace', '▱', 'Lớp học của tôi', 'My classes'],
  ];
  return (
    <aside className="games-v44-sidebar">
      <div className="games-v44-side-brand">
        <img src="/logo-brian-english.png" alt="Brian English" />
        <strong>BRIAN ENGLISH</strong>
        <span>Studio</span>
      </div>
      <nav className="games-v44-side-nav">
        {items.map(([id, icon, vi, en], index) => (
          <button key={`${id}-${vi}`} type="button" className={index === 0 ? 'active' : ''} onClick={() => scrollGamesSection(id)}>
            <span>{icon}</span><b>{language === 'vi' ? vi : en}</b>
          </button>
        ))}
      </nav>
      <button className="games-v44-side-profile" type="button" onClick={() => onSelectPlatform('games4esl')}>
        <span className="avatar">{String(currentUser?.name || currentUser?.email || 'BE').slice(0,2).toUpperCase()}</span>
        <span><strong>{currentUser?.name || 'Brian English'}</strong><small>{language === 'vi' ? 'Giáo viên' : 'Teacher'}</small></span>
        <em>⌄</em>
      </button>
      <div className="games-v44-side-stats">
        <strong>{language === 'vi' ? 'Thống kê nhanh' : 'Quick stats'}</strong>
        <div>
          <span><b>{Object.keys(PLATFORMS).length * 9 + 27}</b><small>{language === 'vi' ? 'Trò chơi' : 'Games'}</small></span>
          <span><b>24</b><small>{language === 'vi' ? 'Lớp học' : 'Classes'}</small></span>
          <span><b>{892 + totalSaved}</b><small>{language === 'vi' ? 'Phiên đã chơi' : 'Sessions'}</small></span>
        </div>
      </div>
    </aside>
  );
}

function GamesV44HeroArt({ language }) {
  return (
    <div className="games-v44-hero-art" aria-hidden="true">
      <span className="spark s1">✦</span><span className="spark s2">✦</span><span className="spark s3">✦</span>
      <div className="game-window treasure">
        <div className="window-head"><strong>Treasure Hunt</strong><span>×</span></div>
        <p>{language === 'vi' ? 'Tìm các từ ẩn!' : 'Find the hidden words!'}</p>
        <div className="treasure-map"><span>▦</span><b>★</b></div>
      </div>
      <div className="game-window quiz">
        <div className="window-head"><strong>Quiz Arena</strong><span>×</span></div>
        <p>Which word means “happy”?</p>
        <i className="answer correct">A. Happy</i><i className="answer">B. Sad</i><i className="answer">C. Angry</i><i className="answer">D. Tired</i>
      </div>
      <div className="game-window battle">
        <div className="window-head"><strong>Team Battle</strong><span>×</span></div>
        <div className="score-row"><b>230</b><em>VS</em><b>180</b></div>
      </div>
      <div className="game-window rush">
        <div className="window-head"><strong>Word Rush</strong><span>×</span></div>
        <div className="rush-metric"><b>450</b><small>Score</small><b>01:20</b><small>Time</small></div>
      </div>
      <div className="games-v44-trophy">🏆</div>
      <div className="games-v44-controller"><span>✚</span><i /><i /><i /><i /></div>
      <div className="games-v44-podium"><span>2</span><strong>1</strong><span>3</span></div>
    </div>
  );
}

function GamesV44Hero({ language, totalSaved, onPlayNow }) {
  return (
    <section className="games-v44-hero" id="games-v44-home">
      <div className="games-v44-hero-copy">
        <span className="games-v44-kicker">★ Brian English Studio Games</span>
        <h1>{language === 'vi' ? <>Trò chơi lớp học<br/><span>Học vui – Nhớ lâu – Dạy dễ</span></> : <>Classroom games<br/><span>Play more – Remember more – Teach better</span></>}</h1>
        <p>{language === 'vi' ? 'Hệ thống trò chơi và công cụ học tập giúp bạn tạo lớp học sôi nổi, tương tác và đầy cảm hứng.' : 'A classroom game system and toolkit for energetic, interactive, and inspiring lessons.'}</p>
        <div className="games-v44-hero-metrics">
          <span><b>{Object.keys(PLATFORMS).length * 9 + 27}</b><small>{language === 'vi' ? 'Trò chơi' : 'Games'}</small></span>
          <span><b>24</b><small>{language === 'vi' ? 'Lớp học' : 'Classes'}</small></span>
          <span><b>{892 + totalSaved}</b><small>{language === 'vi' ? 'Phiên đã chơi' : 'Sessions'}</small></span>
        </div>
        <div className="games-v44-hero-actions">
          <button type="button" className="primary" onClick={onPlayNow}>{language === 'vi' ? 'Chơi ngay' : 'Play now'}</button>
          <button type="button" className="secondary" onClick={() => scrollGamesSection('games-v44-workspace')}>{language === 'vi' ? 'Mở bảng chọn' : 'Open game board'}</button>
        </div>
      </div>
      <GamesV44HeroArt language={language} />
    </section>
  );
}

function GamesV44Library({ language, onOpen }) {
  return (
    <section className="games-v44-card games-v44-library" id="games-v44-library">
      <header><div><span className="section-icon purple">▱</span><h2>{language === 'vi' ? 'Thư viện trò chơi' : 'Game library'}</h2></div><button type="button" onClick={() => scrollGamesSection('games-v44-workspace')}>{language === 'vi' ? 'Xem tất cả' : 'View all'}</button></header>
      <div className="games-v44-filter-row"><button className="active">{language === 'vi' ? 'Tất cả' : 'All'}</button><button>{language === 'vi' ? 'Từ vựng' : 'Vocabulary'}</button><button>{language === 'vi' ? 'Ngữ pháp' : 'Grammar'}</button><button>{language === 'vi' ? 'Nghe' : 'Listening'}</button><button>{language === 'vi' ? 'Nói' : 'Speaking'}</button><button>{language === 'vi' ? 'Khác' : 'Other'}</button></div>
      <div className="games-v44-library-list">
        {GAMES_V44_LIBRARY.map((item) => (
          <article key={item.title}>
            <span className={`game-icon icon-${item.key}`}>{item.icon}</span>
            <div><strong>{language === 'vi' ? item.titleVi : item.title}</strong><small>{language === 'vi' ? item.descVi : item.desc}</small></div>
            <em>{language === 'vi' ? item.tagVi : item.tag}</em>
            <button type="button" onClick={() => onOpen(item.key)}>{language === 'vi' ? 'Chơi' : 'Play'}</button>
          </article>
        ))}
      </div>
    </section>
  );
}

function GamesV44Quick({ language, onOpen }) {
  return (
    <section className="games-v44-card games-v44-quick" id="games-v44-quick">
      <header><div><span className="section-icon amber">⚡</span><h2>{language === 'vi' ? 'Truy cập nhanh' : 'Quick access'}</h2></div></header>
      <div className="games-v44-quick-grid">
        {GAMES_V44_QUICK.map((item) => (
          <article key={item.title} className={`tone-${item.tone}`}>
            <span className="quick-icon">{item.icon}</span>
            <div><strong>{language === 'vi' ? item.titleVi : item.title}</strong><small>{language === 'vi' ? item.descVi : item.desc}</small></div>
            <button type="button" onClick={() => onOpen(item.key)}>{language === 'vi' ? item.actionVi : item.action}</button>
          </article>
        ))}
      </div>
    </section>
  );
}

function GamesV44Recent({ language, onOpen }) {
  return (
    <section className="games-v44-card games-v44-recent" id="games-v44-recent">
      <header><div><span className="section-icon violet">◷</span><h2>{language === 'vi' ? 'Phiên gần đây' : 'Recent sessions'}</h2></div></header>
      <div className="games-v44-recent-list">
        {GAMES_V44_RECENT.map((item) => (
          <button key={`${item.title}-${item.className}`} type="button" onClick={() => onOpen(item.key)}>
            <span className={`game-icon icon-${item.key}`}>{PLATFORMS[item.key]?.icon || '▣'}</span>
            <span><strong>{item.title}</strong><small>{item.className}</small></span>
            <time>{item.date}</time><em>{item.students} HS</em>
          </button>
        ))}
      </div>
      <button className="wide-link" type="button" onClick={() => scrollGamesSection('games-v44-workspace')}>{language === 'vi' ? 'Xem tất cả phiên' : 'View all sessions'}</button>
    </section>
  );
}

function getCustomGameStatusMeta(status, language) {
  const map = {
    private: { labelVi: 'Của tôi', label: 'Private', tone: 'private' },
    pending: { labelVi: 'Chờ TTCM duyệt', label: 'Pending review', tone: 'pending' },
    approved: { labelVi: 'Dùng chung', label: 'Shared', tone: 'approved' },
    rejected: { labelVi: 'Chưa được duyệt', label: 'Not approved', tone: 'rejected' },
  };
  const item = map[status] || map.private;
  return { label: language === 'vi' ? item.labelVi : item.label, tone: item.tone };
}

function GamesV44Tip({ language }) {
  return (
    <section className="games-v44-tip">
      <span>◆</span><div><strong>{language === 'vi' ? 'Mẹo dành cho giáo viên' : 'Teacher tip'}</strong><p>{language === 'vi' ? 'Kết hợp trò chơi khởi động + thi đấu + quiz để giữ năng lượng lớp học ở mức cao nhất!' : 'Combine warm-ups, competitions, and quizzes to keep classroom energy high.'}</p></div><button type="button" onClick={() => scrollGamesSection('games-v44-workspace')}>{language === 'vi' ? 'Xem hướng dẫn' : 'View guide'} →</button>
    </section>
  );
}

export default function Games({ language, currentUser }) {
  const [platform, setPlatform] = useState('games4esl');
  const [input, setInput] = useState('');
  const [saved, setSaved] = useState(() => getSavedLinks());
  const [customGames, setCustomGames] = useState([]);
  const [customDialogOpen, setCustomDialogOpen] = useState(false);
  const [customDraft, setCustomDraft] = useState({ label: '', icon: '🎮', home: '', embedMode: 'iframe', color: 'violet' });
  const [customGameBusy, setCustomGameBusy] = useState(false);
  const [customGameMessage, setCustomGameMessage] = useState('');
  const [frameUrl, setFrameUrl] = useState(PLATFORMS.games4esl.home);
  const [framePlatform, setFramePlatform] = useState('games4esl');
  const [frameKey, setFrameKey] = useState(1);
  const [iframeFullscreen, setIframeFullscreen] = useState(false);
  const frameWrapRef = useRef(null);
  const canReviewCustomGames = canPublishDepartment(currentUser);

  useEffect(() => {
    let activeRequest = true;
    const load = async () => {
      const items = await listCustomGames(currentUser);
      if (activeRequest) setCustomGames(items);
    };
    load();
    const handleUpdate = () => load();
    window.addEventListener(CUSTOM_GAMES_EVENT, handleUpdate);
    return () => {
      activeRequest = false;
      window.removeEventListener(CUSTOM_GAMES_EVENT, handleUpdate);
    };
  }, [currentUser?.id, currentUser?.email, currentUser?.role]);

  const platformMap = useMemo(() => {
    const customMap = Object.fromEntries(customGames.map((item) => [item.id, {
      ...item,
      embed: item.embedMode === 'iframe',
      supportsIframeCode: item.embedMode === 'iframe',
      descriptionVi: item.descriptionVi || 'Trò chơi tùy chỉnh do bạn thêm vào bảng chọn.',
      descriptionEn: item.descriptionEn || 'A custom game added to your selection board.',
      quickLinks: [],
      isCustom: true,
    }]));
    return { ...PLATFORMS, ...customMap };
  }, [customGames]);

  const active = platformMap[platform] || PLATFORMS.games4esl;
  const frameActive = platformMap[framePlatform] || PLATFORMS.wordwall;
  const savedForActive = saved[platform] || [];

  const quickLinks = useMemo(() => (active.quickLinks || []).map(([vi, en, url]) => ({ label: language === 'vi' ? vi : en, url })), [active, language]);

  const openUrl = (value = input, targetPlatform = platform, mode = 'auto') => {
    const target = platformMap[targetPlatform] || PLATFORMS.wordwall;
    const url = target.isCustom ? ensureWebUrl(value || target.home) : normalizeUrl(targetPlatform, value);
    if (target.embed && mode !== 'tab') {
      setFrameUrl(url);
      setFramePlatform(targetPlatform);
      setFrameKey((n) => n + 1);
      setPlatform(targetPlatform);
      return;
    }
    setFrameUrl(url);
    setFramePlatform(targetPlatform);
    setPlatform(targetPlatform);
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const resetCustomDraft = () => {
    setCustomDraft({ label: '', icon: '🎮', home: '', embedMode: 'iframe', color: 'violet' });
  };

  const saveCustomGame = async (status) => {
    const label = customDraft.label.trim();
    const home = ensureWebUrl(customDraft.home);
    if (!label || !home) return;
    if (!currentUser && status === 'pending') {
      setCustomGameMessage(language === 'vi' ? 'Hãy đăng nhập để gửi TTCM duyệt.' : 'Sign in before submitting for approval.');
      return;
    }
    setCustomGameBusy(true);
    setCustomGameMessage('');
    const effectiveStatus = canReviewCustomGames && status === 'pending' ? 'approved' : status;
    const result = await createCustomGame(currentUser, { ...customDraft, home }, effectiveStatus);
    if (!result.ok) {
      setCustomGameMessage(result.message || (language === 'vi' ? 'Không thể lưu trò chơi.' : 'Could not save the game.'));
      setCustomGameBusy(false);
      return;
    }
    const items = await listCustomGames(currentUser);
    setCustomGames(items);
    setPlatform(result.game.id);
    setCustomDialogOpen(false);
    resetCustomDraft();
    setCustomGameBusy(false);
  };

  const removeCustomGame = async (id) => {
    const result = await deleteCustomGame(currentUser, id);
    if (!result.ok) {
      setCustomGameMessage(result.message || (language === 'vi' ? 'Không thể xóa trò chơi.' : 'Could not delete the game.'));
      return;
    }
    const items = await listCustomGames(currentUser);
    setCustomGames(items);
    if (platform === id) setPlatform('games4esl');
    if (framePlatform === id) {
      setFramePlatform('games4esl');
      setFrameUrl(PLATFORMS.games4esl.home);
      setFrameKey((n) => n + 1);
    }
  };

  const submitExistingGame = async (id) => {
    setCustomGameBusy(true);
    const result = await requestCustomGameApproval(currentUser, id);
    if (!result.ok) setCustomGameMessage(result.message || (language === 'vi' ? 'Không thể gửi TTCM duyệt.' : 'Could not submit for approval.'));
    setCustomGames(await listCustomGames(currentUser));
    setCustomGameBusy(false);
  };

  const reviewCustomGame = async (id, status) => {
    setCustomGameBusy(true);
    const note = status === 'approved'
      ? (language === 'vi' ? 'Đã duyệt dùng chung cho toàn tổ.' : 'Approved for all teachers.')
      : (language === 'vi' ? 'TTCM chưa duyệt. Trò chơi vẫn chỉ hiển thị cho người gửi và TTCM.' : 'Not approved. The game remains visible only to its owner and department leaders.');
    const result = await updateCustomGameStatus(currentUser, id, status, note);
    if (!result.ok) setCustomGameMessage(result.message || (language === 'vi' ? 'Không thể cập nhật trạng thái.' : 'Could not update status.'));
    setCustomGames(await listCustomGames(currentUser));
    setCustomGameBusy(false);
  };

  const addSaved = () => {
    const url = normalizeUrl(platform, input || (platform === framePlatform ? frameUrl : ''));
    const title = getTitle(platform, input, url);
    const nextPlatformLinks = [{ title, url }, ...(saved[platform] || []).filter((item) => item.url !== url)].slice(0, 20);
    const next = { ...saved, [platform]: nextPlatformLinks };
    setSaved(next);
    saveLinks(next);
  };

  const removeSaved = (url) => {
    const next = { ...saved, [platform]: (saved[platform] || []).filter((item) => item.url !== url) };
    setSaved(next);
    saveLinks(next);
  };

  const copyImportPrompt = async () => {
    const prompt = language === 'vi'
      ? `Tạo nội dung game tương tác cho ${active.label}. Chủ điểm: ${input || 'English vocabulary / grammar'}. Xuất dạng bảng gồm: Question | Correct answer | Wrong answer 1 | Wrong answer 2 | Wrong answer 3 | Hint. Nội dung phù hợp học sinh THPT, câu ngắn, rõ, có thể copy vào ${active.label}.`
      : `Create interactive game content for ${active.label}. Topic: ${input || 'English vocabulary / grammar'}. Output as a table: Question | Correct answer | Wrong answer 1 | Wrong answer 2 | Wrong answer 3 | Hint. Make it suitable for high-school English learners and easy to copy into ${active.label}.`;
    await navigator.clipboard?.writeText(prompt);
  };

  const goFullscreen = async () => {
    const el = frameWrapRef.current;
    if (!el) return;
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await el.requestFullscreen();
    } catch {
      setIframeFullscreen((v) => !v);
    }
  };

  const loadQuickLink = (url) => {
    if (active.embed) openUrl(url, platform);
    else window.open(url, '_blank', 'noopener,noreferrer');
  };

  const openSaved = (item) => {
    if (active.embed) openUrl(item.url, platform);
    else window.open(item.url, '_blank', 'noopener,noreferrer');
  };

  if (currentUser && !hasToolAccess(currentUser, 'game-hub')) {
    return (
      <div className="page narrow">
        <SectionHeader
          eyebrow="Game Hub"
          title={language === 'vi' ? 'Game Hub đang chờ cấp quyền' : 'Game Hub access required'}
          text={language === 'vi'
            ? 'Giáo viên vẫn nhìn thấy Game Hub, nhưng cần bấm Xin quyền để admin duyệt trước khi sử dụng.'
            : 'Teachers can still see Game Hub, but they need to request admin approval before using it.'}
        />
        <div className="card-grid two">
          <AppCard item={GAME_APPS[0]} language={language} currentUser={currentUser} />
        </div>
      </div>
    );
  }

  return (
    <div className="page game-hub-page game-hub-v33 game-hub-v58 game-hub-v1 game-hub-v44">
      <div className="games-v44-shell games-v58-no-sidebar">
        <main className="games-v44-main games-v58-main">
          <div className="games-v44-top-actions">
            <button type="button" onClick={() => document.documentElement.classList.toggle('games-v44-soft-dark')}>☼</button>
            <button type="button" onClick={() => scrollGamesSection('games-v44-workspace')}>⚙</button>
            <button type="button" className="quick-create" onClick={() => scrollGamesSection('games-v44-workspace')}>＋ {language === 'vi' ? 'Tạo nhanh' : 'Quick create'}</button>
          </div>
          <GamesV44Hero
            language={language}
            totalSaved={Object.values(saved).reduce((sum, list) => sum + list.length, 0)}
            onPlayNow={() => scrollGamesSection('games-v44-workspace')}
          />
          <section className="game-hub-shell panel games-v46-shell" id="games-v44-workspace">
            <div className="games-v46-board">
              <header className="games-v46-board-head">
                <div>
                  <span className="games-v46-kicker">🎮 Games Studio</span>
                  <h2>{language === 'vi' ? 'Chọn một trò chơi' : 'Choose a game'}</h2>
                  <p>{language === 'vi' ? 'Chọn nền tảng bên dưới để tải và chơi ngay trong Studio.' : 'Select a platform below to load and play in the Studio.'}</p>
                  <div className="games-v58-sharing-note">
                    {canReviewCustomGames
                      ? (language === 'vi'
                        ? `TTCM đang thấy ${customGames.filter((item) => item.status === 'pending').length} trò chơi chờ duyệt. Trò chơi được duyệt sẽ tự xuất hiện cho toàn bộ giáo viên.`
                        : `${customGames.filter((item) => item.status === 'pending').length} games are awaiting review. Approved games become available to every teacher.`)
                      : (language === 'vi'
                        ? 'Trò chơi chưa được duyệt chỉ hiển thị cho người gửi và TTCM. Sau khi TTCM duyệt, trò chơi sẽ trở thành lựa chọn mặc định của toàn tổ.'
                        : 'Unapproved games are visible only to their owner and department leaders. Once approved, they become a default option for the whole department.')}
                  </div>
                </div>
                <span className={`games-v46-selected-chip tone-${active.color}`}>{active.icon} {active.label}</span>
              </header>

              <div className="games-v46-platform-grid">
                {Object.entries(platformMap).map(([key, item]) => {
                  const statusMeta = item.isCustom ? getCustomGameStatusMeta(item.status, language) : null;
                  const owner = item.isCustom ? isCustomGameOwner(currentUser, item) : false;
                  const editable = item.isCustom ? canEditCustomGame(currentUser, item) : false;
                  return (
                    <article key={key} className={`games-v46-platform-card tone-${item.color} ${platform === key ? 'active' : ''} ${item.isCustom ? `custom status-${item.status}` : ''}`}>
                      <button type="button" className="games-v46-platform-main" onClick={() => setPlatform(key)}>
                        <span className="games-v46-platform-icon">{item.icon}</span>
                        <span className="games-v46-platform-copy">
                          <strong>{item.label}</strong>
                          <small>{item.embed ? 'iframe' : (language === 'vi' ? 'tab mới' : 'new tab')}</small>
                          {item.isCustom ? <em className={`games-v58-status-badge ${statusMeta.tone}`}>{statusMeta.label}</em> : null}
                        </span>
                        <span className="games-v46-platform-arrow">{platform === key ? '✓' : '›'}</span>
                      </button>

                      {item.isCustom ? (
                        <div className="games-v58-custom-actions">
                          {owner && ['private', 'rejected'].includes(item.status) ? (
                            <button type="button" className="submit" disabled={customGameBusy || !currentUser} onClick={() => submitExistingGame(key)}>
                              {language === 'vi' ? (item.status === 'rejected' ? 'Gửi lại TTCM' : 'Gửi TTCM duyệt') : (item.status === 'rejected' ? 'Resubmit' : 'Submit')}
                            </button>
                          ) : null}
                          {canReviewCustomGames && item.status === 'pending' ? (
                            <>
                              <button type="button" className="approve" disabled={customGameBusy} onClick={() => reviewCustomGame(key, 'approved')}>{language === 'vi' ? 'Duyệt dùng chung' : 'Approve'}</button>
                              <button type="button" className="reject" disabled={customGameBusy} onClick={() => reviewCustomGame(key, 'rejected')}>{language === 'vi' ? 'Chưa duyệt' : 'Reject'}</button>
                            </>
                          ) : null}
                          {canReviewCustomGames && item.status === 'rejected' ? (
                            <button type="button" className="approve" disabled={customGameBusy} onClick={() => reviewCustomGame(key, 'approved')}>{language === 'vi' ? 'Duyệt lại' : 'Approve now'}</button>
                          ) : null}
                          {editable ? (
                            <button type="button" className="remove" disabled={customGameBusy} onClick={() => removeCustomGame(key)} aria-label={language === 'vi' ? 'Xóa trò chơi tùy chỉnh' : 'Remove custom game'}>×</button>
                          ) : null}
                        </div>
                      ) : null}
                    </article>
                  );
                })}

                <button type="button" className="games-v46-add-card" onClick={() => { setCustomGameMessage(''); setCustomDialogOpen(true); }}>
                  <span>＋</span>
                  <strong>{language === 'vi' ? 'Thêm trò chơi tùy chỉnh' : 'Add custom game'}</strong>
                  <small>{language === 'vi' ? 'Thêm trò chơi hoặc website bất kỳ' : 'Add any game or website'}</small>
                </button>
              </div>
            </div>

            <div className="games-v46-launch-band">
              <button type="button" className="games-v46-load-button" onClick={() => openUrl('', platform)}>
                <span>🚀</span>
                {active.embed ? (language === 'vi' ? 'Tải vào Studio' : 'Load in Studio') : (language === 'vi' ? 'Mở trò chơi' : 'Open game')}
              </button>
              <small>{active.embed
                ? (language === 'vi' ? `${active.label} sẽ được tải vào thẻ Live Game.` : `${active.label} will load inside the Live Game card.`)
                : (language === 'vi' ? `${active.label} sẽ mở trong một tab mới.` : `${active.label} will open in a new tab.`)}</small>
            </div>

            <section className="games-v46-live-card">
              <header className="games-v46-live-head">
                <div className="games-v46-live-title">
                  <span className={`games-v46-live-icon tone-${frameActive.color}`}>{frameActive.icon}</span>
                  <div>
                    <h3>{language === 'vi' ? 'Trò chơi trực tiếp' : 'Live Game'}</h3>
                    <p><b>{frameActive.label}</b><span>•</span>{frameActive.embed ? (language === 'vi' ? 'Xem trước trực tiếp' : 'Live preview') : (language === 'vi' ? 'Mở ngoài Studio' : 'External launch')}</p>
                  </div>
                </div>
                <div className="games-v46-live-actions">
                  {frameActive.embed ? <button type="button" onClick={() => setFrameKey((n) => n + 1)} title={language === 'vi' ? 'Tải lại' : 'Reload'}>↻</button> : null}
                  {frameActive.embed ? <button type="button" onClick={goFullscreen} title={language === 'vi' ? 'Toàn màn hình' : 'Fullscreen'}>⛶</button> : null}
                  <button type="button" onClick={() => window.open(frameUrl || frameActive.home, '_blank', 'noopener,noreferrer')} title={language === 'vi' ? 'Mở tab riêng' : 'Open in new tab'}>↗</button>
                </div>
              </header>

              <div className="games-v46-preview-label">{language === 'vi' ? 'Xem trước trực tiếp' : 'Live Preview'}</div>

              {frameActive.embed ? (
                <div className={`game-embed-shell games-v46-embed-shell ${iframeFullscreen ? 'pseudo-fullscreen' : ''}`} ref={frameWrapRef}>
                  <iframe
                    key={frameKey}
                    className="game-embed-frame games-v46-embed-frame"
                    title={`${frameActive.label} embedded in Brian English Studio`}
                    src={frameUrl}
                    allow="fullscreen; clipboard-read; clipboard-write; autoplay; microphone; camera; gamepad; accelerometer; gyroscope"
                    referrerPolicy="strict-origin-when-cross-origin"
                  />
                </div>
              ) : (
                <div className="games-v46-external-card">
                  <span className={`games-v46-external-icon tone-${frameActive.color}`}>{frameActive.icon}</span>
                  <strong>{language === 'vi' ? `${frameActive.label} mở bằng tab mới` : `${frameActive.label} opens in a new tab`}</strong>
                  <p>{language === 'vi' ? 'Nền tảng này không hỗ trợ nhúng ổn định. Nhấn nút bên dưới để mở trực tiếp.' : 'This platform does not support reliable embedding. Use the button below to open it directly.'}</p>
                  <button type="button" className="primary" onClick={() => window.open(frameActive.home, '_blank', 'noopener,noreferrer')}>{language === 'vi' ? `Mở ${frameActive.label}` : `Open ${frameActive.label}`}</button>
                </div>
              )}
            </section>
          </section>

          <CustomGameDialog
            language={language}
            open={customDialogOpen}
            draft={customDraft}
            setDraft={setCustomDraft}
            onClose={() => { setCustomDialogOpen(false); setCustomGameMessage(''); }}
            onSavePrivate={() => saveCustomGame('private')}
            onSubmitForReview={() => saveCustomGame('pending')}
            isLeader={canReviewCustomGames}
            busy={customGameBusy}
            message={customGameMessage}
          />
        </main>
      </div>
    </div>
  );
}
