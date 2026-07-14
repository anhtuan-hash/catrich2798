import React, { useEffect, useMemo, useRef, useState } from 'react';
import { loadLessonPacks } from '../utils/lessonPack.js';
import {
  buildOfflineClassroomHtml,
  classroomFileName,
  createClassroomSession,
  downloadClassroomFile,
  getClassroomJoinUrl,
  getQrImageUrl,
  loadClassroomRoster,
  loadClassroomSessions,
  saveClassroomSession,
  scoreClassroomResponse,
  subscribeClassroomSession,
  updateParticipantTeam,
  updateTeamScore,
} from '../utils/classroomDelivery.js';
import { useRuntimeCore } from '../services/runtime/useRuntimeCore.js';

const RESPONSE_MODES = [
  ['none', 'Không thu câu trả lời', 'No response'],
  ['check-in', 'Điểm danh / đã xong', 'Check-in / done'],
  ['short-answer', 'Trả lời ngắn', 'Short answer'],
  ['multiple-choice', 'Trắc nghiệm', 'Multiple choice'],
  ['poll', 'Bình chọn', 'Poll'],
];
const TABS = [
  ['setup', 'Thiết lập', 'Setup'],
  ['lobby', 'Phòng chờ', 'Lobby'],
  ['live', 'Điều khiển lớp', 'Live control'],
  ['results', 'Kết quả', 'Results'],
];

function minutesToClock(seconds) {
  const safe = Math.max(0, Math.floor(Number(seconds) || 0));
  return `${String(Math.floor(safe / 60)).padStart(2, '0')}:${String(safe % 60).padStart(2, '0')}`;
}
function escapeCsv(value) { const text = String(value ?? ''); return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text; }
function responseText(row) {
  const value = row?.response?.value ?? row?.response?.choice ?? row?.response?.label ?? '';
  return Array.isArray(value) ? value.join(', ') : String(value || '');
}

function SessionList({ sessions, selectedId, onSelect, onCreate, language }) {
  return <aside className="cd-sidebar">
    <div className="cd-brand"><span>CD</span><div><b>Classroom Delivery</b><small>V11.1 · Live classroom</small></div></div>
    <button className="cd-new" onClick={onCreate}>＋ {language === 'vi' ? 'Tạo phiên học' : 'New classroom session'}</button>
    <div className="cd-session-list">
      {sessions.map((session) => <button key={session.id} className={selectedId === session.id ? 'active' : ''} onClick={() => onSelect(session.id)}>
        <span className={`status ${session.status}`} />
        <div><b>{session.title}</b><small>{session.joinCode} · {session.status}</small></div>
      </button>)}
      {!sessions.length ? <p>{language === 'vi' ? 'Chưa có phiên học.' : 'No classroom sessions yet.'}</p> : null}
    </div>
  </aside>;
}

