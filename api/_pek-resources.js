import { cleanCell, decodeEntities, normalize, parseGridRows } from './_pek-core.js';

const SOURCE_URL = 'https://cm.pek.edu.vn/vi/thoikhoabieu/?id=3';
const MAX_BYTES = 24 * 1024 * 1024;

function resolveUrl(raw, baseUrl) {
  try {
    const url = new URL(decodeEntities(raw).replace(/&amp;/g, '&'), baseUrl);
    if (!['http:', 'https:'].includes(url.protocol)) return null;
    url.hash = '';
    return url.toString();
  } catch { return null; }
}

function scoreUrl(url, context = '') {
  const text = normalize(`${url} ${context}`);
  let score = 0;
  if (/\.(xlsx?|csv|pdf)(?:$|[?#])/i.test(url)) score += 140;
  if (/docs\.google\.com\/spreadsheets|drive\.google\.com/i.test(url)) score += 120;
  if (/thoikhoabieu|thoi-khoa-bieu|timetable|schedule|(?:^|[^a-z])tkb(?:[^a-z]|$)/i.test(text)) score += 90;
  if (/download|attachment|uploads|upload|files?|export|viewfile/i.test(text)) score += 55;
  if (/ajax|api|index\.php.*(?:op|nv)=/i.test(url)) score += 35;
  if (/tai ve|tải về|tai file|tải file|xem lich|xem lịch|giao vien|giáo viên|lop hoc|lớp học/i.test(context)) score += 35;
  if (/\.(css|js|woff2?|ttf|ico)(?:$|[?#])/i.test(url)) score -= 200;
  if (/\.(png|jpe?g|gif|webp|svg)(?:$|[?#])/i.test(url) && score < 90) score -= 100;
  if (/\/vi\/(?:news|laws|videos|about)\//i.test(url) && !/thoikhoabieu/i.test(url)) score -= 80;
  return score;
}

export function discoverUrls(html, baseUrl, limit = 32) {
  const candidates = new Map();
  const add = (raw, context = '') => {
    const url = resolveUrl(raw, baseUrl);
    if (!url || url === baseUrl) return;
    try {
      const parsed = new URL(url);
      const base = new URL(baseUrl);
      if (parsed.hostname !== base.hostname && !/(^|\.)(google\.com|googleusercontent\.com)$/.test(parsed.hostname)) return;
    } catch { return; }
    const score = scoreUrl(url, context);
    if (score < 35) return;
    const previous = candidates.get(url);
    if (!previous || previous.score < score) candidates.set(url, { url, score, context: cleanCell(context).slice(0, 160) });
  };
  for (const match of html.matchAll(/<(a|iframe|form|link|script)\b([^>]*)>([\s\S]*?)<\/\1>|<(iframe|img|link|script)\b([^>]*)\/?\s*>/gi)) {
    const attrs = match[2] || match[5] || '';
    const context = cleanCell(match[3] || attrs);
    for (const attr of attrs.matchAll(/(?:href|src|action|data-src|data-url|data-href)\s*=\s*["']([^"']+)["']/gi)) add(attr[1], context);
  }
  for (const match of html.matchAll(/["']([^"']*(?:thoikhoabieu|thoi-khoa-bieu|timetable|schedule|tkb|ajax|api|index\.php|\.xlsx?|\.csv|\.pdf|docs\.google|drive\.google)[^"']*)["']/gi)) add(match[1], match[0]);
  return [...candidates.values()].sort((a, b) => b.score - a.score).slice(0, limit);
}

export function googleDownloadVariant(url) {
  const sheet = url.match(/docs\.google\.com\/spreadsheets\/d\/([^/]+)/i);
  if (sheet) return `https://docs.google.com/spreadsheets/d/${sheet[1]}/export?format=xlsx`;
  const drive = url.match(/drive\.google\.com\/file\/d\/([^/]+)/i);
  if (drive) return `https://drive.google.com/uc?export=download&id=${drive[1]}`;
  return null;
}

function filenameFrom(headers, url) {
  const disposition = headers.get('content-disposition') || '';
  const utf = disposition.match(/filename\*=UTF-8''([^;]+)/i);
  if (utf) try { return decodeURIComponent(utf[1]); } catch { return utf[1]; }
  const plain = disposition.match(/filename=["']?([^"';]+)["']?/i);
  if (plain) return plain[1].trim();
  try { return decodeURIComponent(new URL(url).pathname.split('/').filter(Boolean).at(-1) || 'resource'); } catch { return 'resource'; }
}

export async function fetchResource(url, timeoutMs = 18000) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      redirect: 'follow', signal: controller.signal,
      headers: {
        'user-agent': 'Mozilla/5.0 (compatible; BrianEnglishTimetable/2.0; +https://esl-pek.vercel.app)',
        accept: 'text/html,application/xhtml+xml,application/json,text/csv,application/pdf,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel;q=0.9,*/*;q=0.6',
        'accept-language': 'vi-VN,vi;q=0.9,en;q=0.7', referer: SOURCE_URL,
      },
    });
    const buffer = Buffer.from(await response.arrayBuffer());
    if (buffer.length > MAX_BYTES) throw new Error(`Tệp vượt quá ${Math.round(MAX_BYTES / 1024 / 1024)} MB`);
    return {
      ok: response.ok, status: response.status, url: response.url || url, requestedUrl: url,
      contentType: response.headers.get('content-type') || '', filename: filenameFrom(response.headers, response.url || url), buffer,
    };
  } finally { clearTimeout(timeout); }
}

export function isTextResource(resource) {
  return /(?:text|html|json|javascript|xml|csv)/i.test(resource.contentType) || /\.(?:html?|json|csv|txt|js|xml)(?:$|[?#])/i.test(resource.url);
}
export function resourceText(resource) { return resource.buffer.toString('utf8'); }

function xmlText(value = '') { return decodeEntities(String(value).replace(/<rPh[^>]*>[\s\S]*?<\/rPh>/gi, '').replace(/<[^>]+>/g, '')); }
function columnIndex(reference = '') {
  const letters = String(reference).match(/[A-Z]+/i)?.[0]?.toUpperCase() || 'A';
  let index = 0;
  for (const char of letters) index = index * 26 + char.charCodeAt(0) - 64;
  return index - 1;
}

export async function parseXlsx(buffer, label = '') {
  const { default: JSZip } = await import('jszip');
  const zip = await JSZip.loadAsync(buffer);
  const sharedXml = await zip.file('xl/sharedStrings.xml')?.async('string');
  const shared = sharedXml ? [...sharedXml.matchAll(/<si\b[^>]*>([\s\S]*?)<\/si>/gi)].map((match) => xmlText(match[1])) : [];
  const workbook = await zip.file('xl/workbook.xml')?.async('string');
  const relsXml = await zip.file('xl/_rels/workbook.xml.rels')?.async('string');
  if (!workbook || !relsXml) return { entries: [], sheets: [] };
  const rels = new Map([...relsXml.matchAll(/<Relationship\b[^>]*Id=["']([^"']+)["'][^>]*Target=["']([^"']+)["'][^>]*\/?\s*>/gi)].map((match) => [match[1], match[2]]));
  const sheets = [...workbook.matchAll(/<sheet\b[^>]*name=["']([^"']+)["'][^>]*(?:r:id|id)=["']([^"']+)["'][^>]*\/?\s*>/gi)].map((match) => ({ name: decodeEntities(match[1]), target: rels.get(match[2]) }));
  const entries = [];
  const diagnostics = [];
  for (const sheet of sheets) {
    if (!sheet.target) continue;
    const path = sheet.target.startsWith('/') ? sheet.target.slice(1) : `xl/${sheet.target.replace(/^\.\//, '')}`.replace(/xl\/xl\//, 'xl/');
    const xml = await zip.file(path)?.async('string');
    if (!xml) continue;
    const rows = [];
    for (const rowMatch of xml.matchAll(/<row\b[^>]*>([\s\S]*?)<\/row>/gi)) {
      const row = [];
      for (const cell of rowMatch[1].matchAll(/<c\b([^>]*)>([\s\S]*?)<\/c>/gi)) {
        const attrs = cell[1] || '';
        const body = cell[2] || '';
        const ref = attrs.match(/\br=["']([^"']+)["']/i)?.[1] || `A${rows.length + 1}`;
        const type = attrs.match(/\bt=["']([^"']+)["']/i)?.[1] || '';
        let value = '';
        if (type === 'inlineStr') value = xmlText(body.match(/<is\b[^>]*>([\s\S]*?)<\/is>/i)?.[1] || body);
        else {
          const raw = body.match(/<v\b[^>]*>([\s\S]*?)<\/v>/i)?.[1] ?? '';
          value = type === 's' ? shared[Number(raw)] || '' : decodeEntities(raw);
        }
        row[columnIndex(ref)] = String(value).trim();
      }
      if (row.some((value) => String(value || '').trim())) rows.push(row.map((value) => value || ''));
    }
    const parsed = parseGridRows(rows, `${label} · ${sheet.name}`);
    entries.push(...parsed);
    diagnostics.push({ name: sheet.name, rows: rows.length, columns: Math.max(0, ...rows.map((row) => row.length)), parsed: parsed.length });
  }
  return { entries, sheets: diagnostics };
}
