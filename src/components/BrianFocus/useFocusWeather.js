import { useEffect, useState } from 'react';
import {
  readSharedFocusWeather, subscribeSharedFocusWeather, refreshSharedFocusWeather,
} from './focusWeatherService.js';

export default function useFocusWeather(open) {
  const [weather, setWeather] = useState(readSharedFocusWeather);
  useEffect(() => subscribeSharedFocusWeather(setWeather), []);
  useEffect(() => {
    if (!open) return undefined;
    const refreshIfActive = () => {
      if (document.visibilityState !== 'hidden') refreshSharedFocusWeather();
    };
    refreshIfActive();
    const interval = window.setInterval(refreshIfActive, 5 * 60 * 1000);
    document.addEventListener('visibilitychange', refreshIfActive);
    window.addEventListener('focus', refreshIfActive);
    return () => {
      window.clearInterval(interval);
      document.removeEventListener('visibilitychange', refreshIfActive);
      window.removeEventListener('focus', refreshIfActive);
    };
  }, [open]);
  return { weather, refresh: () => refreshSharedFocusWeather({ force: true }) };
}
