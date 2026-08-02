function replaceRequired(code, pattern, replacement, label) {
  const next = code.replace(pattern, replacement);
  if (next === code) {
    throw new Error(`[Supabase egress optimization] Không tìm thấy đoạn nguồn: ${label}`);
  }
  return next;
}

const STORE_HELPERS = `const CLOUD_WORKSPACE_REFRESH_MS = 60 * 1000;
const CLOUD_BACKUP_LIMIT = 3;
const LOCAL_BACKUP_LIMIT = 12;
const cloudWorkspaceCheckedAt = new Map();
const cloudWorkspaceLoadPromises = new Map();
const cloudWorkspaceSaveSignatures = new Map();

function cloudWorkspaceCacheKey(user, workspaceId = 'default') {
  return \`${'${userKey(user)}'}:${'${safeText(workspaceId, \'default\')}'}\`;
}

function mergeWorkspaceBackups(localBackups = [], cloudBackups = []) {
  const merged = new Map();
  [...(localBackups || []), ...(cloudBackups || [])].forEach((item) => {
    if (!item?.id || merged.has(item.id)) return;
    merged.set(item.id, item);
  });
  return [...merged.values()]
    .sort((a, b) => (Date.parse(b?.createdAt || 0) || 0) - (Date.parse(a?.createdAt || 0) || 0))
    .slice(0, LOCAL_BACKUP_LIMIT);
}

function cloudPayloadForWorkspace(workspace) {
  return {
    ...workspace,
    backups: (workspace?.backups || []).slice(0, CLOUD_BACKUP_LIMIT),
  };
}

function fastContentHash(value) {
  const text = JSON.stringify(value);
  let hash = 2166136261;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return \`${'${text.length}'}:${'${hash >>> 0}'}\`;
}
`;

const SAVE_LOCAL_SOURCE = `export function saveLocalHomeroomWorkspace(workspace, user, options = {}) {
  const updatedAt = options.preserveUpdatedAt
    ? safeText(workspace?.updatedAt, nowIso())
    : nowIso();
  const normalized = normalizeHomeroomWorkspace({ ...workspace, updatedAt }, user);
  try {
    localStorage.setItem(workspaceKey(user, normalized.id), JSON.stringify(normalized));
    const items = readLocalIndex(user).filter((item) => item.id !== normalized.id);
    writeLocalIndex(user, [workspaceMeta(normalized), ...items].slice(0, 100));
    if (options.setCurrent !== false) setCurrentHomeroomWorkspaceId(user, normalized.id);
    if (options.silent !== true) emit();
  } catch (error) {
    console.warn('Could not save homeroom workspace locally:', error?.message || error);
  }
  return normalized;
}`;

const LIST_WORKSPACES_SOURCE = `export async function listHomeroomWorkspaces(user) {
  const localItems = listLocalHomeroomWorkspaces(user);
  if (!canUseCloudHomeroomStore() || !user?.id) return { ok: true, offline: true, items: localItems };

  // Danh mục chỉ lấy metadata. Không tải payload của toàn bộ lớp.
  const { data, error } = await supabase
    .from(TABLE)
    .select('workspace_id,class_name,school_year,status,semester,archived_at,updated_at')
    .eq('owner_id', user.id)
    .order('updated_at', { ascending: false });
  if (error) return { ok: false, offline: true, message: error.message, items: localItems };

  const merged = new Map(localItems.map((item) => [item.id, item]));
  (data || []).forEach((row) => {
    const current = merged.get(row.workspace_id) || {};
    const className = safeText(row.class_name, current.className || 'Chưa đặt tên');
    merged.set(row.workspace_id, {
      ...current,
      id: row.workspace_id,
      className,
      schoolYear: safeText(row.school_year, current.schoolYear),
      semester: safeText(row.semester, current.semester || 'Học kỳ I'),
      grade: safeText(current.grade, className.split('.')[0]),
      status: safeText(row.status, current.status || 'active'),
      archivedAt: row.archived_at || current.archivedAt || '',
      studentCount: Number(current.studentCount) || 0,
      updatedAt: row.updated_at || current.updatedAt || nowIso(),
      source: 'cloud-metadata',
    });
  });
  const items = [...merged.values()].sort((a, b) => (a.status === 'archived') - (b.status === 'archived') || String(b.updatedAt).localeCompare(String(a.updatedAt)));
  writeLocalIndex(user, items);
  return { ok: true, items, source: 'cloud-metadata' };
}`;

