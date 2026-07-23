import { isSupabaseConfigured, supabase } from '../../utils/supabase.js';

export const HUB_BUCKET = 'professional-hub-submissions';
export const HUB_TABLES = {
  members: 'professional_hub_members',
  announcements: 'professional_hub_announcements',
  recipients: 'professional_hub_recipients',
  submissions: 'professional_hub_submissions',
};

function requireCloud() {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error('Supabase chưa được cấu hình cho Brian.');
  }
  return supabase;
}

function safeFileName(value = 'tai-lieu') {
  const normalized = String(value || 'tai-lieu')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9._-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
  return normalized || 'tai-lieu';
}

function throwIfError(error) {
  if (error) throw new Error(error.message || 'Không thể hoàn tất thao tác.');
}

export function canUseProfessionalHubCloud() {
  return Boolean(isSupabaseConfigured && supabase);
}

export async function loadProfessionalHubSnapshot(userId) {
  const client = requireCloud();
  if (!userId) throw new Error('Không xác định được tài khoản Brian.');

  const membershipResult = await client
    .from(HUB_TABLES.members)
    .select('*')
    .eq('user_id', userId)
    .eq('active', true)
    .maybeSingle();

  if (membershipResult.error) {
    const message = membershipResult.error.message || '';
    if (/does not exist|schema cache|Could not find/i.test(message)) {
      throw new Error('Hub Chuyên môn chưa được cài đặt dữ liệu. Hãy áp dụng migration MVP trước.');
    }
    throwIfError(membershipResult.error);
  }

  const membership = membershipResult.data || null;
  if (!membership) {
    return {
      membership: null,
      members: [],
      announcements: [],
      recipients: [],
      submissions: [],
    };
  }

  const [membersResult, announcementsResult, recipientsResult, submissionsResult] = await Promise.all([
    client
      .from(HUB_TABLES.members)
      .select('*')
      .eq('active', true)
      .order('role', { ascending: true })
      .order('display_name', { ascending: true }),
    client
      .from(HUB_TABLES.announcements)
      .select('*')
      .order('created_at', { ascending: false }),
    client
      .from(HUB_TABLES.recipients)
      .select('*')
      .order('created_at', { ascending: false }),
    client
      .from(HUB_TABLES.submissions)
      .select('*')
      .order('submitted_at', { ascending: false }),
  ]);

  throwIfError(membersResult.error);
  throwIfError(announcementsResult.error);
  throwIfError(recipientsResult.error);
  throwIfError(submissionsResult.error);

  return {
    membership,
    members: membersResult.data || [],
    announcements: announcementsResult.data || [],
    recipients: recipientsResult.data || [],
    submissions: submissionsResult.data || [],
  };
}

export async function bootstrapProfessionalHubLeader(displayName = '') {
  const client = requireCloud();
  const { data, error } = await client.rpc('professional_hub_bootstrap_leader', {
    requested_display_name: String(displayName || '').trim() || null,
  });
  throwIfError(error);
  return data;
}

export async function addProfessionalHubMember(email, role = 'teacher') {
  const client = requireCloud();
  const { data, error } = await client.rpc('professional_hub_add_member_by_email', {
    target_email: String(email || '').trim().toLowerCase(),
    target_role: role,
  });
  throwIfError(error);
  return data;
}

export async function deactivateProfessionalHubMember(userId) {
  const client = requireCloud();
  const { data, error } = await client.rpc('professional_hub_deactivate_member', {
    target_user_id: userId,
  });
  throwIfError(error);
  return data;
}

export async function createProfessionalHubAnnouncement(input, creatorId) {
  const client = requireCloud();
  const recipientIds = [...new Set((input.recipientIds || []).filter(Boolean))];
  if (!input.title?.trim()) throw new Error('Vui lòng nhập tiêu đề.');
  if (!input.content?.trim()) throw new Error('Vui lòng nhập nội dung thông báo.');
  if (!recipientIds.length) throw new Error('Vui lòng chọn ít nhất một giáo viên nhận thông báo.');

  const kind = input.kind || 'notice';
  const requiresSubmission = kind === 'submission_request' || Boolean(input.requiresSubmission);

  const { data: announcement, error: announcementError } = await client
    .from(HUB_TABLES.announcements)
    .insert({
      kind,
      title: input.title.trim(),
      content: input.content.trim(),
      starts_at: input.startsAt || null,
      due_at: input.dueAt || null,
      requires_submission: requiresSubmission,
      allow_resubmit: requiresSubmission ? input.allowResubmit !== false : false,
      created_by: creatorId,
    })
    .select('*')
    .single();

  throwIfError(announcementError);

  const rows = recipientIds.map((userId) => ({
    announcement_id: announcement.id,
    user_id: userId,
  }));
  const { error: recipientError } = await client.from(HUB_TABLES.recipients).insert(rows);

  if (recipientError) {
    await client.from(HUB_TABLES.announcements).delete().eq('id', announcement.id);
    throwIfError(recipientError);
  }

  return announcement;
}

