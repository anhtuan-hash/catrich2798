import React from 'react';
import '../data/registerSeatingChartStudio.js';
import Navigation from './GlobalCompactNavigation.jsx';
import GlobalMetroNavigationIndicator from './GlobalMetroNavigationIndicator.jsx';
import GlobalWindows8Experience from './GlobalWindows8Experience.jsx';
import GlobalWindowsPhone8Loading from './GlobalWindowsPhone8Loading.jsx';
import GlobalEditorialBriefBar from './GlobalEditorialBriefBar.jsx';
import GlobalPrimaryNavigationPin from './GlobalPrimaryNavigationPin.jsx';
import GlobalNavigationHubController from './GlobalNavigationHubController.jsx';
import GlobalThemeControl from './GlobalThemeControl.jsx';
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
import GlobalWeeklyPracticeBridge from './GlobalWeeklyPracticeBridge.jsx';

// Cross-route utility styles only. Route visual systems must travel with their
// own lazy route chunks instead of hitchhiking on the shared navigation hub.
import './GlobalGoogleMaterialOverride.css';
import './GlobalCommandPaletteGoogle.css';
import './GlobalCommandPaletteFocusFix.css';
import './GlobalNewsAndroidGoogle.css';
import './GlobalNewsDrawerScroll.css';
import './GlobalTextLabGoogleLarge.css';
import './GlobalNavigationScrollableTabs.css';
import './GlobalWordGraphGoogleM3.css';
import './GlobalAutosaveGoogle.css';
import './GlobalAuroraChrome.css';
import './GlobalSeparatedPills.css';
import './GlobalNavigationPremiumV2.css';
import './GlobalNavigationWholeHubAura.css';
import './GlobalGuestWholeHubAuraFix.css';
import './GlobalWorkScheduleModern.css';
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
// Shared baseline visual contract.
import './GlobalNavigationHubV4.css';
// Absolute final loader contract: all page/app loading uses Windows Phone 8 chase dots.
import './GlobalWindowsPhone8Loading.css';
// TTCM report countdown must override V4's collapsed status dot when Reports is active.
import './GlobalReportsCountdownV4.css';
// Final positioning authority: keep the hub pinned and collapse the newswire while scrolling.
import './GlobalPinnedNavigationHub.css';
// Final authority: legacy notification center stays retired even if a later hub theme restores it.
import './GlobalNotificationCenterFinalRemoval.css';
// Final Homeroom density authority: compact excessive whitespace without affecting other routes.
import './homeroom/HomeroomCompactDensity.css';
// Stable semantic ordering for the shared rail.
import './GlobalNavigationSemanticOrderFix.css';
// ABSOLUTE FINAL CHROME AUTHORITY: one identical navigation hub on every Brian route.
import './GlobalUnifiedNavigationHub.css';
// Shared appearance selector lives inside the one navigation hub.
import './GlobalThemeControl.css';
// ABSOLUTE FINAL COLOR AUTHORITY: dark appearance overrides historical route palettes.
import './GlobalDarkThemeFinal.css';
// ABSOLUTE FINAL GEOMETRY AUTHORITY: one centered 16:9 frame for every Brian route.
import '../styles/GlobalLayout16x9Authority.css';

export default function GlobalFlatNavigation(props) {
  return (
    <>
      <GlobalNativeTextScaleReset />
      <Navigation {...props} />
      <GlobalNavigationHubController />
      <GlobalThemeControl language={props.language} />
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
