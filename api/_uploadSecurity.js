const MB = 1024 * 1024;
const RULES = {
  image: { maxBytes: 12 * MB, extensions: ['jpg', 'jpeg', 'png', 'webp', 'gif'], mimePrefixes: ['image/'] },
  document: { maxBytes: 30 * MB, extensions: ['pdf', 'docx', 'pptx', 'xlsx', 'xls', 'txt', 'md', 'csv', 'json', 'html'], mimePrefixes: ['application/pdf', 'application/vnd.', 'text/'] },
  audio: { maxBytes: 80 * MB, extensions: ['mp3', 'wav', 'm4a', 'ogg', 'aac'], mimePrefixes: ['audio/'] },
  video: { maxBytes: 300 * MB, extensions: ['mp4', 'webm', 'mov', 'm4v'], mimePrefixes: ['video/'] },
};
const EXECUTABLES = new Set(['exe', 'msi', 'dmg', 'pkg', 'app', 'bat', 'cmd', 'com', 'scr', 'js', 'mjs', 'cjs', 'jar', 'sh', 'ps1', 'php', 'asp', 'aspx', 'cgi', 'dll', 'so']);

export function extensionOf(name = '') {
  const clean = String(name || '').trim().toLowerCase();
  const index = clean.lastIndexOf('.');
  return index >= 0 ? clean.slice(index + 1) : '';
}

function classify(name, type) {
  const ext = extensionOf(name);
  const mime = String(type || '').toLowerCase();
  return Object.entries(RULES).find(([, rule]) => rule.extensions.includes(ext) || rule.mimePrefixes.some((prefix) => mime.startsWith(prefix)))?.[0] || 'unknown';
}

export function safeServerFileName(name = 'file') {
  const ext = extensionOf(name);
  const stem = String(name || 'file').replace(/\.[^.]+$/, '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9._-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 90) || 'file';
  return `${stem}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}${ext ? `.${ext}` : ''}`;
}

export function validateUploadMetadata({ name, type, size, allowedKinds = Object.keys(RULES) } = {}) {
  const ext = extensionOf(name);
  if (!ext || EXECUTABLES.has(ext)) throw new Error('This file type is not allowed.');
  const kind = classify(name, type);
  if (kind === 'unknown' || !allowedKinds.includes(kind)) throw new Error('Unsupported file type.');
  const rule = RULES[kind];
  const bytes = Number(size || 0);
  if (!Number.isFinite(bytes) || bytes <= 0) throw new Error('The uploaded file is empty.');
  if (bytes > rule.maxBytes) throw new Error(`File exceeds the ${Math.round(rule.maxBytes / MB)} MB limit.`);
  const mime = String(type || '').toLowerCase();
  if (mime && !rule.mimePrefixes.some((prefix) => mime.startsWith(prefix))) throw new Error('File extension and MIME type do not match.');
  return { ok: true, kind, extension: ext, safeName: safeServerFileName(name), maxBytes: rule.maxBytes, serverValidated: true };
}

export function validateMagicBytes(buffer, extension) {
  if (!Buffer.isBuffer(buffer) || buffer.length < 4) return true;
  const hex = buffer.subarray(0, 12).toString('hex');
  if (extension === 'pdf' && !buffer.subarray(0, 5).toString().startsWith('%PDF-')) throw new Error('Invalid PDF signature.');
  if (extension === 'png' && !hex.startsWith('89504e470d0a1a0a')) throw new Error('Invalid PNG signature.');
  if (['jpg', 'jpeg'].includes(extension) && !hex.startsWith('ffd8ff')) throw new Error('Invalid JPEG signature.');
  if (extension === 'gif' && !buffer.subarray(0, 6).toString().startsWith('GIF8')) throw new Error('Invalid GIF signature.');
  if (['docx', 'pptx', 'xlsx'].includes(extension) && !hex.startsWith('504b0304')) throw new Error('Invalid Office document signature.');
  return true;
}
