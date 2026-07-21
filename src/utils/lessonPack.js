import { supabase, isSupabaseConfigured } from './supabase.js';

export const LESSON_PACK_UPDATED_EVENT = 'bes-lesson-pack-updated';
export const LESSON_PACK_ACTIVE_EVENT = 'bes-lesson-pack-active';
const PREFIX = 'bes-lesson-packs-v1100';
const ACTIVE_PREFIX = 'bes-active-lesson-pack-v1100';
const MAX_PACKS = 80;
const MAX_ITEMS = 120;

function ownerKey(user) {
  return String(user?.id || user?.email || 'guest').trim().toLowerCase().replace(/[^a-z0-9@._-]+/g, '-') || 'guest';
}
function storageKey(user) { return `${PREFIX}:${ownerKey(user)}`; }
function activeKey(user) { return `${ACTIVE_PREFIX}:${ownerKey(user)}`; }
function uid(prefix = 'pack') { return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`; }
function nowIso() { return new Date().toISOString(); }

export const LESSON_PACK_ITEM_TYPES = [
  'warm-up', 'vocabulary', 'reading', 'listening', 'grammar', 'speaking', 'worksheet',
  'interactive', 'assessment', 'homework', 'exit-ticket', 'resource', 'other',
];

export function createLessonPackItem(raw = {}) {
  const type = LESSON_PACK_ITEM_TYPES.includes(raw.type) ? raw.type : 'other';
  return {
    id: String(raw.id || uid('item')),
    type,
    title: String(raw.title || 'New activity').slice(0, 180),
    sourceApp: String(raw.sourceApp || 'manual').slice(0, 80),
    sourceTitle: String(raw.sourceTitle || raw.sourceApp || 'Brian English Studio').slice(0, 160),
    content: typeof raw.content === 'string' ? raw.content.slice(0, 220000) : JSON.stringify(raw.content ?? '').slice(0, 220000),
    minutes: Math.max(1, Math.min(180, Number(raw.minutes) || 10)),
    mode: ['teacher-led', 'individual', 'pair', 'group', 'whole-class', 'homework'].includes(raw.mode) ? raw.mode : 'individual',
    level: String(raw.level || '').slice(0, 32),
    skill: String(raw.skill || '').slice(0, 80),
    objective: String(raw.objective || '').slice(0, 500),
    materials: String(raw.materials || '').slice(0, 1000),
    support: String(raw.support || '').slice(0, 3000),
    extension: String(raw.extension || '').slice(0, 3000),
    answerKey: String(raw.answerKey || '').slice(0, 12000),
    route: String(raw.route || '').slice(0, 300),
    metadata: raw.metadata && typeof raw.metadata === 'object' && !Array.isArray(raw.metadata) ? raw.metadata : {},
    status: ['draft', 'ready', 'used'].includes(raw.status) ? raw.status : 'draft',
    createdAt: raw.createdAt || nowIso(),
    updatedAt: nowIso(),
  };
}

export function createLessonPack(raw = {}, user = null) {
  const items = Array.isArray(raw.items) ? raw.items.map(createLessonPackItem).slice(0, MAX_ITEMS) : [];
  return {
    id: String(raw.id || uid('lesson-pack')),
    ownerId: String(raw.ownerId || user?.id || ''),
    title: String(raw.title || 'Untitled Lesson Pack').slice(0, 180),
    subject: String(raw.subject || 'English').slice(0, 80),
    className: String(raw.className || '').slice(0, 80),
    unit: String(raw.unit || '').slice(0, 120),
    level: String(raw.level || 'B1-B2').slice(0, 32),
    duration: Math.max(5, Math.min(600, Number(raw.duration) || items.reduce((sum, item) => sum + item.minutes, 0) || 45)),
    objectives: String(raw.objectives || '').slice(0, 6000),
    teacherNotes: String(raw.teacherNotes || '').slice(0, 12000),
    status: ['draft', 'ready', 'published', 'archived'].includes(raw.status) ? raw.status : 'draft',
    variant: ['support', 'standard', 'advanced'].includes(raw.variant) ? raw.variant : 'standard',
    items,
    createdAt: raw.createdAt || nowIso(),
    updatedAt: nowIso(),
  };
}

function safeRead(user) {
  if (typeof window === 'undefined') return [];
  try {
    const parsed = JSON.parse(window.localStorage.getItem(storageKey(user)) || '[]');
    return Array.isArray(parsed) ? parsed.map((pack) => createLessonPack(pack, user)).slice(0, MAX_PACKS) : [];
  } catch { return []; }
}

function writeLocal(user, packs) {
  const normalized = packs.map((pack) => createLessonPack(pack, user)).slice(0, MAX_PACKS);
  if (typeof window !== 'undefined') {
    try { window.localStorage.setItem(storageKey(user), JSON.stringify(normalized)); } catch { /* optional */ }
    window.dispatchEvent(new CustomEvent(LESSON_PACK_UPDATED_EVENT, { detail: normalized }));
  }
  return normalized;
}

export function listLessonPacks(user) { return safeRead(user); }
export function getLessonPack(user, id) { return safeRead(user).find((pack) => pack.id === id) || null; }
export function getActiveLessonPackId(user) {
  if (typeof window === 'undefined') return '';
  try { return window.localStorage.getItem(activeKey(user)) || ''; } catch { return ''; }
}
export function setActiveLessonPackId(user, id) {
  if (typeof window === 'undefined') return;
  try { window.localStorage.setItem(activeKey(user), String(id || '')); } catch { /* optional */ }
  window.dispatchEvent(new CustomEvent(LESSON_PACK_ACTIVE_EVENT, { detail: { id: String(id || '') } }));
}

export function saveLessonPackLocal(user, raw) {
  const pack = createLessonPack(raw, user);
  const packs = [pack, ...safeRead(user).filter((item) => item.id !== pack.id)];
  writeLocal(user, packs);
  setActiveLessonPackId(user, pack.id);
  return pack;
}

export function deleteLessonPackLocal(user, id) {
  const packs = writeLocal(user, safeRead(user).filter((pack) => pack.id !== id));
  if (getActiveLessonPackId(user) === id) setActiveLessonPackId(user, packs[0]?.id || '');
  return packs;
}

export async function deleteLessonPack(user, id) {
  const packs = deleteLessonPackLocal(user, id);
  if (!isSupabaseConfigured || !supabase || !user?.id) return { data: packs, mode: 'local', error: null };
  try {
    const { error } = await supabase.from('lesson_packs').update({ deleted_at: nowIso(), updated_at: nowIso() }).eq('id', id).eq('owner_id', user.id);
    if (error) throw error;
    return { data: packs, mode: 'cloud', error: null };
  } catch (error) {
    console.warn('[LessonPack] remote delete failed', error);
    return { data: packs, mode: 'local', error };
  }
}

export function duplicateLessonPackLocal(user, raw) {
  const source = createLessonPack(raw, user);
  const copy = createLessonPack({
    ...source,
    id: '',
    title: `${source.title} — Copy`,
    status: 'draft',
    items: source.items.map((item) => ({ ...item, id: '' })),
    createdAt: nowIso(),
  }, user);
  return saveLessonPackLocal(user, copy);
}

export function itemFromTransfer(transfer) {
  const source = String(transfer?.sourceApp || 'manual');
  const typeMap = {
    'reading-studio': 'reading',
    'exam-studio': 'assessment',
    'assessment-core': 'assessment',
    'student-practice': 'homework',
    'lesson-plan-ai': 'resource',
    'content-factory': 'interactive',
    'textlab-activities': 'interactive',
    'word2graph': 'vocabulary',
  };
  return createLessonPackItem({
    type: typeMap[source] || 'resource',
    title: transfer?.title || transfer?.sourceTitle || 'Imported activity',
    sourceApp: source,
    sourceTitle: transfer?.sourceTitle || source,
    content: transfer?.content || '',
    route: transfer?.metadata?.url || '',
    metadata: { ...(transfer?.metadata || {}), transferId: transfer?.id || '' },
  });
}

export function addItemToLessonPackLocal(user, packId, rawItem) {
  const packs = safeRead(user);
  const index = packs.findIndex((pack) => pack.id === packId);
  if (index < 0) return null;
  const item = createLessonPackItem(rawItem);
  const pack = createLessonPack({ ...packs[index], items: [...packs[index].items, item], updatedAt: nowIso() }, user);
  packs[index] = pack;
  writeLocal(user, packs);
  return pack;
}

export async function loadLessonPacks(user) {
  const local = safeRead(user);
  if (!isSupabaseConfigured || !supabase || !user?.id) return local;
  try {
    const { data, error } = await supabase
      .from('lesson_packs')
      .select('*, lesson_pack_items(*)')
      .eq('owner_id', user.id)
      .is('deleted_at', null)
      .order('updated_at', { ascending: false });
    if (error) throw error;
    const remote = (data || []).map((row) => createLessonPack({
      id: row.id,
      ownerId: row.owner_id,
      title: row.title,
      subject: row.subject,
      className: row.class_name,
      unit: row.unit,
      level: row.level,
      duration: row.duration_minutes,
      objectives: row.objectives,
      teacherNotes: row.teacher_notes,
      status: row.status,
      variant: row.variant,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      items: (row.lesson_pack_items || []).sort((a, b) => a.position - b.position).map((item) => ({
        id: item.id,
        type: item.item_type,
        title: item.title,
        sourceApp: item.source_app,
        sourceTitle: item.source_title,
        content: item.content,
        minutes: item.minutes,
        mode: item.delivery_mode,
        level: item.level,
        skill: item.skill,
        objective: item.objective,
        materials: item.materials,
        support: item.support_content,
        extension: item.extension_content,
        answerKey: item.answer_key,
        route: item.route,
        metadata: item.metadata,
        status: item.status,
        createdAt: item.created_at,
        updatedAt: item.updated_at,
      })),
    }, user));
    const merged = [...remote, ...local.filter((lp) => !remote.some((rp) => rp.id === lp.id))].slice(0, MAX_PACKS);
    writeLocal(user, merged);
    return merged;
  } catch (error) {
    console.warn('[LessonPack] remote load failed; using local fallback', error);
    return local;
  }
}

export async function saveLessonPack(user, raw) {
  const pack = saveLessonPackLocal(user, raw);
  if (!isSupabaseConfigured || !supabase || !user?.id) return { data: pack, mode: 'local', error: null };
  try {
    const { error: packError } = await supabase.from('lesson_packs').upsert({
      id: pack.id,
      owner_id: user.id,
      title: pack.title,
      subject: pack.subject,
      class_name: pack.className,
      unit: pack.unit,
      level: pack.level,
      duration_minutes: pack.duration,
      objectives: pack.objectives,
      teacher_notes: pack.teacherNotes,
      status: pack.status,
      variant: pack.variant,
      updated_at: nowIso(),
      deleted_at: null,
    });
    if (packError) throw packError;
    const { error: deleteError } = await supabase.from('lesson_pack_items').delete().eq('pack_id', pack.id);
    if (deleteError) throw deleteError;
    if (pack.items.length) {
      const { error: itemError } = await supabase.from('lesson_pack_items').insert(pack.items.map((item, position) => ({
        id: item.id,
        pack_id: pack.id,
        owner_id: user.id,
        position,
        item_type: item.type,
        title: item.title,
        source_app: item.sourceApp,
        source_title: item.sourceTitle,
        content: item.content,
        minutes: item.minutes,
        delivery_mode: item.mode,
        level: item.level,
        skill: item.skill,
        objective: item.objective,
        materials: item.materials,
        support_content: item.support,
        extension_content: item.extension,
        answer_key: item.answerKey,
        route: item.route,
        metadata: item.metadata,
        status: item.status,
        updated_at: nowIso(),
      })));
      if (itemError) throw itemError;
    }
    return { data: pack, mode: 'cloud', error: null };
  } catch (error) {
    console.warn('[LessonPack] remote save failed; local copy retained', error);
    return { data: pack, mode: 'local', error };
  }
}

export function subscribeLessonPacks(user, callback) {
  const handler = (event) => callback?.(event.detail || safeRead(user));
  window.addEventListener(LESSON_PACK_UPDATED_EVENT, handler);
  return () => window.removeEventListener(LESSON_PACK_UPDATED_EVENT, handler);
}
