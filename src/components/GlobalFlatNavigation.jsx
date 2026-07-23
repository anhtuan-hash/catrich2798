import React from 'react';
import Navigation from './GlobalCompactNavigation.jsx';
import GlobalGamesNavigationTab from './GlobalGamesNavigationTab.jsx';
import GlobalWorkHubNotificationBridge from './GlobalWorkHubNotificationBridge.jsx';
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

export default function GlobalFlatNavigation(props) {
  return (
    <>
      <Navigation {...props} />
      <GlobalGamesNavigationTab {...props} />
      <GlobalWorkHubNotificationBridge currentUser={props.currentUser} language={props.language} />
      <GlobalEnglishHubBrand />
    </>
  );
}
