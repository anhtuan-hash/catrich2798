import React from 'react';
import GlobalAccountTextSizeBridge from './GlobalAccountTextSizeBridge.jsx';

// Brand cleanup remains static in the final navigation CSS layer. This utility
// slot also hosts account-menu helpers without replacing/removing React-owned
// navigation children.
export default function GlobalEnglishHubBrand() {
  return <GlobalAccountTextSizeBridge />;
}
