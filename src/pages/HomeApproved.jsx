import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ArrowRight, BookOpen, Check, ClipboardClock, Clock3, FileCheck2, Files,
  FolderOpen, Gamepad2, GraduationCap, MessageSquareText, NotebookTabs,
  Play, School, Sparkles, UsersRound,
} from 'lucide-react';
import { APPS, GAME_APPS, SPECIAL_TOOLS } from '../data/apps.js';
import { getFirstAllowedRoute, hasRouteAccess } from '../utils/permissions.js';
import { launchRoute } from '../utils/motion.js';
import { isAppHiddenForUser } from '../utils/appVisibility.js';
import { visibilityIdForRoute } from '../data/appVisibilityRegistry.js';
import { isDepartmentLeaderRole } from '../utils/roles.js';
import {
  getWeeklyPracticeAvailability,
  listPublicWeeklyPractices,
  readWeeklyPracticeProgress,
} from '../utils/weeklyPractice.js';
import './HomeApproved.css';
import './HomePracticeIntegration.css';

const ALL_APPS = [...APPS, ...GAME_APPS, ...SPECIAL_TOOLS];
const isPublicTarget = (target) => ['#/home', '#/resources', '#/contact', '#/login', '#/register', '#/setup'].includes(target);
const findApp = (slug) => ALL_APPS.find((item) => item.slug === slug);
const appTarget = (slug, fallback = '#/apps') => {
  const app = findApp(slug);
  return app ? (app.route ? `#/${app.route}` : `#/tool/${app.slug}`) : fallback;
};
const launch = (target, label, color, currentUser, sourceEl) => launchRoute({
  target: !currentUser && !isPublicTarget(target) ? '#/login' : target,
  label,
  color,
  sourceEl,
});

const TEXT = {
  vi: {
    badge: 'ENGLISH HUB', headline: 'Không gian dạy học thông minh', highlight: '& sáng tạo',
    subtitle: 'Tích hợp các công cụ hỗ trợ giảng dạy, học tập và quản lý hiệu quả — tối ưu cho giáo viên và học sinh.',
    start: 'Bắt đầu ngay', guide: 'Xem hướng dẫn', tools: 'CÔNG CỤ NỔI BẬT', all: 'Xem tất cả',
    practice: 'WEEKLY ENGLISH PRACTICE', practiceTitle: 'Hub bài tập theo tuần',
    practiceSub: 'Luyện tập đều đặn, bám sát chương trình và theo dõi tiến độ theo từng khối.',
    allPractice: 'Xem tất cả bài tập & đề thi', collapse: 'Thu gọn bài cũ', manage: 'Quản lý bài tuần',
    weekly: 'Theo tuần', curriculum: 'Bám sát chương trình', enter: 'Vào hub', open: 'Mở bài',
    continue: 'Tiếp tục', review: 'Xem lại', schedule: 'Xem lịch', active: 'Đang mở', minutes: 'phút',
    grade: 'KHỐI', english: 'Tiếng Anh', loading: 'Đang đồng bộ bài tập…', empty: 'Bài tập đang được chuẩn bị',
  },
  en: {
    badge: 'ENGLISH HUB', headline: 'A smart teaching workspace', highlight: '& creative learning',
    subtitle: 'Teaching, learning and management tools in one efficient workspace for teachers and students.',
    start: 'Get started', guide: 'View guide', tools: 'FEATURED TOOLS', all: 'View all',
    practice: 'WEEKLY ENGLISH PRACTICE', practiceTitle: 'Weekly practice hub',
    practiceSub: 'Consistent curriculum-aligned practice organised by grade level.',
    allPractice: 'View all practice & tests', collapse: 'Hide older lessons', manage: 'Manage weekly lessons',
    weekly: 'Weekly practice', curriculum: 'Curriculum aligned', enter: 'Open hub', open: 'Open lesson',
    continue: 'Continue', review: 'Review', schedule: 'View schedule', active: 'Open now', minutes: 'minutes',
    grade: 'GRADE', english: 'English', loading: 'Syncing weekly practice…', empty: 'Practice is being prepared',
  },
};

