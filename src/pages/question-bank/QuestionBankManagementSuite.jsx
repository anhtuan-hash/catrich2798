import React, { useEffect, useMemo, useState } from 'react';
import { supabase } from '../../utils/supabase.js';
import {
  advancedFilterQuestions,
  balancedOptionOrders,
  findDuplicateGroups,
  managementDashboard,
  parseCsv,
  qbNorm,
  qbText,
  questionsToCsv,
  smartReplacementCandidates,
  spreadsheetRowsToQuestions,
  taxonomySuggestions,
} from '../../utils/questionBankManagement.js';
import { blockTypeForItem } from '../../utils/questionBankExamManager.js';

const ADMIN_TABS = [
  ['dashboard', 'Tổng quan'],
  ['editor', 'Biên tập'],
  ['bulk', 'Hàng loạt'],
  ['duplicates', 'Trùng lặp'],
  ['review', 'Duyệt'],
  ['taxonomy', 'Phân loại'],
  ['io', 'Nhập / Xuất'],
  ['composer', 'Ráp đề'],
  ['practice', 'Luyện tập'],
  ['analytics', 'Phân tích'],
  ['backup', 'Sao lưu'],
  ['history', 'Lịch sử'],
];

const EMPTY_FILTERS = {
  query: '', grade: '', cefr: '', cognitive: '', status: '', visibility: '', skill: '',
  questionType: '', sourceKind: '', difficulty: '', usage: '', bundle: '', topic: '', grammar: '', tag: '',
};

function localStatus(value) {
  const map = { draft: 'Bản nháp', review: 'Chờ duyệt', approved: 'Đã duyệt', archived: 'Lưu trữ', published: 'Đã phát hành', closed: 'Đã đóng' };
  return map[qbNorm(value)] || qbText(value) || '—';
}

function cognitiveLabel(value) {
  const map = { recognition: 'Nhận biết', comprehension: 'Thông hiểu', application: 'Vận dụng' };
  return map[qbNorm(value)] || qbText(value) || '—';
}

function formatTime(value) {
  if (!value) return '—';
  try { return new Intl.DateTimeFormat('vi-VN', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(value)); }
  catch { return String(value); }
}

function downloadText(content, filename, type = 'text/plain;charset=utf-8') {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

async function sha256(value) {
  const bytes = new TextEncoder().encode(String(value || ''));
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest)).map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

async function questionFingerprint(item, bundleFingerprint = '') {
  return sha256(JSON.stringify({
    bundle: bundleFingerprint || '',
    stem: qbNorm(item.stem),
    options: (item.options || []).map(qbNorm),
    correct: qbNorm(item.correct_answer),
  }));
}

async function bundleFingerprint(bundle) {
  return sha256(JSON.stringify({
    title: qbNorm(bundle.title),
    context: qbNorm(bundle.context_text),
    instructions: qbNorm(bundle.instructions),
  }));
}

function itemDraft(item) {
  return {
    stem: qbText(item?.stem),
    options: Array.isArray(item?.options) ? [...item.options].slice(0, 4).concat(['','','','']).slice(0, 4) : ['','','',''],
    correct_answer: qbText(item?.correct_answer || 'A').toUpperCase(),
    explanation: qbText(item?.explanation),
    question_type: qbText(item?.question_type || 'mcq'),
    skill: qbText(item?.skill || 'Use of English'),
    cefr: qbText(item?.cefr || 'B1').toUpperCase(),
    topic: qbText(item?.topic),
    cognitive_level: qbText(item?.cognitive_level || 'recognition'),
    difficulty: Number(item?.difficulty || 2),
    grade: item?.grade ? String(item.grade) : '12',
    unit_name: qbText(item?.unit_name),
    school_year: qbText(item?.school_year),
    grammar_point: qbText(item?.grammar_point),
    tags: Array.isArray(item?.tags) ? item.tags.join(', ') : '',
    status: qbText(item?.status || 'draft'),
    visibility: qbText(item?.visibility || 'personal'),
    review_note: qbText(item?.review_note),
  };
}

function bundleDraftOf(bundle) {
  return {
    title: qbText(bundle?.title),
    bundle_type: qbText(bundle?.bundle_type || 'passage'),
    context_text: qbText(bundle?.context_text),
    instructions: qbText(bundle?.instructions),
    topic: qbText(bundle?.topic),
    skill: qbText(bundle?.skill),
    grade: bundle?.grade ? String(bundle.grade) : '12',
    unit_name: qbText(bundle?.unit_name),
    school_year: qbText(bundle?.school_year),
    status: qbText(bundle?.status || 'draft'),
    visibility: qbText(bundle?.visibility || 'private'),
    review_note: qbText(bundle?.review_note),
  };
}

function responsePerformance(questions, attempts, responses) {
  const submitted = attempts.filter((attempt) => attempt.status === 'submitted');
  const attemptScores = new Map(submitted.map((attempt) => [attempt.id, Number(attempt.max_score || 0) ? Number(attempt.score || 0) / Number(attempt.max_score || 1) : 0]));
  const sortedAttempts = [...submitted].sort((a, b) => (attemptScores.get(a.id) || 0) - (attemptScores.get(b.id) || 0));
  const groupSize = sortedAttempts.length >= 6 ? Math.max(1, Math.floor(sortedAttempts.length * 0.27)) : 0;
  const lowIds = new Set(groupSize ? sortedAttempts.slice(0, groupSize).map((a) => a.id) : []);
  const highIds = new Set(groupSize ? sortedAttempts.slice(-groupSize).map((a) => a.id) : []);

  return questions.map((item) => {
    const itemResponses = responses.filter((response) => response.item_id === item.id);
    const total = itemResponses.length;
    const correct = itemResponses.filter((response) => response.is_correct).length;
    const choices = {};
    itemResponses.forEach((response) => {
      const key = qbText(response.selected_answer).toUpperCase() || '—';
      choices[key] = Number(choices[key] || 0) + 1;
    });
    const high = itemResponses.filter((response) => highIds.has(response.attempt_id));
    const low = itemResponses.filter((response) => lowIds.has(response.attempt_id));
    const highRate = high.length ? high.filter((response) => response.is_correct).length / high.length : null;
    const lowRate = low.length ? low.filter((response) => response.is_correct).length / low.length : null;
    return {
      item,
      total,
      correctPercent: total ? Math.round((correct / total) * 100) : null,
      avgSeconds: total ? Math.round(itemResponses.reduce((sum, r) => sum + Number(r.response_time_seconds || 0), 0) / total) : null,
      discrimination: highRate !== null && lowRate !== null ? Math.round((highRate - lowRate) * 100) / 100 : null,
      choices,
    };
  });
}

