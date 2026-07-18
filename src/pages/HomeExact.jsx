import React, { useMemo } from 'react';
import { APPS, GAME_APPS, SPECIAL_TOOLS } from '../data/apps.js';
import { isAppHiddenForUser } from '../utils/appVisibility.js';
import { launchRoute } from '../utils/motion.js';
import HomeExactGraphic from './HomeExactGraphics.jsx';

const ALL_APPS = [...APPS, ...GAME_APPS, ...SPECIAL_TOOLS];

const SHOWCASE_CARDS = [
  {
    id: 'textcare', slug: 'textcare', title: 'TextCare Fixer', eyebrow: 'Chuẩn hoá văn bản',
    desc: 'Kiểm tra và chuẩn hoá văn bản nhanh chóng.', graphic: 'textcare', tone: 'lilac',
  },
  {
    id: 'pronunciation', title: 'Pronunciation Coach', eyebrow: 'Phát âm chuẩn',
    desc: 'Âm, trọng âm và nối âm chuẩn xác.', graphic: 'listening', tone: 'sand',
    target: '#/apps', visibilityId: 'route:apps',
  },
  {
    id: 'speaking', title: 'Speaking Studio', eyebrow: 'Luyện nói & phản xạ',
    desc: 'Luyện nói tự nhiên trong tình huống thực tế.', graphic: 'ai', tone: 'cyan',
    target: '#/apps', visibilityId: 'route:apps',
  },
  {
    id: 'lesson', slug: 'lesson-plan-ai', title: 'Lesson Architect', eyebrow: 'Thiết kế bài dạy thông minh',
    desc: 'Thiết kế giáo án, học liệu và xuất bài dạy tương tác.', graphic: 'lesson', tone: 'orange', featured: true,
  },
  {
    id: 'reading', title: 'Reading Studio', eyebrow: 'Đọc hiểu & trả lời',
    desc: 'Bài đọc, câu hỏi và từ vựng.', graphic: 'reading', tone: 'green',
    target: '#/news', visibilityId: 'route:news',
  },
  {
    id: 'game', slug: 'game-hub', title: 'Game Hub', eyebrow: 'Học mà chơi',
    desc: 'Mở trò chơi lớp học hấp dẫn.', graphic: 'game', tone: 'purple',
  },
  {
    id: 'word', slug: 'word2graph', title: 'WordGraph Studio', eyebrow: 'Mạng từ vựng',
    desc: 'Word family và collocation thông minh.', graphic: 'word', tone: 'cream',
  },
  {
    id: 'exam', title: 'Exam Studio', eyebrow: 'Kiểm tra & đánh giá',
    desc: 'Tạo đề, chấm điểm và phân tích.', graphic: 'exam', tone: 'blue',
    target: '#/assessment-core', visibilityId: 'route:assessment-core',
  },
];

const PINNED_APPS = [
  { id: 'ai-lesson', slug: 'english-lesson-integration', title: 'Tích hợp AI', subtitle: 'vào giáo án', icon: 'A', tone: 'violet' },
  { id: 'lesson', slug: 'lesson-plan-ai', title: 'Lesson Architect', subtitle: 'Thiết kế bài dạy', icon: '▤', tone: 'orange' },
  { id: 'exam', target: '#/assessment-core', title: 'Exam Studio', subtitle: 'Tạo đề & chấm', icon: '✓', tone: 'blue' },
  { id: 'sprint', target: '#/games', title: 'Learner Sprint', subtitle: 'Thử thách học tập', icon: '◆', tone: 'coral' },
  { id: 'library', target: '#/library', title: 'Thư viện', subtitle: 'Kho học liệu', icon: '▣', tone: 'green' },
  { id: 'ai-settings', target: '#/settings', title: 'Cài đặt AI', subtitle: 'Trợ lý thông minh', icon: '✦', tone: 'yellow' },
];

const NAV_ITEMS = [
  { id: 'home', label: 'Trang chủ', icon: '⌂', target: '#/home' },
  { id: 'library', label: 'Thư viện', icon: '▤', target: '#/library' },
  { id: 'apps', label: 'Ứng dụng', icon: '▦', target: '#/apps' },
  { id: 'journey', label: 'Lộ trình', icon: '↟', target: '#/work-hub' },
  { id: 'ranking', label: 'Bảng xếp hạng', icon: '♜', target: '#/games' },
];

function targetFor(item) {
  if (item.target) return item.target;
  const app = ALL_APPS.find((entry) => entry.slug === item.slug);
  if (!app) return '#/apps';
  return app.route ? `#/${app.route}` : `#/tool/${app.slug}`;
}

function visibilityIdFor(item) {
  if (item.visibilityId) return item.visibilityId;
  if (!item.slug) return '';
  const app = ALL_APPS.find((entry) => entry.slug === item.slug);
  return app?.route ? `route:${app.route}` : `tool:${item.slug}`;
}