const TOOL_DEFS = [
  ['lesson', BookOpen, 'Lesson Architect', 'Lesson Architect', 'Soạn bài và thiết kế bài giảng thông minh.', 'Plan lessons and design smart materials.', 'lesson-plan-ai', '#/apps', '#1a73e8', '#eef4ff'],
  ['textcare', FileCheck2, 'TextCare Fixer', 'TextCare Fixer', 'Chuẩn hoá, kiểm tra và sửa văn bản.', 'Polish, check and improve documents.', 'textcare', '#/apps', '#188038', '#edf7ee'],
  ['library', FolderOpen, 'Thư viện', 'Library', 'Quản lý và chia sẻ tài liệu học tập.', 'Manage and share learning resources.', null, '#/library', '#f29900', '#fff7e2', 'library'],
  ['weekly', ClipboardClock, 'Bài tập theo tuần', 'Weekly Practice', 'Luyện tập đều đặn theo từng khối lớp.', 'Regular practice paths by grade level.', 'thpt-practice-hub', '#/practice', '#00a6c7', '#eaf8fb'],
  ['games', Gamepad2, 'Trò chơi', 'Games', 'Học mà chơi, chơi mà học trong lớp.', 'Engaging classroom games.', 'game-hub', '#/games', '#e94270', '#fff0f4'],
  ['homeroom', UsersRound, 'Chủ nhiệm', 'Homeroom', 'Quản lý lớp học và hồ sơ học sinh.', 'Manage classes and student records.', null, '#/homeroom', '#7e57c2', '#f4efff', 'homeroom'],
  ['dashboard', School, 'Quản lý lớp học', 'Class Management', 'Theo dõi công việc và vận hành lớp học.', 'Track classroom work and operations.', null, '#/dashboard', '#2684ff', '#eef5ff', 'dashboard'],
  ['resources', Files, 'Thư viện tài liệu', 'Resource Library', 'Truy cập kho học liệu dùng chung.', 'Open the shared resource library.', null, '#/resource-library', '#34a853', '#eef8f0', 'resource-library'],
];

function cleanText(value) {
  return String(value ?? '').replace(/\s+/g, ' ').trim();
}

function inferGrade(item) {
  const explicit = String(item?.grade || '').match(/(?:^|\D)(10|11|12)(?:\D|$)/)?.[1];
  if (explicit) return Number(explicit);
  const fromTitle = String(item?.title || '').match(/(?:tiếng\s*anh|english)\s*(10|11|12)/i)?.[1];
  return Number(fromTitle || 10);
}

function safeDate(value) {
  const date = value ? new Date(value) : null;
  return date && !Number.isNaN(date.getTime()) ? date : null;
}

function shortDate(value, language) {
  const date = safeDate(value);
  if (!date) return '';
  return new Intl.DateTimeFormat(language === 'en' ? 'en-GB' : 'vi-VN', { day: '2-digit', month: '2-digit' }).format(date);
}

function scheduleLabel(item, language) {
  if (!item) return '';
  const weekMatch = cleanText(item.week_key).match(/W(?:eek)?[-_ ]?(\d+)/i) || cleanText(item.week_key).match(/(\d+)/);
  const week = weekMatch?.[1] || cleanText(item.week_key);
  const opens = safeDate(item.opens_at);
  const closes = safeDate(item.closes_at);
  const month = opens ? opens.getMonth() + 1 : 8;
  const semester = month >= 7 ? (language === 'en' ? 'Semester 1' : 'Học kì 1') : month <= 5 ? (language === 'en' ? 'Semester 2' : 'Học kì 2') : (language === 'en' ? 'Summer' : 'Hè');
  const weekText = language === 'en' ? `Week ${week || '—'}` : `Tuần ${week || '—'}`;
  const range = [shortDate(item.opens_at, language), shortDate(item.closes_at, language)].filter(Boolean).join(' - ');
  return [weekText, semester, range].filter(Boolean).join(' | ');
}

function availabilityText(availability, language) {
  if (language !== 'en') return availability.label;
  return ({ open: 'Open now', upcoming: 'Upcoming', closed: 'Closed', maintenance: 'Maintenance' })[availability.state] || 'Unavailable';
}

