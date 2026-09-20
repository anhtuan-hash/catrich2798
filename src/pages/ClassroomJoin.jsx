import React, { useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '../utils/supabase.js';
import './ClassroomJoin.css';

const POLL_INTERVAL_MS = 2500;
const PING_INTERVAL_MS = 20000;

function hashParams() {
  const raw = window.location.hash || '';
  const query = raw.includes('?') ? raw.slice(raw.indexOf('?') + 1) : '';
  return new URLSearchParams(query);
}

function cleanCode(value) {
  return String(value || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 16);
}

function storageKey(code) {
  return `bes-classroom-participant:${cleanCode(code)}`;
}

function readStoredToken(code) {
  if (!code) return '';
  try { return window.sessionStorage.getItem(storageKey(code)) || ''; } catch { return ''; }
}

function writeStoredToken(code, token) {
  if (!code || !token) return;
  try { window.sessionStorage.setItem(storageKey(code), String(token)); } catch { /* optional */ }
}

function clearStoredToken(code) {
  if (!code) return;
  try { window.sessionStorage.removeItem(storageKey(code)); } catch { /* optional */ }
}

function activityType(item) {
  const raw = String(
    item?.override?.responseMode
    || item?.responseMode
    || item?.response_mode
    || item?.questionType
    || item?.interactionType
    || item?.activityType
    || item?.kind
    || item?.type
    || '',
  ).trim().toLowerCase();

  if (raw.includes('check') || raw.includes('attendance')) return 'check-in';
  if (raw.includes('poll')) return 'poll';
  if (raw.includes('choice') || raw.includes('mcq') || raw.includes('quiz') || raw.includes('multiple')) return 'choice';
  if (raw.includes('true') || raw.includes('false')) return 'choice';
  return 'short-answer';
}

function optionRows(item) {
  const values = Array.isArray(item?.options)
    ? item.options
    : Array.isArray(item?.choices)
      ? item.choices
      : [];

  return values.map((entry, index) => {
    if (entry && typeof entry === 'object') {
      return {
        id: String(entry.id || entry.value || entry.key || String.fromCharCode(65 + index)),
        label: String(entry.text || entry.label || entry.title || entry.value || entry.id || ''),
      };
    }
    return {
      id: String.fromCharCode(65 + index),
      label: String(entry ?? ''),
    };
  }).filter((entry) => entry.label);
}

function itemPrompt(item) {
  return String(
    item?.prompt
    || item?.question
    || item?.stem
    || item?.title
    || item?.instructions
    || item?.content
    || 'Hoạt động hiện tại',
  );
}

function responseValue(row) {
  const value = row?.response;
  if (!value) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'object') {
    return String(value.answer || value.value || value.choice || value.text || '');
  }
  return String(value);
}

function errorText(error) {
  const message = String(error?.message || error || '').trim();
  if (!message) return 'Không thể kết nối lớp học.';
  if (/not found/i.test(message)) return 'Không tìm thấy phòng học với mã này.';
  if (/not open/i.test(message)) return 'Phòng học hiện chưa mở cho học sinh.';
  if (/late join/i.test(message)) return 'Lớp đã bắt đầu và giáo viên không cho phép vào muộn.';
  if (/too many/i.test(message)) return 'Có quá nhiều yêu cầu. Vui lòng đợi một chút rồi thử lại.';
  if (/full/i.test(message)) return 'Phòng học đã đủ số người tham gia.';
  if (/invalid/i.test(message)) return 'Phiên tham gia không còn hợp lệ. Vui lòng vào lại lớp.';
  return message;
}

function countdownSeconds(state) {
  const startedAt = Date.parse(state?.session?.currentItemStartedAt || '');
  const duration = Number(state?.session?.currentItemDurationSeconds || 0);
  if (!Number.isFinite(startedAt) || !duration) return null;
  return Math.max(0, Math.ceil((startedAt + duration * 1000 - Date.now()) / 1000));
}

