import { isSupabaseConfigured, supabase } from './supabase.js';
import { createLessonPack } from './lessonPack.js';

export const CLASSROOM_UPDATED_EVENT = 'bes-classroom-delivery-updated';
export const CLASSROOM_SESSION_STATUSES = ['draft', 'open', 'live', 'paused', 'ended'];
export const CLASSROOM_RESPONSE_MODES = ['none', 'check-in', 'short-answer', 'multiple-choice', 'poll'];
const MAX_LOCAL_SESSIONS = 30;
const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

function nowIso() { return new Date().toISOString(); }
function uid(prefix = 'classroom') {
  if (globalThis.crypto?.randomUUID) return `${prefix}-${globalThis.crypto.randomUUID()}`;
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}
function storageKey(user) { return `bes-classroom-sessions:${user?.id || user?.email || 'guest'}`; }
function cleanCode(value) { return String(value || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8); }
function makeJoinCode(length = 6) {
  const bytes = new Uint8Array(length);
  if (globalThis.crypto?.getRandomValues) globalThis.crypto.getRandomValues(bytes);
  else for (let i = 0; i < length; i += 1) bytes[i] = Math.floor(Math.random() * 255);
  return Array.from(bytes, (value) => CODE_ALPHABET[value % CODE_ALPHABET.length]).join('');
}
function normalizeOptions(value) {
  if (Array.isArray(value)) return value.map((item) => String(item || '').trim()).filter(Boolean).slice(0, 8);
  return String(value || '').split(/\r?\n|\|/).map((item) => item.trim()).filter(Boolean).slice(0, 8);
}

export function createClassroomSession(raw = {}, pack = null, user = null) {
  const lessonPack = pack ? createLessonPack(pack, user) : null;
  const teamCount = Math.max(1, Math.min(8, Number(raw.teamCount || raw.settings?.teamCount) || 4));
  const defaultTeams = Array.from({ length: teamCount }, (_, index) => ({
    id: uid('team'),
    name: `Team ${index + 1}`,
    score: 0,
    position: index,
  }));
  return {
    id: String(raw.id || uid('session')),
    hostId: String(raw.hostId || user?.id || ''),
    lessonPackId: String(raw.lessonPackId || lessonPack?.id || ''),
    title: String(raw.title || lessonPack?.title || 'Classroom Session').slice(0, 180),
    joinCode: cleanCode(raw.joinCode) || makeJoinCode(),
    status: CLASSROOM_SESSION_STATUSES.includes(raw.status) ? raw.status : 'draft',
    currentItemIndex: Math.max(0, Number(raw.currentItemIndex) || 0),
    currentItemStartedAt: raw.currentItemStartedAt || null,
    currentItemDurationSeconds: Math.max(0, Number(raw.currentItemDurationSeconds) || 0),
    packSnapshot: lessonPack || raw.packSnapshot || null,
    settings: {
      allowLateJoin: raw.settings?.allowLateJoin !== false,
      showTeamScore: raw.settings?.showTeamScore !== false,
      anonymousNames: Boolean(raw.settings?.anonymousNames),
      itemOverrides: raw.settings?.itemOverrides && typeof raw.settings.itemOverrides === 'object' ? raw.settings.itemOverrides : {},
      ...(raw.settings || {}),
    },
    teams: Array.isArray(raw.teams) && raw.teams.length ? raw.teams.map((team, index) => ({
      id: String(team.id || uid('team')),
      name: String(team.name || `Team ${index + 1}`).slice(0, 80),
      score: Number(team.score) || 0,
      position: Number(team.position) || index,
    })) : defaultTeams,
    createdAt: raw.createdAt || nowIso(),
    updatedAt: nowIso(),
    startedAt: raw.startedAt || null,
    endedAt: raw.endedAt || null,
  };
}

function readLocal(user) {
  if (typeof window === 'undefined') return [];
  try {
    const rows = JSON.parse(window.localStorage.getItem(storageKey(user)) || '[]');
    return Array.isArray(rows) ? rows.map((row) => createClassroomSession(row, row.packSnapshot, user)).slice(0, MAX_LOCAL_SESSIONS) : [];
  } catch { return []; }
}
function writeLocal(user, sessions) {
  const normalized = sessions.map((row) => createClassroomSession(row, row.packSnapshot, user)).slice(0, MAX_LOCAL_SESSIONS);
  if (typeof window !== 'undefined') {
    try { window.localStorage.setItem(storageKey(user), JSON.stringify(normalized)); } catch { /* optional */ }
    window.dispatchEvent(new CustomEvent(CLASSROOM_UPDATED_EVENT, { detail: normalized }));
  }
  return normalized;
}
export function listLocalClassroomSessions(user) { return readLocal(user); }
export function saveClassroomSessionLocal(user, raw) {
  const session = createClassroomSession(raw, raw.packSnapshot, user);
  writeLocal(user, [session, ...readLocal(user).filter((item) => item.id !== session.id)]);
  return session;
}

