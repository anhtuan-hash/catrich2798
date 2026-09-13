import React from 'react';
import { ArrowRight, BarChart3, ClipboardClock, Sparkles } from 'lucide-react';

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

        {practiceLoading ? <div className="bes-mobile-home__state">{t.loading}</div> : null}
        {!practiceLoading && practiceError ? (
          <div className="bes-mobile-home__state is-error">
            <span>{practiceError}</span>
            <button type="button" onClick={onRetryPractice}>{t.retry}</button>
          </div>
        ) : null}
        {!practiceLoading && !practiceError ? (
          <div className="bes-mobile-home__grade-summary" aria-label={vi ? 'Bài tập theo khối' : 'Practice by grade'}>
            {[10, 11, 12].map((grade) => {
              const items = practicesByGrade[grade] || [];
              const newest = items[0];
              return (
                <article key={grade}>
                  <span>{t.grade} {grade}</span>
                  <strong>{items.length}</strong>
                  <button type="button" disabled={!newest} onClick={() => newest && onOpenPractice?.(newest)}>{t.enter}</button>
                </article>
              );
            })}
          </div>
        ) : null}
      </section>
    </main>
  );
}
