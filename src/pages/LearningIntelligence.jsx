import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { getRuntimeClient } from '../services/runtime/core.js';
import { useRuntimeCore } from '../services/runtime/useRuntimeCore.js';
import { downloadText, readLocal, scopedLocalKey, uid, writeLocal } from './v1093/shared.js';

const ERROR_TAXONOMY = [
  ['tense', 'Thì & mốc thời gian'],
  ['verb_form', 'Dạng động từ'],
  ['word_form', 'Biến đổi từ'],
  ['collocation', 'Collocation'],
  ['vocabulary_meaning', 'Nghĩa từ vựng'],
  ['grammar_structure', 'Cấu trúc ngữ pháp'],
  ['reading_detail', 'Chi tiết bài đọc'],
  ['reading_inference', 'Suy luận'],
  ['negation', 'Từ phủ định / ngoại lệ'],
  ['listening_detail', 'Chi tiết bài nghe'],
  ['pronunciation', 'Phát âm'],
  ['spelling', 'Chính tả'],
  ['time_pressure', 'Áp lực thời gian'],
  ['careless', 'Bất cẩn'],
  ['other', 'Khác'],
];

const SKILLS = ['Grammar', 'Vocabulary', 'Reading', 'Listening', 'Use of English', 'Pronunciation'];
const CEFR = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];

function emptyLearner() {
  return { display_name: '', class_name: '', student_code: '', learner_user_id: '', notes: '' };
}

function clamp(value, min = 0, max = 100) {
  return Math.min(max, Math.max(min, Number(value) || 0));
}

function formatPercent(value) {
  return `${Math.round(Number(value) || 0)}%`;
}

function formatShortDate(value) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(date);
}

function normalizeCorrect(value) {
  const raw = String(value ?? '').trim().toLowerCase();
  return ['1', 'true', 'yes', 'y', 'đúng', 'dung', 'correct'].includes(raw);
}

function parseAttemptImport(text, learners) {
  const lines = String(text || '').replace(/\r/g, '').split('\n').map((line) => line.trim()).filter(Boolean);
  if (!lines.length) return { learners: [], attempts: [], errors: [] };
  const delimiter = lines[0].includes('\t') ? '\t' : ',';
  const rows = lines.map((line) => line.split(delimiter).map((cell) => cell.trim()));
  const first = rows[0].map((value) => value.toLowerCase());
  const hasHeader = first.some((value) => ['learner', 'student', 'name', 'học sinh', 'skill', 'correct'].includes(value));
  const dataRows = hasHeader ? rows.slice(1) : rows;
  const headers = hasHeader ? first : ['learner', 'class', 'skill', 'topic', 'cefr', 'correct', 'response_ms', 'error_code'];
  const createdLearners = [];
  const attempts = [];
  const errors = [];
  const learnerMap = new Map(learners.map((item) => [String(item.display_name || '').trim().toLowerCase(), item]));
  const index = (aliases, fallback) => {
    const found = headers.findIndex((header) => aliases.includes(header));
    return found >= 0 ? found : fallback;
  };
  const idx = {
    learner: index(['learner', 'student', 'name', 'học sinh', 'hoc sinh'], 0),
    className: index(['class', 'class_name', 'lớp', 'lop'], 1),
    skill: index(['skill', 'kỹ năng', 'ky nang'], 2),
    topic: index(['topic', 'chủ điểm', 'chu diem'], 3),
    cefr: index(['cefr', 'level', 'trình độ', 'trinh do'], 4),
    correct: index(['correct', 'is_correct', 'đúng', 'dung'], 5),
    responseMs: index(['response_ms', 'time_ms', 'time', 'thời gian', 'thoi gian'], 6),
    errorCode: index(['error_code', 'error', 'lỗi', 'loi'], 7),
  };
  dataRows.forEach((row, rowIndex) => {
    const learnerName = row[idx.learner]?.trim();
    if (!learnerName) { errors.push(`Dòng ${rowIndex + 1}: thiếu tên học sinh.`); return; }
    const learnerKey = learnerName.toLowerCase();
    let learner = learnerMap.get(learnerKey);
    if (!learner) {
      learner = { id: uid('learner-import'), display_name: learnerName, class_name: row[idx.className] || '', student_code: '', notes: 'Tạo từ dữ liệu nhập', localOnly: true };
      learnerMap.set(learnerKey, learner);
      createdLearners.push(learner);
    }
    attempts.push({
      id: uid('attempt-import'), learner_id: learner.id, skill: row[idx.skill] || 'Use of English', topic: row[idx.topic] || 'General',
      cefr: CEFR.includes(row[idx.cefr]) ? row[idx.cefr] : 'B2', is_correct: normalizeCorrect(row[idx.correct]),
      response_time_ms: Math.max(0, Number(row[idx.responseMs]) || 0), error_code: row[idx.errorCode] || '', source: 'csv-import',
      attempted_at: new Date().toISOString(), metadata: {}, localOnly: true,
    });
  });
  return { learners: createdLearners, attempts, errors };
}

