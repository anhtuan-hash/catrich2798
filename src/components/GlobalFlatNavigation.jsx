import React from 'react';
import '../data/registerSeatingChartStudio.js';
import Navigation from './GlobalCompactNavigation.jsx';
import GlobalMetroNavigationIndicator from './GlobalMetroNavigationIndicator.jsx';
import GlobalWindows8Experience from './GlobalWindows8Experience.jsx';
import GlobalWindowsPhone8Loading from './GlobalWindowsPhone8Loading.jsx';
import GlobalEditorialBriefBar from './GlobalEditorialBriefBar.jsx';
import GlobalPrimaryNavigationPin from './GlobalPrimaryNavigationPin.jsx';
import GlobalNavigationHubController from './GlobalNavigationHubController.jsx';
import GlobalPinnedNavigationHub from './GlobalPinnedNavigationHub.jsx';
import GlobalNativeTextScaleReset from './GlobalNativeTextScaleReset.jsx';
import GlobalGuestNavigationHub from './GlobalGuestNavigationHub.jsx';
import GlobalUserProfileSettingsBridge from './GlobalUserProfileSettingsBridge.jsx';
import GlobalUserProfilePreviewGuard from './GlobalUserProfilePreviewGuard.jsx';
import GlobalSettingsAdminBridge from './GlobalSettingsAdminBridge.jsx';
import GlobalFontSettingsBridge from './GlobalFontSettingsBridge.jsx';
import GlobalSubtitleSettingsBridge from './GlobalSubtitleSettingsBridge.jsx';
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
// Windows 8 remains an optional motion language; header visuals are owned by V4.
import './GlobalWindows8Experience.css';
// Approved final visual + typography contract for the shared navigation hub.
import './GlobalNavigationHubV4.css';
// Absolute final loader contract: all page/app loading uses Windows Phone 8 chase dots.
import './GlobalWindowsPhone8Loading.css';
// TTCM report countdown must override V4's collapsed status dot when Reports is active.
import './GlobalReportsCountdownV4.css';
// Final positioning authority: keep the hub pinned and collapse the newswire while scrolling.
import './GlobalPinnedNavigationHub.css';
// Final authority: legacy notification center stays retired even if a later hub theme restores it.
import './GlobalNotificationCenterFinalRemoval.css';
// Absolute final chrome authority: Home may style content, never navigation. One shared hub only.
import './GlobalSingleNavigationHubAuthority.css';

export default function GlobalFlatNavigation(props) {
  return (
    <>
      <GlobalNativeTextScaleReset />
      <Navigation {...props} />
      <GlobalNavigationHubController />
      <GlobalPinnedNavigationHub route={props.route} />
      <GlobalWindowsPhone8Loading />
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
      <GlobalSubtitleSettingsBridge {...props} />
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
