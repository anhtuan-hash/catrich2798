import { useEffect } from 'react';

const LOCATION_CACHE_KEY = 'bes-live-briefing-location-v1';
const INTERNET_CACHE_KEY = 'bes-live-briefing-internet-v1';

function text(node) {
  return String(node?.textContent || '').trim();
}

function notificationBadgeValue() {
  return text(document.querySelector('.brian-nav__bell em')) || '0';
}

function requestLocation() {
  if (typeof navigator === 'undefined' || !navigator.geolocation) return;
  navigator.geolocation.getCurrentPosition(
    (position) => {
      try {
        window.localStorage.setItem(LOCATION_CACHE_KEY, JSON.stringify({
          latitude: Number(position.coords.latitude),
          longitude: Number(position.coords.longitude),
          label: '',
          savedAt: Date.now(),
        }));
        window.localStorage.removeItem(INTERNET_CACHE_KEY);
      } catch {
        // The page can still reload and retry without persistent cache.
      }
      window.location.reload();
    },
    () => {},
    { enableHighAccuracy: false, timeout: 10000, maximumAge: 0 },
  );
}

export default function GlobalLiveBriefingFinalFix({ currentUser, language = 'vi', route = '' }) {
  useEffect(() => {
    if (!currentUser || typeof document === 'undefined') return undefined;

    let frame = 0;
    let interval = 0;
    const locationNodes = new Set();

    const sync = () => {
      frame = 0;
      const badgeValue = notificationBadgeValue();
      const bars = document.querySelectorAll('.app-shell[data-route] .brian-briefing-bar');

      bars.forEach((bar) => {
        const strip = bar.querySelector('.brian-live-chip-strip');
        if (!strip) return;
        bar.classList.add('has-live-briefing-final-fix');

        const notificationChip = strip.querySelector('.brian-live-chip.is-slate');
        const notificationPrimary = notificationChip?.querySelector('.brian-live-chip__copy strong');
        const notificationSecondary = notificationChip?.querySelector('.brian-live-chip__copy em');
        if (notificationPrimary && text(notificationPrimary) !== badgeValue) {
          notificationPrimary.textContent = badgeValue;
        }
        const secondaryValue = badgeValue === '0'
          ? (language === 'en' ? 'All read' : 'Đã đọc hết')
          : (language === 'en' ? 'Unread' : 'Chưa đọc');
        if (notificationSecondary && text(notificationSecondary) !== secondaryValue) {
          notificationSecondary.textContent = secondaryValue;
        }

        const weatherChip = strip.querySelector('.brian-live-chip.is-blue');
        const weatherPrimary = weatherChip?.querySelector('.brian-live-chip__copy strong');
        const needsLocation = /bật vị trí|enable/i.test(text(weatherPrimary));
        weatherChip?.classList.toggle('is-location-action', needsLocation);
        if (weatherChip && needsLocation && !weatherChip.dataset.locationHandler) {
          weatherChip.dataset.locationHandler = 'true';
          weatherChip.setAttribute('role', 'button');
          weatherChip.setAttribute('tabindex', '0');
          weatherChip.setAttribute('aria-label', language === 'en'
            ? 'Enable location for weather information'
            : 'Bật vị trí để xem thông tin thời tiết');
          const activate = (event) => {
            if (event.type === 'keydown' && !['Enter', ' '].includes(event.key)) return;
            event.preventDefault();
            requestLocation();
          };
          weatherChip.__brianLocationHandler = activate;
          weatherChip.addEventListener('click', activate);
          weatherChip.addEventListener('keydown', activate);
          locationNodes.add(weatherChip);
        }
      });
    };

    const queueSync = () => {
      if (!frame) frame = window.requestAnimationFrame(sync);
    };

    sync();
    const observer = new MutationObserver(queueSync);
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true,
    });
    interval = window.setInterval(sync, 2000);
    window.addEventListener('storage', queueSync);
    window.addEventListener('bes-global-notification', queueSync);
    window.addEventListener('hashchange', queueSync);

    return () => {
      observer.disconnect();
      window.cancelAnimationFrame(frame);
      window.clearInterval(interval);
      window.removeEventListener('storage', queueSync);
      window.removeEventListener('bes-global-notification', queueSync);
      window.removeEventListener('hashchange', queueSync);
      document.querySelectorAll('.has-live-briefing-final-fix').forEach((bar) => {
        bar.classList.remove('has-live-briefing-final-fix');
      });
      locationNodes.forEach((node) => {
        const handler = node.__brianLocationHandler;
        if (handler) {
          node.removeEventListener('click', handler);
          node.removeEventListener('keydown', handler);
        }
        delete node.__brianLocationHandler;
        delete node.dataset.locationHandler;
      });
    };
  }, [currentUser?.id, language, route]);

  return null;
}
