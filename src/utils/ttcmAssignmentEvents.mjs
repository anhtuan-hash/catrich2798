// Pure recipient checks for the TTCM assignment event popup.
// Work Hub remains the sole source of persistent task notifications.
const CLOSED_STATUSES = new Set(['draft', 'completed', 'approved', 'archived', 'cancelled']);

export function isEligibleTtcmAssignment(notification, item, userId) {
  const recipientId = String(userId || '');
  if (!recipientId || !notification || !item) return false;
  if (String(notification.user_id || '') !== recipientId) return false;
  if (String(notification.item_id || '') !== String(item.id || '')) return false;
  if (notification.notification_type !== 'work_item_assigned' || notification.read_at) return false;
  if (String(item.source_module || '').toLowerCase() !== 'ttcm') return false;
  if (item.metadata?.ttcm !== true || item.metadata?.ttcm_action_required !== true) return false;
  if (item.metadata?.notify_assignee === false) return false;
  if (String(item.owner_id || '') === recipientId || String(item.created_by || '') === recipientId) return false;
  if (CLOSED_STATUSES.has(String(item.status || '').toLowerCase())) return false;
  if (!Array.isArray(item.assignee_ids) || !item.assignee_ids.map(String).includes(recipientId)) return false;
  return true;
}

export function selectTtcmAssignmentEvents(notifications = [], items = [], userId, alreadyShown = () => false) {
  const byItemId = new Map(items.map((item) => [String(item.id), item]));
  const selectedItemIds = new Set();
  return notifications
    .filter((row) => row && !alreadyShown(row.id))
    .sort((left, right) => new Date(right.created_at || 0) - new Date(left.created_at || 0))
    .flatMap((row) => {
      const itemId = String(row.item_id || '');
      const item = byItemId.get(itemId);
      if (selectedItemIds.has(itemId) || !isEligibleTtcmAssignment(row, item, userId)) return [];
      selectedItemIds.add(itemId);
      return [{ notificationId: String(row.id), itemId, item, createdAt: row.created_at }];
    });
}