function practiceAction(item, language, t) {
  if (!item) return t.open;
  const availability = getWeeklyPracticeAvailability(item);
  const progress = readWeeklyPracticeProgress(item.id) || {};
  if (availability.state === 'upcoming') return t.schedule;
  if (progress.submitted) return t.review;
  if (progress.identity) return t.continue;
  return t.open;
}

function findLegacyPracticeButton(item) {
  const root = document.getElementById('bes-weekly-practice-root');
  if (!root || !item) return null;
  const id = String(item.id || '');
  const card = [...root.querySelectorAll('[data-practice-id]')].find((node) => node.dataset.practiceId === id);
  const cardButton = card?.querySelector('.bes-weekly-grade-card__action > button, button:not([disabled])');
  if (cardButton) return cardButton;
  const article = [...root.querySelectorAll('.bes-weekly-featured, .bes-weekly-list article')].find((node) => {
    const title = cleanText(node.querySelector('h3, strong')?.textContent);
    return title === cleanText(item.title);
  });
  return article?.querySelector('button:not([disabled])') || null;
}

function showUpcomingSchedule(item, language) {
  const date = safeDate(item?.opens_at);
  const label = date ? new Intl.DateTimeFormat(language === 'en' ? 'en-GB' : 'vi-VN', {
    weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
  }).format(date) : '';
  window.alert(language === 'en' ? `This lesson opens at ${label || 'the scheduled time'}.` : `Bài sẽ mở vào ${label || 'thời điểm đã đặt lịch'}.`);
}

function openLegacyPractice(item, language, attempt = 0) {
  const availability = getWeeklyPracticeAvailability(item);
  if (availability.state === 'upcoming') {
    showUpcomingSchedule(item, language);
    return;
  }
  if (!availability.canOpen) {
    window.alert(availabilityText(availability, language));
    return;
  }
  const button = findLegacyPracticeButton(item);
  if (button) {
    button.click();
    return;
  }
  if (attempt < 8) {
    window.setTimeout(() => openLegacyPractice(item, language, attempt + 1), 180);
    return;
  }
  window.alert(language === 'en' ? 'The lesson is still syncing. Please try again.' : 'Bài đang được đồng bộ. Hãy thử lại sau vài giây.');
}

function openLegacyManager(language, attempt = 0) {
  const button = document.querySelector('#bes-weekly-practice-root .bes-weekly-manage-button');
  if (button) {
    button.click();
    return;
  }
  if (attempt < 8) {
    window.setTimeout(() => openLegacyManager(language, attempt + 1), 180);
    return;
  }
  window.alert(language === 'en' ? 'The manager is still syncing.' : 'Trình quản lý đang được đồng bộ.');
}

function HeroArt() {
  return (
    <div className="bha-art" aria-hidden="true">
      <div className="bha-orb bha-orb-a" /><div className="bha-orb bha-orb-b" />
      <div className="bha-vn-line" />
      <div className="bha-flag"><i /><span>★</span></div>
      <div className="bha-screen">
        <div className="bha-screen-bar"><i /><i /><i /></div>
        <div className="bha-screen-title" />
        <div className="bha-screen-row"><b>+</b><span /></div>
        <div className="bha-screen-row orange"><b>◆</b><span /></div>
        <div className="bha-screen-row green"><b>✓</b><span /></div>
      </div>
      <div className="bha-books"><i /><i /><i /></div>
      <div className="bha-pencil-cup"><i /><i /><i /></div>
      <div className="bha-plant"><i /><i /><i /><b /></div>
    </div>
  );
}

function ToolCard({ item, currentUser, language }) {
  const Icon = item.Icon;
  const vi = language === 'vi';
  return (
    <button type="button" className="bha-tool" style={{ '--accent': item.accent, '--soft': item.soft }}
      onClick={(event) => launch(item.target, item.id.toUpperCase().slice(0, 2), item.accent, currentUser, event.currentTarget)}>
      <span className="bha-tool-icon"><Icon size={27} strokeWidth={2.15} /></span>
      <span><strong>{vi ? item.title : item.titleEn}</strong><small>{vi ? item.description : item.descriptionEn}</small></span>
    </button>
  );
}