export default function ClassroomJoin() {
  const params = useMemo(hashParams, []);
  const initialCode = cleanCode(params.get('code') || '');
  const [joinCode, setJoinCode] = useState(initialCode);
  const [displayName, setDisplayName] = useState('');
  const [participantToken, setParticipantToken] = useState(() => readStoredToken(initialCode));
  const [state, setState] = useState(null);
  const [loading, setLoading] = useState(Boolean(initialCode && readStoredToken(initialCode)));
  const [joining, setJoining] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [answer, setAnswer] = useState('');
  const [clock, setClock] = useState(() => Date.now());
  const itemStartedAtRef = useRef(Date.now());
  const activeItemIdRef = useRef('');

  const currentItem = state?.currentItem || null;
  const mode = activityType(currentItem);
  const options = optionRows(currentItem);
  const existing = responseValue(state?.currentResponse);
  const remaining = countdownSeconds(state);

  async function fetchState(code = joinCode, token = participantToken, { quiet = false } = {}) {
    if (!supabase || !code || !token) return null;
    if (!quiet) setLoading(true);
    try {
      const { data, error: rpcError } = await supabase.rpc('classroom_get_public_state', {
        p_join_code: cleanCode(code),
        p_participant_token: token,
      });
      if (rpcError) throw rpcError;
      setState(data);
      setError('');
      return data;
    } catch (err) {
      if (!quiet) setError(errorText(err));
      return null;
    } finally {
      if (!quiet) setLoading(false);
    }
  }

  useEffect(() => {
    if (!participantToken || !joinCode) {
      setLoading(false);
      return undefined;
    }
    let cancelled = false;
    (async () => {
      const next = await fetchState(joinCode, participantToken);
      if (cancelled) return;
      if (!next) {
        clearStoredToken(joinCode);
        setParticipantToken('');
      }
    })();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!participantToken || !joinCode) return undefined;

    const poll = window.setInterval(() => {
      void fetchState(joinCode, participantToken, { quiet: true });
    }, POLL_INTERVAL_MS);

    const ping = window.setInterval(() => {
      if (!supabase) return;
      void supabase.rpc('classroom_ping_participant', {
        p_join_code: cleanCode(joinCode),
        p_participant_token: participantToken,
      }).catch(() => undefined);
    }, PING_INTERVAL_MS);

    return () => {
      window.clearInterval(poll);
      window.clearInterval(ping);
    };
  }, [participantToken, joinCode]);

  useEffect(() => {
    const timer = window.setInterval(() => setClock(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    void clock;
    const itemId = String(currentItem?.id || '');
    if (itemId === activeItemIdRef.current) return;
    activeItemIdRef.current = itemId;
    itemStartedAtRef.current = Date.now();
    setAnswer(responseValue(state?.currentResponse));
  }, [currentItem?.id, state?.currentResponse, clock]);

  async function join() {
    const code = cleanCode(joinCode);
    const name = displayName.trim();
    if (code.length < 4 || name.length < 2 || !supabase) return;

    setJoining(true);
    setError('');
    try {
      const { data, error: rpcError } = await supabase.rpc('classroom_join_session', {
        p_join_code: code,
        p_display_name: name,
      });
      if (rpcError) throw rpcError;
      const token = data?.participantToken;
      if (!token || !data?.state) throw new Error('Không thể tạo phiên tham gia.');
      setJoinCode(code);
      setParticipantToken(token);
      writeStoredToken(code, token);
      setState(data.state);
      window.history.replaceState(null, '', `#/classroom-join?code=${encodeURIComponent(code)}`);
    } catch (err) {
      setError(errorText(err));
    } finally {
      setJoining(false);
    }
  }

  async function submit(value = answer) {
    if (!supabase || !participantToken || !currentItem?.id || submitting) return;
    const normalized = String(value ?? '').trim();
    if (mode !== 'check-in' && !normalized) return;

    setSubmitting(true);
    setError('');
    try {
      const elapsed = Math.max(0, Date.now() - itemStartedAtRef.current);
      const { error: rpcError } = await supabase.rpc('classroom_submit_response', {
        p_join_code: cleanCode(joinCode),
        p_participant_token: participantToken,
        p_item_id: String(currentItem.id),
        p_response: {
          answer: normalized || 'present',
          value: normalized || 'present',
          mode,
        },
        p_elapsed_ms: Math.min(elapsed, 7_200_000),
      });
      if (rpcError) throw rpcError;
      setAnswer(normalized || 'present');
      await fetchState(joinCode, participantToken, { quiet: true });
    } catch (err) {
      setError(errorText(err));
    } finally {
      setSubmitting(false);
    }
  }

  function leave() {
    clearStoredToken(joinCode);
    setParticipantToken('');
    setState(null);
    setAnswer('');
    setError('');
  }

  if (!participantToken || !state) {
    return (
      <main className="classroom-join-page">
        <section className="cj-card cj-form">
          <div className="cj-brand">BRIAN ENGLISH · CLASSROOM LIVE</div>
          <h1>Vào lớp học</h1>
          <p>Nhập mã phòng do giáo viên cung cấp. Học sinh không cần tài khoản Brian.</p>

          <label>
            <span>Mã phòng</span>
            <input
              value={joinCode}
              onChange={(event) => setJoinCode(cleanCode(event.target.value))}
              autoCapitalize="characters"
              autoComplete="off"
              inputMode="text"
              maxLength={16}
              placeholder="Ví dụ: ABC234"
            />
          </label>

          <label>
            <span>Họ tên hiển thị</span>
            <input
              value={displayName}
              onChange={(event) => setDisplayName(event.target.value.slice(0, 80))}
              autoComplete="name"
              maxLength={80}
              placeholder="Nguyễn Văn A"
              onKeyDown={(event) => {
                if (event.key === 'Enter' && joinCode.length >= 4 && displayName.trim().length >= 2) void join();
              }}
            />
          </label>

          {error ? <div className="cj-error" role="alert">{error}</div> : null}
          {loading ? <div className="cj-status">Đang khôi phục phiên lớp học…</div> : null}

          <button
            type="button"
            className="cj-primary"
            onClick={join}
            disabled={joining || joinCode.length < 4 || displayName.trim().length < 2}
          >
            {joining ? 'Đang vào lớp…' : 'Vào lớp'}
          </button>
          <button type="button" className="cj-link" onClick={() => { window.location.hash = '#/home'; }}>
            ← Về Brian English
          </button>
        </section>
      </main>
    );
  }

  const session = state.session || {};
  const participant = state.participant || {};
  const team = (state.teams || []).find((entry) => entry.id === participant.teamId);
  const isLive = session.status === 'live';
  const isPaused = session.status === 'paused';

  return (
    <main className="classroom-join-page">
      <section className="cj-shell">
        <header className="cj-session-header">
          <div>
            <span>BRIAN CLASSROOM LIVE</span>
            <h1>{session.title || 'Lớp học trực tiếp'}</h1>
            <p>{participant.displayName || displayName}{team ? ` · ${team.name}` : ''}</p>
          </div>
          <div className="cj-header-actions">
            {remaining !== null ? <strong className={remaining <= 15 ? 'is-warning' : ''}>⏱ {remaining}s</strong> : null}
            <button type="button" onClick={leave}>Rời lớp</button>
          </div>
        </header>

        {session.settings?.showTeamScore !== false && (state.teams || []).length ? (
          <div className="cj-team-strip">
            {(state.teams || []).map((entry) => (
              <div key={entry.id} className={entry.id === participant.teamId ? 'is-current' : ''}>
                <span>{entry.name}</span><b>{entry.score ?? 0}</b>
              </div>
            ))}
          </div>
        ) : null}

        {!isLive ? (
          <section className="cj-card cj-waiting">
            <div className="cj-pulse" aria-hidden="true" />
            <h2>{isPaused ? 'Giáo viên đang tạm dừng hoạt động' : 'Đã vào lớp thành công'}</h2>
            <p>{isPaused ? 'Giữ trang này mở. Hoạt động sẽ tiếp tục khi giáo viên mở lại.' : 'Giữ trang này mở. Câu hỏi sẽ xuất hiện khi giáo viên bắt đầu.'}</p>
            <small>Mã phòng · {session.joinCode}</small>
          </section>
        ) : currentItem ? (
          <section className="cj-card cj-activity">
            <div className="cj-activity-meta">
              <span>Hoạt động {Number(state.itemIndex || 0) + 1}/{Math.max(1, Number(state.itemCount || 1))}</span>
              {existing ? <b>✓ Đã gửi</b> : null}
            </div>
            <h2>{itemPrompt(currentItem)}</h2>
            {currentItem.description ? <p className="cj-description">{currentItem.description}</p> : null}

            {mode === 'check-in' ? (
              <button
                type="button"
                className="cj-checkin"
                disabled={submitting}
                onClick={() => void submit('present')}
              >
                {existing ? '✓ Đã điểm danh' : submitting ? 'Đang gửi…' : 'Có mặt'}
              </button>
            ) : options.length ? (
              <div className="cj-options">
                {options.map((option, index) => {
                  const selected = answer === option.id || answer === option.label;
                  return (
                    <button
                      type="button"
                      key={`${option.id}-${index}`}
                      className={selected ? 'is-selected' : ''}
                      disabled={submitting}
                      onClick={() => {
                        setAnswer(option.id);
                        void submit(option.id);
                      }}
                    >
                      <b>{String.fromCharCode(65 + index)}</b>
                      <span>{option.label}</span>
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="cj-short-answer">
                <textarea
                  value={answer}
                  onChange={(event) => setAnswer(event.target.value.slice(0, 4000))}
                  maxLength={4000}
                  placeholder="Nhập câu trả lời của em…"
                />
                <button type="button" className="cj-primary" disabled={submitting || !answer.trim()} onClick={() => void submit()}>
                  {submitting ? 'Đang gửi…' : existing ? 'Cập nhật câu trả lời' : 'Gửi câu trả lời'}
                </button>
              </div>
            )}

            {error ? <div className="cj-error" role="alert">{error}</div> : null}
          </section>
        ) : (
          <section className="cj-card cj-waiting">
            <div className="cj-pulse" aria-hidden="true" />
            <h2>Đang chờ hoạt động tiếp theo</h2>
            <p>Giáo viên đang chuẩn bị nội dung. Trang sẽ tự cập nhật.</p>
          </section>
        )}

        <footer className="cj-footnote">Phiên tham gia được giữ trên thiết bị này trong tab hiện tại · Không cần tài khoản học sinh.</footer>
      </section>
    </main>
  );
}