const LOAD_SAVE_SOURCE = `export async function loadHomeroomWorkspace(user, workspaceId = 'default', options = {}) {
  const local = loadLocalHomeroomWorkspace(user, workspaceId);
  if (!canUseCloudHomeroomStore() || !user?.id) {
    return { ok: true, offline: true, workspace: local || makeDefaultHomeroomWorkspace(user) };
  }

  const cacheKey = cloudWorkspaceCacheKey(user, workspaceId);
  const checkedAt = cloudWorkspaceCheckedAt.get(cacheKey) || 0;
  if (local && options.forceCloud !== true && Date.now() - checkedAt < CLOUD_WORKSPACE_REFRESH_MS) {
    return { ok: true, workspace: local, source: 'local-cache' };
  }
  if (cloudWorkspaceLoadPromises.has(cacheKey)) return cloudWorkspaceLoadPromises.get(cacheKey);

  const task = (async () => {
    const { data, error } = await supabase
      .from(TABLE)
      .select('workspace_id,class_name,school_year,status,semester,archived_at,payload,updated_at')
      .eq('owner_id', user.id)
      .eq('workspace_id', workspaceId)
      .maybeSingle();

    cloudWorkspaceCheckedAt.set(cacheKey, Date.now());
    if (error) {
      return { ok: false, offline: true, message: error.message, workspace: local || makeDefaultHomeroomWorkspace(user) };
    }
    if (!data?.payload) {
      return { ok: true, empty: true, workspace: local || makeDefaultHomeroomWorkspace(user) };
    }

    const cloud = normalizeHomeroomWorkspace({
      ...data.payload,
      backups: mergeWorkspaceBackups(local?.backups, data.payload?.backups),
    }, user);
    const cloudUpdated = Date.parse(data.updated_at || cloud.updatedAt || 0) || 0;
    const localUpdated = Date.parse(local?.updatedAt || 0) || 0;
    const selected = local && localUpdated > cloudUpdated
      ? { ...local, backups: mergeWorkspaceBackups(local.backups, cloud.backups) }
      : cloud;
    saveLocalHomeroomWorkspace(selected, user, {
      preserveUpdatedAt: true,
      setCurrent: false,
      silent: true,
    });
    return { ok: true, workspace: selected, source: selected === local ? 'local' : 'cloud' };
  })().finally(() => cloudWorkspaceLoadPromises.delete(cacheKey));

  cloudWorkspaceLoadPromises.set(cacheKey, task);
  return task;
}

export async function saveHomeroomWorkspace(workspace, user) {
  const normalized = saveLocalHomeroomWorkspace(workspace, user);
  if (!canUseCloudHomeroomStore() || !user?.id) {
    return { ok: true, offline: true, workspace: normalized };
  }

  const payload = cloudPayloadForWorkspace(normalized);
  const cacheKey = cloudWorkspaceCacheKey(user, payload.id);
  const signature = fastContentHash(payload);
  if (cloudWorkspaceSaveSignatures.get(cacheKey) === signature) {
    return { ok: true, workspace: normalized, source: 'cloud-deduplicated', skipped: true };
  }

  // Upsert không gọi .select(): PostgREST không trả ngược toàn bộ payload vừa lưu.
  const { error } = await supabase
    .from(TABLE)
    .upsert({
      owner_id: user.id,
      owner_email: safeText(user.email),
      workspace_id: payload.id,
      class_name: safeText(payload.classProfile?.className, 'Lớp chủ nhiệm'),
      school_year: safeText(payload.classProfile?.schoolYear),
      status: safeText(payload.status, 'active'),
      semester: safeText(payload.semester, 'Học kỳ I'),
      archived_at: payload.archivedAt || null,
      payload,
      updated_at: payload.updatedAt || nowIso(),
    }, { onConflict: 'owner_id,workspace_id' });

  if (error) return { ok: false, offline: true, message: error.message, workspace: normalized };
  cloudWorkspaceSaveSignatures.set(cacheKey, signature);
  cloudWorkspaceCheckedAt.set(cacheKey, Date.now());
  return { ok: true, workspace: normalized, source: 'cloud' };
}`;

