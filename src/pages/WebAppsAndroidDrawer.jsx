import React from 'react';
import WebAppsRedesign from './WebAppsRedesign.jsx';
import '../styles/apps-android-drawer.css';
import '../styles/apps-hero-clean-v3.css';
import '../styles/apps-hero-flat-relief-v4.css';
// Final Material permission layer: locked apps stay legible and open a focused access dialog.
import '../styles/apps-permission-request-material.css';

export default function WebAppsAndroidDrawer(props) {
  return <WebAppsRedesign {...props} />;
}
