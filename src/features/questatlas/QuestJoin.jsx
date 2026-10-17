import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { isSupabaseConfigured, supabase } from '../../utils/supabase.js';
import './questatlas.css';

const readCode = () => {
  const hash = window.location.hash || '';
  const params = new URLSearchParams(hash.includes('?') ? hash.split('?').slice(1).join('?') : '');
  return String(params.get('code') || '').toUpperCase().replace(/[^A-F0-9]/g,'').slice(0,12);
};
const storageKey = (code) => 'questatlas-team-token:' + code;
const WAIT_LABEL = { waiting:'Đang chờ giáo viên bắt đầu',paused:'Giáo viên đã tạm dừng',finished:'Phiên thi đã kết thúc' };

export default function QuestJoin() {
  const [code, setCode] = useState(readCode);
  const [teamNo, setTeamNo] = useState(1);
  const [teamName, setTeamName] = useState('');
  const [token, setToken] = useState(() => {
    try { return window.sessionStorage.getItem(storageKey(readCode())) || ''; }
    catch { return ''; }
  });
  const [state, setState] = useState(null);
  const lastPosition = useRef(null);
  const refreshInFlight = useRef(false);
  const [answer, setAnswer] = useState('');
  const [feedback, setFeedback] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const validCode = /^[A-F0-9]{12}$/.test(code);

  const refresh = useCallback(async () => {
    if (!validCode || !token || !isSupabaseConfigured || refreshInFlight.current) return;
    refreshInFlight.current = true;
    try {
      const { data, error: err } = await supabase.rpc('qatl_live_view', { p_code: code, p_token: token });
      if (err || data?.error) {
        setError(data?.error === 'rate_limited' ? 'Bạn đang làm mới quá nhanh. Hệ thống sẽ thử lại sau.' : err?.message || 'Không thể đồng bộ phòng chơi.');
        return;
      }
      if (lastPosition.current !== null && lastPosition.current !== data.position) {
        setAnswer(''); setFeedback('');
      }
      lastPosition.current = data.position;
      setState(data);
      setError('');
    } catch {
      setError('Kết nối tạm thời gián đoạn. Ứng dụng sẽ tự đồng bộ lại.');
    } finally { refreshInFlight.current = false; }
  }, [code, token, validCode]);

  useEffect(() => {
    if (!token) return undefined;
    void refresh();
    const poll = window.setInterval(() => {
      if (document.visibilityState === 'visible' && navigator.onLine !== false) void refresh();
    },3000);
    const onReturn = () => { if (document.visibilityState === 'visible') void refresh(); };
    const onOnline = () => void refresh();
    document.addEventListener('visibilitychange',onReturn);
    window.addEventListener('online',onOnline);
    return () => {
      window.clearInterval(poll);
      document.removeEventListener('visibilitychange',onReturn);
      window.removeEventListener('online',onOnline);
    };
  }, [refresh,token]);

  const resetConnection = () => {
    try { window.sessionStorage.removeItem(storageKey(code)); } catch { /* ignore */ }
    setToken(''); setState(null); setFeedback(''); setAnswer(''); setError('');
    lastPosition.current = null;
  };
  const join = async (e) => {
    e.preventDefault();
    if (!validCode || teamName.trim().length < 2) { setError('Nhập đúng mã phòng và tên đội.'); return; }
    setBusy(true); setError('');
    try {
      const { data, error: err } = await supabase.rpc('qatl_live_join', {
        p_code:code, p_team_no:Number(teamNo), p_name:teamName.trim().slice(0,50)
      });
      if (err) throw err;
      if (data?.error === 'rate_limited') throw new Error('Có quá nhiều lượt vào phòng. Hãy thử lại sau khoảng một phút.');
      if (!data?.token) throw new Error('Server không cung cấp mã phiên hợp lệ.');
      window.sessionStorage.setItem(storageKey(code),data.token);
      setToken(data.token);
      lastPosition.current = null;
      setState(null);
      setFeedback('');
    } catch (e) { setError(e.message || 'Không thể tham gia phòng.'); }
    finally { setBusy(false); }
  };
  const submit = async () => {
    if (!answer.trim() || busy || !state?.puzzle || state.submitted) return;
    setBusy(true);setError('');
    try {
      const { data,error:err } = await supabase.rpc('qatl_live_submit', {
        p_code:code,p_token:token,p_answer:answer.trim().slice(0,180)
      });
      if (err) throw err;
      if (data?.reason === 'rate_limited') throw new Error('Bạn thao tác quá nhanh. Hãy thử lại sau khoảng một phút.');
      setFeedback(data.accepted ? (data.correct ? '✓ Chính xác! +' + data.awarded + ' điểm' : 'Đã gửi đáp án. Chờ giáo viên mở trạm tiếp theo.') : 'Đội đã gửi câu trả lời cho trạm này.');
      await refresh();
    } catch (e) { setError(e.message || 'Không gửi được đáp án.'); }
    finally { setBusy(false); }
  };
  const score = useMemo(() => (state?.scoreboard || []).find((t) => t.team_no === state?.team_no)?.score || 0,[state]);
  const guestReady = isSupabaseConfigured && supabase;

  return <div className="qa-join-shell">
    <header className="qa-join-banner"><span>BRIAN QuestAtlas</span><h1>Classroom Escape Challenge</h1><p>Tham gia theo đội • Một thiết bị cho mỗi đội • Không cần tài khoản học sinh</p></header>
    {!guestReady && <div className="qa-join-card"><p className="qa-info qa-error">Ứng dụng chưa kết nối Supabase.</p></div>}
    {guestReady && !token && <form className="qa-join-card qa-form" onSubmit={join}>
      <h2>Tham gia phòng giải mã</h2>
      <label>Mã phòng 12 ký tự<input required maxLength="12" autoComplete="off" value={code} onChange={(e)=>setCode(e.target.value.toUpperCase().replace(/[^A-F0-9]/g,''))} placeholder="Nhập mã giáo viên cung cấp"/></label>
      <label>Chọn số đội<select value={teamNo} onChange={(e)=>setTeamNo(Number(e.target.value))}>{Array.from({length:8},(_,i)=><option value={i+1} key={i}>Đội {i+1}</option>)}</select></label>
      <label>Tên đội<input required minLength="2" maxLength="50" value={teamName} onChange={(e)=>setTeamName(e.target.value)} placeholder="Ví dụ: Galaxy Explorers"/></label>
      {error && <p role="alert" className="qa-info qa-error">{error}</p>}
      <button type="submit" className="qa-primary" disabled={busy || !validCode}> {busy ? 'Đang tham gia…':'Vào phòng chơi →'} </button>
    </form>}
    {guestReady && token && <main className="qa-join-card">
      {error && <p className="qa-info qa-error" role="alert">{error}</p>}
      {!state ? <div className="qa-reconnect-help"><p className="qa-info">Đang đồng bộ trạng thái phòng…</p>
        <button type="button" className="qa-join-exit" onClick={resetConnection}>
          Thiết bị được giáo viên đặt lại? Nhấn để tham gia lại
        </button>
      </div> : <>
        <div className="qa-join-progress"><div><strong>{state.display_name}</strong><span>Đội {state.team_no} · {score} điểm</span></div><div><strong>{state.position}/{state.total}</strong><span>Trạm</span></div></div>
        <h2>{state.title}</h2>
        <button type="button" className="qa-join-exit" onClick={resetConnection}>Thoát phòng trên thiết bị này</button>
        {state.status !== 'active' ? <div className="qa-join-wait"><span>◇</span><h3>{WAIT_LABEL[state.status] || 'Chờ giáo viên'}</h3><p>Bảng điểm sẽ được làm mới tự động.</p></div>
        : state.submitted ? <div className="qa-join-wait"><span>✓</span><h3>Đội đã hoàn thành trạm {state.position}</h3><p>Chờ giáo viên chuyển sang trạm tiếp theo.</p></div>
        : <div className="qa-join-puzzle"><div className="qa-join-stage">TRẠM {state.position}</div><h3>{state.puzzle?.stem}</h3>
          {state.puzzle?.kind === 'choice' ? <div className="qa-answer-options">{(state.puzzle.options || []).map((option)=><button type="button" key={option} className={answer===option?'chosen':''} aria-pressed={answer===option} onClick={()=>setAnswer(option)}>{option}</button>)}</div>:
          <label className="qa-field">Nhập mật mã<input value={answer} maxLength="180" onChange={(e)=>setAnswer(e.target.value)} onKeyDown={(e)=>{if(e.key==='Enter')void submit();}} /></label>}
          {feedback && <p className="qa-info qa-success">{feedback}</p>}
          <button className="qa-primary" disabled={busy || !answer.trim()} onClick={submit}>{busy?'Đang gửi…':'Gửi đáp án →'}</button>
        </div>}
        <section className="qa-join-board"><h3>Bảng điểm</h3>{(state.scoreboard||[]).slice().sort((a,b)=>b.score-a.score).map((t,i)=><div key={t.team_no}><span>{i+1}</span><strong>{t.display_name}</strong><b>{t.score} điểm</b></div>)}</section>
      </>}
    </main>}
    <footer className="qa-join-footer">QuestAtlas · Hoạt động do giáo viên điều khiển · Không sử dụng AI</footer>
  </div>;
}
