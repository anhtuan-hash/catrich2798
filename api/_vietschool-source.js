import {
  PRIORITY_TEACHERS, normalize, unique, cleanCell, findTeacher, findClass,
  parseHtmlTables, parseMarkdownTables, parseJsonPayload, parseEmbeddedJson, parseCsv,
} from './_pek-core.js';

export const VIETSCHOOL_SOURCE_URL = 'https://truonghocviet.vn/thoikhoabieu/tracuuthoikhoabieu/001063d2-0000-0000-0000-000000000000/101';
const LEGACY_SOURCE_URL = VIETSCHOOL_SOURCE_URL.replace('truonghocviet.vn', 'vietschool.vn');
const MAX_BYTES = 12 * 1024 * 1024;
const MAX_SCRIPT_ASSETS = 18;
const MAX_SUBMISSIONS = 72;
const SCHOOL_ID = '001063d2-0000-0000-0000-000000000000';
const PUBLICATION_ID = '101';

function decodeAttr(value = '') {
  return String(value)
    .replace(/&amp;/gi, '&').replace(/&quot;/gi, '"').replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, '<').replace(/&gt;/gi, '>');
}

function attrsMap(attrs = '') {
  const output = {};
  for (const match of String(attrs).matchAll(/([:\w-]+)(?:\s*=\s*(?:["']([^"']*)["']|([^\s>]+)))?/g)) {
    output[match[1].toLowerCase()] = decodeAttr(match[2] ?? match[3] ?? '');
  }
  return output;
}

function resolveUrl(raw, baseUrl) {
  try {
    const url = new URL(decodeAttr(raw), baseUrl);
    if (!['http:', 'https:'].includes(url.protocol)) return null;
    url.hash = '';
    return url.toString();
  } catch { return null; }
}

function isPlaceholder(text = '', value = '') {
  const joined = normalize(`${text} ${value}`);
  return !String(value).trim() || /chon|select|tat ca|all|--+|vui long/.test(joined);
}

function controlKind(control = {}) {
  const key = normalize(`${control.name || ''} ${control.id || ''} ${control.label || ''}`);
  if (/giao vien|giaovien|teacher/.test(key)) return 'teacher';
  if (/(^| )lop( |$)|class/.test(key)) return 'class';
  if (/thoi khoa bieu|thoikhoabieu|tkb|schedule/.test(key)) return 'timetable';
  if (/to chuyen mon|to bo mon|department|group/.test(key)) return 'group';
  return 'other';
}

export function parseSelectCatalog(html = '') {
  const selects = [];
  for (const match of String(html).matchAll(/<select\b([^>]*)>([\s\S]*?)<\/select>/gi)) {
    const attrs = attrsMap(match[1]);
    const options = [];
    for (const option of match[2].matchAll(/<option\b([^>]*)>([\s\S]*?)<\/option>/gi)) {
      const optionAttrs = attrsMap(option[1]);
      const text = cleanCell(option[2]);
      options.push({ value: optionAttrs.value ?? text, text, selected: Object.prototype.hasOwnProperty.call(optionAttrs, 'selected') });
    }
    const control = { id: attrs.id || '', name: attrs.name || attrs.id || '', label: attrs['aria-label'] || attrs.title || '', options };
    control.kind = controlKind(control);
    selects.push(control);
  }
  return selects;
}

function parseInputs(fragment = '') {
  const fields = {};
  for (const match of String(fragment).matchAll(/<input\b([^>]*)>/gi)) {
    const attrs = attrsMap(match[1]);
    const type = normalize(attrs.type || 'text');
    if (!attrs.name || ['submit', 'button', 'image', 'file'].includes(type)) continue;
    if ((type === 'checkbox' || type === 'radio') && !Object.prototype.hasOwnProperty.call(attrs, 'checked')) continue;
    fields[attrs.name] = attrs.value || '';
  }
  return fields;
}

