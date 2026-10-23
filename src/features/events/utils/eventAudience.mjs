/** Recipients managed centrally: approved Admin and TTCM always get staff announcements. */
export const isRequiredEventRecipient = (profile) =>
  Boolean(profile?.approved && ['admin','department_head'].includes(profile.role));

/** Add management accounts without duplicating or dropping targeted teachers. */
export function resolveEventRecipientIds(profiles,selectedIds) {
  const approved = new Set((profiles || []).filter(profile =>
    profile?.approved && ['admin','department_head','teacher'].includes(profile.role)
  ).map(profile=>profile.id));
  const chosen=(selectedIds || []).filter(id=>approved.has(id));
  const mandatory=(profiles || []).filter(isRequiredEventRecipient).map(profile=>profile.id);
  return [...new Set([...chosen,...mandatory])];
}
