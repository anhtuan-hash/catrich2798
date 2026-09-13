import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowRight,
  BarChart3,
  BookOpen,
  CalendarDays,
  Check,
  ChevronDown,
  ChevronUp,
  ClipboardClock,
  GraduationCap,
  MessageSquareText,
  NotebookTabs,
} from 'lucide-react';
import HomeHeroExperience2026 from '../HomeHeroExperience2026.jsx';
import '../../styles/mobile/mobile-home.css';
import '../../styles/mobile/mobile-home-polish.css';

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
  if (grade === 10) return { accent: '#0b57d0', soft: '#eef4ff', Icon: NotebookTabs };
  if (grade === 11) return { accent: '#c97900', soft: '#fff7e8', Icon: MessageSquareText };
  return { accent: '#00897b', soft: '#eaf8f5', Icon: GraduationCap };
}

function MobileGradeSummary({ grade, items, t, language, open, onToggle }) {
  const vi = language !== 'en';
  const { accent, soft, Icon } = gradeTheme(grade);
  const sorted = useMemo(
    () => [...(items || [])].sort((a, b) => practiceTimestamp(b) - practiceTimestamp(a)),
    [items],
  );
  const latest = sorted[0];

  return (
    <article
      className={`bes-mobile-home__grade-card is-grade-${grade}${open ? ' is-open' : ''}`}
      data-mobile-grade-card={grade}
      style={{ '--grade-accent': accent, '--grade-soft': soft }}
    >
      <div className="bes-mobile-home__grade-masthead">
        <span>{t.grade} {grade}</span>
        <strong>{items?.length || 0} {vi ? 'bài' : 'lessons'}</strong>
      </div>
      <div className="bes-mobile-home__grade-main">
        <span className="bes-mobile-home__grade-icon" aria-hidden="true"><Icon size={24} /></span>
        <div className="bes-mobile-home__grade-copy">
          <small><Check size={13} />{t.weekly}</small>
          <h3>{t.english} {grade}</h3>
          <p>{latest?.title || t.curriculum}</p>
          <button type="button" data-mobile-grade-toggle onClick={onToggle} aria-expanded={open}>
            {open ? (vi ? 'Thu gọn' : 'Close') : t.enter}<ArrowRight size={15} />
          </button>
        </div>
        <strong className="bes-mobile-home__grade-number" aria-hidden="true">{grade}</strong>
        <button
          type="button"
          className="bes-mobile-home__grade-arrow"
          data-mobile-grade-toggle
          aria-label={vi ? `${open ? 'Thu gọn' : 'Mở bài'} Khối ${grade}` : `${open ? 'Close' : 'Open'} Grade ${grade}`}
          aria-expanded={open}
          onClick={onToggle}
        >
          {open ? <ChevronUp size={22} /> : <ArrowRight size={22} />}
        </button>
      </div>
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
  currentUser,
  tools = [],
  practiceItems = [],
  practicesByGrade = {},
  practiceLoading = false,
  practiceError = '',
  canManagePractice = false,
  onStart,
  onGuide,
  onOpenApps,
  onOpenTool,
  onOpenPractice,
  onRetryPractice,
  onOpenStatistics,
  onOpenManager,
}) {
  const vi = language !== 'en';
  const [openGrade, setOpenGrade] = useState(null);

  return (
    <main className="bes-mobile-home" data-bes-mobile-home="true" aria-label={vi ? 'Trang chủ Brian English' : 'Brian English home'}>
      <div className="bes-mobile-home__dateline" data-mobile-home-dateline aria-label={vi ? 'Brian English — không gian dạy học' : 'Brian English teaching studio'}>
        <span>BRIAN ENGLISH</span>
        <i aria-hidden="true" />
        <span>{vi ? 'KHÔNG GIAN DẠY HỌC' : 'TEACHING STUDIO'}</span>
        <strong>2026—2027</strong>
      </div>

      <div className="bes-mobile-home__desktop-hero" data-mobile-home-hero>
        <HomeHeroExperience2026
          currentUser={currentUser}
          language={language}
          t={t}
          onStart={onStart}
          onGuide={onGuide}
        />
      </div>

      <section className="bes-mobile-home__section bes-mobile-home__practice" data-mobile-home-practice id="weekly-practice" aria-labelledby="mobile-weekly-practice-title">
        <header className="bes-mobile-home__practice-head">
          <div>
            <span className="bes-mobile-home__eyebrow"><ClipboardClock size={16} />{t.practice}</span>
            <h2 id="mobile-weekly-practice-title">{t.practiceTitle}</h2>
            <p>{t.practiceSub}</p>
          </div>
          <div className="bes-mobile-home__practice-total">
            <small>{vi ? 'ĐÃ XUẤT BẢN' : 'PUBLISHED'}</small>
            <strong>{practiceItems.length}</strong>
            <span>{vi ? 'bài luyện tập' : 'practice lessons'}</span>
          </div>
        </header>

        {canManagePractice ? (
          <div className="bes-mobile-home__manager-actions">
            <button type="button" onClick={onOpenStatistics}><BarChart3 size={17} />{t.statistics}</button>
            <button type="button" onClick={onOpenManager}>{t.manage}</button>
          </div>
        ) : null}

        <div className="bes-mobile-home__grade-stack">
          {[10, 11, 12].map((grade) => (
            <React.Fragment key={grade}>
              <MobileGradeSummary
                grade={grade}
                items={practicesByGrade[grade] || []}
                t={t}
                language={language}
                open={openGrade === grade}
                onToggle={() => setOpenGrade((current) => current === grade ? null : grade)}
              />
              {openGrade === grade ? (
                <MobilePracticeList
                  grade={grade}
                  items={practicesByGrade[grade] || []}
                  t={t}
                  language={language}
                  loading={practiceLoading}
                  error={practiceError}
                  onRetry={onRetryPractice}
                  onOpenPractice={onOpenPractice}
                />
              ) : null}
            </React.Fragment>
          ))}
        </div>
      </section>

      <section className="bes-mobile-home__section bes-mobile-home__featured-tools" data-mobile-home-tools aria-labelledby="mobile-featured-tools-title">
        <header className="bes-mobile-home__section-head">
          <h2 id="mobile-featured-tools-title"><BookOpen size={22} aria-hidden="true" />{t.tools}</h2>
          <button type="button" onClick={onOpenApps}>{t.all}<ArrowRight size={15} /></button>
        </header>
        <div className="bes-mobile-home__tools">
          {tools.map((item) => {
            const Icon = item.Icon;
            return (
              <button
                key={item.id}
                type="button"
                className="bes-mobile-home__tool"
                data-mobile-tool={item.id}
                style={{ '--tool-accent': item.accent, '--tool-soft': item.soft }}
                onClick={(event) => onOpenTool?.(item, event)}
              >
                <span aria-hidden="true"><Icon size={22} /></span>
                <strong>{vi ? item.title : item.titleEn}</strong>
                <ArrowRight className="bes-mobile-home__tool-arrow" size={19} aria-hidden="true" />
              </button>
            );
          })}
        </div>
      </section>
    </main>
  );
}