function parseForms(html = '', pageUrl = VIETSCHOOL_SOURCE_URL) {
  const forms = [];
  for (const match of String(html).matchAll(/<form\b([^>]*)>([\s\S]*?)<\/form>/gi)) {
    const attrs = attrsMap(match[1]);
    const body = match[2];
    const selects = parseSelectCatalog(body);
    forms.push({ action: resolveUrl(attrs.action || pageUrl, pageUrl) || pageUrl, method: normalize(attrs.method || 'get') === 'post' ? 'POST' : 'GET', enctype: attrs.enctype || 'application/x-www-form-urlencoded', fields: parseInputs(body), selects, id: attrs.id || attrs.name || '' });
  }
  if (!forms.length) forms.push({ action: pageUrl, method: 'POST', enctype: 'application/x-www-form-urlencoded', fields: parseInputs(html), selects: parseSelectCatalog(html), id: 'page' });
  return forms;
}

function extractCookies(headers) {
  const values = typeof headers.getSetCookie === 'function' ? headers.getSetCookie() : [];
  const fallback = headers.get('set-cookie');
  return [...values, ...(fallback ? [fallback] : [])].map((item) => String(item).split(';')[0].trim()).filter(Boolean);
}
function mergeCookies(jar, cookies) {
  cookies.forEach((cookie) => { const name = cookie.split('=')[0]; const index = jar.findIndex((item) => item.split('=')[0] === name); if (index >= 0) jar[index] = cookie; else jar.push(cookie); });
}

async function fetchSession(url, session, options = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), options.timeout || 14000);
  try {
    const headers = {
      'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/150 Safari/537.36',
      accept: options.accept || 'text/html,application/xhtml+xml,application/json,text/plain,*/*;q=0.7',
      'accept-language': 'vi-VN,vi;q=0.9,en;q=0.7', referer: options.referer || session.referer || VIETSCHOOL_SOURCE_URL,
      ...(session.cookies.length ? { cookie: session.cookies.join('; ') } : {}), ...(options.headers || {}),
    };
    const response = await fetch(url, { method: options.method || 'GET', redirect: 'follow', signal: controller.signal, headers, body: options.body });
    mergeCookies(session.cookies, extractCookies(response.headers));
    const buffer = Buffer.from(await response.arrayBuffer());
    if (buffer.length > MAX_BYTES) throw new Error('Tài nguyên VietSchool vượt quá 12 MB');
    return { ok: response.ok, status: response.status, requestedUrl: url, url: response.url || url, contentType: response.headers.get('content-type') || '', buffer, text: buffer.toString('utf8') };
  } finally { clearTimeout(timeout); }
}

