import React from 'react';
import Navigation from './GlobalCompactNavigation.jsx';
import GlobalGamesNavigationTab from './GlobalGamesNavigationTab.jsx';
import GlobalDashboardNavigationTab from './GlobalDashboardNavigationTab.jsx';
import GlobalWorkHubNotificationBridge from './GlobalWorkHubNotificationBridge.jsx';
import GlobalWorkScheduleCenter from './GlobalWorkScheduleCenter.jsx';
import GlobalWorkScheduleBridge from './GlobalWorkScheduleBridge.jsx';
import GlobalWorkScheduleTemplatePanel from './GlobalWorkScheduleTemplatePanel.jsx';
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
import './GlobalHomeroomGoogleRedesign.css';
import './GlobalHomeroomGoogleColorPolish.css';
import './GlobalHomeroomGoogleReadabilityPolish.css';

export default function GlobalFlatNavigation(props) {
  return (
    <>
      <Navigation {...props} />
      <GlobalGamesNavigationTab {...props} />
      <GlobalDashboardNavigationTab {...props} />
      <GlobalWorkHubNotificationBridge currentUser={props.currentUser} language={props.language} />
      <GlobalWorkScheduleBridge />
      <GlobalWorkScheduleCenter {...props} />
      <GlobalWorkScheduleTemplatePanel route={props.route} />
      <GlobalEnglishHubBrand />
    </>
  );
}
