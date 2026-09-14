import crypto from 'node:crypto';
import { adminClient, getUserProfile, requireUser, send } from '../server/api/_googleDrive.js';

const GITHUB_API = 'https://api.github.com';
const DEFAULT_REPOSITORY = 'anhtuan-hash/catrich2798';
const DEFAULT_BRANCH = 'main';
const MOBILE_DOCUMENT_PATH = 'public/hero/mobile-current.json';
const MAX_MEDIA_BYTES = 25 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = new Map([
  ['image/jpeg', 'jpg'],
  ['image/png', 'png'],
  ['image/webp', 'webp'],
  ['image/gif', 'gif'],
  ['image/apng', 'apng'],
]);

function cleanText(value, fallback = '', max = 2000) {
  return String(value ?? fallback).replace(/\u0000/g, '').trim().slice(0, max);
}

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
      'User-Agent': 'Brian-English-Mobile-Hero-Publisher',
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

function allowedMediaHosts(req) {
  const hosts = new Set();
  for (const raw of [process.env.SUPABASE_URL, process.env.VITE_SUPABASE_URL]) {
    try { if (raw) hosts.add(new URL(raw).hostname.toLowerCase()); } catch { /* ignore malformed optional env */ }
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

function resolveImageUrl(req, value) {
  const raw = cleanText(value, '', 2000);
  if (!raw) throw new Error('Chưa có ảnh Hero Mobile để công bố');
  if (!/^https:\/\//i.test(raw)) throw new Error('Ảnh Hero Mobile phải được tải lên bằng trình chỉnh sửa trước khi công bố');
  const url = new URL(raw);
  if (!allowedMediaHosts(req).has(url.hostname.toLowerCase())) {
    throw new Error(`Hero media host is not allowed: ${url.hostname}`);
  }
  return url;
}

async function downloadImage(req, source) {
  const url = resolveImageUrl(req, source);
  const response = await fetch(url, {
    redirect: 'error',
    headers: { 'User-Agent': 'Brian-English-Mobile-Hero-Publisher' },
  });
  if (!response.ok) throw new Error(`Could not download Mobile Hero image (${response.status})`);

  const type = String(response.headers.get('content-type') || '').split(';')[0].trim().toLowerCase();
  const extension = ALLOWED_IMAGE_TYPES.get(type);
  if (!extension) throw new Error(`Unsupported Mobile Hero image type: ${type || 'unknown'}`);

  const declaredSize = Number(response.headers.get('content-length') || 0);
  if (declaredSize > MAX_MEDIA_BYTES) throw new Error('Mobile Hero image exceeds the 25 MB publishing limit');
  const bytes = Buffer.from(await response.arrayBuffer());
  if (bytes.length > MAX_MEDIA_BYTES) throw new Error('Mobile Hero image exceeds the 25 MB publishing limit');

  const hash = crypto.createHash('sha256').update(bytes).digest('hex').slice(0, 12);
  const fileName = `mobile-hero-${Date.now()}-${hash}.${extension}`;
  return {
    bytes,
    mimeType: type,
    fileName,
    repositoryPath: `public/hero/media/${fileName}`,
    publicPath: `/hero/media/${fileName}`,
  };
}

async function createBlob(settings, content) {
  const bytes = Buffer.isBuffer(content) ? content : Buffer.from(String(content));
  const blob = await githubFetch(settings, 'git/blobs', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ content: bytes.toString('base64'), encoding: 'base64' }),
  });
  return blob.sha;
}

async function branchState(settings) {
  const ref = await githubFetch(settings, `git/ref/heads/${encodeURIComponent(settings.branch)}`);
  const parentSha = ref?.object?.sha;
  if (!parentSha) throw new Error('Could not resolve GitHub branch head');
  const parentCommit = await githubFetch(settings, `git/commits/${parentSha}`);
  const baseTree = parentCommit?.tree?.sha;
  if (!baseTree) throw new Error('Could not resolve GitHub base tree');
  return { parentSha, baseTree };
}

async function publishCommit(settings, entries, message) {
  const { parentSha, baseTree } = await branchState(settings);
  const treeEntries = [];
  for (const entry of entries) {
    const sha = await createBlob(settings, entry.content);
    treeEntries.push({ path: entry.path, mode: '100644', type: 'blob', sha });
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
      const conflict = new Error('Nhánh GitHub vừa thay đổi. Hãy bấm công bố ảnh mobile lại một lần nữa.');
      conflict.status = 409;
      throw conflict;
    }
    throw error;
  }
  return commit.sha;
}

async function requireAdmin(req) {
  const user = await requireUser(req);
  const client = adminClient();
  const profile = await getUserProfile(client, user);
  const role = cleanText(profile?.role || user?.app_metadata?.role || user?.user_metadata?.role, '', 80).toLowerCase();
  const approved = profile?.approved !== false && profile?.is_approved !== false;
  if (!approved || !['admin', 'administrator', 'department_head', 'department-head', 'ttcm'].includes(role)) {
    const error = new Error('Only Admin/TTCM can publish the Mobile Hero image');
    error.status = 403;
    throw error;
  }
  return user;
}

export default async function handler(req, res) {
  try {
    if (req.method !== 'POST') return send(res, 405, { error: 'Method not allowed' });
    const user = await requireAdmin(req);
    const remove = req.body?.remove === true;
    const settings = githubSettings();
    const publishedAt = new Date().toISOString();
    const revision = `${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
    const entries = [];

    let mobileHero = {
      url: '',
      fileName: '',
      mimeType: '',
      fit: 'contain',
    };

    if (!remove) {
      const media = await downloadImage(req, req.body?.url);
      entries.push({ path: media.repositoryPath, content: media.bytes });
      mobileHero = {
        url: media.publicPath,
        fileName: media.fileName,
        mimeType: media.mimeType,
        fit: 'contain',
      };
    }

    const staticDocument = {
      schemaVersion: 1,
      revision,
      publishedAt,
      publishedBy: user.email || user.id,
      delivery: 'vercel-static',
      mobileHero,
    };
    entries.push({
      path: MOBILE_DOCUMENT_PATH,
      content: `${JSON.stringify(staticDocument, null, 2)}\n`,
    });

    const commitSha = await publishCommit(
      settings,
      entries,
      remove ? `Reset mobile homepage Hero ${revision}` : `Publish mobile homepage Hero ${revision}`,
    );

    return send(res, 202, {
      ok: true,
      deploymentPending: true,
      delivery: 'vercel-static',
      revision,
      publishedAt,
      commitSha,
      mobileHero,
      staticDocumentPath: '/hero/mobile-current.json',
    });
  } catch (error) {
    const status = Number(error?.status) || 400;
    return send(res, status, { error: error?.message || 'Could not publish Mobile Hero image' });
  }
}