function aggregateLearning(learners, attempts, masteryRows) {
  const byLearner = new Map(learners.map((learner) => [learner.id, { learner, attempts: [], mastery: [], errors: new Map() }]));
  attempts.forEach((attempt) => {
    const entry = byLearner.get(attempt.learner_id);
    if (!entry) return;
    entry.attempts.push(attempt);
    if (!attempt.is_correct && attempt.error_code) entry.errors.set(attempt.error_code, (entry.errors.get(attempt.error_code) || 0) + 1);
  });
  masteryRows.forEach((row) => {
    const entry = byLearner.get(row.learner_id);
    if (entry) entry.mastery.push(row);
  });
  const learnerStats = [...byLearner.values()].map((entry) => {
    const total = entry.attempts.length;
    const correct = entry.attempts.filter((attempt) => attempt.is_correct).length;
    const correctness = total ? correct / total * 100 : 0;
    const mastery = entry.mastery.length ? entry.mastery.reduce((sum, row) => sum + Number(row.mastery_score || 0), 0) / entry.mastery.length : correctness;
    const sorted = [...entry.attempts].sort((a, b) => new Date(a.attempted_at || 0) - new Date(b.attempted_at || 0));
    const midpoint = Math.max(1, Math.floor(sorted.length / 2));
    const first = sorted.slice(0, midpoint);
    const last = sorted.slice(midpoint);
    const rate = (items) => items.length ? items.filter((item) => item.is_correct).length / items.length * 100 : 0;
    const trend = rate(last) - rate(first);
    const avgResponse = total ? entry.attempts.reduce((sum, item) => sum + Number(item.response_time_ms || 0), 0) / total : 0;
    const dueReviews = entry.mastery.filter((row) => row.next_review_at && new Date(row.next_review_at) <= new Date()).length;
    const topError = [...entry.errors.entries()].sort((a, b) => b[1] - a[1])[0] || ['', 0];
    return { ...entry, total, correct, correctness, mastery, trend, avgResponse, dueReviews, topError, risk: total >= 4 && (mastery < 60 || correctness < 55 || topError[1] >= 4) };
  });
  const skillMap = new Map();
  attempts.forEach((attempt) => {
    const key = attempt.skill || 'Other';
    const current = skillMap.get(key) || { skill: key, total: 0, correct: 0, errors: 0 };
    current.total += 1;
    current.correct += attempt.is_correct ? 1 : 0;
    current.errors += attempt.is_correct ? 0 : 1;
    skillMap.set(key, current);
  });
  const skillStats = [...skillMap.values()].map((item) => ({ ...item, score: item.total ? item.correct / item.total * 100 : 0 })).sort((a, b) => a.score - b.score);
  const errorMap = new Map();
  attempts.filter((attempt) => !attempt.is_correct).forEach((attempt) => {
    const key = attempt.error_code || 'other';
    const current = errorMap.get(key) || { code: key, count: 0, learners: new Set(), skills: new Map() };
    current.count += 1;
    current.learners.add(attempt.learner_id);
    current.skills.set(attempt.skill || 'Other', (current.skills.get(attempt.skill || 'Other') || 0) + 1);
    errorMap.set(key, current);
  });
  const errorStats = [...errorMap.values()].map((item) => ({ ...item, learnerCount: item.learners.size, topSkill: [...item.skills.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] || '—' })).sort((a, b) => b.count - a.count);
  return { learnerStats, skillStats, errorStats };
}

