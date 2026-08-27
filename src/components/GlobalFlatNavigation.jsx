import React from 'react';
import '../data/registerSeatingChartStudio.js';
import Navigation from './GlobalCompactNavigation.jsx';
import GlobalMetroNavigationIndicator from './GlobalMetroNavigationIndicator.jsx';
import GlobalWindows8Experience from './GlobalWindows8Experience.jsx';
import GlobalEditorialBriefBar from './GlobalEditorialBriefBar.jsx';
import GlobalPrimaryNavigationPin from './GlobalPrimaryNavigationPin.jsx';
import GlobalNativeTextScaleReset from './GlobalNativeTextScaleReset.jsx';
import GlobalGuestNavigationHub from './GlobalGuestNavigationHub.jsx';
import GlobalUserProfileSettingsBridge from './GlobalUserProfileSettingsBridge.jsx';
import GlobalUserProfilePreviewGuard from './GlobalUserProfilePreviewGuard.jsx';
import GlobalSettingsAdminBridge from './GlobalSettingsAdminBridge.jsx';
import GlobalFontSettingsBridge from './GlobalFontSettingsBridge.jsx';
import GlobalHeroGovernance from './GlobalHeroGovernance.jsx';
import GlobalAiWebsiteLauncher from './GlobalAiWebsiteLauncher.jsx';
import GlobalGamesNavigationTab from './GlobalGamesNavigationTab.jsx';
import GlobalDashboardNavigationTab from './GlobalDashboardNavigationTab.jsx';
import GlobalHomeroomNavigationTab from './GlobalHomeroomNavigationTab.jsx';
import GlobalReportsNavigationTab from './GlobalReportsNavigationTab.jsx';
import GlobalTtcmNavigationTab from './GlobalTtcmNavigationTab.jsx';
import GlobalDashboardFooterBridge from './GlobalDashboardFooterBridge.jsx';
import GlobalEnglishHubBrand from './GlobalEnglishHubBrand.jsx';
import GlobalHomeViewportFitBridge from './GlobalHomeViewportFitBridge.jsx';
import GlobalWeeklyPracticeBridge from './GlobalWeeklyPracticeBridge.jsx';
import './GlobalGoogleMaterialOverride.css';
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
import './GlobalNavigationScrollableTabs.css';
import './GlobalWordGraphGoogleM3.css';
import './GlobalAutosaveGoogle.css';
import './GlobalHomeAuroraV3.css';
import './GlobalHomeBriefingContextFix.css';
import './GlobalHomeBriefingUnderLogoFix.css';
import './GlobalAuroraChrome.css';
import './GlobalSeparatedPills.css';
import './GlobalNavigationPremiumV2.css';
import './GlobalNavigationWholeHubAura.css';
import './GlobalGuestWholeHubAuraFix.css';
import './GlobalWorkScheduleModern.css';
import './GlobalHomeViewportFit.css';
import './GlobalWeeklyPractice.css';
import './GlobalWeeklyPracticeStatistics.css';
import './GlobalWeeklyPracticeStatisticsLaunchFix.css';
import './GlobalWeeklyPracticeSimple.css';
import './GlobalWeeklyPracticeStudentProof.css';
import './GlobalScrollPerformance.css';
import './GlobalNavigationOverlayLayer.css';
import './GlobalNavigationGoogleM3Polish.css';
import './GlobalNavigationSearchPillRefinement.css';
import './GlobalNavigationNoSearch.css';
import './GlobalBrianHub.css';
import './GlobalCatRichHeaderVisibilityFix.css';
import '../pages/SeatingChartStudioFocus.css';
import './GlobalNavigationFixedSizeContract.css';
import './GlobalCriticalJankGuard.css';
import './GlobalNotificationCenterRemoval.css';
// Windows 8 remains an optional motion language; it no longer owns header visuals.
import './GlobalWindows8Experience.css';
// Sole final visual + typography contract for the shared navigation hub.
import './GlobalNavigationHubV3.css';

export default function GlobalFlatNavigation(props) {
  return (
    <>
      <GlobalNativeTextScaleReset />
      <Navigation {...props} />
      <GlobalMetroNavigationIndicator route={props.route} />
      <GlobalWindows8Experience route={props.route} />
      <GlobalEditorialBriefBar route={props.route} language={props.language} currentUser={props.currentUser} />
      <GlobalPrimaryNavigationPin route={props.route} />
      <GlobalGuestNavigationHub route={props.route} language={props.language} currentUser={props.currentUser} />
      <GlobalHomeViewportFitBridge route={props.route} />
      <GlobalWeeklyPracticeBridge route={props.route} language={props.language} currentUser={props.currentUser} />
      <GlobalHeroGovernance route={props.route} />
      <GlobalUserProfileSettingsBridge {...props} />
      <GlobalUserProfilePreviewGuard route={props.route} />
      <GlobalSettingsAdminBridge {...props} />
      <GlobalFontSettingsBridge {...props} />
      <GlobalAiWebsiteLauncher {...props} />
      <GlobalGamesNavigationTab {...props} />
      <GlobalDashboardNavigationTab {...props} />
      <GlobalHomeroomNavigationTab {...props} />
      <GlobalReportsNavigationTab {...props} />
      <GlobalTtcmNavigationTab {...props} />
      <GlobalDashboardFooterBridge route={props.route} language={props.language} />
      <GlobalEnglishHubBrand />
    </>
  );
}
