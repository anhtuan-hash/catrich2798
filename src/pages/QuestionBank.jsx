import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '../utils/supabase.js';
import { parseQuestionBankPaste } from '../utils/questionBankPasteParser.js';
import {
  builderAvailability,
  selectExamFromBank,
} from '../utils/questionBankExamBuilder.js';
import {
  BLUEPRINT_PART_CATALOG,
  compareCognitiveTargets,
  defaultBlueprintCriteria,
  normalizeBlueprintCriteria,
  validateBlueprint,
} from '../utils/questionBankBlueprints.js';
import {
  auditExamQuality,
  buildExamExportHtml,
  buildExamSections,
  createVariantOptionOrder,
  effectiveAnswer,
  nextExamCode,
  splitExamStem,
  visibleOptions,
} from '../utils/questionBankExamManager.js';
import './QuestionBank.css';

const TABS = [
  ['questions', 'Kho câu hỏi'],
  ['bundles', 'Chùm bài'],
  ['blueprints', 'Ma trận'],
  ['builder', 'Tạo đề'],
  ['tests', 'Đề thi'],
  ['import', 'Nhập từ ChatGPT'],
  ['chatgpt', 'API / Plugin'],
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

function displayQuestionStem(value, bundlePosition) {
  const raw = text(value);
  if (!bundlePosition) return raw;
  return raw.replace(/^\s*(?:Question|Câu|Q)\s*\d+\s*[.)：:-]?\s*/i, '').trim() || raw;
}

function statusLabel(status) {
  const map = {
    draft: 'Bản nháp',
    review: 'Chờ duyệt',
    approved: 'Đã duyệt',
    published: 'Đã phát hành',
    closed: 'Đã đóng',
    retired: 'Ngừng dùng',
    archived: 'Lưu trữ',
  };
  return map[text(status).toLowerCase()] || text(status) || 'Bản nháp';
}

function cognitiveLabel(value) {
  const map = { recognition: 'Nhận biết', comprehension: 'Thông hiểu', application: 'Vận dụng' };
  return map[text(value).toLowerCase()] || text(value) || '—';
}

