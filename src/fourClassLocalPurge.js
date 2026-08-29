import { getCurrentUser } from './utils/auth.js';
import { schoolClassRegistryStorageKey } from './utils/schoolClassRegistry.js';
import { isSupabaseConfigured, supabase } from './utils/supabase.js';

// Legacy destructive purge retired permanently.
// Fresh browsers / Incognito sessions must never erase or shadow a valid cloud
// class-assignment registry just because localStorage is empty.
const LEGACY_PURGE_MARKERS = [
  'bes-all-class-local-purge-20260805-v1',
  'bes-all-class-local-purge-v2026-08-05',
  'bes-four-class-local-purge-20260805-v1',
  'bes-four-class-local-purge-20260805-v2',
];
const REGISTRY_TABLE = 'school_class_registries';
const RECOVERY_GUARD_PREFIX = 'bes-school-class-cloud-recovery-v2:';
const CLOUD_STATUS_ID = 'bes-school-class-cloud-status';
const CLOUD_STATUS_STYLE_ID = 'bes-school-class-cloud-status-style';

let latestCloudStatus = {
  state: 'checking',
  title: 'Đang kiểm tra Supabase…',
  detail: 'Đang xác minh bản sao dữ liệu phân công trên cloud.',
  pill: 'ĐANG KIỂM TRA',
};
let cloudStatusObserver = null;
let cloudStatusInterval = null;

function safeJson(value, fallback = null) {
  try {
    return value ? JSON.parse(value) : fallback;
  } catch {
    return fallback;
  }
}

function isBrianTeamRoute() {
  if (typeof window === 'undefined') return false;
  return /brian-team|personnel-hub|work-hub/i.test(window.location.hash || '');
}

function explicitPurgeState(registry) {
  const purge = registry?.classDataPurge;
  return purge?.scope === 'all-classes' || purge?.state === 'purged';
}

function assignmentScore(registry) {
  const classes = Array.isArray(registry?.classes) ? registry.classes : [];
  const classAssignmentScore = classes.reduce((score, item) => {
    const assignment = item?.assignment && typeof item.assignment === 'object' ? item.assignment : {};
    const homeroom = String(assignment.homeroomTeacherId || '').trim() ? 1 : 0;
    const subjects = Array.isArray(assignment.subjectTeacherIds)
      ? assignment.subjectTeacherIds.filter((value) => String(value || '').trim()).length
      : 0;
    return score + homeroom + subjects;
  }, 0);

  const locks = registry?.assignmentLocks && typeof registry.assignmentLocks === 'object'
    ? Object.values(registry.assignmentLocks)
    : [];
  const lockScore = locks.reduce((score, lock) => {
    if (!lock || typeof lock !== 'object') return score;
    const locked = lock.locked === true ? 1 : 0;
    const homeroomSnapshot = String(lock.homeroomTeacherId || '').trim() ? 1 : 0;
    const subjectSnapshot = Array.isArray(lock.subjectTeacherIds)
      ? lock.subjectTeacherIds.filter((value) => String(value || '').trim()).length
      : 0;
    return score + locked + homeroomSnapshot + subjectSnapshot;
  }, 0);

  return classAssignmentScore + lockScore;
}

function classCount(registry) {
  return Array.isArray(registry?.classes) ? registry.classes.length : 0;
}

function registryCloudStats(registry) {
  const classes = Array.isArray(registry?.classes) ? registry.classes : [];
  const homerooms = classes.filter((item) => String(item?.assignment?.homeroomTeacherId || '').trim()).length;
  const subjects = classes.reduce((sum, item) => (
    sum + (Array.isArray(item?.assignment?.subjectTeacherIds)
      ? item.assignment.subjectTeacherIds.filter((value) => String(value || '').trim()).length
      : 0)
  ), 0);
  const locks = registry?.assignmentLocks && typeof registry.assignmentLocks === 'object'
    ? Object.values(registry.assignmentLocks).filter((lock) => lock?.locked === true).length
    : 0;
  return { classes: classes.length, homerooms, subjects, locks };
}

