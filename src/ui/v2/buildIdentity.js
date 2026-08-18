const CACHE_KEY = 'brian-v2-build-identity-v1';

function normalize(raw = {}) {
  const sha = String(raw.sha || '').trim().slice(0, 64);
  const environment = String(raw.environment || '').trim().toLowerCase();
  const policy = raw.releasePolicy && typeof raw.releasePolicy === 'object' ? raw.releasePolicy : {};
  return {
    provider: String(raw.provider || '').trim() || 'unknown',
    sha,
    shortSha: String(raw.shortSha || sha.slice(0, 10)).trim().slice(0, 12),
    ref: String(raw.ref || '').trim().slice(0, 160),
    environment,
    url: String(raw.url || '').trim().slice(0, 300),
    releasePolicy: {
      mode: ['off', 'shadow', 'opt-in', 'on'].includes(String(policy.mode || '').toLowerCase()) ? String(policy.mode).toLowerCase() : 'shadow',
      releaseApproved: Boolean(policy.releaseApproved),
      approvedCandidate: String(policy.approvedCandidate || '').trim().slice(0, 120),
      approvedBuildSha: String(policy.approvedBuildSha || '').trim().slice(0, 64),
    },
    resolvedAt: String(raw.resolvedAt || '').trim(),
    error: String(raw.error || '').trim().slice(0, 300),
  };
}

function persist(identity) {
  if (typeof window === 'undefined') return identity;
  try { window.localStorage.setItem(CACHE_KEY, JSON.stringify(identity)); } catch { /* optional diagnostics cache */ }
  return identity;
}

export function readCachedBuildIdentity() {
  if (typeof window === 'undefined') return normalize();
  try {
    const raw = JSON.parse(window.localStorage.getItem(CACHE_KEY) || 'null');
    return normalize(raw || {});
  } catch {
    return normalize();
  }
}

export async function fetchBuildIdentity({ signal } = {}) {
  try {
    const response = await fetch('/api/v2-build-meta', { cache: 'no-store', signal, headers: { Accept: 'application/json' } });
    if (!response.ok) throw new Error(`Build metadata HTTP ${response.status}`);
    const raw = await response.json();
    return persist(normalize({ ...raw, resolvedAt: new Date().toISOString(), error: '' }));
  } catch (error) {
    if (error?.name === 'AbortError') throw error;
    const current = readCachedBuildIdentity();
    const next = normalize({ ...current, error: error?.message || 'Build identity unavailable', resolvedAt: new Date().toISOString() });
    return persist(next);
  }
}

export function isDeployBoundBuild(identity = readCachedBuildIdentity()) {
  return Boolean(identity?.sha && ['preview', 'production'].includes(String(identity?.environment || '').toLowerCase()));
}
