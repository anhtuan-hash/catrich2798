import React from 'react';
import Navigation from './GlobalCompactNavigation.jsx';
import GlobalWorkHubNotificationBridge from './GlobalWorkHubNotificationBridge.jsx';
import './GlobalGoogleMaterialOverride.css';

export default function GlobalFlatNavigation(props) {
  return (
    <>
      <Navigation {...props} />
      <GlobalWorkHubNotificationBridge currentUser={props.currentUser} language={props.language} />
    </>
  );
}
