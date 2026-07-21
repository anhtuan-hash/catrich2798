import { canPublishDepartment } from './permissions.js';
import { isDepartmentLeaderRole } from './roles.js';
import {
  getAccessToken,
  resourceId,
  sha256,
  syncResourceViaServer,
  updateResourceLibrary,
  upsertResourceCloud,
} from './resourceLibrary.js';

function safeFilename(value = 'textlab-activity') {
  return String(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 72) || 'textlab-activity';
}

function encodeMetadata(value) {
  const json = JSON.stringify(value);
  const bytes = new TextEncoder().encode(json);
  let binary = '';
  bytes.forEach((byte) => { binary += String.fromCharCode(byte); });
  return btoa(binary);
}

function isLeader(user) {
  return canPublishDepartment(user) || isDepartmentLeaderRole(user?.role);
}

async function uploadHtmlFile(file, metadata) {
  const token = await getAccessToken();
  if (!token) throw new Error('Bạn cần đăng nhập để chia sẻ hoạt động vào Kho học liệu.');

  const response = await fetch('/api/google-drive-upload', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': file.type || 'text/html',
      'X-File-Name': encodeURIComponent(file.name),
      'X-Resource-Metadata': encodeMetadata(metadata),
    },
    body: file,
  });

  let data = {};
  try { data = await response.json(); } catch { /* keep the fallback error */ }
  if (!response.ok) throw new Error(data.error || 'Không thể lưu hoạt động lên Google Drive của Kho học liệu.');
  return data;
}

export async function publishTextLabResource(payload = {}, currentUser) {
  const standaloneHtml = String(payload.standaloneHtml || '').trim();
  const title = String(payload.title || payload.templateName || 'TextLab Activity').trim();
  if (!standaloneHtml) throw new Error('Hoạt động chưa có nội dung HTML có thể chạy trực tiếp.');
  if (!title) throw new Error('Hãy nhập tên học liệu.');
  if (!currentUser?.id && !currentUser?.email) throw new Error('Không xác định được tài khoản người chia sẻ.');

  const now = new Date().toISOString();
  const leader = isLeader(currentUser);
  const filename = `${safeFilename(title)}.html`;
  const file = new File([standaloneHtml], filename, { type: 'text/html;charset=utf-8' });
  const checksum = await sha256(file);
  const templateId = String(payload.templateId || 'activity');
  const templateName = String(payload.templateName || title);
  const tags = Array.from(new Set([
    'textlab-activity',
    'interactive-html',
    templateId,
    ...(Array.isArray(payload.tags) ? payload.tags : String(payload.tags || '').split(',')),
  ].map((tag) => String(tag || '').trim()).filter(Boolean)));

  const base = {
    id: resourceId(),
    title,
    description: String(payload.description || `Hoạt động tương tác ${templateName}, chạy trực tiếp trong trình duyệt.`).trim(),
    category: String(payload.category || 'worksheet'),
    grade: String(payload.grade || ''),
    schoolYear: String(payload.schoolYear || ''),
    unitName: String(payload.unitName || ''),
    cefr: String(payload.cefr || ''),
    skills: Array.isArray(payload.skills) ? payload.skills : [],
    tags,
    source: `Brian TextLab Activities · ${templateName}`,
    copyright: String(payload.copyright || 'self'),
    visibility: 'department',
    allowDownload: payload.allowDownload === true,
    status: leader ? 'approved' : 'pending',
    featured: false,
    uploaderId: currentUser?.id,
    uploaderName: currentUser?.name || currentUser?.email || 'Giáo viên',
    mimeType: 'text/html',
    fileName: filename,
    size: file.size,
    checksum,
    aiSummary: String(payload.description || '').trim(),
    aiUses: [
      'Mở trực tiếp trong Kho học liệu, không cần tải file.',
      `Template TextLab: ${templateName}`,
    ],
    extractedText: String(payload.content || '').slice(0, 60000),
    version: 1,
    parentResourceId: null,
    createdAt: now,
    updatedAt: now,
    approvedAt: leader ? now : null,
    approvedBy: leader ? (currentUser?.email || currentUser?.name || '') : null,
    storageMode: 'cloud',
    textlabTemplateId: templateId,
    textlabTemplateName: templateName,
    itemCount: Number(payload.itemCount || 0),
  };

  const uploaded = await uploadHtmlFile(file, base);
  Object.assign(base, {
    driveFileId: uploaded.fileId || '',
    driveWebViewLink: uploaded.webViewLink || '',
    driveDownloadLink: uploaded.downloadLink || '',
  });
  if (!base.driveFileId) throw new Error('Google Drive không trả về mã file của hoạt động.');

  let cloud = await upsertResourceCloud(base);
  if (!cloud.ok) cloud = await syncResourceViaServer(base);
  if (!cloud.ok) throw new Error(cloud.reason || 'Không thể đồng bộ hoạt động với Kho học liệu dùng chung.');

  const savedItem = {
    ...base,
    ...cloud.item,
    status: base.status,
    tags,
    source: base.source,
    allowDownload: base.allowDownload,
  };

  updateResourceLibrary((store) => {
    const existing = store.items.findIndex((item) => item.id === savedItem.id || item.cloudId === savedItem.cloudId);
    if (existing >= 0) store.items[existing] = savedItem;
    else store.items.unshift(savedItem);
    store.activity.unshift({
      id: resourceId('log'),
      type: leader ? 'textlab-published' : 'textlab-submitted',
      resourceId: savedItem.cloudId || savedItem.id,
      actor: currentUser?.email || currentUser?.name,
      at: now,
    });
  });

  return {
    ok: true,
    item: savedItem,
    status: savedItem.status,
    message: leader
      ? `Đã thêm “${title}” vào Kho học liệu và chia sẻ ngay cho giáo viên.`
      : `Đã gửi “${title}” vào Kho học liệu để TTCM/Admin duyệt trước khi chia sẻ.`,
  };
}
