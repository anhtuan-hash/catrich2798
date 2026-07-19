import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { getRuntimeClient } from '../services/runtime/core.js';
import { useRuntimeCore } from '../services/runtime/useRuntimeCore.js';
import { downloadText, readLocal, safeJsonParse, scopedLocalKey, uid, writeLocal } from './v1093/shared.js';

const TYPES = [['mcq','Trắc nghiệm'],['cloze','Cloze'],['wordform','Word form'],['ordering','Sắp xếp'],['short_answer','Trả lời ngắn'],['reading','Đọc hiểu'],['listening','Nghe']];
const SKILLS = ['Grammar','Vocabulary','Reading','Listening','Use of English','Pronunciation'];
const CEFR = ['A1','A2','B1','B2','C1','C2'];

function normalizeOptions(value) {
  if (Array.isArray(value)) return value.filter(Boolean).map(String);
  if (value && typeof value === 'object') return Object.values(value).filter(Boolean).map(String);
  return [];
}

function parseQuestions(text, defaults) {
  const raw = String(text || '').replace(/\r/g, '').trim();
  if (!raw) return [];
  const blocks = raw.split(/\n(?=\s*(?:Câu\s*)?\d+[.):-]\s*)/i);
  const questions = [];
  blocks.forEach((block, blockIndex) => {
    const lines = block.split('\n').map((line) => line.trim()).filter(Boolean);
    if (!lines.length) return;
    const answerLine = lines.find((line) => /^(?:answer|đáp án)\s*[:：]/i.test(line));
    const explanationLine = lines.find((line) => /^(?:explanation|giải thích)\s*[:：]/i.test(line));
    const optionLines = lines.filter((line) => /^[A-D][.)]\s+/i.test(line));
    const stemLines = lines.filter((line) => !/^[A-D][.)]\s+/i.test(line) && !/^(?:answer|đáp án|explanation|giải thích)\s*[:：]/i.test(line));
    const stem = stemLines.join(' ').replace(/^\s*(?:Câu\s*)?\d+[.):-]\s*/i, '').trim();
    if (!stem) return;
    const options = optionLines.map((line) => line.replace(/^[A-D][.)]\s*/i, '').trim());
    let answer = answerLine?.replace(/^(?:answer|đáp án)\s*[:：]\s*/i, '').trim() || '';
    if (/^[A-D]$/i.test(answer) && options.length) answer = options[answer.toUpperCase().charCodeAt(0) - 65] || answer;
    questions.push({
      id: uid(`import-${blockIndex}`), question_type: options.length ? 'mcq' : defaults.question_type,
      stem, options, correct_answer: answer, explanation: explanationLine?.replace(/^(?:explanation|giải thích)\s*[:：]\s*/i, '').trim() || '',
      skill: defaults.skill, cefr: defaults.cefr, topic: defaults.topic, cognitive_level: defaults.cognitive_level,
      difficulty: defaults.difficulty, status: 'approved', source: 'paste-import',
    });
  });
  if (questions.length) return questions;
  return raw.split('\n').filter(Boolean).map((line, index) => ({ id: uid(`line-${index}`), question_type: defaults.question_type, stem: line.replace(/^\d+[.)]\s*/, ''), options: [], correct_answer: '', explanation: '', ...defaults, status: 'draft', source: 'line-import' }));
}

function shuffle(array) {
  const next = [...array];
  for (let i = next.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [next[i], next[j]] = [next[j], next[i]];
  }
  return next;
}

