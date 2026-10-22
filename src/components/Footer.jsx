import React from 'react';
import { APP_VERSION } from '../config/version.js';
// Retain global page-flow and duplicate-footer safeguards used across app routes.
// Legacy three-card presentation styles are intentionally NOT imported.
import './FooterCompactDisclosure.css';
import './FooterIntegrity.css';
import './FooterPortfolio.css';

const PORTFOLIO_URL = 'https://decisive-difference-557977.framer.app/';

const COPY = {
  vi: {
    eyebrow: 'HỒ SƠ CÁ NHÂN · FRAMER',
    title: 'Portfolio · Nguyễn Anh Tuấn',
    description: 'Khám phá hồ sơ, hành trình giáo dục và các dự án sáng tạo ngay tại ESL Brian. Nơi mình chia sẻ về giảng dạy, nghiên cứu và những ý tưởng nhằm ứng dụng công nghệ trong giáo dục tiếng Anh, hướng tới trải nghiệm học tập tốt hơn cho mọi người.',
    view: 'Xem portfolio',
    original: 'Xem bản gốc',
    hint: 'Portfolio Framer tương tác trực tiếp — cuộn và khám phá ngay trong khung bên cạnh.',
    copyright: 'Bản quyền © 2026 English Hub',
    preview: 'Portfolio Nguyễn Anh Tuấn trên Framer',
    label: 'Hồ sơ tác giả và portfolio cá nhân',
  },
  en: {
    eyebrow: 'PERSONAL PORTFOLIO · FRAMER',
    title: 'Portfolio · Nguyễn Anh Tuấn',
    description: 'Explore my educational journey, research and creative projects right here in ESL Brian. This portfolio shares my teaching practice, academic interests and ideas for applying technology to improve English language learning.',
    view: 'Explore portfolio',
    original: 'Original website',
    hint: 'Explore the interactive Framer portfolio directly in this panel.',
    copyright: '© 2026 English Hub. All rights reserved.',
    preview: "Nguyễn Anh Tuấn's Framer portfolio",
    label: 'Author information and personal portfolio',
  },
};

function ProfilePill({ symbol, tone, children }) {
  return (
    <span className={`bes-portfolio-unified-pill bes-portfolio-unified-pill--${tone}`}>
      <span className="bes-portfolio-unified-pill-icon" aria-hidden="true">{symbol}</span>
      <span>{children}</span>
    </span>
  );
}

/** Exactly one canonical app footer: portfolio showcase and copyright together. */
export default function Footer({ language, route = '' }) {
  const isVi = language === 'vi';
  const copy = COPY[isVi ? 'vi' : 'en'];
  const frameRef = React.useRef(null);
  const resolvedRoute = route || (typeof document !== 'undefined' ? document.querySelector('.app-shell')?.dataset?.route || '' : '');

  const explorePortfolio = () => {
    const frame = frameRef.current;
    if (!frame) return;
    const prefersReducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    frame.scrollIntoView({ behavior: prefersReducedMotion ? 'auto' : 'smooth', block: 'center' });
    // The cross-origin Framer page owns its own scroll and interactive gestures.
    frame.focus({ preventScroll: true });
  };

  return (
    <footer
      className="bes-portfolio-unified-footer"
      data-app-shell-footer="true"
      data-footer-mode="portfolio-unified"
      data-footer-route={resolvedRoute || undefined}
      aria-label={copy.label}
    >
      <div className="bes-portfolio-unified-main">
        <div className="bes-portfolio-unified-content">
          <span className="bes-portfolio-unified-eyebrow">
            <span className="bes-portfolio-unified-eyebrow-dot" aria-hidden="true" />
            {copy.eyebrow}
          </span>

          <h2 className="bes-portfolio-unified-title">{copy.title}</h2>
          <p className="bes-portfolio-unified-description">{copy.description}</p>

          <div className="bes-portfolio-unified-pills" aria-label={isVi ? 'Lĩnh vực chuyên môn' : 'Areas of expertise'}>
            <ProfilePill symbol="🎓" tone="blue">English Educator</ProfilePill>
            <ProfilePill symbol="▣" tone="purple">Academic Researcher</ProfilePill>
            <ProfilePill symbol="✦" tone="orange">Educational Innovator</ProfilePill>
          </div>

          <div className="bes-portfolio-unified-actions">
            <button
              type="button"
              className="bes-portfolio-unified-action-primary"
              onClick={explorePortfolio}
              aria-controls="bes-unified-portfolio-preview"
            >
              <span aria-hidden="true">↗</span>
              {copy.view}
              <span className="bes-portfolio-unified-action-arrow" aria-hidden="true">↗</span>
            </button>
            <a className="bes-portfolio-unified-action-secondary" href={PORTFOLIO_URL} target="_blank" rel="noopener noreferrer">
              {copy.original}
              <span aria-hidden="true">↗</span>
            </a>
          </div>

          <p className="bes-portfolio-unified-hint">
            <span aria-hidden="true">✧</span>
            {copy.hint}
          </p>
        </div>

        <div className="bes-portfolio-unified-showcase" id="bes-unified-portfolio-preview">
          <span className="bes-portfolio-unified-sparkle bes-portfolio-unified-sparkle-one" aria-hidden="true">✧</span>
          <span className="bes-portfolio-unified-sparkle bes-portfolio-unified-sparkle-two" aria-hidden="true">✦</span>
          <div className="bes-portfolio-unified-browser">
            <iframe
              ref={frameRef}
              className="bes-portfolio-unified-iframe"
              title={copy.preview}
              src={PORTFOLIO_URL}
              loading="lazy"
              referrerPolicy="strict-origin-when-cross-origin"
              allowFullScreen
            />
          </div>
          <span className="bes-portfolio-unified-aside" aria-hidden="true">Better Learners<br />Brighter Futures</span>
        </div>
      </div>

      <div className="bes-portfolio-unified-bottom">
        <div className="bes-portfolio-unified-copyright">
          <strong>English Hub v{APP_VERSION}</strong>
          <span aria-hidden="true">·</span>
          <span>{copy.copyright}</span>
          <span aria-hidden="true">·</span>
          <span>Designed &amp; Developed by <strong className="bes-portfolio-unified-author">Nguyễn Anh Tuấn</strong></span>
        </div>
        <span className="bes-portfolio-unified-signoff">Teach Better Together ♡</span>
      </div>
    </footer>
  );
}