function openTarget(target, label, color, currentUser, sourceEl) {
  const publicTarget = ['#/home', '#/resources', '#/contact'].includes(target);
  launchRoute({
    target: !currentUser && !publicTarget ? '#/login' : target,
    label: String(label || 'GO').slice(0, 2).toUpperCase(),
    color,
    sourceEl,
  });
}

function cycleFontScale(fontScale, setFontScale) {
  const values = [100, 110, 120, 130];
  const index = values.indexOf(Number(fontScale));
  setFontScale?.(values[(index + 1) % values.length]);
}

function lastName(currentUser, vi) {
  const source = currentUser?.name || currentUser?.email || (vi ? 'Khách' : 'Guest');
  const clean = String(source).split('@')[0].trim();
  const parts = clean.split(/\s+/).filter(Boolean);
  return parts.at(-1) || clean;
}

function ApprovedNavbar({ currentUser, language, setLanguage, theme, setTheme, fontScale, setFontScale }) {
  const vi = language === 'vi';
  const accountName = lastName(currentUser, vi);
  return (
    <nav className="bhe3d-navbar" aria-label={vi ? 'Điều hướng trang chủ' : 'Homepage navigation'}>
      <button type="button" className="bhe3d-brand" onClick={(event) => openTarget('#/home', 'BE', '#ff8a55', currentUser, event.currentTarget)}>
        <img src="/brian-english-brand-mark.png" alt="" aria-hidden="true" />
        <strong>Brian English Studio</strong>
      </button>

      <div className="bhe3d-navlinks">
        {NAV_ITEMS.map((item) => (
          <button
            key={item.id}
            type="button"
            className={item.id === 'home' ? 'is-active' : ''}
            onClick={(event) => openTarget(item.target, item.label, '#ff9a59', currentUser, event.currentTarget)}
          >
            <span aria-hidden="true">{item.icon}</span><b>{item.label}</b>
          </button>
        ))}
      </div>

      <div className="bhe3d-navtools">
        <button type="button" className="is-icon" aria-label={vi ? 'Tìm nhanh' : 'Search'} onClick={() => window.dispatchEvent(new CustomEvent('bes-command-palette-open'))}>⌕</button>
        <button type="button" className="is-language" onClick={() => setLanguage?.(vi ? 'en' : 'vi')}><span aria-hidden="true">◎</span><b>{vi ? 'VI' : 'EN'}</b><i>⌄</i></button>
        <button type="button" className="is-icon" aria-label={vi ? 'Đổi giao diện sáng tối' : 'Toggle theme'} onClick={() => setTheme?.(theme === 'dark' ? 'light' : 'dark')}>{theme === 'dark' ? '☾' : '☀'}</button>
        <button type="button" className="is-icon bhe3d-bell" aria-label={vi ? 'Thông báo' : 'Notifications'} onClick={() => window.dispatchEvent(new CustomEvent('brian:activity-center-open', { detail: { tab: 'notifications' } }))}>♧<em>3</em></button>
        <button type="button" className="is-font" onClick={() => cycleFontScale(fontScale, setFontScale)}><b>A+</b><span>{fontScale || 100}%</span></button>
        <button type="button" className="bhe3d-account" onClick={(event) => openTarget(currentUser ? '#/settings' : '#/login', accountName, '#1f2027', currentUser, event.currentTarget)}><i>{accountName.slice(0, 1).toUpperCase()}</i><b>{accountName}</b></button>
      </div>
    </nav>
  );
}

function ShowcaseCard({ card, currentUser, vi }) {
  const target = targetFor(card);
  const action = currentUser ? (vi ? 'Mở ứng dụng' : 'Open app') : (vi ? 'Đăng nhập để mở' : 'Sign in to open');
  return (
    <button
      type="button"
      className={`bhe3d-app-card bhe3d-card-${card.id} bhe3d-tone-${card.tone} ${card.featured ? 'is-featured' : ''}`}
      onClick={(event) => openTarget(target, card.title, card.featured ? '#ff8b29' : '#5d55cc', currentUser, event.currentTarget)}
      aria-label={`${action}: ${card.title}`}
    >
      <span className="bhe3d-window-dots" aria-hidden="true"><i/><i/><i/></span>
      <span className="bhe3d-card-tag">{card.eyebrow}</span>
      {card.featured ? <span className="bhe3d-feature-tabs"><i>Bài dạy</i><i>Thiết kế</i><i>Xuất file</i></span> : null}
      <span className="bhe3d-card-copy">
        <strong>{card.title}</strong>
        <small>{card.desc}</small>
        <em>{action}</em>
      </span>
      <HomeExactGraphic type={card.graphic}/>
      {card.featured ? <><span className="bhe3d-card-sparkle" aria-hidden="true">✦</span><span className="bhe3d-card-badge">5512+ bài học sẵn sàng</span></> : null}
    </button>
  );
}

