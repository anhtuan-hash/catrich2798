import crypto from 'node:crypto';
import { adminClient, isManagerUser, requireUser, send } from '../server/api/_googleDrive.js';

const GITHUB_API = 'https://api.github.com';
const DEFAULT_REPOSITORY = 'anhtuan-hash/catrich2798';
const DEFAULT_BRANCH = 'main';
const MAX_CONFIG_BYTES = 256 * 1024;
const MAX_MEDIA_BYTES = 25 * 1024 * 1024;
const ALLOWED_MEDIA_TYPES = new Map([
  ['image/jpeg', 'jpg'],
  ['image/png', 'png'],
  ['image/webp', 'webp'],
  ['image/gif', 'gif'],
  ['image/apng', 'apng'],
  ['video/mp4', 'mp4'],
  ['video/webm', 'webm'],
]);

function githubSettings() {
  const token = process.env.GITHUB_HERO_TOKEN || process.env.GITHUB_TOKEN || '';
  const repository = process.env.GITHUB_HERO_REPOSITORY || DEFAULT_REPOSITORY;
  const branch = process.env.GITHUB_HERO_BRANCH || DEFAULT_BRANCH;
  if (!token) throw new Error('Missing GITHUB_HERO_TOKEN in Vercel Environment Variables');
  if (!/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(repository)) throw new Error('Invalid GITHUB_HERO_REPOSITORY');
  if (!/^[A-Za-z0-9._/-]+$/.test(branch)) throw new Error('Invalid GITHUB_HERO_BRANCH');
  return { token, repository, branch };
}