export default function QuestionBankManagementSuite({
  currentUser,
  questions,
  bundles,
  tests,
  blueprints,
  targetQuestionId = '',
  targetBundleId = '',
  onClearTargets,
  onReload,
  onMessage,
  onOpenExam,
  onOpenBundle,
  onOpenImportText,
}) {
  const userId = currentUser?.id || '';
  const [tab, setTab] = useState(targetQuestionId || targetBundleId ? 'editor' : 'dashboard');
  const [busy, setBusy] = useState('');
  const [auxLoading, setAuxLoading] = useState(true);
  const [taxonomies, setTaxonomies] = useState([]);
  const [snapshots, setSnapshots] = useState([]);
  const [practiceSets, setPracticeSets] = useState([]);
  const [attempts, setAttempts] = useState([]);
  const [responses, setResponses] = useState([]);
  const [recentItemVersions, setRecentItemVersions] = useState([]);
  const [recentBundleVersions, setRecentBundleVersions] = useState([]);

  const [selectedQuestionId, setSelectedQuestionId] = useState(targetQuestionId || '');
  const [selectedBundleId, setSelectedBundleId] = useState(targetBundleId || '');
  const selectedQuestion = questions.find((item) => item.id === selectedQuestionId) || null;
  const selectedBundle = bundles.find((item) => item.id === selectedBundleId) || null;
  const [questionEdit, setQuestionEdit] = useState(itemDraft(selectedQuestion));
  const [bundleEdit, setBundleEdit] = useState(bundleDraftOf(selectedBundle));
  const [itemVersions, setItemVersions] = useState([]);
  const [bundleVersions, setBundleVersions] = useState([]);
  const [itemRefs, setItemRefs] = useState({ tests: [], practices: [] });
  const [hardDeleteArmed, setHardDeleteArmed] = useState('');
  const [bundleArchiveArmed, setBundleArchiveArmed] = useState(false);

  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [selectedIds, setSelectedIds] = useState([]);
  const [bulkPatch, setBulkPatch] = useState({ status: '', visibility: '', cefr: '', cognitive_level: '', difficulty: '', addTag: '' });
  const [duplicateThreshold, setDuplicateThreshold] = useState(0.74);
  const [duplicateArmed, setDuplicateArmed] = useState('');
  const [reviewNote, setReviewNote] = useState('');

  const [taxonomyKind, setTaxonomyKind] = useState('topic');
  const [taxonomyDraft, setTaxonomyDraft] = useState({ canonical_value: '', aliases: '', visibility: 'personal' });

  const [importResult, setImportResult] = useState('');
  const [composerTitle, setComposerTitle] = useState('Đề ráp thủ công – Set mới');
  const [composerItems, setComposerItems] = useState([]);
  const [composerQuery, setComposerQuery] = useState('');
  const [composerBalance, setComposerBalance] = useState(true);
  const [draggedComposerIndex, setDraggedComposerIndex] = useState(null);
  const [replaceTargetId, setReplaceTargetId] = useState('');

  const [practiceTitle, setPracticeTitle] = useState('Bài luyện từ Ngân hàng câu hỏi');
  const [practiceCount, setPracticeCount] = useState(10);
  const [activePractice, setActivePractice] = useState(null);
  const [activePracticeItems, setActivePracticeItems] = useState([]);
  const [practiceAnswers, setPracticeAnswers] = useState({});
  const [practiceResult, setPracticeResult] = useState(null);

  const [restoreArmed, setRestoreArmed] = useState('');

  const dashboard = useMemo(() => managementDashboard(questions, bundles, tests), [questions, bundles, tests]);
  const filtered = useMemo(() => advancedFilterQuestions(questions, filters), [questions, filters]);
  const duplicateGroups = useMemo(() => findDuplicateGroups(questions.filter((item) => qbNorm(item.status) !== 'archived'), duplicateThreshold), [questions, duplicateThreshold]);
  const performance = useMemo(() => responsePerformance(questions, attempts, responses), [questions, attempts, responses]);
  const taxonomyCandidates = useMemo(() => taxonomySuggestions(questions, taxonomyKind), [questions, taxonomyKind]);

  const composerCandidates = useMemo(() => {
    const needle = qbNorm(composerQuery);
    return questions.filter((item) => qbNorm(item.status) !== 'archived')
      .filter((item) => !composerItems.some((entry) => entry.id === item.id))
      .filter((item) => !needle || [item.stem, item.topic, item.grammar_point, ...(item.tags || [])].some((v) => qbNorm(v).includes(needle)))
      .slice(0, 80);
  }, [questions, composerItems, composerQuery]);

  async function loadAux() {
    if (!userId) return;
    setAuxLoading(true);
    try {
      const [taxonomyResult, snapshotResult, practiceResultData, attemptResult, responseResult, itemVersionResult, bundleVersionResult] = await Promise.all([
        supabase.from('assessment_taxonomy_terms').select('*').order('kind').order('canonical_value').limit(1000),
        supabase.from('assessment_bank_snapshots').select('id,title,item_count,bundle_count,blueprint_count,test_count,created_at').eq('owner_id', userId).order('created_at', { ascending: false }).limit(50),
        supabase.from('assessment_practice_sets').select('*').order('updated_at', { ascending: false }).limit(100),
        supabase.from('assessment_practice_attempts').select('*').order('submitted_at', { ascending: false }).limit(1000),
        supabase.from('assessment_practice_responses').select('*').limit(5000),
        supabase.from('assessment_item_versions').select('id,item_id,version_no,reason,created_at').order('created_at', { ascending: false }).limit(100),
        supabase.from('assessment_bundle_versions').select('id,bundle_id,version_no,reason,created_at').order('created_at', { ascending: false }).limit(100),
      ]);
      for (const result of [taxonomyResult, snapshotResult, practiceResultData, attemptResult, responseResult, itemVersionResult, bundleVersionResult]) {
        if (result.error) throw result.error;
      }
      setTaxonomies(taxonomyResult.data || []);
      setSnapshots(snapshotResult.data || []);
      setPracticeSets(practiceResultData.data || []);
      setAttempts(attemptResult.data || []);
      setResponses(responseResult.data || []);
      setRecentItemVersions(itemVersionResult.data || []);
      setRecentBundleVersions(bundleVersionResult.data || []);
    } catch (error) {
      onMessage?.(error?.message || 'Không thể tải dữ liệu Quản trị.');
    } finally {
      setAuxLoading(false);
    }
  }

  useEffect(() => { loadAux(); }, [userId]);

  useEffect(() => {
    if (targetQuestionId) {
      setSelectedQuestionId(targetQuestionId);
      setSelectedBundleId('');
      setTab('editor');
      onClearTargets?.();
    } else if (targetBundleId) {
      setSelectedBundleId(targetBundleId);
      setSelectedQuestionId('');
      setTab('editor');
      onClearTargets?.();
    }
  }, [targetQuestionId, targetBundleId]);

  useEffect(() => { setQuestionEdit(itemDraft(selectedQuestion)); }, [selectedQuestionId, selectedQuestion?.updated_at]);
  useEffect(() => { setBundleEdit(bundleDraftOf(selectedBundle)); }, [selectedBundleId, selectedBundle?.updated_at]);

  useEffect(() => {
    if (!selectedQuestionId) { setItemVersions([]); setItemRefs({ tests: [], practices: [] }); return; }
    (async () => {
      const [versionsResult, testRefsResult, practiceRefsResult] = await Promise.all([
        supabase.from('assessment_item_versions').select('*').eq('item_id', selectedQuestionId).order('version_no', { ascending: false }).limit(50),
        supabase.from('assessment_test_items').select('test_id,position').eq('item_id', selectedQuestionId),
        supabase.from('assessment_practice_items').select('practice_id,position').eq('item_id', selectedQuestionId),
      ]);
      if (!versionsResult.error) setItemVersions(versionsResult.data || []);
      setItemRefs({
        tests: (testRefsResult.data || []).map((row) => ({ ...row, test: tests.find((test) => test.id === row.test_id) })),
        practices: (practiceRefsResult.data || []).map((row) => ({ ...row, practice: practiceSets.find((practice) => practice.id === row.practice_id) })),
      });
    })();
  }, [selectedQuestionId, questions, tests, practiceSets]);

  useEffect(() => {
    if (!selectedBundleId) { setBundleVersions([]); return; }
    supabase.from('assessment_bundle_versions').select('*').eq('bundle_id', selectedBundleId).order('version_no', { ascending: false }).limit(50)
      .then((result) => { if (!result.error) setBundleVersions(result.data || []); });
  }, [selectedBundleId, bundles]);

  async function saveQuestion() {
    if (!selectedQuestion || !userId) return;
    if (!qbText(questionEdit.stem)) return onMessage?.('Câu hỏi không được để trống.');
    if (questionEdit.question_type === 'mcq' && questionEdit.options.filter(qbText).length !== 4) return onMessage?.('MCQ phải có đúng 4 phương án.');
    setBusy('save-question');
    try {
      const bundle = bundles.find((entry) => entry.id === selectedQuestion.bundle_id);
      const fp = await questionFingerprint({
        ...selectedQuestion,
        ...questionEdit,
        options: questionEdit.options.map(qbText),
      }, bundle?.fingerprint || '');
      const patch = {
        stem: qbText(questionEdit.stem),
        options: questionEdit.options.map(qbText),
        correct_answer: qbText(questionEdit.correct_answer).toUpperCase(),
        explanation: qbText(questionEdit.explanation),
        question_type: qbText(questionEdit.question_type || 'mcq'),
        skill: qbText(questionEdit.skill || 'Use of English'),
        cefr: qbText(questionEdit.cefr || 'B1').toUpperCase(),
        topic: qbText(questionEdit.topic),
        cognitive_level: qbText(questionEdit.cognitive_level || 'recognition'),
        difficulty: Math.max(1, Math.min(5, Number(questionEdit.difficulty || 2))),
        grade: Number(questionEdit.grade) || null,
        unit_name: qbText(questionEdit.unit_name),
        school_year: qbText(questionEdit.school_year),
        grammar_point: qbText(questionEdit.grammar_point),
        tags: qbText(questionEdit.tags).split(',').map(qbText).filter(Boolean),
        status: qbText(questionEdit.status || 'draft'),
        visibility: qbText(questionEdit.visibility || 'personal'),
        review_note: qbText(questionEdit.review_note),
        fingerprint: fp,
        archived_at: questionEdit.status === 'archived' ? (selectedQuestion.archived_at || new Date().toISOString()) : null,
        updated_at: new Date().toISOString(),
      };
      const result = await supabase.from('assessment_items').update(patch).eq('id', selectedQuestion.id).select('*').single();
      if (result.error) throw result.error;
      await onReload?.();
      onMessage?.('Đã lưu câu hỏi. Phiên bản cũ đã được lưu tự động.');
    } catch (error) {
      onMessage?.(error?.message || 'Không thể lưu câu hỏi.');
    } finally { setBusy(''); }
  }

  async function restoreItemVersion(version) {
    if (!version?.snapshot || !selectedQuestionId) return;
    setBusy('restore-item');
    try {
      const s = version.snapshot;
      const patch = {
        stem: s.stem, options: s.options, correct_answer: s.correct_answer, explanation: s.explanation,
        question_type: s.question_type, skill: s.skill, cefr: s.cefr, topic: s.topic,
        cognitive_level: s.cognitive_level, difficulty: s.difficulty, grade: s.grade, unit_name: s.unit_name,
        school_year: s.school_year, grammar_point: s.grammar_point, tags: s.tags, status: s.status,
        visibility: s.visibility, review_note: s.review_note || '', fingerprint: s.fingerprint || '',
        bundle_id: s.bundle_id || null, bundle_position: s.bundle_position || null, updated_at: new Date().toISOString(),
      };
      const result = await supabase.from('assessment_items').update(patch).eq('id', selectedQuestionId);
      if (result.error) throw result.error;
      await onReload?.();
      onMessage?.(`Đã khôi phục phiên bản ${version.version_no}.`);
    } catch (error) { onMessage?.(error?.message || 'Không thể khôi phục phiên bản.'); }
    finally { setBusy(''); }
  }

  async function archiveQuestion() {
    if (!selectedQuestion) return;
    setBusy('archive-question');
    try {
      const result = await supabase.from('assessment_items').update({
        status: 'archived', archived_at: new Date().toISOString(), updated_at: new Date().toISOString(),
      }).eq('id', selectedQuestion.id);
      if (result.error) throw result.error;
      await onReload?.();
      onMessage?.(`Đã lưu trữ câu hỏi. Câu đang liên kết ${itemRefs.tests.length} đề và ${itemRefs.practices.length} bài luyện; các liên kết cũ vẫn được giữ.`);
    } catch (error) { onMessage?.(error?.message || 'Không thể lưu trữ câu hỏi.'); }
    finally { setBusy(''); }
  }

  async function hardDeleteQuestion() {
    if (!selectedQuestion) return;
    if (itemRefs.tests.length || itemRefs.practices.length) return onMessage?.('Không thể xóa cứng: câu hỏi đang được đề thi/bài luyện sử dụng. Hãy dùng Lưu trữ.');
    if (qbNorm(selectedQuestion.status) !== 'archived') return onMessage?.('Chỉ có thể xóa cứng câu đã Lưu trữ.');
    if (hardDeleteArmed !== selectedQuestion.id) {
      setHardDeleteArmed(selectedQuestion.id);
      return onMessage?.('Nhấn “Xác nhận xóa cứng” lần nữa. Thao tác này không thể hoàn tác.');
    }
    setBusy('hard-delete');
    try {
      const result = await supabase.from('assessment_items').delete().eq('id', selectedQuestion.id);
      if (result.error) throw result.error;
      setSelectedQuestionId('');
      setHardDeleteArmed('');
      await onReload?.();
      onMessage?.('Đã xóa cứng câu hỏi không còn liên kết.');
    } catch (error) { onMessage?.(error?.message || 'Không thể xóa câu hỏi.'); }
    finally { setBusy(''); }
  }

  async function cloneQuestion() {
    if (!selectedQuestion) return;
    setBusy('clone-question');
    try {
      const clone = { ...selectedQuestion };
      delete clone.id; delete clone.created_at; delete clone.updated_at; delete clone.reviewed_by; delete clone.reviewed_at; delete clone.archived_at;
      clone.owner_id = userId;
      clone.status = 'draft';
      clone.visibility = 'personal';
      clone.review_note = '';
      clone.usage_count = 0;
      clone.statistics = {};
      clone.source_kind = 'manual';
      clone.source_reference = `Cloned from ${selectedQuestion.id}`;
      clone.fingerprint = '';
      const fp = await questionFingerprint(clone, bundles.find((b) => b.id === clone.bundle_id)?.fingerprint || '');
      clone.fingerprint = fp;
      const result = await supabase.from('assessment_items').insert(clone).select('*').single();
      if (result.error) throw result.error;
      await onReload?.();
      setSelectedQuestionId(result.data.id);
      onMessage?.('Đã nhân bản câu hỏi thành Bản nháp.');
    } catch (error) { onMessage?.(error?.message || 'Không thể nhân bản câu hỏi.'); }
    finally { setBusy(''); }
  }

  async function saveBundle() {
    if (!selectedBundle) return;
    setBusy('save-bundle');
    try {
      const patch = {
        title: qbText(bundleEdit.title),
        bundle_type: qbText(bundleEdit.bundle_type || 'passage'),
        context_text: qbText(bundleEdit.context_text),
        instructions: qbText(bundleEdit.instructions),
        topic: qbText(bundleEdit.topic),
        skill: qbText(bundleEdit.skill),
        grade: Number(bundleEdit.grade) || null,
        unit_name: qbText(bundleEdit.unit_name),
        school_year: qbText(bundleEdit.school_year),
        status: qbText(bundleEdit.status || 'draft'),
        visibility: qbText(bundleEdit.visibility || 'private'),
        review_note: qbText(bundleEdit.review_note),
        archived_at: bundleEdit.status === 'archived' ? (selectedBundle.archived_at || new Date().toISOString()) : null,
        updated_at: new Date().toISOString(),
      };
      patch.fingerprint = await bundleFingerprint(patch);
      const result = await supabase.from('assessment_bundles').update(patch).eq('id', selectedBundle.id).select('*').single();
      if (result.error) throw result.error;
      const children = questions.filter((item) => item.bundle_id === selectedBundle.id);
      for (const child of children) {
        const fp = await questionFingerprint(child, patch.fingerprint);
        await supabase.from('assessment_items').update({ fingerprint: fp, updated_at: new Date().toISOString() }).eq('id', child.id);
      }
      await onReload?.();
      onMessage?.('Đã lưu chùm bài và cập nhật fingerprint các câu liên quan.');
    } catch (error) { onMessage?.(error?.message || 'Không thể lưu chùm bài.'); }
    finally { setBusy(''); }
  }

  async function restoreBundleVersion(version) {
    if (!version?.snapshot || !selectedBundleId) return;
    setBusy('restore-bundle');
    try {
      const s = version.snapshot;
      const patch = {
        title: s.title, bundle_type: s.bundle_type, context_text: s.context_text, instructions: s.instructions,
        topic: s.topic, skill: s.skill, grade: s.grade, unit_name: s.unit_name, school_year: s.school_year,
        source: s.source, source_kind: s.source_kind, source_reference: s.source_reference, status: s.status,
        visibility: s.visibility, review_note: s.review_note || '', fingerprint: s.fingerprint || '', updated_at: new Date().toISOString(),
      };
      const result = await supabase.from('assessment_bundles').update(patch).eq('id', selectedBundleId);
      if (result.error) throw result.error;
      await onReload?.();
      onMessage?.(`Đã khôi phục chùm về phiên bản ${version.version_no}.`);
    } catch (error) { onMessage?.(error?.message || 'Không thể khôi phục chùm.'); }
    finally { setBusy(''); }
  }

  async function archiveBundle() {
    if (!selectedBundle) return;
    if (!bundleArchiveArmed) {
      setBundleArchiveArmed(true);
      return onMessage?.('Nhấn xác nhận lần nữa. Brian sẽ lưu trữ cả chùm và các câu con; đề cũ không bị ảnh hưởng.');
    }
    setBusy('archive-bundle');
    try {
      const now = new Date().toISOString();
      const bundleResult = await supabase.from('assessment_bundles').update({ status: 'archived', archived_at: now, updated_at: now }).eq('id', selectedBundle.id);
      if (bundleResult.error) throw bundleResult.error;
      const itemResult = await supabase.from('assessment_items').update({ status: 'archived', archived_at: now, updated_at: now }).eq('bundle_id', selectedBundle.id);
      if (itemResult.error) throw itemResult.error;
      setBundleArchiveArmed(false);
      await onReload?.();
      onMessage?.('Đã lưu trữ chùm và các câu con. Các đề cũ vẫn giữ nguyên liên kết.');
    } catch (error) { onMessage?.(error?.message || 'Không thể lưu trữ chùm.'); }
    finally { setBusy(''); }
  }

  async function moveBundleItem(itemId, direction) {
    const children = questions.filter((item) => item.bundle_id === selectedBundleId)
      .sort((a, b) => Number(a.bundle_position || 0) - Number(b.bundle_position || 0));
    const index = children.findIndex((item) => item.id === itemId);
    const nextIndex = index + direction;
    if (index < 0 || nextIndex < 0 || nextIndex >= children.length) return;
    const next = [...children];
    [next[index], next[nextIndex]] = [next[nextIndex], next[index]];
    setBusy('reorder-bundle');
    try {
      for (let i = 0; i < next.length; i += 1) {
        const result = await supabase.from('assessment_items').update({ bundle_position: i + 1, updated_at: new Date().toISOString() }).eq('id', next[i].id);
        if (result.error) throw result.error;
      }
      await onReload?.();
    } catch (error) { onMessage?.(error?.message || 'Không thể đổi thứ tự câu.'); }
    finally { setBusy(''); }
  }

  async function addQuestionToBundle() {
    if (!selectedBundle) return;
    const position = questions.filter((item) => item.bundle_id === selectedBundle.id).length + 1;
    setBusy('add-bundle-item');
    try {
      const base = {
        owner_id: userId, bundle_id: selectedBundle.id, bundle_position: position,
        visibility: selectedBundle.visibility === 'department' ? 'department' : 'personal',
        status: 'draft', question_type: 'mcq', stem: 'Câu hỏi mới', options: ['', '', '', ''], correct_answer: 'A',
        explanation: '', skill: selectedBundle.skill || 'Use of English', cefr: 'B1', topic: selectedBundle.topic || '',
        cognitive_level: 'recognition', difficulty: 2, source: '', usage_count: 0, statistics: {},
        grade: selectedBundle.grade || null, unit_name: selectedBundle.unit_name || '', school_year: selectedBundle.school_year || '',
        grammar_point: '', tags: [], source_kind: 'manual', source_reference: `Added to bundle ${selectedBundle.id}`,
        import_metadata: {},
      };
      base.fingerprint = await questionFingerprint(base, selectedBundle.fingerprint || '');
      const result = await supabase.from('assessment_items').insert(base).select('*').single();
      if (result.error) throw result.error;
      await onReload?.();
      setSelectedQuestionId(result.data.id);
      setTab('editor');
      onMessage?.('Đã thêm câu mới vào chùm. Hãy chỉnh nội dung và lưu.');
    } catch (error) { onMessage?.(error?.message || 'Không thể thêm câu vào chùm.'); }
    finally { setBusy(''); }
  }

  async function applyBulk() {
    if (!selectedIds.length) return onMessage?.('Chưa chọn câu hỏi.');
    const patch = { updated_at: new Date().toISOString() };
    if (bulkPatch.status) {
      patch.status = bulkPatch.status;
      patch.archived_at = bulkPatch.status === 'archived' ? new Date().toISOString() : null;
    }
    if (bulkPatch.visibility) patch.visibility = bulkPatch.visibility;
    if (bulkPatch.cefr) patch.cefr = bulkPatch.cefr;
    if (bulkPatch.cognitive_level) patch.cognitive_level = bulkPatch.cognitive_level;
    if (bulkPatch.difficulty) patch.difficulty = Number(bulkPatch.difficulty);
    setBusy('bulk');
    try {
      if (Object.keys(patch).length > 1) {
        const result = await supabase.from('assessment_items').update(patch).in('id', selectedIds);
        if (result.error) throw result.error;
      }
      if (qbText(bulkPatch.addTag)) {
        for (const id of selectedIds) {
          const item = questions.find((entry) => entry.id === id);
          const tags = [...new Set([...(item?.tags || []), qbText(bulkPatch.addTag)])];
          const result = await supabase.from('assessment_items').update({ tags, updated_at: new Date().toISOString() }).eq('id', id);
          if (result.error) throw result.error;
        }
      }
      await onReload?.();
      onMessage?.(`Đã cập nhật ${selectedIds.length} câu hỏi.`);
    } catch (error) { onMessage?.(error?.message || 'Không thể cập nhật hàng loạt.'); }
    finally { setBusy(''); }
  }

  async function reviewItem(item, status) {
    setBusy(`review-${item.id}`);
    try {
      const patch = {
        status,
        review_note: qbText(reviewNote),
        reviewed_by: status === 'approved' ? userId : null,
        reviewed_at: status === 'approved' ? new Date().toISOString() : null,
        archived_at: status === 'archived' ? new Date().toISOString() : null,
        updated_at: new Date().toISOString(),
      };
      const result = await supabase.from('assessment_items').update(patch).eq('id', item.id);
      if (result.error) throw result.error;
      await onReload?.();
    } catch (error) { onMessage?.(error?.message || 'Không thể cập nhật trạng thái duyệt.'); }
    finally { setBusy(''); }
  }

  async function mergeDuplicate(group, keeper, duplicate) {
    const key = `${keeper.id}:${duplicate.id}`;
    if (duplicateArmed !== key) {
      setDuplicateArmed(key);
      return onMessage?.('Nhấn Merge lần nữa để xác nhận. Brian sẽ chuyển liên kết sang câu giữ lại và lưu trữ câu trùng.');
    }
    setBusy('merge');
    try {
      const result = await supabase.rpc('qb_merge_items', { p_keeper: keeper.id, p_duplicate: duplicate.id });
      if (result.error) throw result.error;
      setDuplicateArmed('');
      await onReload?.();
      onMessage?.('Đã merge câu trùng và giữ nguyên liên kết đề/bài luyện.');
    } catch (error) { onMessage?.(error?.message || 'Không thể merge câu trùng.'); }
    finally { setBusy(''); }
  }

  async function saveTaxonomy() {
    if (!qbText(taxonomyDraft.canonical_value)) return;
    setBusy('taxonomy');
    try {
      const result = await supabase.from('assessment_taxonomy_terms').insert({
        owner_id: userId,
        visibility: taxonomyDraft.visibility,
        kind: taxonomyKind,
        canonical_value: qbText(taxonomyDraft.canonical_value),
        aliases: qbText(taxonomyDraft.aliases).split(',').map(qbText).filter(Boolean),
        active: true,
      }).select('*').single();
      if (result.error) throw result.error;
      setTaxonomyDraft({ canonical_value: '', aliases: '', visibility: 'personal' });
      await loadAux();
      onMessage?.('Đã lưu thuật ngữ chuẩn.');
    } catch (error) { onMessage?.(error?.message || 'Không thể lưu taxonomy.'); }
    finally { setBusy(''); }
  }

  async function normalizeTaxonomy(term) {
    setBusy(`taxonomy-${term.id}`);
    try {
      const result = await supabase.rpc('qb_normalize_taxonomy_term', { p_term_id: term.id });
      if (result.error) throw result.error;
      await onReload?.();
      onMessage?.(`Đã chuẩn hóa ${result.data || 0} câu theo “${term.canonical_value}”.`);
    } catch (error) { onMessage?.(error?.message || 'Không thể chuẩn hóa taxonomy.'); }
    finally { setBusy(''); }
  }

  async function deleteTaxonomy(term) {
    setBusy(`taxonomy-delete-${term.id}`);
    try {
      const result = await supabase.from('assessment_taxonomy_terms').delete().eq('id', term.id);
      if (result.error) throw result.error;
      await loadAux();
    } catch (error) { onMessage?.(error?.message || 'Không thể xóa taxonomy.'); }
    finally { setBusy(''); }
  }

  function exportJson() {
    downloadText(JSON.stringify({
      schema: 'brian-question-bank-v11.7',
      exportedAt: new Date().toISOString(),
      questions, bundles, blueprints, tests,
    }, null, 2), `brian-question-bank-${new Date().toISOString().slice(0,10)}.json`, 'application/json;charset=utf-8');
  }

  function exportCsv() {
    downloadText(questionsToCsv(questions), `brian-questions-${new Date().toISOString().slice(0,10)}.csv`, 'text/csv;charset=utf-8');
  }

  function exportWord() {
    const rows = questions.map((item, index) => {
      const options = (item.options || []).map((option, i) => `<div><b>${String.fromCharCode(65+i)}.</b> ${String(option).replace(/&/g,'&amp;').replace(/</g,'&lt;')}</div>`).join('');
      return `<div style="margin:0 0 16px"><b>Question ${index+1}.</b> ${String(item.stem).replace(/&/g,'&amp;').replace(/</g,'&lt;')}<br>${options}<small>Answer: ${item.correct_answer} · ${item.cefr} · ${cognitiveLabel(item.cognitive_level)} · ${item.topic || ''}</small></div>`;
    }).join('');
    const html = `<html><head><meta charset="utf-8"></head><body><h1>Brian Question Bank</h1><p>${questions.length} questions</p>${rows}</body></html>`;
    downloadText(html, `brian-question-bank-${new Date().toISOString().slice(0,10)}.doc`, 'application/msword');
  }

  async function importQuestionRows(imported) {
    if (!imported.length) return onMessage?.('Không tìm thấy câu hỏi hợp lệ trong file.');
    setBusy('import');
    try {
      const rows = [];
      for (const raw of imported.slice(0, 1000)) {
        const row = {
          owner_id: userId, visibility: 'personal', status: 'draft', question_type: raw.question_type || 'mcq',
          stem: qbText(raw.stem), options: Array.isArray(raw.options) ? raw.options.slice(0,4).map(qbText) : [],
          correct_answer: qbText(raw.correct_answer || raw.correctAnswer).toUpperCase(), explanation: qbText(raw.explanation),
          skill: qbText(raw.skill || 'Use of English'), cefr: qbText(raw.cefr || 'B1').toUpperCase(), topic: qbText(raw.topic),
          cognitive_level: qbText(raw.cognitive_level || raw.cognitiveLevel || 'recognition'), difficulty: Number(raw.difficulty || 2),
          source: qbText(raw.source), usage_count: 0, statistics: {}, bundle_id: null, bundle_position: null,
          grade: Number(raw.grade) || null, unit_name: qbText(raw.unit_name || raw.unitName), school_year: qbText(raw.school_year || raw.schoolYear),
          grammar_point: qbText(raw.grammar_point || raw.grammarPoint), tags: Array.isArray(raw.tags) ? raw.tags : qbText(raw.tags).split(',').map(qbText).filter(Boolean),
          source_kind: 'import', source_reference: 'Management Import/Export Center', import_metadata: { importedAt: new Date().toISOString() },
        };
        row.fingerprint = await questionFingerprint(row, '');
        rows.push(row);
      }
      const result = await supabase.from('assessment_items').upsert(rows, { onConflict: 'owner_id,fingerprint', ignoreDuplicates: true }).select('id');
      if (result.error) throw result.error;
      setImportResult(`Đã xử lý ${rows.length} dòng; câu trùng fingerprint được bỏ qua.`);
      await onReload?.();
    } catch (error) { setImportResult(error?.message || 'Import thất bại.'); }
    finally { setBusy(''); }
  }

  async function handleImportFile(file) {
    if (!file) return;
    const name = file.name.toLowerCase();
    setImportResult('');
    try {
      if (name.endsWith('.json')) {
        const parsed = JSON.parse(await file.text());
        const imported = Array.isArray(parsed) ? parsed : parsed.questions || parsed.items || [];
        await importQuestionRows(imported);
      } else if (name.endsWith('.csv')) {
        const rows = parseCsv(await file.text());
        await importQuestionRows(spreadsheetRowsToQuestions(rows));
      } else if (name.endsWith('.xlsx') || name.endsWith('.xls')) {
        const mod = await import('read-excel-file');
        const rows = await mod.default(file);
        await importQuestionRows(spreadsheetRowsToQuestions(rows));
      } else if (name.endsWith('.docx')) {
        const mammoth = await import('mammoth');
        const buffer = await file.arrayBuffer();
        const result = await mammoth.extractRawText({ arrayBuffer: buffer });
        onOpenImportText?.(result.value || '');
        setImportResult('Đã trích nội dung Word và chuyển sang màn hình “Nhập từ ChatGPT” để Brian nhận diện cấu trúc.');
      } else {
        setImportResult('Định dạng chưa hỗ trợ. Dùng JSON, CSV, XLSX/XLS hoặc DOCX.');
      }
    } catch (error) { setImportResult(error?.message || 'Không thể đọc file.'); }
  }

  function addToComposer(item) {
    if (!item) return;
    if (item.bundle_id) {
      const bundleItems = questions.filter((q) => q.bundle_id === item.bundle_id)
        .sort((a,b) => Number(a.bundle_position || 0) - Number(b.bundle_position || 0));
      setComposerItems((current) => {
        const ids = new Set(current.map((entry) => entry.id));
        return [...current, ...bundleItems.filter((entry) => !ids.has(entry.id))];
      });
    } else {
      setComposerItems((current) => current.some((entry) => entry.id === item.id) ? current : [...current, item]);
    }
  }

  function moveComposer(from, to) {
    if (from === null || to < 0 || to >= composerItems.length || from === to) return;
    setComposerItems((current) => {
      const next = [...current];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      return next;
    });
  }

  function smartReplaceComposer(item) {
    const excluded = composerItems.map((entry) => entry.id);
    if (item.bundle_id) {
      const oldBundleItems = composerItems.filter((entry) => entry.bundle_id === item.bundle_id);
      const oldType = blockTypeForItem(item);
      const bundleCandidates = bundles
        .filter((bundle) => bundle.id !== item.bundle_id && qbNorm(bundle.status) !== 'archived')
        .map((bundle) => ({
          bundle,
          items: questions.filter((q) => q.bundle_id === bundle.id).sort((a,b) => Number(a.bundle_position || 0) - Number(b.bundle_position || 0)),
        }))
        .filter((entry) => entry.items.length === oldBundleItems.length && entry.items.length && blockTypeForItem({ ...entry.items[0], bundle_type: entry.bundle.bundle_type, _bundle: entry.bundle }) === oldType)
        .filter((entry) => entry.items.every((q) => !excluded.includes(q.id)));
      if (!bundleCandidates.length) return onMessage?.('Không có chùm tương đương chưa dùng để thay thế.');
      const replacement = bundleCandidates.sort((a,b) => Number(a.items[0].usage_count || 0) - Number(b.items[0].usage_count || 0))[0];
      const firstIndex = composerItems.findIndex((entry) => entry.bundle_id === item.bundle_id);
      setComposerItems((current) => {
        const without = current.filter((entry) => entry.bundle_id !== item.bundle_id);
        const next = [...without];
        next.splice(firstIndex, 0, ...replacement.items);
        return next;
      });
      return;
    }
    const candidates = smartReplacementCandidates(item, questions, excluded, 1);
    if (!candidates.length) return onMessage?.('Không tìm thấy câu tương đương chưa dùng.');
    setComposerItems((current) => current.map((entry) => entry.id === item.id ? candidates[0].item : entry));
  }

  async function saveComposerExam() {
    if (!composerItems.length) return onMessage?.('Chưa có câu trong đề.');
    setBusy('composer');
    let newTest = null;
    try {
      const now = new Date().toISOString();
      const result = await supabase.from('assessment_tests').insert({
        owner_id: userId, visibility: 'personal', title: qbText(composerTitle) || 'Đề ráp thủ công',
        status: 'draft', settings: { composer: 'manual', balancedAnswers: composerBalance },
        grade: composerItems[0]?.grade || null, school_year: composerItems[0]?.school_year || '',
        tags: ['manual-composer'], source_kind: 'manual', source_reference: 'Question Bank Manual Composer',
        import_metadata: { createdAt: now, itemCount: composerItems.length }, updated_at: now,
      }).select('*').single();
      if (result.error) throw result.error;
      newTest = result.data;
      const orders = composerBalance ? balancedOptionOrders(composerItems, newTest.id) : composerItems.map(() => []);
      const joins = composerItems.map((item, index) => ({
        test_id: newTest.id, item_id: item.id, position: index + 1, option_order: orders[index], points: 1,
      }));
      const joinResult = await supabase.from('assessment_test_items').insert(joins);
      if (joinResult.error) throw joinResult.error;
      await onReload?.();
      setComposerItems([]);
      onMessage?.('Đã tạo đề thủ công; câu/chùm được tái sử dụng và đáp án đã cân bằng nếu bật tùy chọn.');
      await onOpenExam?.(newTest);
    } catch (error) {
      if (newTest?.id) {
        await supabase.from('assessment_test_items').delete().eq('test_id', newTest.id);
        await supabase.from('assessment_tests').delete().eq('id', newTest.id);
      }
      onMessage?.(error?.message || 'Không thể lưu đề ráp thủ công.');
    } finally { setBusy(''); }
  }

  async function createPracticeSet() {
    const source = selectedIds.length
      ? questions.filter((item) => selectedIds.includes(item.id))
      : questions.filter((item) => qbNorm(item.status) === 'approved').sort((a,b) => Number(a.usage_count || 0) - Number(b.usage_count || 0)).slice(0, Number(practiceCount || 10));
    if (!source.length) return onMessage?.('Không có câu phù hợp để tạo bài luyện.');
    setBusy('practice-create');
    let practice = null;
    try {
      const result = await supabase.from('assessment_practice_sets').insert({
        owner_id: userId, visibility: 'personal', title: qbText(practiceTitle) || 'Bài luyện',
        status: 'published', settings: { showExplanationAfterSubmit: true }, grade: source[0]?.grade || null,
        school_year: source[0]?.school_year || '', updated_at: new Date().toISOString(),
      }).select('*').single();
      if (result.error) throw result.error;
      practice = result.data;
      const joins = source.map((item,index) => ({ practice_id: practice.id, item_id: item.id, position: index+1, points: 1 }));
      const joinResult = await supabase.from('assessment_practice_items').insert(joins);
      if (joinResult.error) throw joinResult.error;
      await loadAux();
      onMessage?.(`Đã tạo bài luyện ${source.length} câu.`);
    } catch (error) {
      if (practice?.id) await supabase.from('assessment_practice_sets').delete().eq('id', practice.id);
      onMessage?.(error?.message || 'Không thể tạo bài luyện.');
    } finally { setBusy(''); }
  }

  async function openPractice(practice) {
    setBusy('practice-open');
    try {
      const result = await supabase.from('assessment_practice_items').select('*').eq('practice_id', practice.id).order('position');
      if (result.error) throw result.error;
      const map = new Map(questions.map((item) => [item.id,item]));
      setActivePractice(practice);
      setActivePracticeItems((result.data || []).map((row) => ({ ...map.get(row.item_id), practice_position: row.position, practice_points: row.points })).filter((item) => item.id));
      setPracticeAnswers({});
      setPracticeResult(null);
    } catch (error) { onMessage?.(error?.message || 'Không thể mở bài luyện.'); }
    finally { setBusy(''); }
  }

  async function submitPractice() {
    if (!activePractice || !activePracticeItems.length) return;
    setBusy('practice-submit');
    try {
      const maxScore = activePracticeItems.reduce((sum,item) => sum + Number(item.practice_points || 1), 0);
      const score = activePracticeItems.reduce((sum,item) => sum + (qbText(practiceAnswers[item.id]).toUpperCase() === qbText(item.correct_answer).toUpperCase() ? Number(item.practice_points || 1) : 0), 0);
      const attemptResult = await supabase.from('assessment_practice_attempts').insert({
        practice_id: activePractice.id, learner_id: userId, status: 'submitted', score, max_score: maxScore,
        submitted_at: new Date().toISOString(), metadata: { source: 'QuestionBankPracticeMode' },
      }).select('*').single();
      if (attemptResult.error) throw attemptResult.error;
      const responseRows = activePracticeItems.map((item) => ({
        attempt_id: attemptResult.data.id, item_id: item.id, selected_answer: qbText(practiceAnswers[item.id]).toUpperCase(),
        is_correct: qbText(practiceAnswers[item.id]).toUpperCase() === qbText(item.correct_answer).toUpperCase(),
      }));
      const responseResult = await supabase.from('assessment_practice_responses').insert(responseRows);
      if (responseResult.error) throw responseResult.error;
      await supabase.rpc('qb_recompute_item_statistics', { p_item_ids: activePracticeItems.map((item) => item.id) });
      setPracticeResult({ score, maxScore });
      await onReload?.();
      await loadAux();
    } catch (error) { onMessage?.(error?.message || 'Không thể nộp bài luyện.'); }
    finally { setBusy(''); }
  }

  async function recomputeAnalytics() {
    setBusy('analytics');
    try {
      const result = await supabase.rpc('qb_recompute_item_statistics', { p_item_ids: null });
      if (result.error) throw result.error;
      await onReload?.();
      await loadAux();
      onMessage?.(`Đã tính lại thống kê cho ${result.data || 0} câu.`);
    } catch (error) { onMessage?.(error?.message || 'Không thể tính lại thống kê.'); }
    finally { setBusy(''); }
  }

  async function createSnapshot(customTitle = '') {
    setBusy('snapshot');
    try {
      const testIds = tests.map((test) => test.id);
      const testItemsResult = testIds.length
        ? await supabase.from('assessment_test_items').select('*').in('test_id', testIds)
        : { data: [], error: null };
      if (testItemsResult.error) throw testItemsResult.error;
      const payload = {
        schema: 'brian-qb-snapshot-v11.7',
        createdAt: new Date().toISOString(),
        questions, bundles, blueprints, tests, testItems: testItemsResult.data || [], taxonomies,
      };
      const result = await supabase.from('assessment_bank_snapshots').insert({
        owner_id: userId, title: customTitle || `Snapshot ${new Date().toLocaleString('vi-VN')}`,
        item_count: questions.length, bundle_count: bundles.length, blueprint_count: blueprints.length, test_count: tests.length,
        payload,
      }).select('id').single();
      if (result.error) throw result.error;
      await loadAux();
      onMessage?.('Đã tạo snapshot an toàn của Ngân hàng câu hỏi.');
      return result.data?.id;
    } catch (error) { onMessage?.(error?.message || 'Không thể tạo snapshot.'); return null; }
    finally { setBusy(''); }
  }

  async function exportSnapshot(snapshot) {
    const result = await supabase.from('assessment_bank_snapshots').select('*').eq('id', snapshot.id).single();
    if (result.error) return onMessage?.(result.error.message);
    downloadText(JSON.stringify(result.data.payload, null, 2), `brian-snapshot-${snapshot.id}.json`, 'application/json;charset=utf-8');
  }

  async function restoreSnapshot(snapshot) {
    if (restoreArmed !== snapshot.id) {
      setRestoreArmed(snapshot.id);
      return onMessage?.('Nhấn “Xác nhận khôi phục” lần nữa. Brian sẽ tạo một snapshot an toàn trước khi khôi phục.');
    }
    setBusy('restore-snapshot');
    try {
      await createSnapshot('Auto backup before restore');
      const result = await supabase.from('assessment_bank_snapshots').select('*').eq('id', snapshot.id).single();
      if (result.error) throw result.error;
      const p = result.data.payload || {};
      const ownerize = (rows) => (rows || []).map((row) => ({ ...row, owner_id: userId }));
      if (p.bundles?.length) {
        const r = await supabase.from('assessment_bundles').upsert(ownerize(p.bundles), { onConflict: 'id' }); if (r.error) throw r.error;
      }
      if (p.questions?.length) {
        const r = await supabase.from('assessment_items').upsert(ownerize(p.questions), { onConflict: 'id' }); if (r.error) throw r.error;
      }
      if (p.blueprints?.length) {
        const r = await supabase.from('assessment_blueprints').upsert(ownerize(p.blueprints), { onConflict: 'id' }); if (r.error) throw r.error;
      }
      if (p.tests?.length) {
        const r = await supabase.from('assessment_tests').upsert(ownerize(p.tests), { onConflict: 'id' }); if (r.error) throw r.error;
        await supabase.from('assessment_test_items').delete().in('test_id', p.tests.map((test) => test.id));
        if (p.testItems?.length) {
          const j = await supabase.from('assessment_test_items').insert(p.testItems); if (j.error) throw j.error;
        }
      }
      setRestoreArmed('');
      await onReload?.(); await loadAux();
      onMessage?.('Đã khôi phục snapshot. Bản trước khi khôi phục đã được sao lưu tự động.');
    } catch (error) { onMessage?.(error?.message || 'Không thể khôi phục snapshot.'); }
    finally { setBusy(''); }
  }

  const bundleChildren = selectedBundle
    ? questions.filter((item) => item.bundle_id === selectedBundle.id).sort((a,b) => Number(a.bundle_position || 0)-Number(b.bundle_position || 0))
    : [];

  return (
    <div className="qb-admin-suite">
      <nav className="qb-admin-tabs">
        {ADMIN_TABS.map(([id,label]) => <button type="button" key={id} className={tab === id ? 'is-active' : ''} onClick={() => setTab(id)}>{label}</button>)}
      </nav>
      {auxLoading ? <div className="qb-loading">Đang tải dữ liệu quản trị…</div> : null}

      {tab === 'dashboard' ? (
        <section className="qb-admin-section">
          <div className="qb-section-head"><div><p>QUESTION BANK CONTROL CENTER</p><h2>Dashboard quản trị</h2></div><span>Tổng quan chất lượng, duyệt, phạm vi và mức sử dụng.</span></div>
          <div className="qb-admin-kpis">
            <article><span>Tổng câu</span><strong>{dashboard.total}</strong><small>{dashboard.bundles} chùm · {dashboard.tests} đề</small></article>
            <article><span>Đã duyệt</span><strong>{dashboard.approvedPercent}%</strong><small>{dashboard.statuses.approved || 0} câu approved</small></article>
            <article><span>Chờ duyệt</span><strong>{dashboard.statuses.review || 0}</strong><small>{dashboard.statuses.draft || 0} bản nháp</small></article>
            <article><span>Nhóm trùng</span><strong>{dashboard.duplicateGroups}</strong><small>exact + near duplicate</small></article>
            <article><span>Chưa dùng</span><strong>{dashboard.unused}</strong><small>{dashboard.heavy} câu dùng ≥ 4 lần</small></article>
            <article><span>Thiếu metadata</span><strong>{dashboard.missingMetadata}</strong><small>topic / CEFR / nhận thức / độ khó</small></article>
          </div>
          <div className="qb-admin-dashboard-grid">
            <article><h3>Vòng đời câu hỏi</h3>{Object.entries(dashboard.statuses).map(([key,value]) => <div key={key}><span>{localStatus(key)}</span><b>{value}</b></div>)}</article>
            <article><h3>Phạm vi chia sẻ</h3>{Object.entries(dashboard.visibility).map(([key,value]) => <div key={key}><span>{key === 'department' ? 'Tổ chuyên môn' : 'Cá nhân'}</span><b>{value}</b></div>)}</article>
            <article><h3>Việc cần xử lý</h3><div><span>Duyệt câu đang chờ</span><b>{dashboard.statuses.review || 0}</b></div><div><span>Nhóm trùng cần xem</span><b>{dashboard.duplicateGroups}</b></div><div><span>Câu chưa dùng</span><b>{dashboard.unused}</b></div></article>
          </div>
        </section>
      ) : null}

      {tab === 'editor' ? (
        <section className="qb-admin-section qb-editor-workspace">
          <div className="qb-editor-switch">
            <label><span>Câu hỏi</span><select value={selectedQuestionId} onChange={(e) => { setSelectedQuestionId(e.target.value); setSelectedBundleId(''); }}><option value="">— Chọn câu —</option>{questions.map((item) => <option key={item.id} value={item.id}>{qbText(item.stem).slice(0,90)}</option>)}</select></label>
            <label><span>Chùm bài</span><select value={selectedBundleId} onChange={(e) => { setSelectedBundleId(e.target.value); setSelectedQuestionId(''); }}><option value="">— Chọn chùm —</option>{bundles.map((bundle) => <option key={bundle.id} value={bundle.id}>{bundle.title}</option>)}</select></label>
          </div>

          {selectedQuestion ? (
            <div className="qb-editor-card">
              <div className="qb-editor-head"><div><span>QUESTION EDITOR</span><h3>Biên tập câu hỏi</h3></div><div className="qb-editor-actions"><button type="button" className="qb-secondary" onClick={cloneQuestion}>Nhân bản</button><button type="button" className="qb-secondary" onClick={archiveQuestion}>Lưu trữ</button><button type="button" className={hardDeleteArmed === selectedQuestion.id ? 'qb-danger is-armed' : 'qb-danger'} onClick={hardDeleteQuestion}>{hardDeleteArmed === selectedQuestion.id ? 'Xác nhận xóa cứng' : 'Xóa cứng'}</button><button type="button" className="qb-primary" onClick={saveQuestion} disabled={busy === 'save-question'}>{busy === 'save-question' ? 'Đang lưu…' : 'Lưu thay đổi'}</button></div></div>
              <div className="qb-editor-form">
                <label className="span-2"><span>Câu hỏi</span><textarea rows="4" value={questionEdit.stem} onChange={(e) => setQuestionEdit({ ...questionEdit, stem: e.target.value })} /></label>
                {questionEdit.options.map((option,index) => <label key={index}><span>Phương án {String.fromCharCode(65+index)}</span><input value={option} onChange={(e) => { const next=[...questionEdit.options]; next[index]=e.target.value; setQuestionEdit({ ...questionEdit, options: next }); }} /></label>)}
                <label><span>Đáp án</span><select value={questionEdit.correct_answer} onChange={(e) => setQuestionEdit({ ...questionEdit, correct_answer: e.target.value })}><option>A</option><option>B</option><option>C</option><option>D</option></select></label>
                <label><span>Loại câu</span><input value={questionEdit.question_type} onChange={(e) => setQuestionEdit({ ...questionEdit, question_type: e.target.value })} /></label>
                <label><span>Khối</span><select value={questionEdit.grade} onChange={(e) => setQuestionEdit({ ...questionEdit, grade: e.target.value })}><option>10</option><option>11</option><option>12</option></select></label>
                <label><span>CEFR</span><select value={questionEdit.cefr} onChange={(e) => setQuestionEdit({ ...questionEdit, cefr: e.target.value })}><option>A2</option><option>B1</option><option>B2</option><option>C1</option></select></label>
                <label><span>Nhận thức</span><select value={questionEdit.cognitive_level} onChange={(e) => setQuestionEdit({ ...questionEdit, cognitive_level: e.target.value })}><option value="recognition">Nhận biết</option><option value="comprehension">Thông hiểu</option><option value="application">Vận dụng</option></select></label>
                <label><span>Độ khó</span><select value={questionEdit.difficulty} onChange={(e) => setQuestionEdit({ ...questionEdit, difficulty: Number(e.target.value) })}>{[1,2,3,4,5].map((value) => <option key={value}>{value}</option>)}</select></label>
                <label><span>Kỹ năng</span><input value={questionEdit.skill} onChange={(e) => setQuestionEdit({ ...questionEdit, skill: e.target.value })} /></label>
                <label><span>Chủ đề</span><input value={questionEdit.topic} onChange={(e) => setQuestionEdit({ ...questionEdit, topic: e.target.value })} /></label>
                <label><span>Grammar point</span><input value={questionEdit.grammar_point} onChange={(e) => setQuestionEdit({ ...questionEdit, grammar_point: e.target.value })} /></label>
                <label><span>Unit</span><input value={questionEdit.unit_name} onChange={(e) => setQuestionEdit({ ...questionEdit, unit_name: e.target.value })} /></label>
                <label><span>Năm học</span><input value={questionEdit.school_year} onChange={(e) => setQuestionEdit({ ...questionEdit, school_year: e.target.value })} /></label>
                <label><span>Trạng thái</span><select value={questionEdit.status} onChange={(e) => setQuestionEdit({ ...questionEdit, status: e.target.value })}><option value="draft">Bản nháp</option><option value="review">Chờ duyệt</option><option value="approved">Đã duyệt</option><option value="archived">Lưu trữ</option></select></label>
                <label><span>Phạm vi</span><select value={questionEdit.visibility} onChange={(e) => setQuestionEdit({ ...questionEdit, visibility: e.target.value })}><option value="personal">Cá nhân</option><option value="private">Riêng tư</option><option value="department">Tổ chuyên môn</option></select></label>
                <label className="span-2"><span>Tags</span><input value={questionEdit.tags} onChange={(e) => setQuestionEdit({ ...questionEdit, tags: e.target.value })} /></label>
                <label className="span-2"><span>Giải thích</span><textarea rows="3" value={questionEdit.explanation} onChange={(e) => setQuestionEdit({ ...questionEdit, explanation: e.target.value })} /></label>
                <label className="span-2"><span>Ghi chú duyệt</span><textarea rows="2" value={questionEdit.review_note} onChange={(e) => setQuestionEdit({ ...questionEdit, review_note: e.target.value })} /></label>
              </div>
              <div className="qb-editor-relations"><span>Đang dùng trong <b>{itemRefs.tests.length}</b> đề thi · <b>{itemRefs.practices.length}</b> bài luyện</span>{itemRefs.tests.slice(0,5).map((ref) => <button type="button" key={ref.test_id} onClick={() => ref.test && onOpenExam?.(ref.test)}>{ref.test?.title || ref.test_id} · Q{ref.position}</button>)}</div>
              <div className="qb-version-list"><div><span>VERSION HISTORY</span><strong>{itemVersions.length} phiên bản cũ</strong></div>{itemVersions.map((version) => <article key={version.id}><span>v{version.version_no}</span><small>{formatTime(version.created_at)}</small><button type="button" onClick={() => restoreItemVersion(version)}>Khôi phục</button></article>)}</div>
            </div>
          ) : null}

          {selectedBundle ? (
            <div className="qb-editor-card">
              <div className="qb-editor-head"><div><span>BUNDLE EDITOR</span><h3>{selectedBundle.title}</h3></div><div className="qb-editor-actions"><button type="button" className="qb-secondary" onClick={() => onOpenBundle?.(selectedBundle)}>Mở Reader</button><button type="button" className={bundleArchiveArmed ? 'qb-danger is-armed' : 'qb-danger'} onClick={archiveBundle}>{bundleArchiveArmed ? 'Xác nhận lưu trữ' : 'Lưu trữ chùm'}</button><button type="button" className="qb-primary" onClick={saveBundle}>Lưu chùm</button></div></div>
              <div className="qb-editor-form">
                <label className="span-2"><span>Tiêu đề</span><input value={bundleEdit.title} onChange={(e) => setBundleEdit({ ...bundleEdit, title: e.target.value })} /></label>
                <label><span>Loại chùm</span><input value={bundleEdit.bundle_type} onChange={(e) => setBundleEdit({ ...bundleEdit, bundle_type: e.target.value })} /></label>
                <label><span>Kỹ năng</span><input value={bundleEdit.skill} onChange={(e) => setBundleEdit({ ...bundleEdit, skill: e.target.value })} /></label>
                <label><span>Chủ đề</span><input value={bundleEdit.topic} onChange={(e) => setBundleEdit({ ...bundleEdit, topic: e.target.value })} /></label>
                <label><span>Khối</span><select value={bundleEdit.grade} onChange={(e) => setBundleEdit({ ...bundleEdit, grade: e.target.value })}><option>10</option><option>11</option><option>12</option></select></label>
                <label><span>Năm học</span><input value={bundleEdit.school_year} onChange={(e) => setBundleEdit({ ...bundleEdit, school_year: e.target.value })} /></label>
                <label><span>Trạng thái</span><select value={bundleEdit.status} onChange={(e) => setBundleEdit({ ...bundleEdit, status: e.target.value })}><option value="draft">Bản nháp</option><option value="review">Chờ duyệt</option><option value="approved">Đã duyệt</option><option value="archived">Lưu trữ</option></select></label>
                <label><span>Phạm vi</span><select value={bundleEdit.visibility} onChange={(e) => setBundleEdit({ ...bundleEdit, visibility: e.target.value })}><option value="private">Riêng tư</option><option value="department">Tổ chuyên môn</option></select></label>
                <label className="span-2"><span>Instructions</span><textarea rows="2" value={bundleEdit.instructions} onChange={(e) => setBundleEdit({ ...bundleEdit, instructions: e.target.value })} /></label>
                <label className="span-2"><span>Ngữ liệu chung</span><textarea rows="14" value={bundleEdit.context_text} onChange={(e) => setBundleEdit({ ...bundleEdit, context_text: e.target.value })} /></label>
                <label className="span-2"><span>Ghi chú duyệt</span><textarea rows="2" value={bundleEdit.review_note} onChange={(e) => setBundleEdit({ ...bundleEdit, review_note: e.target.value })} /></label>
              </div>
              <div className="qb-bundle-order-editor"><div><strong>Câu trong chùm</strong><button type="button" className="qb-primary qb-small" onClick={addQuestionToBundle}>+ Thêm câu</button></div>{bundleChildren.map((item,index) => <article key={item.id}><b>{item.bundle_position || index+1}</b><span>{qbText(item.stem).slice(0,120)}</span><button type="button" onClick={() => moveBundleItem(item.id,-1)} disabled={index===0}>↑</button><button type="button" onClick={() => moveBundleItem(item.id,1)} disabled={index===bundleChildren.length-1}>↓</button><button type="button" onClick={() => { setSelectedQuestionId(item.id); setSelectedBundleId(''); }}>Sửa</button></article>)}</div>
              <div className="qb-version-list"><div><span>VERSION HISTORY</span><strong>{bundleVersions.length} phiên bản cũ</strong></div>{bundleVersions.map((version) => <article key={version.id}><span>v{version.version_no}</span><small>{formatTime(version.created_at)}</small><button type="button" onClick={() => restoreBundleVersion(version)}>Khôi phục</button></article>)}</div>
            </div>
          ) : null}

          {!selectedQuestion && !selectedBundle ? <div className="qb-empty"><strong>Chọn một câu hỏi hoặc chùm bài để biên tập</strong><p>Anh cũng có thể bấm trực tiếp một card trong Kho câu hỏi/Chùm bài để mở tại đây.</p></div> : null}
        </section>
      ) : null}

      {tab === 'bulk' ? (
        <section className="qb-admin-section">
          <div className="qb-section-head"><div><p>BULK MANAGEMENT + ADVANCED SEARCH</p><h2>Quản lý hàng loạt</h2></div><span>{filtered.length} câu phù hợp · {selectedIds.length} câu đang chọn</span></div>
          <div className="qb-advanced-filters">
            <input placeholder="Tìm nội dung / option / tags…" value={filters.query} onChange={(e) => setFilters({ ...filters, query:e.target.value })} />
            <select value={filters.grade} onChange={(e) => setFilters({ ...filters, grade:e.target.value })}><option value="">Tất cả khối</option><option>10</option><option>11</option><option>12</option></select>
            <select value={filters.cefr} onChange={(e) => setFilters({ ...filters, cefr:e.target.value })}><option value="">Tất cả CEFR</option><option>A2</option><option>B1</option><option>B2</option><option>C1</option></select>
            <select value={filters.cognitive} onChange={(e) => setFilters({ ...filters, cognitive:e.target.value })}><option value="">Tất cả nhận thức</option><option value="recognition">Nhận biết</option><option value="comprehension">Thông hiểu</option><option value="application">Vận dụng</option></select>
            <select value={filters.status} onChange={(e) => setFilters({ ...filters, status:e.target.value })}><option value="">Tất cả trạng thái</option><option value="draft">Bản nháp</option><option value="review">Chờ duyệt</option><option value="approved">Đã duyệt</option><option value="archived">Lưu trữ</option></select>
            <select value={filters.visibility} onChange={(e) => setFilters({ ...filters, visibility:e.target.value })}><option value="">Mọi phạm vi</option><option value="personal">Cá nhân</option><option value="private">Riêng tư</option><option value="department">Tổ chuyên môn</option></select>
            <select value={filters.usage} onChange={(e) => setFilters({ ...filters, usage:e.target.value })}><option value="">Mọi mức dùng</option><option value="unused">Chưa dùng</option><option value="used">Đã dùng</option><option value="heavy">Dùng nhiều ≥4</option></select>
            <select value={filters.bundle} onChange={(e) => setFilters({ ...filters, bundle:e.target.value })}><option value="">Câu/chùm</option><option value="standalone">Độc lập</option><option value="bundled">Trong chùm</option></select>
            <input placeholder="Topic" value={filters.topic} onChange={(e) => setFilters({ ...filters, topic:e.target.value })} />
            <input placeholder="Grammar point" value={filters.grammar} onChange={(e) => setFilters({ ...filters, grammar:e.target.value })} />
            <input placeholder="Tag" value={filters.tag} onChange={(e) => setFilters({ ...filters, tag:e.target.value })} />
          </div>
          <div className="qb-bulk-actions">
            <button type="button" className="qb-secondary" onClick={() => setSelectedIds(filtered.map((item) => item.id))}>Chọn tất cả {filtered.length}</button>
            <button type="button" className="qb-ghost" onClick={() => setSelectedIds([])}>Bỏ chọn</button>
            <select value={bulkPatch.status} onChange={(e) => setBulkPatch({ ...bulkPatch, status:e.target.value })}><option value="">Trạng thái — giữ nguyên</option><option value="draft">Bản nháp</option><option value="review">Chờ duyệt</option><option value="approved">Đã duyệt</option><option value="archived">Lưu trữ</option></select>
            <select value={bulkPatch.visibility} onChange={(e) => setBulkPatch({ ...bulkPatch, visibility:e.target.value })}><option value="">Phạm vi — giữ nguyên</option><option value="personal">Cá nhân</option><option value="private">Riêng tư</option><option value="department">Tổ chuyên môn</option></select>
            <select value={bulkPatch.cefr} onChange={(e) => setBulkPatch({ ...bulkPatch, cefr:e.target.value })}><option value="">CEFR — giữ nguyên</option><option>A2</option><option>B1</option><option>B2</option><option>C1</option></select>
            <select value={bulkPatch.cognitive_level} onChange={(e) => setBulkPatch({ ...bulkPatch, cognitive_level:e.target.value })}><option value="">Nhận thức — giữ nguyên</option><option value="recognition">Nhận biết</option><option value="comprehension">Thông hiểu</option><option value="application">Vận dụng</option></select>
            <select value={bulkPatch.difficulty} onChange={(e) => setBulkPatch({ ...bulkPatch, difficulty:e.target.value })}><option value="">Độ khó — giữ nguyên</option>{[1,2,3,4,5].map((v)=><option key={v}>{v}</option>)}</select>
            <input placeholder="Thêm tag…" value={bulkPatch.addTag} onChange={(e) => setBulkPatch({ ...bulkPatch, addTag:e.target.value })} />
            <button type="button" className="qb-primary" onClick={applyBulk} disabled={!selectedIds.length || busy === 'bulk'}>Áp dụng ({selectedIds.length})</button>
          </div>
          <div className="qb-bulk-list">{filtered.slice(0,300).map((item) => <label key={item.id}><input type="checkbox" checked={selectedIds.includes(item.id)} onChange={(e) => setSelectedIds((current) => e.target.checked ? [...new Set([...current,item.id])] : current.filter((id) => id !== item.id))} /><span><b>{qbText(item.stem).slice(0,130)}</b><small>{item.cefr} · {cognitiveLabel(item.cognitive_level)} · {item.topic || '—'} · {localStatus(item.status)} · dùng {item.usage_count || 0} lần</small></span><button type="button" onClick={(e) => { e.preventDefault(); setSelectedQuestionId(item.id); setTab('editor'); }}>Sửa</button></label>)}</div>
        </section>
      ) : null}

      {tab === 'duplicates' ? (
        <section className="qb-admin-section">
          <div className="qb-section-head"><div><p>DUPLICATE CENTER</p><h2>Câu trùng & gần trùng</h2></div><span>{duplicateGroups.length} nhóm · exact fingerprint + so khớp từ vựng</span></div>
          <label className="qb-threshold"><span>Ngưỡng gần trùng {(duplicateThreshold*100).toFixed(0)}%</span><input type="range" min="0.55" max="0.95" step="0.01" value={duplicateThreshold} onChange={(e) => setDuplicateThreshold(Number(e.target.value))} /></label>
          <div className="qb-duplicate-list">{duplicateGroups.slice(0,100).map((group,index) => {
            const [a,b] = group.items;
            if (!a || !b) return null;
            const key = `${a.id}:${b.id}`;
            return <article key={group.key + index}><header><span>{group.kind === 'exact' ? 'TRÙNG CHÍNH XÁC' : 'GẦN TRÙNG'}</span><strong>{Math.round(group.similarity*100)}%</strong></header><div className="qb-duplicate-compare"><div><b>Giữ lại</b><p>{a.stem}</p><small>{a.cefr} · {a.topic || '—'} · dùng {a.usage_count || 0}</small></div><div><b>Câu trùng</b><p>{b.stem}</p><small>{b.cefr} · {b.topic || '—'} · dùng {b.usage_count || 0}</small></div></div><footer><button type="button" className="qb-secondary" onClick={() => { setSelectedQuestionId(a.id); setTab('editor'); }}>Sửa câu A</button><button type="button" className="qb-secondary" onClick={() => { setSelectedQuestionId(b.id); setTab('editor'); }}>Sửa câu B</button><button type="button" className={duplicateArmed === key ? 'qb-danger is-armed' : 'qb-primary'} onClick={() => mergeDuplicate(group,a,b)}>{duplicateArmed === key ? 'Xác nhận Merge B → A' : 'Merge B → A'}</button></footer></article>;
          })}</div>
        </section>
      ) : null}

      {tab === 'review' ? (
        <section className="qb-admin-section">
          <div className="qb-section-head"><div><p>REVIEW & APPROVAL</p><h2>Quy trình kiểm duyệt</h2></div><span>Draft → Review → Approved → Archived</span></div>
          <label className="qb-review-note"><span>Ghi chú dùng cho thao tác duyệt</span><input value={reviewNote} onChange={(e) => setReviewNote(e.target.value)} placeholder="Ví dụ: kiểm tra lại distractor B…" /></label>
          <div className="qb-review-columns">
            {['draft','review','approved'].map((status) => <section key={status}><header><strong>{localStatus(status)}</strong><span>{questions.filter((item)=>qbNorm(item.status)===status).length}</span></header>{questions.filter((item)=>qbNorm(item.status)===status).slice(0,100).map((item) => <article key={item.id}><p>{qbText(item.stem).slice(0,150)}</p><small>{item.cefr} · {cognitiveLabel(item.cognitive_level)} · {item.topic || '—'}</small><div><button type="button" onClick={() => { setSelectedQuestionId(item.id); setTab('editor'); }}>Xem</button>{status === 'draft' ? <button type="button" onClick={() => reviewItem(item,'review')}>Gửi duyệt</button> : null}{status === 'review' ? <><button type="button" className="approve" onClick={() => reviewItem(item,'approved')}>Duyệt</button><button type="button" onClick={() => reviewItem(item,'draft')}>Trả lại</button></> : null}{status === 'approved' ? <button type="button" onClick={() => reviewItem(item,'archived')}>Lưu trữ</button> : null}</div></article>)}</section>)}
          </div>
        </section>
      ) : null}

      {tab === 'taxonomy' ? (
        <section className="qb-admin-section">
          <div className="qb-section-head"><div><p>TAXONOMY MANAGER</p><h2>Chuẩn hóa phân loại</h2></div><span>Topic · Grammar · Tags · Skill · Question Type · Source</span></div>
          <div className="qb-taxonomy-controls"><select value={taxonomyKind} onChange={(e) => setTaxonomyKind(e.target.value)}><option value="topic">Topic</option><option value="grammar_point">Grammar point</option><option value="tag">Tag</option><option value="skill">Skill</option><option value="question_type">Question type</option><option value="source">Source</option></select><input placeholder="Giá trị chuẩn" value={taxonomyDraft.canonical_value} onChange={(e) => setTaxonomyDraft({ ...taxonomyDraft, canonical_value:e.target.value })} /><input placeholder="Aliases, cách nhau bằng dấu phẩy" value={taxonomyDraft.aliases} onChange={(e) => setTaxonomyDraft({ ...taxonomyDraft, aliases:e.target.value })} /><select value={taxonomyDraft.visibility} onChange={(e) => setTaxonomyDraft({ ...taxonomyDraft, visibility:e.target.value })}><option value="personal">Cá nhân</option><option value="department">Tổ chuyên môn</option></select><button type="button" className="qb-primary" onClick={saveTaxonomy}>Lưu thuật ngữ</button></div>
          <div className="qb-taxonomy-grid"><section><h3>Thuật ngữ đã lưu</h3>{taxonomies.filter((term)=>term.kind===taxonomyKind).map((term)=><article key={term.id}><div><strong>{term.canonical_value}</strong><small>{(term.aliases||[]).join(', ') || 'Không có alias'}</small></div><button type="button" onClick={() => normalizeTaxonomy(term)}>Chuẩn hóa kho</button><button type="button" className="delete" onClick={() => deleteTaxonomy(term)}>×</button></article>)}</section><section><h3>Giá trị đang có trong kho</h3>{taxonomyCandidates.slice(0,80).map((candidate)=><article key={candidate.value}><div><strong>{candidate.value}</strong><small>{candidate.count} câu</small></div><button type="button" onClick={() => setTaxonomyDraft({ ...taxonomyDraft, canonical_value:candidate.value })}>Dùng làm chuẩn</button></article>)}</section></div>
        </section>
      ) : null}

      {tab === 'io' ? (
        <section className="qb-admin-section">
          <div className="qb-section-head"><div><p>IMPORT / EXPORT CENTER</p><h2>Trao đổi dữ liệu</h2></div><span>JSON · CSV · Excel · Word, không cần AI.</span></div>
          <div className="qb-io-actions"><button type="button" className="qb-primary" onClick={exportJson}>Xuất JSON toàn kho</button><button type="button" className="qb-secondary" onClick={exportCsv}>Xuất CSV câu hỏi</button><button type="button" className="qb-secondary" onClick={exportWord}>Xuất Word ngân hàng</button><label className="qb-file-button"><span>Nhập file</span><input type="file" accept=".json,.csv,.xlsx,.xls,.docx" onChange={(e) => handleImportFile(e.target.files?.[0])} /></label></div>
          <div className="qb-io-guide"><article><strong>JSON</strong><p>Backup/di chuyển dữ liệu có metadata đầy đủ.</p></article><article><strong>CSV / Excel</strong><p>Header hỗ trợ: stem, A, B, C, D, answer, explanation, grade, cefr, topic, cognitive_level, difficulty, grammar_point, tags.</p></article><article><strong>Word DOCX</strong><p>Brian trích raw text bằng Mammoth rồi chuyển sang bộ nhận diện “Nhập từ ChatGPT”.</p></article></div>
          {importResult ? <div className="qb-message">{importResult}</div> : null}
        </section>
      ) : null}

      {tab === 'composer' ? (
        <section className="qb-admin-section">
          <div className="qb-section-head"><div><p>MANUAL EXAM COMPOSER</p><h2>Ráp đề thủ công</h2></div><span>Kéo-thả · khóa ngữ liệu theo chùm · Smart Replace · cân bằng đáp án.</span></div>
          <div className="qb-composer-head"><input value={composerTitle} onChange={(e) => setComposerTitle(e.target.value)} placeholder="Tên đề" /><label><input type="checkbox" checked={composerBalance} onChange={(e) => setComposerBalance(e.target.checked)} /> Cân bằng A–B–C–D</label><button type="button" className="qb-primary" onClick={saveComposerExam} disabled={!composerItems.length || busy==='composer'}>Lưu đề ({composerItems.length} câu)</button></div>
          <div className="qb-composer-layout"><aside><input value={composerQuery} onChange={(e) => setComposerQuery(e.target.value)} placeholder="Tìm câu để thêm…" />{composerCandidates.map((item)=><button type="button" key={item.id} onClick={() => addToComposer(item)}><b>+</b><span>{qbText(item.stem).slice(0,100)}</span><small>{item.bundle_id ? 'Thêm cả chùm' : 'Câu độc lập'} · {item.cefr}</small></button>)}</aside><main>{composerItems.map((item,index)=><article key={item.id} draggable onDragStart={() => setDraggedComposerIndex(index)} onDragOver={(e)=>e.preventDefault()} onDrop={() => { moveComposer(draggedComposerIndex,index); setDraggedComposerIndex(null); }}><b>{index+1}</b><div><strong>{qbText(item.stem).slice(0,150)}</strong><small>{item.bundle_id ? 'Bundle' : 'Standalone'} · {item.cefr} · {cognitiveLabel(item.cognitive_level)}</small></div><button type="button" onClick={() => smartReplaceComposer(item)}>Thay tương đương</button><button type="button" onClick={() => setComposerItems((current)=>current.filter((entry)=>entry.id!==item.id))}>×</button></article>)}</main></div>
        </section>
      ) : null}

      {tab === 'practice' ? (
        <section className="qb-admin-section">
          <div className="qb-section-head"><div><p>STUDENT PRACTICE MODE</p><h2>Bài luyện & chấm tự động</h2></div><span>Tạo từ câu đã chọn hoặc câu Approved ít dùng nhất.</span></div>
          {!activePractice ? <>
            <div className="qb-practice-create"><input value={practiceTitle} onChange={(e)=>setPracticeTitle(e.target.value)} /><input type="number" min="1" max="100" value={practiceCount} onChange={(e)=>setPracticeCount(Number(e.target.value)||10)} /><button type="button" className="qb-primary" onClick={createPracticeSet}>Tạo bài luyện {selectedIds.length ? 'từ '+selectedIds.length+' câu đã chọn' : ''}</button></div>
            <div className="qb-practice-list">{practiceSets.map((practice)=><article key={practice.id}><div><strong>{practice.title}</strong><small>{localStatus(practice.status)} · {formatTime(practice.updated_at)}</small></div><button type="button" onClick={() => openPractice(practice)}>Làm thử / Mở</button></article>)}</div>
          </> : <div className="qb-practice-player"><header><button type="button" className="qb-back" onClick={() => {setActivePractice(null);setPracticeResult(null);}}>← Danh sách</button><div><h3>{activePractice.title}</h3><span>{activePracticeItems.length} câu</span></div></header>{activePracticeItems.map((item,index)=>{const bundle=bundles.find((b)=>b.id===item.bundle_id);const showContext=item.bundle_id && (index===0 || activePracticeItems[index-1]?.bundle_id!==item.bundle_id);return <React.Fragment key={item.id}>{showContext ? <div className="qb-practice-context"><b>{bundle?.title}</b><p>{bundle?.context_text}</p></div> : null}<article><strong>Question {index+1}. {item.stem}</strong><div>{(item.options||[]).map((option,optionIndex)=>{const letter=String.fromCharCode(65+optionIndex);return <label key={letter}><input type="radio" name={item.id} value={letter} checked={practiceAnswers[item.id]===letter} onChange={()=>setPracticeAnswers({...practiceAnswers,[item.id]:letter})} /><span><b>{letter}.</b> {option}</span></label>})}</div>{practiceResult ? <p className={qbText(practiceAnswers[item.id]).toUpperCase()===qbText(item.correct_answer).toUpperCase()?'correct':'wrong'}>Đáp án: {item.correct_answer}. {item.explanation}</p> : null}</article></React.Fragment>})}{practiceResult ? <div className="qb-practice-score">Kết quả: <b>{practiceResult.score}/{practiceResult.maxScore}</b></div> : <button type="button" className="qb-primary" onClick={submitPractice}>Nộp bài & chấm</button>}</div>}
        </section>
      ) : null}

      {tab === 'analytics' ? (
        <section className="qb-admin-section">
          <div className="qb-section-head"><div><p>ITEM PERFORMANCE</p><h2>Phân tích câu hỏi</h2></div><button type="button" className="qb-primary qb-small" onClick={recomputeAnalytics}>Tính lại thống kê</button></div>
          <div className="qb-performance-table"><header><span>Câu hỏi</span><span>Lượt trả lời</span><span>% đúng</span><span>Phân biệt</span><span>Distractors</span><span>Dùng trong đề</span></header>{performance.sort((a,b)=>(b.total-a.total)||Number(b.item.usage_count||0)-Number(a.item.usage_count||0)).slice(0,300).map((entry)=><article key={entry.item.id}><div><strong>{qbText(entry.item.stem).slice(0,120)}</strong><small>{entry.item.cefr} · {entry.item.topic || '—'} · độ khó {entry.item.difficulty}</small></div><b>{entry.total}</b><b>{entry.correctPercent===null?'—':entry.correctPercent+'%'}</b><b>{entry.discrimination===null?'—':entry.discrimination}</b><span>{Object.entries(entry.choices).map(([key,value])=>key+':'+value).join(' · ')||'—'}</span><b>{entry.item.usage_count||0}</b></article>)}</div>
        </section>
      ) : null}

      {tab === 'backup' ? (
        <section className="qb-admin-section">
          <div className="qb-section-head"><div><p>BACKUP & RECOVERY</p><h2>Sao lưu và khôi phục</h2></div><button type="button" className="qb-primary qb-small" onClick={() => createSnapshot()}>+ Tạo snapshot</button></div>
          <div className="qb-snapshot-list">{snapshots.map((snapshot)=><article key={snapshot.id}><div><strong>{snapshot.title}</strong><small>{formatTime(snapshot.created_at)} · {snapshot.item_count} câu · {snapshot.bundle_count} chùm · {snapshot.test_count} đề</small></div><button type="button" onClick={() => exportSnapshot(snapshot)}>Tải JSON</button><button type="button" className={restoreArmed===snapshot.id?'qb-danger is-armed':'qb-secondary'} onClick={() => restoreSnapshot(snapshot)}>{restoreArmed===snapshot.id?'Xác nhận khôi phục':'Khôi phục'}</button></article>)}</div>
        </section>
      ) : null}

      {tab === 'history' ? (
        <section className="qb-admin-section">
          <div className="qb-section-head"><div><p>HISTORY & AUDIT</p><h2>Lịch sử đề và chỉnh sửa</h2></div><span>{tests.length} đề · {recentItemVersions.length+recentBundleVersions.length} thay đổi gần đây</span></div>
          <div className="qb-history-columns"><section><h3>Đề thi gần đây</h3>{[...tests].sort((a,b)=>new Date(b.updated_at)-new Date(a.updated_at)).slice(0,100).map((test)=><article key={test.id}><div><strong>{test.title}</strong><small>{localStatus(test.status)} · {formatTime(test.updated_at)} · {test.source_kind}</small></div><button type="button" onClick={() => onOpenExam?.(test)}>Mở</button></article>)}</section><section><h3>Phiên bản câu hỏi</h3>{recentItemVersions.slice(0,60).map((version)=>{const item=questions.find((q)=>q.id===version.item_id);return <article key={version.id}><div><strong>{item ? qbText(item.stem).slice(0,90) : version.item_id}</strong><small>v{version.version_no} · {formatTime(version.created_at)}</small></div></article>})}</section><section><h3>Phiên bản chùm</h3>{recentBundleVersions.slice(0,60).map((version)=>{const bundle=bundles.find((b)=>b.id===version.bundle_id);return <article key={version.id}><div><strong>{bundle?.title || version.bundle_id}</strong><small>v{version.version_no} · {formatTime(version.created_at)}</small></div></article>})}</section></div>
        </section>
      ) : null}
    </div>
  );
}