function PinnedDock({ currentUser, vi }) {
  return (
    <section className="bhe3d-dock" aria-label={vi ? 'Ứng dụng ghim' : 'Pinned apps'}>
      <header><span aria-hidden="true">◆</span><div><strong>{vi ? 'Ứng dụng ghim' : 'Pinned apps'}</strong><small>{vi ? 'Truy cập nhanh ứng dụng yêu thích' : 'Quick access to favorite apps'}</small></div></header>
      <div className="bhe3d-dock-items">
        {PINNED_APPS.map((item) => (
          <button key={item.id} type="button" className={`bhe3d-dock-item tone-${item.tone}`} onClick={(event) => openTarget(targetFor(item), item.title, '#ff8a36', currentUser, event.currentTarget)}>
            <i aria-hidden="true">{item.icon}</i><span><strong>{item.title}</strong><small>{item.subtitle}</small></span>
          </button>
        ))}
        <button type="button" className="bhe3d-dock-add" onClick={(event) => openTarget('#/apps', 'TH', '#8a63db', currentUser, event.currentTarget)}><b>＋</b><span>{vi ? 'Thêm' : 'Add'}</span></button>
      </div>
    </section>
  );
}

export default function HomeExact({
  currentUser,
  language = 'vi',
  setLanguage,
  theme = 'light',
  setTheme,
  fontScale = 100,
  setFontScale,
  appVisibility,
}) {
  const vi = language === 'vi';
  const name = useMemo(() => lastName(currentUser, vi), [currentUser, vi]);
  const now = new Date();
  const date = new Intl.DateTimeFormat(vi ? 'vi-VN' : 'en-US', { weekday: 'short', day: '2-digit', month: '2-digit' }).format(now);
  const time = new Intl.DateTimeFormat(vi ? 'vi-VN' : 'en-US', { hour: '2-digit', minute: '2-digit', hour12: false }).format(now);
  const visibleCards = SHOWCASE_CARDS.filter((card) => {
    const visibilityId = visibilityIdFor(card);
    return !visibilityId || !isAppHiddenForUser(appVisibility?.snapshot, currentUser, visibilityId);
  });
  const completeShowcase = visibleCards.length === SHOWCASE_CARDS.length;

  return (
    <div className="brian-home-approved3d" data-home-approved="sample-1">
      <div className="bhe3d-page">
        <ApprovedNavbar
          currentUser={currentUser}
          language={language}
          setLanguage={setLanguage}
          theme={theme}
          setTheme={setTheme}
          fontScale={fontScale}
          setFontScale={setFontScale}
        />

        <main className="bhe3d-main">
          <section className="bhe3d-hero">
            <span className="bhe3d-kicker">BRIAN ENGLISH STUDIO</span>
            <div className="bhe3d-title" aria-label="Brian English"><span>brian</span><strong>english</strong></div>
            <p>{vi
              ? 'Không gian dạy học số của Brian English: mở nhanh ứng dụng, trò chơi, thư viện và công cụ quản lý trong một hệ thống thống nhất.'
              : 'Brian English digital teaching workspace: open apps, games, libraries and management tools in one unified system.'}</p>

            <div className="bhe3d-info-row">
              <article><i className="is-user" aria-hidden="true">●</i><span><small>{vi ? 'Đăng nhập' : 'Account'}</small><strong>{vi ? `Xin chào, ${name}` : `Hello, ${name}`}</strong></span></article>
              <article><i className="is-date" aria-hidden="true">▣</i><span><small>{vi ? 'Hôm nay' : 'Today'}</small><strong>{date}<br/>{time}</strong></span></article>
              <article><i className="is-weather" aria-hidden="true">☀</i><span><small>{vi ? 'Thời tiết' : 'Weather'}</small><strong>27°C<br/><em>Hà Nội</em></strong></span></article>
            </div>

            <button type="button" className="bhe3d-tip" onClick={(event) => openTarget('#/apps', 'GO', '#8b61e7', currentUser, event.currentTarget)}>
              <i aria-hidden="true">✦</i><span><strong>{vi ? 'Thẻ ứng dụng nổi khối' : 'Dimensional app cards'}</strong><small>{vi ? 'Khám phá bộ công cụ của bạn!' : 'Explore your toolkit!'}</small></span><b>›</b>
            </button>
          </section>

          <section className={`bhe3d-card-stage ${completeShowcase ? '' : 'is-adaptive'}`.trim()} aria-label={vi ? 'Ứng dụng nổi bật' : 'Featured apps'}>
            <span className="bhe3d-decor bhe3d-decor-a" aria-hidden="true"/>
            <span className="bhe3d-decor bhe3d-decor-b" aria-hidden="true"/>
            <span className="bhe3d-decor bhe3d-decor-c" aria-hidden="true">✦</span>
            {visibleCards.map((card) => <ShowcaseCard key={card.id} card={card} currentUser={currentUser} vi={vi}/>) }
          </section>
        </main>

        <PinnedDock currentUser={currentUser} vi={vi}/>
      </div>
    </div>
  );
}
