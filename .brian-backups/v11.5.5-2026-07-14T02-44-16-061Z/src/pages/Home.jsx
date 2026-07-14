import React, { useEffect, useMemo, useRef, useState } from 'react';
import { APPS, GAME_APPS, SPECIAL_TOOLS } from '../data/apps.js';
import { getFirstAllowedRoute, hasRouteAccess } from '../utils/permissions.js';
import { getAppDesignProfile } from '../data/designProfiles.js';
import { launchRoute } from '../utils/motion.js';
import { isAppHiddenForUser } from '../utils/appVisibility.js';
import { visibilityIdForRoute } from '../data/appVisibilityRegistry.js';

const palette = {
  ink: '#191515',
  cream: '#f3dfd8',
  peach: '#ffc69d',
  blush: '#c9aaa6',
  orange: '#e95f08',
  plum: '#5d123f',
  yellow: '#f7d23b',
  aqua: '#d9f6f7',
  teal: '#2bb7b3',
  mint: '#aee3ba',
  lime: '#c7da56',
  blue: '#6ed7ff',
  navy: '#16151c',
  white: '#ffffff',
};

const routeColors = {
  home: palette.peach,
  apps: palette.teal,
  games: palette.plum,
  department: palette.orange,
  library: '#6fba7b',
  admin: '#ef4f6f',
  settings: '#5c6ac4',
  login: palette.ink,
};

const copy = {
  vi: {
    studio: 'Brian English Studio',
    kicker: 'Brian English',
    titleA: 'Brian',
    titleB: 'English',
    titleC: '',
    subtitle: 'Không gian dạy học số của Brian English: mở nhanh ứng dụng, trò chơi, thư viện và công cụ quản lý trong một hệ thống thống nhất.',
    account: 'User',
    guest: 'Guest',
    signIn: 'Đăng nhập',
    register: 'Đăng kí',
    aiOn: 'AI ready',
    aiOff: 'AI setup',
    open: 'Mở',
    nav: {
      start: 'Trang chủ', apps: 'Ứng dụng', games: 'Trò chơi', dept: 'Tổ chuyên môn', library: 'Thư viện', settings: 'Cài đặt', admin: 'Quản trị', contact: 'Liên hệ', resources: 'Tài nguyên', setup: 'Thiết lập',
    },
    chips: {
      pin: 'Ứng dụng ghim',
      flow: 'Soạn bài · Kiểm tra · Chơi · Quản lý',
      locked: 'Đăng nhập để mở',
      today: 'Today',
    },
  },
  en: {
    studio: 'Brian English Studio',
    kicker: 'Brian English',
    titleA: 'Brian',
    titleB: 'English',
    titleC: '',
    subtitle: 'Brian English digital teaching workspace: quickly open apps, games, libraries, and management tools in one unified system.',
    account: 'User',
    guest: 'Guest',
    signIn: 'Sign in',
    register: 'Register',
    aiOn: 'AI ready',
    aiOff: 'AI setup',
    open: 'Open',
    nav: {
      start: 'Home', apps: 'Apps', games: 'Games', dept: 'Department', library: 'Library', settings: 'Settings', admin: 'Admin', contact: 'Contact', resources: 'Resources', setup: 'Setup',
    },
    chips: {
      pin: 'Ứng dụng ghim',
      flow: 'Soạn bài · Kiểm tra · Chơi · Quản lý',
      locked: 'Sign in to open',
      today: 'Today',
    },
  },
};