function parseAnyText(text = '', label = '') {
  const entries = [];
  const tables = [];
  const trimmed = String(text).trim();
  if (/^[\[{]/.test(trimmed)) { try { entries.push(...parseJsonPayload(JSON.parse(trimmed), label)); } catch {} }
  const html = parseHtmlTables(text, label);
  const markdown = parseMarkdownTables(text, label);
  entries.push(...html.entries, ...markdown.entries, ...parseEmbeddedJson(text, label));
  tables.push(...html.tables, ...markdown.tables);
  if (/\b(?:teacher|giaovien|giao_vien|class|lop|weekday|thu|period|tiet)\b/i.test(trimmed) && /,/.test(trimmed)) { try { entries.push(...parseCsv(trimmed, label)); } catch {} }
  return { entries, tables };
}

function extractScriptSources(html, baseUrl) {
  const urls = [];
  for (const match of String(html).matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)) {
    const attrs = attrsMap(match[1]);
    const src = resolveUrl(attrs.src || '', baseUrl);
    if (src && new URL(src).origin === new URL(baseUrl).origin) urls.push(src);
  }
  return unique(urls).slice(0, MAX_SCRIPT_ASSETS);
}

function endpointScore(url) {
  const text = normalize(url);
  let score = 0;
  if (/thoikhoabieu|thoi-khoa-bieu|tracuuthoikhoabieu|tkb|schedule/.test(text)) score += 100;
  if (/giao.?vien|teacher|lop|class|danhsach|load|get|in.?tkb|print/.test(text)) score += 45;
  if (/api|ajax|action|json/.test(text)) score += 25;
  if (/\.js(?:$|\?)/.test(url)) score -= 120;
  return score;
}
function discoverEndpointStrings(source, baseUrl) {
  const urls = new Map();
  const add = (raw) => {
    const url = resolveUrl(raw, baseUrl);
    if (!url) return;
    try { if (new URL(url).origin !== new URL(baseUrl).origin) return; } catch { return; }
    const score = endpointScore(url);
    if (score >= 45) urls.set(url, Math.max(score, urls.get(url) || 0));
  };
  for (const match of String(source).matchAll(/["'`]([^"'`\s]{2,260})["'`]/g)) if (/thoikhoabieu|thoi-khoa-bieu|tracuuthoikhoabieu|tkb|schedule|giaovien|giao-vien|teacher|\/lop\/|class/i.test(match[1])) add(match[1]);
  for (const match of String(source).matchAll(/(?:url|action|href)\s*[:=]\s*["']([^"']+)["']/gi)) add(match[1]);
  return [...urls.entries()].sort((a, b) => b[1] - a[1]).map(([url, score]) => ({ url, score }));
}

function selectOptions(select) { return (select?.options || []).filter((option) => !isPlaceholder(option.text, option.value)); }
function defaultPayload(form) {
  const payload = { ...form.fields };
  for (const select of form.selects) {
    if (!select.name) continue;
    const option = select.options.find((item) => item.selected && !isPlaceholder(item.text, item.value)) || selectOptions(select)[0];
    if (option) payload[select.name] = option.value;
  }
  return payload;
}
function catalogFromForms(forms) {
  const teachers = [], classes = [], timetables = [];
  for (const form of forms) for (const select of form.selects) {
    const target = select.kind === 'teacher' ? teachers : select.kind === 'class' ? classes : select.kind === 'timetable' ? timetables : null;
    if (target) target.push(...selectOptions(select).map((option) => ({ ...option, field: select.name, form })));
  }
  return { teachers: unique(teachers.map((item) => item.text)), classes: unique(classes.map((item) => item.text)).filter((item) => findClass(item) || /\b(?:6|7|8|9|10|11|12)[A-Z0-9./-]*\b/i.test(item)), timetables: unique(timetables.map((item) => item.text)) };
}
function submissionKey(item) { return `${item.method}|${item.url}|${new URLSearchParams(item.payload).toString()}`; }
function buildFormSubmissions(forms, pageUrl) {
  const items = [];
  const add = (form, payload, label, kind) => items.push({ url: form.action || pageUrl, method: form.method || 'POST', payload, label, kind });
  for (const form of forms) {
    const base = defaultPayload(form);
    const teacherSelect = form.selects.find((item) => item.kind === 'teacher');
    const classSelect = form.selects.find((item) => item.kind === 'class');
    const timetableSelect = form.selects.find((item) => item.kind === 'timetable');
    const timetableOption = selectOptions(timetableSelect)[0];
    if (teacherSelect?.name) for (const option of selectOptions(teacherSelect)) {
      const teacher = PRIORITY_TEACHERS.find((name) => normalize(option.text).includes(normalize(name)) || normalize(name).includes(normalize(option.text)));
      if (teacher) add(form, { ...base, [teacherSelect.name]: option.value, ...(timetableSelect?.name && timetableOption ? { [timetableSelect.name]: timetableOption.value } : {}) }, teacher, 'teacher');
    }
    if (classSelect?.name) for (const option of selectOptions(classSelect).slice(0, 60)) {
      const className = findClass(option.text) || option.text;
      if (className) add(form, { ...base, [classSelect.name]: option.value, ...(timetableSelect?.name && timetableOption ? { [timetableSelect.name]: timetableOption.value } : {}) }, `Lớp ${className}`, 'class');
    }
  }
  return [...new Map(items.map((item) => [submissionKey(item), item])).values()].slice(0, MAX_SUBMISSIONS);
}

async function submit(item, session) {
  const params = new URLSearchParams();
  Object.entries(item.payload || {}).forEach(([key, value]) => params.set(key, value == null ? '' : String(value)));
  if (item.method === 'GET') {
    const url = new URL(item.url); params.forEach((value, key) => url.searchParams.set(key, value));
    return fetchSession(url.toString(), session, { referer: VIETSCHOOL_SOURCE_URL, headers: { 'x-requested-with': 'XMLHttpRequest' }, timeout: 9000 });
  }
  return fetchSession(item.url, session, { method: 'POST', referer: VIETSCHOOL_SOURCE_URL, body: params, headers: { 'content-type': 'application/x-www-form-urlencoded; charset=UTF-8', 'x-requested-with': 'XMLHttpRequest' }, timeout: 9000 });
}
async function runPool(items, worker, concurrency = 6) {
  const results = []; let index = 0;
  async function run() { while (index < items.length) { const current = items[index++]; try { results.push({ item: current, value: await worker(current) }); } catch (error) { results.push({ item: current, error }); } } }
  await Promise.all(Array.from({ length: Math.min(concurrency, Math.max(1, items.length)) }, run));
  return results;
}
function endpointPayloads(endpoint, forms) {
  const payloads = [];
  for (const form of forms) {
    const base = defaultPayload(form), teacherSelect = form.selects.find((item) => item.kind === 'teacher'), classSelect = form.selects.find((item) => item.kind === 'class'), timetableSelect = form.selects.find((item) => item.kind === 'timetable'), tkb = selectOptions(timetableSelect)[0];
    for (const option of selectOptions(teacherSelect)) {
      const teacher = PRIORITY_TEACHERS.find((name) => normalize(option.text).includes(normalize(name)) || normalize(name).includes(normalize(option.text)));
      if (teacher) payloads.push({ url: endpoint.url, method: 'POST', payload: { ...base, [teacherSelect.name]: option.value, ...(tkb && timetableSelect?.name ? { [timetableSelect.name]: tkb.value } : {}), schoolId: SCHOOL_ID, idTruong: SCHOOL_ID, id: PUBLICATION_ID }, label: teacher, kind: 'ajax-teacher' });
    }
    for (const option of selectOptions(classSelect).slice(0, 45)) {
      const className = findClass(option.text) || option.text;
      payloads.push({ url: endpoint.url, method: 'POST', payload: { ...base, [classSelect.name]: option.value, ...(tkb && timetableSelect?.name ? { [timetableSelect.name]: tkb.value } : {}), schoolId: SCHOOL_ID, idTruong: SCHOOL_ID, id: PUBLICATION_ID }, label: `Lớp ${className}`, kind: 'ajax-class' });
    }
  }
  return payloads;
}

export async function scrapeVietSchool() {
  const session = { cookies: [], referer: VIETSCHOOL_SOURCE_URL };
  const sourceErrors = [];
  let primary = null;
  for (const url of [VIETSCHOOL_SOURCE_URL, LEGACY_SOURCE_URL]) {
    try { const result = await fetchSession(url, session, { timeout: 20000 }); if (result.ok && result.buffer.length > 300) { primary = result; break; } sourceErrors.push(`${url}: HTTP ${result.status}`); }
    catch (error) { sourceErrors.push(`${url}: ${error.message}`); }
  }
  if (!primary) throw new Error(sourceErrors.join(' | ') || 'Không thể tải VietSchool.');

  const documents = [{ ...primary, label: 'Trang tra cứu VietSchool', kind: 'page' }];
  const allEntries = [];
  const initialParsed = parseAnyText(primary.text, 'VietSchool');
  allEntries.push(...initialParsed.entries);
  const forms = parseForms(primary.text, primary.url || VIETSCHOOL_SOURCE_URL);
  const catalog = catalogFromForms(forms);
  const scriptUrls = extractScriptSources(primary.text, primary.url || VIETSCHOOL_SOURCE_URL);
  const endpointMap = new Map(discoverEndpointStrings(primary.text, primary.url || VIETSCHOOL_SOURCE_URL).map((item) => [item.url, item]));
  const scripts = await runPool(scriptUrls, (url) => fetchSession(url, session, { referer: primary.url, timeout: 9000 }), 5);
  for (const result of scripts) if (result.value?.ok) {
    documents.push({ ...result.value, label: result.item.split('/').at(-1), kind: 'script' });
    for (const endpoint of discoverEndpointStrings(result.value.text, primary.url || VIETSCHOOL_SOURCE_URL)) endpointMap.set(endpoint.url, endpoint);
  }

  const submissions = buildFormSubmissions(forms, primary.url || VIETSCHOOL_SOURCE_URL);
  const endpoints = [...endpointMap.values()].sort((a, b) => b.score - a.score).slice(0, 18);
  for (const endpoint of endpoints) submissions.push(...endpointPayloads(endpoint, forms));
  const uniqueSubmissions = [...new Map(submissions.map((item) => [submissionKey(item), item])).values()].slice(0, MAX_SUBMISSIONS);
  const responses = await runPool(uniqueSubmissions, (item) => submit(item, session), 6);
  for (const result of responses) {
    const response = result.value;
    if (!response?.ok || response.buffer.length < 20) continue;
    const parsed = parseAnyText(response.text, result.item.label);
    allEntries.push(...parsed.entries);
    documents.push({ ...response, label: result.item.label, kind: result.item.kind, parsedEntries: parsed.entries.length });
  }

  const diagnostics = [];
  for (const document of documents) {
    const parsed = document.kind === 'script' ? { entries: [], tables: [] } : parseAnyText(document.text || '', document.label || 'VietSchool');
    if (document.kind !== 'script') allEntries.push(...parsed.entries);
    diagnostics.push({ source: 'VietSchool', label: document.label, requestedUrl: document.requestedUrl, url: document.url, status: document.status, kind: document.kind || 'html', contentType: document.contentType, bytes: document.buffer?.length || 0, parsedEntries: document.parsedEntries ?? parsed.entries.length, tables: parsed.tables });
  }

  const entries = [...new Map(allEntries.map((entry) => [entry.id, entry])).values()].sort((a, b) => a.weekday - b.weekday || a.periodStart - b.periodStart || a.teacherName.localeCompare(b.teacherName, 'vi'));
  const classes = unique([...catalog.classes.map((item) => findClass(item) || item), ...entries.map((entry) => entry.className)]).filter(Boolean).sort((a, b) => a.localeCompare(b, 'vi', { numeric: true }));
  const teachers = PRIORITY_TEACHERS.map((name) => ({ name, lessonCount: entries.filter((entry) => normalize(entry.teacherName) === normalize(name)).length }));
  return {
    ok: entries.length > 0, sourceName: 'VietSchool', sourceUrl: VIETSCHOOL_SOURCE_URL, fetchedAt: new Date().toISOString(), parserVersion: 'pek-timetable-v3-vietschool',
    teachers, classes, entries, diagnostics, discoveredUrls: endpoints,
    catalogs: { teachers: catalog.teachers, classes: catalog.classes, timetables: catalog.timetables, forms: forms.map((form) => ({ action: form.action, method: form.method, id: form.id, selects: form.selects.map((select) => ({ name: select.name, id: select.id, kind: select.kind, optionCount: select.options.length })) })) },
    warning: entries.length ? '' : 'Đã kết nối VietSchool nhưng chưa nhận diện được các ô lịch. Chẩn đoán đã ghi lại biểu mẫu, danh mục và endpoint AJAX.', sourceErrors,
  };
}
