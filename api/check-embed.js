import dns from 'node:dns/promises';
import net from 'node:net';

function isPrivateIp(address = '') {
  if (!net.isIP(address)) return false;
  if (address.includes(':')) {
    const value = address.toLowerCase();
    return value === '::1' || value.startsWith('fc') || value.startsWith('fd') || value.startsWith('fe80:');
  }
  const parts = address.split('.').map(Number);
  return parts[0] === 10
    || parts[0] === 127
    || parts[0] === 0
    || parts[0] === 169 && parts[1] === 254
    || parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31
    || parts[0] === 192 && parts[1] === 168
    || parts[0] >= 224;
}

async function validatePublicUrl(raw) {
  const url = new URL(String(raw || ''));
  if (url.protocol !== 'https:') throw new Error('Chỉ hỗ trợ HTTPS.');
  if (!url.hostname || /^(localhost|local|internal)$/i.test(url.hostname)) throw new Error('Tên miền không hợp lệ.');
  if (net.isIP(url.hostname) && isPrivateIp(url.hostname)) throw new Error('Không cho phép địa chỉ mạng nội bộ.');
  const records = await dns.lookup(url.hostname, { all: true, verbatim: true });
  if (!records.length || records.some((record) => isPrivateIp(record.address))) throw new Error('Tên miền trỏ đến mạng nội bộ.');
  url.username = '';
  url.password = '';
  return url;
}

function framePolicy(headers) {
  const xfo = String(headers.get('x-frame-options') || '').trim();
  const csp = String(headers.get('content-security-policy') || '');
  const frameAncestors = csp.match(/(?:^|;)\s*frame-ancestors\s+([^;]+)/i)?.[1]?.trim() || '';
  if (/deny/i.test(xfo)) return { embeddable: false, reason: 'X-Frame-Options: DENY' };
  if (/sameorigin/i.test(xfo)) return { embeddable: false, reason: 'X-Frame-Options: SAMEORIGIN' };
  if (frameAncestors) {
    if (/\b'none'\b/i.test(frameAncestors)) return { embeddable: false, reason: "CSP frame-ancestors 'none'" };
    const allowsBrian = /https:\/\/\*|\*|esl-pek\.vercel\.app|vercel\.app/i.test(frameAncestors);
    if (!allowsBrian) return { embeddable: false, reason: `CSP frame-ancestors ${frameAncestors}` };
  }
  return { embeddable: true, reason: '' };
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 's-maxage=900, stale-while-revalidate=3600');
  if (req.method !== 'GET') return res.status(405).json({ embeddable: false, reason: 'Method not allowed' });
  try {
    const url = await validatePublicUrl(req.query?.url);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 9000);
    let response;
    try {
      response = await fetch(url, {
        method: 'HEAD',
        redirect: 'follow',
        signal: controller.signal,
        headers: { 'user-agent': 'Mozilla/5.0 (compatible; BrianEmbedCheck/1.0)', accept: 'text/html,*/*;q=0.5' },
      });
      if (response.status === 405 || response.status === 403) {
        response = await fetch(url, {
          method: 'GET', redirect: 'follow', signal: controller.signal,
          headers: { 'user-agent': 'Mozilla/5.0 (compatible; BrianEmbedCheck/1.0)', accept: 'text/html,*/*;q=0.5', range: 'bytes=0-2048' },
        });
      }
    } finally { clearTimeout(timeout); }
    const policy = framePolicy(response.headers);
    return res.status(200).json({ ...policy, status: response.status, finalUrl: response.url || url.toString() });
  } catch (error) {
    return res.status(200).json({ embeddable: null, reason: error?.name === 'AbortError' ? 'Website phản hồi quá chậm.' : String(error?.message || error) });
  }
}
