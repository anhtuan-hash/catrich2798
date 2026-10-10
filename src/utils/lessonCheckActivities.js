import { isSupabaseConfigured, supabase } from './supabase.js';

export const LESSON_CHECK_EVENT = 'bes-lesson-check-updated';

function emitUpdate(detail = {}) {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(LESSON_CHECK_EVENT, { detail }));
  }
}

function resultError(error, fallback) {
  return { ok: false, message: error?.message || fallback };
}

function normalizeActivity(row = {}) {
  return {
    id: String(row.id || ''),
    title: String(row.title || ''),
    bookKey: String(row.book_key || 'global-success'),
    grade: row.grade == null ? null : Number(row.grade),
    unitNo: row.unit_no == null ? null : Number(row.unit_no),
    unitTitle: String(row.unit_title || ''),
    lessonKey: String(row.lesson_key || ''),
    lessonTitle: String(row.lesson_title || ''),
    classLabel: String(row.class_label || ''),
    type: String(row.activity_type || 'quiz'),
    focusArea: String(row.focus_area || 'unclassified'),
    notes: String(row.notes || ''),
    sourceHost: String(row.source_host || ''),
    embedKind: String(row.embed_kind || 'url'),
    createdBy: String(row.created_by || ''),
    createdAt: row.created_at || '',
    updatedAt: row.updated_at || '',
    thumbnailUrl: String(row.thumbnail_url || ''),
    thumbnailGeneratedAt: row.thumbnail_generated_at || '',
    thumbnailSourceUpdatedAt: row.thumbnail_source_updated_at || '',
    hasAccess: row.has_access === true,
    requestStatus: String(row.request_status || ''),
    grantCount: Number(row.grant_count || 0),
  };
}

export async function listLessonCheckActivities() {
  if (!isSupabaseConfigured || !supabase) {
    return { ok: false, activities: [], message: 'Supabase is not configured.' };
  }
  const { data, error } = await supabase.rpc('lesson_check_list_activities');
  if (error) return { ...resultError(error, 'Không thể tải hoạt động.'), activities: [] };
  return { ok: true, activities: (data || []).map(normalizeActivity) };
}

export async function ensureLessonCheckActivityThumbnail(activityId) {
  if (!isSupabaseConfigured || !supabase || !activityId) {
    return { ok: false, thumbnailUrl: '', fallback: 'live', message: 'Activity is missing.' };
  }

  let accessToken = '';
  try {
    const { data } = await supabase.auth.getSession();
    accessToken = String(data?.session?.access_token || '');
  } catch {
    accessToken = '';
  }

  if (!accessToken) {
    return { ok: false, thumbnailUrl: '', fallback: 'live', message: 'Authentication required.' };
  }

  try {
    const response = await fetch('/api/lesson-check-thumbnail', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ activityId: String(activityId) }),
      credentials: 'same-origin',
      cache: 'no-store',
    });

    let payload = {};
    try {
      payload = await response.json();
    } catch {
      payload = {};
    }

    return {
      ok: response.ok && payload?.ok === true && Boolean(payload?.thumbnailUrl),
      thumbnailUrl: String(payload?.thumbnailUrl || ''),
      cached: payload?.cached === true,
      generatedAt: payload?.generatedAt || '',
      fallback: String(payload?.fallback || ''),
      message: String(payload?.message || (!response.ok ? `HTTP ${response.status}` : '')),
    };
  } catch (error) {
    return {
      ok: false,
      thumbnailUrl: '',
      fallback: 'live',
      message: error?.message || 'Không thể tạo hình xem trước.',
    };
  }
}

export async function uploadLessonCheckActivityThumbnail(activityId, dataUrl) {
  if (!isSupabaseConfigured || !supabase || !activityId || !dataUrl) {
    return { ok: false, thumbnailUrl: '', message: 'Thumbnail image is missing.' };
  }

  let accessToken = '';
  try {
    const { data } = await supabase.auth.getSession();
    accessToken = String(data?.session?.access_token || '');
  } catch {
    accessToken = '';
  }
  if (!accessToken) return { ok: false, thumbnailUrl: '', message: 'Authentication required.' };

  try {
    const response = await fetch('/api/lesson-check-thumbnail-upload', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        activityId: String(activityId),
        action: 'upload',
        dataUrl: String(dataUrl),
      }),
      credentials: 'same-origin',
      cache: 'no-store',
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok || payload?.ok !== true) {
      return {
        ok: false,
        thumbnailUrl: '',
        message: String(payload?.message || `HTTP ${response.status}`),
      };
    }
    emitUpdate({ type: 'thumbnail-updated', activityId });
    return {
      ok: true,
      thumbnailUrl: String(payload.thumbnailUrl || ''),
      generatedAt: payload.generatedAt || '',
    };
  } catch (error) {
    return {
      ok: false,
      thumbnailUrl: '',
      message: error?.message || 'Không thể tải thumbnail lên.',
    };
  }
}

