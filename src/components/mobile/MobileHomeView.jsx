import React, { useEffect, useMemo, useState } from 'react';
import { ArrowRight, BarChart3, CalendarDays, ChevronDown, ChevronUp, ClipboardClock, Sparkles } from 'lucide-react';
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

export default function MobileHomeView({
  t,
  language = 'vi',
  tools = [],
  practiceItems = [],
  practicesByGrade = {},
  practiceLoading = false,
  practiceError = '',
  canManagePractice = false,
  onStart,
  onOpenApps,
  onOpenTool,
  onOpenPractice,
  onRetryPractice,
  onOpenStatistics,
  onOpenManager,
}) {
  const vi = language !== 'en';
  const [selectedGrade, setSelectedGrade] = useState(10);
  const [practiceExpanded, setPracticeExpanded] = useState(false);
  const visiblePractices = useMemo(
    () => [...(practicesByGrade[selectedGrade] || [])].sort((a, b) => practiceTimestamp(b) - practiceTimestamp(a)),
    [practicesByGrade, selectedGrade],
  );
  const displayedPractices = practiceExpanded ? visiblePractices : visiblePractices.slice(0, 4);

  useEffect(() => {
    setPracticeExpanded(false);
  }, [selectedGrade]);

  return (
    <main className="bes-mobile-home" data-bes-mobile-home="true" aria-label={vi ? 'Trang chủ Brian English' : 'Brian English home'}>
      <section className="bes-mobile-home__hero" data-mobile-home-hero>
        <span className="bes-mobile-home__eyebrow"><Sparkles size={16} />{t.badge}</span>
        <h1>{t.headline} <em>{t.highlight}</em></h1>
        <p>{t.subtitle}</p>
        <div className="bes-mobile-home__hero-actions">
          <button type="button" onClick={onStart}>{t.start}<ArrowRight size={17} /></button>
          <button type="button" onClick={onOpenApps}>{t.all}</button>
        </div>
        <div className="bes-mobile-home__hero-stat" aria-label={vi ? `${practiceItems.length} bài luyện tập` : `${practiceItems.length} practice lessons`}>
          <strong>{practiceItems.length}</strong>
          <span>{vi ? 'bài luyện tập' : 'practice lessons'}</span>
        </div>
      </section>

      <section className="bes-mobile-home__section" aria-labelledby="mobile-featured-tools-title">
        <header className="bes-mobile-home__section-head">
          <h2 id="mobile-featured-tools-title">{t.tools}</h2>
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
              </button>
            );
          })}
        </div>
      </section>

      <section className="bes-mobile-home__section bes-mobile-home__practice" id="weekly-practice" aria-labelledby="mobile-weekly-practice-title">
        <header className="bes-mobile-home__practice-head">
          <div>
            <span className="bes-mobile-home__eyebrow"><ClipboardClock size={16} />{t.practice}</span>
            <h2 id="mobile-weekly-practice-title">{t.practiceTitle}</h2>
            <p>{t.practiceSub}</p>
          </div>
          <div className="bes-mobile-home__practice-total">
            <strong>{practiceItems.length}</strong>
            <span>{vi ? 'đã xuất bản' : 'published'}</span>
          </div>
        </header>

        {canManagePractice ? (
          <div className="bes-mobile-home__manager-actions">
            <button type="button" onClick={onOpenStatistics}><BarChart3 size={17} />{t.statistics}</button>
            <button type="button" onClick={onOpenManager}>{t.manage}</button>
          </div>
        ) : null}

        <div className="bes-mobile-home__grade-selector" aria-label={vi ? 'Chọn khối lớp' : 'Choose grade'}>
          {[10, 11, 12].map((grade) => (
            <button
              key={grade}
              type="button"
              data-mobile-grade={grade}
              aria-pressed={selectedGrade === grade}
              onClick={() => setSelectedGrade(grade)}
            >
              <span>{t.grade}</span>
              <strong>{grade}</strong>
              <small>{(practicesByGrade[grade] || []).length}</small>
            </button>
          ))}
        </div>

        <div className="bes-mobile-home__practice-panel" data-mobile-practice-grade={selectedGrade} aria-busy={practiceLoading ? 'true' : 'false'}>
          <div className="bes-mobile-home__practice-panel-head">
            <div>
              <small>{t.weekly}</small>
              <h3>{t.english} {selectedGrade}</h3>
            </div>
            <span>{visiblePractices.length} {vi ? 'bài' : 'lessons'}</span>
          </div>

          {practiceLoading ? <div className="bes-mobile-home__state">{t.loading}</div> : null}
          {!practiceLoading && practiceError ? (
            <div className="bes-mobile-home__state is-error">
              <span>{practiceError}</span>
              <button type="button" onClick={onRetryPractice}>{t.retry}</button>
            </div>
          ) : null}
          {!practiceLoading && !practiceError && displayedPractices.length ? (
            <>
              <div className="bes-mobile-home__practice-list">
                {displayedPractices.map((item, index) => {
                  const date = formatPracticeDate(item, language);
                  return (
                    <article key={item?.id || `${selectedGrade}-${index}`} className="bes-mobile-home__practice-card" data-mobile-practice-card>
                      <div className="bes-mobile-home__practice-card-copy">
                        <span className="bes-mobile-home__practice-index">{String(index + 1).padStart(2, '0')}</span>
                        <div>
                          <h4>{item?.title || `${t.english} ${selectedGrade}`}</h4>
                          {date ? <small><CalendarDays size={14} />{date}</small> : null}
                        </div>
                      </div>
                      <button type="button" onClick={() => onOpenPractice?.(item)}>{t.enter}<ArrowRight size={15} /></button>
                    </article>
                  );
                })}
              </div>
              {visiblePractices.length > 4 ? (
                <button
                  type="button"
                  className="bes-mobile-home__practice-expand"
                  aria-expanded={practiceExpanded}
                  onClick={() => setPracticeExpanded((value) => !value)}
                >
                  {practiceExpanded
                    ? <>{vi ? 'Thu gọn' : 'Show less'}<ChevronUp size={17} /></>
                    : <>{vi ? `Xem tất cả bài (${visiblePractices.length})` : `View all lessons (${visiblePractices.length})`}<ChevronDown size={17} /></>}
                </button>
              ) : null}
            </>
          ) : null}
          {!practiceLoading && !practiceError && !visiblePractices.length ? <div className="bes-mobile-home__state">{t.empty}</div> : null}
        </div>
      </section>
    </main>
  );
}
