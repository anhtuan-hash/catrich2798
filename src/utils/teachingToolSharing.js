import { isSupabaseConfigured, supabase } from './supabase.js';

const SOURCE_MODULE = 'teaching-tool-hub';
const SHARE_KIND = 'teaching-tool-share';
const SHARE_COLUMNS = 'id,title,description,item_type,status,priority,visibility,owner_id,created_by,assignee_ids,metadata,source_module,created_at,updated_at';

function cleanText(value) {
  return String(value || '').trim();
}

function uniqueIds(values = []) {
  return [...new Set((values || []).map(String).map((value) => value.trim()).filter(Boolean))];
}

function snapshotSite(site = {}) {
  return {
    id: cleanText(site.id),
    title: cleanText(site.title),
    url: cleanText(site.url),
    description: cleanText(site.description),
    category: cleanText(site.category) || 'Công cụ dạy học',
    icon: cleanText(site.icon) || '↗',
  };
}

function rowToSharedSite(row = {}, currentUser = null) {
  const metadata = row.metadata || {};
  const site = metadata.site || {};
  const url = cleanText(site.url);
  if (!url) return null;
  return {
    id: `shared-${row.id}`,
    sourceSiteId: cleanText(site.id),
    shareId: row.id,
    title: cleanText(site.title || row.title) || 'Website được chia sẻ',
    url,
    description: cleanText(site.description || row.description),
    category: cleanText(site.category) || 'Được TTCM chia sẻ',
    icon: cleanText(site.icon) || '↗',
    isActive: true,
    isPinned: false,
    isShared: true,
    sharedById: cleanText(row.created_by || row.owner_id),
    sharedByName: cleanText(metadata.shared_by_name) || 'TTCM',
    sharedAt: row.created_at || row.updated_at || '',
    recipientId: currentUser?.id || '',
    order: Number.MAX_SAFE_INTEGER,
  };
}

export async function shareTeachingToolSite({ site, currentUser, recipientIds = [] } = {}) {
  if (!isSupabaseConfigured) throw new Error('Supabase chưa được cấu hình nên chưa thể chia sẻ giữa các tài khoản.');
  if (!currentUser?.id) throw new Error('Bạn cần đăng nhập để chia sẻ website.');
  const recipients = uniqueIds(recipientIds).filter((id) => id !== String(currentUser.id));
  if (!recipients.length) throw new Error('Hãy chọn ít nhất một giáo viên.');
  const siteSnapshot = snapshotSite(site);
  if (!siteSnapshot.url) throw new Error('Website chưa có URL hợp lệ.');

  const now = new Date().toISOString();
  const payloads = recipients.map((recipientId) => ({
    title: `Teaching Tool · ${siteSnapshot.title || siteSnapshot.url}`,
    description: siteSnapshot.description || `Website được ${currentUser.name || currentUser.email || 'TTCM'} chia sẻ từ Teaching Tool Hub.`,
    item_type: 'task',
    status: 'assigned',
    priority: 'normal',
    visibility: 'restricted',
    owner_id: currentUser.id,
    created_by: currentUser.id,
    assignee_ids: [recipientId],
    watcher_ids: [],
    due_at: null,
    attachments: [],
    source_module: SOURCE_MODULE,
    metadata: {
      kind: SHARE_KIND,
      site: siteSnapshot,
      teaching_tool_site_id: siteSnapshot.id || null,
      shared_by_name: currentUser.name || currentUser.email || 'TTCM',
      shared_by_role: currentUser.role || 'department_head',
      shared_at: now,
      notify_assignee: true,
    },
  }));

  const { data, error } = await supabase
    .from('work_hub_items')
    .insert(payloads)
    .select(SHARE_COLUMNS);
  if (error) throw new Error(error.message || 'Không thể chia sẻ website cho giáo viên.');
  return { ok: true, count: data?.length || payloads.length, rows: data || [] };
}

export async function listTeachingToolShares(currentUser) {
  if (!isSupabaseConfigured || !currentUser?.id) return [];
  const { data, error } = await supabase
    .from('work_hub_items')
    .select(SHARE_COLUMNS)
    .eq('source_module', SOURCE_MODULE)
    .contains('assignee_ids', [currentUser.id])
    .order('created_at', { ascending: false })
    .limit(120);
  if (error) return [];

  const seen = new Set();
  const sites = [];
  for (const row of data || []) {
    if (row?.metadata?.kind !== SHARE_KIND) continue;
    const site = rowToSharedSite(row, currentUser);
    if (!site) continue;
    const key = site.sourceSiteId || site.url.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    sites.push(site);
  }
  return sites;
}

export function mergeTeachingToolSites(localSites = [], sharedSites = []) {
  const merged = [];
  const keys = new Map();
  for (const site of localSites || []) {
    const key = cleanText(site.url).toLowerCase() || cleanText(site.id);
    if (!key) continue;
    keys.set(key, merged.length);
    merged.push(site);
  }
  for (const site of sharedSites || []) {
    const key = cleanText(site.url).toLowerCase() || cleanText(site.id);
    if (!key) continue;
    if (keys.has(key)) {
      const index = keys.get(key);
      merged[index] = {
        ...merged[index],
        isShared: true,
        sharedByName: site.sharedByName,
        sharedAt: site.sharedAt,
        shareId: site.shareId,
      };
      continue;
    }
    keys.set(key, merged.length);
    merged.push(site);
  }
  return merged;
}
