import { useEffect, useMemo, useState } from 'react';

export const BRIAN_FOCUS_TIME_ZONE = 'Asia/Ho_Chi_Minh';

export function formatFocusTime(now, language = 'vi', timeZone = BRIAN_FOCUS_TIME_ZONE) {
  const locale = language === 'en' ? 'en-GB' : 'vi-VN';
  const digits = new Intl.DateTimeFormat('en-GB', {
    timeZone, hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  }).formatToParts(now);
  const hours = digits.find((part) => part.type === 'hour')?.value ?? '00';
  const minutes = digits.find((part) => part.type === 'minute')?.value ?? '00';
  const date = new Intl.DateTimeFormat(locale, {
    timeZone, weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  }).format(now);
  const dateLabel = date ? date[0].toLocaleUpperCase(locale) + date.slice(1) : '';
  return { hours, minutes, dateLabel };
}

/** Only runs while Focus is actually visible. Sync at each real minute boundary. */
export default function useFocusClock(language = 'vi') {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    let timeout;
    const tick = () => {
      window.clearTimeout(timeout);
      setNow(new Date());
      const millisecondsToNextMinute = 60_000 - (Date.now() % 60_000) + 35;
      timeout = window.setTimeout(tick, millisecondsToNextMinute);
    };
    const syncWhenVisible = () => {
      if (document.visibilityState === 'visible') tick();
    };
    tick();
    document.addEventListener('visibilitychange', syncWhenVisible);
    window.addEventListener('focus', syncWhenVisible);
    return () => {
      window.clearTimeout(timeout);
      document.removeEventListener('visibilitychange', syncWhenVisible);
      window.removeEventListener('focus', syncWhenVisible);
    };
  }, []);

  return useMemo(() => formatFocusTime(now, language), [now, language]);
}
