import React, { useMemo, useRef, useState } from 'react';
import { runAITask } from '../utils/aiTaskRuntime.js';
import { addHistoryEntry, downloadFile } from '../utils/library.js';
import { supabase } from '../utils/supabase.js';
import {
  DEFAULT_CURRICULUM_PROFILE,
  DIGITAL_COMPETENCE_FRAMEWORK,
  buildAnnualLessonPrompt,
  buildEnglishCorrectionPrompt,
  buildCurriculumExtractionPrompt,
  classifyReferenceName,
  downloadCombinedWord,
  downloadLessonZip,
  exportCurriculumProject,
  loadCurriculumDraft,
  parseCurriculumJson,
  parseCurriculumLocally,
  saveCurriculumDraft,
  stripForbiddenSeparators,
  uid,
  validateCurriculum,
  validateEnglishLessonOutput,
} from '../utils/lessonArchitectCurriculum.js';

const EMPTY_ROW = () => ({
  id: uid('row'),
  order: 1,
  periodStart: 1,
  periodEnd: 1,
  periods: 1,
  title: '',
  theme: '',
  lessonType: '',
  skillFocus: '',
  languageFocus: '',
  digitalCompetences: '',
  requirements: '',
  equipment: '',
  selected: true,
});

function readJsonFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      try { resolve(JSON.parse(String(reader.result || '{}'))); }
      catch (error) { reject(error); }
    };
    reader.onerror = () => reject(reader.error || new Error('Không đọc được file JSON.'));
    reader.readAsText(file, 'utf-8');
  });
}

function periodLabel(row) {
  const start = Number(row.periodStart) || 1;
  const end = Number(row.periodEnd) || start;
  return start === end ? String(start) : `${start}–${end}`;
}

function statusLabel(status) {
  if (status === 'done') return 'Đã soạn';
  if (status === 'running') return 'Đang soạn';
  if (status === 'error') return 'Lỗi';
  return 'Chưa soạn';
}

