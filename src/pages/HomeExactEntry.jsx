import React, { useEffect } from 'react';
import HomeExact from './HomeExact.jsx';
import './HomeApproved3D.css';

export default function HomeExactEntry(props) {
  useEffect(() => {
    const root = document.documentElement;
    const body = document.body;
    root.classList.add('bes-home-approved-3d');
    body.classList.add('bes-home-approved-3d');

    const reset = () => window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
    reset();
    const frame = window.requestAnimationFrame(reset);

    return () => {
      window.cancelAnimationFrame(frame);
      root.classList.remove('bes-home-approved-3d');
      body.classList.remove('bes-home-approved-3d');
    };
  }, []);

  return <HomeExact {...props} />;
}
