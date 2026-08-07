import { supabase } from './utils/supabase.js';

const PATCH_KEY = '__besTabResumeAuthStabilityInstalled';

function installTabResumeAuthStability() {
  if (typeof window === 'undefined' || window[PATCH_KEY] || !supabase?.auth?.onAuthStateChange) return;
  window[PATCH_KEY] = true;

  const originalOnAuthStateChange = supabase.auth.onAuthStateChange.bind(supabase.auth);

  supabase.auth.onAuthStateChange = (callback) => {
    let lastUserId = '';
    let hasDeliveredSessionState = false;

    return originalOnAuthStateChange((event, session) => {
      const userId = String(session?.user?.id || '');

      // Supabase refreshes tokens when a background tab becomes active again.
      // The refreshed token is already persisted internally; Brian does not
      // need to rebroadcast the entire application auth state for this event.
      if (event === 'TOKEN_REFRESHED') return;

      // Supabase may emit SIGNED_IN again when an existing session is merely
      // re-confirmed after tab focus. Deliver the first/real sign-in, but drop
      // duplicate SIGNED_IN events for the same user so both React roots do not
      // re-render the application shell just because the browser tab resumed.
      if (event === 'SIGNED_IN' && hasDeliveredSessionState && userId && userId === lastUserId) return;

      if (session?.user) {
        lastUserId = userId;
        hasDeliveredSessionState = true;
      } else {
        lastUserId = '';
        hasDeliveredSessionState = true;
      }

      callback(event, session);
    });
  };
}

installTabResumeAuthStability();

export { installTabResumeAuthStability };