function formatCloudTime(value) {
  const time = Date.parse(value || '');
  if (!Number.isFinite(time)) return '';
  try {
    return new Intl.DateTimeFormat('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(time));
  } catch {
    return new Date(time).toLocaleString();
  }
}

function ensureCloudStatusStyle() {
  if (typeof document === 'undefined' || document.getElementById(CLOUD_STATUS_STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = CLOUD_STATUS_STYLE_ID;
  style.textContent = `
#${CLOUD_STATUS_ID}{max-width:1560px;margin:18px auto 0;padding:0 0 2px;color:#202124;font-family:inherit}
#${CLOUD_STATUS_ID}[hidden]{display:none!important}
#${CLOUD_STATUS_ID} .bes-cloud-status-card{display:grid;grid-template-columns:auto minmax(0,1fr) auto;align-items:center;gap:14px;min-height:76px;padding:14px 18px;border:1px solid rgba(31,41,55,.12);border-radius:20px;background:#fff;box-shadow:0 8px 24px rgba(60,64,67,.06)}
#${CLOUD_STATUS_ID}[data-state="saved"] .bes-cloud-status-card{border-color:rgba(19,115,51,.24);background:linear-gradient(135deg,#f3fbf5,#fff)}
#${CLOUD_STATUS_ID}[data-state="checking"] .bes-cloud-status-card{border-color:rgba(11,87,208,.18);background:linear-gradient(135deg,#f5f8ff,#fff)}
#${CLOUD_STATUS_ID}[data-state="empty"] .bes-cloud-status-card{border-color:rgba(234,134,0,.25);background:linear-gradient(135deg,#fffaf0,#fff)}
#${CLOUD_STATUS_ID}[data-state="error"] .bes-cloud-status-card,#${CLOUD_STATUS_ID}[data-state="offline"] .bes-cloud-status-card{border-color:rgba(197,34,31,.22);background:linear-gradient(135deg,#fff7f7,#fff)}
#${CLOUD_STATUS_ID} .bes-cloud-status-icon{display:grid;place-items:center;width:46px;height:46px;border-radius:15px;background:#e8f0fe;color:#174ea6;font-size:23px;font-weight:900}
#${CLOUD_STATUS_ID}[data-state="saved"] .bes-cloud-status-icon{background:#e6f4ea;color:#137333}
#${CLOUD_STATUS_ID}[data-state="empty"] .bes-cloud-status-icon{background:#fef7e0;color:#8a5a00}
#${CLOUD_STATUS_ID}[data-state="error"] .bes-cloud-status-icon,#${CLOUD_STATUS_ID}[data-state="offline"] .bes-cloud-status-icon{background:#fce8e6;color:#a50e0e}
#${CLOUD_STATUS_ID} .bes-cloud-status-copy{display:flex;min-width:0;flex-direction:column;gap:2px}
#${CLOUD_STATUS_ID} .bes-cloud-status-copy span{font-size:.72em;font-weight:900;letter-spacing:.08em;color:#5f6368}
#${CLOUD_STATUS_ID} .bes-cloud-status-copy strong{font-size:1em;line-height:1.25}
#${CLOUD_STATUS_ID} .bes-cloud-status-copy small{overflow:hidden;color:#6b7280;font-size:.78em;line-height:1.35;text-overflow:ellipsis}
#${CLOUD_STATUS_ID} .bes-cloud-status-pill{justify-self:end;padding:7px 10px;border-radius:999px;background:#e8f0fe;color:#174ea6;font-size:.68em;font-weight:900;white-space:nowrap}
#${CLOUD_STATUS_ID}[data-state="saved"] .bes-cloud-status-pill{background:#e6f4ea;color:#137333}
#${CLOUD_STATUS_ID}[data-state="empty"] .bes-cloud-status-pill{background:#fef7e0;color:#8a5a00}
#${CLOUD_STATUS_ID}[data-state="error"] .bes-cloud-status-pill,#${CLOUD_STATUS_ID}[data-state="offline"] .bes-cloud-status-pill{background:#fce8e6;color:#a50e0e}
@media(max-width:720px){#${CLOUD_STATUS_ID}{padding:0 12px}#${CLOUD_STATUS_ID} .bes-cloud-status-card{grid-template-columns:auto 1fr;padding:13px 14px}#${CLOUD_STATUS_ID} .bes-cloud-status-pill{grid-column:2;justify-self:start}}
`;
  document.head.appendChild(style);
}

function buildCloudStatusCard(status) {
  const card = document.createElement('div');
  card.className = 'bes-cloud-status-card';

  const icon = document.createElement('div');
  icon.className = 'bes-cloud-status-icon';
  icon.setAttribute('aria-hidden', 'true');
  icon.textContent = status.state === 'saved' ? '✓' : status.state === 'checking' ? '↻' : '!';

  const copy = document.createElement('div');
  copy.className = 'bes-cloud-status-copy';
  const eyebrow = document.createElement('span');
  eyebrow.textContent = 'SUPABASE · BẢN SAO CLOUD';
  const title = document.createElement('strong');
  title.textContent = status.title;
  const detail = document.createElement('small');
  detail.textContent = status.detail;
  copy.append(eyebrow, title, detail);

  const pill = document.createElement('b');
  pill.className = 'bes-cloud-status-pill';
  pill.textContent = status.pill;

  card.append(icon, copy, pill);
  return card;
}

function ensureCloudStatusCard() {
  if (typeof document === 'undefined') return;
  const existing = document.getElementById(CLOUD_STATUS_ID);
  if (!isBrianTeamRoute()) {
    if (existing) existing.hidden = true;
    return;
  }

  const host = document.getElementById('bes-school-class-registry-host');
  if (!host?.parentElement) return;
  ensureCloudStatusStyle();

  let wrapper = existing;
  if (!wrapper) {
    wrapper = document.createElement('section');
    wrapper.id = CLOUD_STATUS_ID;
    wrapper.setAttribute('aria-live', 'polite');
    host.parentElement.insertBefore(wrapper, host);
  } else if (wrapper.nextElementSibling !== host) {
    host.parentElement.insertBefore(wrapper, host);
  }

  wrapper.hidden = Boolean(host.hidden);
  const signature = JSON.stringify(latestCloudStatus);
  if (wrapper.dataset.signature === signature) return;
  wrapper.dataset.signature = signature;
  wrapper.dataset.state = latestCloudStatus.state;
  wrapper.replaceChildren(buildCloudStatusCard(latestCloudStatus));
}

function setCloudStatus(state, title, detail, pill) {
  latestCloudStatus = { state, title, detail, pill };
  if (typeof window !== 'undefined') {
    window.__BES_SUPABASE_CLASS_BACKUP_STATUS__ = {
      ...latestCloudStatus,
      checkedAt: new Date().toISOString(),
    };
  }
  ensureCloudStatusCard();
}

function installCloudStatusHostWatcher() {
  if (typeof document === 'undefined' || cloudStatusObserver) return;
  cloudStatusObserver = new MutationObserver(() => ensureCloudStatusCard());
  cloudStatusObserver.observe(document.documentElement, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ['hidden'],
  });
  cloudStatusInterval = window.setInterval(ensureCloudStatusCard, 1200);
  ensureCloudStatusCard();
}

function retireLegacyPurge() {
  if (typeof window === 'undefined') return;
  for (const key of LEGACY_PURGE_MARKERS) {
    try { window.localStorage.removeItem(key); } catch { /* optional storage */ }
    try { window.sessionStorage.removeItem(key); } catch { /* optional storage */ }
  }
  window.__BES_CLASS_DATA_PURGE_RETIRED__ = true;
}

function writeRecoveryDiagnostic(detail) {
  if (typeof window === 'undefined') return;
  window.__BES_CLASS_REGISTRY_RECOVERY__ = {
    ...(detail || {}),
    at: new Date().toISOString(),
  };
}

async function recoverCloudRegistry() {
  if (!isBrianTeamRoute()) return;

  if (!isSupabaseConfigured || !supabase) {
    setCloudStatus(
      'offline',
      'Supabase chưa sẵn sàng',
      'Không thể xác minh bản sao cloud ở phiên hiện tại. Dữ liệu cục bộ vẫn được giữ nguyên.',
      'CHƯA XÁC MINH',
    );
    return;
  }

  setCloudStatus(
    'checking',
    'Đang kiểm tra Supabase…',
    'Đang xác minh bản sao dữ liệu phân công trên cloud.',
    'ĐANG KIỂM TRA',
  );

  let user = null;
  try {
    user = await getCurrentUser();
  } catch (error) {
    console.warn('[SchoolClassRecovery] Could not resolve current user.', error);
    setCloudStatus('error', 'Không xác minh được tài khoản', 'Không thể đọc trạng thái Supabase cho tài khoản hiện tại.', 'LỖI KIỂM TRA');
    return;
  }
  if (!user?.id) {
    setCloudStatus('error', 'Chưa xác định được tài khoản', 'Hãy đăng nhập lại để kiểm tra bản sao dữ liệu trên Supabase.', 'LỖI KIỂM TRA');
    return;
  }

  const storageKey = schoolClassRegistryStorageKey(user);
  let localRegistry = null;
  try {
    localRegistry = safeJson(window.localStorage.getItem(storageKey), null);
  } catch {
    localRegistry = null;
  }

  let data = null;
  try {
    const response = await supabase
      .from(REGISTRY_TABLE)
      .select('payload,updated_at')
      .eq('owner_id', user.id)
      .maybeSingle();
    if (response.error) {
      console.warn('[SchoolClassRecovery] Cloud registry read failed.', response.error.message || response.error);
      setCloudStatus(
        'error',
        'Không đọc được Supabase',
        'Không thể xác minh bản sao cloud lúc này. Dữ liệu trên thiết bị không bị xóa.',
        'LỖI ĐỒNG BỘ',
      );
      return;
    }
    data = response.data;
  } catch (error) {
    console.warn('[SchoolClassRecovery] Cloud registry read failed.', error);
    setCloudStatus(
      'error',
      'Không đọc được Supabase',
      'Không thể xác minh bản sao cloud lúc này. Dữ liệu trên thiết bị không bị xóa.',
      'LỖI ĐỒNG BỘ',
    );
    return;
  }

  const cloudRegistry = data?.payload && typeof data.payload === 'object' ? data.payload : null;
  if (!cloudRegistry) {
    setCloudStatus(
      'empty',
      'Chưa có bản sao trên Supabase',
      'Bảng cloud đã truy cập được nhưng chưa tìm thấy dữ liệu phân công của tài khoản này.',
      'CHƯA CÓ BẢN CLOUD',
    );
    return;
  }

  const stats = registryCloudStats(cloudRegistry);
  const updatedAt = data?.updated_at || cloudRegistry?.updatedAt || '';
  const updatedLabel = formatCloudTime(updatedAt);
  const detailParts = [
    updatedLabel ? `Cập nhật ${updatedLabel}` : 'Đã tìm thấy payload cloud',
    `${stats.classes} lớp`,
    `${stats.homerooms} GVCN`,
    `${stats.locks} lớp đã khóa`,
  ];
  if (stats.subjects) detailParts.push(`${stats.subjects} lượt GVBM`);
  setCloudStatus(
    'saved',
    'Đã lưu an toàn trên Supabase',
    detailParts.join(' · '),
    'ĐÃ CÓ BẢN CLOUD',
  );

  const cloudAssignments = assignmentScore(cloudRegistry);
  const localAssignments = assignmentScore(localRegistry);
  const localMissing = !localRegistry || typeof localRegistry !== 'object';
  const localPurged = explicitPurgeState(localRegistry);
  const localEmptyAgainstCloud = cloudAssignments > 0 && localAssignments === 0;
  const localHasNoClassesAgainstCloud = classCount(localRegistry) === 0 && classCount(cloudRegistry) > 0;

  // normalizeSchoolClassRegistry() can manufacture a blank local registry with
  // updatedAt=now. The old bootstrap then treats that synthetic blank snapshot as
  // newer than the real Supabase payload. Prefer cloud whenever the local state is
  // missing/purged or clearly blank while cloud still contains assignments/locks.
  const shouldRecover = localMissing || localPurged || localEmptyAgainstCloud || localHasNoClassesAgainstCloud;
  if (!shouldRecover) {
    writeRecoveryDiagnostic({
      state: 'cloud-and-local-valid',
      cloudAssignments,
      localAssignments,
      cloudClasses: classCount(cloudRegistry),
      localClasses: classCount(localRegistry),
      cloudUpdatedAt: updatedAt,
    });
    return;
  }

  try {
    window.localStorage.setItem(storageKey, JSON.stringify(cloudRegistry));
  } catch (error) {
    console.warn('[SchoolClassRecovery] Could not seed local registry from cloud.', error);
    return;
  }

  writeRecoveryDiagnostic({
    state: 'recovered-from-cloud',
    reason: localPurged
      ? 'legacy-local-purge'
      : localEmptyAgainstCloud
        ? 'blank-local-shadowed-cloud'
        : localHasNoClassesAgainstCloud
          ? 'local-classes-missing'
          : 'local-registry-missing',
    cloudAssignments,
    previousLocalAssignments: localAssignments,
    cloudClasses: classCount(cloudRegistry),
    previousLocalClasses: classCount(localRegistry),
    cloudUpdatedAt: updatedAt,
  });

  // Brian Team may already have mounted from the synthetic blank snapshot. Reload
  // once so normal bootstrap starts from the recovered cloud payload.
  const guardKey = `${RECOVERY_GUARD_PREFIX}${user.id}`;
  let alreadyReloaded = false;
  try {
    alreadyReloaded = window.sessionStorage.getItem(guardKey) === 'done';
    if (!alreadyReloaded) window.sessionStorage.setItem(guardKey, 'done');
  } catch {
    // On the next pass localStorage is already recovered, so a reload loop cannot occur.
  }

  if (!alreadyReloaded) {
    window.setTimeout(() => window.location.reload(), 0);
  }
}

let recoveryScheduled = false;
function scheduleRecovery() {
  if (!isBrianTeamRoute() || recoveryScheduled) return;
  recoveryScheduled = true;
  Promise.resolve()
    .then(recoverCloudRegistry)
    .catch((error) => {
      console.warn('[SchoolClassRecovery] Unexpected recovery failure.', error);
      setCloudStatus('error', 'Không kiểm tra được Supabase', 'Đã xảy ra lỗi khi xác minh bản sao cloud.', 'LỖI KIỂM TRA');
    })
    .finally(() => { recoveryScheduled = false; });
}

let interactionCheckTimer = null;
function scheduleRecoveryAfterInteraction(event) {
  if (!isBrianTeamRoute()) return;
  const target = event?.target;
  if (!(target instanceof Element) || !target.closest('#bes-school-class-registry-host')) return;
  window.clearTimeout(interactionCheckTimer);
  interactionCheckTimer = window.setTimeout(scheduleRecovery, 1400);
}

retireLegacyPurge();

if (typeof window !== 'undefined') {
  installCloudStatusHostWatcher();
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', scheduleRecovery, { once: true });
  } else {
    scheduleRecovery();
  }
  window.addEventListener('hashchange', scheduleRecovery);
  window.addEventListener('bes-school-class-registry-updated', () => window.setTimeout(scheduleRecovery, 500));
  document.addEventListener('change', scheduleRecoveryAfterInteraction, true);
  document.addEventListener('click', scheduleRecoveryAfterInteraction, true);
}

export { recoverCloudRegistry, retireLegacyPurge };
