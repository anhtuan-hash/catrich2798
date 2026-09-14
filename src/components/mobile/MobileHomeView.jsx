import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowRight,
  BarChart3,
  BookOpen,
  CalendarDays,
  ChevronDown,
  ChevronUp,
  GraduationCap,
  MessageSquareText,
  NotebookTabs,
  Pencil,
  Sparkles,
  Star,
  X,
} from 'lucide-react';
import MobileHeroAdminField from '../MobileHeroAdminField.jsx';
import { getCurrentUser, subscribeToAuthChanges } from '../../utils/auth.js';
import { isDepartmentLeaderRole } from '../../utils/roles.js';
import '../../styles/mobile/mobile-home.css';
import '../../styles/mobile/mobile-home-polish.css';
import '../../styles/mobile/mobile-home-premium.css';
import '../../styles/mobile/mobile-home-premium-parity.css';

function practiceTimestamp(item) {
  const values = [item?.opens_at, item?.published_at, item?.created_at];
  for (const value of values) {
    if (!value) continue;
    const time = new Date(value).getTime();
    if (!Number.isNaN(time)) return time;
  }
  return 0;
}

function formatPracticeDate(item, language) {
  const value = item?.opens_at || item?.published_at || item?.created_at;
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat(language === 'en' ? 'en-US' : 'vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date);
}

function gradeTheme(grade) {
  if (grade === 10) return { accent: '#1469f5', soft: '#edf5ff', Icon: NotebookTabs };
  if (grade === 11) return { accent: '#e58a00', soft: '#fff5e7', Icon: MessageSquareText };
  return { accent: '#0b9f82', soft: '#eafaf5', Icon: GraduationCap };
}

function MobileGradeSummary({ grade, items, language, open, onToggle }) {
  const vi = language !== 'en';
  const { accent, soft, Icon } = gradeTheme(grade);

  return (
    <article
      className={`bes-mobile-home__grade-card is-grade-${grade}${open ? ' is-open' : ''}`}
      data-mobile-grade-card={grade}
      style={{ '--grade-accent': accent, '--grade-soft': soft }}
    >
      <span className="bes-mobile-home__grade-label">{vi ? 'KHỐI' : 'GRADE'}</span>
      <span className="bes-mobile-home__grade-icon" aria-hidden="true"><Icon size={25} strokeWidth={2.2} /></span>
      <strong className="bes-mobile-home__grade-number">{grade}</strong>
      <small className="bes-mobile-home__grade-count">{items?.length || 0} {vi ? 'bài' : 'lessons'}</small>
      <button
        type="button"
        className="bes-mobile-home__grade-arrow"
        data-mobile-grade-toggle
        aria-label={vi ? `${open ? 'Thu gọn' : 'Mở bài'} Khối ${grade}` : `${open ? 'Close' : 'Open'} Grade ${grade}`}
        aria-expanded={open}
        onClick={onToggle}
      >
        {open ? <ChevronUp size={21} /> : <ArrowRight size={21} />}
      </button>
    </article>
  );
}

function MobilePracticeList({ grade, items, t, language, loading, error, onRetry, onOpenPractice }) {
  const vi = language !== 'en';
  const [expanded, setExpanded] = useState(false);
  const sorted = useMemo(
    () => [...(items || [])].sort((a, b) => practiceTimestamp(b) - practiceTimestamp(a)),
    [items],
  );
  const displayed = expanded ? sorted : sorted.slice(0, 4);

  useEffect(() => setExpanded(false), [grade]);

  return (
    <div
      className="bes-mobile-home__practice-panel bes-mobile-home__practice-panel--inline"
      data-mobile-practice-panel
      data-mobile-practice-grade={grade}
      aria-busy={loading ? 'true' : 'false'}
    >
      {loading ? <div className="bes-mobile-home__state">{t.loading}</div> : null}
      {!loading && error ? (
        <div className="bes-mobile-home__state is-error">
          <span>{error}</span>
          <button type="button" onClick={onRetry}>{t.retry}</button>
        </div>
      ) : null}
      {!loading && !error && displayed.length ? (
        <>
          <div className="bes-mobile-home__practice-list">
            {displayed.map((item, index) => {
              const date = formatPracticeDate(item, language);
              return (
                <article key={item?.id || `${grade}-${index}`} className="bes-mobile-home__practice-card" data-mobile-practice-card>
                  <div className="bes-mobile-home__practice-card-copy">
                    <span className="bes-mobile-home__practice-index">{String(index + 1).padStart(2, '0')}</span>
                    <div>
                      <h4>{item?.title || `${t.english} ${grade}`}</h4>
                      {date ? <small><CalendarDays size={14} />{date}</small> : null}
                    </div>
                  </div>
                  <button type="button" onClick={() => onOpenPractice?.(item)}>{t.enter}<ArrowRight size={15} /></button>
                </article>
              );
            })}
          </div>
          {sorted.length > 4 ? (
            <button
              type="button"
              className="bes-mobile-home__practice-expand"
              aria-expanded={expanded}
              onClick={() => setExpanded((value) => !value)}
            >
              {expanded
                ? <>{vi ? 'Thu gọn' : 'Show less'}<ChevronUp size={17} /></>
                : <>{vi ? `Xem tất cả bài (${sorted.length})` : `View all lessons (${sorted.length})`}<ChevronDown size={17} /></>}
            </button>
          ) : null}
        </>
      ) : null}
      {!loading && !error && !sorted.length ? <div className="bes-mobile-home__state">{t.empty}</div> : null}
    </div>
  );
}

export default function MobileHomeView({
  t,
  language = 'vi',
  practiceItems = [],
  practicesByGrade = {},
  practiceLoading = false,
  practiceError = '',
  canManagePractice = false,
  onStart,
  onOpenApps,
  onOpenPractice,
  onRetryPractice,
  onOpenStatistics,
}) {
  const vi = language !== 'en';
  const [openGrade, setOpenGrade] = useState(null);
  const [heroEditorUser, setHeroEditorUser] = useState(null);
  const [heroEditorOpen, setHeroEditorOpen] = useState(false);
  const practiceRef = useRef(null);
  const canEditHero = isDepartmentLeaderRole(heroEditorUser?.role);

  useEffect(() => {
    document.documentElement.classList.add('bes-mobile-home-premium-active');
    return () => document.documentElement.classList.remove('bes-mobile-home-premium-active');
  }, []);

  useEffect(() => {
    let active = true;
    getCurrentUser()
      .then((user) => { if (active) setHeroEditorUser(user || null); })
      .catch(() => { if (active) setHeroEditorUser(null); });
    const unsubscribe = subscribeToAuthChanges((user) => {
      if (active) setHeroEditorUser(user || null);
    });
    return () => {
      active = false;
      unsubscribe?.();
    };
  }, []);

  useEffect(() => {
    if (!canEditHero && heroEditorOpen) setHeroEditorOpen(false);
  }, [canEditHero, heroEditorOpen]);

  useEffect(() => {
    if (!heroEditorOpen) return undefined;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = previousOverflow; };
  }, [heroEditorOpen]);

  const scrollToPractice = () => {
    practiceRef.current?.scrollIntoView?.({ behavior: 'smooth', block: 'start' });
  };

  const quickActions = [
    {
      id: 'learn',
      label: vi ? 'Học' : 'Learn',
      Icon: BookOpen,
      tone: 'blue',
      action: onStart,
    },
    {
      id: 'statistics',
      label: vi ? 'Thống kê' : 'Stats',
      Icon: BarChart3,
      tone: 'mint',
      action: canManagePractice && onOpenStatistics ? onOpenStatistics : scrollToPractice,
    },
    {
      id: 'schedule',
      label: vi ? 'Lịch học' : 'Schedule',
      Icon: CalendarDays,
      tone: 'violet',
      action: scrollToPractice,
    },
    {
      id: 'achievement',
      label: vi ? 'Thành tích' : 'Progress',
      Icon: Star,
      tone: 'amber',
      action: onOpenApps || onStart,
    },
  ];

  return (
    <main className="bes-mobile-home is-premium" data-bes-mobile-home="true" aria-label={vi ? 'Trang chủ Brian English' : 'Brian English home'}>
      <div className="bes-mobile-home__premium" data-mobile-home-premium>
        <section className="bes-mobile-home__premium-hero" data-mobile-home-hero aria-labelledby="mobile-home-premium-heading">
          <img
            className="bes-mobile-home__premium-hero-art"
            src="/mobile-home-premium-hero.webp"
            alt=""
            draggable="false"
            data-mobile-home-hero-art
          />
          {canEditHero ? (
            <button
              type="button"
              aria-label={vi ? 'Chỉnh sửa Hero Mobile' : 'Edit mobile Hero'}
              onClick={() => setHeroEditorOpen(true)}
              style={{
                position: 'absolute',
                top: 12,
                right: 12,
                zIndex: 8,
                minHeight: 38,
                padding: '8px 12px',
                border: '1px solid rgba(15, 23, 42, .14)',
                borderRadius: 14,
                background: 'rgba(255,255,255,.94)',
                color: '#102b55',
                boxShadow: '0 8px 24px rgba(15,23,42,.14)',
                backdropFilter: 'blur(14px)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                fontSize: 12,
                fontWeight: 800,
              }}
            >
              <Pencil size={14} />{vi ? 'Chỉnh Hero' : 'Edit Hero'}
            </button>
          ) : null}
          <div className="bes-mobile-home__sr-only">
            <h1 id="mobile-home-premium-heading">{vi ? 'Học tốt hơn' : 'Learn better'}</h1>
            <p>{vi ? 'Tiếng Anh mở ra nhiều cơ hội hơn.' : 'English opens more opportunities.'}</p>
          </div>
          <button
            type="button"
            className="bes-mobile-home__hero-hotspot is-start"
            aria-label={vi ? 'Bắt đầu' : 'Start'}
            onClick={onStart}
          />
          <button
            type="button"
            className="bes-mobile-home__hero-hotspot is-guide"
            aria-label={vi ? 'Xem ngay' : 'View now'}
            onClick={onOpenApps}
          />
        </section>

        {heroEditorOpen && canEditHero ? (
          <div
            role="presentation"
            onMouseDown={(event) => {
              if (event.target === event.currentTarget) setHeroEditorOpen(false);
            }}
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 2147483000,
              display: 'grid',
              alignItems: 'end',
              padding: 'max(10px, env(safe-area-inset-top)) 10px max(10px, env(safe-area-inset-bottom))',
              background: 'rgba(15, 23, 42, .46)',
              backdropFilter: 'blur(8px)',
            }}
          >
            <section
              role="dialog"
              aria-modal="true"
              aria-label={vi ? 'Chỉnh sửa Hero Mobile' : 'Edit mobile Hero'}
              style={{
                width: 'min(720px, 100%)',
                maxHeight: '92dvh',
                overflow: 'auto',
                margin: '0 auto',
                padding: 14,
                borderRadius: '26px 26px 20px 20px',
                background: '#ffffff',
                boxShadow: '0 24px 80px rgba(15,23,42,.28)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, padding: '4px 4px 12px' }}>
                <div>
                  <strong style={{ display: 'block', fontSize: 20, color: '#0f172a' }}>{vi ? 'Chỉnh Hero Mobile' : 'Edit Mobile Hero'}</strong>
                  <small style={{ display: 'block', marginTop: 5, color: '#64748b', lineHeight: 1.45 }}>
                    {vi ? 'Thay đổi ở đây chỉ áp dụng cho phiên bản điện thoại, không ảnh hưởng Hero trên PC.' : 'Changes here apply only to mobile and do not affect the desktop Hero.'}
                  </small>
                </div>
                <button
                  type="button"
                  aria-label={vi ? 'Đóng' : 'Close'}
                  onClick={() => setHeroEditorOpen(false)}
                  style={{
                    width: 38,
                    height: 38,
                    flex: '0 0 auto',
                    border: '1px solid #dbe3ef',
                    borderRadius: 12,
                    background: '#f8fafc',
                    color: '#0f172a',
                    display: 'grid',
                    placeItems: 'center',
                  }}
                >
                  <X size={19} />
                </button>
              </div>
              <MobileHeroAdminField currentUser={heroEditorUser} />
            </section>
          </div>
        ) : null}

        <section className="bes-mobile-home__quick-actions" data-mobile-home-quick-actions aria-label={vi ? 'Truy cập nhanh' : 'Quick actions'}>
          {quickActions.map(({ id, label, Icon, tone, action }) => (
            <button key={id} type="button" className={`is-${tone}`} aria-label={label} onClick={action}>
              <span aria-hidden="true"><Icon size={29} strokeWidth={2.1} /></span>
              <strong>{label}</strong>
            </button>
          ))}
        </section>

        <section
          ref={practiceRef}
          className="bes-mobile-home__section bes-mobile-home__practice is-premium"
          data-mobile-home-practice
          id="weekly-practice"
          aria-labelledby="mobile-weekly-practice-title"
        >
          <header className="bes-mobile-home__premium-practice-head">
            <div>
              <small><Sparkles size={15} />{vi ? 'TUẦN NÀY' : 'THIS WEEK'}</small>
              <h2 id="mobile-weekly-practice-title">{vi ? 'Luyện tập tuần này' : 'Practice this week'}</h2>
            </div>
            <button
              type="button"
              onClick={() => {
                setOpenGrade((current) => current || 10);
                window.setTimeout(scrollToPractice, 0);
              }}
            >
              {vi ? 'Xem tất cả' : 'View all'}<ArrowRight size={17} />
            </button>
          </header>

          <div className="bes-mobile-home__grade-grid">
            {[10, 11, 12].map((grade) => (
              <MobileGradeSummary
                key={grade}
                grade={grade}
                items={practicesByGrade[grade] || []}
                language={language}
                open={openGrade === grade}
                onToggle={() => setOpenGrade((current) => current === grade ? null : grade)}
              />
            ))}
          </div>

          {openGrade ? (
            <MobilePracticeList
              grade={openGrade}
              items={practicesByGrade[openGrade] || []}
              t={t}
              language={language}
              loading={practiceLoading}
              error={practiceError}
              onRetry={onRetryPractice}
              onOpenPractice={onOpenPractice}
            />
          ) : null}

          {!openGrade && practiceLoading ? <div className="bes-mobile-home__state">{t.loading}</div> : null}
          {!openGrade && !practiceLoading && practiceError ? (
            <div className="bes-mobile-home__state is-error">
              <span>{practiceError}</span>
              <button type="button" onClick={onRetryPractice}>{t.retry}</button>
            </div>
          ) : null}
          <span className="bes-mobile-home__practice-count" aria-label={`${practiceItems.length} ${vi ? 'bài luyện tập' : 'practice lessons'}`}>{practiceItems.length}</span>
        </section>

        <section className="bes-mobile-home__motivation" aria-label={vi ? 'Động lực học tập' : 'Learning motivation'}>
          <div>
            <BarChart3 size={28} aria-hidden="true" />
            <strong>A BRIGHTER<br />TOMORROW</strong>
          </div>
          <div className="bes-mobile-home__mountain" aria-hidden="true"><i /><i /><i /></div>
          <span>Keep<br />Going</span>
        </section>
      </div>
    </main>
  );
}
