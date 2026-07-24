import { PRIORITY_TEACHERS, normalize, unique } from './_pek-core.js';
import { scrapeVietSchool, VIETSCHOOL_SOURCE_URL } from './_vietschool-source.js';
import { scrapePekTimetable } from './pek-timetable-v2.js';

const CACHE_TTL = 30 * 60 * 1000;
export const maxDuration = 60;

function normalizeResult(result, sourceAttempts) {
  const entries = result?.entries || [];
  const catalogClasses = result?.catalogs?.classes || [];
  const classes = unique([...(result?.classes || []), ...catalogClasses]).sort((a, b) => a.localeCompare(b, 'vi', { numeric: true }));
  const teachers = PRIORITY_TEACHERS.map((name) => ({ name, lessonCount: entries.filter((entry) => normalize(entry.teacherName) === normalize(name)).length }));
  return { ...result, teachers, classes, sourceAttempts };
}

async function collect() {
  const sourceAttempts = [];
  let vietSchool = null;
  try {
    vietSchool = await scrapeVietSchool();
    sourceAttempts.push({ source: 'VietSchool', url: VIETSCHOOL_SOURCE_URL, ok: vietSchool.ok, entries: vietSchool.entries.length, error: '' });
    if (vietSchool.ok) return normalizeResult(vietSchool, sourceAttempts);
  } catch (error) {
    sourceAttempts.push({ source: 'VietSchool', url: VIETSCHOOL_SOURCE_URL, ok: false, entries: 0, error: error.message });
  }

  let pek = null;
  try {
    pek = await scrapePekTimetable();
    sourceAttempts.push({ source: 'PEK', url: pek.sourceUrl, ok: pek.ok, entries: pek.entries.length, error: '' });
    if (pek.ok) return normalizeResult({ ...pek, diagnostics: [...(vietSchool?.diagnostics || []), ...(pek.diagnostics || [])], discoveredUrls: [...(vietSchool?.discoveredUrls || []), ...(pek.discoveredUrls || [])], catalogs: vietSchool?.catalogs || {} }, sourceAttempts);
  } catch (error) {
    sourceAttempts.push({ source: 'PEK', url: 'https://cm.pek.edu.vn/vi/thoikhoabieu/?id=3', ok: false, entries: 0, error: error.message });
  }

  const base = vietSchool || pek || {};
  return normalizeResult({
    ...base,
    ok: false,
    sourceName: 'VietSchool + PEK',
    sourceUrl: VIETSCHOOL_SOURCE_URL,
    fetchedAt: new Date().toISOString(),
    parserVersion: 'pek-timetable-v3-vietschool',
    entries: [],
    diagnostics: [...(vietSchool?.diagnostics || []), ...(pek?.diagnostics || [])],
    discoveredUrls: [...(vietSchool?.discoveredUrls || []), ...(pek?.discoveredUrls || [])],
    warning: 'Brian đã thử VietSchool trước và PEK sau nhưng chưa nhận diện được ô lịch. Bảng chẩn đoán hiển thị biểu mẫu, danh mục và endpoint đã kiểm tra.',
  }, sourceAttempts);
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 's-maxage=1800, stale-while-revalidate=86400');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'GET') return res.status(405).json({ ok: false, message: 'Method not allowed' });
  const refresh = String(req.query?.refresh || req.query?.force || '') === '1';
  const debug = String(req.query?.debug || '') === '1';
  const cache = globalThis.__pekTimetableCacheV3;
  if (!refresh && cache?.data && Date.now() - cache.time < CACHE_TTL) {
    const payload = { ...cache.data, cached: true };
    if (!debug) { delete payload.diagnostics; delete payload.discoveredUrls; delete payload.catalogs; }
    return res.status(200).json(payload);
  }
  try {
    const data = await collect();
    globalThis.__pekTimetableCacheV3 = { time: Date.now(), data };
    const payload = { ...data, cached: false };
    if (!debug) { delete payload.diagnostics; delete payload.discoveredUrls; delete payload.catalogs; }
    return res.status(data.ok ? 200 : 206).json(payload);
  } catch (error) {
    if (cache?.data) return res.status(200).json({ ...cache.data, cached: true, stale: true, warning: `Không thể làm mới dữ liệu: ${error.message}` });
    return res.status(502).json({
      ok: false, sourceName: 'VietSchool + PEK', sourceUrl: VIETSCHOOL_SOURCE_URL,
      fetchedAt: new Date().toISOString(), parserVersion: 'pek-timetable-v3-vietschool',
      teachers: PRIORITY_TEACHERS.map((name) => ({ name, lessonCount: 0 })), classes: [], entries: [], message: error.message,
    });
  }
}
