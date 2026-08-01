import { getCurrentUser } from './utils/auth.js';
import { isSupabaseConfigured, supabase } from './utils/supabase.js';

const BUTTON_ID = 'bes-class-126-forensic-export';
const STYLE_ID = 'bes-class-126-forensic-export-style';
const NOTICE_ID = 'bes-class-126-forensic-export-notice';
const RELEVANT_KEY = /(homeroom|workspace|school-class|class-12-6|gradebook|learning|conduct|attendance|backup)/i;
const SENSITIVE_KEY = /(auth|token|session|password|secret|credential|supabase\.auth)/i;

function safeText(value, fallback = '') {
  const text = String(value ?? '').trim();
  return text || fallback;
}

function cloneSerializable(value) {
  try {
    return JSON.parse(JSON.stringify(value));
  } catch {
    return String(value ?? '');
  }
}

function parseMaybeJson(value) {
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}

function redactSensitive(value, depth = 0) {
  if (depth > 15) return '[depth-limit]';
  if (Array.isArray(value)) return value.map((item) => redactSensitive(item, depth + 1));
  if (!value || typeof value !== 'object') return value;
  const output = {};
  Object.entries(value).forEach(([key, item]) => {
    if (SENSITIVE_KEY.test(key)) {
      output[key] = '[redacted]';
      return;
    }
    output[key] = redactSensitive(item, depth + 1);
  });
  return output;
}

function collectStorage(storage, name) {
  const rows = [];
  try {
    for (let index = 0; index < storage.length; index += 1) {
      const key = storage.key(index);
      if (!key || !RELEVANT_KEY.test(key) || SENSITIVE_KEY.test(key)) continue;
      const raw = storage.getItem(key);
      rows.push({
        storage: name,
        key,
        rawLength: raw?.length || 0,
        value: redactSensitive(parseMaybeJson(raw)),
      });
    }
  } catch (error) {
    rows.push({ storage: name, error: error?.message || String(error) });
  }
  return rows;
}

function gradebookScoreCount(book) {
  let count = 0;
  const isScore = (value) => value !== '' && value != null && Number.isFinite(Number(String(value).replace(',', '.')));
  Object.values(book?.subjects || {}).forEach((subject) => {
    Object.values(subject?.semesters || {}).forEach((semester) => {
      (semester?.regular || []).forEach((round) => {
        Object.values(round?.scores || {}).forEach((row) => {
          Object.values(row || {}).forEach((value) => { if (isScore(value)) count += 1; });
        });
        Object.values(round?.bonus || {}).forEach((value) => { if (isScore(value)) count += 1; });
      });
      Object.values(semester?.midterm?.scores || {}).forEach((value) => { if (isScore(value)) count += 1; });
      Object.values(semester?.final?.scores || {}).forEach((value) => { if (isScore(value)) count += 1; });
    });
  });
  return count;
}

function workspaceSummary(workspace, source = '') {
  const className = safeText(workspace?.classProfile?.className);
  return {
    source,
    id: safeText(workspace?.id),
    className,
    schoolYear: safeText(workspace?.classProfile?.schoolYear),
    updatedAt: safeText(workspace?.updatedAt),
    studentCount: Array.isArray(workspace?.students) ? workspace.students.length : 0,
    activeStudentCount: Array.isArray(workspace?.students) ? workspace.students.filter((item) => item?.active !== false).length : 0,
    gradebookScores: gradebookScoreCount(workspace?.learningGradebook),
    learningRecords: Array.isArray(workspace?.learningRecords) ? workspace.learningRecords.length : 0,
    conductRecords: Array.isArray(workspace?.conductRecords) ? workspace.conductRecords.length : 0,
    attendanceSessions: Object.keys(workspace?.attendance || {}).length,
    backupCount: Array.isArray(workspace?.backups) ? workspace.backups.length : 0,
  };
}

function extractWorkspaceCandidates(storageRows) {
  const candidates = [];
  storageRows.forEach((row) => {
    const value = row?.value;
    if (!value || typeof value !== 'object') return;
    if (value.classProfile || value.learningGradebook || value.conductRecords || value.attendance) {
      candidates.push({
        summary: workspaceSummary(value, `${row.storage}:${row.key}`),
        workspace: value,
      });
    }
  });
  return candidates;
}

async function collectCloudRows(user) {
  const result = {
    available: Boolean(isSupabaseConfigured && supabase && user?.id),
    tables: {},
  };
  if (!result.available) return result;

  const queries = [
    ['bes_homeroom_workspaces', 'owner_id'],
    ['bes_homeroom_workspace_backups', 'owner_id'],
    ['bes_homeroom_workspace_history', 'owner_id'],
    ['bes_homeroom_workspace_revisions', 'owner_id'],
    ['bes_homeroom_audit_logs', 'owner_id'],
    ['bes_homeroom_backups', 'owner_id'],
  ];

  for (const [table, ownerColumn] of queries) {
    try {
      const response = await supabase.from(table).select('*').eq(ownerColumn, user.id).limit(1000);
      if (response.error) {
        result.tables[table] = { error: response.error.message || String(response.error) };
      } else {
        result.tables[table] = {
          count: response.data?.length || 0,
          rows: redactSensitive(cloneSerializable(response.data || [])),
        };
      }
    } catch (error) {
      result.tables[table] = { error: error?.message || String(error) };
    }
  }
  return result;
}

