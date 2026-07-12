const MB = 1024 * 1024;

export const UPLOAD_RULES = {
  image: { maxBytes: 12 * MB, extensions: ['jpg', 'jpeg', 'png', 'webp', 'gif'], mimePrefixes: ['image/'] },
  document: { maxBytes: 30 * MB, extensions: ['pdf', 'docx', 'pptx', 'xlsx', 'xls', 'txt', 'md', 'csv', 'json', 'html'], mimePrefixes: ['application/pdf', 'application/vnd.', 'text/'] },
  audio: { maxBytes: 80 * MB, extensions: ['mp3', 'wav', 'm4a', 'ogg', 'aac'], mimePrefixes: ['audio/'] },
  video: { maxBytes: 300 * MB, extensions: ['mp4', 'webm', 'mov', 'm4v'], mimePrefixes: ['video/'] },
};

const EXECUTABLE_EXTENSIONS = new Set(['exe', 'msi', 'dmg', 'pkg', 'app', 'bat', 'cmd', 'com', 'scr', 'js', 'mjs', 'cjs', 'jar', 'sh', 'ps1', 'php', 'asp', 'aspx', 'cgi', 'dll', 'so']);

export function fileExtension(name = '') {
  const clean = String(name || '').trim().toLowerCase();
  const index = clean.lastIndexOf('.');
  return index >= 0 ? clean.slice(index + 1) : '';
}

export function sanitizeUploadName(name = 'file') {
  const ext = fileExtension(name);
  const stem = String(name || 'file').replace(/\.[^.]+$/, '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9._-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 90) || 'file';
  return `${stem}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}${ext ? `.${ext}` : ''}`;
}

export function classifyUpload(file) {
  const ext = fileExtension(file?.name);
  const mime = String(file?.type || '').toLowerCase();
  return Object.entries(UPLOAD_RULES).find(([, rule]) => rule.extensions.includes(ext) || rule.mimePrefixes.some((prefix) => mime.startsWith(prefix)))?.[0] || 'unknown';
}

export function validateUploadFile(file, { allowedKinds = Object.keys(UPLOAD_RULES) } = {}) {
  if (!file) return { ok: false, error: 'No file selected.' };
  const ext = fileExtension(file.name);
  if (!ext || EXECUTABLE_EXTENSIONS.has(ext)) return { ok: false, error: 'This file type is not allowed.' };
  const kind = classifyUpload(file);
  if (kind === 'unknown' || !allowedKinds.includes(kind)) return { ok: false, error: 'Unsupported file type.' };
  const rule = UPLOAD_RULES[kind];
  if (Number(file.size || 0) <= 0) return { ok: false, error: 'The selected file is empty.' };
  if (Number(file.size || 0) > rule.maxBytes) return { ok: false, error: `File exceeds the ${Math.round(rule.maxBytes / MB)} MB limit for ${kind} files.` };
  const mime = String(file.type || '').toLowerCase();
  if (mime && !rule.mimePrefixes.some((prefix) => mime.startsWith(prefix))) return { ok: false, error: 'File extension and MIME type do not match the allowed policy.' };
  return { ok: true, kind, extension: ext, safeName: sanitizeUploadName(file.name), maxBytes: rule.maxBytes };
}

export async function validateUploadWithServer(file, options = {}) {
  const local = validateUploadFile(file, options);
  if (!local.ok) return local;
  try {
    const response = await fetch('/api/upload-validate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: file.name, type: file.type, size: file.size, allowedKinds: options.allowedKinds || Object.keys(UPLOAD_RULES) }),
    });
    const payload = await response.json().catch(() => ({}));
    return response.ok && payload.ok ? { ...local, ...payload } : { ok: false, error: payload.error || `Upload validation failed (${response.status}).` };
  } catch {
    return { ...local, serverValidated: false, warning: 'Server validation unavailable; local checks passed.' };
  }
}