function safeFileName(value) {
  return text(value).replace(/[\\/:*?"<>|]+/g, '-').replace(/\s+/g, ' ').trim() || 'Brian-English-Exam';
}

function downloadWordDocument(html, title) {
  const blob = new Blob(['\ufeff', html], { type: 'application/msword;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `${safeFileName(title)}.doc`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function printExamPdf(html) {
  const popup = window.open('', '_blank', 'noopener,noreferrer');
  if (!popup) throw new Error('Trình duyệt đang chặn cửa sổ xuất PDF. Hãy cho phép pop-up cho Brian.');
  popup.document.open();
  popup.document.write(html);
  popup.document.close();
  popup.focus();
  window.setTimeout(() => popup.print(), 250);
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

async function questionFingerprint(question, bundleFingerprint = '') {
  return sha256(JSON.stringify({
    bundle: text(bundleFingerprint),
    stem: text(question.stem).replace(/\s+/g, ' ').toLowerCase(),
    options: (question.options || []).map((item) => text(item).replace(/\s+/g, ' ').toLowerCase()),
    correct: text(question.correctAnswer).toLowerCase(),
  }));
}

async function bundleFingerprint(bundle) {
  return sha256(JSON.stringify({
    type: text(bundle?.bundleType || 'passage').toLowerCase(),
    title: text(bundle?.title).replace(/\s+/g, ' ').toLowerCase(),
    context: text(bundle?.contextText).replace(/\s+/g, ' ').toLowerCase(),
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
  const [blueprints, setBlueprints] = useState([]);
  const [selectedBuilderBlueprintId, setSelectedBuilderBlueprintId] = useState('builtin-tnthpt-40');
  const [blueprintEditingId, setBlueprintEditingId] = useState('');
  const [blueprintSaving, setBlueprintSaving] = useState(false);
  const [blueprintDeleteArmed, setBlueprintDeleteArmed] = useState('');
  const [blueprintDraft, setBlueprintDraft] = useState({
    title: 'Ma trận TN THPT 40 câu',
    visibility: 'personal',
    criteria: defaultBlueprintCriteria(),
  });
  const [builderSeed, setBuilderSeed] = useState(1);
  const [builderSaving, setBuilderSaving] = useState(false);
  const [builderConfig, setBuilderConfig] = useState({
    title: 'Đề TN THPT từ ngân hàng – Set mới',
    grade: '12',
    schoolYear: '2026-2027',
    durationMinutes: '50',
    cefr: 'B1-B2',
    cognitiveLevel: '',
    topic: '',
  });
  const [selectedTest, setSelectedTest] = useState(null);
  const [selectedTestItems, setSelectedTestItems] = useState([]);
  const [examDetailLoading, setExamDetailLoading] = useState(false);
  const [showExamAnswers, setShowExamAnswers] = useState(false);
  const [examActionBusy, setExamActionBusy] = useState('');
  const [editingExam, setEditingExam] = useState(false);
  const [deleteExamArmed, setDeleteExamArmed] = useState(false);
  const [examFocusMode, setExamFocusMode] = useState(false);
  const [focusedExamSection, setFocusedExamSection] = useState('');
  const [collapsedExamSections, setCollapsedExamSections] = useState({});
  const [collapsedExamContexts, setCollapsedExamContexts] = useState({});
  const [examEdit, setExamEdit] = useState({ title: '', schoolYear: '', durationMinutes: '50', status: 'draft' });
  const [integration, setIntegration] = useState(null);
  const [importEvents, setImportEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [query, setQuery] = useState('');
  const [grade, setGrade] = useState('');
  const [cefr, setCefr] = useState('');
  const [showNew, setShowNew] = useState(false);
  const [generatedKey, setGeneratedKey] = useState('');
  const [testingConnection, setTestingConnection] = useState(false);
  const [disconnectArmed, setDisconnectArmed] = useState(false);
  const [pasteText, setPasteText] = useState('');
  const [pastePreview, setPastePreview] = useState(null);
  const [pasteSaving, setPasteSaving] = useState(false);
  const [pasteResult, setPasteResult] = useState(null);
  const [pasteMeta, setPasteMeta] = useState({
    title: '',
    grade: '12',
    cefr: 'B1',
    schoolYear: '2026-2027',
    skill: 'Use of English',
    topic: '',
    cognitiveLevel: 'recognition',
    difficulty: '2',
    saveAsExam: true,
    keepBundle: true,
  });
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

  const gptInstructionText = `Bạn là trợ lý soạn đề Tiếng Anh có kết nối với Brian Question Bank.

Quy tắc làm việc:
1. Khi tôi yêu cầu soạn một đề hoàn chỉnh, hãy hoàn thiện toàn bộ nội dung trước, kiểm tra mỗi câu trắc nghiệm chỉ có một đáp án đúng hợp lý, rồi dùng action saveBrianExam để lưu đề vào Brian.
2. Khi tôi yêu cầu tạo một nhóm câu hỏi rời, dùng saveBrianQuestions.
3. Với reading, cloze, notice, dialogue hoặc bất kỳ ngữ liệu chung nào, phải giữ nguyên ngữ liệu trong bundle và lưu các câu hỏi đi kèm theo đúng thứ tự.
4. Gắn metadata khi có thể: grade, CEFR, skill, topic, cognitiveLevel, difficulty, grammarPoint, tags, schoolYear.
5. Trước khi tạo lại nội dung cũ, có thể dùng searchBrianQuestions để tìm câu đã có trong Brian.
6. Khi tôi yêu cầu mở lại một đề đã lưu và có testId, dùng getBrianExam.
7. Sau khi lưu, báo rõ số câu mới, số câu trùng được tái sử dụng và testId của đề.
8. Không bao giờ yêu cầu mật khẩu Brian hoặc Supabase key của tôi. Chỉ dùng khóa Action đã được cấu hình trong Authentication.

OpenAPI: ${openApiUrl}`;

  const loadData = useCallback(async () => {
    if (!userId || !supabase) return;
    setLoading(true);
    setMessage('');
    try {
      const [itemsResult, bundlesResult, testsResult, blueprintsResult, integrationResult, eventsResult] = await Promise.all([
        supabase.from('assessment_items')
          .select('id,bundle_id,bundle_position,status,question_type,stem,options,correct_answer,explanation,skill,cefr,topic,cognitive_level,difficulty,source,usage_count,grade,unit_name,school_year,grammar_point,tags,source_kind,source_reference,created_at,updated_at')
          .eq('owner_id', userId).order('updated_at', { ascending: false }).limit(500),
        supabase.from('assessment_bundles')
          .select('*').eq('owner_id', userId).order('updated_at', { ascending: false }).limit(200),
        supabase.from('assessment_tests')
          .select('*').eq('owner_id', userId).order('updated_at', { ascending: false }).limit(200),
        supabase.from('assessment_blueprints')
          .select('*').eq('owner_id', userId).order('updated_at', { ascending: false }).limit(100),
        supabase.from('question_bank_integrations')
          .select('id,provider,label,active,last_used_at,created_at,updated_at')
          .eq('owner_id', userId).eq('provider', 'chatgpt').maybeSingle(),
        supabase.from('assessment_import_events')
          .select('id,request_id,imported_items,reused_items,imported_bundles,imported_tests,details,created_at')
          .eq('owner_id', userId).order('created_at', { ascending: false }).limit(12),
      ]);
      for (const result of [itemsResult, bundlesResult, testsResult, blueprintsResult, integrationResult, eventsResult]) {
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
      setBlueprints(blueprintsResult.data || []);
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
    chatgpt: questions.filter((item) => text(item.source_kind).startsWith('chatgpt')).length,
    bundles: bundles.length,
    tests: tests.length,
    total: questions.length,
  }), [questions, bundles, tests]);

  const builderStock = useMemo(
    () => builderAvailability(questions, bundles),
    [questions, bundles],
  );
  const activeBuilderBlueprint = useMemo(() => {
    if (selectedBuilderBlueprintId === 'builtin-tnthpt-40') {
      return {
        id: 'builtin-tnthpt-40',
        title: 'TN THPT 40 câu · mặc định',
        total_items: 40,
        criteria: defaultBlueprintCriteria(),
      };
    }
    return blueprints.find((item) => item.id === selectedBuilderBlueprintId) || {
      id: 'builtin-tnthpt-40',
      title: 'TN THPT 40 câu · mặc định',
      total_items: 40,
      criteria: defaultBlueprintCriteria(),
    };
  }, [blueprints, selectedBuilderBlueprintId]);
  const builderCriteria = useMemo(
    () => normalizeBlueprintCriteria(activeBuilderBlueprint.criteria || {}),
    [activeBuilderBlueprint],
  );
  const builderSelection = useMemo(
    () => selectExamFromBank({
      questions,
      bundles,
      blueprint: builderCriteria.parts,
      filters: {
        grade: builderConfig.grade || builderCriteria.grade,
        cefr: builderConfig.cefr || builderCriteria.cefr,
        cognitiveLevel: builderConfig.cognitiveLevel,
        topic: builderConfig.topic,
      },
      seed: builderSeed,
    }),
    [questions, bundles, builderConfig, builderSeed, builderCriteria],
  );
  const builderCognitiveFit = useMemo(
    () => compareCognitiveTargets(
      builderSelection.audit,
      builderCriteria.cognitiveTargets,
      builderCriteria.tolerance,
    ),
    [builderSelection.audit, builderCriteria],
  );
  const blueprintValidation = useMemo(
    () => validateBlueprint(blueprintDraft.criteria),
    [blueprintDraft.criteria],
  );

  const selectedExamSections = useMemo(
    () => buildExamSections(selectedTestItems),
    [selectedTestItems],
  );
  const selectedExamAudit = useMemo(
    () => auditExamQuality(selectedTestItems),
    [selectedTestItems],
  );
  const visibleExamSections = useMemo(() => {
    if (!examFocusMode) return selectedExamSections;
    const target = focusedExamSection || selectedExamSections[0]?.key || '';
    return selectedExamSections.filter((section) => section.key === target);
  }, [examFocusMode, focusedExamSection, selectedExamSections]);

  const jumpToExamSection = (sectionKey) => {
    setFocusedExamSection(sectionKey);
    if (examFocusMode) return;
    window.requestAnimationFrame(() => {
      document.getElementById(`qb-exam-section-${sectionKey}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  };

  const toggleAllExamSections = (collapsed) => {
    setCollapsedExamSections(Object.fromEntries(selectedExamSections.map((section) => [section.key, collapsed])));
  };

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
        visibility: 'personal',
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

  const analyzePaste = () => {
    const preview = parseQuestionBankPaste(pasteText, pasteMeta);
    setPastePreview(preview);
    setPasteResult(null);
    if (!preview.questions.length) {
      setMessage(preview.warnings?.[0] || 'Brian chưa nhận diện được câu hỏi nào.');
      return;
    }
    setMessage(`Đã nhận diện ${preview.questions.length} câu hỏi${preview.bundle ? ' và 1 chùm ngữ liệu' : ''}. Hãy kiểm tra bản xem trước rồi lưu.`);
  };

  const pasteFromClipboard = async () => {
    try {
      const value = await navigator.clipboard.readText();
      setPasteText(value);
      setPastePreview(null);
      setPasteResult(null);
      setMessage(value ? 'Đã dán nội dung từ clipboard. Nhấn “Phân tích nội dung”.' : 'Clipboard đang trống.');
    } catch {
      setMessage('Trình duyệt chưa cho phép đọc clipboard. Hãy dán bằng Ctrl/Cmd + V.');
    }
  };

  const savePasteImport = async () => {
    if (!userId || !supabase || !pastePreview?.questions?.length) return;
    setPasteSaving(true);
    setMessage('');
    try {
      const now = new Date().toISOString();
      let savedBundle = null;
      let bundleCreated = false;
      let bundleHash = '';

      if (pasteMeta.keepBundle && pastePreview.bundle?.contextText) {
        bundleHash = await bundleFingerprint(pastePreview.bundle);
        const existingBundle = await supabase.from('assessment_bundles')
          .select('*')
          .eq('owner_id', userId)
          .eq('fingerprint', bundleHash)
          .maybeSingle();
        if (existingBundle.error) throw existingBundle.error;
        if (existingBundle.data) {
          savedBundle = existingBundle.data;
        } else {
          const bundleRow = {
            owner_id: userId,
            visibility: 'private',
            title: text(pastePreview.bundle.title || pasteMeta.title || 'Ngữ liệu từ ChatGPT'),
            bundle_type: text(pastePreview.bundle.bundleType || 'passage'),
            context_text: text(pastePreview.bundle.contextText),
            instructions: text(pastePreview.bundle.instructions),
            topic: text(pastePreview.bundle.topic || pasteMeta.topic),
            skill: text(pastePreview.bundle.skill || pasteMeta.skill),
            grade: Number(pastePreview.bundle.grade || pasteMeta.grade || 0) || null,
            unit_name: '',
            school_year: text(pasteMeta.schoolYear),
            source: 'ChatGPT · Dán thủ công',
            source_kind: 'chatgpt_paste',
            source_reference: '',
            status: 'draft',
            fingerprint: bundleHash,
            metadata: { importer: 'paste', parser: 'brian-local-v1', importedAt: now },
            updated_at: now,
          };
          const insertedBundle = await supabase.from('assessment_bundles').insert(bundleRow).select('*').single();
          if (insertedBundle.error) throw insertedBundle.error;
          savedBundle = insertedBundle.data;
          bundleCreated = true;
        }
      }

      const prepared = [];
      for (let index = 0; index < pastePreview.questions.length; index += 1) {
        const question = pastePreview.questions[index];
        const fingerprint = await questionFingerprint(question, bundleHash);
        prepared.push({
          fingerprint,
          row: {
            owner_id: userId,
            bundle_id: savedBundle?.id || null,
            bundle_position: savedBundle ? index + 1 : null,
            visibility: 'personal',
            status: 'draft',
            question_type: text(question.questionType || (question.options?.length ? 'mcq' : 'short_answer')),
            stem: text(question.stem),
            options: (question.options || []).map(text).filter(Boolean),
            correct_answer: text(question.correctAnswer),
            explanation: text(question.explanation),
            skill: text(question.skill || pasteMeta.skill || 'Use of English'),
            cefr: text(question.cefr || pasteMeta.cefr || 'B1').toUpperCase(),
            topic: text(question.topic || pasteMeta.topic),
            cognitive_level: text(question.cognitiveLevel || pasteMeta.cognitiveLevel || 'recognition'),
            difficulty: Math.max(1, Math.min(5, Number(question.difficulty || pasteMeta.difficulty || 2) || 2)),
            source: 'ChatGPT · Dán thủ công',
            grade: Number(question.grade || pasteMeta.grade || 0) || null,
            unit_name: text(question.unitName),
            school_year: text(question.schoolYear || pasteMeta.schoolYear),
            grammar_point: text(question.grammarPoint),
            tags: [...new Set([...(question.tags || []), 'chatgpt-paste'])],
            source_kind: 'chatgpt_paste',
            source_reference: '',
            fingerprint,
            import_metadata: { importer: 'paste', parser: 'brian-local-v1', importedAt: now },
            updated_at: now,
          },
        });
      }

      const fingerprints = [...new Set(prepared.map((item) => item.fingerprint))];
      let existingRows = [];
      if (fingerprints.length) {
        const existingResult = await supabase.from('assessment_items')
          .select('id,fingerprint,stem')
          .eq('owner_id', userId)
          .in('fingerprint', fingerprints);
        if (existingResult.error) throw existingResult.error;
        existingRows = existingResult.data || [];
      }
      const existingMap = new Map(existingRows.map((item) => [item.fingerprint, item]));
      const freshMap = new Map();
      prepared.forEach((item) => {
        if (!existingMap.has(item.fingerprint) && !freshMap.has(item.fingerprint)) freshMap.set(item.fingerprint, item.row);
      });

      let insertedRows = [];
      if (freshMap.size) {
        const insertedResult = await supabase.from('assessment_items')
          .insert([...freshMap.values()])
          .select('id,fingerprint,stem');
        if (insertedResult.error) {
          if (insertedResult.error.code !== '23505') throw insertedResult.error;
        } else {
          insertedRows = insertedResult.data || [];
        }
      }

      const allResult = await supabase.from('assessment_items')
        .select('id,fingerprint,stem')
        .eq('owner_id', userId)
        .in('fingerprint', fingerprints);
      if (allResult.error) throw allResult.error;
      const allMap = new Map((allResult.data || []).map((item) => [item.fingerprint, item]));
      insertedRows.forEach((item) => allMap.set(item.fingerprint, item));
      const orderedItems = prepared.map((item) => allMap.get(item.fingerprint)).filter(Boolean);
      const insertedCount = insertedRows.length;
      const reusedCount = Math.max(0, pastePreview.questions.length - insertedCount);

      let savedTest = null;
      if (pasteMeta.saveAsExam && orderedItems.length) {
        const testInsert = await supabase.from('assessment_tests').insert({
          owner_id: userId,
          blueprint_id: activeBuilderBlueprint.id === 'builtin-tnthpt-40' ? null : activeBuilderBlueprint.id,
          visibility: 'personal',
          title: text(pasteMeta.title || pastePreview.title || `Đề nhập từ ChatGPT · ${new Date().toLocaleDateString('vi-VN')}`),
          status: 'draft',
          grade: Number(pasteMeta.grade || pastePreview.metadata?.grade || 0) || null,
          school_year: text(pasteMeta.schoolYear || pastePreview.metadata?.schoolYear),
          tags: ['chatgpt-paste'],
          source_kind: 'chatgpt_paste',
          source_reference: '',
          import_metadata: { importer: 'paste', parser: 'brian-local-v1', importedAt: now },
          settings: { durationMinutes: 50, instructions: text(pastePreview.instructions) },
          updated_at: now,
        }).select('*').single();
        if (testInsert.error) throw testInsert.error;
        savedTest = testInsert.data;

        const joinRows = orderedItems.map((item, index) => ({
          test_id: savedTest.id,
          item_id: item.id,
          position: index + 1,
          option_order: [],
          points: Number(pastePreview.questions[index]?.points || 1) || 1,
        }));
        const joinResult = await supabase.from('assessment_test_items').insert(joinRows);
        if (joinResult.error) throw joinResult.error;
      }

      setPasteResult({
        imported: insertedCount,
        reused: reusedCount,
        bundleCreated,
        testId: savedTest?.id || '',
        title: savedTest?.title || pasteMeta.title || pastePreview.title || 'Nhập từ ChatGPT',
      });
      setMessage(`Đã lưu: ${insertedCount} câu mới · ${reusedCount} câu đã có${savedTest ? ' · 1 đề thi' : ''}${bundleCreated ? ' · 1 chùm bài' : ''}.`);
      await loadData();
    } catch (error) {
      setMessage(error?.message || 'Không thể lưu nội dung đã dán.');
    } finally {
      setPasteSaving(false);
    }
  };

  const resetBlueprintDraft = () => {
    setBlueprintEditingId('');
    setBlueprintDeleteArmed('');
    setBlueprintDraft({
      title: 'Ma trận mới',
      visibility: 'personal',
      criteria: defaultBlueprintCriteria(),
    });
  };

  const editBlueprint = (blueprint) => {
    setBlueprintEditingId(blueprint.id);
    setBlueprintDeleteArmed('');
    setBlueprintDraft({
      title: text(blueprint.title),
      visibility: text(blueprint.visibility) === 'department' ? 'department' : 'personal',
      criteria: normalizeBlueprintCriteria(blueprint.criteria || {}),
    });
    setActiveTab('blueprints');
  };

  const toggleBlueprintPart = (type) => {
    const def = BLUEPRINT_PART_CATALOG.find((part) => part.type === type);
    if (!def) return;
    setBlueprintDraft((current) => {
      const criteria = normalizeBlueprintCriteria(current.criteria);
      const exists = criteria.parts.some((part) => part.type === type);
      let parts;
      if (exists) {
        parts = criteria.parts.filter((part) => part.type !== type);
      } else {
        const part = def.mode === 'items'
          ? { type: def.type, label: def.label, mode: 'items', count: def.defaultCount || 1 }
          : {
            type: def.type,
            label: def.label,
            mode: 'bundles',
            bundleCount: def.defaultBundleCount || 1,
            itemCount: def.fixedItemsPerBundle || 1,
          };
        const byType = new Map(criteria.parts.map((item) => [item.type, item]));
        byType.set(type, part);
        parts = BLUEPRINT_PART_CATALOG.map((catalog) => byType.get(catalog.type)).filter(Boolean);
      }
      return { ...current, criteria: { ...criteria, preset: 'custom', parts } };
    });
  };

  const updateBlueprintPart = (type, patch) => {
    setBlueprintDraft((current) => {
      const criteria = normalizeBlueprintCriteria(current.criteria);
      return {
        ...current,
        criteria: {
          ...criteria,
          preset: 'custom',
          parts: criteria.parts.map((part) => part.type === type ? { ...part, ...patch } : part),
        },
      };
    });
  };

  const updateBlueprintCriteria = (patch) => {
    setBlueprintDraft((current) => ({
      ...current,
      criteria: { ...normalizeBlueprintCriteria(current.criteria), ...patch, preset: 'custom' },
    }));
  };

  const saveBlueprint = async () => {
    if (!userId || !supabase || blueprintSaving) return;
    const validation = validateBlueprint(blueprintDraft.criteria);
    if (!text(blueprintDraft.title)) {
      setMessage('Tên ma trận không được để trống.');
      return;
    }
    if (!validation.valid) {
      setMessage(validation.errors[0] || 'Ma trận chưa hợp lệ.');
      return;
    }
    setBlueprintSaving(true);
    setMessage('');
    try {
      const row = {
        owner_id: userId,
        visibility: blueprintDraft.visibility === 'department' ? 'department' : 'personal',
        title: text(blueprintDraft.title),
        total_items: validation.total,
        criteria: validation.normalized,
        updated_at: new Date().toISOString(),
      };
      let result;
      if (blueprintEditingId) {
        result = await supabase.from('assessment_blueprints')
          .update(row)
          .eq('id', blueprintEditingId)
          .eq('owner_id', userId)
          .select('*')
          .single();
      } else {
        result = await supabase.from('assessment_blueprints')
          .insert(row)
          .select('*')
          .single();
      }
      if (result.error) throw result.error;
      await loadData();
      setBlueprintEditingId(result.data.id);
      setBlueprintDraft({
        title: result.data.title,
        visibility: result.data.visibility === 'department' ? 'department' : 'personal',
        criteria: normalizeBlueprintCriteria(result.data.criteria || {}),
      });
      setMessage(blueprintEditingId ? 'Đã cập nhật ma trận.' : 'Đã lưu ma trận mới.');
    } catch (error) {
      setMessage(error?.message || 'Không thể lưu ma trận.');
    } finally {
      setBlueprintSaving(false);
    }
  };

  const deleteBlueprint = async (blueprint) => {
    if (!blueprint?.id || !userId || !supabase) return;
    if (blueprintDeleteArmed !== blueprint.id) {
      setBlueprintDeleteArmed(blueprint.id);
      setMessage('Nhấn “Xác nhận xóa” để xóa ma trận. Các đề đã tạo vẫn được giữ nguyên.');
      return;
    }
    setBlueprintSaving(true);
    try {
      const result = await supabase.from('assessment_blueprints')
        .delete()
        .eq('id', blueprint.id)
        .eq('owner_id', userId);
      if (result.error) throw result.error;
      if (selectedBuilderBlueprintId === blueprint.id) setSelectedBuilderBlueprintId('builtin-tnthpt-40');
      if (blueprintEditingId === blueprint.id) resetBlueprintDraft();
      await loadData();
      setBlueprintDeleteArmed('');
      setMessage('Đã xóa ma trận. Các đề đã tạo không bị xóa.');
    } catch (error) {
      setMessage(error?.message || 'Không thể xóa ma trận.');
    } finally {
      setBlueprintSaving(false);
    }
  };

  const useBlueprintInBuilder = (blueprint) => {
    const criteria = blueprint?.id === 'builtin-tnthpt-40'
      ? defaultBlueprintCriteria()
      : normalizeBlueprintCriteria(blueprint?.criteria || {});
    const id = blueprint?.id || 'builtin-tnthpt-40';
    setSelectedBuilderBlueprintId(id);
    setBuilderConfig((current) => ({
      ...current,
      title: `${blueprint?.title || 'TN THPT 40 câu'} – Set mới`,
      grade: criteria.grade || current.grade,
      cefr: criteria.cefr || current.cefr,
    }));
    setBuilderSeed((value) => value + 1);
    setActiveTab('builder');
  };

  const saveBuiltExam = async () => {
    if (!userId || !supabase || builderSaving) return;
    if (!builderSelection.complete) {
      setMessage('Ngân hàng chưa đủ dữ liệu để ráp đúng ma trận đang chọn. Xem các mục còn thiếu trong Tạo đề.');
      return;
    }
    if (!builderSelection.audit.ready) {
      setMessage(`Bản ráp hiện còn ${builderSelection.audit.errors.length} lỗi bắt buộc. Chưa thể lưu đề.`);
      return;
    }

    const title = text(builderConfig.title) || 'Đề từ Ngân hàng câu hỏi';
    const durationMinutes = Math.max(1, Math.min(600, Number.parseInt(builderConfig.durationMinutes, 10) || 50));
    setBuilderSaving(true);
    setMessage('');
    let newTest = null;
    try {
      const now = new Date().toISOString();
      const insertResult = await supabase.from('assessment_tests').insert({
        owner_id: userId,
        blueprint_id: activeBuilderBlueprint.id === 'builtin-tnthpt-40' ? null : activeBuilderBlueprint.id,
        visibility: 'personal',
        title,
        status: 'draft',
        settings: {
          durationMinutes,
          builder: 'question-bank',
          builderSeed,
          blueprint: activeBuilderBlueprint.id,
          blueprintTitle: activeBuilderBlueprint.title,
        },
        grade: Number.parseInt(builderConfig.grade, 10) || 12,
        school_year: text(builderConfig.schoolYear),
        tags: ['bank-builder', 'no-ai-cost', ...(builderCriteria.preset === 'tnthpt_40' ? ['TNTHPT2025-2026'] : ['custom-blueprint'])],
        source_kind: 'manual',
        source_reference: 'Brian Question Bank Builder',
        import_metadata: {
          builder: 'question-bank',
          createdAt: now,
          filters: {
            cefr: builderConfig.cefr,
            cognitiveLevel: builderConfig.cognitiveLevel,
            topic: builderConfig.topic,
          },
          blueprint: {
            id: activeBuilderBlueprint.id,
            title: activeBuilderBlueprint.title,
            totalItems: activeBuilderBlueprint.total_items || builderSelection.items.length,
            criteria: builderCriteria,
          },
          cognitiveTarget: builderCognitiveFit,
          audit: {
            structureOk: builderSelection.audit.structureOk,
            warningCount: builderSelection.audit.warnings.length,
          },
        },
        updated_at: now,
      }).select('*').single();
      if (insertResult.error) throw insertResult.error;
      newTest = insertResult.data;

      const joinRows = builderSelection.items.map((item) => ({
        test_id: newTest.id,
        item_id: item.id,
        position: Number(item.position),
        option_order: [],
        points: 1,
      }));
      const joinResult = await supabase.from('assessment_test_items').insert(joinRows);
      if (joinResult.error) throw joinResult.error;

      try {
        await supabase.rpc('bes_assessment_increment_usage', {
          p_item_ids: builderSelection.items.map((item) => item.id),
        });
      } catch {
        // Usage statistics are non-critical; the exam itself is already valid.
      }

      await loadData();
      setActiveTab('tests');
      await openExam(newTest);
      setMessage(`Đã tạo đề ${builderSelection.items.length} câu từ ma trận “${activeBuilderBlueprint.title}”, không gọi AI và không phát sinh phí AI.`);
      setBuilderSeed((value) => value + 1);
    } catch (error) {
      if (newTest?.id) {
        await supabase.from('assessment_test_items').delete().eq('test_id', newTest.id);
        await supabase.from('assessment_tests').delete().eq('id', newTest.id).eq('owner_id', userId);
      }
      setMessage(error?.message || 'Không thể tạo đề từ ngân hàng.');
    } finally {
      setBuilderSaving(false);
    }
  };

  const openExam = async (test) => {
    if (!test?.id || !userId || !supabase) return;
    setSelectedTest(test);
    setSelectedTestItems([]);
    setExamDetailLoading(true);
    setShowExamAnswers(false);
    setEditingExam(false);
    setDeleteExamArmed(false);
    setExamFocusMode(false);
    setFocusedExamSection('');
    setCollapsedExamSections({});
    setCollapsedExamContexts({});
    setExamEdit({
      title: text(test.title),
      schoolYear: text(test.school_year),
      durationMinutes: String(test.settings?.durationMinutes || 50),
      status: text(test.status) || 'draft',
    });
    setMessage('');
    try {
      const joinsResult = await supabase.from('assessment_test_items')
        .select('item_id,position,option_order,points')
        .eq('test_id', test.id)
        .order('position', { ascending: true });
      if (joinsResult.error) throw joinsResult.error;
      const joins = joinsResult.data || [];
      const itemIds = joins.map((row) => row.item_id);
      if (!itemIds.length) {
        setSelectedTestItems([]);
        return;
      }

      const itemsResult = await supabase.from('assessment_items')
        .select('*')
        .in('id', itemIds);
      if (itemsResult.error) throw itemsResult.error;
      const itemMap = new Map((itemsResult.data || []).map((item) => [item.id, item]));
      const bundleIds = [...new Set((itemsResult.data || []).map((item) => item.bundle_id).filter(Boolean))];
      let bundleMap = new Map();
      if (bundleIds.length) {
        const bundleResult = await supabase.from('assessment_bundles').select('*').in('id', bundleIds);
        if (bundleResult.error) throw bundleResult.error;
        bundleMap = new Map((bundleResult.data || []).map((bundle) => [bundle.id, bundle]));
      }

      const merged = joins.map((join) => {
        const item = itemMap.get(join.item_id) || {};
        const bundle = item.bundle_id ? bundleMap.get(item.bundle_id) : null;
        return {
          ...item,
          item_id: join.item_id,
          position: join.position,
          option_order: join.option_order || [],
          points: join.points,
          bundle_type: bundle?.bundle_type || '',
          _bundle: bundle || null,
        };
      });
      setSelectedTestItems(merged);
    } catch (error) {
      setMessage(error?.message || 'Không thể mở chi tiết đề thi.');
    } finally {
      setExamDetailLoading(false);
    }
  };

  const createExamCopy = async ({ variant = false } = {}) => {
    if (!selectedTest?.id || !selectedTestItems.length || !userId || !supabase) return;
    const actionName = variant ? 'variant' : 'duplicate';
    setExamActionBusy(actionName);
    setMessage('');
    try {
      const now = new Date().toISOString();
      const code = variant ? nextExamCode(tests) : '';
      const baseTitle = text(selectedTest.title).replace(/\s*[·–-]\s*Mã\s*\d+\s*$/i, '').trim();
      const title = variant
        ? `${baseTitle} · Mã ${code}`
        : `${baseTitle} – Bản sao`;
      const settings = {
        ...(selectedTest.settings || {}),
        ...(variant
          ? { examCode: code, variantOf: selectedTest.id, variantCreatedAt: now }
          : { duplicatedFrom: selectedTest.id, duplicatedAt: now }),
      };

      const insertResult = await supabase.from('assessment_tests').insert({
        owner_id: userId,
        blueprint_id: selectedTest.blueprint_id || null,
        visibility: 'personal',
        title,
        status: 'draft',
        settings,
        grade: selectedTest.grade || null,
        school_year: text(selectedTest.school_year),
        tags: [...new Set([...(selectedTest.tags || []), variant ? 'variant' : 'duplicate'])],
        source_kind: 'manual',
        source_reference: variant ? `Variant of ${selectedTest.id}` : `Duplicate of ${selectedTest.id}`,
        import_metadata: {
          manager: 'Brian Question Bank',
          operation: variant ? 'create_variant' : 'duplicate_exam',
          sourceTestId: selectedTest.id,
          createdAt: now,
        },
        updated_at: now,
      }).select('*').single();
      if (insertResult.error) throw insertResult.error;
      const newTest = insertResult.data;

      const joinRows = selectedTestItems.map((item) => ({
        test_id: newTest.id,
        item_id: item.id || item.item_id,
        position: Number(item.position),
        option_order: variant ? createVariantOptionOrder(item, code) : (Array.isArray(item.option_order) ? item.option_order : []),
        points: Number(item.points || 1),
      }));
      const joinResult = await supabase.from('assessment_test_items').insert(joinRows);
      if (joinResult.error) {
        await supabase.from('assessment_tests').delete().eq('id', newTest.id).eq('owner_id', userId);
        throw joinResult.error;
      }

      await loadData();
      await openExam(newTest);
      setMessage(variant
        ? `Đã tạo Mã ${code}. Câu hỏi được tái sử dụng, phương án A–D đã được đảo an toàn.`
        : 'Đã nhân bản đề. Bản sao dùng lại toàn bộ câu hỏi gốc.');
    } catch (error) {
      setMessage(error?.message || (variant ? 'Không thể tạo mã đề mới.' : 'Không thể nhân bản đề.'));
    } finally {
      setExamActionBusy('');
    }
  };

  const saveExamMetadata = async () => {
    if (!selectedTest?.id || !userId || !supabase) return;
    const title = text(examEdit.title);
    if (!title) {
      setMessage('Tên đề không được để trống.');
      return;
    }
    setExamActionBusy('metadata');
    setMessage('');
    try {
      const durationMinutes = Math.max(1, Math.min(600, Number.parseInt(examEdit.durationMinutes, 10) || 50));
      const settings = { ...(selectedTest.settings || {}), durationMinutes };
      const updateResult = await supabase.from('assessment_tests')
        .update({
          title,
          school_year: text(examEdit.schoolYear),
          status: ['draft', 'published', 'closed', 'archived'].includes(examEdit.status) ? examEdit.status : 'draft',
          settings,
          updated_at: new Date().toISOString(),
        })
        .eq('id', selectedTest.id)
        .eq('owner_id', userId)
        .select('*')
        .single();
      if (updateResult.error) throw updateResult.error;
      setSelectedTest(updateResult.data);
      setExamEdit({
        title: updateResult.data.title,
        schoolYear: updateResult.data.school_year || '',
        durationMinutes: String(updateResult.data.settings?.durationMinutes || 50),
        status: updateResult.data.status || 'draft',
      });
      setEditingExam(false);
      await loadData();
      setMessage('Đã cập nhật thông tin đề thi.');
    } catch (error) {
      setMessage(error?.message || 'Không thể cập nhật đề thi.');
    } finally {
      setExamActionBusy('');
    }
  };

  const createVariantBatch = async (count = 4) => {
    if (!selectedTest?.id || !selectedTestItems.length || !userId || !supabase) return;
    const total = Math.max(1, Math.min(8, Number(count) || 4));
    setExamActionBusy('variant-batch');
    setMessage('');
    const created = [];
    try {
      const firstCode = Number.parseInt(nextExamCode(tests), 10) || 101;
      const baseTitle = text(selectedTest.title).replace(/\s*[·–-]\s*Mã\s*\d+\s*$/i, '').trim();
      for (let offset = 0; offset < total; offset += 1) {
        const code = String(firstCode + offset);
        const now = new Date().toISOString();
        const insertResult = await supabase.from('assessment_tests').insert({
          owner_id: userId,
          blueprint_id: selectedTest.blueprint_id || null,
          visibility: 'personal',
          title: `${baseTitle} · Mã ${code}`,
          status: 'draft',
          settings: {
            ...(selectedTest.settings || {}),
            examCode: code,
            variantOf: selectedTest.id,
            variantCreatedAt: now,
          },
          grade: selectedTest.grade || null,
          school_year: text(selectedTest.school_year),
          tags: [...new Set([...(selectedTest.tags || []), 'variant'])],
          source_kind: 'manual',
          source_reference: `Variant of ${selectedTest.id}`,
          import_metadata: {
            manager: 'Brian Question Bank',
            operation: 'create_variant_batch',
            sourceTestId: selectedTest.id,
            createdAt: now,
          },
          updated_at: now,
        }).select('*').single();
        if (insertResult.error) throw insertResult.error;
        const test = insertResult.data;
        const joinRows = selectedTestItems.map((item) => ({
          test_id: test.id,
          item_id: item.id || item.item_id,
          position: Number(item.position),
          option_order: createVariantOptionOrder(item, code),
          points: Number(item.points || 1),
        }));
        const joinResult = await supabase.from('assessment_test_items').insert(joinRows);
        if (joinResult.error) {
          await supabase.from('assessment_tests').delete().eq('id', test.id).eq('owner_id', userId);
          throw joinResult.error;
        }
        created.push(test);
      }
      await loadData();
      setMessage(`Đã tạo ${created.length} mã đề: ${created.map((test) => test.settings?.examCode).join(', ')}. Câu hỏi gốc không bị nhân bản.`);
    } catch (error) {
      setMessage(error?.message || 'Không thể tạo bộ mã đề.');
    } finally {
      setExamActionBusy('');
    }
  };

  const deleteSelectedExam = async () => {
    if (!selectedTest?.id || !userId || !supabase) return;
    if (!deleteExamArmed) {
      setDeleteExamArmed(true);
      setMessage('Nhấn “Xóa đề” thêm một lần để xác nhận. Câu hỏi và chùm bài trong ngân hàng sẽ được giữ nguyên.');
      return;
    }
    setExamActionBusy('delete');
    setMessage('');
    try {
      const joinsDelete = await supabase.from('assessment_test_items').delete().eq('test_id', selectedTest.id);
      if (joinsDelete.error) throw joinsDelete.error;
      const testDelete = await supabase.from('assessment_tests').delete().eq('id', selectedTest.id).eq('owner_id', userId);
      if (testDelete.error) throw testDelete.error;
      setSelectedTest(null);
      setSelectedTestItems([]);
      setDeleteExamArmed(false);
      setEditingExam(false);
      await loadData();
      setMessage('Đã xóa đề thi. Toàn bộ câu hỏi và chùm bài vẫn được giữ trong ngân hàng.');
    } catch (error) {
      setMessage(error?.message || 'Không thể xóa đề thi.');
    } finally {
      setExamActionBusy('');
    }
  };

  const publishSelectedExam = async () => {
    if (!selectedTest?.id || !userId || !supabase) return;
    if (!selectedExamAudit.ready) {
      setMessage(`Chưa thể phát hành: còn ${selectedExamAudit.errors.length} lỗi bắt buộc trong Quality Audit.`);
      return;
    }
    setExamActionBusy('publish');
    setMessage('');
    try {
      const updateResult = await supabase.from('assessment_tests')
        .update({
          status: 'published',
          import_metadata: {
            ...(selectedTest.import_metadata || {}),
            qualityAudit: {
              auditedAt: new Date().toISOString(),
              totalQuestions: selectedExamAudit.totalQuestions,
              totalSections: selectedExamAudit.totalSections,
              warningCount: selectedExamAudit.warnings.length,
              structureOk: selectedExamAudit.structureOk,
            },
          },
          updated_at: new Date().toISOString(),
        })
        .eq('id', selectedTest.id)
        .eq('owner_id', userId)
        .select('*')
        .single();
      if (updateResult.error) throw updateResult.error;
      setSelectedTest(updateResult.data);
      setExamEdit((current) => ({ ...current, status: 'published' }));
      await loadData();
      setMessage(`Đã phát hành đề sau khi Quality Audit đạt yêu cầu. Còn ${selectedExamAudit.warnings.length} cảnh báo tham khảo.`);
    } catch (error) {
      setMessage(error?.message || 'Không thể phát hành đề thi.');
    } finally {
      setExamActionBusy('');
    }
  };

  const exportSelectedExam = (format) => {
    if (!selectedTest || !selectedTestItems.length) return;
    try {
      const html = buildExamExportHtml({
        test: selectedTest,
        items: selectedTestItems,
        teacherMode: showExamAnswers,
      });
      const suffix = showExamAnswers ? ' - Ban GV' : ' - Ban HS';
      if (format === 'word') {
        downloadWordDocument(html, `${selectedTest.title}${suffix}`);
        setMessage(`Đã xuất Word ${showExamAnswers ? 'bản giáo viên' : 'bản học sinh'}.`);
      } else {
        printExamPdf(html);
        setMessage('Đã mở bản in PDF. Chọn “Save as PDF/Lưu dưới dạng PDF” trong hộp thoại in.');
      }
    } catch (error) {
      setMessage(error?.message || 'Không thể xuất đề.');
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

  const testConnection = async () => {
    if (!generatedKey) {
      setMessage('Hãy tạo khóa mới trong phiên này để kiểm tra kết nối.');
      return;
    }
    setTestingConnection(true);
    setMessage('');
    try {
      const response = await fetch('/api/question-bank/search-questions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${generatedKey}`,
        },
        body: JSON.stringify({ filters: {}, limit: 1 }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok || body?.ok === false) {
        throw new Error(body?.error || `HTTP ${response.status}`);
      }
      setMessage('Kết nối Brian Question Bank hoạt động tốt. ChatGPT có thể dùng 4 action.');
    } catch (error) {
      setMessage(`Kiểm tra kết nối thất bại: ${error?.message || 'Không xác định'}`);
    } finally {
      setTestingConnection(false);
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
            <button type="button" className="qb-secondary" onClick={() => setActiveTab('import')}>Dán từ ChatGPT</button>
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
        <article><span>Từ ChatGPT</span><strong>{sourceStats.chatgpt}</strong></article>
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
                  <div className="qb-question-number">{String(item.bundle_position || index + 1).padStart(2, '0')}</div>
                  <div className="qb-question-main">
                    <div className="qb-chips">
                      {item.grade ? <span>Khối {item.grade}</span> : null}
                      {item.cefr ? <span>{item.cefr}</span> : null}
                      <span>{cognitiveLabel(item.cognitive_level)}</span>
                      {item.grammar_point ? <span>{item.grammar_point}</span> : null}
                      {item.source_kind === 'chatgpt' ? <span className="is-chatgpt">ChatGPT</span> : null}
                    </div>
                    <strong className="qb-stem">{compact(displayQuestionStem(item.stem, item.bundle_position), 420)}</strong>
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


      {!loading && activeTab === 'builder' ? (
        <div className="qb-panel qb-builder">
          <div className="qb-section-head">
            <div><p>ZERO-COST TEST BUILDER</p><h2>Tạo đề từ ngân hàng</h2></div>
            <span>Ráp đề trực tiếp từ câu hỏi đã lưu · không gọi AI · không phát sinh phí AI.</span>
          </div>

          <div className="qb-builder-hero">
            <div>
              <span className="qb-builder-kicker">TN THPT 2025–2026 PRESET</span>
              <h3>Đề 40 câu theo đúng cấu trúc đã kiểm định</h3>
              <p>Brian chọn nguyên chùm Reading/Cloze để không làm mất ngữ liệu, đồng thời lấy 5 câu Arrangement độc lập. Mỗi lần “Xáo lựa chọn” sẽ ưu tiên tổ hợp khác trong kho.</p>
            </div>
            <div className="qb-builder-total">
              <strong>{builderSelection.items.length}</strong>
              <span>/ 40 câu</span>
              <small>{builderSelection.complete ? 'Đủ dữ liệu để tạo đề' : builderSelection.missing.length + ' phần còn thiếu'}</small>
            </div>
          </div>

          <div className="qb-builder-layout">
            <section className="qb-builder-settings">
              <h3>Thông tin đề</h3>
              <label className="qb-builder-wide"><span>Tên đề</span><input value={builderConfig.title} onChange={(event) => setBuilderConfig({ ...builderConfig, title: event.target.value })} /></label>
              <div className="qb-builder-fields">
                <label><span>Khối</span><select value={builderConfig.grade} onChange={(event) => setBuilderConfig({ ...builderConfig, grade: event.target.value })}><option value="12">12</option><option value="11">11</option><option value="10">10</option></select></label>
                <label><span>Năm học</span><input value={builderConfig.schoolYear} onChange={(event) => setBuilderConfig({ ...builderConfig, schoolYear: event.target.value })} /></label>
                <label><span>Thời gian</span><input type="number" min="1" max="600" value={builderConfig.durationMinutes} onChange={(event) => setBuilderConfig({ ...builderConfig, durationMinutes: event.target.value })} /></label>
                <label><span>CEFR ưu tiên</span><select value={builderConfig.cefr} onChange={(event) => setBuilderConfig({ ...builderConfig, cefr: event.target.value })}><option value="B1-B2">B1–B2</option><option value="B1">B1</option><option value="B2">B2</option></select></label>
                <label><span>Nhận thức ưu tiên</span><select value={builderConfig.cognitiveLevel} onChange={(event) => setBuilderConfig({ ...builderConfig, cognitiveLevel: event.target.value })}><option value="">Tự cân bằng</option><option value="recognition">Nhận biết</option><option value="comprehension">Thông hiểu</option><option value="application">Vận dụng</option></select></label>
                <label><span>Lọc chủ đề</span><input value={builderConfig.topic} onChange={(event) => setBuilderConfig({ ...builderConfig, topic: event.target.value })} placeholder="VD: environment" /></label>
              </div>
              <div className="qb-builder-actions">
                <button type="button" className="qb-secondary" onClick={() => setBuilderSeed((value) => value + 1)}>↻ Xáo lựa chọn</button>
                <button type="button" className="qb-primary" onClick={saveBuiltExam} disabled={builderSaving || !builderSelection.complete || !builderSelection.audit.ready}>
                  {builderSaving ? 'Đang tạo đề…' : 'Tạo đề 40 câu'}
                </button>
              </div>
              <small className="qb-builder-note">Lần chọn #{builderSeed} · câu hỏi được tái sử dụng từ ngân hàng, không nhân bản nội dung.</small>
            </section>

            <aside className="qb-builder-stock">
              <h3>Tồn kho phù hợp</h3>
              <div className="qb-builder-stock-grid">
                <article className={(builderStock.arrangement_5?.items || 0) >= 5 ? 'is-ok' : 'is-low'}><span>Arrangement</span><strong>{builderStock.arrangement_5?.items || 0}</strong><small>Cần 5 câu</small></article>
                <article className={(builderStock.discourse_cloze_5?.bundles || 0) >= 1 ? 'is-ok' : 'is-low'}><span>Discourse Cloze</span><strong>{builderStock.discourse_cloze_5?.bundles || 0}</strong><small>Cần 1 chùm</small></article>
                <article className={(builderStock.reading_10?.bundles || 0) >= 1 ? 'is-ok' : 'is-low'}><span>Reading 10</span><strong>{builderStock.reading_10?.bundles || 0}</strong><small>Cần 1 chùm</small></article>
                <article className={(builderStock.reading_8?.bundles || 0) >= 1 ? 'is-ok' : 'is-low'}><span>Reading 8</span><strong>{builderStock.reading_8?.bundles || 0}</strong><small>Cần 1 chùm</small></article>
                <article className={(builderStock.functional_cloze_6?.bundles || 0) >= 2 ? 'is-ok' : 'is-low'}><span>Functional Cloze</span><strong>{builderStock.functional_cloze_6?.bundles || 0}</strong><small>Cần 2 chùm</small></article>
              </div>
            </aside>
          </div>

          {builderSelection.missing.length ? (
            <div className="qb-builder-missing">
              <strong>Chưa đủ dữ liệu cho bộ lọc hiện tại</strong>
              {builderSelection.missing.map((item) => <span key={item.type + '-' + item.message}>• {item.message}</span>)}
              <small>Hãy bỏ bớt bộ lọc hoặc thêm câu/chùm bài tương ứng vào ngân hàng.</small>
            </div>
          ) : null}

          <section className="qb-builder-preview">
            <div className="qb-builder-preview-head">
              <div><span>LIVE BLUEPRINT</span><h3>Bản ráp đề hiện tại</h3></div>
              <div className={builderSelection.audit.ready ? 'qb-builder-pass' : 'qb-builder-check'}>
                <b>{builderSelection.audit.ready ? 'READY' : 'CHECK'}</b>
                <small>{builderSelection.audit.errors.length} lỗi · {builderSelection.audit.warnings.length} cảnh báo</small>
              </div>
            </div>

            <div className="qb-builder-blueprint">
              {builderSelection.audit.sections.map((section) => (
                <article key={'builder-' + section.key}>
                  <div><span>P{section.index}</span><strong>{section.label}</strong></div>
                  <p>{section.bundle?.title || (section.type === 'arrangement_5' ? '5 câu độc lập từ ngân hàng' : 'Chùm được chọn từ kho')}</p>
                  <small>Questions {section.start}–{section.end}</small>
                </article>
              ))}
            </div>

            <div className="qb-builder-metrics">
              <article><span>Nhận biết</span><strong>{builderSelection.audit.distributions.cognitive.recognition || 0}</strong></article>
              <article><span>Thông hiểu</span><strong>{builderSelection.audit.distributions.cognitive.comprehension || 0}</strong></article>
              <article><span>Vận dụng</span><strong>{builderSelection.audit.distributions.cognitive.application || 0}</strong></article>
              <article><span>Đáp án A/B/C/D</span><strong>{Object.values(builderSelection.audit.distributions.answers).join(' / ')}</strong></article>
            </div>

            {builderSelection.audit.warnings.length ? (
              <div className="qb-builder-warnings">
                {builderSelection.audit.warnings.slice(0, 5).map((warning) => <span key={warning}>⚠ {warning}</span>)}
              </div>
            ) : null}
          </section>
        </div>
      ) : null}

      {!loading && activeTab === 'tests' ? (
        <div className="qb-panel">
          {selectedTest ? (
            <div className="qb-exam-manager">
              <div className="qb-exam-manager-head">
                <button type="button" className="qb-back" onClick={() => { setSelectedTest(null); setSelectedTestItems([]); setShowExamAnswers(false); setEditingExam(false); setDeleteExamArmed(false); setExamFocusMode(false); setFocusedExamSection(''); setCollapsedExamSections({}); setCollapsedExamContexts({}); }}>← Danh sách đề</button>
                <div className="qb-exam-title">
                  <p>ASSESSMENT MANAGER</p>
                  <h2>{selectedTest.title}</h2>
                  <div className="qb-chips">
                    <span>{statusLabel(selectedTest.status)}</span>
                    {selectedTest.source_kind === 'chatgpt' ? <span className="is-chatgpt">ChatGPT</span> : null}
                    {selectedTest.settings?.examCode ? <span>Mã {selectedTest.settings.examCode}</span> : null}
                    <span>{selectedTest.grade ? `Khối ${selectedTest.grade}` : 'Chưa gắn khối'}</span>
                    {selectedTest.school_year ? <span>{selectedTest.school_year}</span> : null}
                  </div>
                </div>
                <div className="qb-exam-actions">
                  <button type="button" className={editingExam ? 'qb-secondary is-active' : 'qb-secondary'} onClick={() => { setEditingExam((value) => !value); setDeleteExamArmed(false); }}>
                    {editingExam ? 'Đóng chỉnh sửa' : 'Sửa thông tin'}
                  </button>
                  <button type="button" className={showExamAnswers ? 'qb-secondary is-active' : 'qb-secondary'} onClick={() => setShowExamAnswers((value) => !value)}>
                    {showExamAnswers ? 'Ẩn đáp án' : 'Hiện đáp án'}
                  </button>
                  <button type="button" className="qb-secondary" onClick={() => exportSelectedExam('word')} disabled={!selectedTestItems.length}>Xuất Word</button>
                  <button type="button" className="qb-secondary" onClick={() => exportSelectedExam('pdf')} disabled={!selectedTestItems.length}>Xuất PDF</button>
                  <button type="button" className="qb-secondary" onClick={() => createExamCopy({ variant: false })} disabled={Boolean(examActionBusy) || !selectedTestItems.length}>
                    {examActionBusy === 'duplicate' ? 'Đang nhân bản…' : 'Nhân bản'}
                  </button>
                  <button type="button" className="qb-secondary" onClick={() => createExamCopy({ variant: true })} disabled={Boolean(examActionBusy) || !selectedTestItems.length}>
                    {examActionBusy === 'variant' ? 'Đang tạo mã…' : 'Tạo 1 mã'}
                  </button>
                  <button type="button" className="qb-primary" onClick={() => createVariantBatch(4)} disabled={Boolean(examActionBusy) || !selectedTestItems.length}>
                    {examActionBusy === 'variant-batch' ? 'Đang tạo 4 mã…' : 'Tạo 4 mã đề'}
                  </button>
                  <button
                    type="button"
                    className={selectedExamAudit.ready ? 'qb-publish' : 'qb-publish is-blocked'}
                    onClick={publishSelectedExam}
                    disabled={Boolean(examActionBusy) || !selectedTestItems.length || !selectedExamAudit.ready || selectedTest.status === 'published'}
                    title={selectedExamAudit.ready ? 'Quality Audit đạt yêu cầu' : 'Cần sửa các lỗi bắt buộc trước khi phát hành'}
                  >
                    {examActionBusy === 'publish' ? 'Đang phát hành…' : selectedTest.status === 'published' ? 'Đã phát hành' : 'Kiểm tra & phát hành'}
                  </button>
                  <button type="button" className={deleteExamArmed ? 'qb-danger is-armed' : 'qb-danger'} onClick={deleteSelectedExam} disabled={Boolean(examActionBusy)}>
                    {examActionBusy === 'delete' ? 'Đang xóa…' : deleteExamArmed ? 'Xác nhận xóa đề' : 'Xóa đề'}
                  </button>
                </div>
              </div>

              {editingExam ? (
                <div className="qb-exam-edit">
                  <label className="qb-exam-edit-title"><span>Tên đề</span><input value={examEdit.title} onChange={(event) => setExamEdit({ ...examEdit, title: event.target.value })} /></label>
                  <label><span>Năm học</span><input value={examEdit.schoolYear} onChange={(event) => setExamEdit({ ...examEdit, schoolYear: event.target.value })} placeholder="2026-2027" /></label>
                  <label><span>Thời gian (phút)</span><input type="number" min="1" max="600" value={examEdit.durationMinutes} onChange={(event) => setExamEdit({ ...examEdit, durationMinutes: event.target.value })} /></label>
                  <label><span>Trạng thái</span>
                    <select value={examEdit.status} onChange={(event) => setExamEdit({ ...examEdit, status: event.target.value })}>
                      <option value="draft">Bản nháp</option>
                      <option value="published">Đã phát hành</option>
                      <option value="closed">Đã đóng</option>
                      <option value="archived">Lưu trữ</option>
                    </select>
                  </label>
                  <div className="qb-exam-edit-actions">
                    <button type="button" className="qb-primary" onClick={saveExamMetadata} disabled={examActionBusy === 'metadata'}>
                      {examActionBusy === 'metadata' ? 'Đang lưu…' : 'Lưu thay đổi'}
                    </button>
                    <button type="button" className="qb-ghost" onClick={() => {
                      setExamEdit({
                        title: text(selectedTest.title),
                        schoolYear: text(selectedTest.school_year),
                        durationMinutes: String(selectedTest.settings?.durationMinutes || 50),
                        status: text(selectedTest.status) || 'draft',
                      });
                      setEditingExam(false);
                    }}>Hủy</button>
                  </div>
                </div>
              ) : null}

              <div className="qb-exam-overview">
                <article><span>Tổng câu</span><strong>{selectedTestItems.length || testCounts[selectedTest.id] || 0}</strong></article>
                <article><span>Thời gian</span><strong>{selectedTest.settings?.durationMinutes || 50}'</strong></article>
                <article><span>Số block</span><strong>{selectedExamSections.length}</strong></article>
                <article><span>Quality Audit</span><strong className={selectedExamAudit.ready ? 'is-ready' : 'is-not-ready'}>{selectedExamAudit.ready ? 'Đạt' : `${selectedExamAudit.errors.length} lỗi`}</strong></article>
              </div>

              {selectedTestItems.length ? (
                <section className={selectedExamAudit.ready ? 'qb-quality-audit is-ready' : 'qb-quality-audit has-errors'}>
                  <div className="qb-quality-head">
                    <div>
                      <span>EXAM QUALITY AUDIT</span>
                      <h3>{selectedExamAudit.ready ? 'Đủ điều kiện phát hành' : 'Cần chỉnh trước khi phát hành'}</h3>
                      <p>Kiểm tra tự động cấu trúc TN THPT, phương án, đáp án, ngữ liệu, metadata và phân bố đáp án.</p>
                    </div>
                    <div className="qb-quality-badge">
                      <b>{selectedExamAudit.ready ? 'PASS' : 'CHECK'}</b>
                      <small>{selectedExamAudit.errors.length} lỗi · {selectedExamAudit.warnings.length} cảnh báo</small>
                    </div>
                  </div>

                  <div className="qb-quality-summary">
                    <article><span>Cấu trúc</span><strong>{selectedExamAudit.structureOk ? 'Đúng form' : 'Chưa đúng'}</strong><small>{selectedExamAudit.totalQuestions} câu · {selectedExamAudit.totalSections} block</small></article>
                    <article><span>Giải thích</span><strong>{selectedExamAudit.counts.missingExplanation ? `Thiếu ${selectedExamAudit.counts.missingExplanation}` : 'Đủ'}</strong><small>Không chặn phát hành</small></article>
                    <article><span>Metadata</span><strong>{selectedExamAudit.counts.missingMetadata ? `Thiếu ${selectedExamAudit.counts.missingMetadata}` : 'Đủ'}</strong><small>CEFR · nhận thức · độ khó · chủ đề</small></article>
                    <article><span>Trùng câu</span><strong>{selectedExamAudit.counts.duplicateItems || 0}</strong><small>Trong cùng đề</small></article>
                  </div>

                  <div className="qb-quality-columns">
                    <div className="qb-quality-distribution">
                      <div className="qb-quality-subhead"><strong>Phân bố đáp án</strong><span>A–D</span></div>
                      {Object.entries(selectedExamAudit.distributions.answers).map(([answer, count]) => {
                        const percent = selectedExamAudit.totalQuestions ? Math.round((count / selectedExamAudit.totalQuestions) * 100) : 0;
                        return <div className="qb-quality-row" key={answer}>
                          <b>{answer}</b>
                          <div><i style={{ width: `${percent}%` }} /></div>
                          <span>{count} · {percent}%</span>
                        </div>;
                      })}
                    </div>
                    <div className="qb-quality-distribution">
                      <div className="qb-quality-subhead"><strong>Mức nhận thức</strong><span>Toàn đề</span></div>
                      {Object.entries(selectedExamAudit.distributions.cognitive).map(([level, count]) => {
                        const percent = selectedExamAudit.totalQuestions ? Math.round((count / selectedExamAudit.totalQuestions) * 100) : 0;
                        return <div className="qb-quality-row" key={level}>
                          <b>{cognitiveLabel(level)}</b>
                          <div><i style={{ width: `${percent}%` }} /></div>
                          <span>{count} · {percent}%</span>
                        </div>;
                      })}
                    </div>
                  </div>

                  {selectedExamAudit.errors.length || selectedExamAudit.warnings.length ? (
                    <div className="qb-quality-messages">
                      {selectedExamAudit.errors.length ? <div className="is-error"><b>Lỗi bắt buộc</b>{selectedExamAudit.errors.map((item) => <span key={item}>• {item}</span>)}</div> : null}
                      {selectedExamAudit.warnings.length ? <div className="is-warning"><b>Cảnh báo</b>{selectedExamAudit.warnings.map((item) => <span key={item}>• {item}</span>)}</div> : null}
                    </div>
                  ) : (
                    <div className="qb-quality-clean">Không phát hiện lỗi cấu trúc hoặc dữ liệu bắt buộc.</div>
                  )}
                </section>
              ) : null}

              {showExamAnswers && selectedTestItems.length ? (
                <div className="qb-answer-key">
                  <div className="qb-answer-key-head">
                    <div><span>ANSWER KEY</span><strong>Đáp án nhanh</strong></div>
                    <small>{selectedTestItems.length} câu · tự cập nhật theo mã đề hiện tại</small>
                  </div>
                  <div className="qb-answer-key-grid">
                    {selectedTestItems.map((item) => (
                      <span key={`key-${item.position}-${item.id}`}><b>{item.position}</b>{effectiveAnswer(item)}</span>
                    ))}
                  </div>
                </div>
              ) : null}

              {examDetailLoading ? <div className="qb-loading">Đang mở đầy đủ đề thi…</div> : null}

              {!examDetailLoading && selectedExamSections.length ? (
                <>
                  <nav className="qb-exam-navigator" aria-label="Điều hướng các phần của đề">
                    <div className="qb-exam-nav-scroll">
                      {selectedExamSections.map((section) => {
                        const active = examFocusMode
                          ? (focusedExamSection || selectedExamSections[0]?.key) === section.key
                          : false;
                        return (
                          <button
                            type="button"
                            key={`nav-${section.key}`}
                            className={active ? 'is-active' : ''}
                            onClick={() => jumpToExamSection(section.key)}
                          >
                            <b>P{section.index}</b>
                            <span>{section.label.replace(/ · \d+ câu$/, '')}</span>
                            <small>{section.start}–{section.end}</small>
                          </button>
                        );
                      })}
                    </div>
                    <div className="qb-exam-nav-tools">
                      <button
                        type="button"
                        className={examFocusMode ? 'is-active' : ''}
                        onClick={() => {
                          const next = !examFocusMode;
                          setExamFocusMode(next);
                          if (next && !focusedExamSection) setFocusedExamSection(selectedExamSections[0]?.key || '');
                        }}
                      >
                        {examFocusMode ? 'Hiện toàn đề' : 'Tập trung 1 phần'}
                      </button>
                      {!examFocusMode ? <button type="button" onClick={() => toggleAllExamSections(true)}>Thu gọn tất cả</button> : null}
                      {!examFocusMode ? <button type="button" onClick={() => toggleAllExamSections(false)}>Mở tất cả</button> : null}
                    </div>
                  </nav>

                  <div className={examFocusMode ? 'qb-exam-sections is-focus-mode' : 'qb-exam-sections'}>
                    {visibleExamSections.map((section) => {
                      const sectionCollapsed = Boolean(collapsedExamSections[section.key]);
                      const contextCollapsed = collapsedExamContexts[section.key] !== false;
                      return (
                        <section
                          className={sectionCollapsed ? 'qb-exam-section is-collapsed' : 'qb-exam-section'}
                          key={section.key}
                          id={`qb-exam-section-${section.key}`}
                        >
                          <header>
                            <div>
                              <span>PART {section.index}</span>
                              <h3>{section.label}</h3>
                            </div>
                            <div className="qb-exam-section-tools">
                              <b>Questions {section.start}–{section.end}</b>
                              {section.context ? (
                                <button
                                  type="button"
                                  onClick={() => setCollapsedExamContexts((current) => ({ ...current, [section.key]: !contextCollapsed }))}
                                >
                                  {contextCollapsed ? 'Mở ngữ liệu' : 'Thu ngữ liệu'}
                                </button>
                              ) : null}
                              <button
                                type="button"
                                onClick={() => setCollapsedExamSections((current) => ({ ...current, [section.key]: !sectionCollapsed }))}
                              >
                                {sectionCollapsed ? 'Mở phần' : 'Thu phần'}
                              </button>
                            </div>
                          </header>

                          {!sectionCollapsed ? (
                            <>
                              {section.context ? (
                                <div className={contextCollapsed ? 'qb-exam-context is-collapsed' : 'qb-exam-context'}>
                                  <div className="qb-exam-context-head">
                                    <span>SHARED TEXT / INSTRUCTIONS</span>
                                    <small>{section.context.length.toLocaleString('vi-VN')} ký tự</small>
                                  </div>
                                  {contextCollapsed
                                    ? <p>{compact(section.context, 260)}</p>
                                    : <div>{section.context}</div>}
                                </div>
                              ) : null}

                              <div className="qb-exam-question-list">
                                {section.items.map((item) => {
                                  const stemParts = splitExamStem(item.stem, item.position);
                                  const options = visibleOptions(item);
                                  return (
                                    <article className="qb-exam-question" key={`${selectedTest.id}-${item.id}-${item.position}`}>
                                      <div className="qb-exam-qnum">{String(item.position).padStart(2, '0')}</div>
                                      <div className="qb-exam-qbody">
                                        <strong>{stemParts.question || displayQuestionStem(item.stem, item.bundle_position)}</strong>
                                        {options.length ? (
                                          <div className="qb-exam-options">
                                            {options.map((option, optionIndex) => (
                                              <span key={`${item.id}-${option.sourceIndex}`}>
                                                <b>{String.fromCharCode(65 + optionIndex)}.</b> {option.text}
                                              </span>
                                            ))}
                                          </div>
                                        ) : null}
                                        <div className="qb-card-meta qb-exam-meta">
                                          {item.cefr ? <span>{item.cefr}</span> : null}
                                          {item.cognitive_level ? <span>{cognitiveLabel(item.cognitive_level)}</span> : null}
                                          {item.difficulty ? <span>Độ khó {item.difficulty}/5</span> : null}
                                          {item.topic ? <span>{item.topic}</span> : null}
                                          {item.grammar_point ? <span>{item.grammar_point}</span> : null}
                                        </div>
                                        {showExamAnswers ? (
                                          <div className="qb-exam-answer">
                                            <div><b>Đáp án {effectiveAnswer(item)}</b>{item.explanation ? <span>{item.explanation}</span> : null}</div>
                                          </div>
                                        ) : null}
                                      </div>
                                    </article>
                                  );
                                })}
                              </div>
                            </>
                          ) : null}
                        </section>
                      );
                    })}
                  </div>
                </>
              ) : null}

              {!examDetailLoading && !selectedTestItems.length ? (
                <EmptyState title="Đề chưa có câu hỏi" hint="Brian không tìm thấy liên kết câu hỏi cho đề này." />
              ) : null}
            </div>
          ) : (
            <>
              <div className="qb-section-head"><div><p>ASSESSMENT LIBRARY</p><h2>Đề thi</h2></div><span>Bấm vào một đề để mở toàn bộ nội dung, đáp án, metadata và công cụ xuất đề.</span></div>
              {tests.length ? <div className="qb-grid">{tests.map((test) => (
                <article
                  className="qb-test-card is-clickable"
                  key={test.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => openExam(test)}
                  onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') openExam(test); }}
                >
                  <div className="qb-test-icon">EXAM</div>
                  <div>
                    <div className="qb-chips"><span>{statusLabel(test.status)}</span>{test.source_kind === 'chatgpt' ? <span className="is-chatgpt">ChatGPT</span> : null}{test.settings?.examCode ? <span>Mã {test.settings.examCode}</span> : null}</div>
                    <h3>{test.title}</h3>
                    <p>{testCounts[test.id] || 0} câu hỏi · {test.grade ? `Khối ${test.grade}` : 'Chưa gắn khối'}{test.school_year ? ` · ${test.school_year}` : ''}</p>
                    <small>Mở đề →</small>
                  </div>
                </article>
              ))}</div> : <EmptyState title="Chưa có đề thi" hint="Sau khi ChatGPT soạn đề, dùng lệnh “lưu vào Ngân hàng câu hỏi Brian” để đề xuất hiện tại đây." />}
            </>
          )}
        </div>
      ) : null}

      {activeTab === 'import' ? (
        <div className="qb-panel qb-paste-import">
          <div className="qb-section-head">
            <div><p>ZERO-COST IMPORT</p><h2>Nhập từ ChatGPT</h2></div>
            <span>Không gọi OpenAI API · không phát sinh phí AI · dữ liệu được phân tích ngay trong trình duyệt.</span>
          </div>

          <div className="qb-paste-layout">
            <section className="qb-paste-editor">
              <div className="qb-paste-banner">
                <div><b>1</b><span><strong>Copy nội dung từ ChatGPT</strong><small>Có thể copy nguyên đề, nhóm câu hỏi hoặc JSON.</small></span></div>
                <div><b>2</b><span><strong>Dán vào Brian</strong><small>Brian tự nhận diện câu, A–D, đáp án, giải thích và ngữ liệu chung.</small></span></div>
                <div><b>3</b><span><strong>Kiểm tra rồi lưu</strong><small>Câu trùng được tái sử dụng, không nhân bản.</small></span></div>
              </div>

              <label className="qb-paste-textarea">
                <span>Nội dung từ ChatGPT</span>
                <textarea
                  rows="16"
                  value={pasteText}
                  onChange={(event) => { setPasteText(event.target.value); setPastePreview(null); setPasteResult(null); }}
                  placeholder={"Dán nguyên nội dung ở đây…\n\nQuestion 1. ...\nA. ...\nB. ...\nC. ...\nD. ...\nAnswer: B"}
                />
              </label>
              <div className="qb-paste-actions">
                <button type="button" className="qb-secondary" onClick={pasteFromClipboard}>Dán từ clipboard</button>
                <button type="button" className="qb-primary" onClick={analyzePaste} disabled={!pasteText.trim()}>Phân tích nội dung</button>
                {pasteText ? <button type="button" className="qb-ghost" onClick={() => { setPasteText(''); setPastePreview(null); setPasteResult(null); }}>Xóa</button> : null}
              </div>
            </section>

            <aside className="qb-paste-settings">
              <h3>Thông tin chung</h3>
              <label><span>Tên đề / nhóm câu hỏi</span><input value={pasteMeta.title} onChange={(e) => setPasteMeta({ ...pasteMeta, title: e.target.value })} placeholder="VD: Relative Clauses Practice 01" /></label>
              <div className="qb-paste-setting-grid">
                <label><span>Khối</span><select value={pasteMeta.grade} onChange={(e) => setPasteMeta({ ...pasteMeta, grade: e.target.value })}><option>10</option><option>11</option><option>12</option></select></label>
                <label><span>CEFR</span><select value={pasteMeta.cefr} onChange={(e) => setPasteMeta({ ...pasteMeta, cefr: e.target.value })}><option>A2</option><option>B1</option><option>B2</option><option>C1</option></select></label>
                <label><span>Năm học</span><input value={pasteMeta.schoolYear} onChange={(e) => setPasteMeta({ ...pasteMeta, schoolYear: e.target.value })} /></label>
                <label><span>Độ khó</span><select value={pasteMeta.difficulty} onChange={(e) => setPasteMeta({ ...pasteMeta, difficulty: e.target.value })}><option value="1">1 · Rất dễ</option><option value="2">2 · Dễ</option><option value="3">3 · Vừa</option><option value="4">4 · Khó</option><option value="5">5 · Rất khó</option></select></label>
              </div>
              <label><span>Kỹ năng</span><input value={pasteMeta.skill} onChange={(e) => setPasteMeta({ ...pasteMeta, skill: e.target.value })} /></label>
              <label><span>Chủ đề mặc định</span><input value={pasteMeta.topic} onChange={(e) => setPasteMeta({ ...pasteMeta, topic: e.target.value })} placeholder="Nếu ChatGPT chưa ghi metadata" /></label>
              <label><span>Mức nhận thức mặc định</span><select value={pasteMeta.cognitiveLevel} onChange={(e) => setPasteMeta({ ...pasteMeta, cognitiveLevel: e.target.value })}><option value="recognition">Nhận biết</option><option value="comprehension">Thông hiểu</option><option value="application">Vận dụng</option></select></label>
              <label className="qb-check"><input type="checkbox" checked={pasteMeta.saveAsExam} onChange={(e) => setPasteMeta({ ...pasteMeta, saveAsExam: e.target.checked })} /><span>Lưu đồng thời thành Đề thi</span></label>
              <label className="qb-check"><input type="checkbox" checked={pasteMeta.keepBundle} onChange={(e) => setPasteMeta({ ...pasteMeta, keepBundle: e.target.checked })} /><span>Giữ ngữ liệu chung thành Chùm bài</span></label>
            </aside>
          </div>

          {pastePreview ? (
            <section className="qb-paste-preview">
              <div className="qb-preview-summary">
                <article><span>Câu hỏi</span><strong>{pastePreview.questions.length}</strong></article>
                <article><span>Có đáp án</span><strong>{pastePreview.questions.filter((item) => item.correctAnswer).length}</strong></article>
                <article><span>Chùm bài</span><strong>{pastePreview.bundle ? '1' : '0'}</strong></article>
                <article><span>Định dạng</span><strong>{pastePreview.format.toUpperCase()}</strong></article>
              </div>
              {pastePreview.warnings?.length ? <div className="qb-paste-warnings">{pastePreview.warnings.map((warning) => <span key={warning}>⚠ {warning}</span>)}</div> : null}
              {pastePreview.bundle ? (
                <div className="qb-detected-bundle">
                  <span>NGỮ LIỆU CHUNG ĐƯỢC PHÁT HIỆN</span>
                  <strong>{pastePreview.bundle.title}</strong>
                  <p>{compact(pastePreview.bundle.contextText, 700)}</p>
                </div>
              ) : null}
              <div className="qb-preview-list">
                {pastePreview.questions.slice(0, 20).map((item, index) => (
                  <article key={`${item.number}-${index}`}>
                    <b>{item.number || index + 1}</b>
                    <div>
                      <strong>{compact(item.stem, 320)}</strong>
                      {item.options?.length ? <p>{item.options.map((option, optionIndex) => `${String.fromCharCode(65 + optionIndex)}. ${compact(option, 90)}`).join(' · ')}</p> : null}
                    </div>
                    <em className={item.correctAnswer ? 'has-answer' : ''}>{item.correctAnswer || '—'}</em>
                  </article>
                ))}
              </div>
              {pastePreview.questions.length > 20 ? <p className="qb-muted">Đang hiển thị 20/{pastePreview.questions.length} câu để xem nhanh.</p> : null}
              <div className="qb-paste-savebar">
                <div><strong>Sẵn sàng lưu</strong><span>Câu trùng sẽ không được tạo thêm.</span></div>
                <button type="button" className="qb-primary" onClick={savePasteImport} disabled={pasteSaving || !pastePreview.questions.length}>{pasteSaving ? 'Đang lưu…' : `Lưu ${pastePreview.questions.length} câu vào Brian`}</button>
              </div>
              {pasteResult ? (
                <div className="qb-paste-success">
                  <b>✓ Đã nhập thành công</b>
                  <span>{pasteResult.imported} câu mới · {pasteResult.reused} câu trùng được tái sử dụng{pasteResult.testId ? ' · đã tạo đề thi' : ''}</span>
                  <div><button type="button" onClick={() => setActiveTab('questions')}>Xem Kho câu hỏi</button>{pasteResult.testId ? <button type="button" onClick={() => setActiveTab('tests')}>Xem Đề thi</button> : null}</div>
                </div>
              ) : null}
            </section>
          ) : null}
        </div>
      ) : null}

      {!loading && activeTab === 'chatgpt' ? (
        <div className="qb-panel qb-connect">
          <div className="qb-connect-main">
            <div className="qb-section-head"><div><p>ADVANCED CONNECTOR</p><h2>API / Plugin</h2></div><span className={integration?.active ? 'qb-live' : 'qb-offline'}>{integration?.active ? '● API Brian sẵn sàng' : '○ Chưa tạo khóa API'}</span></div>
            <div className="qb-free-recommendation"><strong>Khuyến nghị cho ChatGPT Plus</strong><span>Dùng thẻ “Nhập từ ChatGPT” — không cần GPT Builder, không cần API OpenAI và không phát sinh phí AI.</span></div>
            <div className="qb-connect-steps">
              <article><b>1</b><div><strong>Tạo khóa Brian</strong><p>Khóa riêng cho Ngân hàng câu hỏi. Brian chỉ lưu SHA-256 hash, không lưu khóa gốc.</p></div></article>
              <article><b>2</b><div><strong>GPT Action (tùy chọn)</strong><p>Chỉ dùng nếu tài khoản của anh vẫn có quyền Edit một GPT cũ; nếu không, bỏ qua bước này.</p></div></article>
              <article><b>3</b><div><strong>Sẵn sàng cho Plugin</strong><p>Backend 4 action được giữ lại để tái sử dụng khi Brian được đóng gói thành Plugin/App sau này.</p></div></article>
            </div>

            <div className="qb-action-grid" aria-label="Các ChatGPT action của Brian">
              <span><b>saveBrianExam</b><small>Lưu đề hoàn chỉnh</small></span>
              <span><b>saveBrianQuestions</b><small>Lưu câu hỏi / chùm bài</small></span>
              <span><b>searchBrianQuestions</b><small>Tìm câu đã có</small></span>
              <span><b>getBrianExam</b><small>Mở lại đề</small></span>
            </div>

            <div className="qb-connect-box">
              <label><span>OpenAPI URL</span><div className="qb-copy-row"><input readOnly value={openApiUrl} /><button type="button" onClick={() => copyValue(openApiUrl, 'Đã sao chép OpenAPI URL.')}>Sao chép</button></div></label>
              {generatedKey ? <label><span>Khóa kết nối — chỉ hiển thị trong phiên này</span><div className="qb-copy-row"><input readOnly value={generatedKey} /><button type="button" onClick={() => copyValue(generatedKey, 'Đã sao chép khóa kết nối.')}>Sao chép</button></div><small>Dán khóa này vào Authentication của Action. Brian không thể hiện lại khóa sau khi anh rời trang; nếu mất khóa, hãy tạo khóa mới.</small></label> : null}
              <label><span>Instructions cho GPT</span><div className="qb-instruction-box"><textarea readOnly rows="11" value={gptInstructionText} /><button type="button" onClick={() => copyValue(gptInstructionText, 'Đã sao chép Instructions cho GPT.')}>Sao chép Instructions</button></div></label>
              <div className="qb-connect-actions">
                <button type="button" className="qb-primary" onClick={createChatGptKey}>{integration?.active ? 'Tạo khóa mới' : 'Tạo khóa kết nối'}</button>
                {generatedKey ? <button type="button" className="qb-secondary" onClick={testConnection} disabled={testingConnection}>{testingConnection ? 'Đang kiểm tra…' : 'Kiểm tra kết nối'}</button> : null}
                {integration?.active ? <button type="button" className={disconnectArmed ? 'qb-danger is-armed' : 'qb-danger'} onClick={disconnect}>Ngắt kết nối</button> : null}
              </div>
            </div>

            <div className="qb-prompt">
              <span>Cách dùng sau khi kết nối</span>
              <blockquote>“Soạn cho tôi đề này theo yêu cầu. Khi hoàn tất, tự lưu bản đầy đủ vào Brian Question Bank.”</blockquote>
              <small>ChatGPT có thể vẫn yêu cầu xác nhận trước một write action tùy cài đặt quyền của tài khoản.</small>
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