const iconPaths = {
  lesson: (
    <>
      <path d="M18 17h27c5 0 8 3 8 8v58c0-5-4-8-9-8H18V17Z" />
      <path d="M82 17H55c-5 0-8 3-8 8v58c0-5 4-8 9-8h26V17Z" />
      <path d="M29 33h13M29 45h11M61 33h13M61 45h11" />
    </>
  ),
  exam: (
    <>
      <path d="M30 14h40v72H30V14Z" />
      <path d="M40 30h22M40 43h22M40 56h16" />
      <path d="M63 65l7 7 15-18" />
    </>
  ),
  game: (
    <>
      <path d="M25 42h50c8 0 14 6 16 16l3 16c2 9-5 15-13 10L66 74H34L19 84c-8 5-15-1-13-10l3-16c2-10 8-16 16-16Z" />
      <path d="M31 58h16M39 50v16M70 56h1M80 64h1" />
    </>
  ),
  library: (
    <>
      <path d="M18 24h25l7 9h32v43H18V24Z" />
      <path d="M18 38h64M29 51h43M29 63h30" />
    </>
  ),
  settings: (
    <>
      <circle cx="50" cy="50" r="11" />
      <path d="M50 16v10M50 74v10M26 26l7 7M67 67l7 7M16 50h10M74 50h10M26 74l7-7M67 33l7-7" />
    </>
  ),
  user: (
    <>
      <circle cx="50" cy="33" r="14" />
      <path d="M24 82c4-18 16-27 26-27s22 9 26 27" />
    </>
  ),
  home: (
    <>
      <path d="M18 49 50 20l32 29" />
      <path d="M27 47v35h46V47" />
      <path d="M42 82V61h16v21" />
    </>
  ),
  apps: (
    <>
      <path d="M19 19h24v24H19V19ZM57 19h24v24H57V19ZM19 57h24v24H19V57ZM57 57h24v24H57V57Z" />
    </>
  ),
  ai: (
    <>
      <path d="M24 50c0-15 11-26 26-26s26 11 26 26-11 26-26 26-26-11-26-26Z" />
      <path d="M35 62 45 38h10l10 24M40 53h20" />
    </>
  ),
  worksheet: (
    <>
      <path d="M27 14h40l12 12v60H27V14Z" />
      <path d="M67 14v14h14M38 43h30M38 55h30M38 67h20" />
    </>
  ),
  textcare: (
    <>
      <path d="M20 22h24v24H20V22ZM56 22h24v24H56V22ZM20 58h24v24H20V58ZM56 58h24v24H56V58Z" />
      <path d="M26 34h12M62 34h12M26 70h12M62 70h12" />
    </>
  ),
  reading: (
    <>
      <path d="M18 20h28c5 0 8 3 8 8v55c0-5-3-8-8-8H18V20Z" />
      <path d="M82 20H54v63c0-5 3-8 8-8h20V20Z" />
      <path d="M28 36h16M28 48h14M62 36h12M62 48h14" />
    </>
  ),
  wordgraph: (
    <>
      <rect x="16" y="36" width="28" height="28" rx="4" />
      <rect x="58" y="16" width="26" height="26" rx="4" />
      <rect x="58" y="58" width="26" height="26" rx="4" />
      <path d="M44 48 58 33M44 56l14 15" />
    </>
  ),
  speaking: (
    <>
      <path d="M15 20h54v39H40L25 73V59H15V20Z" />
      <path d="M46 42h39v31H70L58 83V73H46V42Z" />
      <path d="M27 35h30M27 45h20M58 56h17" />
    </>
  ),
  listening: (
    <>
      <path d="M22 57V45c0-17 11-29 28-29s28 12 28 29v12" />
      <rect x="15" y="50" width="18" height="30" rx="7" />
      <rect x="67" y="50" width="18" height="30" rx="7" />
      <path d="M67 75c-4 8-10 11-18 11" />
    </>
  ),
  grammar: (
    <>
      <path d="M18 58 34 42l16 16-16 16-16-16ZM42 32l16-16 16 16-16 16-16-16ZM50 70l16-16 16 16-16 16-16-16Z" />
    </>
  ),
  writing: (
    <>
      <path d="m20 76 7-23 37-37 18 18-37 37-25 5Z" />
      <path d="m55 25 18 18M27 53l18 18M20 76l8-8" />
    </>
  ),
  pronunciation: (
    <>
      <path d="M18 54v-8M30 66V34M42 77V23M54 68V32M66 61V39M78 54v-8" />
      <path d="M14 50h70" opacity=".28" />
    </>
  ),
  contact: (
    <>
      <path d="M18 25h64v50H18V25Z" />
      <path d="m19 28 31 25 31-25" />
    </>
  ),
};

const slugIconMap = {
  'lesson-plan-ai': 'lesson',
  'exam-studio': 'exam',
  textcare: 'textcare',
  'reading-studio': 'reading',
  word2graph: 'wordgraph',
  'speaking-studio': 'speaking',
  'worksheet-factory': 'worksheet',
  'listening-lab': 'listening',
  'grammar-builder': 'grammar',
  'writing-studio': 'writing',
  'pronunciation-coach': 'pronunciation',
  'student-practice': 'sprint',
  'department-workspace': 'department',
  'game-hub': 'game',
};