export default function LessonArchitectCurriculumBuilder({ language = 'vi', hasApiKey, aiModel, currentUser, readTextFile, onExit }) {
  const isVi = language === 'vi';
  const [profile, setProfile] = useState(() => ({ ...DEFAULT_CURRICULUM_PROFILE, teacher: currentUser?.fullName || currentUser?.name || '' }));
  const [curriculumText, setCurriculumText] = useState('');
  const [textbookText, setTextbookText] = useState('');
  const [curriculumFile, setCurriculumFile] = useState(null);
  const [textbookFile, setTextbookFile] = useState(null);
  const [rows, setRows] = useState([]);
  const [lessons, setLessons] = useState({});
  const [lessonStatus, setLessonStatus] = useState({});
  const [activeLessonId, setActiveLessonId] = useState('');
  const [extraRequirements, setExtraRequirements] = useState('');
  const [sourceStatus, setSourceStatus] = useState({ curriculum: '', textbook: '' });
  const [extractingKind, setExtractingKind] = useState('');
  const [analysing, setAnalysing] = useState(false);
  const [batchRunning, setBatchRunning] = useState(false);
  const [batchProgress, setBatchProgress] = useState({ current: 0, total: 0, label: '' });
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');
  const [step, setStep] = useState(1);
  const stopRef = useRef(false);

  const ownerId = currentUser?.id || currentUser?.email || 'guest';
  const validation = useMemo(() => validateCurriculum(profile, rows), [profile, rows]);
  const generatedCount = useMemo(() => rows.filter((row) => lessons[row.id]).length, [rows, lessons]);
  const selectedRows = useMemo(() => rows.filter((row) => row.selected), [rows]);
  const activeRow = rows.find((row) => row.id === activeLessonId) || rows.find((row) => lessons[row.id]) || rows[0];
  const activeOutput = activeRow ? lessons[activeRow.id] || '' : '';

  const notify = (message) => {
    setToast(message);
    window.setTimeout(() => setToast(''), 2600);
  };

  const patchProfile = (key, value) => setProfile((previous) => ({ ...previous, [key]: value }));

  const applyEnglishGlobalSuccessPreset = () => {
    setProfile((previous) => ({
      ...previous,
      ...DEFAULT_CURRICULUM_PROFILE,
      teacher: previous.teacher || currentUser?.fullName || currentUser?.name || '',
    }));
    notify('Đã nạp cấu hình Tiếng Anh 11 – Global Success. Tài liệu xuất sẽ hoàn toàn bằng tiếng Anh và tích hợp năng lực số theo Thông tư 02/2025/TT-BGDĐT.');
  };

  const readLocalReference = async (kind, file) => {
    if (!file) return;
    setExtractingKind(kind);
    setError('');
    try {
      const text = await readTextFile(file, {
        form: { lessonTitle: '', unit: '', query: kind === 'curriculum' ? 'Kế hoạch giáo dục' : `${profile.subject} ${profile.grade}` },
        pdfPageRange: '',
        pdfFocus: '',
        pdfFocusEnabled: false,
        pdfMode: 'smart',
      });
      if (kind === 'curriculum') {
        setCurriculumText(text);
        setCurriculumFile(file);
      } else {
        setTextbookText(text);
        setTextbookFile(file);
      }
      setSourceStatus((previous) => ({ ...previous, [kind]: `Đã đọc ${file.name} · ${text.length.toLocaleString('vi-VN')} ký tự` }));
      notify(kind === 'curriculum' ? 'Đã đọc Kế hoạch giáo dục.' : 'Đã đọc Sách giáo khoa.');
    } catch (readError) {
      setError(readError.message || String(readError));
    } finally {
      setExtractingKind('');
    }
  };

  const loadDriveReference = async (kind) => {
    const url = kind === 'curriculum' ? profile.curriculumUrl : profile.textbookUrl;
    if (!url.trim()) {
      setError('Hãy nhập liên kết Google Drive trước.');
      return;
    }
    setExtractingKind(kind);
    setError('');
    try {
      const sessionResult = supabase ? await supabase.auth.getSession() : { data: { session: null } };
      const token = sessionResult?.data?.session?.access_token || '';
      const response = await fetch('/api/public-reference-text', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ url }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || !payload.ok) throw new Error(payload.error || 'Không đọc được liên kết Google Drive. Hãy tải file về máy rồi tải lên ứng dụng.');
      const detected = classifyReferenceName(payload.filename);
      if (detected !== 'unknown' && detected !== kind) {
        setSourceStatus((previous) => ({
          ...previous,
          [kind]: `Cảnh báo: file “${payload.filename}” có vẻ là ${detected === 'curriculum' ? 'KHGD' : 'SGK'}, không đúng ô đang chọn.`,
        }));
      } else {
        setSourceStatus((previous) => ({ ...previous, [kind]: `Đã đọc ${payload.filename} · ${Number(payload.charCount || payload.text?.length || 0).toLocaleString('vi-VN')} ký tự` }));
      }
      if (kind === 'curriculum') setCurriculumText(payload.text || '');
      else setTextbookText(payload.text || '');
      notify('Đã tải và trích xuất nội dung từ Google Drive.');
    } catch (loadError) {
      setError(loadError.message || String(loadError));
    } finally {
      setExtractingKind('');
    }
  };

  const swapReferences = () => {
    setProfile((previous) => ({ ...previous, curriculumUrl: previous.textbookUrl, textbookUrl: previous.curriculumUrl }));
    setCurriculumText(textbookText);
    setTextbookText(curriculumText);
    setCurriculumFile(textbookFile);
    setTextbookFile(curriculumFile);
    setSourceStatus({ curriculum: 'Đã hoán đổi nguồn.', textbook: 'Đã hoán đổi nguồn.' });
  };

  const extractCurriculum = async () => {
    setError('');
    if (!curriculumText.trim()) {
      setError('Hãy đọc file hoặc dán nội dung Kế hoạch giáo dục trước.');
      return;
    }
    if (!hasApiKey) {
      const localRows = parseCurriculumLocally(curriculumText);
      if (!localRows.length) {
        setError('Không có AI provider và bộ phân tích cục bộ chưa nhận diện được bảng KHGD.');
        return;
      }
      setRows(localRows);
      setStep(3);
      notify(`Đã nhận diện cục bộ ${localRows.length} dòng. Hãy kiểm tra và chỉnh sửa.`);
      return;
    }
    setAnalysing(true);
    try {
      const prompt = buildCurriculumExtractionPrompt({ profile, curriculumText });
      const raw = await runAITask('lesson.curriculumExtract', {
        prompt,
        model: aiModel,
        systemInstruction: 'Extract the Grade 11 English curriculum sequence accurately and return valid JSON only. Preserve official Global Success lesson names.',
        temperature: 0.05,
        governanceProfile: 'lessonArchitect',
        maxOutputTokens: 4800,
        fallback: true,
      });
      const parsed = parseCurriculumJson(raw);
      setRows(parsed.rows);
      setProfile((previous) => ({
        ...previous,
        totalPeriods: parsed.summary.totalPeriods || previous.totalPeriods,
        weeks: parsed.summary.weeks || previous.weeks,
        semester1Periods: parsed.summary.semester1Periods || previous.semester1Periods,
        semester2Periods: parsed.summary.semester2Periods || previous.semester2Periods,
      }));
      setStep(3);
      notify(`Đã trích xuất ${parsed.rows.length} bài dạy từ KHGD.`);
    } catch (analysisError) {
      setError(analysisError.message || String(analysisError));
    } finally {
      setAnalysing(false);
    }
  };

  const updateRow = (id, key, value) => {
    setRows((previous) => previous.map((row) => {
      if (row.id !== id) return row;
      const next = { ...row, [key]: value };
      if (key === 'periodStart' || key === 'periodEnd') {
        const start = Number(key === 'periodStart' ? value : next.periodStart) || 1;
        const end = Number(key === 'periodEnd' ? value : next.periodEnd) || start;
        next.periods = Math.max(1, Math.abs(end - start) + 1);
      }
      return next;
    }));
  };

  const addRow = () => {
    const last = rows.at(-1);
    const start = last ? Number(last.periodEnd) + 1 : 1;
    const row = { ...EMPTY_ROW(), order: rows.length + 1, periodStart: start, periodEnd: start };
    setRows((previous) => [...previous, row]);
  };

  const removeRow = (id) => {
    setRows((previous) => previous.filter((row) => row.id !== id).map((row, index) => ({ ...row, order: index + 1 })));
    setLessons((previous) => { const next = { ...previous }; delete next[id]; return next; });
  };

  const generateLesson = async (row, { silent = false } = {}) => {
    if (!hasApiKey) throw new Error('Cần cấu hình AI provider để soạn giáo án.');
    if (!row?.title?.trim()) throw new Error('Tên bài đang để trống.');
    setLessonStatus((previous) => ({ ...previous, [row.id]: 'running' }));
    setActiveLessonId(row.id);
    try {
      const prompt = buildAnnualLessonPrompt({ profile, row, curriculumText, textbookText, extraRequirements });
      let result = await runAITask('lesson.curriculumBuild', {
        prompt,
        model: aiModel,
        systemInstruction: 'Write a complete Grade 11 English lesson plan in English only. Follow the Global Success textbook, Official Dispatch 5512 and the learner digital competence framework in Circular No. 02/2025/TT-BGDĐT. Never use Vietnamese instructional headings.',
        temperature: 0.24,
        governanceProfile: 'lessonArchitect',
        maxOutputTokens: 8192,
        fallback: true,
      });
      let quality = validateEnglishLessonOutput(result);
      if (!quality.ok) {
        result = await runAITask('lesson.cleanEnglish', {
          prompt: buildEnglishCorrectionPrompt(result, quality),
          model: aiModel,
          systemInstruction: 'Revise the document into an English-only lesson plan with complete headings and visible, evidence-based digital competence integration.',
          temperature: 0.12,
          governanceProfile: 'lessonArchitect',
          maxOutputTokens: 8192,
          fallback: true,
        });
        quality = validateEnglishLessonOutput(result);
      }
      if (!quality.ok) {
        throw new Error(`English-output validation failed. Missing: ${quality.missing.join(', ') || 'none'}; Vietnamese markers: ${quality.vietnamese.join(', ') || 'none'}; digital competence codes: ${quality.digitalCodeCount}.`);
      }
      const clean = stripForbiddenSeparators(result);
      setLessons((previous) => ({ ...previous, [row.id]: clean }));
      setLessonStatus((previous) => ({ ...previous, [row.id]: 'done' }));
      addHistoryEntry({
        kind: 'annual-lesson-plan-5512',
        toolSlug: 'lesson-plan-ai',
        toolTitle: 'Lesson Architect',
        title: `${row.title} · Tiết ${periodLabel(row)}`,
        content: clean,
        level: `${profile.subject} ${profile.grade}`,
        itemCount: Number(row.periods) || 1,
        tags: ['lesson-plan', '5512', 'english-only', 'global-success', 'digital-competence', 'circular-02-2025', profile.grade, profile.schoolYear],
        model: aiModel,
      });
      if (!silent) notify(`Đã soạn ${row.title}.`);
      return clean;
    } catch (generationError) {
      setLessonStatus((previous) => ({ ...previous, [row.id]: 'error' }));
      throw generationError;
    }
  };

  const runBatch = async (mode = 'selected') => {
    setError('');
    if (!hasApiKey) {
      setError('Cần cấu hình AI provider trước khi soạn hàng loạt.');
      return;
    }
    const candidates = (mode === 'missing' ? rows.filter((row) => !lessons[row.id]) : selectedRows).filter((row) => row.title.trim());
    if (!candidates.length) {
      setError('Không có bài nào trong phạm vi được chọn.');
      return;
    }
    setBatchRunning(true);
    stopRef.current = false;
    setStep(4);
    let completed = 0;
    for (const row of candidates) {
      if (stopRef.current) break;
      setBatchProgress({ current: completed + 1, total: candidates.length, label: row.title });
      try {
        await generateLesson(row, { silent: true });
      } catch (generationError) {
        setError(`Lỗi tại ${row.title}: ${generationError.message || generationError}`);
      }
      completed += 1;
      await new Promise((resolve) => window.setTimeout(resolve, 450));
    }
    setBatchRunning(false);
    setBatchProgress((previous) => ({ ...previous, current: completed }));
    notify(stopRef.current ? 'Đã dừng hàng đợi. Kết quả đã soạn được giữ lại.' : `Đã hoàn tất ${completed}/${candidates.length} bài.`);
  };

  const stopBatch = () => {
    stopRef.current = true;
    notify('Sẽ dừng sau khi hoàn tất bài đang xử lý.');
  };

  const saveDraft = () => {
    try {
      saveCurriculumDraft(ownerId, { profile, rows, lessons, curriculumText, textbookText, extraRequirements });
      notify('Đã lưu dự án vào trình duyệt.');
    } catch (saveError) {
      setError(`Không lưu được bản nháp: ${saveError.message || saveError}`);
    }
  };

  const restoreDraft = () => {
    const draft = loadCurriculumDraft(ownerId);
    if (!draft) {
      setError('Chưa có bản nháp trình duyệt.');
      return;
    }
    setProfile({ ...DEFAULT_CURRICULUM_PROFILE, ...(draft.profile || {}) });
    setRows(Array.isArray(draft.rows) ? draft.rows : []);
    setLessons(draft.lessons || {});
    setCurriculumText(draft.curriculumText || '');
    setTextbookText(draft.textbookText || '');
    setExtraRequirements(draft.extraRequirements || '');
    notify('Đã khôi phục dự án.');
  };

  const importProject = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const data = await readJsonFile(file);
      setProfile({ ...DEFAULT_CURRICULUM_PROFILE, ...(data.profile || {}) });
      setRows(Array.isArray(data.rows) ? data.rows : []);
      setLessons(data.lessons || {});
      setCurriculumText(data.curriculumText || '');
      setTextbookText(data.textbookText || '');
      notify('Đã nhập dự án JSON.');
    } catch (importError) {
      setError(`Không nhập được dự án: ${importError.message || importError}`);
    } finally {
      event.target.value = '';
    }
  };

  const exportCombined = () => {
    if (!generatedCount) return setError('Chưa có giáo án để xuất.');
    downloadCombinedWord(profile, rows, lessons);
  };

  const exportZip = async () => {
    if (!generatedCount) return setError('Chưa có giáo án để xuất.');
    await downloadLessonZip(profile, rows, lessons);
  };

  const updateActiveOutput = (value) => {
    if (!activeRow) return;
    setLessons((previous) => ({ ...previous, [activeRow.id]: value }));
    setLessonStatus((previous) => ({ ...previous, [activeRow.id]: value.trim() ? 'done' : 'idle' }));
  };

  return (
    <section className="la113-shell">
      <div className="la113-toolbar">
        <div>
          <span className="eyebrow">Lesson Architect 11.3.1</span>
          <h2>Bộ soạn giáo án Tiếng Anh 11 – Global Success</h2>
          <p>Trích KHGD, đối chiếu Global Success, tạo giáo án hoàn toàn bằng tiếng Anh và tích hợp năng lực số theo quy định của Bộ GDĐT.</p>
        </div>
        <div className="la113-toolbar-actions">
          <button type="button" className="secondary" onClick={applyEnglishGlobalSuccessPreset}>Mẫu Tiếng Anh 11 – Global Success</button>
          <button type="button" className="secondary" onClick={restoreDraft}>Khôi phục</button>
          <button type="button" className="secondary" onClick={saveDraft}>Lưu nháp</button>
          <label className="button secondary">Nhập JSON<input hidden type="file" accept="application/json,.json" onChange={importProject} /></label>
          <button type="button" className="secondary" onClick={onExit}>Soạn một bài</button>
        </div>
      </div>

      <nav className="la113-steps" aria-label="Tiến trình">
        {['Hồ sơ', 'Nguồn tài liệu', 'Danh sách KHGD', 'Soạn hàng loạt', 'Xuất bản'].map((label, index) => (
          <button key={label} type="button" className={step === index + 1 ? 'active' : ''} onClick={() => setStep(index + 1)}>
            <span>{index + 1}</span>{label}
          </button>
        ))}
      </nav>

      {error && <div className="error-box la113-error">⚠️ {error}</div>}

      {step === 1 && (
        <div className="la113-card">
          <div className="la113-card-head"><div><span className="eyebrow">Bước 1</span><h3>Hồ sơ dự án giáo án</h3></div><button className="primary" onClick={() => setStep(2)}>Tiếp tục: Nguồn tài liệu</button></div>
          <div className="la113-form-grid">
            <label>Môn học<input value={profile.subject} onChange={(event) => patchProfile('subject', event.target.value)} /></label>
            <label>Số năm kinh nghiệm<input type="number" min="0" value={profile.yearsExperience} onChange={(event) => patchProfile('yearsExperience', event.target.value)} /></label>
            <label>Bậc học<input value={profile.level} onChange={(event) => patchProfile('level', event.target.value)} placeholder="THPT" /></label>
            <label>Lớp<input value={profile.grade} onChange={(event) => patchProfile('grade', event.target.value)} /></label>
            <label>Định hướng<input value={profile.orientation} onChange={(event) => patchProfile('orientation', event.target.value)} /></label>
            <label>Năm học<input value={profile.schoolYear} onChange={(event) => patchProfile('schoolYear', event.target.value)} /></label>
            <label>Bộ sách<input value={profile.bookSeries} onChange={(event) => patchProfile('bookSeries', event.target.value)} /></label>
            <label>Ngôn ngữ đầu ra<select value={profile.outputLanguage || 'English'} onChange={(event) => patchProfile('outputLanguage', event.target.value)}><option value="English">English (bắt buộc)</option></select></label>
            <label className="span-2">Khung năng lực số<input value={profile.digitalFramework || 'Circular No. 02/2025/TT-BGDĐT'} onChange={(event) => patchProfile('digitalFramework', event.target.value)} /></label>
            <label className="span-2">Mức tích hợp năng lực số<input value={profile.digitalTargetLevel || ''} onChange={(event) => patchProfile('digitalTargetLevel', event.target.value)} /></label>
            <label>Trường<input value={profile.school} onChange={(event) => patchProfile('school', event.target.value)} /></label>
            <label>Tổ chuyên môn<input value={profile.department} onChange={(event) => patchProfile('department', event.target.value)} /></label>
            <label>Giáo viên<input value={profile.teacher} onChange={(event) => patchProfile('teacher', event.target.value)} /></label>
            <label>Cả năm – số tiết<input type="number" min="0" value={profile.totalPeriods} onChange={(event) => patchProfile('totalPeriods', event.target.value)} /></label>
            <label>Số tuần<input type="number" min="0" value={profile.weeks} onChange={(event) => patchProfile('weeks', event.target.value)} /></label>
            <label>Học kỳ I – số tiết<input type="number" min="0" value={profile.semester1Periods} onChange={(event) => patchProfile('semester1Periods', event.target.value)} /></label>
            <label>Học kỳ II – số tiết<input type="number" min="0" value={profile.semester2Periods} onChange={(event) => patchProfile('semester2Periods', event.target.value)} /></label>
            <label>Số bài dự kiến<input type="number" min="1" value={profile.expectedLessonCount} onChange={(event) => patchProfile('expectedLessonCount', event.target.value)} /></label>
            <label>Bài đầu dự kiến<input value={profile.firstLessonTitle} onChange={(event) => patchProfile('firstLessonTitle', event.target.value)} /></label>
            <label className="span-2">Bài cuối dự kiến<input value={profile.lastLessonTitle} onChange={(event) => patchProfile('lastLessonTitle', event.target.value)} /></label>
          </div>
          <div className="la113-framework-note">
            <strong>Khung tích hợp bắt buộc</strong>
            <p>Đầu ra: English only. Mỗi bài chọn 1–3 năng lực số phù hợp, thể hiện bằng mục tiêu, hành động học sinh và sản phẩm quan sát được.</p>
            <div className="la113-framework-grid">{DIGITAL_COMPETENCE_FRAMEWORK.map((domain) => <span key={domain.domain}><b>{domain.domain}</b> {domain.title}</span>)}</div>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="la113-card">
          <div className="la113-card-head">
            <div><span className="eyebrow">Bước 2</span><h3>Nguồn KHGD và Sách giáo khoa</h3><p>Tải đúng KHGD Tiếng Anh 11 và SGK Tiếng Anh 11 Global Success; không sử dụng các nguồn Tin học trước đây.</p></div>
            <div className="la113-row-actions"><button className="secondary" onClick={swapReferences}>Hoán đổi 2 nguồn</button><button className="primary" onClick={() => setStep(3)}>Tiếp tục: Bảng KHGD</button></div>
          </div>
          <div className="la113-source-grid">
            <article className="la113-source-card">
              <span className="la113-source-badge">KHGD</span>
              <h4>Kế hoạch giáo dục</h4>
              <label>Link Google Drive<input value={profile.curriculumUrl} onChange={(event) => patchProfile('curriculumUrl', event.target.value)} /></label>
              <div className="la113-row-actions">
                <button className="secondary" disabled={extractingKind === 'curriculum'} onClick={() => loadDriveReference('curriculum')}>{extractingKind === 'curriculum' ? 'Đang đọc...' : 'Đọc từ Drive'}</button>
                <label className="button secondary">Tải file<input hidden type="file" accept=".pdf,.docx,.txt,.md,.html,.htm" onChange={(event) => readLocalReference('curriculum', event.target.files?.[0])} /></label>
              </div>
              <textarea rows="10" value={curriculumText} onChange={(event) => setCurriculumText(event.target.value)} placeholder="Dán toàn bộ nội dung KHGD hoặc trích xuất từ PDF..." />
              {sourceStatus.curriculum && <small className={sourceStatus.curriculum.startsWith('Cảnh báo') ? 'warning-text' : 'success-text'}>{sourceStatus.curriculum}</small>}
            </article>
            <article className="la113-source-card">
              <span className="la113-source-badge book">SGK</span>
              <h4>Sách giáo khoa</h4>
              <label>Link Google Drive<input value={profile.textbookUrl} onChange={(event) => patchProfile('textbookUrl', event.target.value)} /></label>
              <div className="la113-row-actions">
                <button className="secondary" disabled={extractingKind === 'textbook'} onClick={() => loadDriveReference('textbook')}>{extractingKind === 'textbook' ? 'Đang đọc...' : 'Đọc từ Drive'}</button>
                <label className="button secondary">Tải file<input hidden type="file" accept=".pdf,.docx,.txt,.md,.html,.htm" onChange={(event) => readLocalReference('textbook', event.target.files?.[0])} /></label>
              </div>
              <textarea rows="10" value={textbookText} onChange={(event) => setTextbookText(event.target.value)} placeholder="Dán nội dung SGK hoặc trích xuất từ PDF..." />
              {sourceStatus.textbook && <small className={sourceStatus.textbook.startsWith('Cảnh báo') ? 'warning-text' : 'success-text'}>{sourceStatus.textbook}</small>}
            </article>
          </div>
          <div className="la113-analysis-bar">
            <div><strong>{curriculumText.length.toLocaleString('vi-VN')}</strong><small> ký tự KHGD</small></div>
            <div><strong>{textbookText.length.toLocaleString('vi-VN')}</strong><small> ký tự SGK</small></div>
            <button className="primary" disabled={analysing || !curriculumText.trim()} onClick={extractCurriculum}>{analysing ? 'AI đang trích bảng...' : 'AI trích danh sách bài dạy'}</button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="la113-card">
          <div className="la113-card-head">
            <div><span className="eyebrow">Bước 3</span><h3>Danh sách bài dạy theo KHGD</h3><p>Chỉnh trực tiếp toàn bộ Unit, Lesson, Review và Test trước khi soạn.</p></div>
            <div className="la113-row-actions"><button className="secondary" onClick={addRow}>＋ Thêm bài</button><button className="primary" onClick={() => setStep(4)}>Tiếp tục: Soạn hàng loạt</button></div>
          </div>
          <div className="la113-validation-summary">
            <span>{validation.lessonCount} bài</span><span>{validation.totalPeriods} tiết</span><span>{selectedRows.length} bài được chọn</span><span className={validation.ok ? 'ok' : 'bad'}>{validation.ok ? 'Không có lỗi chặn' : 'Có lỗi cần sửa'}</span>
          </div>
          {validation.issues.length > 0 && <div className="la113-issues">{validation.issues.map((issue, index) => <p key={`${issue.message}-${index}`} className={issue.level}>• {issue.message}</p>)}</div>}
          <div className="la113-table-wrap">
            <table className="la113-curriculum-table">
              <thead><tr><th>Chọn</th><th>STT</th><th>Tiết</th><th>Tên bài</th><th>Số tiết</th><th>Unit/Chủ đề</th><th>Loại bài</th><th>Kỹ năng</th><th>Ngôn ngữ</th><th>Năng lực số</th><th>Yêu cầu cần đạt</th><th>Thiết bị</th><th /></tr></thead>
              <tbody>{rows.map((row) => (
                <tr key={row.id}>
                  <td><input type="checkbox" checked={row.selected !== false} onChange={(event) => updateRow(row.id, 'selected', event.target.checked)} /></td>
                  <td><input className="mini" type="number" value={row.order} onChange={(event) => updateRow(row.id, 'order', Number(event.target.value))} /></td>
                  <td><div className="period-range"><input className="mini" type="number" value={row.periodStart} onChange={(event) => updateRow(row.id, 'periodStart', event.target.value)} /><span>–</span><input className="mini" type="number" value={row.periodEnd} onChange={(event) => updateRow(row.id, 'periodEnd', event.target.value)} /></div></td>
                  <td><textarea rows="2" value={row.title} onChange={(event) => updateRow(row.id, 'title', event.target.value)} /></td>
                  <td><input className="mini" type="number" value={row.periods} onChange={(event) => updateRow(row.id, 'periods', Number(event.target.value))} /></td>
                  <td><textarea rows="2" value={row.theme} onChange={(event) => updateRow(row.id, 'theme', event.target.value)} /></td>
                  <td><textarea rows="2" value={row.lessonType || ''} onChange={(event) => updateRow(row.id, 'lessonType', event.target.value)} placeholder="Reading / Language / Project..." /></td>
                  <td><textarea rows="2" value={row.skillFocus || ''} onChange={(event) => updateRow(row.id, 'skillFocus', event.target.value)} /></td>
                  <td><textarea rows="2" value={row.languageFocus || ''} onChange={(event) => updateRow(row.id, 'languageFocus', event.target.value)} /></td>
                  <td><textarea rows="2" value={row.digitalCompetences || ''} onChange={(event) => updateRow(row.id, 'digitalCompetences', event.target.value)} placeholder="1.2; 2.4; 3.1..." /></td>
                  <td><textarea rows="3" value={row.requirements} onChange={(event) => updateRow(row.id, 'requirements', event.target.value)} /></td>
                  <td><textarea rows="3" value={row.equipment} onChange={(event) => updateRow(row.id, 'equipment', event.target.value)} /></td>
                  <td><button className="danger compact" onClick={() => removeRow(row.id)}>×</button></td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        </div>
      )}

      {step === 4 && (
        <div className="la113-card">
          <div className="la113-card-head">
            <div><span className="eyebrow">Bước 4</span><h3>Soạn tuần tự, tự lưu từng bài</h3><p>Ứng dụng gọi AI riêng cho từng bài để tránh giáo án bị cắt giữa chừng.</p></div>
            <div className="la113-row-actions">
              <button className="secondary" disabled={batchRunning} onClick={() => runBatch('missing')}>Soạn các bài còn thiếu</button>
              <button className="primary" disabled={batchRunning || !selectedRows.length} onClick={() => runBatch('selected')}>Soạn {selectedRows.length} bài đã chọn</button>
              {batchRunning && <button className="danger" onClick={stopBatch}>Dừng sau bài này</button>}
            </div>
          </div>
          <label className="la113-extra-label">Yêu cầu bổ sung áp dụng cho mọi bài<textarea rows="3" value={extraRequirements} onChange={(event) => setExtraRequirements(event.target.value)} placeholder="Ví dụ: use B2-level instructions, include pair work, provide offline alternatives, integrate DC 1.2 and 2.4 where relevant..." /></label>
          <div className="la113-progress">
            <div><strong>{generatedCount}/{rows.length}</strong><span>bài đã hoàn thành</span></div>
            <div className="la113-progress-track"><span style={{ width: `${rows.length ? (generatedCount / rows.length) * 100 : 0}%` }} /></div>
            {batchRunning && <small>Đang xử lý {batchProgress.current}/{batchProgress.total}: {batchProgress.label}</small>}
          </div>
          <div className="la113-generation-grid">
            <aside className="la113-lesson-list">
              {rows.map((row) => {
                const state = lessonStatus[row.id] || (lessons[row.id] ? 'done' : 'idle');
                return <button key={row.id} type="button" className={activeRow?.id === row.id ? `active state-${state}` : `state-${state}`} onClick={() => setActiveLessonId(row.id)}>
                  <span>{String(row.order).padStart(2, '0')}</span><div><strong>{row.title || 'Chưa đặt tên'}</strong><small>Tiết {periodLabel(row)} · {statusLabel(state)}</small></div>
                </button>;
              })}
            </aside>
            <article className="la113-editor">
              {activeRow ? <>
                <div className="la113-editor-head"><div><span className="eyebrow">Bài {activeRow.order} · Tiết {periodLabel(activeRow)}</span><h4>{activeRow.title}</h4></div><button className="secondary" disabled={lessonStatus[activeRow.id] === 'running'} onClick={() => generateLesson(activeRow).catch((generationError) => setError(generationError.message || String(generationError)))}>{lessons[activeRow.id] ? 'Soạn lại bài này' : 'Soạn bài này'}</button></div>
                <textarea rows="28" value={activeOutput} onChange={(event) => updateActiveOutput(event.target.value)} placeholder="The complete English lesson plan will appear here. You can edit it before exporting to Word." />
              </> : <div className="la113-empty">Chưa có bài dạy trong bảng KHGD.</div>}
            </article>
          </div>
          <div className="la113-bottom-actions"><button className="secondary" onClick={saveDraft}>Lưu tiến độ</button><button className="primary" onClick={() => setStep(5)}>Tiếp tục: Xuất bản</button></div>
        </div>
      )}

      {step === 5 && (
        <div className="la113-card">
          <div className="la113-card-head"><div><span className="eyebrow">Bước 5</span><h3>Xuất bộ giáo án tiếng Anh hoàn chỉnh</h3><p>Word uses Times New Roman 13, A4 margins and English-only lesson content.</p></div></div>
          <div className="la113-export-grid">
            <button className="la113-export-card" onClick={exportCombined} disabled={!generatedCount}><span>W</span><strong>Một file Word toàn bộ</strong><small>Annual teaching sequence and all English lesson plans in order.</small></button>
            <button className="la113-export-card" onClick={exportZip} disabled={!generatedCount}><span>ZIP</span><strong>Each lesson as a separate Word file</strong><small>Includes the annual sequence and project JSON.</small></button>
            <button className="la113-export-card" onClick={() => exportCurriculumProject(profile, rows, lessons, curriculumText, textbookText)}><span>JSON</span><strong>Back up project</strong><small>Có thể nhập lại để tiếp tục soạn trên thiết bị khác.</small></button>
            <button className="la113-export-card" onClick={() => downloadFile('grade-11-global-success-lesson-plan-prompt.txt', buildAnnualLessonPrompt({ profile, row: rows[0] || EMPTY_ROW(), curriculumText, textbookText, extraRequirements }))}><span>P</span><strong>Export English prompt</strong><small>Reuse the English-only prompt with digital competence rules.</small></button>
          </div>
          <div className="la113-final-check">
            <h4>Kiểm tra trước khi bàn giao</h4>
            <p className={generatedCount === rows.length && rows.length ? 'ok' : 'warning'}>{generatedCount === rows.length && rows.length ? '✓ Đã có đủ giáo án cho mọi bài trong KHGD.' : `• Còn ${Math.max(0, rows.length - generatedCount)} bài chưa soạn.`}</p>
            <p className={validation.ok ? 'ok' : 'warning'}>{validation.ok ? '✓ Bảng PPCT không có lỗi trùng tiết.' : '• Bảng PPCT còn lỗi cần kiểm tra.'}</p>
            <p className={profile.school && profile.department && profile.teacher ? 'ok' : 'warning'}>{profile.school && profile.department && profile.teacher ? '✓ Đã điền đủ trường, tổ và giáo viên.' : '• Chưa điền đủ thông tin đơn vị.'}</p>
            <p className="ok">✓ Đầu ra bị khóa bằng tiếng Anh; hệ thống tự kiểm tra và sửa lại khi phát hiện tiêu đề tiếng Việt.</p>
            <p className="ok">✓ Mỗi bài phải có mã năng lực số và minh chứng hoạt động theo Thông tư 02/2025/TT-BGDĐT.</p>
          </div>
        </div>
      )}

      {toast && <div className="toast">{toast}</div>}
    </section>
  );
}
