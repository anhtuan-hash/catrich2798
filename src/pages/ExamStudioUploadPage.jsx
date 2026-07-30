import React, { useEffect, useState } from 'react';
import { readDocxTextFromBuffer, readPdfTextFromBuffer } from '../utils/documentParsers.js';
import { recognizeExamSourceAutomatically } from '../utils/examAutoRecognition.js';
import {
  buildExamOutputFromQuestions,
  createDefaultExamProject,
  EXAM_TYPE_OPTIONS,
  QUESTION_FORMAT_GROUPS,
  SKILL_OPTIONS,
} from '../utils/specializedAppEngines.js';
import '../styles/ExamAutoRecognition.css';

const DRAFT_KEY = 'bes-exam-studio-upload-only-draft-v1';
const VAULT_KEY = 'bes-exam-studio-upload-only-vault-v1';

const SAMPLE_FILES = [
  {
    id: 'mcq',
    icon: 'A',
    title: 'MCQ + Answer Key',
    filename: '01-mcq-answer-key.txt',
    path: '/samples/exam-studio/01-mcq-answer-key.txt',
    description: 'Câu trắc nghiệm A–D, đáp án rời và phần giải thích.',
    detects: ['MCQ', 'Answer key', 'Explanation'],
  },
  {
    id: 'reading',
    icon: 'R',
    title: 'Reading comprehension',
    filename: '02-reading-comprehension.txt',
    path: '/samples/exam-studio/02-reading-comprehension.txt',
    description: 'Bài đọc, câu hỏi tham chiếu passage, đáp án và giải thích.',
    detects: ['Passage', 'Reading MCQ', 'Explanation'],
  },
  {
    id: 'cloze',
    icon: 'C',
    title: 'Cloze + Word Form',
    filename: '03-cloze-word-form.txt',
    path: '/samples/exam-studio/03-cloze-word-form.txt',
    description: 'Điền khuyết, word formation và đáp án dạng chữ hoặc từ.',
    detects: ['Cloze', 'Word form', 'Open answer'],
  },
  {
    id: 'true-false',
    icon: 'T',
    title: 'True/False + Short Answer',
    filename: '04-true-false-short-answer.txt',
    path: '/samples/exam-studio/04-true-false-short-answer.txt',
    description: 'Đúng/sai, câu trả lời ngắn, sample answer và rubric.',
    detects: ['True/False', 'Short answer', 'Rubric'],
  },
  {
    id: 'mixed',
    icon: 'M',
    title: 'Đề nhiều section',
    filename: '05-mixed-sections.txt',
    path: '/samples/exam-studio/05-mixed-sections.txt',
    description: 'Pronunciation, grammar, error correction và writing trong một file.',
    detects: ['Sections', 'Mixed formats', 'Open response'],
  },
  {
    id: 'rubric',
    icon: 'E',
    title: 'Explanation + Rubric',
    filename: '06-explanations-rubric.txt',
    path: '/samples/exam-studio/06-explanations-rubric.txt',
    description: 'Đáp án, giải thích chi tiết, sample answer và tiêu chí chấm.',
    detects: ['Explanation', 'Sample answer', 'Rubric'],
  },
];

function readJson(key, fallback) {
  try {
    const value = JSON.parse(localStorage.getItem(key) || 'null');
    return value ?? fallback;
  } catch {
    return fallback;
  }
}

function saveJson(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Local persistence is best effort.
  }
}

function slugify(value = 'exam-studio') {
  return String(value)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 70) || 'exam-studio';
}

function downloadBlob(filename, content, type = 'text/plain;charset=utf-8') {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 500);
}

function escapeHtml(value = '') {
  return String(value).replace(/[&<>'"]/g, (character) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    "'": '&#39;',
    '"': '&quot;',
  }[character]));
}

