import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '../utils/supabase.js';
import './QuestionBank.css';

const TABS = [
  ['questions', 'Kho câu hỏi'],
  ['bundles', 'Chùm bài'],
  ['tests', 'Đề thi'],
  ['chatgpt', 'Kết nối ChatGPT'],
];

function text(value) {
  return String(value ?? '').trim();
}

function compact(value, limit = 180) {
  const result = text(value).replace(/\s+/g, ' ');
  return result.length > limit ? `${result.slice(0, limit)}…` : result;
}

function answerLabel(value) {
  return text(value) || '—';
}

function statusLabel(status) {
  const map = { draft: 'Bản nháp', approved: 'Đã duyệt', review: 'Chờ duyệt', archived: 'Lưu trữ' };
  return map[text(status).toLowerCase()] || text(status) || 'Bản nháp';
}

function cognitiveLabel(value) {
  const map = { recognition: 'Nhận biết', comprehension: 'Thông hiểu', application: 'Vận dụng' };
  return map[text(value).toLowerCase()] || text(value) || '—';
}

function bytesToBase64Url(bytes) {
  let binary = '';
  bytes.forEach((byte) => { binary += String.fromCharCode(byte); });
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

async function sha256(value) {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

async function questionFingerprint(question) {
  return sha256(JSON.stringify({
    bundle: '',
    stem: text(question.stem).replace(/\s+/g, ' ').toLowerCase(),
    options: question.options.map((item) => text(item).replace(/\s+/g, ' ').toLowerCase()),
    correct: text(question.correctAnswer).toLowerCase(),
  }));
}

function EmptyState({ title, hint }) {
  return (
    <div className="qb-empty">
      <span className="qb-empty-mark" aria-hidden="true">QB</span>
      <strong>{title}</strong>
      <p>{hint}</p>
    </div>
  );
}

export default function QuestionBank({ currentUser }) {
  const userId = currentUser?.id || '';
  const [activeTab, setActiveTab] = useState('questions');
  const [questions, setQuestions] = useState([]);
  const [bundles, setBundles] = useState([]);
  const [tests, setTests] = useState([]);
  const [testCounts, setTestCounts] = useState({});
  const [integration, setIntegration] = useState(null);
  const [importEvents, setImportEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [query, setQuery] = useState('');
  const [grade, setGrade] = useState('');
  const [cefr, setCefr] = useState('');
  const [showNew, setShowNew] = useState(false);
  const [generatedKey, setGeneratedKey] = useState('');
  const [disconnectArmed, setDisconnectArmed] = useState(false);
  const [draft, setDraft] = useState({
    stem: '',
    options: ['', '', '', ''],
    correctAnswer: 'A',
    explanation: '',
    grade: '12',
    cefr: 'B1',
    skill: 'Use of English',
    topic: '',
    cognitiveLevel: 'recognition',
    difficulty: '2',
    grammarPoint: '',
    tags: '',
  });

  const openApiUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/brian-question-bank-openapi.json`
    : '/brian-question-bank-openapi.json';

  const loadData = useCallback(async () => {
    if (!userId || !supabase) return;
    setLoading(true);
    setMessage('');
    try {
      const [itemsResult, bundlesResult, testsResult, integrationResult, eventsResult] = await Promise.all([
        supabase.from('assessment_items')
          .select('id,bundle_id,bundle_position,status,question_type,stem,options,correct_answer,explanation,skill,cefr,topic,cognitive_level,difficulty,source,usage_count,grade,unit_name,school_year,grammar_point,tags,source_kind,source_reference,created_at,updated_at')
          .eq('owner_id', userId).order('updated_at', { ascending: false }).limit(500),
        supabase.from('assessment_bundles')
          .select('*').eq('owner_id', userId).order('updated_at', { ascending: false }).limit(200),
        supabase.from('assessment_tests')
          .select('*').eq('owner_id', userId).order('updated_at', { ascending: false }).limit(200),
        supabase.from('question_bank_integrations')
          .select('id,provider,label,active,last_used_at,created_at,updated_at')
          .eq('owner_id', userId).eq('provider', 'chatgpt').maybeSingle(),
        supabase.from('assessment_import_events')
          .select('id,request_id,imported_items,reused_items,imported_bundles,imported_tests,details,created_at')
          .eq('owner_id', userId).order('created_at', { ascending: false }).limit(12),
      ]);
      for (const result of [itemsResult, bundlesResult, testsResult, integrationResult, eventsResult]) {
        if (result?.error) throw result.error;
      }
      const nextTests = testsResult.data || [];
      let counts = {};
      if (nextTests.length) {
        const { data, error } = await supabase.from('assessment_test_items')
          .select('test_id').in('test_id', nextTests.map((item) => item.id));
        if (error) throw error;
        counts = (data || []).reduce((acc, item) => {
          acc[item.test_id] = (acc[item.test_id] || 0) + 1;
          return acc;
        }, {});
      }
      setQuestions(itemsResult.data || []);
      setBundles(bundlesResult.data || []);
      setTests(nextTests);
      setTestCounts(counts);
      setIntegration(integrationResult.data || null);
      setImportEvents(eventsResult.data || []);
    } catch (error) {
      setMessage(error?.message || 'Không thể tải Ngân hàng câu hỏi.');
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => { loadData(); }, [loadData]);

  const filteredQuestions = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return questions.filter((item) => {
      if (grade && String(item.grade || '') !== grade) return false;
      if (cefr && text(item.cefr).toUpperCase() !== cefr) return false;
      if (!needle) return true;
      return [item.stem, item.topic, item.grammar_point, item.skill, ...(item.tags || [])]
        .some((value) => text(value).toLowerCase().includes(needle));
    });
  }, [questions, query, grade, cefr]);

  const sourceStats = useMemo(() => ({
    chatgpt: questions.filter((item) => item.source_kind === 'chatgpt').length,
    bundles: bundles.length,
    tests: tests.length,
    total: questions.length,
  }), [questions, bundles, tests]);

  const updateOption = (index, value) => {
    setDraft((current) => {
      const options = [...current.options];
      options[index] = value;
      return { ...current, options };
    });
  };

  const saveManualQuestion = async (event) => {
    event.preventDefault();
    if (!userId || !text(draft.stem)) return;
    setMessage('');
    try {
      const fingerprint = await questionFingerprint(draft);
      const row = {
        owner_id: userId,
        visibility: 'private',
        status: 'draft',
        question_type: 'mcq',
        stem: text(draft.stem),
        options: draft.options.map(text).filter(Boolean),
        correct_answer: text(draft.correctAnswer),
        explanation: text(draft.explanation),
        skill: text(draft.skill) || 'Use of English',
        cefr: text(draft.cefr) || 'B1',
        topic: text(draft.topic),
        cognitive_level: text(draft.cognitiveLevel) || 'recognition',
        difficulty: Number(draft.difficulty || 2),
        source: 'Brian Question Bank',
        grade: Number(draft.grade || 0) || null,
        grammar_point: text(draft.grammarPoint),
        tags: text(draft.tags).split(',').map((item) => item.trim()).filter(Boolean),
        source_kind: 'manual',
        fingerprint,
        updated_at: new Date().toISOString(),
      };
      const { error } = await supabase.from('assessment_items').insert(row);
      if (error) {
        if (error.code === '23505') throw new Error('Câu hỏi này đã có trong ngân hàng.');
        throw error;
      }
      setDraft((current) => ({ ...current, stem: '', options: ['', '', '', ''], explanation: '', topic: '', grammarPoint: '', tags: '' }));
      setShowNew(false);
      setMessage('Đã lưu câu hỏi mới.');
      await loadData();
    } catch (error) {
      setMessage(error?.message || 'Không thể lưu câu hỏi.');
    }
  };

  const createChatGptKey = async () => {
    if (!userId || !supabase || !crypto?.subtle) return;
    setMessage('');
    try {
      const random = new Uint8Array(32);
      crypto.getRandomValues(random);
      const raw = `brian_qb_${bytesToBase64Url(random)}`;
      const tokenHash = await sha256(raw);
      const { data, error } = await supabase.from('question_bank_integrations').upsert({
        owner_id: userId,
        provider: 'chatgpt',
        label: 'ChatGPT',
        token_hash: tokenHash,
        active: true,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'owner_id,provider' }).select('id,provider,label,active,last_used_at,created_at,updated_at').single();
      if (error) throw error;
      setIntegration(data);
      setGeneratedKey(raw);
      setDisconnectArmed(false);
      setMessage('Đã tạo khóa kết nối mới. Khóa cũ (nếu có) đã bị thay thế.');
    } catch (error) {
      setMessage(error?.message || 'Không thể tạo khóa kết nối.');
    }
  };

  const disconnect = async () => {
    if (!integration?.id) return;
    if (!disconnectArmed) {
      setDisconnectArmed(true);
      setMessage('Nhấn “Ngắt kết nối” thêm một lần để xác nhận.');
      return;
    }
    try {
      const { error } = await supabase.from('question_bank_integrations')
        .update({ active: false, updated_at: new Date().toISOString() })
        .eq('id', integration.id).eq('owner_id', userId);
      if (error) throw error;
      setGeneratedKey('');
      setDisconnectArmed(false);
      setMessage('Đã ngắt kết nối ChatGPT.');
      await loadData();
    } catch (error) {
      setMessage(error?.message || 'Không thể ngắt kết nối.');
    }
  };

  const copyValue = async (value, success) => {
    try {
      await navigator.clipboard.writeText(value);
      setMessage(success);
    } catch {
      setMessage('Trình duyệt không cho phép sao chép tự động. Hãy chọn và sao chép thủ công.');
    }
  };

  return (
    <section className="qb-shell">
      <header className="qb-hero">
        <div>
          <p className="qb-eyebrow">BRIAN ENGLISH · ASSESSMENT CORE</p>
          <h1>Ngân hàng <em>câu hỏi</em></h1>
          <p className="qb-lede">Lưu câu hỏi, giữ nguyên chùm ngữ liệu, quản lý đề thi và nhận đề trực tiếp từ ChatGPT.</p>
          <div className="qb-hero-actions">
            <button type="button" className="qb-primary" onClick={() => { setActiveTab('questions'); setShowNew(true); }}>+ Thêm câu hỏi</button>
            <button type="button" className="qb-secondary" onClick={() => setActiveTab('chatgpt')}>Kết nối ChatGPT</button>
          </div>
        </div>
        <div className="qb-hero-card" aria-label="Tổng quan ngân hàng câu hỏi">
          <span className="qb-orbit qb-orbit-a" />
          <span className="qb-orbit qb-orbit-b" />
          <div className="qb-hero-logo">QB</div>
          <strong>{sourceStats.total}</strong>
          <small>câu hỏi đã lưu</small>
          <div className="qb-mini-stats">
            <span><b>{sourceStats.chatgpt}</b> từ ChatGPT</span>
            <span><b>{sourceStats.tests}</b> đề thi</span>
          </div>
        </div>
      </header>

      <div className="qb-stats">
        <article><span>Tổng câu hỏi</span><strong>{sourceStats.total}</strong></article>
        <article><span>Chùm bài</span><strong>{sourceStats.bundles}</strong></article>
        <article><span>Đề thi</span><strong>{sourceStats.tests}</strong></article>
        <article><span>ChatGPT</span><strong className={integration?.active ? 'is-online' : ''}>{integration?.active ? 'Đã kết nối' : 'Chưa kết nối'}</strong></article>
      </div>

      <nav className="qb-tabs" aria-label="Ngân hàng câu hỏi">
        {TABS.map(([id, label]) => (
          <button key={id} type="button" className={activeTab === id ? 'active' : ''} onClick={() => setActiveTab(id)}>{label}</button>
        ))}
      </nav>

      {message ? <div className="qb-message" role="status">{message}</div> : null}
      {loading ? <div className="qb-loading">Đang đồng bộ dữ liệu…</div> : null}

      {!loading && activeTab === 'questions' ? (
        <div className="qb-panel">
          <div className="qb-toolbar">
            <label className="qb-search"><span>Tìm</span><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Nội dung, chủ đề, grammar, tag…" /></label>
            <label><span>Khối</span><select value={grade} onChange={(e) => setGrade(e.target.value)}><option value="">Tất cả</option><option>10</option><option>11</option><option>12</option></select></label>
            <label><span>CEFR</span><select value={cefr} onChange={(e) => setCefr(e.target.value)}><option value="">Tất cả</option><option>A2</option><option>B1</option><option>B2</option><option>C1</option></select></label>
            <button type="button" className="qb-primary qb-small" onClick={() => setShowNew((value) => !value)}>{showNew ? 'Đóng' : '+ Thêm câu'}</button>
          </div>

          {showNew ? (
            <form className="qb-new-form" onSubmit={saveManualQuestion}>
              <div className="qb-form-head"><strong>Thêm câu hỏi thủ công</strong><small>Câu mới được lưu ở trạng thái Bản nháp và riêng tư.</small></div>
              <label className="qb-span-2"><span>Câu hỏi</span><textarea required rows="3" value={draft.stem} onChange={(e) => setDraft({ ...draft, stem: e.target.value })} /></label>
              {draft.options.map((option, index) => <label key={index}><span>Phương án {String.fromCharCode(65 + index)}</span><input value={option} onChange={(e) => updateOption(index, e.target.value)} /></label>)}
              <label><span>Đáp án</span><select value={draft.correctAnswer} onChange={(e) => setDraft({ ...draft, correctAnswer: e.target.value })}><option>A</option><option>B</option><option>C</option><option>D</option></select></label>
              <label><span>Khối</span><select value={draft.grade} onChange={(e) => setDraft({ ...draft, grade: e.target.value })}><option>10</option><option>11</option><option>12</option></select></label>
              <label><span>CEFR</span><select value={draft.cefr} onChange={(e) => setDraft({ ...draft, cefr: e.target.value })}><option>A2</option><option>B1</option><option>B2</option><option>C1</option></select></label>
              <label><span>Mức nhận thức</span><select value={draft.cognitiveLevel} onChange={(e) => setDraft({ ...draft, cognitiveLevel: e.target.value })}><option value="recognition">Nhận biết</option><option value="comprehension">Thông hiểu</option><option value="application">Vận dụng</option></select></label>
              <label><span>Chủ đề</span><input value={draft.topic} onChange={(e) => setDraft({ ...draft, topic: e.target.value })} /></label>
              <label><span>Grammar point</span><input value={draft.grammarPoint} onChange={(e) => setDraft({ ...draft, grammarPoint: e.target.value })} /></label>
              <label><span>Tags (cách nhau bằng dấu phẩy)</span><input value={draft.tags} onChange={(e) => setDraft({ ...draft, tags: e.target.value })} /></label>
              <label className="qb-span-2"><span>Giải thích</span><textarea rows="2" value={draft.explanation} onChange={(e) => setDraft({ ...draft, explanation: e.target.value })} /></label>
              <div className="qb-form-actions qb-span-2"><button type="submit" className="qb-primary">Lưu vào ngân hàng</button></div>
            </form>
          ) : null}

          {filteredQuestions.length ? (
            <div className="qb-question-list">
              {filteredQuestions.map((item, index) => (
                <article className="qb-question-card" key={item.id}>
                  <div className="qb-question-number">{String(index + 1).padStart(2, '0')}</div>
                  <div className="qb-question-main">
                    <div className="qb-chips">
                      {item.grade ? <span>Khối {item.grade}</span> : null}
                      {item.cefr ? <span>{item.cefr}</span> : null}
                      <span>{cognitiveLabel(item.cognitive_level)}</span>
                      {item.grammar_point ? <span>{item.grammar_point}</span> : null}
                      {item.source_kind === 'chatgpt' ? <span className="is-chatgpt">ChatGPT</span> : null}
                    </div>
                    <strong className="qb-stem">{compact(item.stem, 420)}</strong>
                    {Array.isArray(item.options) && item.options.length ? (
                      <div className="qb-options">{item.options.map((option, optionIndex) => <span key={optionIndex}><b>{String.fromCharCode(65 + optionIndex)}.</b> {compact(option, 180)}</span>)}</div>
                    ) : null}
                    <div className="qb-question-foot">
                      <span>Đáp án: <b>{answerLabel(item.correct_answer)}</b></span>
                      <span>{item.topic || item.skill || 'Chưa gắn chủ đề'}</span>
                      <span>{statusLabel(item.status)}</span>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          ) : <EmptyState title="Chưa có câu hỏi phù hợp" hint="Thêm thủ công hoặc gửi một đề từ ChatGPT vào Brian." />}
        </div>
      ) : null}

      {!loading && activeTab === 'bundles' ? (
        <div className="qb-panel">
          <div className="qb-section-head"><div><p>CONTEXT-AWARE BANK</p><h2>Chùm bài</h2></div><span>Một ngữ liệu được giữ nguyên cùng toàn bộ câu hỏi đi kèm.</span></div>
          {bundles.length ? <div className="qb-grid">{bundles.map((bundle) => {
            const count = questions.filter((item) => item.bundle_id === bundle.id).length;
            return <article className="qb-bundle-card" key={bundle.id}>
              <div className="qb-bundle-top"><span>{bundle.bundle_type || 'passage'}</span><b>{count} câu</b></div>
              <h3>{bundle.title || 'Chùm bài chưa đặt tên'}</h3>
              <p>{compact(bundle.context_text, 360) || 'Chưa có nội dung ngữ liệu.'}</p>
              <div className="qb-card-meta"><span>{bundle.grade ? `Khối ${bundle.grade}` : 'Nhiều khối'}</span><span>{bundle.skill || bundle.topic || 'General'}</span><span>{bundle.source_kind === 'chatgpt' ? 'ChatGPT' : 'Brian'}</span></div>
            </article>;
          })}</div> : <EmptyState title="Chưa có chùm bài" hint="Khi ChatGPT tạo reading, cloze hoặc một cụm câu dùng chung ngữ liệu, Brian sẽ lưu chúng thành chùm." />}
        </div>
      ) : null}

      {!loading && activeTab === 'tests' ? (
        <div className="qb-panel">
          <div className="qb-section-head"><div><p>ASSESSMENT LIBRARY</p><h2>Đề thi</h2></div><span>Đề được lưu riêng, nhưng tái sử dụng câu hỏi trong cùng ngân hàng.</span></div>
          {tests.length ? <div className="qb-grid">{tests.map((test) => (
            <article className="qb-test-card" key={test.id}>
              <div className="qb-test-icon">EXAM</div>
              <div>
                <div className="qb-chips"><span>{statusLabel(test.status)}</span>{test.source_kind === 'chatgpt' ? <span className="is-chatgpt">ChatGPT</span> : null}</div>
                <h3>{test.title}</h3>
                <p>{testCounts[test.id] || 0} câu hỏi · {test.grade ? `Khối ${test.grade}` : 'Chưa gắn khối'}{test.school_year ? ` · ${test.school_year}` : ''}</p>
              </div>
            </article>
          ))}</div> : <EmptyState title="Chưa có đề thi" hint="Sau khi ChatGPT soạn đề, dùng lệnh “lưu vào Ngân hàng câu hỏi Brian” để đề xuất hiện tại đây." />}
        </div>
      ) : null}

      {!loading && activeTab === 'chatgpt' ? (
        <div className="qb-panel qb-connect">
          <div className="qb-connect-main">
            <div className="qb-section-head"><div><p>SECURE CONNECTOR</p><h2>Kết nối ChatGPT</h2></div><span className={integration?.active ? 'qb-live' : 'qb-offline'}>{integration?.active ? '● Đang hoạt động' : '○ Chưa kết nối'}</span></div>
            <div className="qb-connect-steps">
              <article><b>1</b><div><strong>Tạo khóa Brian</strong><p>Khóa riêng cho Ngân hàng câu hỏi. Brian chỉ lưu SHA-256 hash, không lưu khóa gốc.</p></div></article>
              <article><b>2</b><div><strong>Thêm Action vào ChatGPT</strong><p>Dùng OpenAPI URL bên dưới và chọn Bearer API key làm phương thức xác thực.</p></div></article>
              <article><b>3</b><div><strong>Soạn đề như bình thường</strong><p>Sau khi hoàn tất, yêu cầu ChatGPT lưu đề hoặc câu hỏi vào Brian.</p></div></article>
            </div>

            <div className="qb-connect-box">
              <label><span>OpenAPI URL</span><div className="qb-copy-row"><input readOnly value={openApiUrl} /><button type="button" onClick={() => copyValue(openApiUrl, 'Đã sao chép OpenAPI URL.')}>Sao chép</button></div></label>
              {generatedKey ? <label><span>Khóa kết nối — chỉ hiển thị trong phiên này</span><div className="qb-copy-row"><input readOnly value={generatedKey} /><button type="button" onClick={() => copyValue(generatedKey, 'Đã sao chép khóa kết nối.')}>Sao chép</button></div><small>Hãy lưu khóa vào phần Authentication của Action. Nếu mất khóa, tạo khóa mới.</small></label> : null}
              <div className="qb-connect-actions">
                <button type="button" className="qb-primary" onClick={createChatGptKey}>{integration?.active ? 'Tạo khóa mới' : 'Tạo khóa kết nối'}</button>
                {integration?.active ? <button type="button" className={disconnectArmed ? 'qb-danger is-armed' : 'qb-danger'} onClick={disconnect}>Ngắt kết nối</button> : null}
              </div>
            </div>

            <div className="qb-prompt">
              <span>Lệnh mẫu sau khi đã kết nối</span>
              <blockquote>“Sau khi soạn xong đề này, hãy dùng Brian Question Bank để lưu toàn bộ đề, đáp án, giải thích và metadata vào Ngân hàng câu hỏi Brian.”</blockquote>
            </div>
          </div>

          <aside className="qb-import-history">
            <h3>Lịch sử nhận từ ChatGPT</h3>
            {importEvents.length ? importEvents.map((event) => (
              <article key={event.id}>
                <span>{new Date(event.created_at).toLocaleString('vi-VN')}</span>
                <strong>{event.details?.title || 'Nhập dữ liệu'}</strong>
                <p>+{event.imported_items} câu mới · {event.reused_items} câu đã có{event.imported_tests ? ` · ${event.imported_tests} đề` : ''}</p>
              </article>
            )) : <p className="qb-muted">Chưa có lần nhập nào.</p>}
          </aside>
        </div>
      ) : null}
    </section>
  );
}
