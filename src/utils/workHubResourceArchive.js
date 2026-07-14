import { getRuntimeClient } from '../services/runtime/core.js';
import { fromCloudRow, resourceId, updateResourceLibrary } from './resourceLibrary.js';

const CATEGORY_HINTS = [
  ['lesson-plan', /(giao[-_ ]?an|lesson[-_ ]?plan|ke[-_ ]?hoach[-_ ]?bai[-_ ]?day)/i],
  ['presentation', /\.(ppt|pptx)$/i],
  ['worksheet', /(worksheet|phieu[-_ ]?hoc[-_ ]?tap|bai[-_ ]?tap|handout)/i],
  ['answer-key', /(dap[-_ ]?an|answer[-_ ]?key|rubric|huong[-_ ]?dan[-_ ]?cham)/i],
  ['assessment', /(de[-_ ]?kiem[-_ ]?tra|test|quiz|exam)/i],
  ['audio', /\.(mp3|wav|m4a|aac)$/i],
  ['media', /\.(mp4|mov|avi|png|jpe?g|webp)$/i],
  ['professional-form', /(bien[-_ ]?ban|bao[-_ ]?cao|bieu[-_ ]?mau|ke[-_ ]?hoach[-_ ]?to)/i],
  ['reference', /\.(pdf|doc|docx|txt|rtf)$/i],
];

export function workHubArchiveTitle(fileName = '') {
  return String(fileName || 'Tài liệu')
    .replace(/\.[^.]+$/, '')
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim() || 'Tài liệu';
}

export function guessWorkHubResourceCategory(fileName = '') {
  const name = String(fileName || '');
  return CATEGORY_HINTS.find(([, pattern]) => pattern.test(name))?.[0] || 'other';
}

export function createWorkHubArchiveDraft({ attachment, item, comment, submitterName = '' } = {}) {
  const fileName = attachment?.name || 'Tài liệu';
  return {
    title: workHubArchiveTitle(fileName),
    category: guessWorkHubResourceCategory(fileName),
    description: [
      comment?.body ? `Nội dung phản hồi: ${comment.body}` : '',
      item?.title ? `Công việc: ${item.title}` : '',
      submitterName ? `Người nộp: ${submitterName}` : '',
    ].filter(Boolean).join('\n'),
    grade: '',
    schoolYear: '2025–2026',
    unitName: '',
    tags: 'work-hub, teacher-submission',
  };
}

export async function archiveWorkHubAttachmentToResourceLibrary({ commentId, attachment, metadata }) {
  const client = getRuntimeClient();
  if (!client) return { ok: false, message: 'Supabase chưa được cấu hình.' };
  const { data: sessionData } = await client.auth.getSession();
  const token = sessionData?.session?.access_token || '';
  if (!token) return { ok: false, message: 'Phiên đăng nhập đã hết hạn.' };
  if (!commentId || !attachment?.path) return { ok: false, message: 'Thiếu thông tin tệp cần lưu.' };

  try {
    const response = await fetch('/api/work-hub-archive-resource', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        commentId,
        attachmentPath: attachment.path,
        title: metadata?.title,
        category: metadata?.category,
        description: metadata?.description,
        grade: metadata?.grade,
        schoolYear: metadata?.schoolYear,
        unitName: metadata?.unitName,
        tags: metadata?.tags,
      }),
    });
    const data = await response.json();
    if (!response.ok || !data?.ok) return { ok: false, message: data?.error || 'Không thể lưu tệp vào Kho học liệu.' };

    if (data.resource) {
      const mapped = fromCloudRow(data.resource);
      updateResourceLibrary((store) => {
        const index = store.items.findIndex((entry) => entry.cloudId === mapped.cloudId || entry.id === mapped.id);
        if (index >= 0) store.items[index] = mapped;
        else store.items.unshift(mapped);
        store.activity.unshift({
          id: resourceId('log'),
          type: 'archive-work-submission',
          resourceId: mapped.cloudId || mapped.id,
          at: new Date().toISOString(),
        });
      });
    }

    return {
      ok: true,
      message: data.message,
      resource: data.resource || null,
      comment: data.comment || null,
      reused: Boolean(data.reused),
    };
  } catch (error) {
    return { ok: false, message: error?.message || 'Không thể kết nối dịch vụ lưu trữ học liệu.' };
  }
}
