/** Internal UI-only events. Permissions remain in each owning component. */
export const GLOBAL_FLOATING_ACTION_EVENT = 'bes:unified-floating-action';
export const GLOBAL_FLOATING_STATUS_EVENT = 'bes:unified-floating-status';

export const FLOATING_ACTION_IDS = Object.freeze({
  focus: 'focus',
  approvals: 'approvals',
  chat: 'chat',
});
export function openUnifiedFloatingAction(id) {
  if (typeof window === 'undefined' || !Object.values(FLOATING_ACTION_IDS).includes(id)) return;
  window.dispatchEvent(new CustomEvent(GLOBAL_FLOATING_ACTION_EVENT, { detail: { id } }));
}
export function broadcastUnifiedFloatingStatus(id, data) {
  if (typeof window === 'undefined' || !Object.values(FLOATING_ACTION_IDS).includes(id)) return;
  window.dispatchEvent(new CustomEvent(GLOBAL_FLOATING_STATUS_EVENT, {
    detail: { id, ...data },
  }));
}
