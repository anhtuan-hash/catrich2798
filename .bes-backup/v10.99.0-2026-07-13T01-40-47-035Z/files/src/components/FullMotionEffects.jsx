import React from 'react';
import Win8Loader from './Win8Loader.jsx';
import WindowsPhoneIndicator from './WindowsPhoneIndicator.jsx';

export default function FullMotionEffects({ route, language, loadingState }) {
  const active = Boolean(loadingState?.active);
  if (!active) return null;

  return (
    <>
      <Win8Loader active label={loadingState?.label || ''} />
      <WindowsPhoneIndicator route={route} language={language} loading />
    </>
  );
}