function sessionToRow(session, user) {
  return {
    id: session.id,
    host_id: user?.id || session.hostId,
    lesson_pack_id: session.lessonPackId || null,
    title: session.title,
    join_code: session.joinCode,
    status: session.status,
    current_item_index: session.currentItemIndex,
    current_item_started_at: session.currentItemStartedAt,
    current_item_duration_seconds: session.currentItemDurationSeconds,
    pack_snapshot: session.packSnapshot || {},
    settings: session.settings || {},
    started_at: session.startedAt,
    ended_at: session.endedAt,
    updated_at: nowIso(),
  };
}
function rowToSession(row, user, teams = []) {
  return createClassroomSession({
    id: row.id,
    hostId: row.host_id,
    lessonPackId: row.lesson_pack_id,
    title: row.title,
    joinCode: row.join_code,
    status: row.status,
    currentItemIndex: row.current_item_index,
    currentItemStartedAt: row.current_item_started_at,
    currentItemDurationSeconds: row.current_item_duration_seconds,
    packSnapshot: row.pack_snapshot,
    settings: row.settings,
    teams,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    startedAt: row.started_at,
    endedAt: row.ended_at,
  }, row.pack_snapshot, user);
}

export async function loadClassroomSessions(user) {
  const local = readLocal(user);
  if (!isSupabaseConfigured || !supabase || !user?.id) return local;
  try {
    const { data: rows, error } = await supabase.from('classroom_sessions').select('*').eq('host_id', user.id).order('updated_at', { ascending: false }).limit(MAX_LOCAL_SESSIONS);
    if (error) throw error;
    const ids = (rows || []).map((row) => row.id);
    let teamRows = [];
    if (ids.length) {
      const result = await supabase.from('classroom_teams').select('*').in('session_id', ids).order('position');
      if (!result.error) teamRows = result.data || [];
    }
    const remote = (rows || []).map((row) => rowToSession(row, user, teamRows.filter((team) => team.session_id === row.id).map((team) => ({ id: team.id, name: team.name, score: team.score, position: team.position }))));
    const merged = [...remote, ...local.filter((item) => !remote.some((remoteItem) => remoteItem.id === item.id))];
    writeLocal(user, merged);
    return merged;
  } catch (error) {
    console.warn('[ClassroomDelivery] load failed; using local sessions', error);
    return local;
  }
}

export async function saveClassroomSession(user, raw) {
  const session = saveClassroomSessionLocal(user, raw);
  if (!isSupabaseConfigured || !supabase || !user?.id) return { data: session, mode: 'local', error: null };
  try {
    const { error } = await supabase.from('classroom_sessions').upsert(sessionToRow(session, user));
    if (error) throw error;
    if (session.teams?.length) {
      const { error: teamError } = await supabase.from('classroom_teams').upsert(session.teams.map((team, index) => ({
        id: team.id,
        session_id: session.id,
        host_id: user.id,
        name: team.name,
        score: Number(team.score) || 0,
        position: index,
        updated_at: nowIso(),
      })));
      if (teamError) throw teamError;
    }
    return { data: session, mode: 'cloud', error: null };
  } catch (error) {
    console.warn('[ClassroomDelivery] cloud save failed', error);
    return { data: session, mode: 'local', error };
  }
}

export async function loadClassroomRoster(sessionId) {
  if (!isSupabaseConfigured || !supabase || !sessionId) return { participants: [], responses: [], teams: [] };
  const [participantsResult, responsesResult, teamsResult] = await Promise.all([
    supabase.from('classroom_participants').select('*').eq('session_id', sessionId).order('joined_at'),
    supabase.from('classroom_responses').select('*').eq('session_id', sessionId).order('submitted_at', { ascending: false }).limit(500),
    supabase.from('classroom_teams').select('*').eq('session_id', sessionId).order('position'),
  ]);
  return {
    participants: participantsResult.error ? [] : participantsResult.data || [],
    responses: responsesResult.error ? [] : responsesResult.data || [],
    teams: teamsResult.error ? [] : teamsResult.data || [],
  };
}

