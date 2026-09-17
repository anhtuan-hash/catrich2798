function text(value) {
  return String(value ?? '').trim();
}

function timeValue(value) {
  const valueMs = value ? new Date(value).getTime() : Number.NaN;
  return Number.isFinite(valueMs) ? valueMs : 0;
}

function schoolYearFor(value) {
  const date = value ? new Date(value) : null;
  if (!date || Number.isNaN(date.getTime())) return '';
  const year = date.getFullYear();
  const startYear = date.getMonth() >= 7 ? year : year - 1;
  return `${startYear}-${startYear + 1}`;
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

function activityStatus(response = {}, attachmentCount = 0, fileSubmissionIndex = 0) {
  const kind = text(response.comment_type).toLowerCase();
  if (kind === 'submission' && attachmentCount) {
    return fileSubmissionIndex > 1
      ? { id: 'resubmitted', label: 'Đã nộp lại' }
      : { id: 'submitted', label: 'Đã nộp' };
  }
  if (kind === 'submission') return { id: 'responded', label: 'Đã phản hồi' };
  if (kind === 'review') return { id: 'feedback', label: 'Đã góp ý' };
  if (kind === 'comment') return { id: 'acknowledged', label: 'Đã xác nhận' };
  return attachmentCount ? { id: 'submitted', label: 'Đã gửi tệp' } : { id: 'responded', label: 'Đã phản hồi' };
}

export function buildTeacherHistory({ items = [], responses = [], teacherId = '' } = {}) {
  const targetId = text(teacherId);
  const itemsById = new Map((items || []).filter(Boolean).map((item) => [text(item.id), item]));
  const selected = (responses || [])
    .filter((response) => targetId && text(response?.author_id || response?.user_id) === targetId)
    .slice()
    .sort((a, b) => timeValue(a?.created_at) - timeValue(b?.created_at));

  const responseRoundByItem = new Map();
  const fileRoundByItem = new Map();
  const chronological = selected.map((response) => {
    const itemId = text(response?.item_id);
    const item = itemsById.get(itemId) || {};
    const attachments = parseAttachments(response?.attachments);
    const responseIndex = (responseRoundByItem.get(itemId) || 0) + 1;
    responseRoundByItem.set(itemId, responseIndex);
    let fileSubmissionIndex = 0;
    if (attachments.length) {
      fileSubmissionIndex = (fileRoundByItem.get(itemId) || 0) + 1;
      fileRoundByItem.set(itemId, fileSubmissionIndex);
    }
    const status = activityStatus(response, attachments.length, fileSubmissionIndex);
    return {
      id: text(response?.id) || `${itemId}:${response?.created_at || responseIndex}`,
      itemId,
      itemTitle: text(item?.title) || 'Nội dung TTCM',
      itemType: itemTypeLabel(item),
      body: text(response?.body || response?.content),
      commentType: text(response?.comment_type),
      createdAt: response?.created_at || '',
      schoolYear: schoolYearFor(response?.created_at),
      attachments,
      attachmentCount: attachments.length,
      responseIndex,
      fileSubmissionIndex,
      submissionIndex: responseIndex,
      statusId: status.id,
      statusLabel: status.label,
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
      schoolYear: entry.schoolYear,
      responseIndex: entry.responseIndex,
      submissionIndex: entry.fileSubmissionIndex,
      statusId: entry.statusId,
      statusLabel: entry.statusLabel,
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
