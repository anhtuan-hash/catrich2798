import React, { Suspense, lazy } from 'react';
import Navigation from './GlobalCompactNavigation.jsx';
import GlobalGuestNavigationHub from './GlobalGuestNavigationHub.jsx';
import GlobalPublicNewsBriefing from './GlobalPublicNewsBriefing.jsx';
import GlobalUserProfileSettingsBridge from './GlobalUserProfileSettingsBridge.jsx';
import GlobalUserProfilePreviewGuard from './GlobalUserProfilePreviewGuard.jsx';
import GlobalSettingsAppearanceBridge from './GlobalSettingsAppearanceBridge.jsx';
import GlobalMotionCoreBridge from './GlobalMotionCoreBridge.jsx';
import GlobalHeroGovernance from './GlobalHeroGovernance.jsx';
import GlobalAiWebsiteLauncher from './GlobalAiWebsiteLauncher.jsx';
import GlobalNewsNavigationTab from './GlobalNewsNavigationTab.jsx';
import GlobalGamesNavigationTab from './GlobalGamesNavigationTab.jsx';
import GlobalDashboardNavigationTab from './GlobalDashboardNavigationTab.jsx';
import GlobalHomeroomNavigationTab from './GlobalHomeroomNavigationTab.jsx';
import GlobalDashboardFooterBridge from './GlobalDashboardFooterBridge.jsx';
import GlobalWorkHubNotificationBridge from './GlobalWorkHubNotificationBridge.jsx';
import GlobalWorkScheduleBridge from './GlobalWorkScheduleBridge.jsx';
import GlobalEnglishHubBrand from './GlobalEnglishHubBrand.jsx';
import GlobalHomeBriefingExtras from './GlobalHomeBriefingExtras.jsx';
import GlobalHomeViewportFitBridge from './GlobalHomeViewportFitBridge.jsx';
import GlobalWeeklyPracticeBridge from './GlobalWeeklyPracticeBridge.jsx';
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
import './GlobalAppsWorkspaceRedesign.css';
import './GlobalAppsWorkspaceCompact.css';
import './GlobalAppsHorizontalLauncher.css';
import './GlobalAppsPhoneTiles.css';
import './GlobalAppsAndroidDrawer.css';
import './GlobalAppsRemoveQuickSearch.css';
import './GlobalNewsAndroidGoogle.css';
import './GlobalNewsDrawerScroll.css';
import './GlobalTextLabGoogleLarge.css';
import '../styles/teacher-dashboard-google-v2.css';
import './GlobalDashboardVisualFix.css';
import './GlobalWorkHubGoogleRedesign.css';
import './GlobalNotificationCenterGoogleFinal.css';
import './GlobalNotificationCenterNarrow.css';
import './GlobalNotificationMenuLayerFix.css';
import './GlobalNavigationFontScaleGuard.css';
import './GlobalNavigationScrollableTabs.css';
import './GlobalWordGraphGoogleM3.css';
import './GlobalNotificationCountVisibilityFix.css';
import './GlobalAutosaveGoogle.css';
import './GlobalHomeAuroraV3.css';
import './GlobalHomeBriefingContextFix.css';
import './GlobalHomeBriefingUnderLogoFix.css';
import './GlobalAuroraChrome.css';
import './GlobalSeparatedPills.css';
import './GlobalScrollPerformance.css';
import './GlobalTickerRestore.css';
import './GlobalWorkScheduleModern.css';
import './GlobalHomeViewportFit.css';
import './GlobalWeeklyPractice.css';
import './GlobalWeeklyPracticeStatistics.css';
import './GlobalWeeklyPracticeStatisticsLaunchFix.css';
import './GlobalWeeklyPracticeSimple.css';
import './GlobalWeeklyPracticeStudentProof.css';

const GlobalWorkScheduleCompatibleCenter = lazy(() => import('./GlobalWorkScheduleCompatibleCenter.jsx'));
const GlobalWorkScheduleTemplatePanel = lazy(() => import('./GlobalWorkScheduleTemplatePanel.jsx'));
const GlobalWorkBulkDeleteManager = lazy(() => import('./GlobalWorkBulkDeleteManager.jsx'));

export default function GlobalFlatNavigation(props) {
  const workHubActive = props.route === 'work-hub';

  return (
    <>
      <Navigation {...props} />
      <GlobalGuestNavigationHub route={props.route} language={props.language} currentUser={props.currentUser} />
      <GlobalPublicNewsBriefing route={props.route} language={props.language} currentUser={props.currentUser} />
      <GlobalHomeBriefingExtras route={props.route} language={props.language} />
      <GlobalHomeViewportFitBridge route={props.route} />
      <GlobalWeeklyPracticeBridge route={props.route} language={props.language} currentUser={props.currentUser} />
      <GlobalMotionCoreBridge route={props.route} />
      <GlobalHeroGovernance route={props.route} />
      <GlobalUserProfileSettingsBridge {...props} />
      <GlobalUserProfilePreviewGuard route={props.route} />
      <GlobalSettingsAppearanceBridge {...props} />
      <GlobalAiWebsiteLauncher {...props} />
      <GlobalNewsNavigationTab {...props} />
      <GlobalGamesNavigationTab {...props} />
      <GlobalDashboardNavigationTab {...props} />
      <GlobalHomeroomNavigationTab {...props} />
      <GlobalDashboardFooterBridge route={props.route} language={props.language} />
      <GlobalWorkHubNotificationBridge currentUser={props.currentUser} language={props.language} />
      <GlobalWorkScheduleBridge />
      {workHubActive ? (
        <Suspense fallback={null}>
          <GlobalWorkScheduleCompatibleCenter {...props} />
          <GlobalWorkScheduleTemplatePanel route={props.route} />
          <GlobalWorkBulkDeleteManager {...props} />
        </Suspense>
      ) : null}
      <GlobalEnglishHubBrand />
    </>
  );
}
