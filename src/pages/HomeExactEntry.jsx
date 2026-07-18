import React, { useEffect } from 'react';
import HomeExact from './HomeExact.jsx';
import './HomeExactFix.css';
import './HomeExactTypography.css';
import './HomeExactPolish.css';
import './HomeExactGraphics.css';
import './HomeExactGraphicsRefine.css';
import './HomeExactFinal.css';
import './HomeSharedShell.css';
import './HomeExactCrossBrowser.css';

export default function HomeExactEntry(props) {
  useEffect(() => {
    const reset = () => window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
    reset();
    const frame = window.requestAnimationFrame(reset);
    return () => window.cancelAnimationFrame(frame);
  }, []);

  return <HomeExact {...props} />;
}
