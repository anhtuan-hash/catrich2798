import React from 'react';
// Keep the historical Footer export for app-shell compatibility. The footer cards
// were retired: the ORIGINAL Framer portfolio alone occupies the bottom area.
import './FooterCompactDisclosure.css'; // Keep existing home page flow/scroll safeguards.
import './FooterIntegrity.css'; // Keep duplicate legacy footer guards.
import './FooterPortfolio.css';

const FRAMER_PORTFOLIO = 'https://decisive-difference-557977.framer.app/';
const FRAMER_DESKTOP_MIN_WIDTH = 1440;
const FRAMER_DESKTOP_VIEWPORT_HEIGHT = 900;

export default function Footer() {
  const viewportRef = React.useRef(null);
  const [availableWidth, setAvailableWidth] = React.useState(FRAMER_DESKTOP_MIN_WIDTH);

  React.useLayoutEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return undefined;
    const measure = () => {
      const width = Math.max(1, Math.round(viewport.getBoundingClientRect().width));
      setAvailableWidth((previous) => previous === width ? previous : width);
    };

    measure();
    let resizeObserver;
    if (typeof ResizeObserver !== 'undefined') {
      resizeObserver = new ResizeObserver(measure);
      resizeObserver.observe(viewport);
    }
    window.addEventListener('resize', measure, { passive: true });
    return () => {
      resizeObserver?.disconnect();
      window.removeEventListener('resize', measure);
    };
  }, []);

  // Framer determines its responsive breakpoint using its OWN iframe viewport.
  // A 100%-wide iframe would activate tablet/phone layouts in narrower panes.
  // Lock the iframe's layout viewport to at least 1440 CSS pixels, then scale
  // its rendered output to fit without clipping or creating horizontal overflow.
  const desktopViewportWidth = Math.max(FRAMER_DESKTOP_MIN_WIDTH, availableWidth);
  const scale = Math.min(1, availableWidth / FRAMER_DESKTOP_MIN_WIDTH);
  const renderedHeight = Math.round(FRAMER_DESKTOP_VIEWPORT_HEIGHT * scale);

  return (
    <section
      className="bes-framer-portfolio-only"
      aria-label="Nguyễn Anh Tuấn · Framer portfolio (desktop layout)"
      data-portfolio-embed="desktop-only"
    >
      <div
        className="bes-framer-portfolio-desktop-viewport"
        ref={viewportRef}
        style={{ height: `${renderedHeight}px` }}
      >
        <iframe
          className="bes-framer-portfolio-only-iframe"
          src={FRAMER_PORTFOLIO}
          title="Portfolio Nguyễn Anh Tuấn · desktop"
          loading="lazy"
          referrerPolicy="strict-origin-when-cross-origin"
          allowFullScreen
          style={{
            width: `${desktopViewportWidth}px`,
            height: `${FRAMER_DESKTOP_VIEWPORT_HEIGHT}px`,
            transform: `scale(${scale})`,
          }}
        />
      </div>
    </section>
  );
}
