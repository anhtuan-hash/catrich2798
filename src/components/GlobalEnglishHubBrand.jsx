import React from 'react';
import GlobalAccountTextSizeBridge from './GlobalAccountTextSizeBridge.jsx';
import './GlobalIphoneNavigationReadable.css';
import '../styles/dashboard-iphone-readable.css';
import './attendance/AttendanceIphoneReadable.css';
import './GlobalIphoneReadabilityCascadeLocks.css';

// Brand cleanup remains static in the final navigation CSS layer. This utility
// slot also hosts account-menu helpers without replacing/removing React-owned
// navigation children. Phone readability styles are loaded here so the global
// navigation shell itself remains byte-for-byte aligned with main.
export default function GlobalEnglishHubBrand() {
  return <GlobalAccountTextSizeBridge />;
}