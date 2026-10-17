import React, { useCallback, useEffect, useState } from 'react';
import { supabase } from '../../utils/supabase.js';
import ClassroomRehearsal from './ClassroomRehearsal.jsx';
import { liveResultsCsv } from './liveReport.mjs';

const statusLabel = {
  waiting: 'Chờ các đội tham gia', active: 'Đang thi đấu',
  paused: 'Tạm dừng', finished: 'Đã kết thúc'
};
const makeJoinUrl = (code) => window.location.origin + window.location.pathname + '#/quest-join?code=' + code;

export default function LiveTeacher({ quests = [], puzzles = [], enabled = false }) {
  const [questId, setQuestId] = useState('');
  const [teamLimit, setTeamLimit] = useState(4);
  const [sessions, setSessions] = useState([]);
  const [activeSession, setActiveSession] = useState('');
  const [teams, setTeams] = useState([]);
  const [attempts, setAttempts] = useState([]);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const [showRehearsal,setShowRehearsal]=useState(false);
  const current = sessions.find((s) => s.id === activeSession);
  const total = current?.puzzle_snapshot?.length ?? 0;

  const refresh = useCallback(async () => {
    if (!enabled || !supabase) return;
    const { data, error: err } = await supabase.from('qatl_live_sessions')
      .select('id,quest_id,join_code,status,team_limit,current_position,puzzle_snapshot,expires_at,created_at')
      .order('created_at', { ascending: false }).limit(25);
    if (err) { setError(err.message); return; }
    setSessions(data || []);
  }, [enabled]);

  const refreshScore = useCallback(async () => {
    if (!activeSession || !enabled) return;
    const [t,a] = await Promise.all([
      supabase.from('qatl_live_teams').select('id,team_no,display_name').eq('session_id',activeSession),
      supabase.from('qatl_live_attempts').select('team_id,puzzle_position,is_correct,points').eq('session_id',activeSession)
    ]);
    if (t.error || a.error) { setError(t.error?.message || a.error?.message); return; }
    setTeams(t.data || []); setAttempts(a.data || []);
  }, [enabled, activeSession]);

  useEffect(() => { void refresh(); }, [refresh]);
  useEffect(() => {
    if (!enabled) return undefined;
    void refreshScore();
    const id = window.setInterval(() => { void refresh(); void refreshScore(); }, 3000);
    return () => window.clearInterval(id);
  }, [enabled, refresh, refreshScore]);

  const createSession = async () => {
    if (!questId) { setError('Chọn Quest đã xuất bản trước.'); return; }
    setBusy(true); setError(''); setNotice('');
    try {
      const { data, error: err } = await supabase.rpc('qatl_live_create', { p_quest_id: questId, p_team_limit: teamLimit });
      if (err) throw err;
      setActiveSession(data.id);
      setNotice('Đã tạo phòng thi đấu. Chia sẻ mã phòng cho các đội.');
      await refresh();
    } catch (e) { setError(e.message || 'Không thể tạo phòng'); } finally { setBusy(false); }
  };

  const control = async (action) => {
    if (!current) return;
    setBusy(true); setError(''); setNotice('');
    try {
      const { error: err } = await supabase.rpc('qatl_live_control', { p_session_id: current.id, p_action: action });
      if (err) throw err;
      await refresh(); await refreshScore();
    } catch (e) { setError(e.message || 'Không thể điều khiển phiên thi'); } finally { setBusy(false); }
  };

  const resetTeam = async (team) => {
    if (!current || current.status === 'finished') return;
    const confirmed = window.confirm('Đặt lại ' + team.display_name + '? Thiết bị cũ sẽ bị ngắt, mọi điểm của đội sẽ bị xóa. Đội cần tham gia lại bằng mã phòng.');
    if (!confirmed) return;
    setBusy(true); setError(''); setNotice('');
    try {
      const { data, error: err } = await supabase.rpc('qatl_live_reset_team', {
        p_session_id: current.id, p_team_no: team.team_no
      });
      if (err) throw err;
      if (!data?.reset) throw new Error('Server không xác nhận đặt lại.');
      setNotice('Đã giải phóng vị trí đội ' + team.team_no + '. Mã token trước đó không còn hợp lệ.');
      await refreshScore();
    } catch (e) { setError(e.message || 'Không thể đặt lại đội.'); }
    finally { setBusy(false); }
  };

  const copyJoin = async () => {
    if (!current) return;
    try { await navigator.clipboard.writeText(makeJoinUrl(current.join_code)); setNotice('Đã sao chép đường dẫn tham gia.'); }
    catch { setError('Trình duyệt không cho phép sao chép; hãy dùng đường dẫn ở phía dưới.'); }
  };
  const downloadReport = () => {
    if (!current || current.status !== 'finished') return;
    let url;
    try {
      const csv=liveResultsCsv(current,teams,attempts);
      const blob=new Blob([csv],{type:'text/csv;charset=utf-8'});
      url=URL.createObjectURL(blob);
      const el=document.createElement('a');
      el.href=url;el.download='questatlas-live-results.csv';el.style.display='none';
      document.body.append(el);el.click();el.remove();
      setNotice('Đã tạo bảng điểm phiên Live trên thiết bị, không lưu thêm vào hệ thống.');
      setError('');
    } catch (e) { setError(e?.message || 'Không thể xuất kết quả phiên Live.'); }
    finally { if (url) URL.revokeObjectURL(url); }
  };
  const published = quests.filter((q) => q.status === 'published');
  const board = teams.map((team) => ({
    ...team,
    score: attempts.filter((a) => a.team_id === team.id).reduce((sum,a) => sum + (a.points || 0),0),
    answered: attempts.filter((a) => a.team_id === team.id && a.puzzle_position === current?.current_position).length > 0
  })).sort((a,b) => b.score - a.score || a.team_no - b.team_no);

  return <>
    <div className="qa-free-rehearsal-banner">
      <div><strong>Muốn chạy thử không tốn phí?</strong>
        <p>Diễn tập Classroom Live với tối đa 8 đội trên một trình duyệt. Không cần Supabase Staging, không lưu điểm.</p>
      </div>
      <button type="button" onClick={()=>setShowRehearsal(v=>!v)} aria-expanded={showRehearsal}>
        {showRehearsal?'Ẩn phòng mô phỏng':'▶ Mở phòng mô phỏng miễn phí'}
      </button>
    </div>
    {showRehearsal&&<ClassroomRehearsal quests={quests} puzzles={puzzles}/>}
    <div className="qa-live-grid">
    <section className="qa-panel">
      <header className="qa-panel-head"><div><h2>Teacher Control Room</h2><p>Giáo viên tạo phòng và điều khiển các chặng thi đấu</p></div><strong className="qa-stat">2–8 đội</strong></header>
      {!enabled ? <p className="qa-info qa-warning">Classroom Live thật chưa được bật. Vui lòng sử dụng phòng mô phỏng đến khi hoàn tất nghiệm thu Supabase, bảo mật và thiết bị.</p> : <>
        <div className="qa-form">
          <label>Quest đã xuất bản<select value={questId} onChange={(e) => setQuestId(e.target.value)} disabled={busy}><option value="">Chọn Quest…</option>{published.map((q) => <option value={q.id} key={q.id}>{q.title}</option>)}</select></label>
          <label>Số đội<select value={teamLimit} onChange={(e) => setTeamLimit(Number(e.target.value))} disabled={busy}>{[2,3,4,5,6,7,8].map((n) => <option key={n} value={n}>{n} đội</option>)}</select></label>
          <button className="qa-primary" onClick={createSession} disabled={busy || !questId}>+ Tạo phòng thi đấu mới</button>
        </div>
        <div className="qa-mini-list"><strong>Các phiên gần đây</strong>{sessions.map((s) => <button type="button" key={s.id} className={activeSession === s.id ? 'selected' : ''} onClick={() => setActiveSession(s.id)}><span>◉ {s.join_code}</span><small>{statusLabel[s.status] || s.status}</small></button>)}</div>
      </>}
    </section>
    <section className="qa-panel">
      <header className="qa-panel-head"><div><h2>Classroom Dashboard</h2><p>Trạng thái phòng, kết quả và bảng xếp hạng</p></div></header>
      {error && <p className="qa-info qa-error" role="alert">{error}</p>}
      {notice && <p className="qa-info qa-success">{notice}</p>}
      {!current ? <div className="qa-empty">Tạo hoặc chọn một phiên để bắt đầu.</div> : <>
        <div className="qa-live-code"><small>MÃ PHÒNG</small><strong>{current.join_code}</strong><span>{statusLabel[current.status]} · Trạm {current.current_position}/{total}</span></div>
        <div className="qa-quest-actions">
          <button type="button" onClick={copyJoin}>Sao chép link cho đội</button>
          {current.status === 'waiting' && <>
            <button className="qa-primary" disabled={busy || board.length < 2}
              title={board.length < 2 ? 'Cần ít nhất 2 đội tham gia' : ''}
              onClick={() => control('start')}>▶ Bắt đầu</button>
            {board.length < 2 && <small role="status" className="qa-min-team-note">Chờ tối thiểu 2 đội tham gia.</small>}
          </>}
          {current.status === 'active' && <><button disabled={busy} onClick={() => control('pause')}>Ⅱ Tạm dừng</button><button className="qa-primary" disabled={busy} onClick={() => control('next')}>{current.current_position >= total ? '✓ Kết thúc' : 'Trạm tiếp theo →'}</button></>}
          {current.status === 'paused' && <button className="qa-primary" disabled={busy} onClick={() => control('resume')}>▶ Tiếp tục</button>}
          {!['finished','waiting'].includes(current.status) && <button disabled={busy} onClick={() => control('finish')}>Kết thúc sớm</button>}
        </div>
        <p className="qa-live-link"><a href={'#/quest-join?code=' + current.join_code} target="_blank" rel="noreferrer">{makeJoinUrl(current.join_code)}</a></p>
        <h3 className="qa-live-board-title">Bảng xếp hạng đội</h3>
        {!board.length ? <div className="qa-empty">Chưa có đội tham gia phòng.</div> : <div className="qa-live-board">{board.map((t,index) => <div key={t.id}><span>{index+1}</span><strong>{t.display_name}</strong><small>{t.answered ? 'Đã gửi' : 'Chưa gửi'}</small><b>{t.score} điểm</b>{current.status !== 'finished' && <button className="qa-reset-team" disabled={busy} type="button" onClick={() => resetTeam(t)} title="Đặt lại thiết bị đội và xóa điểm">Đặt lại</button>}</div>)}</div>}
        {current.status === 'finished' &&
          <button type="button" className="qa-primary qa-live-export" onClick={downloadReport}
            disabled={busy || !board.length}>↓ Xuất CSV điểm thi đấu</button>}
        <p className="qa-info">Đáp án được kiểm tra bằng RPC phía database, không gửi đáp án đúng xuống trình duyệt đội chơi.</p>
      </>}
    </section>
    </div>
  </>;
}