function buildAdaptivePlan(stat) {
  const attemptGroups = new Map();
  stat.attempts.forEach((attempt) => {
    const key = `${attempt.skill || 'Use of English'} · ${attempt.topic || 'General'}`;
    const current = attemptGroups.get(key) || { key, skill: attempt.skill || 'Use of English', topic: attempt.topic || 'General', total: 0, correct: 0, errors: new Map() };
    current.total += 1;
    current.correct += attempt.is_correct ? 1 : 0;
    if (!attempt.is_correct) current.errors.set(attempt.error_code || 'other', (current.errors.get(attempt.error_code || 'other') || 0) + 1);
    attemptGroups.set(key, current);
  });
  const weakAreas = [...attemptGroups.values()].map((group) => ({ ...group, score: group.total ? group.correct / group.total * 100 : 0, topError: [...group.errors.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] || 'other' })).sort((a, b) => a.score - b.score || b.total - a.total).slice(0, 3);
  const activities = weakAreas.flatMap((area, index) => [
    { order: index * 3 + 1, type: 'diagnostic', title: `5 câu chẩn đoán: ${area.topic}`, target: area.skill, count: 5 },
    { order: index * 3 + 2, type: 'controlled', title: `10 câu luyện có kiểm soát: ${area.topic}`, target: area.skill, count: 10 },
    { order: index * 3 + 3, type: 'context', title: `1 hoạt động ngữ cảnh / cloze: ${area.topic}`, target: area.skill, count: 1 },
  ]);
  return {
    title: `Kế hoạch củng cố cho ${stat.learner.display_name}`,
    reason: weakAreas.length ? `Ưu tiên ${weakAreas.map((area) => `${area.topic} (${Math.round(area.score)}%)`).join(', ')}.` : 'Chưa đủ dữ liệu; bắt đầu bằng bài chẩn đoán tổng hợp.',
    weakAreas,
    activities: weakAreas.length ? activities : [
      { order: 1, type: 'diagnostic', title: 'Bài chẩn đoán tổng hợp 20 câu', target: 'Mixed', count: 20 },
      { order: 2, type: 'review', title: 'Ôn lại sau 3 ngày', target: 'Mixed', count: 10 },
    ],
    review_after_days: 3,
  };
}