function markdownToHtml(markdown = '') {
  return String(markdown).split(/\r?\n/).map((line) => {
    const text = line.trim();
    if (!text) return '<p></p>';
    if (/^###\s+/.test(text)) return `<h3>${escapeHtml(text.replace(/^###\s+/, ''))}</h3>`;
    if (/^##\s+/.test(text)) return `<h2>${escapeHtml(text.replace(/^##\s+/, ''))}</h2>`;
    if (/^#\s+/.test(text)) return `<h1>${escapeHtml(text.replace(/^#\s+/, ''))}</h1>`;
    if (/^[-*]\s+/.test(text)) return `<p>• ${escapeHtml(text.replace(/^[-*]\s+/, ''))}</p>`;
    return `<p>${escapeHtml(text)}</p>`;
  }).join('\n');
}

function exportDoc(title, markdown) {
  const html = `<!doctype html><html><head><meta charset="utf-8"><title>${escapeHtml(title)}</title><style>body{font-family:Arial,sans-serif;line-height:1.55;color:#111827;padding:28px}h1,h2,h3{color:#17324d}p{margin:7px 0}</style></head><body>${markdownToHtml(markdown)}</body></html>`;
  downloadBlob(`${slugify(title)}.doc`, html, 'application/msword;charset=utf-8');
}

function printOutput(title, markdown) {
  const win = window.open('', '_blank', 'noopener,noreferrer');
  if (!win) return;
  win.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>${escapeHtml(title)}</title><style>body{font-family:Arial,sans-serif;line-height:1.55;padding:28px;color:#111827}button{padding:10px 16px}@media print{button{display:none}}</style></head><body><button onclick="window.print()">Print / Save as PDF</button>${markdownToHtml(markdown)}</body></html>`);
  win.document.close();
}

async function copyText(text = '') {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    const area = document.createElement('textarea');
    area.value = text;
    document.body.appendChild(area);
    area.select();
    document.execCommand('copy');
    area.remove();
  }
}

async function readSampleFile(sample) {
  const response = await fetch(sample.path, { cache: 'no-store' });
  if (!response.ok) throw new Error(`Không tải được ${sample.filename}`);
  return response.text();
}

function loadInitialProject() {
  const saved = readJson(DRAFT_KEY, null);
  return saved?.project
    ? { ...createDefaultExamProject(), ...saved.project, sourceMode: 'paste' }
    : createDefaultExamProject();
}

function Field({ label, children }) {
  return <label className="exam-field"><span>{label}</span>{children}</label>;
}

function SampleFileLibrary({ title, description, onLoad, loadingId = '', compact = false, actionLabel = 'Nạp vào ô' }) {
  return (
    <section className={`exam-sample-library ${compact ? 'is-compact' : ''}`}>
      <div className="exam-sample-library-head">
        <div>
          <span className="eyebrow">File mẫu</span>
          <h4>{title}</h4>
          {description ? <p>{description}</p> : null}
        </div>
        <span className="exam-sample-count">{SAMPLE_FILES.length} mẫu</span>
      </div>
      <div className="exam-sample-grid">
        {SAMPLE_FILES.map((sample) => (
          <article className="exam-sample-card" key={sample.id}>
            <div className="exam-sample-card-head">
              <span className="exam-sample-icon">{sample.icon}</span>
              <div>
                <strong>{sample.title}</strong>
                <small>{sample.filename}</small>
              </div>
            </div>
            {!compact ? <p>{sample.description}</p> : null}
            <div className="exam-sample-tags">
              {sample.detects.map((item) => <span key={item}>{item}</span>)}
            </div>
            <div className="exam-sample-actions">
              <a href={sample.path} download={sample.filename}>Tải file mẫu</a>
              <button type="button" onClick={() => onLoad(sample)} disabled={Boolean(loadingId)}>
                {loadingId === sample.id ? 'Đang nạp...' : actionLabel}
              </button>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function SampleQuickBar({ onLoad, loadingId = '' }) {
  return (
    <div className="exam-sample-quick-bar">
      <span>Nạp nhanh file mẫu:</span>
      <div>
        {SAMPLE_FILES.map((sample) => (
          <button type="button" key={sample.id} onClick={() => onLoad(sample)} disabled={Boolean(loadingId)}>
            <b>{sample.icon}</b>{loadingId === sample.id ? 'Đang nạp' : sample.title}
          </button>
        ))}
      </div>
    </div>
  );
}

function Stepper({ step, output, setStep }) {
  const steps = [
    ['☷', 'Cấu trúc đề', 'Chọn mục tiêu và thông số'],
    ['⇧', 'Upload & nhận dạng', 'Đọc và chuẩn hoá tự động'],
    ['◉', 'Preview & chỉnh sửa', 'Kiểm tra từng câu'],
    ['⇩', 'Xuất file / HTML', 'Tải và sử dụng trực tiếp'],
  ];
  return (
    <nav className="exam-stepper exam-stepper-v946 exam-v19-stepper" aria-label="Exam Studio workflow">
      {steps.map(([icon, label, desc], index) => {
        const locked = index >= 2 && !output;
        return (
          <button
            key={label}
            type="button"
            disabled={locked}
            className={`${step === index ? 'active' : ''} ${step > index ? 'done' : ''}`}
            onClick={() => !locked && setStep(index)}
          >
            <span className="exam-v19-step-icon">{icon}</span>
            <i>{index + 1}</i>
            <b>{label}</b>
            <small>{desc}</small>
          </button>
        );
      })}
    </nav>
  );
}

function SummaryCard({ project, output, recognition }) {
  const formatMap = QUESTION_FORMAT_GROUPS.flatMap((group) => group.formats);
  const labels = (project.selectedFormats || []).map((id) => formatMap.find((item) => item.id === id)?.label || id);
  return (
    <section className="panel exam-v35-summary-bar" aria-label="Tóm tắt đề hiện tại">
      <div className="exam-v35-summary-title"><span className="exam-v35-live-mark" /><div><strong>Tóm tắt</strong><small>đề hiện tại</small></div></div>
      <div className="exam-v35-summary-item exam-v35-format-summary"><span>Dạng câu nhận dạng</span><div className="exam-v35-format-chips">{labels.length ? labels.slice(0, 3).map((label, index) => <b key={label} data-tone={index % 3}>{label}</b>) : <em>Chưa có</em>}{labels.length > 3 ? <b data-tone="more">+{labels.length - 3}</b> : null}</div></div>
      <div className="exam-v35-summary-item"><span>Số câu</span><strong>{output?.questions?.length || project.questionCount || 0} <small>câu</small></strong></div>
      <div className="exam-v35-summary-item"><span>Thời gian</span><strong><i>◷</i>{project.duration || 0} phút</strong></div>
      <div className="exam-v35-summary-item"><span>Level</span><strong><i>▥</i>{project.level || '—'}</strong></div>
      <div className="exam-v35-summary-item"><span>Nhận dạng</span><strong>{recognition ? `${recognition.confidence}%` : 'Chờ nguồn'}</strong></div>
      {output ? <div className="exam-v35-output-ready">Preview sẵn sàng</div> : null}
    </section>
  );
}

function StepType({ project, setProject }) {
  const toggleFormat = (id) => setProject((previous) => ({
    ...previous,
    selectedFormats: previous.selectedFormats?.includes(id)
      ? previous.selectedFormats.filter((item) => item !== id)
      : [...(previous.selectedFormats || []), id],
  }));
  return (
    <section className="panel exam-work-panel exam-v946-panel">
      <span className="eyebrow">Bước 1</span>
      <h2>Thiết lập cấu trúc đề</h2>
      <p className="muted-line">Các lựa chọn này dùng để tạo mã đề, ma trận và định dạng đầu ra. Dạng câu thực tế sẽ tiếp tục được suy luận từ file nguồn.</p>
      <div className="exam-v946-block">
        <h3>1. Mục tiêu bài kiểm tra</h3>
        <div className="exam-type-grid exam-type-grid-v946">
          {EXAM_TYPE_OPTIONS.map((item) => (
            <button key={item.id} type="button" className={project.examType === item.id ? 'selected' : ''} onClick={() => setProject((previous) => ({ ...previous, examType: item.id, purpose: item.label }))}>
              <span>{item.icon}</span><strong>{item.label}</strong><small>{item.desc}</small>
            </button>
          ))}
        </div>
      </div>
      <div className="exam-v946-block">
        <h3>2. Nhóm kỹ năng / nội dung</h3>
        <div className="exam-chip-grid">{SKILL_OPTIONS.map((item) => <button key={item.id} type="button" className={project.skill === item.id ? 'active' : ''} onClick={() => setProject((previous) => ({ ...previous, skill: item.id }))}>{item.label}</button>)}</div>
      </div>
      <details className="question-format-group" open>
        <summary><strong>3. Dạng câu dự kiến</strong><small>Có thể để trống; hệ thống sẽ tự xác định từ nguồn.</small></summary>
        <div className="question-format-grid">{QUESTION_FORMAT_GROUPS.flatMap((group) => group.formats).slice(0, 24).map((format) => <label key={format.id} className={project.selectedFormats?.includes(format.id) ? 'selected' : ''}><input type="checkbox" checked={project.selectedFormats?.includes(format.id) || false} onChange={() => toggleFormat(format.id)} /><span>{format.label}</span></label>)}</div>
      </details>
      <div className="exam-v946-settings-row">
        <Field label="Ngôn ngữ đề"><select value="en" disabled><option>English source</option></select></Field>
        <Field label="Level"><select value={project.level} onChange={(event) => setProject((previous) => ({ ...previous, level: event.target.value }))}>{['A2', 'B1', 'B1-B2', 'B2', 'B2-C1', 'C1', 'C2'].map((item) => <option key={item}>{item}</option>)}</select></Field>
        <Field label="Thời gian"><input type="number" min="5" max="180" value={project.duration} onChange={(event) => setProject((previous) => ({ ...previous, duration: Number(event.target.value) || 15 }))} /></Field>
        <Field label="Số mã đề"><input type="number" min="1" max="12" value={project.codes} onChange={(event) => setProject((previous) => ({ ...previous, codes: Number(event.target.value) || 1 }))} /></Field>
      </div>
    </section>
  );
}

function RecognitionMetrics({ recognition }) {
  if (!recognition?.stats) return null;
  const { stats } = recognition;
  return (
    <div className="auto-recognition-metrics">
      <div className="auto-recognition-metric"><span>Tổng câu</span><strong>{stats.total}</strong></div>
      <div className="auto-recognition-metric"><span>Trắc nghiệm</span><strong>{stats.mcq}</strong></div>
      <div className="auto-recognition-metric"><span>Tự luận / điền</span><strong>{stats.open}</strong></div>
      <div className="auto-recognition-metric"><span>Có đáp án</span><strong>{stats.answered}</strong></div>
      <div className="auto-recognition-metric"><span>Bài đọc</span><strong>{stats.passages}</strong></div>
      <div className="auto-recognition-metric"><span>Tin cậy</span><strong>{recognition.confidence}%</strong></div>
    </div>
  );
}

function StepSource({ project, setProject, recognition, recognizing, onRecognize, onPreview }) {
  const [fileState, setFileState] = useState('');
  const [sampleLoadingId, setSampleLoadingId] = useState('');

  const handleFile = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setFileState('Đang đọc file...');
    try {
      const buffer = await file.arrayBuffer();
      let sourceText = '';
      if (/\.pdf$/i.test(file.name)) sourceText = await readPdfTextFromBuffer(buffer, { maxPages: 40, maxChars: 140000 });
      else if (/\.docx$/i.test(file.name)) sourceText = await readDocxTextFromBuffer(buffer);
      else sourceText = new TextDecoder('utf-8').decode(buffer);
      setProject((previous) => ({ ...previous, sourceText, sourceFileName: file.name, sourceMode: 'paste' }));
      setFileState(`Đã nhập: ${file.name}`);
    } catch (error) {
      setFileState(`Không đọc được file: ${error.message || error}`);
    }
  };

  const loadSample = async (sample) => {
    setSampleLoadingId(sample.id);
    setFileState(`Đang nạp file mẫu ${sample.filename}...`);
    try {
      const sourceText = await readSampleFile(sample);
      setProject((previous) => ({
        ...previous,
        sourceText,
        sourceFileName: sample.filename,
        sourceMode: 'paste',
        sampleSourceId: sample.id,
      }));
      setFileState(`Đã nạp file mẫu: ${sample.filename}`);
    } catch (error) {
      setFileState(error.message || String(error));
    } finally {
      setSampleLoadingId('');
    }
  };

  return (
    <section className="panel exam-work-panel exam-v946-panel">
      <span className="eyebrow">Bước 2</span>
      <h2>Upload hoặc dán nội dung đề</h2>
      <div className="exam-auto-source-note"><p className="muted-line">Sau khi file được đọc hoặc bạn ngừng nhập khoảng 0,7 giây, hệ thống tự phân tích và dựng Preview.</p><span className="exam-auto-recognition-badge">Cục bộ · Không AI · Không API</span></div>
      <div className="exam-source-grid auto-source-grid">
        <div className="exam-input-source-column">
          <div className="upload-zone exam-v946-upload">
            <input type="file" accept=".txt,.md,.pdf,.docx" onChange={handleFile} />
            <strong>Upload PDF / DOCX / TXT / Markdown</strong>
            <small>{fileState || 'Nhận dạng section, bài đọc, câu hỏi, phương án, đáp án và giải thích.'}</small>
          </div>

          <SampleFileLibrary
            title="File mẫu cho khu vực Upload"
            description="Tải file về máy để thử đúng quy trình upload, hoặc nạp trực tiếp vào ứng dụng."
            onLoad={loadSample}
            loadingId={sampleLoadingId}
            actionLabel="Nạp trực tiếp"
          />

          <Field label="Dán nội dung đề">
            <textarea
              rows={18}
              value={project.sourceText || ''}
              onChange={(event) => setProject((previous) => ({ ...previous, sourceText: event.target.value, sourceFileName: '', sourceMode: 'paste', sampleSourceId: '' }))}
              placeholder={'PART I. Choose the best answer.\n1. The students _____ the task yesterday.\nA. complete\nB. completed\nC. have completed\nD. completing\nAnswer: B'}
            />
          </Field>

          <SampleQuickBar onLoad={loadSample} loadingId={sampleLoadingId} />
        </div>

        <aside className="panel inner-panel recognition-panel auto-recognition-panel">
          <span className="eyebrow">Automatic Recognition Engine</span>
          <h3>Kết quả nhận dạng</h3>
          {!project.sourceText?.trim()
            ? <div className="auto-recognition-state">Đang chờ file hoặc nội dung.</div>
            : recognizing
              ? <div className="auto-recognition-state">Đang phân tích cấu trúc...</div>
              : recognition?.detectedCount
                ? <div className="auto-recognition-state is-ready">Đã nhận dạng xong {recognition.detectedCount} câu. Kiểm tra cảnh báo trước khi mở Preview.</div>
                : <div className="auto-recognition-state">Chưa tìm thấy câu hỏi rõ ràng.</div>}
          <RecognitionMetrics recognition={recognition} />
          {recognition?.diagnostics?.length ? <ul className="recognition-list auto-diagnostics">{recognition.diagnostics.map((item) => <li key={item}>{item}</li>)}</ul> : null}
          {recognition?.warnings?.length ? <ul className="recognition-list auto-warnings">{recognition.warnings.map((item) => <li key={item}>{item}</li>)}</ul> : null}

          <SampleFileLibrary
            compact
            title="File mẫu cho từng nhóm nhận dạng"
            description="Chọn một file để chạy thử đúng bộ nhận dạng tương ứng."
            onLoad={loadSample}
            loadingId={sampleLoadingId}
            actionLabel="Chạy thử"
          />

          <div className="auto-recognition-actions">
            <button onClick={onRecognize} disabled={!project.sourceText?.trim() || recognizing}>Nhận dạng lại</button>
            <button className="primary" onClick={onPreview} disabled={!recognition?.detectedCount}>Mở Preview</button>
          </div>
        </aside>
      </div>
    </section>
  );
}

function QuestionCard({ question, onChange, onDelete, onDuplicate }) {
  const [editing, setEditing] = useState(false);
  const changeOption = (index, patch) => {
    const options = question.options.map((option, optionIndex) => ({
      ...option,
      ...(optionIndex === index ? patch : {}),
      isCorrect: patch.isCorrect && optionIndex === index ? true : patch.isCorrect ? false : option.isCorrect,
    }));
    if (patch.isCorrect) options.forEach((option, optionIndex) => { option.isCorrect = optionIndex === index; });
    onChange({ options, answer: options.find((option) => option.isCorrect)?.key || question.answer });
  };
  return (
    <article className="question-editor-card">
      <div className="question-editor-head">
        <div><span className="eyebrow">Câu {question.no} · {question.kind} · {question.band}</span><h3>{question.stem.replace(/^\d+\.\s*/, '')}</h3>{question.passageTitle ? <p className="question-passage-link">Reading passage: {question.passageTitle}</p> : null}</div>
        <div className="preview-actions wrap-actions"><button onClick={() => setEditing((value) => !value)}>{editing ? 'Xong' : 'Sửa'}</button><button onClick={onDuplicate}>Nhân bản</button><button onClick={onDelete}>Xoá</button></div>
      </div>
      {!editing ? (
        <>
          <div className="clean-options">{question.options?.map((option) => <p key={option.key} className={option.isCorrect ? 'correct' : ''}><b>{option.key}.</b> {option.text}</p>)}</div>
          {!question.options?.length ? <p className="open-answer-box">Đáp án mẫu: {question.sampleAnswer || question.answer || 'Chưa có'}</p> : null}
          <p className="explanation-line"><b>Answer:</b> {question.answer || '—'}</p>
          <p className="explanation-line"><b>Explanation:</b> {question.explanation || '—'}</p>
          {question.recognitionIssues?.length ? <ul className="recognition-list auto-warnings">{question.recognitionIssues.map((issue) => <li key={issue}>{issue}</li>)}</ul> : null}
        </>
      ) : (
        <div className="question-edit-form">
          <Field label="Stem"><textarea rows={3} value={question.stem} onChange={(event) => onChange({ stem: event.target.value })} /></Field>
          {question.options?.length
            ? question.options.map((option, index) => <div className="option-editor-row" key={option.key}><b>{option.key}</b><input value={option.text} onChange={(event) => changeOption(index, { text: event.target.value })} /><label><input type="radio" checked={option.isCorrect} onChange={() => changeOption(index, { isCorrect: true })} /> Correct</label></div>)
            : <Field label="Sample answer"><textarea rows={3} value={question.sampleAnswer || question.answer || ''} onChange={(event) => onChange({ sampleAnswer: event.target.value, answer: event.target.value })} /></Field>}
          <Field label="Explanation / rubric"><textarea rows={3} value={question.explanation || ''} onChange={(event) => onChange({ explanation: event.target.value })} /></Field>
        </div>
      )}
    </article>
  );
}

function StepPreview({ output, onQuestionChange, onDelete, onDuplicate }) {
  return (
    <section className="panel exam-work-panel exam-v946-panel">
      <span className="eyebrow">Bước 3</span><h2>Preview & chỉnh sửa</h2><p className="muted-line">Mọi thay đổi sẽ tự dựng lại mã đề, đáp án, ma trận và HTML tương tác.</p>
      {output?.passages?.length ? <section className="reading-passage-preview">{output.passages.map((passage) => <article key={passage.id} className="reading-passage-card"><span className="eyebrow">Reading passage</span><h3>{passage.title}</h3><p>{passage.text}</p></article>)}</section> : null}
      {output ? <aside className="panel inner-panel quality-panel-v946"><span className="eyebrow">Quality Check</span><h3>Quality Score: {output.quality.score}/100</h3><div className="quality-check-grid">{output.quality.checks.map((check) => <span key={check.label} className={check.ok ? 'ok' : 'warn'}>{check.ok ? '✓' : '⚠'} {check.label}</span>)}</div>{output.quality.warnings.length ? <ul>{output.quality.warnings.map((item) => <li key={item}>{item}</li>)}</ul> : <p className="muted-line">Chưa phát hiện lỗi lớn.</p>}</aside> : null}
      <div className="question-editor-list">{output?.questions?.map((question) => <QuestionCard key={question.id} question={question} onChange={(patch) => onQuestionChange(question.id, patch)} onDelete={() => onDelete(question.id)} onDuplicate={() => onDuplicate(question.id)} />)}</div>
    </section>
  );
}

function StepExport({ output, onSaveVault, vaultCount }) {
  if (!output) return <section className="panel exam-work-panel exam-v946-panel"><h2>Chưa có output</h2></section>;
  const title = output.title || 'Exam Studio';
  const openInteractive = () => {
    const blob = new Blob([output.interactiveHtml], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank', 'noopener,noreferrer');
    window.setTimeout(() => URL.revokeObjectURL(url), 60000);
  };
  return (
    <section className="panel exam-work-panel exam-v946-panel">
      <span className="eyebrow">Bước 4</span><h2>Xuất file / sử dụng trực tiếp</h2>
      <div className="exam-export-grid exam-export-grid-v946"><button onClick={() => copyText(output.markdown)}>Copy toàn bộ</button><button onClick={() => exportDoc(`${title} - Student`, output.studentMarkdown)}>DOC bản học sinh</button><button onClick={() => exportDoc(`${title} - Teacher`, output.teacherMarkdown)}>DOC bản giáo viên</button><button onClick={() => printOutput(`${title} - Student`, output.studentMarkdown)}>PDF bản học sinh</button><button onClick={() => printOutput(`${title} - Teacher`, output.teacherMarkdown)}>PDF bản giáo viên</button><button onClick={() => downloadBlob(`${slugify(title)}-answer-key.txt`, output.answersMarkdown)}>Answer Key</button><button onClick={() => downloadBlob(`${slugify(title)}-google-form.txt`, output.googleFormText)}>Google Form text</button><button onClick={() => downloadBlob(`${slugify(title)}-question-bank.json`, output.bankJson, 'application/json;charset=utf-8')}>Question Bank JSON</button><button className="primary" onClick={openInteractive}>Mở tương tác trực tiếp</button><button onClick={() => downloadBlob(`${slugify(title)}-interactive.html`, output.interactiveHtml, 'text/html;charset=utf-8')}>Tải HTML offline</button><button onClick={onSaveVault}>Lưu vault cục bộ</button></div>
      <p className="muted-line">Vault hiện có {vaultCount} bản. Tất cả nhận dạng và xuất file diễn ra cục bộ trên trình duyệt.</p>
    </section>
  );
}

export default function ExamStudioUploadPage({ tool, language = 'vi' }) {
  const [project, setProject] = useState(loadInitialProject);
  const [step, setStep] = useState(0);
  const [recognition, setRecognition] = useState(null);
  const [recognizing, setRecognizing] = useState(false);
  const [output, setOutput] = useState(null);
  const [vault, setVault] = useState(() => readJson(VAULT_KEY, []));
  const title = language === 'vi' ? tool?.titleVi || 'Exam Studio' : tool?.title || 'Exam Studio';

  const rebuild = (nextProject, questions) => {
    const nextOutput = buildExamOutputFromQuestions(nextProject, questions);
    setOutput(nextOutput);
    return nextOutput;
  };

  const recognize = (sourceText = project.sourceText, navigate = false) => {
    const source = String(sourceText || '').trim();
    if (!source) {
      setRecognition(null);
      setOutput(null);
      return null;
    }
    setRecognizing(true);
    try {
      const nextRecognition = recognizeExamSourceAutomatically(source, project);
      const nextProject = {
        ...project,
        sourceText,
        sourceMode: 'paste',
        passages: nextRecognition.passages,
        sections: nextRecognition.sections,
        recognizedQuestions: nextRecognition.questions,
        questionCount: nextRecognition.questions.length || project.questionCount,
        selectedFormats: nextRecognition.inferredFormats.length ? nextRecognition.inferredFormats : project.selectedFormats,
      };
      setRecognition(nextRecognition);
      setProject(nextProject);
      if (nextRecognition.questions.length) {
        rebuild(nextProject, nextRecognition.questions);
        if (navigate) setStep(2);
      } else {
        setOutput(null);
      }
      return nextRecognition;
    } finally {
      setRecognizing(false);
    }
  };

  useEffect(() => {
    if (step !== 1) return undefined;
    const source = String(project.sourceText || '').trim();
    if (!source) {
      setRecognition(null);
      setOutput(null);
      return undefined;
    }
    const timer = window.setTimeout(() => recognize(project.sourceText, false), 700);
    return () => window.clearTimeout(timer);
  }, [project.sourceText, step]);

  useEffect(() => {
    const timer = window.setTimeout(() => saveJson(DRAFT_KEY, { project, savedAt: new Date().toISOString() }), 500);
    return () => window.clearTimeout(timer);
  }, [project]);

  const updateQuestions = (questions) => {
    const normalized = questions.map((question, index) => ({ ...question, no: index + 1, stem: `${index + 1}. ${question.stem.replace(/^\d+\.\s*/, '')}` }));
    const nextProject = { ...project, recognizedQuestions: normalized, questionCount: normalized.length };
    setProject(nextProject);
    rebuild(nextProject, normalized);
  };

  const changeQuestion = (id, patch) => updateQuestions(output.questions.map((question) => question.id === id ? { ...question, ...patch } : question));
  const deleteQuestion = (id) => updateQuestions(output.questions.filter((question) => question.id !== id));
  const duplicateQuestion = (id) => {
    const index = output.questions.findIndex((question) => question.id === id);
    if (index < 0) return;
    const copy = { ...output.questions[index], id: `copy-${Date.now()}`, stem: `${output.questions[index].stem.replace(/^\d+\.\s*/, '')} (variation)` };
    updateQuestions([...output.questions.slice(0, index + 1), copy, ...output.questions.slice(index + 1)]);
  };

  const saveVault = () => {
    if (!output) return;
    const next = [{ id: `exam-${Date.now()}`, title: output.title, project, output, createdAt: new Date().toISOString() }, ...vault].slice(0, 30);
    setVault(next);
    saveJson(VAULT_KEY, next);
  };

  const panels = [
    <StepType key="type" project={project} setProject={setProject} />,
    <StepSource key="source" project={project} setProject={setProject} recognition={recognition} recognizing={recognizing} onRecognize={() => recognize(project.sourceText, false)} onPreview={() => output && setStep(2)} />,
    <StepPreview key="preview" output={output} onQuestionChange={changeQuestion} onDelete={deleteQuestion} onDuplicate={duplicateQuestion} />,
    <StepExport key="export" output={output} onSaveVault={saveVault} vaultCount={vault.length} />,
  ];

  return (
    <div className="page tool-page exam-studio-page real-exam-workflow exam-v946-page exam-v947-page exam-v949-page exam-v95-page exam-v96-page">
      <button className="back-btn" onClick={() => window.history.back()}>← {language === 'vi' ? 'Quay lại' : 'Back'}</button>
      <section className="panel exam-v96-hero-shell exam-v35-hero-shell">
        <div className="exam-v96-hero-main exam-v35-hero-main">
          <div className="exam-v96-hero-art exam-v35-hero-art" aria-hidden="true"><div className="exam-v35-grade-sheet"><span>A+</span><i /><i /><i /></div><div className="exam-v35-builder-window"><div className="exam-v35-window-bar"><span /><span /><span /></div><strong>Import → Recognize → Edit</strong><div className="exam-v35-question-row"><i /><b /><em>✓</em></div><div className="exam-v35-question-row"><i /><b /><em>✓</em></div><div className="exam-v35-question-row"><i /><b /><em>✓</em></div><div className="exam-v35-question-row"><i /><b /><em>✓</em></div></div><div className="exam-v35-type-chips"><span data-tone="blue">MCQ</span><span data-tone="amber">Cloze</span><span data-tone="green">Reading</span></div><div className="exam-v35-preview-tile"><span>◉</span><b>Preview</b></div><div className="exam-v35-export-tile"><span>⇧</span><b>Export</b></div><div className="exam-v35-pencil-cup"><i /><i /><i /></div><span className="exam-v35-art-path" /></div>
          <div className="exam-v96-hero-copy exam-v35-hero-copy"><span className="exam-v96-tag exam-v35-tag">Exam Studio • Automatic source recognition</span><h1>{title}</h1><p>Nhập đề từ PDF, DOCX hoặc văn bản; hệ thống tự nhận dạng, chuẩn hoá, preview, chỉnh sửa và xuất file mà không dùng AI.</p><div className="exam-v35-feature-list"><span><i>✓</i>Upload / Paste</span><span><i>✓</i>Nhận dạng tự động</span><span><i>✓</i>File mẫu đầy đủ</span></div></div>
        </div>
        <div className="exam-v96-stat-grid exam-v35-action-grid"><button type="button" className="exam-v96-stat-card exam-v35-action-card" onClick={() => setStep(1)}><span className="exam-v35-action-icon is-auto">✓</span><span className="exam-v35-action-copy"><strong>Nhận dạng tự động</strong><small>Cục bộ · Không AI · Không API</small></span><em className="exam-v35-ready-pill is-local">Sẵn sàng</em><i className="exam-v35-action-arrow">›</i></button><button type="button" className="exam-v96-stat-card exam-v35-action-card" onClick={() => setStep(1)}><span className="exam-v35-action-icon is-upload">⇧</span><span className="exam-v35-action-copy"><strong>Upload / Paste</strong><small>{project.sourceFileName || 'PDF · DOCX · TXT · MD'}</small></span><i className="exam-v35-action-arrow">›</i></button><button type="button" className="exam-v96-stat-card exam-v35-action-card" onClick={() => output && setStep(2)} aria-disabled={!output}><span className="exam-v35-action-icon is-draft">▤</span><span className="exam-v35-action-copy"><strong>{output ? 'Preview' : 'Draft'}</strong><small>{output ? `${output.questions.length} câu đã sẵn sàng` : 'Chưa có output'}</small></span><i className="exam-v35-action-arrow">›</i></button></div>
      </section>
      <SummaryCard project={project} output={output} recognition={recognition} />
      <Stepper step={step} output={output} setStep={setStep} />
      <section className="exam-workspace-grid exam-workspace-grid-v947 exam-v96-workspace exam-v35-workspace"><main className="exam-center-workflow exam-v96-center">{panels[step]}<div className="exam-footer-actions exam-footer-actions-v946 exam-v96-footer-actions"><button onClick={() => setStep((value) => Math.max(0, value - 1))} disabled={step === 0}>Quay lại</button><button onClick={() => saveJson(DRAFT_KEY, { project, savedAt: new Date().toISOString() })}>Lưu nháp</button>{step === 0 ? <button className="primary" onClick={() => setStep(1)}>Tiếp tục</button> : null}{step === 1 ? <><button onClick={() => recognize(project.sourceText, false)} disabled={!project.sourceText?.trim() || recognizing}>Nhận dạng lại</button><button className="primary" onClick={() => output && setStep(2)} disabled={!output}>Mở Preview</button></> : null}{step === 2 ? <button className="primary" onClick={() => setStep(3)}>Xuất file</button> : null}{step === 3 ? <button className="primary" onClick={() => setStep(0)}>Hoàn tất</button> : null}</div></main></section>
    </div>
  );
}