const ASSIGNMENT_CACHE_HELPERS = `const ASSIGNED_CLASS_CACHE_TTL_MS = 5 * 60 * 1000;
const ASSIGNED_CLASS_CACHE_PREFIX = 'bes-assigned-class-cache-v1';
const assignedClassCache = new Map();
let retryShouldForce = false;

function assignedClassCacheKey(user) {
  return \`${'${ASSIGNED_CLASS_CACHE_PREFIX}'}:${'${userKey(user)}'}\`;
}

function readAssignedClassCache(user) {
  const key = assignedClassCacheKey(user);
  const memory = assignedClassCache.get(key);
  if (memory && Date.now() - memory.cachedAt < ASSIGNED_CLASS_CACHE_TTL_MS) return memory.items;
  try {
    const parsed = JSON.parse(sessionStorage.getItem(key) || 'null');
    if (parsed?.cachedAt && Array.isArray(parsed.items) && Date.now() - parsed.cachedAt < ASSIGNED_CLASS_CACHE_TTL_MS) {
      assignedClassCache.set(key, parsed);
      return parsed.items;
    }
  } catch { /* ignore */ }
  return null;
}

function writeAssignedClassCache(user, items) {
  const entry = { cachedAt: Date.now(), items };
  const key = assignedClassCacheKey(user);
  assignedClassCache.set(key, entry);
  try { sessionStorage.setItem(key, JSON.stringify(entry)); } catch { /* ignore */ }
}

function clearAssignedClassCache(user) {
  const key = assignedClassCacheKey(user);
  assignedClassCache.delete(key);
  try { sessionStorage.removeItem(key); } catch { /* ignore */ }
}
`;

const LIST_ASSIGNED_SOURCE = `export async function listAssignedSchoolClasses(user, options = {}) {
  if (!isSupabaseConfigured || !supabase || !user?.id) {
    return { ok: true, offline: true, items: [] };
  }
  if (options.force !== true) {
    const cachedItems = readAssignedClassCache(user);
    if (cachedItems) return { ok: true, items: cachedItems, source: 'session-cache' };
  } else {
    clearAssignedClassCache(user);
  }

  const result = await withTimeout(supabase.rpc(ASSIGNED_CLASSES_RPC));
  if (result?.error) {
    return {
      ok: false,
      items: [],
      message: result.error.message || 'Không tải được lớp đã phân công.',
      missingRpc: result.error.code === '42883' || /get_my_assigned_school_classes/i.test(result.error.message || ''),
    };
  }
  const byClass = new Map();
  (result?.data || []).forEach((row) => {
    const item = normalizeAssignedRow(row, user);
    if (!item) return;
    const current = byClass.get(item.className);
    if (!current || Date.parse(item.registryUpdatedAt || 0) >= Date.parse(current.registryUpdatedAt || 0)) {
      byClass.set(item.className, item);
    }
  });
  const items = [...byClass.values()];
  writeAssignedClassCache(user, items);
  return { ok: true, items, source: 'cloud' };
}`;

function optimizeHomeroomStore(code) {
  let next = code;
  if (!next.includes('CLOUD_WORKSPACE_REFRESH_MS')) {
    next = replaceRequired(
      next,
      "export const HOMEROOM_STORE_EVENT = 'bes-homeroom-store-updated';",
      "export const HOMEROOM_STORE_EVENT = 'bes-homeroom-store-updated';\n\n" + STORE_HELPERS,
      'homeroom store helpers',
    );
  }
  next = replaceRequired(
    next,
    /export function saveLocalHomeroomWorkspace\(workspace, user\) \{[\s\S]*?\n\}/,
    SAVE_LOCAL_SOURCE,
    'saveLocalHomeroomWorkspace',
  );
  next = replaceRequired(
    next,
    /export async function listHomeroomWorkspaces\(user\) \{[\s\S]*?\n\}\n\nexport async function createHomeroomWorkspace/,
    LIST_WORKSPACES_SOURCE + '\n\nexport async function createHomeroomWorkspace',
    'listHomeroomWorkspaces',
  );
  next = replaceRequired(
    next,
    /export async function loadHomeroomWorkspace\(user, workspaceId = 'default'\) \{[\s\S]*?\n\}\n\nexport async function saveHomeroomWorkspace\(workspace, user\) \{[\s\S]*?\n\}\n\nexport function addStudent/,
    LOAD_SAVE_SOURCE + '\n\nexport function addStudent',
    'load/save homeroom workspace',
  );
  return next;
}

