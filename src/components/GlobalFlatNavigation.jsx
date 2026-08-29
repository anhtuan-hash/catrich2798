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
import GlobalNavigationRegionalTypographyRuntime from './GlobalNavigationRegionalTypographyRuntime.jsx';
import GlobalSubtitleSettingsBridge from './GlobalSubtitleSettingsBridge.jsx';
import GlobalHeroGovernance from './GlobalHeroGovernance.jsx';
import GlobalAiWebsiteLauncher from './GlobalAiWebsiteLauncher.jsx';
import GlobalGamesNavigationTab from './GlobalGamesNavigationTab.jsx';
import GlobalDashboardNavigationTab from './GlobalDashboardNavigationTab.jsx';
import GlobalHomeroomNavigationTab from './GlobalHomeroomNavigationTab.jsx';
import GlobalGradebookNavigationTab from './GlobalGradebookNavigationTab.jsx';
import GlobalReportsNavigationTab from './GlobalReportsNavigationTab.jsx';
import GlobalTtcmNavigationTab from './GlobalTtcmNavigationTab.jsx';
import GlobalDashboardFooterBridge from './GlobalDashboardFooterBridge.jsx';
import GlobalEnglishHubBrand from './GlobalEnglishHubBrand.jsx';
import GlobalWeeklyPracticeBridge from './GlobalWeeklyPracticeBridge.jsx';
import GlobalEditorialAuthorityRuntime from './GlobalEditorialAuthorityRuntime.jsx';

// Shared non-navigation utilities only. The visible navigation shell has exactly
// one visual authority now: styles/GlobalNavigationFinal2026.css, injected last
// by GlobalEditorialAuthorityRuntime.
import './GlobalGoogleMaterialOverride.css';
import './GlobalCommandPaletteGoogle.css';
import './GlobalCommandPaletteFocusFix.css';
import './GlobalNewsAndroidGoogle.css';
import './GlobalNewsDrawerScroll.css';
import './GlobalTextLabGoogleLarge.css';
import './GlobalWordGraphGoogleM3.css';
import './GlobalAutosaveGoogle.css';
import './GlobalWorkScheduleModern.css';
import './GlobalScrollPerformance.css';
import '../pages/SeatingChartStudioFocus.css';
import './GlobalCriticalJankGuard.css';
import './GlobalNotificationCenterRemoval.css';
import './GlobalWindowsPhone8Loading.css';
import './GlobalNotificationCenterFinalRemoval.css';
import './homeroom/HomeroomCompactDensity.css';
import '../styles/GlobalLayout16x9Authority.css';

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
      <GlobalWeeklyPracticeBridge route={props.route} language={props.language} currentUser={props.currentUser} />
      <GlobalHeroGovernance route={props.route} />
      <GlobalUserProfileSettingsBridge {...props} />
      <GlobalUserProfilePreviewGuard route={props.route} />
      <GlobalSettingsAdminBridge {...props} />
      <GlobalFontSettingsBridge {...props} />
      <GlobalNavigationRegionalTypographyRuntime />
      <GlobalSubtitleSettingsBridge {...props} />
      <GlobalAiWebsiteLauncher {...props} />
      <GlobalGamesNavigationTab {...props} />
      <GlobalDashboardNavigationTab {...props} />
      <GlobalHomeroomNavigationTab {...props} />
      <GlobalGradebookNavigationTab {...props} />
      <GlobalReportsNavigationTab {...props} />
      <GlobalTtcmNavigationTab {...props} />
      <GlobalDashboardFooterBridge route={props.route} language={props.language} />
      <GlobalEnglishHubBrand />
      <GlobalEditorialAuthorityRuntime />
    </>
  );
}