function renderTestHtml(test, items) {
  const data = JSON.stringify({ test, items }).replace(/</g, '\\u003c');
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${test.title}</title><style>body{font-family:Arial,sans-serif;background:#eef3f8;margin:0;padding:24px;color:#10264a}.paper{max-width:900px;margin:auto;background:#fff;padding:32px;border:1px solid #a9bad0}.question{padding:18px 0;border-bottom:1px solid #dde5ef}.options{display:grid;gap:8px;margin-top:12px}.answer-key{page-break-before:always;margin-top:40px}@media print{body{background:#fff;padding:0}.paper{border:0}}</style></head><body><main class="paper"><h1>${test.title}</h1><p>${items.length} questions · Brian English Studio V10.93</p><div id="questions"></div><section class="answer-key"><h2>Answer key</h2><ol id="answers"></ol></section></main><script>const data=${data};document.getElementById('questions').innerHTML=data.items.map((q,i)=>'<section class="question"><b>'+(i+1)+'. '+q.stem+'</b>'+(q.options&&q.options.length?'<div class="options">'+q.options.map((o,j)=>'<span>'+String.fromCharCode(65+j)+'. '+o+'</span>').join('')+'</div>':'')+'</section>').join('');document.getElementById('answers').innerHTML=data.items.map(q=>'<li>'+q.correct_answer+'</li>').join('');</script></body></html>`;
}

export default function AssessmentCore({ currentUser }) {
  const runtime = useRuntimeCore();
  const client = getRuntimeClient();
  const localKey = scopedLocalKey('bes-assessment-core-v1093', currentUser);
  const [tab, setTab] = useState('bank');
  const [items, setItems] = useState([]);
  const [blueprints, setBlueprints] = useState([]);
  const [tests, setTests] = useState([]);
  const [testLinks, setTestLinks] = useState([]);
  const [selectedTestId, setSelectedTestId] = useState('');
  const [query, setQuery] = useState('');
  const [skillFilter, setSkillFilter] = useState('all');
  const [cefrFilter, setCefrFilter] = useState('all');
  const [importText, setImportText] = useState('');
  const [importDefaults, setImportDefaults] = useState({ question_type: 'mcq', skill: 'Grammar', cefr: 'B2', topic: '', cognitive_level: 'application', difficulty: 3 });
  const [previewItems, setPreviewItems] = useState([]);
  const [blueprint, setBlueprint] = useState({ title: 'Đề kiểm tra mới', total_items: 40, levels: ['B1','B2','C1'], skills: ['Grammar','Vocabulary','Reading'], avoid_used: true });
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (client && runtime.session) {
      const results = await Promise.all([
        client.from('assessment_items').select('*').order('updated_at', { ascending: false }).limit(3000),
        client.from('assessment_blueprints').select('*').order('updated_at', { ascending: false }).limit(300),
        client.from('assessment_tests').select('*').order('updated_at', { ascending: false }).limit(300),
        client.from('assessment_test_items').select('*').order('position').limit(10000),
      ]);
      const firstError = results.find((result) => result.error)?.error;
      if (!firstError) {
        setItems((results[0].data || []).map((item) => ({ ...item, options: normalizeOptions(item.options) })));
        setBlueprints(results[1].data || []); setTests(results[2].data || []); setTestLinks(results[3].data || []);
        return;
      }
      if (!/does not exist|schema cache/i.test(firstError.message || '')) setError(firstError.message);
    }
    const local = readLocal(localKey, { items: [], blueprints: [], tests: [], testLinks: [] });
    setItems(local.items || []); setBlueprints(local.blueprints || []); setTests(local.tests || []); setTestLinks(local.testLinks || []);
  }, [client, localKey, runtime.session]);

  useEffect(() => {
    const transfer = safeJsonParse(sessionStorage.getItem('bes-v1093-content-to-assessment'), null);
    if (transfer?.items?.length) {
      const imported = transfer.items.map((item) => ({ id: uid('transfer'), question_type: item.options?.length ? 'mcq' : 'short_answer', stem: item.prompt || '', options: normalizeOptions(item.options), correct_answer: item.answer || '', explanation: item.explanation || '', skill: 'Use of English', cefr: transfer.level || 'B2', topic: transfer.title || '', cognitive_level: 'application', difficulty: 3, status: 'approved', source: transfer.source || 'content-factory' }));
      setPreviewItems(imported); setTab('import'); setNotice(`Đã nhận ${imported.length} câu từ Content Factory.`);
      sessionStorage.removeItem('bes-v1093-content-to-assessment');
    }
    load();
  }, [load]);

  function persistLocal(next) { writeLocal(localKey, next); }

  const filteredItems = useMemo(() => items.filter((item) => {
    if (skillFilter !== 'all' && item.skill !== skillFilter) return false;
    if (cefrFilter !== 'all' && item.cefr !== cefrFilter) return false;
    return `${item.stem} ${item.topic} ${item.skill}`.toLowerCase().includes(query.trim().toLowerCase());
  }), [items, query, skillFilter, cefrFilter]);

  const selectedTest = tests.find((test) => test.id === selectedTestId) || tests[0] || null;
  const selectedTestItems = useMemo(() => {
    if (!selectedTest) return [];
    return testLinks.filter((link) => link.test_id === selectedTest.id).sort((a,b) => a.position - b.position).map((link) => items.find((item) => item.id === link.item_id)).filter(Boolean);
  }, [selectedTest, testLinks, items]);

  async function saveImported() {
    if (!previewItems.length) return;
    setBusy(true); setError('');
    try {
      const payload = previewItems.map(({ id, ...item }) => ({ ...item, owner_id: currentUser.id, options: item.options || [], status: item.status || 'approved', updated_at: new Date().toISOString() }));
      let saved;
      if (client && runtime.session) {
        const { data, error: insertError } = await client.from('assessment_items').insert(payload).select('*');
        if (insertError) throw insertError;
        saved = (data || []).map((item) => ({ ...item, options: normalizeOptions(item.options) }));
      } else {
        saved = payload.map((item) => ({ ...item, id: uid('question'), created_at: new Date().toISOString() }));
        persistLocal({ items: [...saved, ...items], blueprints, tests, testLinks });
      }
      setItems((current) => [...saved, ...current]); setPreviewItems([]); setImportText(''); setTab('bank'); setNotice(`Đã thêm ${saved.length} câu vào ngân hàng.`);
    } catch (saveError) { setError(saveError.message || String(saveError)); }
    finally { setBusy(false); }
  }

  async function createBlueprintAndTest() {
    const candidates = items.filter((item) => item.status !== 'archived' && (!blueprint.levels.length || blueprint.levels.includes(item.cefr)) && (!blueprint.skills.length || blueprint.skills.includes(item.skill)));
    if (!candidates.length) { setError('Ngân hàng chưa có câu phù hợp với blueprint.'); return; }
    const selected = shuffle(candidates).slice(0, Math.min(Number(blueprint.total_items), candidates.length));
    setBusy(true); setError('');
    try {
      let blueprintRow; let testRow; let links;
      if (client && runtime.session) {
        const { data: savedBlueprint, error: blueprintError } = await client.from('assessment_blueprints').insert({ owner_id: currentUser.id, title: blueprint.title, total_items: Number(blueprint.total_items), criteria: { levels: blueprint.levels, skills: blueprint.skills, avoid_used: blueprint.avoid_used } }).select('*').single();
        if (blueprintError) throw blueprintError;
        blueprintRow = savedBlueprint;
        const { data: savedTest, error: testError } = await client.from('assessment_tests').insert({ owner_id: currentUser.id, blueprint_id: blueprintRow.id, title: blueprint.title, status: 'draft', settings: { shuffle_questions: true, shuffle_options: true, release_score: 'manual' } }).select('*').single();
        if (testError) throw testError;
        testRow = savedTest;
        const { data: savedLinks, error: linkError } = await client.from('assessment_test_items').insert(selected.map((item,index) => ({ test_id: testRow.id, item_id: item.id, position: index + 1, option_order: [], points: 1 }))).select('*');
        if (linkError) throw linkError;
        links = savedLinks || [];
      } else {
        blueprintRow = { id: uid('blueprint'), owner_id: currentUser.id, ...blueprint, criteria: { levels: blueprint.levels, skills: blueprint.skills }, created_at: new Date().toISOString() };
        testRow = { id: uid('test'), owner_id: currentUser.id, blueprint_id: blueprintRow.id, title: blueprint.title, status: 'draft', settings: {}, created_at: new Date().toISOString() };
        links = selected.map((item,index) => ({ test_id: testRow.id, item_id: item.id, position: index + 1, points: 1 }));
        persistLocal({ items, blueprints: [blueprintRow, ...blueprints], tests: [testRow, ...tests], testLinks: [...links, ...testLinks] });
      }
      setBlueprints((current) => [blueprintRow, ...current]); setTests((current) => [testRow, ...current]); setTestLinks((current) => [...links, ...current]); setSelectedTestId(testRow.id); setTab('tests'); setNotice(`Đã tạo đề gồm ${selected.length} câu.`);
    } catch (createError) { setError(createError.message || String(createError)); }
    finally { setBusy(false); }
  }

  function toggleArray(field, value) {
    const current = blueprint[field];
    setBlueprint({ ...blueprint, [field]: current.includes(value) ? current.filter((entry) => entry !== value) : [...current, value] });
  }

  function exportCodes() {
    if (!selectedTest) return;
    const codes = ['101','102','103','104'].map((code) => ({ code, title: selectedTest.title, items: shuffle(selectedTestItems).map((item) => ({ ...item, options: item.options?.length ? shuffle(item.options) : [] })) }));
    downloadText(`${selectedTest.title}-4-codes.json`, JSON.stringify(codes, null, 2), 'application/json');
  }

  return <section className="v1093-page v1093-assessment-core">
    <header className="v1093-hero v1093-hero-assessment"><div><span className="v1093-kicker">V10.93 · Assessment Core</span><h1>Ngân hàng câu hỏi & đề thi</h1><p>Chuẩn hóa câu hỏi, tạo blueprint, sinh nhiều mã đề và tái sử dụng dữ liệu đánh giá.</p></div><div className="v1093-assessment-score"><strong>{items.length}</strong><span>câu hỏi</span></div></header>
    {error && <div className="v1093-alert error"><b>Assessment Core cần xử lý</b><span>{error}</span></div>}{notice && <div className="v1093-alert success">{notice}</div>}
    <nav className="v1093-tabbar">{[['bank','Ngân hàng'],['import','Nhập câu hỏi'],['blueprint','Blueprint'],['tests','Đề thi']].map(([value,label]) => <button key={value} className={tab === value ? 'active' : ''} onClick={() => setTab(value)}>{label}</button>)}</nav>

    {tab === 'bank' && <section className="v1093-panel"><div className="v1093-panel-heading"><div><span>Dữ liệu trung tâm</span><h2>{filteredItems.length} câu hỏi</h2></div><div className="v1093-filter-row"><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Tìm câu hỏi…" /><select value={skillFilter} onChange={(e) => setSkillFilter(e.target.value)}><option value="all">Mọi kỹ năng</option>{SKILLS.map((value) => <option key={value}>{value}</option>)}</select><select value={cefrFilter} onChange={(e) => setCefrFilter(e.target.value)}><option value="all">Mọi CEFR</option>{CEFR.map((value) => <option key={value}>{value}</option>)}</select></div></div><div className="v1093-question-table"><header><span>Câu hỏi</span><span>Loại</span><span>Kỹ năng</span><span>CEFR</span><span>Mức độ</span></header>{filteredItems.map((item) => <article key={item.id}><div><b>{item.stem}</b><small>{item.topic || 'Chưa gắn chủ đề'} · Đáp án: {item.correct_answer || '—'}</small></div><span>{TYPES.find(([value]) => value === item.question_type)?.[1] || item.question_type}</span><span>{item.skill}</span><span>{item.cefr}</span><span>{item.difficulty || 3}/5</span></article>)}{!filteredItems.length && <div className="v1093-empty"><strong>Ngân hàng chưa có câu phù hợp</strong><span>Nhập câu hỏi hoặc đổi bộ lọc.</span></div>}</div></section>}

    {tab === 'import' && <section className="v1093-import-layout"><div className="v1093-panel"><div className="v1093-panel-heading"><div><span>Nguồn nhập</span><h2>Dán câu hỏi</h2></div><button onClick={() => setPreviewItems(parseQuestions(importText, importDefaults))}>Nhận diện</button></div><textarea className="v1093-import-text" value={importText} onChange={(e) => setImportText(e.target.value)} placeholder={'Câu 1. Choose the best answer...\nA. option\nB. option\nC. option\nD. option\nAnswer: B\nExplanation: ...'} /><div className="v1093-form-grid"><label>Dạng<select value={importDefaults.question_type} onChange={(e) => setImportDefaults({ ...importDefaults, question_type: e.target.value })}>{TYPES.map(([value,label]) => <option key={value} value={value}>{label}</option>)}</select></label><label>Kỹ năng<select value={importDefaults.skill} onChange={(e) => setImportDefaults({ ...importDefaults, skill: e.target.value })}>{SKILLS.map((value) => <option key={value}>{value}</option>)}</select></label><label>CEFR<select value={importDefaults.cefr} onChange={(e) => setImportDefaults({ ...importDefaults, cefr: e.target.value })}>{CEFR.map((value) => <option key={value}>{value}</option>)}</select></label><label>Chủ đề<input value={importDefaults.topic} onChange={(e) => setImportDefaults({ ...importDefaults, topic: e.target.value })} /></label></div></div><div className="v1093-panel"><div className="v1093-panel-heading"><div><span>Xem trước</span><h2>{previewItems.length} câu nhận diện</h2></div><button className="v1093-primary" disabled={!previewItems.length || busy} onClick={saveImported}>Lưu vào ngân hàng</button></div><div className="v1093-preview-questions">{previewItems.map((item,index) => <article key={item.id}><b>{index + 1}. {item.stem}</b>{item.options?.map((option,optionIndex) => <span key={optionIndex}>{String.fromCharCode(65 + optionIndex)}. {option}</span>)}<strong>Đáp án: {item.correct_answer || 'Chưa có'}</strong></article>)}</div></div></section>}

    {tab === 'blueprint' && <section className="v1093-panel v1093-blueprint"><div className="v1093-panel-heading"><div><span>Ma trận đề</span><h2>Tạo đề từ ngân hàng</h2></div><button className="v1093-primary" onClick={createBlueprintAndTest} disabled={busy}>Tạo đề</button></div><label>Tên đề<input value={blueprint.title} onChange={(e) => setBlueprint({ ...blueprint, title: e.target.value })} /></label><label>Số câu<input type="number" min="5" max="200" value={blueprint.total_items} onChange={(e) => setBlueprint({ ...blueprint, total_items: e.target.value })} /></label><div className="v1093-blueprint-groups"><section><h3>CEFR</h3>{CEFR.map((value) => <button key={value} className={blueprint.levels.includes(value) ? 'active' : ''} onClick={() => toggleArray('levels', value)}>{value}</button>)}</section><section><h3>Kỹ năng</h3>{SKILLS.map((value) => <button key={value} className={blueprint.skills.includes(value) ? 'active' : ''} onClick={() => toggleArray('skills', value)}>{value}</button>)}</section></div><p>Hệ thống sẽ chọn ngẫu nhiên tối đa {blueprint.total_items} câu phù hợp từ {items.length} câu hiện có.</p></section>}

    {tab === 'tests' && <section className="v1093-tests-layout"><aside className="v1093-project-sidebar"><div className="v1093-panel-heading"><div><span>Đề đã tạo</span><h2>{tests.length}</h2></div></div><div className="v1093-project-list">{tests.map((test) => <article key={test.id} className={selectedTest?.id === test.id ? 'active' : ''}><button onClick={() => setSelectedTestId(test.id)}><b>{test.title}</b><span>{testLinks.filter((link) => link.test_id === test.id).length} câu · {test.status}</span></button></article>)}</div></aside><main className="v1093-panel"><div className="v1093-panel-heading"><div><span>Đề thi</span><h2>{selectedTest?.title || 'Chưa chọn đề'}</h2></div><div><button disabled={!selectedTest} onClick={() => downloadText(`${selectedTest.title}.json`, JSON.stringify({ test: selectedTest, items: selectedTestItems }, null, 2), 'application/json')}>JSON</button><button disabled={!selectedTest} onClick={() => downloadText(`${selectedTest.title}.html`, renderTestHtml(selectedTest, selectedTestItems), 'text/html;charset=utf-8')}>HTML/PDF</button><button disabled={!selectedTest} onClick={exportCodes}>4 mã đề</button></div></div>{selectedTest ? <div className="v1093-test-preview">{selectedTestItems.map((item,index) => <article key={item.id}><b>{index + 1}. {item.stem}</b>{item.options?.map((option,optionIndex) => <span key={optionIndex}>{String.fromCharCode(65 + optionIndex)}. {option}</span>)}<small>Đáp án: {item.correct_answer}</small></article>)}</div> : <div className="v1093-empty"><strong>Chưa có đề thi</strong><span>Tạo blueprint để sinh đề.</span></div>}</main></section>}
  </section>;
}
