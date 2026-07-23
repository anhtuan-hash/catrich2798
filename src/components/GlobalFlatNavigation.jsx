import React from 'react';
import Navigation from './GlobalCompactNavigation.jsx';
import GlobalGamesNavigationTab from './GlobalGamesNavigationTab.jsx';
import GlobalWorkHubNotificationBridge from './GlobalWorkHubNotificationBridge.jsx';
import './GlobalGoogleMaterialOverride.css';
import './GlobalNotificationCenter.css';
import './GlobalNotificationCenterLayoutFix.css';
import './GlobalCommandPaletteGoogle.css';
import './GlobalCommandPaletteFocusFix.css';

export default function GlobalFlatNavigation(props) {
  return (
    <>
      <Navigation {...props} />
      <GlobalGamesNavigationTab {...props} />
      <GlobalWorkHubNotificationBridge currentUser={props.currentUser} language={props.language} />
    </>
  );
}