export async function deleteProfessionalHubAnnouncement(announcementId) {
  const client = requireCloud();
  const filesResult = await client
    .from(HUB_TABLES.submissions)
    .select('file_path')
    .eq('announcement_id', announcementId);
  throwIfError(filesResult.error);

  const filePaths = (filesResult.data || []).map((row) => row.file_path).filter(Boolean);
  if (filePaths.length) {
    const removeResult = await client.storage.from(HUB_BUCKET).remove(filePaths);
    throwIfError(removeResult.error);
  }

  const { error } = await client
    .from(HUB_TABLES.announcements)
    .delete()
    .eq('id', announcementId);
  throwIfError(error);
  return true;
}

export async function markProfessionalHubAnnouncementRead(announcementId) {
  const client = requireCloud();
  const { data, error } = await client.rpc('professional_hub_mark_read', {
    target_announcement_id: announcementId,
  });
  throwIfError(error);
  return data;
}

export async function submitProfessionalHubDocument({
  announcement,
  userId,
  file,
  note = '',
}) {
  const client = requireCloud();
  if (!announcement?.id) throw new Error('Không xác định được yêu cầu nộp tài liệu.');
  if (!userId) throw new Error('Không xác định được tài khoản giáo viên.');
  if (!file) throw new Error('Vui lòng chọn file cần nộp.');
  if (file.size > 25 * 1024 * 1024) throw new Error('File không được vượt quá 25 MB.');

  const existingResult = await client
    .from(HUB_TABLES.submissions)
    .select('id,file_path,status')
    .eq('announcement_id', announcement.id)
    .eq('user_id', userId)
    .maybeSingle();
  throwIfError(existingResult.error);

  if (existingResult.data && !announcement.allow_resubmit) {
    throw new Error('TTCM không cho phép thay file sau khi đã nộp.');
  }
  if (existingResult.data?.status === 'approved') {
    throw new Error('Tài liệu đã được duyệt nên không thể thay thế.');
  }

  const filePath = `${userId}/${announcement.id}/${Date.now()}-${safeFileName(file.name)}`;
  const uploadResult = await client.storage
    .from(HUB_BUCKET)
    .upload(filePath, file, { cacheControl: '3600', upsert: false });
  throwIfError(uploadResult.error);

  const payload = {
    announcement_id: announcement.id,
    user_id: userId,
    file_path: filePath,
    file_name: file.name,
    file_size: file.size,
    note: String(note || '').trim(),
    status: 'submitted',
    feedback: null,
    submitted_at: new Date().toISOString(),
    reviewed_at: null,
    reviewed_by: null,
  };

  const result = await client
    .from(HUB_TABLES.submissions)
    .upsert(payload, { onConflict: 'announcement_id,user_id' })
    .select('*')
    .single();

  if (result.error) {
    await client.storage.from(HUB_BUCKET).remove([filePath]);
    throwIfError(result.error);
  }

  const previousPath = existingResult.data?.file_path;
  if (previousPath && previousPath !== filePath) {
    await client.storage.from(HUB_BUCKET).remove([previousPath]);
  }

  return result.data;
}

export async function reviewProfessionalHubSubmission(submissionId, status, feedback, reviewerId) {
  const client = requireCloud();
  const allowed = new Set(['submitted', 'needs_revision', 'approved']);
  if (!allowed.has(status)) throw new Error('Trạng thái duyệt không hợp lệ.');

  const { data, error } = await client
    .from(HUB_TABLES.submissions)
    .update({
      status,
      feedback: String(feedback || '').trim() || null,
      reviewed_at: status === 'submitted' ? null : new Date().toISOString(),
      reviewed_by: status === 'submitted' ? null : reviewerId,
    })
    .eq('id', submissionId)
    .select('*')
    .single();

  throwIfError(error);
  return data;
}

export async function openProfessionalHubSubmission(filePath) {
  const client = requireCloud();
  const { data, error } = await client.storage
    .from(HUB_BUCKET)
    .createSignedUrl(filePath, 300);
  throwIfError(error);
  if (!data?.signedUrl) throw new Error('Không tạo được liên kết tải file.');
  window.open(data.signedUrl, '_blank', 'noopener,noreferrer');
  return data.signedUrl;
}

export function subscribeToProfessionalHub({ userId, onChange, onRecipient }) {
  if (!canUseProfessionalHubCloud() || !userId) return () => {};

  const channel = supabase
    .channel(`professional-hub-${userId}-${Date.now()}`)
    .on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: HUB_TABLES.announcements,
    }, () => onChange?.())
    .on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: HUB_TABLES.recipients,
    }, (payload) => {
      if (payload?.new?.user_id === userId && payload.eventType === 'INSERT') {
        onRecipient?.(payload.new);
      }
      onChange?.();
    })
    .on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: HUB_TABLES.submissions,
    }, () => onChange?.())
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}
