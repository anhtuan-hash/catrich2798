/**
 * Login-scoped announcement display.
 *
 * Supabase Auth's session_id claim remains stable across token refreshes and
 * changes after a new sign-in. This is a UI de-duplication marker ONLY, never
 * authorization; event eligibility is still enforced by the database RLS.
 */
export function getAuthSessionIdentity(session) {
  const accessToken=String(session?.access_token||'');
  try {
    const part=accessToken.split('.')[1]||'';
    const json=atob(part.replace(/-/g,'+').replace(/_/g,'/'));
    const claims=JSON.parse(json);
    if(typeof claims.session_id==='string' && claims.session_id)return claims.session_id;
  }catch {/* fall back to stable sign-in timestamp below */}
  const lastSignIn=String(session?.user?.last_sign_in_at||'');
  return lastSignIn ? 'signed-in:'+lastSignIn : null;
}

export function eventLoginStorageKey(event) {
  return 'bes-event-per-login-v1:'+String(event?.id||'')+':'+String(event?.version||1);
}

export function eventLoginSessionMarker(userId,sessionIdentity) {
  if(!userId||!sessionIdentity)return '';
  return String(userId)+':'+String(sessionIdentity);
}

export function canAutoShowEvent(event,userId,sessionIdentity,storedMarker) {
  if(!event)return false;
  if(event.frequency!=='per_login')return false; // Delegate other modes to ordinary receipt eligibility.
  const marker=eventLoginSessionMarker(userId,sessionIdentity);
  return Boolean(marker && marker!==storedMarker);
}
