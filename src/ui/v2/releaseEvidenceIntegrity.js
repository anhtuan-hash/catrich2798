function normalizeForCanonicalJson(value) {
  if (Array.isArray(value)) return value.map((item) => normalizeForCanonicalJson(item));
  if (value && typeof value === 'object') {
    return Object.keys(value).sort().reduce((acc, key) => {
      if (value[key] !== undefined) acc[key] = normalizeForCanonicalJson(value[key]);
      return acc;
    }, {});
  }
  if (typeof value === 'number' && !Number.isFinite(value)) return null;
  return value;
}

export function canonicalReleaseEvidenceJson(pack = {}) {
  const payload = { ...pack };
  delete payload.integrity;
  return JSON.stringify(normalizeForCanonicalJson(payload));
}

async function sha256Hex(text) {
  if (typeof crypto === 'undefined' || !crypto.subtle) throw new Error('Web Crypto SHA-256 unavailable');
  const bytes = new TextEncoder().encode(text);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest)).map((value) => value.toString(16).padStart(2, '0')).join('');
}

export async function attachReleaseEvidenceIntegrity(pack = {}) {
  const digest = await sha256Hex(canonicalReleaseEvidenceJson(pack));
  return {
    ...pack,
    integrity: {
      algorithm: 'SHA-256',
      digest,
      candidate: pack.candidate || '',
      buildSha: pack.build?.sha || '',
      generatedAt: new Date().toISOString(),
    },
  };
}

export async function verifyReleaseEvidencePack(pack = {}, { candidate = '', buildSha = '' } = {}) {
  const integrity = pack?.integrity || {};
  const expectedDigest = String(integrity.digest || '').toLowerCase();
  if (integrity.algorithm !== 'SHA-256' || !/^[a-f0-9]{64}$/.test(expectedDigest)) {
    return { valid: false, digestMatch: false, candidateMatch: false, buildMatch: false, reason: 'missing-or-invalid-integrity' };
  }
  const actualDigest = await sha256Hex(canonicalReleaseEvidenceJson(pack));
  const digestMatch = actualDigest === expectedDigest;
  const candidateMatch = !candidate || pack.candidate === candidate;
  const buildMatch = !buildSha || pack.build?.sha === buildSha;
  return {
    valid: digestMatch && candidateMatch && buildMatch,
    digestMatch,
    candidateMatch,
    buildMatch,
    expectedDigest,
    actualDigest,
    reason: digestMatch ? (candidateMatch && buildMatch ? 'verified' : 'scope-mismatch') : 'digest-mismatch',
  };
}
