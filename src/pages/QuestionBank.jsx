import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '../utils/supabase.js';
import { parseQuestionBankPaste } from '../utils/questionBankPasteParser.js';
import {
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
  const map = { draft: 'Bản nháp', approved: 'Đã duyệt', review: 'Chờ duyệt', archived: 'Lưu trữ' };
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
  const [selectedTest, setSelectedTest] = useState(null);
  const [selectedTestItems, setSelectedTestItems] = useState([]);
  const [examDetailLoading, setExamDetailLoading] = useState(false);
  const [showExamAnswers, setShowExamAnswers] = useState(false);
  const [examActionBusy, setExamActionBusy] = useState('');
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
    chatgpt: questions.filter((item) => text(item.source_kind).startsWith('chatgpt')).length,
    bundles: bundles.length,
    tests: tests.length,
    total: questions.length,
  }), [questions, bundles, tests]);

  const selectedExamSections = useMemo(
    () => buildExamSections(selectedTestItems),
    [selectedTestItems],
  );

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
          blueprint_id: null,
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