export async function updateParticipantTeam(participantId, teamId) {
  if (!supabase || !participantId) return null;
  const { data, error } = await supabase.from('classroom_participants').update({ team_id: teamId || null, updated_at: nowIso() }).eq('id', participantId).select().single();
  if (error) throw error;
  return data;
}
export async function updateTeamScore(teamId, score) {
  if (!supabase || !teamId) return null;
  const { data, error } = await supabase.from('classroom_teams').update({ score: Number(score) || 0, updated_at: nowIso() }).eq('id', teamId).select().single();
  if (error) throw error;
  return data;
}
export async function scoreClassroomResponse(responseId, score, isCorrect = null) {
  if (!supabase || !responseId) return null;
  const patch = { score: Number(score) || 0, reviewed_at: nowIso(), updated_at: nowIso() };
  if (typeof isCorrect === 'boolean') patch.is_correct = isCorrect;
  const { data, error } = await supabase.from('classroom_responses').update(patch).eq('id', responseId).select().single();
  if (error) throw error;
  return data;
}

export function subscribeClassroomSession(sessionId, onChange) {
  if (!supabase || !sessionId) return () => {};
  const channel = supabase.channel(`classroom-${sessionId}-${Math.random().toString(36).slice(2)}`)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'classroom_participants', filter: `session_id=eq.${sessionId}` }, () => onChange?.('participants'))
    .on('postgres_changes', { event: '*', schema: 'public', table: 'classroom_responses', filter: `session_id=eq.${sessionId}` }, () => onChange?.('responses'))
    .on('postgres_changes', { event: '*', schema: 'public', table: 'classroom_teams', filter: `session_id=eq.${sessionId}` }, () => onChange?.('teams'))
    .subscribe();
  return () => { supabase.removeChannel(channel); };
}

