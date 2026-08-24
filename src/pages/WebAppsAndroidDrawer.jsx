import React from 'react';
import WebAppsRedesign from './WebAppsRedesign.jsx';
import '../styles/apps-hero-clean-v3.css';
import '../styles/apps-hero-flat-relief-v4.css';
// Final Material permission layer: locked apps stay legible and open a focused access dialog.
import '../styles/apps-permission-request-material.css';
// The Applications page now uses a normal list instead of the legacy app-drawer grid.
import '../styles/apps-list-view.css';
// Paint/performance guard loaded last so the Applications route stays responsive on Safari and classroom displays.
import '../styles/apps-performance-recovery.css';

export default function WebAppsAndroidDrawer(props) {
  return <WebAppsRedesign {...props} />;
}
