import {
  PRIORITY_TEACHERS, normalize, unique, parseHtmlTables, parseMarkdownTables,
  parseJsonPayload, parseEmbeddedJson, parseCsv,
} from './_pek-core.js';
import {
  discoverUrls, googleDownloadVariant, fetchResource, isTextResource, resourceText, parseXlsx,
} from './_pek-resources.js';

const SOURCE_URL = 'https://cm.pek.edu.vn/vi/thoikhoabieu/?id=3';
const CACHE_TTL = 30 * 60 * 1000;
const MAX_RESOURCES = 32;

async function readerMirror(url) { return fetchResource(`https://r.jina.ai/${url}`, 26000); }

async function parseResource(resource, label = '') {
  const type = normalize(resource.contentType);
  const filename = normalize(resource.filename || resource.url);
  const xlsx = type.includes('spreadsheetml') || /\.xlsx(?:$|[?#])/.test(filename);
  const xls = type.includes('ms-excel') || /\.xls(?:$|[?#])/.test(filename);
  const pdf = type.includes('pdf') || /\.pdf(?:$|[?#])/.test(filename);
  if (xlsx) {
    const parsed = await parseXlsx(resource.buffer, label);
    return { entries: parsed.entries, tables: parsed.sheets, kind: 'xlsx' };
  }
  if (xls || pdf) {
    try {
      const mirror = await readerMirror(resource.url);
      const text = resourceText(mirror);
      const html = parseHtmlTables(text, label);
      const markdown = parseMarkdownTables(text, label);
      return { entries: [...html.entries, ...markdown.entries], tables: [...html.tables, ...markdown.tables], kind: pdf ? 'pdf-reader' : 'xls-reader' };
    } catch (error) {
      return { entries: [], tables: [], kind: pdf ? 'pdf-unparsed' : 'xls-unparsed', error: error.message };
    }
  }
  const text = resourceText(resource);
  if (type.includes('json') || /^[\s\n]*[\[{]/.test(text)) {
    try { return { entries: parseJsonPayload(JSON.parse(text), label), tables: [], kind: 'json' }; } catch {}
  }
  if (type.includes('csv') || /\.csv(?:$|[?#])/.test(filename)) return { entries: parseCsv(text, label), tables: [], kind: 'csv' };
  const html = parseHtmlTables(text, label);
  const markdown = parseMarkdownTables(text, label);
  return { entries: [...html.entries, ...markdown.entries, ...parseEmbeddedJson(text, label)], tables: [...html.tables, ...markdown.tables], kind: 'html-text' };
}

async function getSource() {
  const errors = [];
  for (const url of [SOURCE_URL, `https://r.jina.ai/${SOURCE_URL}`]) {
    try {
      const result = await fetchResource(url);
      if (result.ok && result.buffer.length > 100) return { ...result, errors };
      errors.push(`${url}: HTTP ${result.status}`);
    } catch (error) { errors.push(`${url}: ${error.message}`); }
  }
  throw new Error(errors.join(' | ') || 'Không thể tải nguồn PEK.');
}

function labelOf(resource) {
  if (resource.filename && resource.filename !== 'resource') return resource.filename;
  try { return decodeURIComponent(new URL(resource.url).pathname.split('/').filter(Boolean).at(-1) || resource.url); } catch { return resource.url; }
}

export async function scrapePekTimetable() {
  const primary = await getSource();
  const queue = [{ ...primary, label: 'Trang thời khóa biểu PEK', depth: 0 }];
  const seen = new Set([primary.url, primary.requestedUrl].filter(Boolean));
  const documents = [];
  const discoveredUrls = [];

  while (queue.length && documents.length < MAX_RESOURCES) {
    const document = queue.shift();
    documents.push(document);
    if (!isTextResource(document) || document.depth >= 2) continue;
    for (const candidate of discoverUrls(resourceText(document), document.url || SOURCE_URL, MAX_RESOURCES)) {
      for (const url of unique([googleDownloadVariant(candidate.url), candidate.url])) {
        if (!url || seen.has(url) || documents.length + queue.length >= MAX_RESOURCES) continue;
        seen.add(url);
        const discovered = { ...candidate, url, parent: document.url };
        discoveredUrls.push(discovered);
        try {
          const result = await fetchResource(url, 16000);
          if (result.ok && result.buffer.length > 20) queue.push({ ...result, label: labelOf(result), depth: document.depth + 1 });
          else discovered.error = `HTTP ${result.status}`;
        } catch (error) { discovered.error = error.message; }
      }
    }
  }

  const allEntries = [];
  const diagnostics = [];
  for (const document of documents) {
    let parsed;
    try { parsed = await parseResource(document, document.label); }
    catch (error) { parsed = { entries: [], tables: [], kind: 'parse-error', error: error.message }; }
    allEntries.push(...parsed.entries);
    diagnostics.push({
      source: 'PEK', requestedUrl: document.requestedUrl, url: document.url, status: document.status,
      kind: parsed.kind, contentType: document.contentType, filename: document.filename,
      bytes: document.buffer.length, tables: parsed.tables, parsedEntries: parsed.entries.length, error: parsed.error || '',
    });
  }

  const entries = [...new Map(allEntries.map((entry) => [entry.id, entry])).values()]
    .sort((a, b) => a.weekday - b.weekday || a.periodStart - b.periodStart || a.teacherName.localeCompare(b.teacherName, 'vi'));
  const teachers = PRIORITY_TEACHERS.map((name) => ({ name, lessonCount: entries.filter((entry) => normalize(entry.teacherName) === normalize(name)).length }));
  const classes = unique(entries.map((entry) => entry.className)).sort((a, b) => a.localeCompare(b, 'vi', { numeric: true }));
  return {
    ok: entries.length > 0, sourceName: 'PEK', sourceUrl: SOURCE_URL, fetchedAt: new Date().toISOString(), parserVersion: 'pek-timetable-v2-xlsx',
    teachers, classes, entries, diagnostics, discoveredUrls,
    warning: entries.length ? '' : 'Đã kết nối PEK nhưng chưa nhận diện được dữ liệu. Bộ đồng bộ đã kiểm tra trang, Excel/PDF, Google Sheets và endpoint liên quan.',
    sourceErrors: primary.errors || [],
  };
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 's-maxage=1800, stale-while-revalidate=86400');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'GET') return res.status(405).json({ ok: false, message: 'Method not allowed' });
  const refresh = String(req.query?.refresh || req.query?.force || '') === '1';
  const debug = String(req.query?.debug || '') === '1';
  const cache = globalThis.__pekTimetableCacheV2;
  if (!refresh && cache?.data && Date.now() - cache.time < CACHE_TTL) {
    const payload = { ...cache.data, cached: true };
    if (!debug) { delete payload.diagnostics; delete payload.discoveredUrls; }
    return res.status(200).json(payload);
  }
  try {
    const data = await scrapePekTimetable();
    globalThis.__pekTimetableCacheV2 = { time: Date.now(), data };
    const payload = { ...data, cached: false };
    if (!debug) { delete payload.diagnostics; delete payload.discoveredUrls; }
    return res.status(data.ok ? 200 : 206).json(payload);
  } catch (error) {
    if (cache?.data) return res.status(200).json({ ...cache.data, cached: true, stale: true, warning: `Không thể làm mới dữ liệu: ${error.message}` });
    return res.status(502).json({ ok: false, sourceUrl: SOURCE_URL, fetchedAt: new Date().toISOString(), parserVersion: 'pek-timetable-v2-xlsx', teachers: PRIORITY_TEACHERS.map((name) => ({ name, lessonCount: 0 })), classes: [], entries: [], message: error.message });
  }
}