function cloudWorkspaceCandidates(cloud) {
  const rows = cloud?.tables?.bes_homeroom_workspaces?.rows || [];
  return rows.map((row) => {
    const payload = typeof row?.payload === 'string' ? parseMaybeJson(row.payload) : row?.payload;
    return payload && typeof payload === 'object' ? {
      summary: workspaceSummary(payload, `cloud:${safeText(row.workspace_id || row.id)}`),
      workspace: payload,
      rowMeta: redactSensitive({
        workspace_id: row.workspace_id,
        class_name: row.class_name,
        updated_at: row.updated_at,
        created_at: row.created_at,
      }),
    } : null;
  }).filter(Boolean);
}

function buildReport(user, localRows, sessionRows, cloud) {
  const localCandidates = extractWorkspaceCandidates([...localRows, ...sessionRows]);
  const cloudCandidates = cloudWorkspaceCandidates(cloud);
  const allCandidates = [...localCandidates, ...cloudCandidates];
  const class126 = allCandidates.filter((item) => /(^|\D)12\D*6(\D|$)/i.test(item.summary.className || ''));

  return {
    exportType: 'BES_CLASS_12_6_FORENSIC_RECOVERY',
    exportedAt: new Date().toISOString(),
    page: {
      origin: window.location.origin,
      pathname: window.location.pathname,
      hash: window.location.hash,
      userAgent: navigator.userAgent,
    },
    user: {
      id: safeText(user?.id || user?.authId),
      email: safeText(user?.email),
      name: safeText(user?.name),
    },
    summary: {
      localRelevantKeys: localRows.length,
      sessionRelevantKeys: sessionRows.length,
      allWorkspaceCandidates: allCandidates.length,
      class126Candidates: class126.length,
      class126: class126.map((item) => item.summary),
    },
    class126Candidates: class126,
    allWorkspaceSummaries: allCandidates.map((item) => item.summary),
    localStorage: localRows,
    sessionStorage: sessionRows,
    cloud,
  };
}

function downloadJson(report) {
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const fileName = `goi-cuu-ho-lop-12-6-${stamp}.json`;
  const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1500);
  return fileName;
}

function setNotice(text, tone = 'info') {
  let notice = document.getElementById(NOTICE_ID);
  if (!notice) {
    notice = document.createElement('div');
    notice.id = NOTICE_ID;
    document.body.appendChild(notice);
  }
  notice.dataset.tone = tone;
  notice.textContent = text;
  notice.hidden = false;
  window.clearTimeout(window.__besClass126ForensicNoticeTimer);
  window.__besClass126ForensicNoticeTimer = window.setTimeout(() => { notice.hidden = true; }, 8000);
}

async function exportRecoveryPackage(button) {
  button.disabled = true;
  button.textContent = 'Đang gom dữ liệu…';
  setNotice('Đang xuất bản sao chỉ đọc từ thiết bị và cloud. Không sửa hay ghi đè dữ liệu.', 'info');
  try {
    const user = await getCurrentUser();
    const localRows = collectStorage(localStorage, 'localStorage');
    const sessionRows = collectStorage(sessionStorage, 'sessionStorage');
    const cloud = await collectCloudRows(user);
    const report = buildReport(user, localRows, sessionRows, cloud);
    const fileName = downloadJson(report);
    setNotice(`Đã tải ${fileName}. Hãy gửi file này vào cuộc trò chuyện để trích lại điểm.`, 'success');
  } catch (error) {
    console.error('[Class126ForensicExport] Export failed.', error);
    setNotice(error?.message || 'Không thể xuất gói dữ liệu cứu hộ.', 'error');
  } finally {
    button.disabled = false;
    button.textContent = 'Xuất gói cứu hộ 12.6';
  }
}

function injectStyle() {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
    #${BUTTON_ID}{position:fixed;right:22px;bottom:86px;z-index:99990;min-height:46px;padding:0 18px;border:1px solid #b3261e;border-radius:999px;background:#b3261e;color:#fff;font:700 14px/1.2 system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;box-shadow:0 12px 32px rgba(179,38,30,.28);cursor:pointer}
    #${BUTTON_ID}:hover{background:#8c1d18}#${BUTTON_ID}:disabled{opacity:.65;cursor:wait}
    #${NOTICE_ID}{position:fixed;left:50%;bottom:24px;z-index:99991;max-width:min(720px,calc(100vw - 32px));transform:translateX(-50%);padding:13px 18px;border-radius:14px;background:#202124;color:#fff;font:600 13px/1.45 system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;box-shadow:0 14px 40px rgba(0,0,0,.28);text-align:center}
    #${NOTICE_ID}[data-tone="success"]{background:#137333}#${NOTICE_ID}[data-tone="error"]{background:#b3261e}
    @media(max-width:640px){#${BUTTON_ID}{right:12px;bottom:76px;padding:0 14px;font-size:12px}}
  `;
  document.head.appendChild(style);
}

function ensureButton() {
  const onHomeroom = /homeroom|chu-nhiem|gvcn/i.test(window.location.hash || '');
  const existing = document.getElementById(BUTTON_ID);
  if (!onHomeroom) {
    existing?.remove();
    return;
  }
  if (existing) return;
  injectStyle();
  const button = document.createElement('button');
  button.id = BUTTON_ID;
  button.type = 'button';
  button.textContent = 'Xuất gói cứu hộ 12.6';
  button.title = 'Tải bản sao chỉ đọc của dữ liệu lớp 12.6 trên thiết bị và cloud';
  button.addEventListener('click', () => exportRecoveryPackage(button));
  document.body.appendChild(button);
}

window.addEventListener('hashchange', ensureButton);
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', ensureButton, { once: true });
else ensureButton();
