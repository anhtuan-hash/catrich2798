import React from 'react';
import './HomeHero.css';

function SparkleIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M12 2.2 14 8l5.8 2-5.8 2-2 5.8-2-5.8-5.8-2 5.8-2 2-5.8Z" fill="currentColor" />
    </svg>
  );
}

function PlayIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M8 5.8v12.4L18.2 12 8 5.8Z" fill="currentColor" />
    </svg>
  );
}

function ArrowRightIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M5 12h13M13.5 6.8 18.7 12l-5.2 5.2" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

const COPY = {
  vi: {
    badge: 'ENGLISH HUB',
    line1: 'Không gian',
    line2: 'dạy học thông minh',
    line3: '& sáng tạo',
    subtitle: 'Tích hợp các công cụ hỗ trợ giảng dạy, học tập và quản lý hiệu quả — tối ưu cho giáo viên và học sinh.',
    start: 'Bắt đầu ngay',
    guide: 'Xem hướng dẫn',
  },
  en: {
    badge: 'ENGLISH HUB',
    line1: 'A smart',
    line2: 'teaching workspace',
    line3: '& creative learning',
    subtitle: 'Teaching, learning and management tools brought together in one efficient workspace for teachers and students.',
    start: 'Get started',
    guide: 'View guide',
  },
};

export default function HomeHero({ language = 'vi', onStart, onGuide }) {
  const t = COPY[language] || COPY.vi;

  return (
    <section className="homeHeroFinal" aria-labelledby="homeHeroFinalTitle">
      <div className="homeHeroFinal__copy">
        <span className="homeHeroFinal__badge">{t.badge}</span>

        <h1 id="homeHeroFinalTitle" className="homeHeroFinal__title">
          <span className="homeHeroFinal__line homeHeroFinal__line--dark">{t.line1}</span>
          <span className="homeHeroFinal__line homeHeroFinal__line--blue">{t.line2}</span>
          <span className="homeHeroFinal__line homeHeroFinal__line--purple">{t.line3}</span>
        </h1>

        <p className="homeHeroFinal__subtitle">{t.subtitle}</p>

        <div className="homeHeroFinal__actions">
          <button type="button" className="homeHeroFinal__button homeHeroFinal__button--primary" onClick={onStart}>
            <span className="homeHeroFinal__buttonIcon"><SparkleIcon /></span>
            <span>{t.start}</span>
            <span className="homeHeroFinal__buttonArrow"><ArrowRightIcon /></span>
          </button>

          <button type="button" className="homeHeroFinal__button homeHeroFinal__button--secondary" onClick={onGuide}>
            <span className="homeHeroFinal__buttonIcon"><PlayIcon /></span>
            <span>{t.guide}</span>
          </button>
        </div>
      </div>

      <div className="homeHeroFinal__visual" aria-hidden="true">
        <div className="homeHeroFinal__visualFade" />
        <img className="homeHeroFinal__image" src="/home/hero-vietnam.svg?v=20260729-r3" alt="" decoding="async" fetchPriority="high" />
      </div>
    </section>
  );
}
