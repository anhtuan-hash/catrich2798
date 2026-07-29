import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import ExternalAppsIntegration from './components/ExternalAppsIntegration.jsx';
import GlobalFontSettingsBridge from './components/GlobalFontSettingsBridge.jsx';
import GlobalWeeklyPracticeStatisticsBridge from './components/GlobalWeeklyPracticeStatisticsBridge.jsx';
import { initializeAuthSession, subscribeToAuthChanges } from './utils/auth.js';
import { installNeutralSurfaceGuard } from './utils/neutralSurfaceGuard.js';
import { installSiteFontFromCache } from './utils/siteFontSettings.js';
import './homeWeeklyPracticeFlowFix.js';
import './homePracticeScheduleScroller.js';
import './homePracticeHeaderCopyFix.js';
import './weeklyPracticeSubmissionErrorGuard.js';
// Keep the live file input multi-selectable even when the manager UI re-renders it.
import './weeklyBulkUploadInputGuard.js';
// Register bulk-submit interception before the single-file publishing handler.
import './weeklyBulkUpload.js';
import './weeklyPublishingSettings.js';
import './weeklyPracticeOverride.js';
// Add scheduled-publication information after the grade-card override has rendered.
import './weeklyPracticeCompactSchedule.js';
import './styles/PublishingAndFontControls.css';
import './styles/WeeklyBulkUpload.css';
import './styles/WeeklyBulkUploadInputGuard.css';
// Keep the emergency publisher stylesheet last within publisher controls.
import './styles/WeeklyPublisherEmergencyFix.css';
// Keep compact weekly-card dimensions and schedule dialog at the end of the cascade.
import './styles/WeeklyPracticeCompactSchedule.css';

installNeutralSurfaceGuard();
installSiteFontFromCache();

function readRoute() {
  return window.location.hash.replace(/^#\//, '').split('?')[0] || 'home';
}

function Bootstrap() {
  const [user, setUser] = useState(null);
  const [language, setLanguage] = useState(() => localStorage.getItem('bet-language') || 'vi');
  const [route, setRoute] = useState(readRoute);

  useEffect(() => {
    let active = true;
    initializeAuthSession().then((nextUser) => active && setUser(nextUser)).catch(() => {});
    const unsubscribe = subscribeToAuthChanges((nextUser) => active && setUser(nextUser));
    const observer = new MutationObserver(() => setLanguage(document.documentElement.lang === 'en' ? 'en' : 'vi'));
    const updateRoute = () => setRoute(readRoute());
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['lang', 'data-language'] });
    window.addEventListener('hashchange', updateRoute);
    return () => {
      active = false;
      unsubscribe?.();
      observer.disconnect();
      window.removeEventListener('hashchange', updateRoute);
    };
  }, []);

  return (
    <>
      <ExternalAppsIntegration currentUser={user} language={language} />
      <GlobalFontSettingsBridge currentUser={user} language={language} />
      <GlobalWeeklyPracticeStatisticsBridge route={route} currentUser={user} />
    </>
  );
}

const host = document.createElement('div');
host.id = 'bes-external-apps-root';
document.body.appendChild(host);
createRoot(host).render(<Bootstrap />);