export default function LearningIntelligence({ currentUser, language = 'vi' }) {
  const runtime = useRuntimeCore();
  const client = getRuntimeClient();
  const localKey = scopedLocalKey('bes-learning-intelligence-v1094', currentUser);
  const [tab, setTab] = useState('overview');
  const [learners, setLearners] = useState([]);
  const [attempts, setAttempts] = useState([]);
  const [mastery, setMastery] = useState([]);
  const [interventions, setInterventions] = useState([]);
  const [practiceSets, setPracticeSets] = useState([]);
  const [selectedLearnerId, setSelectedLearnerId] = useState('');
  const [learnerForm, setLearnerForm] = useState(emptyLearner);
  const [query, setQuery] = useState('');
  const [classFilter, setClassFilter] = useState('all');
  const [importText, setImportText] = useState('');
  const [importPreview, setImportPreview] = useState({ learners: [], attempts: [], errors: [] });
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setError('');
    if (client && runtime.session) {
      const results = await Promise.all([
        client.from('learning_learners').select('*').order('display_name').limit(2000),
        client.from('learning_attempts').select('*').order('attempted_at', { ascending: false }).limit(20000),
        client.from('learning_mastery').select('*').order('updated_at', { ascending: false }).limit(10000),
        client.from('learning_interventions').select('*').order('updated_at', { ascending: false }).limit(2000),
        client.from('learning_practice_sets').select('*').order('updated_at', { ascending: false }).limit(2000),
      ]);
      const firstError = results.find((result) => result.error)?.error;
      if (!firstError) {
        setLearners(results[0].data || []); setAttempts(results[1].data || []); setMastery(results[2].data || []);
        setInterventions(results[3].data || []); setPracticeSets(results[4].data || []);
        return;
      }
      if (!/does not exist|schema cache/i.test(firstError.message || '')) setError(firstError.message || String(firstError));
    }
    const local = readLocal(localKey, { learners: [], attempts: [], mastery: [], interventions: [], practiceSets: [] });
    setLearners(local.learners || []); setAttempts(local.attempts || []); setMastery(local.mastery || []);
    setInterventions(local.interventions || []); setPracticeSets(local.practiceSets || []);
  }, [client, localKey, runtime.session]);

  useEffect(() => { load(); }, [load]);

  function persistLocal(next = {}) {
    writeLocal(localKey, { learners, attempts, mastery, interventions, practiceSets, ...next });
  }

  const intelligence = useMemo(() => aggregateLearning(learners, attempts, mastery), [learners, attempts, mastery]);
  const selectedStat = intelligence.learnerStats.find((item) => item.learner.id === selectedLearnerId) || intelligence.learnerStats[0] || null;
  const classes = useMemo(() => [...new Set(learners.map((item) => item.class_name).filter(Boolean))].sort(), [learners]);
  const filteredLearners = useMemo(() => intelligence.learnerStats.filter((stat) => {
    if (classFilter !== 'all' && stat.learner.class_name !== classFilter) return false;
    const haystack = `${stat.learner.display_name} ${stat.learner.class_name} ${stat.learner.student_code}`.toLowerCase();
    return haystack.includes(query.trim().toLowerCase());
  }), [intelligence.learnerStats, classFilter, query]);
  const averageMastery = intelligence.learnerStats.length ? intelligence.learnerStats.reduce((sum, item) => sum + item.mastery, 0) / intelligence.learnerStats.length : 0;
  const atRisk = intelligence.learnerStats.filter((item) => item.risk).length;
  const dueReviews = intelligence.learnerStats.reduce((sum, item) => sum + item.dueReviews, 0);

  async function addLearner(event) {
    event.preventDefault();
    if (!learnerForm.display_name.trim()) return;
    setBusy(true); setError('');
    try {
      const payload = { ...learnerForm, owner_id: currentUser.id, assigned_teacher_id: currentUser.id, updated_at: new Date().toISOString() };
      let saved;
      if (client && runtime.session) {
        const { data, error: saveError } = await client.from('learning_learners').insert(payload).select('*').single();
        if (saveError) throw saveError;
        saved = data;
      } else {
        saved = { ...payload, id: uid('learner'), created_at: new Date().toISOString(), localOnly: true };
        persistLocal({ learners: [...learners, saved] });
      }
      setLearners((current) => [...current, saved]); setLearnerForm(emptyLearner()); setSelectedLearnerId(saved.id); setNotice('Đã thêm hồ sơ học sinh.');
    } catch (saveError) { setError(saveError.message || String(saveError)); }
    finally { setBusy(false); }
  }

  async function saveImport() {
    if (!importPreview.attempts.length) return;
    setBusy(true); setError('');
    try {
      let savedLearners = importPreview.learners;
      if (client && runtime.session && importPreview.learners.length) {
        const payload = importPreview.learners.map(({ id, localOnly, ...item }) => ({ ...item, owner_id: currentUser.id, assigned_teacher_id: currentUser.id }));
        const { data, error: learnerError } = await client.from('learning_learners').insert(payload).select('*');
        if (learnerError) throw learnerError;
        savedLearners = data || [];
      }
      const idMap = new Map(importPreview.learners.map((item, index) => [item.id, savedLearners[index]?.id || item.id]));
      const attemptPayload = importPreview.attempts.map(({ id, localOnly, ...item }) => ({ ...item, learner_id: idMap.get(item.learner_id) || item.learner_id, recorded_by: currentUser.id }));
      let savedAttempts;
      if (client && runtime.session) {
        const { data, error: attemptError } = await client.from('learning_attempts').insert(attemptPayload).select('*');
        if (attemptError) throw attemptError;
        savedAttempts = data || [];
      } else {
        savedAttempts = attemptPayload.map((item) => ({ ...item, id: uid('attempt'), localOnly: true }));
        persistLocal({ learners: [...learners, ...savedLearners], attempts: [...savedAttempts, ...attempts] });
      }
      setLearners((current) => [...current, ...savedLearners]); setAttempts((current) => [...savedAttempts, ...current]);
      setImportText(''); setImportPreview({ learners: [], attempts: [], errors: [] }); setNotice(`Đã nhập ${savedAttempts.length} lượt làm bài.`); setTab('overview');
      if (client && runtime.session) await rebuildMastery();
    } catch (saveError) { setError(saveError.message || String(saveError)); }
    finally { setBusy(false); }
  }

  async function rebuildMastery() {
    if (!client || !runtime.session) return;
    setBusy(true); setError('');
    try {
      const { error: rpcError } = await client.rpc('learning_rebuild_mastery', {});
      if (rpcError) throw rpcError;
      await load(); setNotice('Đã tính lại mức độ thành thạo từ dữ liệu mới nhất.');
    } catch (rpcError) { setError(rpcError.message || String(rpcError)); }
    finally { setBusy(false); }
  }

  async function createAdaptivePlan(stat) {
    if (!stat) return;
    const plan = buildAdaptivePlan(stat);
    setBusy(true); setError('');
    try {
      const due = new Date(); due.setDate(due.getDate() + 7);
      const interventionPayload = { learner_id: stat.learner.id, assigned_by: currentUser.id, title: plan.title, reason: plan.reason, status: 'active', priority: stat.risk ? 'high' : 'normal', due_at: due.toISOString(), plan_json: plan, updated_at: new Date().toISOString() };
      const practicePayload = { learner_id: stat.learner.id, created_by: currentUser.id, title: plan.title, status: 'draft', criteria_json: { weakAreas: plan.weakAreas, review_after_days: plan.review_after_days }, items_json: plan.activities, updated_at: new Date().toISOString() };
      let intervention; let practice;
      if (client && runtime.session) {
        const [a, b] = await Promise.all([
          client.from('learning_interventions').insert(interventionPayload).select('*').single(),
          client.from('learning_practice_sets').insert(practicePayload).select('*').single(),
        ]);
        if (a.error) throw a.error; if (b.error) throw b.error;
        intervention = a.data; practice = b.data;
      } else {
        intervention = { ...interventionPayload, id: uid('intervention'), created_at: new Date().toISOString(), localOnly: true };
        practice = { ...practicePayload, id: uid('practice'), created_at: new Date().toISOString(), localOnly: true };
        persistLocal({ interventions: [intervention, ...interventions], practiceSets: [practice, ...practiceSets] });
      }
      setInterventions((current) => [intervention, ...current]); setPracticeSets((current) => [practice, ...current]); setNotice('Đã tạo kế hoạch luyện tập thích ứng.'); setTab('plans');
    } catch (saveError) { setError(saveError.message || String(saveError)); }
    finally { setBusy(false); }
  }

  function sendPlanToContentFactory(plan) {
    const learner = learners.find((item) => item.id === plan.learner_id);
    const criteria = plan.criteria_json || {};
    const weakAreas = criteria.weakAreas || [];
    sessionStorage.setItem('bes-v1094-learning-to-content', JSON.stringify({
      title: plan.title,
      sourceText: `Học sinh: ${learner?.display_name || 'Học sinh'}\nLớp: ${learner?.class_name || ''}\nĐiểm yếu: ${weakAreas.map((area) => `${area.skill} - ${area.topic} (${Math.round(area.score || 0)}%)`).join('; ')}`,
      instruction: 'Tạo bộ bài luyện thích ứng, đi từ chẩn đoán đến luyện có kiểm soát và bài tập ngữ cảnh. Không trùng câu. Có đáp án và giải thích ngắn.',
      level: weakAreas[0]?.cefr || 'B2',
      itemCount: 20,
    }));
    window.location.hash = '#/content-factory';
  }

  function exportReport() {
    const report = {
      generatedAt: new Date().toISOString(), learners: intelligence.learnerStats.map((item) => ({ id: item.learner.id, name: item.learner.display_name, className: item.learner.class_name, attempts: item.total, correctness: Math.round(item.correctness), mastery: Math.round(item.mastery), trend: Math.round(item.trend), risk: item.risk, topError: item.topError[0] })),
      skills: intelligence.skillStats, errors: intelligence.errorStats.map((item) => ({ code: item.code, count: item.count, learnerCount: item.learnerCount, topSkill: item.topSkill })),
    };
    downloadText(`learning-intelligence-${new Date().toISOString().slice(0, 10)}.json`, JSON.stringify(report, null, 2), 'application/json');
  }

  return <section className="v1094-page">
    <header className="v1094-hero">
      <div><span className="v1094-kicker">V10.94 · Learning Intelligence</span><h1>Trung tâm phân tích học tập</h1><p>Theo dõi mức độ thành thạo, phân loại lỗi, phát hiện học sinh cần hỗ trợ và tạo bài luyện thích ứng.</p></div>
      <div className="v1094-hero-actions"><button onClick={exportReport}>Xuất báo cáo</button><button className="v1094-primary" onClick={rebuildMastery} disabled={busy}>↻ Tính lại mastery</button></div>
    </header>
    {error && <div className="v1094-alert error"><b>Chưa thể tải dữ liệu</b><span>{error}</span></div>}
    {notice && <div className="v1094-alert success">{notice}</div>}
    {!runtime.configured && <div className="v1094-alert warning">Đang dùng chế độ lưu cục bộ vì Supabase chưa được cấu hình.</div>}

    <div className="v1094-metrics">
      <article><span>Hồ sơ học sinh</span><strong>{learners.length}</strong><small>{classes.length} lớp</small></article>
      <article><span>Mastery trung bình</span><strong>{formatPercent(averageMastery)}</strong><small>{attempts.length} lượt làm bài</small></article>
      <article className={atRisk ? 'risk' : ''}><span>Cần can thiệp</span><strong>{atRisk}</strong><small>Mastery hoặc độ chính xác thấp</small></article>
      <article><span>Đến hạn ôn lại</span><strong>{dueReviews}</strong><small>Theo lịch spaced review</small></article>
    </div>

    <nav className="v1094-tabs">
      {[['overview','Tổng quan'],['learners','Học sinh'],['errors','Bản đồ lỗi'],['plans','Can thiệp & bài luyện'],['import','Nhập dữ liệu']].map(([value, label]) => <button key={value} className={tab === value ? 'active' : ''} onClick={() => setTab(value)}>{label}</button>)}
    </nav>

    {tab === 'overview' && <div className="v1094-dashboard-grid">
      <section className="v1094-panel"><div className="v1094-panel-heading"><div><span>Năng lực theo kỹ năng</span><h2>Điểm yếu toàn nhóm</h2></div></div><div className="v1094-skill-bars">{intelligence.skillStats.length ? intelligence.skillStats.map((item) => <article key={item.skill}><div><b>{item.skill}</b><span>{item.correct}/{item.total} đúng</span></div><div className="v1094-bar"><i style={{ width: `${clamp(item.score)}%` }} /></div><strong>{formatPercent(item.score)}</strong></article>) : <div className="v1094-empty">Chưa có dữ liệu lượt làm bài.</div>}</div></section>
      <section className="v1094-panel"><div className="v1094-panel-heading"><div><span>Cảnh báo sớm</span><h2>Học sinh cần hỗ trợ</h2></div><button onClick={() => setTab('learners')}>Xem tất cả</button></div><div className="v1094-risk-list">{intelligence.learnerStats.filter((item) => item.risk).slice(0, 8).map((stat) => <button key={stat.learner.id} onClick={() => { setSelectedLearnerId(stat.learner.id); setTab('learners'); }}><span>{stat.learner.display_name}<small>{stat.learner.class_name || 'Chưa xếp lớp'} · {stat.total} lượt</small></span><b>{formatPercent(stat.mastery)}</b></button>)}{!atRisk && <div className="v1094-empty">Chưa phát hiện trường hợp cần can thiệp.</div>}</div></section>
      <section className="v1094-panel v1094-wide"><div className="v1094-panel-heading"><div><span>Xu hướng</span><h2>Tiến bộ gần đây</h2></div></div><div className="v1094-learner-cards">{intelligence.learnerStats.slice(0, 12).map((stat) => <article key={stat.learner.id} className={stat.risk ? 'risk' : ''}><header><div><b>{stat.learner.display_name}</b><small>{stat.learner.class_name || 'Chưa xếp lớp'}</small></div><strong>{formatPercent(stat.mastery)}</strong></header><div className="v1094-mini-grid"><span>Độ chính xác<b>{formatPercent(stat.correctness)}</b></span><span>Xu hướng<b className={stat.trend >= 0 ? 'up' : 'down'}>{stat.trend >= 0 ? '+' : ''}{Math.round(stat.trend)}%</b></span><span>Lỗi chính<b>{ERROR_TAXONOMY.find(([code]) => code === stat.topError[0])?.[1] || '—'}</b></span></div></article>)}</div></section>
    </div>}

    {tab === 'learners' && <div className="v1094-learners-layout">
      <aside className="v1094-panel v1094-sidebar"><div className="v1094-panel-heading"><div><span>Hồ sơ mới</span><h2>Thêm học sinh</h2></div></div><form className="v1094-form" onSubmit={addLearner}><label>Họ tên<input value={learnerForm.display_name} onChange={(event) => setLearnerForm({ ...learnerForm, display_name: event.target.value })} required /></label><label>Lớp<input value={learnerForm.class_name} onChange={(event) => setLearnerForm({ ...learnerForm, class_name: event.target.value })} /></label><label>Mã học sinh<input value={learnerForm.student_code} onChange={(event) => setLearnerForm({ ...learnerForm, student_code: event.target.value })} /></label><label>Ghi chú<textarea value={learnerForm.notes} onChange={(event) => setLearnerForm({ ...learnerForm, notes: event.target.value })} /></label><button className="v1094-primary" disabled={busy}>+ Thêm hồ sơ</button></form></aside>
      <main className="v1094-panel"><div className="v1094-panel-heading"><div><span>Danh sách</span><h2>{filteredLearners.length} học sinh</h2></div><div className="v1094-filters"><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Tìm theo tên, lớp hoặc mã…" /><select value={classFilter} onChange={(event) => setClassFilter(event.target.value)}><option value="all">Mọi lớp</option>{classes.map((value) => <option key={value}>{value}</option>)}</select></div></div><div className="v1094-learner-table"><header><span>Học sinh</span><span>Lượt làm</span><span>Độ chính xác</span><span>Mastery</span><span>Xu hướng</span></header>{filteredLearners.map((stat) => <button key={stat.learner.id} className={`${selectedStat?.learner.id === stat.learner.id ? 'active' : ''} ${stat.risk ? 'risk' : ''}`} onClick={() => setSelectedLearnerId(stat.learner.id)}><span><b>{stat.learner.display_name}</b><small>{stat.learner.class_name || 'Chưa xếp lớp'} · {stat.learner.student_code || 'Chưa có mã'}</small></span><span>{stat.total}</span><span>{formatPercent(stat.correctness)}</span><span>{formatPercent(stat.mastery)}</span><span className={stat.trend >= 0 ? 'up' : 'down'}>{stat.trend >= 0 ? '+' : ''}{Math.round(stat.trend)}%</span></button>)}</div></main>
      {selectedStat && <aside className="v1094-panel v1094-detail"><div className="v1094-panel-heading"><div><span>Hồ sơ phân tích</span><h2>{selectedStat.learner.display_name}</h2></div></div><div className="v1094-profile-score"><strong>{formatPercent(selectedStat.mastery)}</strong><span>Mastery tổng hợp</span></div><dl><div><dt>Độ chính xác</dt><dd>{formatPercent(selectedStat.correctness)}</dd></div><div><dt>Thời gian TB</dt><dd>{selectedStat.avgResponse ? `${Math.round(selectedStat.avgResponse / 1000)} giây` : '—'}</dd></div><div><dt>Lỗi chính</dt><dd>{ERROR_TAXONOMY.find(([code]) => code === selectedStat.topError[0])?.[1] || '—'}</dd></div><div><dt>Ôn đến hạn</dt><dd>{selectedStat.dueReviews}</dd></div></dl><button className="v1094-primary" onClick={() => createAdaptivePlan(selectedStat)} disabled={busy}>✦ Tạo kế hoạch thích ứng</button><h3>Lượt làm gần đây</h3><div className="v1094-recent-attempts">{selectedStat.attempts.slice(0, 8).map((attempt) => <article key={attempt.id}><span className={attempt.is_correct ? 'correct' : 'incorrect'}>{attempt.is_correct ? '✓' : '×'}</span><div><b>{attempt.skill} · {attempt.topic}</b><small>{attempt.cefr} · {formatShortDate(attempt.attempted_at)}</small></div></article>)}</div></aside>}
    </div>}

    {tab === 'errors' && <div className="v1094-dashboard-grid"><section className="v1094-panel v1094-wide"><div className="v1094-panel-heading"><div><span>Error taxonomy</span><h2>Bản đồ lỗi toàn nhóm</h2></div></div><div className="v1094-error-grid">{intelligence.errorStats.map((item) => <article key={item.code}><header><span>{ERROR_TAXONOMY.find(([code]) => code === item.code)?.[1] || item.code}</span><strong>{item.count}</strong></header><div className="v1094-bar"><i style={{ width: `${Math.min(100, item.count / Math.max(1, intelligence.errorStats[0]?.count) * 100)}%` }} /></div><footer><span>{item.learnerCount} học sinh</span><span>Kỹ năng chính: {item.topSkill}</span></footer></article>)}{!intelligence.errorStats.length && <div className="v1094-empty">Chưa có dữ liệu lỗi.</div>}</div></section><section className="v1094-panel"><div className="v1094-panel-heading"><div><span>Danh mục chuẩn</span><h2>14 nhóm lỗi</h2></div></div><div className="v1094-taxonomy-list">{ERROR_TAXONOMY.map(([code, label]) => <article key={code}><code>{code}</code><span>{label}</span></article>)}</div></section><section className="v1094-panel"><div className="v1094-panel-heading"><div><span>Khuyến nghị</span><h2>Nguyên tắc can thiệp</h2></div></div><ol className="v1094-guidance"><li>Ưu tiên lỗi xuất hiện ở nhiều học sinh và lặp lại từ ba lần trở lên.</li><li>Tách lỗi kiến thức, lỗi chiến lược làm bài và lỗi do thời gian.</li><li>Kiểm tra lại sau 3–7 ngày bằng câu hỏi mới, không dùng lại nguyên câu.</li><li>Chỉ tăng độ khó khi mastery đạt tối thiểu 75%.</li></ol></section></div>}

    {tab === 'plans' && <div className="v1094-dashboard-grid"><section className="v1094-panel v1094-wide"><div className="v1094-panel-heading"><div><span>Adaptive practice</span><h2>Bộ bài luyện đã tạo</h2></div></div><div className="v1094-plan-list">{practiceSets.map((plan) => { const learner = learners.find((item) => item.id === plan.learner_id); const items = Array.isArray(plan.items_json) ? plan.items_json : []; return <article key={plan.id}><div><span className="v1094-badge">{plan.status || 'draft'}</span><h3>{plan.title}</h3><p>{learner?.display_name || 'Học sinh'} · {items.length} hoạt động</p></div><div>{items.slice(0, 3).map((item, index) => <span key={index}>{item.title || item.type}</span>)}</div><button onClick={() => sendPlanToContentFactory(plan)}>Gửi sang Content Factory →</button></article>; })}{!practiceSets.length && <div className="v1094-empty">Chưa có bộ bài luyện. Chọn một học sinh và tạo kế hoạch thích ứng.</div>}</div></section><section className="v1094-panel v1094-wide"><div className="v1094-panel-heading"><div><span>Interventions</span><h2>Kế hoạch can thiệp</h2></div></div><div className="v1094-intervention-table"><header><span>Học sinh</span><span>Lý do</span><span>Ưu tiên</span><span>Hạn</span><span>Trạng thái</span></header>{interventions.map((item) => <article key={item.id}><span>{learners.find((learner) => learner.id === item.learner_id)?.display_name || '—'}</span><span>{item.reason}</span><span className={item.priority === 'high' ? 'high' : ''}>{item.priority || 'normal'}</span><span>{formatShortDate(item.due_at)}</span><span>{item.status || 'active'}</span></article>)}</div></section></div>}

    {tab === 'import' && <div className="v1094-import-layout"><section className="v1094-panel"><div className="v1094-panel-heading"><div><span>CSV / TSV</span><h2>Nhập lượt làm bài</h2></div></div><p className="v1094-help">Mỗi dòng: <code>learner,class,skill,topic,cefr,correct,response_ms,error_code</code></p><textarea className="v1094-import-text" value={importText} onChange={(event) => setImportText(event.target.value)} placeholder={'learner,class,skill,topic,cefr,correct,response_ms,error_code\nNguyễn Văn A,12A1,Grammar,Verb tenses,B2,false,42000,tense'} /><div className="v1094-action-row"><button onClick={() => setImportPreview(parseAttemptImport(importText, learners))}>Xem trước</button><button className="v1094-primary" onClick={saveImport} disabled={busy || !importPreview.attempts.length}>Lưu {importPreview.attempts.length || ''} lượt</button></div></section><section className="v1094-panel"><div className="v1094-panel-heading"><div><span>Preview</span><h2>{importPreview.attempts.length} lượt hợp lệ</h2></div></div>{importPreview.errors.length ? <div className="v1094-import-errors">{importPreview.errors.map((item) => <span key={item}>{item}</span>)}</div> : null}<div className="v1094-preview-table"><header><span>Học sinh</span><span>Kỹ năng</span><span>Chủ điểm</span><span>Kết quả</span><span>Lỗi</span></header>{importPreview.attempts.slice(0, 100).map((attempt) => <article key={attempt.id}><span>{[...learners, ...importPreview.learners].find((item) => item.id === attempt.learner_id)?.display_name || '—'}</span><span>{attempt.skill}</span><span>{attempt.topic}</span><span className={attempt.is_correct ? 'correct' : 'incorrect'}>{attempt.is_correct ? 'Đúng' : 'Sai'}</span><span>{attempt.error_code || '—'}</span></article>)}</div></section></div>}
  </section>;
}