export async function removeLessonCheckActivityThumbnail(activityId) {
  if (!isSupabaseConfigured || !supabase || !activityId) {
    return { ok: false, message: 'Activity is missing.' };
  }

  let accessToken = '';
  try {
    const { data } = await supabase.auth.getSession();
    accessToken = String(data?.session?.access_token || '');
  } catch {
    accessToken = '';
  }
  if (!accessToken) return { ok: false, message: 'Authentication required.' };

  try {
    const response = await fetch('/api/lesson-check-thumbnail-upload', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        activityId: String(activityId),
        action: 'remove',
      }),
      credentials: 'same-origin',
      cache: 'no-store',
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok || payload?.ok !== true) {
      return { ok: false, message: String(payload?.message || `HTTP ${response.status}`) };
    }
    emitUpdate({ type: 'thumbnail-removed', activityId });
    return { ok: true };
  } catch (error) {
    return { ok: false, message: error?.message || 'Không thể xóa thumbnail.' };
  }
}

export async function getLessonCheckActivityContent(activityId) {
  if (!isSupabaseConfigured || !supabase || !activityId) {
    return { ok: false, content: null, message: 'Activity is missing.' };
  }
  const { data, error } = await supabase.rpc('lesson_check_get_activity_content', {
    target_activity: activityId,
  });
  if (error) return { ...resultError(error, 'Không thể mở nội dung hoạt động.'), content: null };
  const row = Array.isArray(data) ? data[0] : data;
  if (!row) return { ok: false, content: null, message: 'Bạn chưa được cấp quyền cho hoạt động này.' };
  return {
    ok: true,
    content: {
      activityId: String(row.activity_id || activityId),
      embedKind: String(row.embed_kind || 'url'),
      embedCode: String(row.embed_code || ''),
    },
  };
}

export async function saveLessonCheckActivity(draft, parsedEmbed) {
  if (!isSupabaseConfigured || !supabase) return { ok: false, message: 'Supabase is not configured.' };
  const payload = {
    target_activity: draft.id || null,
    p_title: String(draft.title || '').trim(),
    p_book_key: String(draft.bookKey || 'global-success'),
    p_grade: draft.grade ? Number(draft.grade) : null,
    p_unit_no: draft.unitNo ? Number(draft.unitNo) : null,
    p_unit_title: String(draft.unitTitle || '').trim(),
    p_lesson_key: String(draft.lessonKey || '').trim(),
    p_lesson_title: String(draft.lessonTitle || '').trim(),
    p_class_label: String(draft.className || '').trim(),
    p_activity_type: String(draft.type || 'quiz'),
    p_notes: String(draft.notes || '').trim(),
    p_source_host: String(draft.sourceHost || ''),
    p_embed_kind: String(parsedEmbed?.kind || ''),
    p_embed_code: String(draft.embedCode || ''),
  };
  const { data, error } = await supabase.rpc('lesson_check_save_activity', payload);
  if (error) return resultError(error, 'Không thể lưu hoạt động.');
  const id = String(Array.isArray(data) ? data[0] : data || draft.id || '');
  if (!id) return { ok: false, message: 'Activity was saved but no activity id was returned.' };

  const focusArea = String(draft.focusArea || 'unclassified');
  const { error: focusError } = await supabase
    .from('lesson_check_activities')
    .update({ focus_area: focusArea })
    .eq('id', id);
  if (focusError) return { ...resultError(focusError, 'Đã lưu hoạt động nhưng chưa lưu được tag chuyên đề.'), id };

  emitUpdate({ type: 'activity-saved', activityId: id });
  return { ok: true, id };
}

