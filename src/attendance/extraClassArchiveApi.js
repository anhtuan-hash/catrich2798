const ATTENDANCE_PROOF_BUCKET = 'attendance-session-proofs';

function requireClient(client) {
  if (!client?.rpc) throw new Error('Supabase client is not ready.');
  return client;
}

async function rpc(client, name, params = {}) {
  const { data, error } = await requireClient(client).rpc(name, params);
  if (error) throw error;
  return data;
}

export async function archiveExtraClass(client, classId) {
  if (!classId) throw new Error('Không xác định được lớp cần lưu trữ.');
  return rpc(client, 'bes_archive_extra_class', { p_class_id: classId });
}

export async function listExtraClassArchive(client) {
  const rows = await rpc(client, 'bes_list_extra_class_archive');
  return Array.isArray(rows) ? rows : [];
}

export async function restoreExtraClassArchive(client, archiveId) {
  if (!archiveId) throw new Error('Không xác định được lớp cần khôi phục.');
  return rpc(client, 'bes_restore_extra_class_archive', { p_archive_id: archiveId });
}

export async function requestExtraClassArchiveDelete(client, archiveId, reason = '') {
  if (!archiveId) throw new Error('Không xác định được lớp cần yêu cầu xóa.');
  return rpc(client, 'bes_request_extra_class_archive_delete', {
    p_archive_id: archiveId,
    p_reason: String(reason || '').trim(),
  });
}

export async function finalizeExtraClassArchiveDelete(client, archiveId) {
  if (!archiveId) throw new Error('Không xác định được lớp cần hoàn tất xóa.');
  return rpc(client, 'bes_finalize_extra_class_archive_delete', { p_archive_id: archiveId });
}

export async function reviewExtraClassArchiveDelete(client, archiveId, approve, note = '') {
  if (!archiveId) throw new Error('Không xác định được yêu cầu cần duyệt.');
  const review = await rpc(client, 'bes_review_extra_class_archive_delete', {
    p_archive_id: archiveId,
    p_approve: approve === true,
    p_note: String(note || '').trim(),
  });
  if (approve !== true) return review;

  const proofPaths = [...new Set(
    (Array.isArray(review?.proof_paths) ? review.proof_paths : [])
      .map((value) => String(value || '').trim())
      .filter(Boolean),
  )];

  if (proofPaths.length) {
    if (!client?.storage?.from) {
      throw new Error('Admin đã duyệt xóa nhưng dịch vụ lưu trữ chưa sẵn sàng. Gói lớp vẫn được giữ để thử lại.');
    }
    const { error: proofError } = await client.storage.from(ATTENDANCE_PROOF_BUCKET).remove(proofPaths);
    if (proofError) {
      throw new Error(`Admin đã duyệt xóa nhưng chưa thể xóa minh chứng: ${proofError.message || 'lỗi Storage'}. Gói lớp vẫn được giữ để thử lại.`);
    }
  }

  const finalized = await finalizeExtraClassArchiveDelete(client, archiveId);
  return { ...review, ...finalized };
}
