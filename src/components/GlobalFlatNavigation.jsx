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
import GlobalWorkHubGoogleHeroV2 from './GlobalWorkHubGoogleHeroV2.jsx';
import GlobalWorkHubViewportModalBridge from './GlobalWorkHubViewportModalBridge.jsx';
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
import './GlobalTickerRestore.css';
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
import './GlobalWorkHubGoogleHeroV2.css';
import './GlobalWorkHubViewportModal.css';
// Performance rules run before the final geometry contract.
import './GlobalScrollPerformance.css';
// Final geometry, followed only by the overlay stacking contract.
import './GlobalNavigationPinnedLayout.css';
import './GlobalNavigationOverlayLayer.css';
// The Work Hub modal visibility contract must win over every global overlay rule.
import './GlobalWorkHubViewportModalFinal.css';
// Legacy viewport and compact sizing rules.
import './GlobalWorkHubModalAnchor.css';
// The final placement contract: always center the dialog in the current viewport.
import './GlobalWorkHubModalCenter.css';
// Visual-only Material 3 polish for the restored navigation and CMS Hero.
import './GlobalNavigationGoogleM3Polish.css';

// Navigation Concept V2 is the approved state immediately before PR #483.
const GlobalNavigationConceptV2 = lazy(() => import('./GlobalNavigationConceptV2.jsx'));
const GlobalWorkScheduleCompatibleCenter = lazy(() => import('./GlobalWorkScheduleCompatibleCenter.jsx'));
const GlobalWorkScheduleTemplatePanel = lazy(() => import('./GlobalWorkScheduleTemplatePanel.jsx'));
const GlobalWorkBulkDeleteManager = lazy(() => import('./GlobalWorkBulkDeleteManager.jsx'));

export default function GlobalFlatNavigation(props) {
  const workHubActive = props.route === 'work-hub';

  return (
    <>
      <Navigation {...props} />
      {props.currentUser ? (
        <Suspense fallback={null}>
          <GlobalNavigationConceptV2 {...props} />
        </Suspense>
      ) : null}
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
      <GlobalWorkHubGoogleHeroV2 route={props.route} />
      <GlobalWorkHubViewportModalBridge route={props.route} />
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
