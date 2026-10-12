// Pure selection boundary: only a server-confirmed GVCN row may override the
// user's last opened class. No subject/managed class is ever used as authority.
export function selectServerAssignedHomeroom(rows) {
  const candidates = Array.isArray(rows) ? rows : (rows ? [rows] : []);
  const assigned = candidates.find((item) => (
    typeof item?.workspace_id === 'string'
    && item.workspace_id.trim()
    && typeof item?.class_name === 'string'
    && item.class_name.trim()
  ));
  return assigned
    ? { id: assigned.workspace_id.trim(), className: assigned.class_name.trim(), source: 'server-assignment' }
    : null;
}