function optimizeAssignedClassSync(code) {
  let next = code;
  if (!next.includes('loadLocalHomeroomWorkspace')) {
    next = replaceRequired(
      next,
      '  listHomeroomWorkspaces,\n  loadHomeroomWorkspace,',
      '  listHomeroomWorkspaces,\n  loadHomeroomWorkspace,\n  loadLocalHomeroomWorkspace,',
      'loadLocalHomeroomWorkspace import',
    );
  }
  if (!next.includes('ASSIGNED_CLASS_CACHE_TTL_MS')) {
    next = replaceRequired(
      next,
      'let previousHomeroomRoute = false;',
      'let previousHomeroomRoute = false;\n\n' + ASSIGNMENT_CACHE_HELPERS,
      'assigned class cache helpers',
    );
  }
  next = replaceRequired(
    next,
    /export async function listAssignedSchoolClasses\(user\) \{[\s\S]*?\n\}\n\nfunction signature/,
    LIST_ASSIGNED_SOURCE + '\n\nfunction signature',
    'listAssignedSchoolClasses',
  );
  next = replaceRequired(
    next,
    `async function loadExistingWorkspace(user, catalog, className) {
  const meta = catalog.find((item) => normalizeSchoolClassName(item.className) === className);
  if (!meta?.id) return { meta: null, workspace: null };
  const loaded = await loadHomeroomWorkspace(user, meta.id);
  return { meta, workspace: loaded.workspace || null };
}`,
    `async function loadExistingWorkspace(user, catalog, className) {
  const meta = catalog.find((item) => normalizeSchoolClassName(item.className) === className);
  if (!meta?.id) return { meta: null, workspace: null };
  const local = loadLocalHomeroomWorkspace(user, meta.id);
  if (local) return { meta, workspace: local };
  const loaded = await loadHomeroomWorkspace(user, meta.id);
  return { meta, workspace: loaded.workspace || null };
}`,
    'loadExistingWorkspace local first',
  );
  next = next.replace(
    '  const assignmentResult = await listAssignedSchoolClasses(user);',
    '  const assignmentResult = await listAssignedSchoolClasses(user, { force: options.force === true });',
  );
  next = next.replace(
    "  const key = `${userKey(user)}:${options.preferHomeroom === true ? 'prefer-homeroom' : 'sync-only'}`;",
    "  const key = `${userKey(user)}:${options.preferHomeroom === true ? 'prefer-homeroom' : 'sync-only'}:${options.force === true ? 'force' : 'cached'}`;",
  );
  next = replaceRequired(
    next,
    `function scheduleRetry(delay = RETRY_DELAY_MS, preferHomeroom = false) {
  retryShouldPreferHomeroom = retryShouldPreferHomeroom || preferHomeroom;
  window.clearTimeout(retryTimer);
  retryTimer = window.setTimeout(() => {
    const shouldPrefer = retryShouldPreferHomeroom;
    retryShouldPreferHomeroom = false;
    prepareAssignedSchoolClasses({ preferHomeroom: shouldPrefer }).catch(() => {});
  }, delay);
}`,
    `function scheduleRetry(delay = RETRY_DELAY_MS, preferHomeroom = false, force = false) {
  retryShouldPreferHomeroom = retryShouldPreferHomeroom || preferHomeroom;
  retryShouldForce = retryShouldForce || force;
  window.clearTimeout(retryTimer);
  retryTimer = window.setTimeout(() => {
    const shouldPrefer = retryShouldPreferHomeroom;
    const shouldForce = retryShouldForce;
    retryShouldPreferHomeroom = false;
    retryShouldForce = false;
    prepareAssignedSchoolClasses({ preferHomeroom: shouldPrefer, force: shouldForce }).catch(() => {});
  }, delay);
}`,
    'scheduleRetry',
  );
  next = next.replace(
    "  window.addEventListener(AUTH_EVENT, () => scheduleRetry(250, isHomeroomRoute()));",
    "  window.addEventListener(AUTH_EVENT, () => scheduleRetry(250, isHomeroomRoute(), true));",
  );
  next = next.replace(
    "  window.addEventListener('bes-school-class-registry-updated', () => scheduleRetry(120, false));",
    "  window.addEventListener('bes-school-class-registry-updated', () => scheduleRetry(120, false, true));",
  );
  return next;
}

function optimizeBackups(code) {
  return code
    .replace('Date.now() - lastBackupAt > 6 * 60 * 60 * 1000', 'Date.now() - lastBackupAt > 12 * 60 * 60 * 1000')
    .replaceAll('.slice(0, 30)', '.slice(0, 12)');
}

export default function supabaseEgressOptimizationPlugin() {
  return {
    name: 'brian-supabase-egress-optimization',
    enforce: 'pre',
    transform(code, id) {
      const cleanId = String(id || '').split('?')[0].replaceAll('\\', '/');
      if (cleanId.endsWith('/src/utils/homeroomStore.js')) return optimizeHomeroomStore(code);
      if (cleanId.endsWith('/src/assignedSchoolClassBootstrap.js')) return optimizeAssignedClassSync(code);
      if (cleanId.endsWith('/src/utils/homeroomPhase3.js')) return optimizeBackups(code);
      return null;
    },
  };
}