export async function deleteLessonCheckActivity(activityId) {
  if (!isSupabaseConfigured || !supabase) return { ok: false, message: 'Supabase is not configured.' };
  const { data, error } = await supabase.rpc('lesson_check_delete_activity', {
    target_activity: activityId,
  });
  if (error) return resultError(error, 'Không thể xóa hoạt động.');
  emitUpdate({ type: 'activity-deleted', activityId });
  return { ok: data !== false };
}

export async function requestLessonCheckAccess(activityId, message = '') {
  if (!isSupabaseConfigured || !supabase) return { ok: false, message: 'Supabase is not configured.' };
  const { data, error } = await supabase.rpc('lesson_check_request_access', {
    target_activity: activityId,
    request_message: String(message || '').trim(),
  });
  if (error) return resultError(error, 'Không thể gửi yêu cầu quyền.');
  emitUpdate({ type: 'access-requested', activityId });
  return { ok: true, requestId: String(Array.isArray(data) ? data[0] : data || '') };
}

export async function listLessonCheckAccessRequests() {
  if (!isSupabaseConfigured || !supabase) return { ok: false, requests: [], message: 'Supabase is not configured.' };
  const { data, error } = await supabase.rpc('lesson_check_list_access_requests');
  if (error) return { ...resultError(error, 'Không thể tải yêu cầu.'), requests: [] };
  return {
    ok: true,
    requests: (data || []).map((row) => ({
      id: String(row.id || ''),
      activityId: String(row.activity_id || ''),
      activityTitle: String(row.activity_title || ''),
      requesterId: String(row.requester_id || ''),
      requesterName: String(row.requester_name || row.requester_email || 'Teacher'),
      requesterEmail: String(row.requester_email || ''),
      message: String(row.message || ''),
      status: String(row.status || 'pending'),
      createdAt: row.created_at || '',
      updatedAt: row.updated_at || '',
    })),
  };
}

export async function reviewLessonCheckAccessRequest(requestId, decision) {
  if (!isSupabaseConfigured || !supabase) return { ok: false, message: 'Supabase is not configured.' };
  const { data, error } = await supabase.rpc('lesson_check_review_access_request', {
    target_request: requestId,
    decision,
  });
  if (error) return resultError(error, 'Không thể xử lý yêu cầu.');
  emitUpdate({ type: 'request-reviewed', requestId, decision });
  return { ok: data !== false };
}

export async function listLessonCheckTeacherAccess(activityId) {
  if (!isSupabaseConfigured || !supabase) return { ok: false, teachers: [], message: 'Supabase is not configured.' };
  const { data, error } = await supabase.rpc('lesson_check_list_teacher_access', {
    target_activity: activityId,
  });
  if (error) return { ...resultError(error, 'Không thể tải danh sách giáo viên.'), teachers: [] };
  return {
    ok: true,
    teachers: (data || []).map((row) => ({
      userId: String(row.user_id || ''),
      name: String(row.full_name || row.email || 'Teacher'),
      email: String(row.email || ''),
      role: String(row.role || 'teacher'),
      approved: row.approved === true,
      hasAccess: row.has_access === true,
      pendingRequest: row.pending_request === true,
    })),
  };
}

export async function setLessonCheckTeacherAccess(activityId, userId, allowed) {
  if (!isSupabaseConfigured || !supabase) return { ok: false, message: 'Supabase is not configured.' };
  const { data, error } = await supabase.rpc('lesson_check_set_teacher_access', {
    target_activity: activityId,
    target_user: userId,
    allowed: Boolean(allowed),
  });
  if (error) return resultError(error, 'Không thể cập nhật quyền giáo viên.');
  emitUpdate({ type: 'grant-updated', activityId, userId, allowed: Boolean(allowed) });
  return { ok: data !== false };
}

export function subscribeLessonCheckUpdates(callback) {
  if (typeof window === 'undefined') return () => {};
  const onLocal = (event) => callback?.(event?.detail || {});
  window.addEventListener(LESSON_CHECK_EVENT, onLocal);

  let channel = null;
  if (isSupabaseConfigured && supabase) {
    channel = supabase
      .channel('lesson-check-studio-live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'lesson_check_activities' }, () => callback?.({ type: 'activities' }))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'lesson_check_activity_grants' }, () => callback?.({ type: 'grants' }))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'lesson_check_activity_requests' }, () => callback?.({ type: 'requests' }))
      .subscribe();
  }

  return () => {
    window.removeEventListener(LESSON_CHECK_EVENT, onLocal);
    if (channel) supabase.removeChannel(channel);
  };
}