async function githubFetch(settings, path, options = {}) {
  const response = await fetch(`${GITHUB_API}/repos/${settings.repository}/${path}`, {
    ...options,
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${settings.token}`,
      'X-GitHub-Api-Version': '2022-11-28',
      'User-Agent': 'Brian-English-Hero-Publisher',
      ...(options.headers || {}),
    },
  });
  const text = await response.text();
  let data = {};
  try { data = text ? JSON.parse(text) : {}; } catch { data = { message: text }; }
  if (!response.ok) {
    const error = new Error(data?.message || `GitHub API failed with ${response.status}`);
    error.status = response.status;
    error.details = data;
    throw error;
  }
  return data;
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function cleanText(value, fallback = '', max = 2000) {
  return String(value ?? fallback).replace(/\u0000/g, '').trim().slice(0, max);
}

function safeNumber(value, fallback, min, max) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(min, Math.min(max, parsed));
}

function safeBoolean(value, fallback = false) {
  return typeof value === 'boolean' ? value : fallback;
}

function safeColor(value, fallback) {
  const clean = cleanText(value, fallback, 64);
  return /^(#[0-9a-f]{3,8}|rgba?\([^)]+\)|hsla?\([^)]+\)|[a-z]+)$/i.test(clean) ? clean : fallback;
}

function safeTarget(value, fallback = '#/apps') {
  const clean = cleanText(value, fallback, 500);
  if (/^#\/[a-z0-9_?=&/.-]*$/i.test(clean)) return clean;
  if (/^https:\/\//i.test(clean)) return clean;
  return fallback;
}

function sanitizeConfig(input) {
  const source = input && typeof input === 'object' ? clone(input) : {};
  const buttons = Array.isArray(source.buttons) ? source.buttons.slice(0, 2) : [];
  const infoItems = Array.isArray(source.infoItems) ? source.infoItems.slice(0, 4) : [];
  const backgroundType = ['none', 'image', 'gif', 'video'].includes(source.background?.type)
    ? source.background.type
    : 'none';

  return {
    version: 1,
    badge: {
      enabled: safeBoolean(source.badge?.enabled, true),
      textVi: cleanText(source.badge?.textVi, 'ENGLISH HUB', 80),
      textEn: cleanText(source.badge?.textEn, 'ENGLISH HUB', 80),
      logoUrl: cleanText(source.badge?.logoUrl, '', 1000),
      color: safeColor(source.badge?.color, '#0b57d0'),
      background: safeColor(source.badge?.background, 'rgba(255,255,255,0.86)'),
    },
    content: {
      headlineVi: cleanText(source.content?.headlineVi, 'Không gian\ndạy học\nthông minh', 240),
      headlineEn: cleanText(source.content?.headlineEn, 'A smart\nteaching\nworkspace', 240),
      highlightVi: cleanText(source.content?.highlightVi, '& sáng tạo', 120),
      highlightEn: cleanText(source.content?.highlightEn, '& creative learning', 120),
      descriptionVi: cleanText(source.content?.descriptionVi, '', 600),
      descriptionEn: cleanText(source.content?.descriptionEn, '', 600),
      headlineColor: safeColor(source.content?.headlineColor, '#102b55'),
      highlightColor: safeColor(source.content?.highlightColor, '#185ee8'),
      descriptionColor: safeColor(source.content?.descriptionColor, '#566b88'),
    },
    buttons: buttons.map((button, index) => ({
      id: cleanText(button?.id, index === 0 ? 'primary' : 'secondary', 60),
      enabled: safeBoolean(button?.enabled, true),
      labelVi: cleanText(button?.labelVi, index === 0 ? 'Bắt đầu ngay' : 'Xem hướng dẫn', 80),
      labelEn: cleanText(button?.labelEn, index === 0 ? 'Get started' : 'View guide', 80),
      target: safeTarget(button?.target, '#/apps'),
      newTab: safeBoolean(button?.newTab, false),
      style: ['primary', 'secondary', 'ghost'].includes(button?.style) ? button.style : (index === 0 ? 'primary' : 'secondary'),
      color: safeColor(button?.color, index === 0 ? '#1a73e8' : '#0b57d0'),
      icon: ['rocket', 'play', 'arrow', 'sparkles', 'none'].includes(button?.icon) ? button.icon : (index === 0 ? 'rocket' : 'play'),
    })),
    infoItems: infoItems.map((item, index) => ({
      id: cleanText(item?.id, `info-${index + 1}`, 60),
      enabled: safeBoolean(item?.enabled, true),
      icon: ['shield', 'cloud', 'users', 'book', 'star', 'clock', 'none'].includes(item?.icon) ? item.icon : 'star',
      titleVi: cleanText(item?.titleVi, '', 80),
      titleEn: cleanText(item?.titleEn, '', 80),
      textVi: cleanText(item?.textVi, '', 120),
      textEn: cleanText(item?.textEn, '', 120),
      color: safeColor(item?.color, '#1a73e8'),
    })),
    background: {
      type: backgroundType,
      url: cleanText(source.background?.url, '', 2000),
      posterUrl: cleanText(source.background?.posterUrl, '', 2000),
      fileName: cleanText(source.background?.fileName, '', 240),
      mimeType: cleanText(source.background?.mimeType, '', 120),
      fit: ['cover', 'contain', 'fill'].includes(source.background?.fit) ? source.background.fit : 'cover',
      positionX: safeNumber(source.background?.positionX, 70, 0, 100),
      positionY: safeNumber(source.background?.positionY, 50, 0, 100),
      scale: safeNumber(source.background?.scale, 100, 50, 200),
      opacity: safeNumber(source.background?.opacity, 100, 0, 100),
      brightness: safeNumber(source.background?.brightness, 100, 20, 180),
      blur: safeNumber(source.background?.blur, 0, 0, 30),
      autoplay: safeBoolean(source.background?.autoplay, true),
      loop: safeBoolean(source.background?.loop, true),
      muted: true,
    },
    overlay: {
      enabled: safeBoolean(source.overlay?.enabled, true),
      color: safeColor(source.overlay?.color, '#ffffff'),
      opacity: safeNumber(source.overlay?.opacity, 10, 0, 100),
      leftProtection: safeNumber(source.overlay?.leftProtection, 92, 0, 100),
      leftProtectionWidth: safeNumber(source.overlay?.leftProtectionWidth, 56, 20, 90),
    },
    layout: {
      minHeight: safeNumber(source.layout?.minHeight, 590, 420, 850),
      contentWidth: safeNumber(source.layout?.contentWidth, 42, 28, 70),
      contentAlign: ['left', 'center', 'right'].includes(source.layout?.contentAlign) ? source.layout.contentAlign : 'left',
      verticalAlign: ['start', 'center', 'end'].includes(source.layout?.verticalAlign) ? source.layout.verticalAlign : 'center',
      borderRadius: safeNumber(source.layout?.borderRadius, 32, 0, 60),
    },
    animation: {
      enabled: safeBoolean(source.animation?.enabled, true),
      contentReveal: safeBoolean(source.animation?.contentReveal, true),
      mediaMotion: safeBoolean(source.animation?.mediaMotion, false),
      buttonPulse: safeBoolean(source.animation?.buttonPulse, true),
    },
  };
}

function allowedMediaHosts(req) {
  const hosts = new Set();
  for (const raw of [process.env.SUPABASE_URL, process.env.VITE_SUPABASE_URL]) {
    try { if (raw) hosts.add(new URL(raw).hostname.toLowerCase()); } catch { /* ignore */ }
  }
  String(process.env.HERO_MEDIA_ALLOWED_HOSTS || '')
    .split(',')
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean)
    .forEach((value) => hosts.add(value));
  const requestHost = String(req.headers['x-forwarded-host'] || req.headers.host || '').split(':')[0].toLowerCase();
  if (requestHost) hosts.add(requestHost);
  return hosts;
}

function resolveMediaUrl(req, value) {
  const raw = cleanText(value, '', 2000);
  if (!raw) return null;
  if (raw.startsWith('/hero/media/')) return { kind: 'static', path: raw };
  if (!/^https:\/\//i.test(raw)) throw new Error('Hero media must be uploaded through the editor before publishing');
  const url = new URL(raw);
  if (!allowedMediaHosts(req).has(url.hostname.toLowerCase())) {
    throw new Error(`Hero media host is not allowed: ${url.hostname}`);
  }
  return { kind: 'remote', url };
}

async function downloadMedia(req, source, label) {
  const resolved = resolveMediaUrl(req, source);
  if (!resolved || resolved.kind === 'static') return resolved;
  const response = await fetch(resolved.url, {
    redirect: 'error',
    headers: { 'User-Agent': 'Brian-English-Hero-Publisher' },
  });
  if (!response.ok) throw new Error(`Could not download ${label} (${response.status})`);
  const type = String(response.headers.get('content-type') || '').split(';')[0].trim().toLowerCase();
  const extension = ALLOWED_MEDIA_TYPES.get(type);
  if (!extension) throw new Error(`Unsupported ${label} type: ${type || 'unknown'}`);
  const declaredSize = Number(response.headers.get('content-length') || 0);
  if (declaredSize > MAX_MEDIA_BYTES) throw new Error(`${label} exceeds the 25 MB static publishing limit`);
  const bytes = Buffer.from(await response.arrayBuffer());
  if (bytes.length > MAX_MEDIA_BYTES) throw new Error(`${label} exceeds the 25 MB static publishing limit`);
  const hash = crypto.createHash('sha256').update(bytes).digest('hex').slice(0, 12);
  const fileName = `hero-${Date.now()}-${hash}.${extension}`;
  return {
    kind: 'downloaded',
    bytes,
    mimeType: type,
    fileName,
    repositoryPath: `public/hero/media/${fileName}`,
    publicPath: `/hero/media/${fileName}`,
  };
}

async function createBlob(settings, bytes) {
  const content = Buffer.isBuffer(bytes) ? bytes.toString('base64') : Buffer.from(String(bytes)).toString('base64');
  const blob = await githubFetch(settings, 'git/blobs', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ content, encoding: 'base64' }),
  });
  return blob.sha;
}

async function publishCommit(settings, entries, message) {
  const ref = await githubFetch(settings, `git/ref/heads/${encodeURIComponent(settings.branch)}`);
  const parentSha = ref?.object?.sha;
  if (!parentSha) throw new Error('Could not resolve GitHub branch head');
  const parentCommit = await githubFetch(settings, `git/commits/${parentSha}`);
  const baseTree = parentCommit?.tree?.sha;
  if (!baseTree) throw new Error('Could not resolve GitHub base tree');

  const treeEntries = [];
  for (const entry of entries) {
    const blobSha = await createBlob(settings, entry.content);
    treeEntries.push({ path: entry.path, mode: '100644', type: 'blob', sha: blobSha });
  }

  const tree = await githubFetch(settings, 'git/trees', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ base_tree: baseTree, tree: treeEntries }),
  });
  const commit = await githubFetch(settings, 'git/commits', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message, tree: tree.sha, parents: [parentSha] }),
  });
  try {
    await githubFetch(settings, `git/refs/heads/${encodeURIComponent(settings.branch)}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sha: commit.sha, force: false }),
    });
  } catch (error) {
    if (error.status === 409 || error.status === 422) {
      const conflict = new Error('The GitHub branch changed while publishing. Please publish again.');
      conflict.status = 409;
      throw conflict;
    }
    throw error;
  }
  return commit.sha;
}

