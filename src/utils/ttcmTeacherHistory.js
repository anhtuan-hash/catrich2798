function text(value) {
  return String(value ?? '').trim();
}

function timeValue(value) {
  const valueMs = value ? new Date(value).getTime() : Number.NaN;
  return Number.isFinite(valueMs) ? valueMs : 0;
}

function parseAttachments(value) {
  if (!value) return [];
  let parsed = value;
  if (typeof value === 'string') {
    try { parsed = JSON.parse(value); } catch { return []; }
  }
  if (!Array.isArray(parsed)) parsed = [parsed];
  return parsed.filter(Boolean).map((attachment, index) => {
    if (typeof attachment === 'string') {
      return { name: attachment.split('/').pop() || `Tệp ${index + 1}`, url: attachment };
    }
    return { ...attachment, name: text(attachment.name || attachment.file_name || attachment.filename) || `Tệp ${index + 1}` };
  });
}

function itemTypeLabel(item = {}) {
  const raw = text(item?.metadata?.ttcm_kind || item?.item_type).replace(/^ttcm_/, '');
  if (raw === 'task') return 'Yêu cầu thực hiện';
  if (raw === 'feedback') return 'Xin góp ý';
  if (raw === 'acknowledgement') return 'Yêu cầu xác nhận';
  if (raw === 'resource') return 'Tài liệu';
  if (raw === 'announcement') return 'Thông báo';
  return 'Nội dung TTCM';
}

function activityLabel(response = {}, attachmentCount = 0) {
  const kind = text(response.comment_type).toLowerCase();
  if (kind === 'submission') return attachmentCount ? 'Đã nộp phản hồi và tệp' : 'Đã gửi phản hồi';
  if (kind === 'review') return 'Đã gửi góp ý';
  if (kind === 'comment') return 'Đã xác nhận / phản hồi';
  return attachmentCount ? 'Đã gửi tệp' : 'Đã phản hồi';
}

export function buildTeacherHistory({ items = [], responses = [], teacherId = '' } = {}) {
  const targetId = text(teacherId);
  const itemsById = new Map((items || []).filter(Boolean).map((item) => [text(item.id), item]));
  const selected = (responses || [])
    .filter((response) => targetId && text(response?.author_id || response?.user_id) === targetId)
    .slice()
    .sort((a, b) => timeValue(a?.created_at) - timeValue(b?.created_at));

  const roundByItem = new Map();
  const chronological = selected.map((response) => {
    const itemId = text(response?.item_id);
    const item = itemsById.get(itemId) || {};
    const attachments = parseAttachments(response?.attachments);
    const submissionIndex = (roundByItem.get(itemId) || 0) + 1;
    roundByItem.set(itemId, submissionIndex);
    return {
      id: text(response?.id) || `${itemId}:${response?.created_at || submissionIndex}`,
      itemId,
      itemTitle: text(item?.title) || 'Nội dung TTCM',
      itemType: itemTypeLabel(item),
      body: text(response?.body || response?.content),
      commentType: text(response?.comment_type),
      createdAt: response?.created_at || '',
      attachments,
      attachmentCount: attachments.length,
      submissionIndex,
      label: activityLabel(response, attachments.length),
    };
  });

  const timeline = chronological.slice().sort((a, b) => timeValue(b.createdAt) - timeValue(a.createdAt));
  const files = chronological
    .flatMap((entry) => entry.attachments.map((attachment, attachmentIndex) => ({
      ...attachment,
      id: `${entry.id}:file:${attachmentIndex}`,
      responseId: entry.id,
      itemId: entry.itemId,
      itemTitle: entry.itemTitle,
      itemType: entry.itemType,
      submittedAt: entry.createdAt,
      submissionIndex: entry.submissionIndex,
    })))
    .sort((a, b) => timeValue(b.submittedAt) - timeValue(a.submittedAt));

  const itemCount = new Set(chronological.map((entry) => entry.itemId).filter(Boolean)).size;
  const latestAt = timeline[0]?.createdAt || '';

  return {
    timeline,
    files,
    summary: {
      activityCount: chronological.length,
      fileCount: files.length,
      itemCount,
      latestAt,
    },
  };
}
