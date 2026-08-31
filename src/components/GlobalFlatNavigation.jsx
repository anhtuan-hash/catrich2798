import React from 'react';
import Navigation from './GlobalCompactNavigation.jsx';
import GlobalPageLaunchEffect from './GlobalPageLaunchEffect.jsx';
import GlobalWindows8Experience from './GlobalWindows8Experience.jsx';
import GlobalEditorialBriefBar from './GlobalEditorialBriefBar.jsx';
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
import HomeParticleSignaturePortal from './HomeParticleSignaturePortal.jsx';
import GlobalDashboardNavigationTab from './GlobalDashboardNavigationTab.jsx';
import GlobalHomeroomNavigationTab from './GlobalHomeroomNavigationTab.jsx';
import GlobalGradebookNavigationTab from './GlobalGradebookNavigationTab.jsx';
import GlobalReportsNavigationTab from './GlobalReportsNavigationTab.jsx';
import GlobalTtcmNavigationTab from './GlobalTtcmNavigationTab.jsx';
import GlobalDashboardFooterBridge from './GlobalDashboardFooterBridge.jsx';
import GlobalEnglishHubBrand from './GlobalEnglishHubBrand.jsx';
import GlobalWeeklyPracticeBridge from './GlobalWeeklyPracticeBridge.jsx';
import GlobalEditorialAuthorityRuntime from './GlobalEditorialAuthorityRuntime.jsx';

// Shared utilities. Motion Library v2 owns general motion. Metro Sweep is now
// owned by GlobalPageLaunchEffect for compositor-only Windows 8 app launching;
// GlobalWindows8Experience remains mounted for legacy WinRT choreography only.
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
import './GlobalCriticalJankGuard.css';
import './GlobalNotificationCenterRemoval.css';
import './GlobalNotificationCenterFinalRemoval.css';
import './GlobalHomeSparkleButton.css';
import './homeroom/HomeroomCompactDensity.css';
import '../styles/GlobalLayout16x9Authority.css';

export default function GlobalFlatNavigation(props) {
  return (
    <>
      <GlobalNativeTextScaleReset />
      <Navigation {...props} />
      <GlobalPinnedNavigationHub route={props.route} />
      <GlobalPageLaunchEffect route={props.route} />
      <GlobalWindows8Experience route={props.route} />
      <GlobalEditorialBriefBar route={props.route} language={props.language} currentUser={props.currentUser} />
      <GlobalGuestNavigationHub route={props.route} language={props.language} currentUser={props.currentUser} />
      <GlobalWeeklyPracticeBridge route={props.route} language={props.language} currentUser={props.currentUser} />
      <GlobalHeroGovernance route={props.route} />
      <GlobalUserProfileSettingsBridge {...props} />
      <GlobalUserProfilePreviewGuard route={props.route} />
      <GlobalSettingsAdminBridge {...props} />
      <GlobalFontSettingsBridge {...props} />
      <GlobalSubtitleSettingsBridge {...props} />
      <GlobalAiWebsiteLauncher {...props} />
      <HomeParticleSignaturePortal currentUser={props.currentUser} />
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
