import React, { useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '../utils/supabase.js';
import './QuestionBankPractice.css';

function hashToken() {
  const raw = window.location.hash || '';
  const query = raw.includes('?') ? raw.slice(raw.indexOf('?') + 1) : '';
  return new URLSearchParams(query).get('token') || '';
}

function letter(index) {
  return String.fromCharCode(65 + index);
}

function formatClock(totalSeconds) {
  const safe = Math.max(0, Number(totalSeconds || 0));
  const minutes = Math.floor(safe / 60);
  const seconds = safe % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

function errorLabel(code) {
  const labels = {
    invalid_or_disabled: 'Liên kết bài luyện không hợp lệ hoặc đã được tắt.',
    expired: 'Liên kết bài luyện đã hết hạn.',
    attempt_limit: 'Bài luyện đã đạt giới hạn lượt làm.',
    unavailable: 'Bài luyện hiện không khả dụng.',
  };
  return labels[code] || 'Không thể mở bài luyện.';
}

export default function QuestionBankPractice() {
  const token = useMemo(hashToken, []);
  const [loading, setLoading] = useState(true);
  const [payload, setPayload] = useState(null);
  const [error, setError] = useState('');
  const [learnerLabel, setLearnerLabel] = useState('');
  const [started, setStarted] = useState(false);
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [seconds, setSeconds] = useState({});
  const [result, setResult] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [remainingSeconds, setRemainingSeconds] = useState(null);
  const questionStartedAt = useRef(Date.now());
  const sessionId = useRef(crypto.randomUUID ? crypto.randomUUID() : null);
  const autoSubmittedRef = useRef(false);

  useEffect(() => {
    let mounted = true;
    (async () => {
      if (!token) {
        setError('Liên kết thiếu mã truy cập.');
        setLoading(false);
        return;
      }
      const response = await supabase.rpc('qb_public_practice_get', { p_token: token });
      if (!mounted) return;
      if (response.error) {
        setError(response.error.message || 'Không thể tải bài luyện.');
      } else if (!response.data?.ok) {
        setError(errorLabel(response.data?.error));
      } else {
        setPayload(response.data);
      }
      setLoading(false);
    })();
    return () => { mounted = false; };
  }, [token]);

  const items = payload?.items || [];
  const item = items[index] || null;
  const timeLimitMinutes = Math.max(0, Number(payload?.practice?.settings?.timeLimitMinutes || 0));
  const resultMap = useMemo(
    () => new Map((result?.results || []).map((row) => [row.itemId, row])),
    [result],
  );

  useEffect(() => {
    if (!started || result || remainingSeconds === null || remainingSeconds <= 0) return undefined;
    const timer = window.setTimeout(() => {
      setRemainingSeconds((value) => (value === null ? value : Math.max(0, value - 1)));
    }, 1000);
    return () => window.clearTimeout(timer);
  }, [started, result, remainingSeconds]);

  useEffect(() => {
    if (!started || result || remainingSeconds !== 0 || submitting || autoSubmittedRef.current) return;
    autoSubmittedRef.current = true;
    void submit(true);
  }, [started, result, remainingSeconds, submitting]);

  function commitTime(itemId) {
    if (!itemId || result) return seconds;
    const elapsed = Math.max(1, Math.round((Date.now() - questionStartedAt.current) / 1000));
    const next = { ...seconds, [itemId]: Number(seconds[itemId] || 0) + elapsed };
    setSeconds(next);
    questionStartedAt.current = Date.now();
    return next;
  }

  function go(nextIndex) {
    if (!item) return;
    commitTime(item.id);
    setIndex(Math.max(0, Math.min(items.length - 1, nextIndex)));
  }

  async function submit(force = false) {
    if (!item || submitting || result) return;
    const finalSeconds = commitTime(item.id);
    const unanswered = items.filter((entry) => !answers[entry.id]).length;
    if (unanswered > 0 && !force && !window.confirm(`Bạn còn ${unanswered} câu chưa trả lời. Vẫn nộp bài?`)) return;

    setSubmitting(true);
    try {
      const responseRows = items.map((entry) => ({
        item_id: entry.id,
        answer: answers[entry.id] || '',
        seconds: Number(finalSeconds[entry.id] || 0),
      }));
      const response = await supabase.rpc('qb_public_practice_submit', {
        p_token: token,
        p_session_id: sessionId.current,
        p_learner_label: learnerLabel.trim(),
        p_responses: responseRows,
      });
      if (response.error) throw response.error;
      if (!response.data?.ok) throw new Error(errorLabel(response.data?.error));
      setResult(response.data);
      setIndex(0);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      setError(err?.message || 'Không thể nộp bài.');
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return <main className="qb-public-practice"><div className="qbp-card qbp-state">Đang tải bài luyện…</div></main>;
  if (error && !payload) return <main className="qb-public-practice"><div className="qbp-card qbp-state"><strong>Không mở được bài luyện</strong><p>{error}</p></div></main>;
  if (!payload) return null;

  if (!started && !result) {
    return (
      <main className="qb-public-practice">
        <section className="qbp-card qbp-intro">
          <div className="qbp-brand">BRIAN ENGLISH · PRACTICE</div>
          <h1>{payload.practice?.title}</h1>
          <p>{items.length} câu · Khối {payload.practice?.grade || '—'}{timeLimitMinutes ? ` · ${timeLimitMinutes} phút` : ''}{payload.practice?.schoolYear ? ` · ${payload.practice.schoolYear}` : ''}</p>
          <label>
            <span>Họ tên hoặc mã học sinh</span>
            <input value={learnerLabel} onChange={(event) => setLearnerLabel(event.target.value)} maxLength={120} placeholder="Ví dụ: Nguyễn Văn A · 12.6" />
          </label>
          <button type="button" onClick={() => {
            autoSubmittedRef.current = false;
            setRemainingSeconds(timeLimitMinutes ? timeLimitMinutes * 60 : null);
            setStarted(true);
            questionStartedAt.current = Date.now();
          }} disabled={!learnerLabel.trim()}>Bắt đầu làm bài</button>
          <small>Đáp án và giải thích chỉ hiển thị sau khi nộp. Thời gian làm từng câu được ghi để hỗ trợ giáo viên phân tích chất lượng câu hỏi.{timeLimitMinutes ? ` Bài sẽ tự nộp khi hết ${timeLimitMinutes} phút.` : ''}</small>
        </section>
      </main>
    );
  }

  const currentResult = item ? resultMap.get(item.id) : null;
  const showContext = item?.bundleId
    && (index === 0 || items[index - 1]?.bundleId !== item.bundleId || result);
  const answeredCount = items.filter((entry) => answers[entry.id]).length;

  return (
    <main className="qb-public-practice">
      <section className="qbp-shell">
        <header className="qbp-header">
          <div><span>BRIAN PRACTICE</span><h1>{payload.practice?.title}</h1></div>
          {result
            ? <strong className="qbp-score">{result.score}/{result.maxScore}</strong>
            : (
              <div className="qbp-header-status">
                <strong>{answeredCount}/{items.length}</strong>
                {remainingSeconds !== null ? (
                  <span className={`qbp-timer ${remainingSeconds <= 300 ? 'is-warning' : ''}`}>
                    ⏱ {formatClock(remainingSeconds)}
                  </span>
                ) : null}
              </div>
            )}
        </header>

        <div className="qbp-progress"><i style={{ width: `${((index + 1) / Math.max(1, items.length)) * 100}%` }} /></div>

        {remainingSeconds === 0 && !result ? (
          <div className="qbp-timeout">Hết thời gian · Brian đang tự động nộp bài…</div>
        ) : null}

        {showContext ? (
          <article className="qbp-context">
            <span>{item.bundleTitle || 'Ngữ liệu chung'}</span>
            {item.bundleInstructions ? <b>{item.bundleInstructions}</b> : null}
            <p>{item.bundleContext}</p>
          </article>
        ) : null}

        <article className="qbp-question">
          <div className="qbp-qnum">Question {index + 1} / {items.length}</div>
          <h2>{item?.stem}</h2>
          <div className="qbp-options">
            {(item?.options || []).map((option, optionIndex) => {
              const key = letter(optionIndex);
              const selected = answers[item.id] === key;
              const correct = result && currentResult?.correctAnswer === key;
              const wrongSelected = result && selected && !currentResult?.isCorrect;
              return (
                <button
                  type="button"
                  key={key}
                  className={[selected ? 'is-selected' : '', correct ? 'is-correct' : '', wrongSelected ? 'is-wrong' : ''].filter(Boolean).join(' ')}
                  onClick={() => !result && setAnswers({ ...answers, [item.id]: key })}
                  disabled={Boolean(result) || remainingSeconds === 0}
                >
                  <b>{key}</b><span>{option}</span>
                </button>
              );
            })}
          </div>
          {result && currentResult ? (
            <div className={currentResult.isCorrect ? 'qbp-feedback correct' : 'qbp-feedback wrong'}>
              <strong>{currentResult.isCorrect ? '✓ Chính xác' : `Đáp án đúng: ${currentResult.correctAnswer}`}</strong>
              <p>{currentResult.explanation}</p>
            </div>
          ) : null}
        </article>

        <footer className="qbp-footer">
          <button type="button" className="secondary" onClick={() => go(index - 1)} disabled={index === 0}>← Trước</button>
          <div className="qbp-dots">{items.map((entry, dotIndex) => <button type="button" key={entry.id} className={dotIndex===index?'active':answers[entry.id]?'answered':''} onClick={() => go(dotIndex)}>{dotIndex+1}</button>)}</div>
          {index < items.length - 1
            ? <button type="button" onClick={() => go(index + 1)}>Tiếp →</button>
            : result
              ? <button type="button" onClick={() => setIndex(0)}>Xem lại từ đầu</button>
              : <button type="button" onClick={submit} disabled={submitting}>{submitting ? 'Đang chấm…' : 'Nộp bài'}</button>}
        </footer>
        {error ? <div className="qbp-inline-error">{error}</div> : null}
      </section>
    </main>
  );
}
