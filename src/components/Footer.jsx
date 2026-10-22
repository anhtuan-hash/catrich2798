import React from 'react';
// This component retains the Footer export for compatibility with the app shell.
// There is intentionally NO footer, label, decorative card, CTA, or copyright:
// the original Framer website is the sole content at the bottom of each route.
import './FooterCompactDisclosure.css'; // Preserve home-route page flow rules.
import './FooterIntegrity.css'; // Preserve duplicate legacy-footer safeguards.
import './FooterPortfolio.css';

const FRAMER_PORTFOLIO = 'https://decisive-difference-557977.framer.app/';

export default function Footer() {
  return (
    <section
      className="bes-framer-portfolio-only"
      aria-label="Nguyễn Anh Tuấn · Framer portfolio"
      data-portfolio-embed="original-only"
    >
      <iframe
        className="bes-framer-portfolio-only-iframe"
        src={FRAMER_PORTFOLIO}
        title="Portfolio Nguyễn Anh Tuấn"
        loading="lazy"
        referrerPolicy="strict-origin-when-cross-origin"
        allowFullScreen
      />
    </section>
  );
}