function findApp(slug) {
  return [...APPS, ...GAME_APPS, ...SPECIAL_TOOLS].find((item) => item.slug === slug);
}

function itemTarget(item) {
  if (!item) return '#/apps';
  return item.route ? `#/${item.route}` : `#/tool/${item.slug}`;
}

function publicTarget(target) {
  return ['#/home', '#/login', '#/register', '#/resources', '#/contact', '#/setup'].includes(target);
}

function getShortName(user, fallback) {
  const source = user?.name || user?.email || fallback;
  const parts = String(source || '').trim().split(/\s+/).filter(Boolean);
  return parts.length > 1 ? parts[parts.length - 1] : parts[0] || fallback;
}

function launch(target, label = 'GO', color = palette.ink, currentUser = null, sourceEl = null) {
  const finalTarget = !currentUser && !publicTarget(target) && target !== '#/home' ? '#/login' : target;
  const cleanTarget = finalTarget.replace(/^#\//, '#/');
  launchRoute({ target: cleanTarget, label, color, sourceEl });
}

function navLaunch(route, label, color, currentUser, sourceEl) {
  const target = route.startsWith('#/') ? route : `#/${route}`;
  launch(target, label, color, currentUser, sourceEl);
}

function MetroIcon({ type }) {
  const key = slugIconMap[type] || type || 'apps';
  return (
    <span className="flat-line-icon" aria-hidden="true">
      <svg viewBox="0 0 100 100" focusable="false">
        <g fill="none" stroke="currentColor" strokeWidth="5" strokeLinecap="square" strokeLinejoin="miter">
          {iconPaths[key] || iconPaths.apps}
        </g>
      </svg>
    </span>
  );
}

function makeAppWindow(slug, options = {}) {
  const app = findApp(slug);
  const title = options.title || app?.titleVi || app?.title || slug;
  return {
    slug,
    title,
    icon: options.icon || slug,
    target: options.target || itemTarget(app),
    label: options.label || app?.icon || title.slice(0, 2),
    color: options.color || palette.ink,
    bg: options.bg || palette.cream,
    accent: options.accent || palette.orange,
    className: options.className || '',
    variant: options.variant || 'poster',
    meta: options.meta || app?.groupVi || app?.group || 'Tool',
    text: options.text || app?.descVi || app?.desc || '',
    requiresUser: options.requiresUser ?? true,
    visibilityId: options.visibilityId || `tool:${slug}`,
    motion: options.motion || {},
  };
}

function FlatAppWindow({ item, currentUser, language }) {
  const locked = item.requiresUser && !currentUser;
  const target = locked ? '#/login' : item.target;
  const className = `flat-window flat-window-${item.variant} ${item.className} ${locked ? 'is-locked' : ''}`.trim();
  const t = copy[language] || copy.vi;

  return (
    <button
      type="button"
      className={className}
      data-depth={item.motion?.depth ?? 0.45}
      style={{
        '--window-bg': item.bg,
        '--window-accent': item.accent,
        '--window-launch': item.color,
        '--motion-delay': item.motion?.delay || '0s',
        '--motion-duration': item.motion?.duration || '8s',
        '--motion-x': item.motion?.x || '0px',
        '--motion-y': item.motion?.y || '-10px',
        '--motion-rotate': item.motion?.rotate || '1deg',
      }}
      onClick={(event) => launch(target, item.label, item.color, currentUser, event.currentTarget)}
      aria-label={`${t.open} ${item.title}`}
    >
      <span className="flat-window-chrome">
        <span className="flat-traffic"><i /><i /><i /></span>
        <b>{item.meta}</b>
      </span>
      <span className="flat-window-content">
        <WindowVisual item={item} locked={locked} language={language} />
      </span>
    </button>
  );
}

function WindowVisual({ item, locked, language }) {
  const t = copy[language] || copy.vi;
  if (item.variant === 'hero') {
    return (
      <>
        <span className="flat-browser-pills"><i>{language === 'vi' ? 'Bài dạy' : 'Lesson'}</i><i>{language === 'vi' ? 'Thiết kế' : 'Design'}</i><i>{language === 'vi' ? 'Xuất file' : 'Export'}</i></span>
        <strong className="flat-window-title flat-window-title-big">{item.title}</strong>
        <small className="flat-window-desc">{item.text}</small>
        <span className="flat-note-card">{language === 'vi' ? '5512 + năng lực số' : '5512 + digital competencies'}</span>
        <span className="flat-floating-signature">@catrich.mauxanh</span>
        {locked ? <em className="flat-lock-tag">{t.chips.locked}</em> : null}
      </>
    );
  }

  if (item.variant === 'orange') {
    return (
      <>
        <span className="flat-orange-disc">
          <strong>{item.title}</strong>
          <small>{item.text}</small>
          <MetroIcon type={item.icon} />
        </span>
        <span className="flat-side-dots"><i /><i /><i /><i /><i /></span>
        {locked ? <em className="flat-lock-tag">{t.chips.locked}</em> : null}
      </>
    );
  }

  if (item.variant === 'vertical') {
    return (
      <>
        <span className="flat-vertical-word">WORD</span>
        <span className="flat-product-can"><MetroIcon type={item.icon} /></span>
        <strong className="flat-window-title">{item.title}</strong>
      </>
    );
  }

  if (item.variant === 'motion') {
    return (
      <>
        <span className="flat-motion-icon"><MetroIcon type={item.icon} /></span>
        <span className="flat-motion-copy">
          <strong className="flat-window-title">{item.title}</strong>
          <small className="flat-window-desc">{item.text}</small>
        </span>
        {locked ? <em className="flat-lock-tag">{t.chips.locked}</em> : null}
      </>
    );
  }

  if (item.variant === 'dark') {
    return (
      <>
        <MetroIcon type={item.icon} />
        <strong className="flat-window-title flat-window-title-invert">{item.title}</strong>
        <small className="flat-window-desc">{item.text}</small>
      </>
    );
  }

  return (
    <>
      <MetroIcon type={item.icon} />
      <strong className="flat-window-title">{item.title}</strong>
      <small className="flat-window-desc">{item.text}</small>
      {locked ? <em className="flat-lock-tag">{t.chips.locked}</em> : null}
    </>
  );
}

function AppChip({ item, currentUser, language }) {
  const t = copy[language] || copy.vi;
  return (
    <button
      type="button"
      className="flat-app-chip"
      style={{ '--chip-bg': item.accent || item.color || palette.ink }}
      onClick={(event) => launch(item.target, item.label, item.color || palette.ink, currentUser, event.currentTarget)}
      aria-label={`${t.open} ${item.title}`}
    >
      <MetroIcon type={item.icon} />
      <span>{item.title}</span>
    </button>
  );
}

function FlatPinnedMenu({ language, setLanguage, theme, setTheme, hasApiKey, currentUser, firstRoute, accountName, currentTime }) {
  const t = copy[language] || copy.vi;
  const isAdmin = currentUser?.role === 'admin';
  const items = [
    { key: 'home', label: t.nav.start, icon: 'home', color: routeColors.home, public: true },
    { key: 'apps', label: t.nav.apps, icon: 'apps', color: routeColors.apps },
    { key: 'games', label: t.nav.games, icon: 'game', color: routeColors.games },
    { key: 'department', label: t.nav.dept, icon: 'department', color: routeColors.department },
    { key: 'library', label: t.nav.library, icon: 'library', color: routeColors.library },
    ...(isAdmin ? [{ key: 'admin', label: t.nav.admin, icon: 'settings', color: routeColors.admin }] : []),
  ];

  return (
    <nav className="flat-pinned-menu" aria-label="Flat homepage navigation">
      <button
        type="button"
        className="flat-brand-button"
        onClick={(event) => navLaunch('home', 'ST', palette.peach, currentUser, event.currentTarget)}
      >
        <img className="flat-brand-logo" src="/brian-english-brand-mark.png" alt="Brian English logo" />
        <strong>Brian English</strong>
      </button>

      <div className="flat-nav-links">
        {items.map((item) => (
          <button
            key={item.key}
            type="button"
            className="flat-nav-link"
            style={{ '--nav-hover': item.color }}
            onClick={(event) => navLaunch(item.key, item.label, item.color, item.public ? currentUser || { guest: true } : currentUser, event.currentTarget)}
          >
            <MetroIcon type={item.icon} />
            <span>{item.label}</span>
          </button>
        ))}
      </div>

      <div className="flat-menu-actions">
        <button
          type="button"
          className="flat-menu-pill"
          onClick={(event) => navLaunch(currentUser ? 'settings' : 'login', 'AI', hasApiKey ? palette.teal : palette.yellow, currentUser, event.currentTarget)}
        >
          {hasApiKey ? t.aiOn : t.aiOff}
        </button>
        <button type="button" className="flat-menu-pill" onClick={() => setLanguage?.(language === 'vi' ? 'en' : 'vi')}>{language === 'vi' ? 'VI' : 'EN'}</button>
        <button type="button" className="flat-menu-pill" onClick={() => setTheme?.(theme === 'dark' ? 'light' : 'dark')}>{theme === 'dark' ? '☀' : '☾'}</button>
        <button
          type="button"
          className="flat-account-button"
          onClick={(event) => launch(currentUser ? `#/${firstRoute}` : '#/login', 'ME', palette.ink, currentUser, event.currentTarget)}
        >
          <span>{currentUser ? accountName.slice(0, 1).toUpperCase() : '■'}</span>
          <strong>{currentUser ? accountName : t.account}</strong>
          <small>{currentTime}</small>
        </button>
      </div>
    </nav>
  );
}

export default function Home({ hasApiKey, currentUser, language = 'vi', setLanguage, theme, setTheme, appVisibility, effectiveMotionMode = 'lite' }) {
  const [now, setNow] = useState(() => new Date());
  const collageRef = useRef(null);
  const t = copy[language] || copy.vi;
  const isVi = language === 'vi';
  const visibilitySnapshot = appVisibility?.snapshot;
  const canShowId = (id) => !isAppHiddenForUser(visibilitySnapshot, currentUser, id);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 30000);
    return () => window.clearInterval(timer);
  }, []);

  const firstRoute = currentUser ? getFirstAllowedRoute(currentUser) : 'login';
  const canLibrary = currentUser && hasRouteAccess(currentUser, 'library');
  const canDepartment = currentUser && hasRouteAccess(currentUser, 'department');
  const accountName = getShortName(currentUser, t.guest);
  const time = new Intl.DateTimeFormat(language === 'vi' ? 'vi-VN' : 'en-US', { hour: '2-digit', minute: '2-digit', hour12: false }).format(now);
  const date = new Intl.DateTimeFormat(language === 'vi' ? 'vi-VN' : 'en-US', { weekday: 'short', day: '2-digit', month: '2-digit' }).format(now);

  const handleScenePointerMove = (event) => {
    if (effectiveMotionMode === 'off' || !collageRef.current || event.pointerType === 'touch') return;
    const rect = collageRef.current.getBoundingClientRect();
    const normalizedX = ((event.clientX - rect.left) / rect.width - 0.5) * 2;
    const normalizedY = ((event.clientY - rect.top) / rect.height - 0.5) * 2;
    collageRef.current.querySelectorAll('[data-depth]').forEach((node) => {
      const depth = Number(node.dataset.depth || 0.45);
      node.style.setProperty('--parallax-x', `${(normalizedX * depth * 14).toFixed(2)}px`);
      node.style.setProperty('--parallax-y', `${(normalizedY * depth * 10).toFixed(2)}px`);
    });
  };

  const resetSceneParallax = () => {
    collageRef.current?.querySelectorAll('[data-depth]').forEach((node) => {
      node.style.setProperty('--parallax-x', '0px');
      node.style.setProperty('--parallax-y', '0px');
    });
  };

  const windows = useMemo(() => {
    const profile = (slug) => getAppDesignProfile(slug);
    const lessonStyle = profile('lesson-plan-ai');
    const examStyle = profile('exam-studio');
    const gameStyle = profile('game-hub');
    const wordStyle = profile('word2graph');
    const readingStyle = profile('reading-studio');
    const speakingStyle = profile('speaking-studio');
    const textcareStyle = profile('textcare');
    const worksheetStyle = profile('worksheet-factory');
    const listeningStyle = profile('listening-lab');
    const grammarStyle = profile('grammar-builder');
    const writingStyle = profile('writing-studio');
    const pronunciationStyle = profile('pronunciation-coach');

    const lesson = makeAppWindow('lesson-plan-ai', {
      variant: 'hero', className: 'flat-window-main', bg: lessonStyle.soft, accent: lessonStyle.accent,
      color: lessonStyle.accent, icon: lessonStyle.icon, meta: isVi ? 'Thiết kế bài dạy thông minh' : 'Smart lesson design',
      text: isVi ? 'Thiết kế giáo án, học liệu và xuất bài dạy tương tác.' : 'Design lesson plans, materials and interactive teaching pages.',
      motion: { delay: '-1.2s', duration: '9.5s', x: '7px', y: '-13px', rotate: '.7deg', depth: .78 },
    });
    const exam = makeAppWindow('exam-studio', {
      variant: 'motion', className: 'flat-window-exam', bg: examStyle.soft, accent: examStyle.accent,
      color: examStyle.accent, icon: examStyle.icon, meta: isVi ? 'Kiểm tra & đánh giá' : 'Assessment',
      text: isVi ? 'Tạo đề, cloze và câu hỏi.' : 'Build tests, cloze tasks and questions.',
      motion: { delay: '-3.8s', duration: '8.1s', x: '-8px', y: '-11px', rotate: '-1.1deg', depth: .5 },
    });
    const game = makeAppWindow('game-hub', {
      variant: 'motion', className: 'flat-window-game', bg: gameStyle.soft, accent: gameStyle.accent,
      color: gameStyle.accent, icon: gameStyle.icon, meta: isVi ? 'Trò chơi học tập' : 'Learning games',
      text: isVi ? 'Mở trò chơi lớp học.' : 'Launch classroom games.',
      motion: { delay: '-5.1s', duration: '8.8s', x: '8px', y: '-8px', rotate: '1.2deg', depth: .44 },
    });
    const word = makeAppWindow('word2graph', {
      variant: 'motion', className: 'flat-window-word', bg: wordStyle.soft, accent: wordStyle.accent,
      color: wordStyle.accent, icon: wordStyle.icon, meta: isVi ? 'Từ vựng thông minh' : 'Smart vocabulary',
      text: isVi ? 'Word family và collocation.' : 'Word families and collocations.',
      motion: { delay: '-2.7s', duration: '9.2s', x: '10px', y: '-10px', rotate: '.8deg', depth: .62 },
    });
    const reading = makeAppWindow('reading-studio', {
      variant: 'motion', className: 'flat-window-reading', bg: readingStyle.soft, accent: readingStyle.accent,
      color: readingStyle.accent, icon: readingStyle.icon, meta: isVi ? 'Đọc hiểu & từ vựng' : 'Reading & vocabulary',
      text: isVi ? 'Bài đọc, câu hỏi và từ vựng.' : 'Readings, questions and vocabulary.',
      motion: { delay: '-6.2s', duration: '9.8s', x: '-8px', y: '-13px', rotate: '-.6deg', depth: .55 },
    });
    const speaking = makeAppWindow('speaking-studio', {
      variant: 'motion', className: 'flat-window-speaking', bg: speakingStyle.soft, accent: speakingStyle.accent,
      color: speakingStyle.accent, icon: speakingStyle.icon, meta: isVi ? 'Luyện nói & phản xạ' : 'Speaking & fluency',
      text: isVi ? 'Thẻ nói và phản xạ.' : 'Speaking cards and fluency drills.',
      motion: { delay: '-4.4s', duration: '7.9s', x: '7px', y: '-12px', rotate: '1deg', depth: .5 },
    });
    const textcare = makeAppWindow('textcare', {
      variant: 'motion', className: 'flat-window-textcare', bg: textcareStyle.soft, accent: textcareStyle.accent,
      color: textcareStyle.accent, icon: textcareStyle.icon, meta: isVi ? 'Chỉnh sửa tự động' : 'Automatic editing',
      text: isVi ? 'Chuẩn hoá văn bản.' : 'Normalize documents.',
      motion: { delay: '-1.9s', duration: '8.6s', x: '-6px', y: '-10px', rotate: '-1deg', depth: .48 },
    });
    const worksheet = makeAppWindow('worksheet-factory', {
      variant: 'motion', className: 'flat-window-worksheet', bg: worksheetStyle.soft, accent: worksheetStyle.accent,
      color: worksheetStyle.accent, icon: worksheetStyle.icon, meta: isVi ? 'Phiếu học tập' : 'Worksheets',
      text: isVi ? 'Tạo worksheet từ file và chủ đề.' : 'Create worksheets from files and topics.',
      motion: { delay: '-7.1s', duration: '9.4s', x: '-7px', y: '-9px', rotate: '.7deg', depth: .52 },
    });
    const listening = makeAppWindow('listening-lab', {
      variant: 'motion', className: 'flat-window-listening', bg: listeningStyle.soft, accent: listeningStyle.accent,
      color: listeningStyle.accent, icon: listeningStyle.icon, meta: isVi ? 'Nghe hiểu' : 'Listening comprehension',
      text: isVi ? 'Nhiệm vụ nghe và phản hồi.' : 'Listening tasks and responses.',
      motion: { delay: '-3.1s', duration: '8.9s', x: '9px', y: '-12px', rotate: '-.8deg', depth: .56 },
    });
    const grammar = makeAppWindow('grammar-builder', {
      variant: 'motion', className: 'flat-window-grammar', bg: grammarStyle.soft, accent: grammarStyle.accent,
      color: grammarStyle.accent, icon: grammarStyle.icon, meta: isVi ? 'Grammar workflow V2' : 'Grammar workflow V2',
      text: isVi ? 'Tạo, kiểm định và phân phối học liệu.' : 'Build, audit and publish grammar packs.',
      motion: { delay: '-5.8s', duration: '10.1s', x: '-8px', y: '-9px', rotate: '.6deg', depth: .4 },
    });
    const writing = makeAppWindow('writing-studio', {
      variant: 'motion', className: 'flat-window-writing', bg: writingStyle.soft, accent: writingStyle.accent,
      color: writingStyle.accent, icon: writingStyle.icon, meta: isVi ? 'Viết & sáng tạo' : 'Writing & creativity',
      text: isVi ? 'Lập dàn ý, viết và chỉnh sửa.' : 'Plan, draft and revise writing.',
      motion: { delay: '-4.9s', duration: '9.6s', x: '6px', y: '-10px', rotate: '-.5deg', depth: .46 },
    });
    const pronunciation = makeAppWindow('pronunciation-coach', {
      variant: 'motion', className: 'flat-window-pronunciation', bg: pronunciationStyle.soft, accent: pronunciationStyle.accent,
      color: pronunciationStyle.accent, icon: pronunciationStyle.icon, meta: isVi ? 'Phát âm chuẩn' : 'Pronunciation',
      text: isVi ? 'Âm, trọng âm và nối âm.' : 'Sounds, stress and connected speech.',
      motion: { delay: '-6.7s', duration: '8.4s', x: '8px', y: '-8px', rotate: '.9deg', depth: .42 },
    });
    return { lesson, exam, game, word, reading, speaking, textcare, worksheet, listening, grammar, writing, pronunciation };
  }, [isVi]);

  const chips = useMemo(() => {
    const practiceStyle = getAppDesignProfile('student-practice');
    const libraryStyle = getAppDesignProfile('library-hub');
    const integrationStyle = getAppDesignProfile('english-lesson-integration');
    return [
      makeAppWindow('english-lesson-integration', {
        icon: integrationStyle.icon,
        accent: integrationStyle.accent,
        color: integrationStyle.accent,
        text: isVi ? 'Tích hợp NLS, AI và hòa nhập.' : 'Integrate digital, AI and inclusive learning.',
        meta: isVi ? integrationStyle.styleVi : integrationStyle.style,
      }),
      windows.lesson,
      windows.exam,
      makeAppWindow('student-practice', {
        icon: practiceStyle.icon,
        accent: practiceStyle.accent,
        color: practiceStyle.accent,
        text: isVi ? 'Luyện tập.' : 'Practice.',
        meta: isVi ? practiceStyle.styleVi : practiceStyle.style,
      }),
      { title: isVi ? 'Thư viện' : 'Library', icon: 'library', target: canLibrary ? '#/library' : '#/login', label: 'LB', accent: libraryStyle.accent, color: libraryStyle.accent, requiresUser: true, visibilityId: visibilityIdForRoute('library') },
      { title: hasApiKey ? (isVi ? 'Kết nối AI' : 'AI Access') : (isVi ? 'Cài đặt AI' : 'AI Setup'), icon: 'ai', target: currentUser ? '#/settings' : '#/login', label: 'AI', accent: hasApiKey ? palette.teal : palette.yellow, color: hasApiKey ? palette.teal : palette.yellow, requiresUser: true, visibilityId: 'route:settings' },
    ].filter((item) => canShowId(item.visibilityId));
  }, [canLibrary, currentUser, hasApiKey, isVi, windows, visibilitySnapshot]);


  const featuredWindows = useMemo(() => [
    windows.lesson, windows.exam, windows.textcare, windows.speaking,
    windows.reading, windows.word, windows.worksheet, windows.game,
    windows.listening, windows.grammar, windows.writing, windows.pronunciation,
  ].filter((item) => canShowId(item.visibilityId)), [windows, visibilitySnapshot, currentUser?.role]);

  return (
    <div className={`flat-design-home home-v1137 motion-${effectiveMotionMode}`} aria-label="Brian English homepage">
      <section className="flat-hero-zone">
        <div className="flat-hero-copy">
          <p className="flat-kicker">{t.kicker}</p>
          <h1>
            <span className="flat-bubble-word">{t.titleA}</span>
            <span>{t.titleB}</span>
            {t.titleC ? <span>{t.titleC}</span> : null}
          </h1>
          <p className="flat-subtitle">{t.subtitle}</p>
          <div className="flat-hero-meta">
            <button type="button" onClick={(event) => launch(currentUser ? `#/${firstRoute}` : '#/login', 'ME', palette.ink, currentUser, event.currentTarget)}>
              <MetroIcon type="user" />
              <span>{currentUser ? accountName : t.signIn}</span>
            </button>
            <small>{t.chips.today}: {date} · {time}</small>
          </div>
          <button
            type="button"
            className="home-motion-badge"
            onClick={(event) => launch('#/apps', 'APP', palette.peach, currentUser, event.currentTarget)}
          >
            <span aria-hidden="true">✦</span>
            <strong>{isVi ? 'Thẻ ứng dụng chuyển động' : 'Animated app cards'}</strong>
            <small>{isVi ? 'Di chuột để khám phá!' : 'Move the pointer to explore!'}</small>
          </button>
        </div>

        <div
          ref={collageRef}
          className="flat-collage home-motion-scene"
          aria-label="Featured animated app windows"
          onPointerMove={handleScenePointerMove}
          onPointerLeave={resetSceneParallax}
        >
          <span className="home-scene-orbit" aria-hidden="true" />
          <span className="home-scene-spark spark-a" aria-hidden="true">✦</span>
          <span className="home-scene-spark spark-b" aria-hidden="true">✧</span>
          <span className="home-scene-spark spark-c" aria-hidden="true">✦</span>
          <span className="home-scene-path path-a" aria-hidden="true" />
          <span className="home-scene-path path-b" aria-hidden="true" />
          {featuredWindows.map((item) => <FlatAppWindow key={item.slug || item.title} item={item} currentUser={currentUser} language={language} />)}
          <button
            type="button"
            className="home-scene-cta"
            onClick={(event) => launch('#/apps', 'APP', palette.peach, currentUser, event.currentTarget)}
          >
            <span aria-hidden="true">✦</span>
            {isVi ? 'Khám phá các ứng dụng – Thẻ sẽ chuyển động!' : 'Explore the apps – the cards move!'}
          </button>
          <span className="home-scene-dots" aria-hidden="true"><i /><i /><i /><i /><i /><i /></span>
        </div>
      </section>

      <aside className="flat-pinned-apps" aria-label="Pinned apps">
        <div>
          <strong>{t.chips.pin}</strong>
          <small>{t.chips.flow}</small>
        </div>
        <div className="flat-chip-row">
          {chips.map((item) => <AppChip key={item.title} item={item} currentUser={currentUser} language={language} />)}
        </div>
      </aside>
    </div>
  );
}