function GradeArt({ grade }) {
  const Icon = grade === 10 ? NotebookTabs : grade === 11 ? MessageSquareText : GraduationCap;
  return <div className="bha-grade-art"><Icon /><b>{grade}</b><i /><i /></div>;
}

function HistoryRow({ item, language, t, accent }) {
  const availability = getWeeklyPracticeAvailability(item);
  return (
    <article className="bha-history-row">
      <span><strong>{item.title}</strong><small>{scheduleLabel(item, language)}</small></span>
      <button type="button" style={{ '--history-accent': accent }} onClick={() => openLegacyPractice(item, language)}>
        {practiceAction(item, language, t)}<ArrowRight size={14} />
      </button>
    </article>
  );
}

function GradeCard({ grade, items, t, language, expanded }) {
  const palette = grade === 10
    ? { accent: '#1a73e8', soft: '#eaf3ff' }
    : grade === 11 ? { accent: '#7e42d3', soft: '#f3edff' } : { accent: '#24963b', soft: '#edf8ef' };
  const item = items[0] || null;
  const history = items.slice(1);
  const availability = item ? getWeeklyPracticeAvailability(item) : { state: 'empty', canOpen: false, label: t.empty };
  const duration = Math.max(45, Number(item?.duration_minutes || 45));
  return (
    <article className={`bha-grade${expanded && history.length ? ' has-history' : ''}`} style={{ '--accent': palette.accent, '--soft': palette.soft }}>
      <div className="bha-grade-copy">
        <span>{t.grade} {grade}</span><h3>{t.english} {grade}</h3>
        <p><Check size={14} /> <b>{t.weekly}</b></p><small>{item?.title || t.curriculum}</small>
        <button type="button" disabled={!item} onClick={() => item && openLegacyPractice(item, language)}>
          <ArrowRight size={14} /> {t.enter}
        </button>
      </div>
      <GradeArt grade={grade} />
      {expanded && history.length ? <div className="bha-grade-history">{history.map((entry) => <HistoryRow key={entry.id} item={entry} language={language} t={t} accent={palette.accent} />)}</div> : null}
      <footer>
        <span className={`is-${availability.state}`}><i />{availabilityText(availability, language)}</span>
        <strong>{item ? scheduleLabel(item, language) : t.empty}</strong>
        <em><Clock3 size={13} />{duration} {t.minutes}</em>
        <button type="button" disabled={!item} onClick={() => item && openLegacyPractice(item, language)}>{practiceAction(item, language, t)}<ArrowRight size={16} /></button>
      </footer>
    </article>
  );
}

