import assert from 'node:assert/strict';
import { getAuthSessionIdentity,eventLoginStorageKey,eventLoginSessionMarker,canAutoShowEvent } from '../src/features/events/utils/eventLoginSession.mjs';
import { isEventPopupDue } from '../src/features/events/utils/eventEligibility.mjs';

const authSession=(session_id,last_sign_in_at='2026-10-23T12:00:00Z')=>({
  access_token:'header.'+Buffer.from(JSON.stringify({session_id})).toString('base64url')+'.signature',
  user:{id:'teacher-1',last_sign_in_at}
});
const event={id:'halloween-2026',version:1,frequency:'per_login',receipt:{
  first_shown_at:'2026-10-22T12:00:00Z',
  acknowledged_at:'2026-10-22T12:10:00Z',
  hidden_until:'2026-10-29T12:00:00Z'
}};
const loginA=getAuthSessionIdentity(authSession('session-A'));
const loginARefreshed=getAuthSessionIdentity(authSession('session-A','2026-10-23T12:20:00Z'));
const loginB=getAuthSessionIdentity(authSession('session-B','2026-10-23T13:00:00Z'));
assert.equal(loginA,'session-A');
assert.equal(loginARefreshed,loginA,'A refresh must not become a new login');
assert.notEqual(loginB,loginA,'Re-login should generate a different session');
assert.equal(isEventPopupDue(event),true,'Acknowledged old events must show on new login');
const stored=eventLoginSessionMarker('teacher-1',loginA);
assert.equal(canAutoShowEvent(event,'teacher-1',loginA,null),true,'New login should show');
assert.equal(canAutoShowEvent(event,'teacher-1',loginA,stored),false,'Dashboard revisit should not show');
assert.equal(canAutoShowEvent(event,'teacher-1',loginARefreshed,stored),false,'Token refresh should not show');
assert.equal(canAutoShowEvent(event,'teacher-1',loginB,stored),true,'Sign out and in should show');
assert.equal(canAutoShowEvent(event,'teacher-2',loginA,stored),true,'Another user should show');
assert.notEqual(eventLoginStorageKey(event),eventLoginStorageKey({...event,version:2}));
assert.equal(getAuthSessionIdentity({access_token:'invalid',user:{last_sign_in_at:'2026-10-23T12:00:00Z'}}),'signed-in:2026-10-23T12:00:00Z');
assert.equal(canAutoShowEvent(event,'teacher-1',null,stored),false,'Unknown identity does not spam');
console.log('Event per-login popup: new auth sessions, refreshes, revisits, old receipts and recipient isolation passed.');