export default function ClassroomDelivery({ currentUser, language = 'vi' }) {
  const runtime = useRuntimeCore();
  const [packs, setPacks] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [selectedId, setSelectedId] = useState('');
  const [tab, setTab] = useState('setup');
  const [roster, setRoster] = useState({ participants: [], responses: [], teams: [] });
  const [notice, setNotice] = useState('');
  const [saving, setSaving] = useState(false);
  const [timerTick, setTimerTick] = useState(Date.now());
  const saveTimer = useRef(null);
  const query = useMemo(() => new URLSearchParams((window.location.hash.split('?')[1] || '')), []);

  useEffect(() => {
    let mounted = true;
    Promise.all([loadLessonPacks(currentUser), loadClassroomSessions(currentUser)]).then(([packRows, sessionRows]) => {
      if (!mounted) return;
      setPacks(packRows);
      setSessions(sessionRows);
      const requestedPackId = query.get('pack') || '';
      if (sessionRows.length) setSelectedId(sessionRows[0].id);
      else if (packRows.length && requestedPackId) {
        const pack = packRows.find((item) => item.id === requestedPackId) || packRows[0];
        const session = createClassroomSession({}, pack, currentUser);
        saveClassroomSession(currentUser, session).then(({ data }) => { if (mounted) { setSessions([data]); setSelectedId(data.id); } });
      }
    });
    return () => { mounted = false; window.clearTimeout(saveTimer.current); };
  }, [currentUser?.id, currentUser?.email]);

  const session = useMemo(() => sessions.find((item) => item.id === selectedId) || sessions[0] || null, [sessions, selectedId]);
  const activePack = session?.packSnapshot || packs.find((pack) => pack.id === session?.lessonPackId) || null;
  const currentItem = activePack?.items?.[session?.currentItemIndex || 0] || null;
  const currentOverride = session?.settings?.itemOverrides?.[currentItem?.id] || { responseMode: 'none', options: [] };
  const currentResponses = useMemo(() => roster.responses.filter((row) => row.item_id === currentItem?.id), [roster.responses, currentItem?.id]);
  const respondedIds = useMemo(() => new Set(currentResponses.map((row) => row.participant_id)), [currentResponses]);

  const flash = (message) => {
    setNotice(message);
    window.clearTimeout(flash.timer);
    flash.timer = window.setTimeout(() => setNotice(''), 2600);
  };

  const refreshRoster = async () => {
    if (!session?.id) return;
    const data = await loadClassroomRoster(session.id);
    setRoster(data);
    if (data.teams.length) {
      setSessions((rows) => rows.map((row) => row.id === session.id ? { ...row, teams: data.teams.map((team) => ({ id: team.id, name: team.name, score: team.score, position: team.position })) } : row));
    }
  };

  useEffect(() => {
    if (!session?.id) return undefined;
    refreshRoster();
    const unsubscribe = subscribeClassroomSession(session.id, refreshRoster);
    const poll = window.setInterval(refreshRoster, 5000);
    return () => { unsubscribe(); window.clearInterval(poll); };
  }, [session?.id]);

  useEffect(() => {
    const interval = window.setInterval(() => setTimerTick(Date.now()), 1000);
    return () => window.clearInterval(interval);
  }, []);

  const persist = async (next, immediate = false) => {
    setSessions((rows) => [next, ...rows.filter((row) => row.id !== next.id)]);
    window.clearTimeout(saveTimer.current);
    const run = async () => {
      setSaving(true);
      const result = await saveClassroomSession(currentUser, next);
      setSaving(false);
      setSessions((rows) => [result.data, ...rows.filter((row) => row.id !== result.data.id)]);
      return result;
    };
    if (immediate) return run();
    saveTimer.current = window.setTimeout(run, 700);
    return null;
  };

  const patchSession = (patch, immediate = false) => {
    if (!session) return;
    persist({ ...session, ...patch, updatedAt: new Date().toISOString() }, immediate);
  };

  const createNew = () => {
    const pack = packs[0];
    if (!pack) { flash(language === 'vi' ? 'Hãy tạo Lesson Pack trước.' : 'Create a Lesson Pack first.'); return; }
    const next = createClassroomSession({}, pack, currentUser);
    persist(next, true);
    setSelectedId(next.id);
    setTab('setup');
  };

  const selectPack = (packId) => {
    const pack = packs.find((item) => item.id === packId);
    if (!pack || !session) return;
    patchSession({ lessonPackId: pack.id, title: pack.title, packSnapshot: pack, currentItemIndex: 0 }, true);
  };

  const setStatus = async (status) => {
    if (!session) return;
    const now = new Date().toISOString();
    const patch = { status };
    if (status === 'open' && !session.startedAt) patch.startedAt = now;
    if (status === 'ended') patch.endedAt = now;
    await patchSession(patch, true);
    if (status === 'open') setTab('lobby');
    if (status === 'live') setTab('live');
    flash(language === 'vi' ? `Đã chuyển sang trạng thái ${status}.` : `Session is now ${status}.`);
  };

  const startItem = (index) => {
    const item = activePack?.items?.[index];
    if (!item) return;
    patchSession({
      status: 'live',
      currentItemIndex: index,
      currentItemStartedAt: new Date().toISOString(),
      currentItemDurationSeconds: Math.max(30, Number(item.minutes || 1) * 60),
    }, true);
  };

  const setOverride = (patch) => {
    if (!session || !currentItem) return;
    const itemOverrides = { ...(session.settings?.itemOverrides || {}) };
    itemOverrides[currentItem.id] = { ...currentOverride, ...patch };
    patchSession({ settings: { ...session.settings, itemOverrides } });
  };

  const updateTeams = (count) => {
    if (!session) return;
    const nextCount = Math.max(1, Math.min(8, Number(count) || 1));
    const current = session.teams || [];
    const teams = Array.from({ length: nextCount }, (_, index) => current[index] || { id: `team-${crypto.randomUUID?.() || `${Date.now()}-${index}`}`, name: `Team ${index + 1}`, score: 0, position: index });
    patchSession({ teams, settings: { ...session.settings, teamCount: nextCount } });
  };

  const changeTeamScore = async (team, delta) => {
    const score = Number(team.score || 0) + delta;
    await updateTeamScore(team.id, score);
    setRoster((current) => ({ ...current, teams: current.teams.map((row) => row.id === team.id ? { ...row, score } : row) }));
    setSessions((rows) => rows.map((row) => row.id === session.id ? { ...row, teams: row.teams.map((item) => item.id === team.id ? { ...item, score } : item) } : row));
  };

  const assignTeam = async (participantId, teamId) => {
    await updateParticipantTeam(participantId, teamId);
    refreshRoster();
  };

  const markResponse = async (row, correct) => {
    const score = correct ? 10 : 0;
    await scoreClassroomResponse(row.id, score, correct);
    refreshRoster();
  };

  const exportResults = () => {
    const header = ['Name', 'Team', 'Activity', 'Response', 'Score', 'Correct', 'Submitted at'];
    const teamMap = Object.fromEntries(roster.teams.map((team) => [team.id, team.name]));
    const participantMap = Object.fromEntries(roster.participants.map((participant) => [participant.id, participant]));
    const itemMap = Object.fromEntries((activePack?.items || []).map((item) => [item.id, item.title]));
    const rows = roster.responses.map((row) => {
      const participant = participantMap[row.participant_id] || {};
      return [participant.display_name, teamMap[participant.team_id] || '', itemMap[row.item_id] || row.item_id, responseText(row), row.score ?? '', row.is_correct ?? '', row.submitted_at];
    });
    downloadClassroomFile(`${classroomFileName(session.title)}-results.csv`, [header, ...rows].map((row) => row.map(escapeCsv).join(',')).join('\n'), 'text/csv;charset=utf-8');
  };

  const exportOffline = () => {
    downloadClassroomFile(`${classroomFileName(session.title)}-offline.html`, buildOfflineClassroomHtml(session, language));
  };

  const elapsedSeconds = session?.currentItemStartedAt ? Math.floor((timerTick - new Date(session.currentItemStartedAt).getTime()) / 1000) : 0;
  const remaining = Math.max(0, Number(session?.currentItemDurationSeconds || 0) - elapsedSeconds);
  const joinUrl = session ? getClassroomJoinUrl(session.joinCode) : '';

  return <div className="page classroom-delivery-page">
    <SessionList sessions={sessions} selectedId={session?.id} onSelect={setSelectedId} onCreate={createNew} language={language} />
    <section className="cd-workspace">
      <header className="cd-topbar">
        <div><small>V11.1 · CLASSROOM DELIVERY</small><h1>{session?.title || 'Classroom Delivery'}</h1></div>
        <div className="cd-top-actions">
          <span className={runtime.ready ? 'online' : ''}>{runtime.ready ? '● Cloud ready' : '○ Local mode'}</span>
          <button onClick={exportOffline} disabled={!session}>⇩ {language === 'vi' ? 'Gói offline' : 'Offline package'}</button>
          <button className="primary" onClick={() => setStatus(session?.status === 'open' ? 'live' : 'open')} disabled={!session}>{session?.status === 'open' ? '▶' : '⌁'} {session?.status === 'open' ? (language === 'vi' ? 'Bắt đầu dạy' : 'Start teaching') : (language === 'vi' ? 'Mở phòng' : 'Open lobby')}</button>
        </div>
      </header>
      <nav className="cd-tabs">{TABS.map(([id, vi, en]) => <button key={id} className={tab === id ? 'active' : ''} onClick={() => setTab(id)}>{language === 'vi' ? vi : en}</button>)}</nav>
      {notice ? <div className="cd-notice">✓ {notice}</div> : null}
      {!session ? <div className="cd-empty"><b>{language === 'vi' ? 'Chưa có phiên học' : 'No classroom session'}</b><button onClick={createNew}>＋ {language === 'vi' ? 'Tạo từ Lesson Pack' : 'Create from Lesson Pack'}</button></div> : null}

      {session && tab === 'setup' ? <div className="cd-panel cd-setup">
        <section className="cd-form-grid">
          <label className="wide"><span>{language === 'vi' ? 'Lesson Pack' : 'Lesson Pack'}</span><select value={session.lessonPackId} onChange={(event) => selectPack(event.target.value)}>{packs.map((pack) => <option key={pack.id} value={pack.id}>{pack.title}</option>)}</select></label>
          <label><span>{language === 'vi' ? 'Tên phiên học' : 'Session title'}</span><input value={session.title} onChange={(event) => patchSession({ title: event.target.value })} /></label>
          <label><span>{language === 'vi' ? 'Mã tham gia' : 'Join code'}</span><input value={session.joinCode} onChange={(event) => patchSession({ joinCode: event.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8) })} /></label>
          <label><span>{language === 'vi' ? 'Số đội' : 'Teams'}</span><input type="number" min="1" max="8" value={session.teams.length} onChange={(event) => updateTeams(event.target.value)} /></label>
          <label><span>{language === 'vi' ? 'Cho vào muộn' : 'Allow late join'}</span><select value={session.settings.allowLateJoin ? 'yes' : 'no'} onChange={(event) => patchSession({ settings: { ...session.settings, allowLateJoin: event.target.value === 'yes' } })}><option value="yes">{language === 'vi' ? 'Có' : 'Yes'}</option><option value="no">{language === 'vi' ? 'Không' : 'No'}</option></select></label>
        </section>
        <section className="cd-team-editor"><h2>{language === 'vi' ? 'Tên đội' : 'Team names'}</h2><div>{session.teams.map((team, index) => <label key={team.id}><span>{index + 1}</span><input value={team.name} onChange={(event) => patchSession({ teams: session.teams.map((row) => row.id === team.id ? { ...row, name: event.target.value } : row) })} /></label>)}</div></section>
        <section className="cd-activity-setup"><h2>{language === 'vi' ? 'Cách thu câu trả lời' : 'Response collection'}</h2><p>{language === 'vi' ? 'Thiết lập riêng cho từng hoạt động khi chuyển sang tab Điều khiển lớp.' : 'Configure each activity from the Live control tab.'}</p><div className="cd-activity-summary">{(activePack?.items || []).map((item, index) => { const override = session.settings.itemOverrides?.[item.id]; return <button key={item.id} onClick={() => { startItem(index); setTab('live'); }}><span>{index + 1}</span><div><b>{item.title}</b><small>{RESPONSE_MODES.find(([id]) => id === (override?.responseMode || 'none'))?.[language === 'vi' ? 1 : 2]}</small></div></button>; })}</div></section>
      </div> : null}

      {session && tab === 'lobby' ? <div className="cd-panel cd-lobby">
        <section className="cd-join-card">
          <div><small>{language === 'vi' ? 'THAM GIA PHÒNG HỌC' : 'JOIN THE CLASSROOM'}</small><strong>{session.joinCode}</strong><p>{joinUrl}</p><div><button onClick={() => navigator.clipboard?.writeText(joinUrl)}>⧉ {language === 'vi' ? 'Sao chép link' : 'Copy link'}</button><button onClick={() => setStatus('live')}>▶ {language === 'vi' ? 'Bắt đầu' : 'Start'}</button></div></div>
          <figure><img src={getQrImageUrl(session.joinCode)} alt={language === 'vi' ? 'Mã QR tham gia lớp' : 'Classroom join QR code'} /><figcaption>{language === 'vi' ? 'Quét QR hoặc nhập mã' : 'Scan QR or enter the code'}</figcaption></figure>
        </section>
        <section className="cd-roster"><header><div><h2>{language === 'vi' ? 'Học sinh đã vào' : 'Participants'}</h2><p>{roster.participants.length} {language === 'vi' ? 'người tham gia' : 'joined'}</p></div><button onClick={refreshRoster}>↻</button></header><div className="cd-roster-grid">{roster.participants.map((participant) => <article key={participant.id}><span>{participant.display_name?.slice(0, 1).toUpperCase()}</span><div><b>{participant.display_name}</b><small>{participant.status || 'online'}</small></div><select value={participant.team_id || ''} onChange={(event) => assignTeam(participant.id, event.target.value)}><option value="">—</option>{roster.teams.map((team) => <option key={team.id} value={team.id}>{team.name}</option>)}</select></article>)}{!roster.participants.length ? <p className="cd-muted">{language === 'vi' ? 'Đang chờ học sinh tham gia…' : 'Waiting for students…'}</p> : null}</div></section>
      </div> : null}

      {session && tab === 'live' ? <div className="cd-panel cd-live-control">
        <section className="cd-live-stage"><header><div><small>{currentItem ? `${session.currentItemIndex + 1}/${activePack.items.length}` : '0/0'}</small><h2>{currentItem?.title || (language === 'vi' ? 'Chưa có hoạt động' : 'No activity')}</h2></div><div className={remaining <= 60 ? 'cd-clock warning' : 'cd-clock'}>{minutesToClock(remaining)}</div></header><p className="objective">{currentItem?.objective}</p><div className="content">{currentItem?.content || (language === 'vi' ? 'Chọn một hoạt động trong tiến trình.' : 'Select an activity from the timeline.')}</div><footer><button disabled={session.currentItemIndex === 0} onClick={() => startItem(session.currentItemIndex - 1)}>←</button><button onClick={() => patchSession({ status: session.status === 'paused' ? 'live' : 'paused' }, true)}>{session.status === 'paused' ? '▶' : 'Ⅱ'}</button><button disabled={!activePack || session.currentItemIndex >= activePack.items.length - 1} onClick={() => startItem(session.currentItemIndex + 1)}>→</button><button className="danger" onClick={() => setStatus('ended')}>■ {language === 'vi' ? 'Kết thúc' : 'End'}</button></footer></section>
        <aside className="cd-live-side">
          <section className="cd-response-config"><h3>{language === 'vi' ? 'Thu câu trả lời' : 'Collect responses'}</h3><select value={currentOverride.responseMode || 'none'} onChange={(event) => setOverride({ responseMode: event.target.value })}>{RESPONSE_MODES.map(([id, vi, en]) => <option key={id} value={id}>{language === 'vi' ? vi : en}</option>)}</select>{['multiple-choice', 'poll'].includes(currentOverride.responseMode) ? <textarea rows="5" value={(currentOverride.options || []).join('\n')} onChange={(event) => setOverride({ options: event.target.value.split(/\r?\n/).map((item) => item.trim()).filter(Boolean).slice(0, 8) })} placeholder={language === 'vi' ? 'Mỗi phương án một dòng' : 'One option per line'} /> : null}<div className="cd-response-count"><b>{currentResponses.length}</b><span>/ {roster.participants.length} {language === 'vi' ? 'đã trả lời' : 'responses'}</span></div></section>
          <section className="cd-team-scores"><h3>{language === 'vi' ? 'Điểm đội' : 'Team scores'}</h3>{roster.teams.map((team) => <div key={team.id}><b>{team.name}</b><strong>{team.score}</strong><button onClick={() => changeTeamScore(team, -10)}>−10</button><button onClick={() => changeTeamScore(team, 10)}>+10</button></div>)}</section>
          <section className="cd-mini-roster"><h3>{language === 'vi' ? 'Tiến độ' : 'Progress'}</h3>{roster.participants.map((participant) => <div key={participant.id} className={respondedIds.has(participant.id) ? 'done' : ''}><span>{respondedIds.has(participant.id) ? '✓' : '○'}</span><b>{participant.display_name}</b></div>)}</section>
        </aside>
      </div> : null}

      {session && tab === 'results' ? <div className="cd-panel cd-results">
        <header><div><h2>{language === 'vi' ? 'Kết quả phiên học' : 'Session results'}</h2><p>{roster.responses.length} {language === 'vi' ? 'lượt trả lời' : 'responses'} · {roster.participants.length} {language === 'vi' ? 'học sinh' : 'participants'}</p></div><button onClick={exportResults}>⇩ CSV</button></header>
        <div className="cd-result-grid">{roster.responses.map((row) => { const participant = roster.participants.find((item) => item.id === row.participant_id); const item = activePack?.items?.find((entry) => entry.id === row.item_id); return <article key={row.id}><div><b>{participant?.display_name || 'Learner'}</b><small>{item?.title || row.item_id}</small></div><p>{responseText(row) || '✓'}</p><span>{row.score ?? 0} pts</span><div><button className="good" onClick={() => markResponse(row, true)}>✓</button><button className="bad" onClick={() => markResponse(row, false)}>×</button></div></article>; })}{!roster.responses.length ? <p className="cd-muted">{language === 'vi' ? 'Chưa có câu trả lời.' : 'No responses yet.'}</p> : null}</div>
      </div> : null}
      {saving ? <div className="cd-saving">{language === 'vi' ? 'Đang lưu…' : 'Saving…'}</div> : null}
    </section>
  </div>;
}
