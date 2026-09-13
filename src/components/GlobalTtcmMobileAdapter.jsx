import React, { useEffect } from 'react';
import GlobalTtcmNavigationTab from './GlobalTtcmNavigationTab.jsx';
import './GlobalTtcmMobile.css';

const PHONE_QUERY = '(max-width: 760px)';

export default function GlobalTtcmMobileAdapter(props) {
  useEffect(() => {
    if (typeof window === 'undefined' || typeof document === 'undefined') return undefined;

    const phone = window.matchMedia('(max-width: 760px)');
    const clearOpenSheets = () => {
      document.querySelectorAll('.ttcm-reader-shell[data-mobile-detail-open]').forEach((shell) => {
        shell.removeAttribute('data-mobile-detail-open');
      });
    };

    const onClick = (event) => {
      if (!phone.matches) return;
      const target = event.target instanceof Element ? event.target : null;
      const shell = target?.closest('.ttcm-reader-shell');
      if (!target || !shell) return;

      if (target.closest('.ttcm-reader-card')) {
        shell.dataset.mobileDetailOpen = 'true';
        return;
      }

      if (target.closest('.ttcm-reader-back')) {
        shell.removeAttribute('data-mobile-detail-open');
        return;
      }

      if (target.closest('.ttcm-reader-sidebar > button') || target.closest('.ttcm-m3-workspace-tabs button')) {
        shell.removeAttribute('data-mobile-detail-open');
        return;
      }

      if (shell.dataset.mobileDetailOpen === 'true' && !target.closest('.ttcm-reader-detail')) {
        shell.removeAttribute('data-mobile-detail-open');
      }
    };

    const onKeyDown = (event) => {
      if (!phone.matches || !['Enter', ' '].includes(event.key)) return;
      const target = event.target instanceof Element ? event.target : null;
      const card = target?.closest('.ttcm-reader-card');
      const shell = card?.closest('.ttcm-reader-shell');
      if (card && shell) shell.dataset.mobileDetailOpen = 'true';
    };

    const onViewportChange = () => {
      if (!phone.matches) clearOpenSheets();
    };

    document.addEventListener('click', onClick);
    document.addEventListener('keydown', onKeyDown);
    phone.addEventListener?.('change', onViewportChange);

    return () => {
      clearOpenSheets();
      document.removeEventListener('click', onClick);
      document.removeEventListener('keydown', onKeyDown);
      phone.removeEventListener?.('change', onViewportChange);
    };
  }, []);

  return <GlobalTtcmNavigationTab {...props} />;
}

export { PHONE_QUERY };
