import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import './utils/brianTeamEgressGuard.js';
import ExternalAppsIntegration from './components/ExternalAppsIntegration.jsx';
import GlobalFontSettingsBridge from './components/GlobalFontSettingsBridge.jsx';
import HomeWeeklyPracticeStatisticsController from './components/HomeWeeklyPracticeStatisticsController.jsx';
import DepartmentHeadAdminRoleBridge from './components/DepartmentHeadAdminRoleBridge.jsx';
import BrianTeamWorkHubSyncBridge from './components/BrianTeamWorkHubSyncBridge.jsx';
import BrianTeamProgressPanelBridge from './components/BrianTeamProgressPanelBridge.jsx';
import BrianTeamDirectReviewBridge from './components/BrianTeamDirectReviewBridge.jsx';
import BrianTeamRealtimeAlertsBridge from './components/BrianTeamRealtimeAlertsBridge.jsx';
import BrianTeamOperationalStabilityBridge from './components/BrianTeamOperationalStabilityBridge.jsx';
import BrianTeamNoPurpleRuntimeBridge from './components/BrianTeamNoPurpleRuntimeBridge.jsx';
import { initializeAuthSession, subscribeToAuthChanges } from './utils/auth.js';
import { installNeutralSurfaceGuard } from './utils/neutralSurfaceGuard.js';
import { installSiteFontFromCache } from './utils/siteFontSettings.js';
import './homeWeeklyPracticeFlowFix.js';
import './homePracticeScheduleScroller.js';
import './homePracticeHeaderCopyFix.js';
import './weeklyPracticeSubmissionErrorGuard.js';
// Register the 2026-2027 academic week selector before every weekly-upload submit handler.
import './weeklyManagerAcademicWeekSelector.js';
// Register 30-file upload and safe delete-all before legacy weekly-manager handlers.
import './weeklyManagerPowerTools.js';
// Keep the live file input multi-selectable even when the manager UI re-renders it.
import './weeklyBulkUploadInputGuard.js';
// Register bulk-submit interception before the single-file publishing handler.
import './weeklyBulkUpload.js';
import './weeklyPublishingSettings.js';
// Save publication changes in place; the manager stays open and preserves its scroll position.
import './weeklyManagerStayOpen.js';
// Add selection, A-Z sorting and shared settings for multiple created practices.
import './weeklyManagerBulkActions.js';
import './weeklyPracticeOverride.js';
// Add scheduled-publication information after the grade-card override has rendered.
import './weeklyPracticeCompactSchedule.js';
// Guarantee range dragging on Safari and lock the editor work area to neutral surfaces.
import './homeHeroCmsEditorInteractionFix.js';
import './styles/PublishingAndFontControls.css';
import './styles/WeeklyBulkUpload.css';
import './styles/WeeklyBulkUploadInputGuard.css';
// Keep the emergency publisher stylesheet last within publisher controls.
import './styles/WeeklyPublisherEmergencyFix.css';
// Keep compact weekly-card dimensions and schedule dialog at the end of the cascade.
import './styles/WeeklyPracticeCompactSchedule.css';
// Keep the approved featured-tools redesign late in the homepage cascade.
import './styles/HomeFeaturedTools2026.css';
// Homepage Hero is a two-layer media canvas with editable content.
import './styles/HomeHeroExperience2026.css';
import './styles/HomeHeroCmsEditor.css';
// Keep the percentage overlay correction after the main Hero stylesheet.
import './styles/HomeHeroCmsOverlayFix.css';
// Live preview occupies the editor's right-hand pane on large screens.
import './styles/HomeHeroCmsPreviewDock.css';
// Material 3 visual system must be the final Hero editor layer.
import './styles/HomeHeroCmsEditorGoogle.css';
// Exact approved clean editor layout: no blue work area, larger text and icon-only rail.
import './styles/HomeHeroCmsEditorApproved.css';
// Interaction and Safari range reset must remain the final editor stylesheet.
import './styles/HomeHeroCmsEditorInteractionFix.css';
// Keep Featured Tools text comfortably readable after all homepage styles.
import './styles/HomeFeaturedToolsTypography2026.css';
// Static fallback for the Brian Team Work Hub progress panel.
import './styles/BrianTeamProgressNoPurple.css';

installNeutralSurfaceGuard();
installSiteFontFromCache();

function Bootstrap() {
  const [user, setUser] = useState(null);
  const [language, setLanguage] = useState(() => localStorage.getItem('bet-language') || 'vi');

  useEffect(() => {
    let active = true;
    initializeAuthSession().then((nextUser) => active && setUser(nextUser)).catch(() => {});
    const unsubscribe = subscribeToAuthChanges((nextUser) => active && setUser(nextUser));
    const observer = new MutationObserver(() => setLanguage(document.documentElement.lang === 'en' ? 'en' : 'vi'));
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['lang', 'data-language'] });
    return () => {
      active = false;
      unsubscribe?.();
      observer.disconnect();
    };
  }, []);

  return (
    <>
      <ExternalAppsIntegration currentUser={user} language={language} />
      <GlobalFontSettingsBridge currentUser={user} language={language} />
      <DepartmentHeadAdminRoleBridge currentUser={user} language={language} />
      <BrianTeamWorkHubSyncBridge currentUser={user} language={language} />
      <BrianTeamProgressPanelBridge currentUser={user} language={language} />
      <BrianTeamDirectReviewBridge currentUser={user} language={language} />
      <BrianTeamRealtimeAlertsBridge currentUser={user} language={language} />
      <BrianTeamOperationalStabilityBridge currentUser={user} language={language} />
      <BrianTeamNoPurpleRuntimeBridge />
      <HomeWeeklyPracticeStatisticsController />
    </>
  );
}

const host = document.createElement('div');
host.id = 'bes-external-apps-root';
document.body.appendChild(host);
createRoot(host).render(<Bootstrap />);
