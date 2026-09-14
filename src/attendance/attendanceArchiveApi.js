function requireClient(client) {
  if (!client?.rpc) throw new Error('Supabase client is not ready.');
  return client;
}

async function rpc(client, name, params = {}) {
  const { data, error } = await requireClient(client).rpc(name, params);
  if (error) throw error;
  return data;
}

export async function archiveAttendanceHistory(client, session = {}) {
  const isSupplemental = session?.attendance_source === 'supplemental' || session?.class_type === 'supplemental';
  const rawId = isSupplemental
    ? (session?.supplemental_session_id || String(session?.id || '').replace(/^supplemental:/, ''))
    : session?.id;
  if (!rawId) throw new Error('Không xác định được buổi điểm danh cần lưu trữ.');
  return rpc(client, 'bes_archive_attendance_history', {
    p_source_type: isSupplemental ? 'supplemental' : 'extra',
    p_session_id: rawId,
  });
}

export async function listAttendanceArchive(client) {
  const rows = await rpc(client, 'bes_list_attendance_archive');
  return Array.isArray(rows) ? rows : [];
}

export async function restoreAttendanceArchive(client, archiveId) {
  if (!archiveId) throw new Error('Không xác định được mục cần khôi phục.');
  return rpc(client, 'bes_restore_attendance_archive', { p_archive_id: archiveId });
}

export async function requestAttendanceArchiveDelete(client, archiveId, reason = '') {
  if (!archiveId) throw new Error('Không xác định được mục cần yêu cầu xóa.');
  return rpc(client, 'bes_request_attendance_archive_delete', {
    p_archive_id: archiveId,
    p_reason: String(reason || '').trim(),
  });
}

export async function reviewAttendanceArchiveDelete(client, archiveId, approve, note = '') {
  if (!archiveId) throw new Error('Không xác định được yêu cầu cần duyệt.');
  return rpc(client, 'bes_review_attendance_archive_delete', {
    p_archive_id: archiveId,
    p_approve: approve === true,
    p_note: String(note || '').trim(),
  });
}