export function getClassroomJoinUrl(joinCode) {
  if (typeof window === 'undefined') return `#/classroom-join?code=${cleanCode(joinCode)}`;
  const base = `${window.location.origin}${window.location.pathname}`;
  return `${base}#/classroom-join?code=${cleanCode(joinCode)}`;
}
export function getQrImageUrl(joinCode, size = 260) {
  const data = encodeURIComponent(getClassroomJoinUrl(joinCode));
  return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&margin=8&data=${data}`;
}

export async function joinClassroomSession(joinCode, displayName) {
  if (!supabase) throw new Error('Supabase chưa được cấu hình.');
  const { data, error } = await supabase.rpc('classroom_join_session', { p_join_code: cleanCode(joinCode), p_display_name: String(displayName || '').trim().slice(0, 80) });
  if (error) throw error;
  return data;
}
export async function getClassroomPublicState(joinCode, participantToken) {
  if (!supabase) throw new Error('Supabase chưa được cấu hình.');
  const { data, error } = await supabase.rpc('classroom_get_public_state', { p_join_code: cleanCode(joinCode), p_participant_token: participantToken || null });
  if (error) throw error;
  return data;
}
export async function submitClassroomResponse(joinCode, participantToken, itemId, response, elapsedMs = 0) {
  if (!supabase) throw new Error('Supabase chưa được cấu hình.');
  const { data, error } = await supabase.rpc('classroom_submit_response', {
    p_join_code: cleanCode(joinCode),
    p_participant_token: participantToken,
    p_item_id: String(itemId || ''),
    p_response: response && typeof response === 'object' ? response : { value: response },
    p_elapsed_ms: Math.max(0, Number(elapsedMs) || 0),
  });
  if (error) throw error;
  return data;
}
export async function pingClassroomParticipant(joinCode, participantToken) {
  if (!supabase || !participantToken) return null;
  const { data } = await supabase.rpc('classroom_ping_participant', { p_join_code: cleanCode(joinCode), p_participant_token: participantToken });
  return data;
}

function escapeHtml(value) { return String(value || '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char])); }
export function buildOfflineClassroomHtml(session, language = 'vi') {
  const pack = session.packSnapshot || { title: session.title, items: [] };
  const payload = JSON.stringify({ title: session.title, pack, teams: session.teams || [] }).replace(/</g, '\\u003c');
  return `<!doctype html><html lang="${language}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(session.title)}</title><style>
  *{box-sizing:border-box}body{margin:0;font-family:Arial,sans-serif;background:#eef5ff;color:#10264a}.app{height:100vh;display:grid;grid-template-rows:auto 1fr auto}.top{background:#123a6d;color:white;padding:16px 22px;display:flex;gap:14px;align-items:center}.top h1{margin:0;font-size:22px}.top small{opacity:.7}.stage{padding:5vh 8vw;display:flex;align-items:center;justify-content:center;text-align:center}.card{width:min(1100px,100%);background:#fff;border:1px solid #c9daf0;border-radius:24px;padding:34px}.meta{display:flex;justify-content:center;gap:8px;flex-wrap:wrap}.meta span{background:#e8f0ff;border-radius:999px;padding:7px 10px}.card h2{font-size:clamp(38px,6vw,78px);margin:24px 0}.content{font-size:clamp(20px,2.3vw,32px);white-space:pre-wrap;line-height:1.55}.bottom{background:#fff;border-top:1px solid #c9daf0;padding:14px 20px;display:grid;grid-template-columns:auto 1fr auto;align-items:center}.bottom>button{width:54px;height:54px;border:1px solid #c9daf0;border-radius:16px;background:#f7faff;font-size:25px}.timer{justify-self:center;background:#123a6d;color:#fff;border-radius:18px;padding:9px 14px;display:flex;align-items:center;gap:10px}.timer b{font-size:27px}.timer button{border:0;background:rgba(255,255,255,.16);color:#fff;border-radius:10px;padding:9px}.scores{position:fixed;right:16px;top:80px;display:grid;gap:7px}.team{background:#fff;border:1px solid #c9daf0;border-radius:14px;padding:10px;display:grid;grid-template-columns:1fr auto auto auto;gap:7px;align-items:center;min-width:230px}.team button{border:0;border-radius:8px;padding:6px 9px}.notice{position:fixed;left:16px;bottom:82px;background:#fff7df;border:1px solid #efd18f;padding:10px 13px;border-radius:12px}@media(max-width:720px){.scores{position:static;padding:10px 16px}.app{height:auto;min-height:100vh}.stage{padding:20px}.card h2{font-size:40px}}
  </style></head><body><div class="app"><header class="top"><div><h1 id="packTitle"></h1><small>Offline Classroom Package · ${escapeHtml(session.joinCode)}</small></div></header><aside id="scores" class="scores"></aside><main class="stage"><section class="card"><div id="meta" class="meta"></div><h2 id="title"></h2><div id="content" class="content"></div></section></main><footer class="bottom"><button onclick="move(-1)">←</button><div class="timer"><b id="clock">00:00</b><button onclick="toggle()">▶ / Ⅱ</button><button onclick="resetTimer()">↺</button></div><button onclick="move(1)">→</button></footer></div><div class="notice">${language === 'vi' ? 'Gói offline dùng để trình chiếu, timer và chấm điểm đội. Thu câu trả lời trực tuyến cần website.' : 'Offline package supports presentation, timer and team scores. Online response collection requires the website.'}</div><script>
  const DATA=${payload};let index=0,remaining=0,running=false,timer=null;const scores=(DATA.teams||[]).map(t=>({...t,score:Number(t.score)||0}));
  function item(){return DATA.pack.items[index]||{title:'No activity',content:'',minutes:1,type:'other',mode:'whole-class'}}
  function render(){const it=item();document.getElementById('packTitle').textContent=DATA.pack.title||DATA.title;document.getElementById('title').textContent=it.title;document.getElementById('content').textContent=it.content||'';document.getElementById('meta').innerHTML='<span>'+(index+1)+'/'+Math.max(1,DATA.pack.items.length)+'</span><span>'+it.type+'</span><span>'+it.mode+'</span>';document.getElementById('scores').innerHTML=scores.map((t,i)=>'<div class="team"><b>'+t.name+'</b><strong>'+t.score+'</strong><button onclick="score('+i+',10)">+10</button><button onclick="score('+i+',-10)">−10</button></div>').join('');clock()}
  function move(delta){index=Math.max(0,Math.min(Math.max(0,DATA.pack.items.length-1),index+delta));resetTimer();render()}
  function resetTimer(){running=false;clearInterval(timer);remaining=(Number(item().minutes)||1)*60;clock()}
  function toggle(){running=!running;clearInterval(timer);if(running)timer=setInterval(()=>{remaining=Math.max(0,remaining-1);clock();if(!remaining){running=false;clearInterval(timer)}},1000)}
  function clock(){document.getElementById('clock').textContent=String(Math.floor(remaining/60)).padStart(2,'0')+':'+String(remaining%60).padStart(2,'0')}
  function score(i,value){scores[i].score+=value;render()}resetTimer();render();
  </script></body></html>`;
}

export function downloadClassroomFile(name, content, type = 'text/html') {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = name;
  anchor.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export function classroomFileName(value) {
  return String(value || 'classroom-session').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '').slice(0, 80) || 'classroom-session';
}