export default async function handler(req, res) {
  try {
    if (req.method !== 'POST') return send(res, 405, { error: 'Method not allowed' });
    const user = await requireUser(req);
    const client = adminClient();
    if (!(await isManagerUser(client, user))) return send(res, 403, { error: 'Only TTCM/Admin can publish the homepage Hero' });

    const rawConfig = req.body?.config || req.body;
    const configBytes = Buffer.byteLength(JSON.stringify(rawConfig || {}));
    if (configBytes > MAX_CONFIG_BYTES) return send(res, 413, { error: 'Hero configuration is too large' });

    const settings = githubSettings();
    const config = sanitizeConfig(rawConfig);
    const entries = [];

    if (config.background.type !== 'none' && config.background.url) {
      const media = await downloadMedia(req, config.background.url, 'Hero media');
      if (media?.kind === 'downloaded') {
        entries.push({ path: media.repositoryPath, content: media.bytes });
        config.background.url = media.publicPath;
        config.background.fileName = media.fileName;
        config.background.mimeType = media.mimeType;
      } else if (media?.kind === 'static') {
        config.background.url = media.path;
      }
    } else {
      config.background.type = 'none';
      config.background.url = '';
      config.background.posterUrl = '';
      config.background.fileName = '';
      config.background.mimeType = '';
    }

    if (config.background.type === 'video' && config.background.posterUrl) {
      const poster = await downloadMedia(req, config.background.posterUrl, 'Hero poster');
      if (poster?.kind === 'downloaded') {
        entries.push({ path: poster.repositoryPath, content: poster.bytes });
        config.background.posterUrl = poster.publicPath;
      } else if (poster?.kind === 'static') {
        config.background.posterUrl = poster.path;
      }
    }

    const publishedAt = new Date().toISOString();
    const revision = `${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
    const staticDocument = {
      schemaVersion: 1,
      revision,
      publishedAt,
      publishedBy: user.email || user.id,
      delivery: 'vercel-static',
      config,
    };
    entries.push({
      path: 'public/hero/hero-current.json',
      content: `${JSON.stringify(staticDocument, null, 2)}\n`,
    });

    const commitSha = await publishCommit(
      settings,
      entries,
      `Publish homepage Hero ${revision}`,
    );

    return send(res, 202, {
      ok: true,
      deploymentPending: true,
      delivery: 'vercel-static',
      revision,
      publishedAt,
      commitSha,
      config,
      staticDocumentPath: '/hero/hero-current.json',
    });
  } catch (error) {
    const status = Number(error?.status) || 400;
    return send(res, status, { error: error?.message || 'Could not publish homepage Hero' });
  }
}
