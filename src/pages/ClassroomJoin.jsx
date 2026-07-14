import React, { useEffect, useMemo, useState } from 'react';
import { getClassroomPublicState, joinClassroomSession, pingClassroomParticipant, submitClassroomResponse } from '../utils/classroomDelivery.js';

function readStoredToken(code) {
  try { return window.localStorage.getItem(`bes-classroom-token:${code}`) || ''; } catch { return ''; }
}
function writeStoredToken(code, token) {
  try { window.localStorage.setItem(`bes-classroom-token:${code}`, token || ''); } catch { /* optional */ }
}
function clockFromState(session) {
  if (!session?.currentItemStartedAt || !session?.currentItemDurationSeconds) return '';
  const elapsed = Math.floor((Date.now() - new Date(session.currentItemStartedAt).getTime()) / 1000);
  const remain = Math.max(0, Number(session.currentItemDurationSeconds) - elapsed);
  return `${String(Math.floor(remain / 60)).padStart(2, '0')}:${String(remain % 60).padStart(2, '0')}`;
}

export default function ClassroomJoin({ language = 'vi' }) {
  const params = useMemo(() => new URLSearchParams(window.location.hash.split('?')[1] || ''), []);
  const initialCode = String(params.get('code') || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8);
  const [code, setCode] = useState(initialCode);
  const [name, setName] = useState('');
  const [token, setToken] = useState(() => readStoredToken(initialCode));
  const [state, setState] = useState(null);
  const [answer, setAnswer] = useState('');
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(Boolean(token));
  const [tick, setTick] = useState(Date.now());
  const [itemStartedAt, setItemStartedAt] = useState(Date.now());

  const refresh = async (silent = true) => {
    if (!code || !token) return;
    try {
      const next = await getClassroomPublicState(code, token);
      setState(next);
      setError('');
      if (!silent) setNotice(language === 'vi' ? 'Đã cập nhật.' : 'Updated.');
    } catch (err) {
      setError(err.message || String(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!token || !code) return undefined;
    refresh();
    const interval = window.setInterval(() => {
      refresh();
      pingClassroomParticipant(code, token).catch(() => {});
    }, 2200);
    return () => window.clearInterval(interval);
  }, [token, code]);

  useEffect(() => {
    const timer = window.setInterval(() => setTick(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const currentItemId = state?.currentItem?.id || '';
  useEffect(() => {
    setAnswer('');
    setNotice('');
    setItemStartedAt(Date.now());
  }, [currentItemId]);

  const join = async (event) => {
    event.preventDefault();
    setLoading(true); setError('');
    try {
      const result = await joinClassroomSession(code, name);
      const nextToken = result?.participantToken || result?.participant_token || '';
      if (!nextToken) throw new Error(language === 'vi' ? 'Không nhận được mã phiên học sinh.' : 'No participant token returned.');
      writeStoredToken(code, nextToken);
      setToken(nextToken);
      setState(result?.state || null);
    } catch (err) {
      setError(err.message || String(err));
      setLoading(false);
    }
  };

  const submit = async (value = answer) => {
    const item = state?.currentItem;
    if (!item) return;
    setLoading(true); setError('');
    try {
      await submitClassroomResponse(code, token, item.id, { value }, Date.now() - itemStartedAt);
      setNotice(language === 'vi' ? 'Đã gửi câu trả lời.' : 'Response submitted.');
      setAnswer(String(value || ''));
      await refresh();
    } catch (err) {
      setError(err.message || String(err));
    } finally {
      setLoading(false);
    }
  };

  const session = state?.session;
  const item = state?.currentItem;
  const participant = state?.participant;
  const team = state?.teams?.find((entry) => entry.id === participant?.teamId);
  const override = item?.override || {};
  const responseMode = override.responseMode || 'none';
  const alreadySubmitted = Boolean(state?.currentResponse);
  const displayClock = clockFromState(session);
  void tick;

  if (!token || !state) return <div className="classroom-join-page">
    <main className="cj-shell">
      <section className="cj-hero"><span>CD</span><div><small>BRIAN ENGLISH · V11.1</small><h1>{language === 'vi' ? 'Tham gia lớp học' : 'Join classroom'}</h1><p>{language === 'vi' ? 'Nhập mã do giáo viên cung cấp. Không cần tạo tài khoản.' : 'Enter the code from your teacher. No account is required.'}</p></div></section>
      <form className="cj-form" onSubmit={join}>
        <label><span>{language === 'vi' ? 'Mã phòng' : 'Join code'}</span><input autoFocus value={code} onChange={(event) => setCode(event.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8))} placeholder="ABC234" required /></label>
        <label><span>{language === 'vi' ? 'Tên hiển thị' : 'Display name'}</span><input value={name} onChange={(event) => setName(event.target.value)} placeholder={language === 'vi' ? 'Nguyễn Minh Anh' : 'Your name'} maxLength={80} required /></label>
        <button disabled={loading || code.length < 4 || name.trim().length < 2}>{loading ? '…' : (language === 'vi' ? 'Tham gia' : 'Join')}</button>
      </form>
      {error ? <div className="cj-error">{error}</div> : null}
      <footer>Brian English Studio · Classroom Delivery</footer>
    </main>
  </div>;

  return <div className="classroom-join-page active-session">
    <header className="cj-topbar"><div><small>{session?.title}</small><b>{participant?.displayName || name}</b></div><div>{team ? <span>{team.name} · {team.score} pts</span> : null}<strong>{displayClock}</strong></div></header>
    <main className="cj-stage">
      {session?.status === 'ended' ? <section className="cj-ended"><span>✓</span><h1>{language === 'vi' ? 'Phiên học đã kết thúc' : 'Session ended'}</h1><p>{language === 'vi' ? 'Cảm ơn em đã tham gia.' : 'Thank you for participating.'}</p></section> : null}
      {['draft', 'open'].includes(session?.status) ? <section className="cj-wait"><div className="cj-pulse" /><h1>{language === 'vi' ? 'Đã vào phòng học' : 'You are in'}</h1><p>{language === 'vi' ? 'Đang chờ giáo viên bắt đầu…' : 'Waiting for the teacher to start…'}</p><b>{code}</b></section> : null}
      {['live', 'paused'].includes(session?.status) && item ? <section className="cj-activity">
        <div className="cj-meta"><span>{state.itemIndex + 1}/{state.itemCount}</span><span>{item.type}</span><span>{session.status === 'paused' ? (language === 'vi' ? 'Tạm dừng' : 'Paused') : (language === 'vi' ? 'Đang học' : 'Live')}</span></div>
        <h1>{item.title}</h1>
        {item.objective ? <p className="objective">{item.objective}</p> : null}
        <div className="cj-content">{item.content}</div>
        <section className="cj-response">
          {responseMode === 'none' ? <p>{language === 'vi' ? 'Hoạt động này không yêu cầu gửi câu trả lời.' : 'No response is required for this activity.'}</p> : null}
          {responseMode === 'check-in' ? <button className="cj-check" onClick={() => submit('done')} disabled={alreadySubmitted || loading}>{alreadySubmitted ? '✓ ' : ''}{language === 'vi' ? 'Em đã hoàn thành' : 'I am done'}</button> : null}
          {responseMode === 'short-answer' ? <><textarea rows="4" value={answer} onChange={(event) => setAnswer(event.target.value)} placeholder={language === 'vi' ? 'Nhập câu trả lời…' : 'Type your answer…'} disabled={alreadySubmitted} /><button onClick={() => submit()} disabled={alreadySubmitted || loading || !answer.trim()}>{alreadySubmitted ? (language === 'vi' ? 'Đã gửi' : 'Submitted') : (language === 'vi' ? 'Gửi câu trả lời' : 'Submit')}</button></> : null}
          {['multiple-choice', 'poll'].includes(responseMode) ? <div className="cj-options">{(override.options || []).map((option, index) => <button key={`${option}-${index}`} className={answer === option ? 'selected' : ''} onClick={() => { setAnswer(option); submit(option); }} disabled={alreadySubmitted || loading}><span>{String.fromCharCode(65 + index)}</span>{option}</button>)}</div> : null}
          {alreadySubmitted ? <div className="cj-submitted">✓ {language === 'vi' ? 'Câu trả lời đã được ghi nhận.' : 'Your response has been recorded.'}</div> : null}
        </section>
      </section> : null}
    </main>
    <footer className="cj-footer"><span>Room {code}</span><button onClick={() => refresh(false)}>↻</button></footer>
    {notice ? <div className="cj-notice">{notice}</div> : null}
    {error ? <div className="cj-error floating">{error}</div> : null}
  </div>;
}
