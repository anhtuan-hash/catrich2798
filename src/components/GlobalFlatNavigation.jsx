import React, { Suspense, lazy } from 'react';
import Navigation from './GlobalCompactNavigation.jsx';
import GlobalGamesNavigationTab from './GlobalGamesNavigationTab.jsx';
import GlobalDashboardNavigationTab from './GlobalDashboardNavigationTab.jsx';
import GlobalDashboardFooterBridge from './GlobalDashboardFooterBridge.jsx';
import GlobalWorkHubNotificationBridge from './GlobalWorkHubNotificationBridge.jsx';
import GlobalWorkScheduleBridge from './GlobalWorkScheduleBridge.jsx';
import GlobalEnglishHubBrand from './GlobalEnglishHubBrand.jsx';
import './GlobalGoogleMaterialOverride.css';
import './GlobalNotificationCenter.css';
import './GlobalNotificationCenterLayoutFix.css';
import './GlobalCommandPaletteGoogle.css';
import './GlobalCommandPaletteFocusFix.css';
import './GlobalHomeDashboardRemoval.css';
import './GlobalHomeGooglePolish.css';
import './GlobalHome16x9Fit.css';
import './GlobalHomeOriginalFooter.css';
import './GlobalAppsGoogle.css';
import './GlobalAppsContrastPolish.css';
import './GlobalAppsAndroidLauncher.css';
import './GlobalNewsAndroidGoogle.css';
import './GlobalNewsDrawerScroll.css';
import './GlobalTextLabGoogleLarge.css';
import '../styles/teacher-dashboard-google-v2.css';
import './GlobalDashboardVisualFix.css';
import './GlobalWorkHubGoogleRedesign.css';
import './GlobalNotificationCenterGoogleFinal.css';
import './GlobalNotificationCenterNarrow.css';

const GlobalWorkScheduleCompatibleCenter = lazy(() => import('./GlobalWorkScheduleCompatibleCenter.jsx'));
const GlobalWorkScheduleTemplatePanel = lazy(() => import('./GlobalWorkScheduleTemplatePanel.jsx'));

export default function GlobalFlatNavigation(props) {
  const workHubActive = props.route === 'work-hub';

  return (
    <>
      <Navigation {...props} />
      <GlobalGamesNavigationTab {...props} />
      <GlobalDashboardNavigationTab {...props} />
      <GlobalDashboardFooterBridge route={props.route} language={props.language} />
      <GlobalWorkHubNotificationBridge currentUser={props.currentUser} language={props.language} />
      <GlobalWorkScheduleBridge />
      {workHubActive ? (
        <Suspense fallback={null}>
          <GlobalWorkScheduleCompatibleCenter {...props} />
          <GlobalWorkScheduleTemplatePanel route={props.route} />
        </Suspense>
      ) : null}
      <GlobalEnglishHubBrand />
    </>
  );
}