export default function HomeApproved({ currentUser, language = 'vi', appVisibility }) {
  const t = TEXT[language] || TEXT.vi;
  const visibilitySnapshot = appVisibility?.snapshot;
  const firstRoute = currentUser ? getFirstAllowedRoute(currentUser) : 'login';
  const [practiceItems, setPracticeItems] = useState([]);
  const [practiceLoading, setPracticeLoading] = useState(true);
  const [practiceError, setPracticeError] = useState('');
  const [expanded, setExpanded] = useState(false);
  const [, setProgressVersion] = useState(0);
  const canManagePractice = isDepartmentLeaderRole(currentUser?.role);

  const tools = useMemo(() => TOOL_DEFS.map(([id, Icon, title, titleEn, description, descriptionEn, slug, fallback, accent, soft, permissionRoute]) => {
    const target = slug ? appTarget(slug, fallback) : fallback;
    const visibilityId = slug ? `tool:${slug}` : visibilityIdForRoute(permissionRoute);
    return { id, Icon, title, titleEn, description, descriptionEn, target, accent, soft, permissionRoute, visibilityId };
  }).filter((item) => {
    if (item.permissionRoute && currentUser && !hasRouteAccess(currentUser, item.permissionRoute)) return false;
    return !item.visibilityId || !isAppHiddenForUser(visibilitySnapshot, currentUser, item.visibilityId);
  }), [currentUser, visibilitySnapshot]);

  const refreshPractice = useCallback(async () => {
    setPracticeLoading(true);
    try {
      const items = await listPublicWeeklyPractices();
      setPracticeItems(items || []);
      setPracticeError('');
    } catch (error) {
      setPracticeError(error?.message || t.empty);
    } finally {
      setPracticeLoading(false);
    }
  }, [t.empty]);

  useEffect(() => {
    refreshPractice();
    const refreshProgress = () => setProgressVersion((value) => value + 1);
    const onVisible = () => { if (document.visibilityState === 'visible') { refreshPractice(); refreshProgress(); } };
    window.addEventListener('focus', onVisible);
    window.addEventListener('storage', refreshProgress);
    document.addEventListener('visibilitychange', onVisible);
    const timer = window.setInterval(refreshProgress, 5000);
    return () => {
      window.removeEventListener('focus', onVisible);
      window.removeEventListener('storage', refreshProgress);
      document.removeEventListener('visibilitychange', onVisible);
      window.clearInterval(timer);
    };
  }, [refreshPractice]);

  const practicesByGrade = useMemo(() => {
    const rank = (item) => ({ open: 0, upcoming: 1, closed: 2 }[getWeeklyPracticeAvailability(item).state] ?? 3);
    const sorted = [...practiceItems].sort((a, b) => rank(a) - rank(b)
      || Number(b.is_featured) - Number(a.is_featured)
      || new Date(b.opens_at || 0) - new Date(a.opens_at || 0));
    return {
      10: sorted.filter((item) => inferGrade(item) === 10),
      11: sorted.filter((item) => inferGrade(item) === 11),
      12: sorted.filter((item) => inferGrade(item) === 12),
    };
  }, [practiceItems]);

  return (
    <div className="bha-home" aria-label="English Hub homepage">
      <div className="bha-top">
        <section className="bha-hero">
          <div className="bha-copy"><span className="bha-badge">{t.badge}</span><h1>{t.headline}</h1><h2>{t.highlight}</h2><p>{t.subtitle}</p>
            <div className="bha-actions">
              <button className="primary" type="button" onClick={(e) => launch(currentUser ? `#/${firstRoute}` : '#/login', 'GO', '#1a73e8', currentUser, e.currentTarget)}><Sparkles size={18} />{t.start}<ArrowRight size={18} /></button>
              <button type="button" onClick={(e) => launch('#/apps', 'AP', '#1a73e8', currentUser, e.currentTarget)}><Play size={17} fill="currentColor" />{t.guide}</button>
            </div>
          </div><HeroArt />
        </section>
        <section className="bha-tools"><header><h2>{t.tools}</h2><button type="button" onClick={(e) => launch('#/apps', 'AP', '#1a73e8', currentUser, e.currentTarget)}>{t.all}<ArrowRight size={15} /></button></header>
          <div>{tools.map((item) => <ToolCard key={item.id} item={item} currentUser={currentUser} language={language} />)}</div>
        </section>
      </div>
      <section className="bha-practice"><header><div><span><ClipboardClock size={17} />{t.practice}</span><h2>{t.practiceTitle}</h2><p>{t.practiceSub}</p></div>
        <div className="bha-practice-header-actions">
          {canManagePractice ? <button type="button" className="bha-manage-practice" onClick={() => openLegacyManager(language)}>{t.manage}</button> : null}
          <button type="button" onClick={() => setExpanded((value) => !value)}>{expanded ? t.collapse : t.allPractice}<ArrowRight size={16} /></button>
        </div>
      </header>
      {practiceLoading ? <div className="bha-practice-state"><span />{t.loading}</div> : null}
      {!practiceLoading && practiceError ? <div className="bha-practice-state is-error">{practiceError}<button type="button" onClick={refreshPractice}>Thử lại</button></div> : null}
      {!practiceLoading && !practiceError ? <div className="bha-grades">{[10, 11, 12].map((grade) => <GradeCard key={grade} grade={grade} items={practicesByGrade[grade]} t={t} language={language} expanded={expanded} />)}</div> : null}
      </section>
    </div>
  );
}
