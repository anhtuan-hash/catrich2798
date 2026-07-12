import React, { useEffect, useMemo, useRef, useState } from 'react';
import { callAI, extractJson } from '../utils/gemini.js';
import { readDocxTextFromBuffer, readPdfTextFromBuffer } from '../utils/documentParsers.js';
import { addBankItems, addHistoryEntry } from '../utils/library.js';
import {
  WORKSHEET_ACTIVITY_TYPES,
  auditWorksheet,
  buildWorksheetPrompt,
  extractKeywords,
  generateOfflineWorksheet,
  normalizeWorksheet,
  shuffleWorksheet,
  splitSourceUnits,
  worksheetMcqBankItems,
  worksheetToDocxBlob,
  worksheetToHtml,
  worksheetToPlainText,
} from '../utils/worksheetFactory.js';
import './WorksheetFactory.css';

const STEPS = [
  { id: 1, vi: 'Nguồn', en: 'Source' },
  { id: 2, vi: 'Cấu hình', en: 'Configure' },
  { id: 3, vi: 'Tạo phiếu', en: 'Generate' },
  { id: 4, vi: 'Biên tập & xuất', en: 'Edit & export' },
];

const PRESETS = [
  {
    id: 'mixed',
    titleVi: 'Phiếu tổng hợp B2',
    title: 'Mixed B2 Worksheet',
    descVi: 'Trắc nghiệm, điền từ, word form và đọc hiểu.',
    desc: 'MCQ, gap fill, word formation and reading.',
    types: ['multiple_choice', 'gap_fill', 'word_formation', 'reading_comprehension'],
  },
  {
    id: 'vocabulary',
    titleVi: 'Ôn từ vựng',
    title: 'Vocabulary Review',
    descVi: 'Nối cặp, ngữ cảnh, điền từ và word family.',
    desc: 'Matching, context, gaps and word families.',
    types: ['matching', 'vocabulary_context', 'gap_fill', 'word_formation'],
  },
  {
    id: 'grammar',
    titleVi: 'Ngữ pháp chuyên sâu',
    title: 'Grammar Intensive',
    descVi: 'MCQ, sửa lỗi, viết lại câu và cloze.',
    desc: 'MCQ, correction, transformations and cloze.',
    types: ['multiple_choice', 'error_correction', 'sentence_transformation', 'cloze'],
  },
  {
    id: 'reading',
    titleVi: 'Đọc hiểu',
    title: 'Reading Package',
    descVi: 'Đọc hiểu, đúng/sai và từ vựng ngữ cảnh.',
    desc: 'Comprehension, true/false and vocabulary.',
    types: ['reading_comprehension', 'true_false', 'vocabulary_context'],
  },
  {
    id: 'thpt',
    titleVi: 'Luyện thi THPT',
    title: 'THPT Exam Practice',
    descVi: 'MCQ, cloze, word form và viết lại câu.',
    desc: 'MCQ, cloze, word formation and rewriting.',
    types: ['multiple_choice', 'cloze', 'word_formation', 'sentence_transformation'],
  },
];

const SAMPLE_SOURCE = `Artificial intelligence is rapidly changing education. Teachers can use AI to create differentiated materials, provide faster feedback, and analyze learning patterns. However, effective use requires clear objectives, careful checking, and attention to student privacy. AI should support teachers rather than replace professional judgment. Students also need guidance so that they use these tools responsibly and continue developing independent thinking skills.`;

function safeFileName(value = 'worksheet') {
  return String(value || 'worksheet')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9-_]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 80) || 'worksheet';
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1200);
}

function downloadText(content, filename, mime = 'text/plain;charset=utf-8') {
  downloadBlob(new Blob([content], { type: mime }), filename);
}

async function readPptxText(arrayBuffer) {
  const { default: JSZip } = await import('jszip');
  const zip = await JSZip.loadAsync(arrayBuffer);
  const slideFiles = Object.keys(zip.files)
    .filter((name) => /^ppt\/slides\/slide\d+\.xml$/i.test(name))
    .sort((a, b) => Number(a.match(/slide(\d+)/i)?.[1] || 0) - Number(b.match(/slide(\d+)/i)?.[1] || 0));
  const chunks = [];
  for (const fileName of slideFiles.slice(0, 80)) {
    const xml = await zip.file(fileName)?.async('text');
    if (!xml) continue;
    const doc = new DOMParser().parseFromString(xml, 'application/xml');
    const lines = [...doc.getElementsByTagNameNS('*', 't')].map((node) => node.textContent || '').filter(Boolean);
    if (lines.length) chunks.push(`--- ${fileName.split('/').pop()} ---\n${lines.join('\n')}`);
  }
  return chunks.join('\n\n');
}

async function readSpreadsheetText(arrayBuffer) {
  const XLSX = await import('xlsx');
  const workbook = XLSX.read(arrayBuffer, { type: 'array' });
  return workbook.SheetNames.slice(0, 12).map((name) => {
    const sheet = workbook.Sheets[name];
    const csv = XLSX.utils.sheet_to_csv(sheet, { blankrows: false });
    return `--- Sheet: ${name} ---\n${csv}`;
  }).join('\n\n');
}

function stripHtml(html = '') {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  return doc.body?.innerText || '';
}

async function readSourceFile(file) {
  const extension = file.name.split('.').pop()?.toLowerCase() || '';
  const arrayBuffer = await file.arrayBuffer();
  if (extension === 'pdf') return readPdfTextFromBuffer(arrayBuffer, { maxPages: 50, maxChars: 120000 });
  if (extension === 'docx') return readDocxTextFromBuffer(arrayBuffer);
  if (extension === 'pptx') return readPptxText(arrayBuffer);
  if (['xlsx', 'xls'].includes(extension)) return readSpreadsheetText(arrayBuffer);
  const raw = await file.text();
  if (['html', 'htm'].includes(extension)) return stripHtml(raw);
  if (extension === 'json') {
    try { return JSON.stringify(JSON.parse(raw), null, 2); } catch { return raw; }
  }
  return raw;
}

function ActionIcon({ children }) {
  return <span className="wf-action-icon" aria-hidden="true">{children}</span>;
}

function StepNavigation({ step, setStep, language, hasWorksheet }) {
  return (
    <nav className="wf-steps" aria-label="Worksheet workflow">
      {STEPS.map((item) => {
        const disabled = item.id === 4 && !hasWorksheet;
        return (
          <button
            key={item.id}
            type="button"
            className={`${step === item.id ? 'active' : ''} ${disabled ? 'disabled' : ''}`}
            onClick={() => { if (!disabled) setStep(item.id); }}
          >
            <span>{item.id}</span>
            <strong>{language === 'vi' ? item.vi : item.en}</strong>
          </button>
        );
      })}
    </nav>
  );
}

function SourceStep({ language, sourceText, setSourceText, sourceName, setSourceName, topic, setTopic, onNext }) {
  const [sourceMode, setSourceMode] = useState('paste');
  const [fileBusy, setFileBusy] = useState(false);
  const [fileError, setFileError] = useState('');
  const fileInputRef = useRef(null);
  const units = useMemo(() => splitSourceUnits(sourceText), [sourceText]);
  const keywords = useMemo(() => extractKeywords(sourceText, 12), [sourceText]);
  const wordCount = useMemo(() => sourceText.trim() ? sourceText.trim().split(/\s+/).length : 0, [sourceText]);

  const handleFile = async (file) => {
    if (!file) return;
    setFileBusy(true);
    setFileError('');
    try {
      const content = await readSourceFile(file);
      if (!content.trim()) throw new Error(language === 'vi' ? 'Không đọc được nội dung chữ trong file.' : 'No readable text was found in the file.');
      setSourceText(content.slice(0, 120000));
      setSourceName(file.name);
      setSourceMode('paste');
    } catch (error) {
      setFileError(error?.message || (language === 'vi' ? 'Không thể đọc file.' : 'Could not read the file.'));
    } finally {
      setFileBusy(false);
    }
  };

  return (
    <section className="wf-step-grid wf-source-step">
      <div className="wf-panel wf-source-panel">
        <div className="wf-panel-heading">
          <div>
            <span className="wf-kicker">01 · {language === 'vi' ? 'Nguồn nội dung' : 'Source material'}</span>
            <h2>{language === 'vi' ? 'Đưa nội dung vào nhà máy' : 'Feed the worksheet factory'}</h2>
          </div>
          <button type="button" className="wf-text-button" onClick={() => { setSourceText(SAMPLE_SOURCE); setSourceName('AI in Education — sample'); }}>
            {language === 'vi' ? 'Dùng nội dung mẫu' : 'Use sample'}
          </button>
        </div>

        <div className="wf-source-tabs">
          <button type="button" className={sourceMode === 'paste' ? 'active' : ''} onClick={() => setSourceMode('paste')}>{language === 'vi' ? 'Dán văn bản' : 'Paste text'}</button>
          <button type="button" className={sourceMode === 'upload' ? 'active' : ''} onClick={() => setSourceMode('upload')}>{language === 'vi' ? 'Tải file' : 'Upload file'}</button>
          <button type="button" className={sourceMode === 'topic' ? 'active' : ''} onClick={() => setSourceMode('topic')}>{language === 'vi' ? 'Chỉ nhập chủ đề' : 'Topic only'}</button>
        </div>

        {sourceMode === 'paste' && (
          <div className="wf-input-stack">
            <label>
              <span>{language === 'vi' ? 'Tên nguồn' : 'Source name'}</span>
              <input value={sourceName} onChange={(event) => setSourceName(event.target.value)} placeholder={language === 'vi' ? 'Ví dụ: Unit 2 — A multicultural world' : 'Example: Unit 2 — A multicultural world'} />
            </label>
            <label>
              <span>{language === 'vi' ? 'Văn bản, danh sách từ hoặc ghi chú bài học' : 'Text, vocabulary list or lesson notes'}</span>
              <textarea data-transfer-target="primary" value={sourceText} onChange={(event) => setSourceText(event.target.value)} rows={15} placeholder={language === 'vi' ? 'Dán nội dung tại đây…' : 'Paste source content here…'} />
            </label>
          </div>
        )}

        {sourceMode === 'upload' && (
          <div className="wf-upload-zone" onClick={() => fileInputRef.current?.click()} onDragOver={(event) => event.preventDefault()} onDrop={(event) => { event.preventDefault(); handleFile(event.dataTransfer.files?.[0]); }}>
            <input ref={fileInputRef} type="file" hidden accept=".pdf,.docx,.pptx,.xlsx,.xls,.txt,.md,.csv,.json,.html,.htm" onChange={(event) => handleFile(event.target.files?.[0])} />
            <div className="wf-upload-illustration"><span>PDF</span><span>DOCX</span><span>PPTX</span></div>
            <h3>{fileBusy ? (language === 'vi' ? 'Đang đọc tài liệu…' : 'Reading document…') : (language === 'vi' ? 'Thả file vào đây hoặc nhấn để chọn' : 'Drop a file here or click to browse')}</h3>
            <p>{language === 'vi' ? 'Hỗ trợ PDF, Word, PowerPoint, Excel, TXT, Markdown, CSV, JSON và HTML.' : 'Supports PDF, Word, PowerPoint, Excel, TXT, Markdown, CSV, JSON and HTML.'}</p>
            {fileError && <div className="wf-inline-error">{fileError}</div>}
          </div>
        )}

        {sourceMode === 'topic' && (
          <div className="wf-topic-only-card">
            <label>
              <span>{language === 'vi' ? 'Chủ đề hoặc yêu cầu' : 'Topic or request'}</span>
              <textarea value={topic} onChange={(event) => setTopic(event.target.value)} rows={8} placeholder={language === 'vi' ? 'Ví dụ: Tạo phiếu ôn 12 thì tiếng Anh, B2-C1, dành cho học sinh lớp 12…' : 'Example: Create a B2-C1 worksheet reviewing the 12 English tenses for grade 12…'} />
            </label>
            <p>{language === 'vi' ? 'Chế độ này cần AI để tạo nội dung đầy đủ. Khi chưa cấu hình AI, hệ thống tạo một bản nháp offline cơ bản.' : 'This mode works best with AI. Without an AI key, the app creates a basic offline draft.'}</p>
          </div>
        )}

        <div className="wf-step-actions">
          <span>{language === 'vi' ? 'Nội dung được xử lý trên trình duyệt trước khi gửi tới AI.' : 'Files are parsed in your browser before content is sent to AI.'}</span>
          <button type="button" className="wf-primary" disabled={!sourceText.trim() && !topic.trim()} onClick={onNext}>
            {language === 'vi' ? 'Tiếp tục cấu hình' : 'Continue to settings'} <ActionIcon>→</ActionIcon>
          </button>
        </div>
      </div>

      <aside className="wf-panel wf-source-insight">
        <span className="wf-kicker">{language === 'vi' ? 'Phân tích nguồn' : 'Source analysis'}</span>
        <h2>{sourceName || (language === 'vi' ? 'Chưa đặt tên nguồn' : 'Untitled source')}</h2>
        <div className="wf-source-metrics">
          <div><strong>{wordCount.toLocaleString()}</strong><span>{language === 'vi' ? 'từ' : 'words'}</span></div>
          <div><strong>{units.length}</strong><span>{language === 'vi' ? 'đơn vị nội dung' : 'content units'}</span></div>
          <div><strong>{sourceText.length.toLocaleString()}</strong><span>{language === 'vi' ? 'ký tự' : 'characters'}</span></div>
        </div>
        <div className="wf-keyword-cloud">
          <h3>{language === 'vi' ? 'Từ khóa phát hiện' : 'Detected keywords'}</h3>
          <div>{keywords.length ? keywords.map((keyword) => <span key={keyword}>{keyword}</span>) : <p>{language === 'vi' ? 'Dán nội dung để hệ thống phân tích.' : 'Paste content to begin analysis.'}</p>}</div>
        </div>
        <div className="wf-source-preview">
          <h3>{language === 'vi' ? 'Xem trước nguồn' : 'Source preview'}</h3>
          <p>{sourceText.slice(0, 850) || topic || (language === 'vi' ? 'Chưa có nội dung.' : 'No source content yet.')}</p>
        </div>
      </aside>
    </section>
  );
}

function ConfigureStep({ language, selectedTypes, setSelectedTypes, settings, setSettings, onBack, onNext }) {
  const toggleType = (id) => {
    setSelectedTypes((current) => current.includes(id) ? current.filter((type) => type !== id) : [...current, id].slice(0, 8));
  };

  const applyPreset = (preset) => {
    setSelectedTypes(preset.types);
    setSettings((current) => ({ ...current, title: language === 'vi' ? preset.titleVi : preset.title }));
  };

  return (
    <section className="wf-config-layout">
      <div className="wf-panel wf-config-main">
        <div className="wf-panel-heading">
          <div>
            <span className="wf-kicker">02 · {language === 'vi' ? 'Cấu hình nội dung' : 'Configure content'}</span>
            <h2>{language === 'vi' ? 'Chọn dạng bài cần tạo' : 'Choose worksheet activities'}</h2>
          </div>
          <span className="wf-count-pill">{selectedTypes.length} {language === 'vi' ? 'dạng đã chọn' : 'selected'}</span>
        </div>

        <div className="wf-preset-row">
          {PRESETS.map((preset) => (
            <button type="button" key={preset.id} onClick={() => applyPreset(preset)}>
              <strong>{language === 'vi' ? preset.titleVi : preset.title}</strong>
              <span>{language === 'vi' ? preset.descVi : preset.desc}</span>
            </button>
          ))}
        </div>

        <div className="wf-activity-type-grid">
          {WORKSHEET_ACTIVITY_TYPES.map((type) => {
            const active = selectedTypes.includes(type.id);
            return (
              <button type="button" key={type.id} className={active ? 'active' : ''} onClick={() => toggleType(type.id)}>
                <span className="wf-type-icon">{type.icon}</span>
                <strong>{language === 'vi' ? type.labelVi : type.label}</strong>
                <small>{language === 'vi' ? type.descVi : type.desc}</small>
                <i>{active ? '✓' : '+'}</i>
              </button>
            );
          })}
        </div>
      </div>

      <aside className="wf-panel wf-settings-panel">
        <span className="wf-kicker">{language === 'vi' ? 'Thông số phiếu' : 'Worksheet settings'}</span>
        <div className="wf-settings-form">
          <label>
            <span>{language === 'vi' ? 'Tiêu đề phiếu' : 'Worksheet title'}</span>
            <input value={settings.title} onChange={(event) => setSettings({ ...settings, title: event.target.value })} />
          </label>
          <div className="wf-two-fields">
            <label>
              <span>CEFR</span>
              <select value={settings.level} onChange={(event) => setSettings({ ...settings, level: event.target.value })}>
                {['A1', 'A2', 'B1', 'B2', 'C1', 'C2', 'B2-C1'].map((level) => <option key={level}>{level}</option>)}
              </select>
            </label>
            <label>
              <span>{language === 'vi' ? 'Đối tượng' : 'Audience'}</span>
              <select value={settings.audience} onChange={(event) => setSettings({ ...settings, audience: event.target.value })}>
                <option>THCS</option><option>THPT</option><option>Grade 12</option><option>HSG</option><option>Adult</option><option>University</option>
              </select>
            </label>
          </div>
          <label>
            <span>{language === 'vi' ? 'Số câu mỗi hoạt động' : 'Items per activity'}</span>
            <div className="wf-range-line">
              <input type="range" min="2" max="20" value={settings.itemsPerActivity} onChange={(event) => setSettings({ ...settings, itemsPerActivity: Number(event.target.value) })} />
              <strong>{settings.itemsPerActivity}</strong>
            </div>
          </label>
          <label>
            <span>{language === 'vi' ? 'Chủ đề / trọng tâm' : 'Topic / focus'}</span>
            <input value={settings.topic} onChange={(event) => setSettings({ ...settings, topic: event.target.value })} placeholder={language === 'vi' ? 'Ví dụ: Verb forms, environment…' : 'Example: Verb forms, environment…'} />
          </label>
          <label>
            <span>{language === 'vi' ? 'Yêu cầu riêng' : 'Additional instruction'}</span>
            <textarea rows={4} value={settings.customInstruction} onChange={(event) => setSettings({ ...settings, customInstruction: event.target.value })} placeholder={language === 'vi' ? 'Ví dụ: Không trùng content words; bám cấu trúc đề THPT…' : 'Example: Avoid repeated content words; follow THPT format…'} />
          </label>
          <label className="wf-check-row"><input type="checkbox" checked={settings.includeExplanations} onChange={(event) => setSettings({ ...settings, includeExplanations: event.target.checked })} /><span>{language === 'vi' ? 'Kèm giải thích đáp án' : 'Include answer explanations'}</span></label>
          <label className="wf-check-row"><input type="checkbox" checked={settings.avoidRepeatedContentWords} onChange={(event) => setSettings({ ...settings, avoidRepeatedContentWords: event.target.checked })} /><span>{language === 'vi' ? 'Hạn chế trùng content words' : 'Avoid repeated content words'}</span></label>
        </div>
        <div className="wf-step-actions vertical">
          <button type="button" className="wf-secondary" onClick={onBack}>← {language === 'vi' ? 'Quay lại' : 'Back'}</button>
          <button type="button" className="wf-primary" disabled={!selectedTypes.length} onClick={onNext}>{language === 'vi' ? 'Kiểm tra trước khi tạo' : 'Review generation'} →</button>
        </div>
      </aside>
    </section>
  );
}

function GenerateStep({ language, hasApiKey, providerName, sourceText, sourceName, settings, selectedTypes, busy, error, message, onBack, onGenerate }) {
  const estimatedItems = selectedTypes.length * settings.itemsPerActivity;
  return (
    <section className="wf-generation-layout">
      <div className="wf-panel wf-generation-card">
        <div className="wf-generation-visual" aria-hidden="true">
          <div className="wf-sheet-stack"><i /><i /><i /></div>
          <div className={`wf-factory-machine ${busy ? 'running' : ''}`}><span>WF</span><b>AI</b></div>
        </div>
        <div className="wf-generation-copy">
          <span className="wf-kicker">03 · {language === 'vi' ? 'Sẵn sàng sản xuất' : 'Ready to manufacture'}</span>
          <h2>{language === 'vi' ? 'Tạo một phiếu học tập hoàn chỉnh' : 'Generate a complete worksheet'}</h2>
          <p>{hasApiKey
            ? (language === 'vi' ? `Brian AI sẽ dùng ${providerName || 'provider đã cấu hình'} để tạo nội dung, đáp án và giải thích.` : `Brian AI will use ${providerName || 'your configured provider'} to create tasks, answers and explanations.`)
            : (language === 'vi' ? 'Chưa cấu hình AI. Ứng dụng vẫn tạo một bản nháp offline từ nội dung nguồn.' : 'No AI provider is configured. The app can still create an offline starter draft from your source.')}
          </p>
          <div className="wf-generation-summary">
            <div><span>{language === 'vi' ? 'Nguồn' : 'Source'}</span><strong>{sourceName || settings.topic || (language === 'vi' ? 'Văn bản dán' : 'Pasted text')}</strong></div>
            <div><span>{language === 'vi' ? 'Trình độ' : 'Level'}</span><strong>{settings.level} · {settings.audience}</strong></div>
            <div><span>{language === 'vi' ? 'Hoạt động' : 'Activities'}</span><strong>{selectedTypes.length}</strong></div>
            <div><span>{language === 'vi' ? 'Số câu dự kiến' : 'Estimated items'}</span><strong>{estimatedItems}</strong></div>
            <div><span>{language === 'vi' ? 'Độ dài nguồn' : 'Source length'}</span><strong>{sourceText.length.toLocaleString()} {language === 'vi' ? 'ký tự' : 'characters'}</strong></div>
            <div><span>{language === 'vi' ? 'Chế độ' : 'Mode'}</span><strong>{hasApiKey ? 'AI Factory' : 'Offline Draft'}</strong></div>
          </div>
          {error && <div className="wf-generation-error">{error}</div>}
          {message && <div className="wf-generation-message">{message}</div>}
          <div className="wf-generation-actions">
            <button type="button" className="wf-secondary" onClick={onBack} disabled={busy}>← {language === 'vi' ? 'Chỉnh cấu hình' : 'Edit settings'}</button>
            <button type="button" className="wf-primary wf-generate-button" onClick={onGenerate} disabled={busy}>
              {busy ? <><span className="wf-spinner" /> {language === 'vi' ? 'Đang tạo phiếu…' : 'Generating…'}</> : <><ActionIcon>✦</ActionIcon> {hasApiKey ? (language === 'vi' ? 'Tạo bằng Brian AI' : 'Generate with Brian AI') : (language === 'vi' ? 'Tạo bản nháp offline' : 'Create offline draft')}</>}
            </button>
          </div>
        </div>
      </div>
      <aside className="wf-panel wf-quality-promise">
        <span className="wf-kicker">{language === 'vi' ? 'Kiểm soát chất lượng' : 'Quality controls'}</span>
        <h3>{language === 'vi' ? 'Factory checklist' : 'Factory checklist'}</h3>
        <ul>
          <li><span>✓</span>{language === 'vi' ? 'Mỗi dạng bài có hướng dẫn rõ ràng' : 'Clear instructions for every activity'}</li>
          <li><span>✓</span>{language === 'vi' ? 'Đáp án và giải thích tách riêng' : 'Separate answers and explanations'}</li>
          <li><span>✓</span>{language === 'vi' ? 'Phát hiện câu trùng và phương án lỗi' : 'Duplicate and option validation'}</li>
          <li><span>✓</span>{language === 'vi' ? 'Xuất Word, HTML, JSON và PDF qua Print' : 'Word, HTML, JSON and print/PDF export'}</li>
          <li><span>✓</span>{language === 'vi' ? 'Lưu vào thư viện và ngân hàng câu hỏi' : 'Save to Library and Question Bank'}</li>
        </ul>
      </aside>
    </section>
  );
}

function QualityCard({ audit, language }) {
  const grade = audit.score >= 95 ? 'A+' : audit.score >= 85 ? 'A' : audit.score >= 70 ? 'B' : 'C';
  return (
    <aside className={`wf-quality-card ${audit.passed ? 'passed' : 'needs-review'}`}>
      <div className="wf-quality-score"><strong>{audit.score}</strong><span>/100</span><b>{grade}</b></div>
      <div>
        <h3>{language === 'vi' ? 'Kiểm tra chất lượng' : 'Quality audit'}</h3>
        <p>{audit.passed ? (language === 'vi' ? 'Phiếu đã sẵn sàng để rà soát cuối.' : 'The worksheet is ready for final review.') : (language === 'vi' ? 'Cần kiểm tra một số mục được đánh dấu.' : 'Review the flagged items before use.')}</p>
        <div className="wf-quality-tags">
          <span>{audit.totalItems} {language === 'vi' ? 'câu' : 'items'}</span>
          <span>{audit.exactDuplicates.length} {language === 'vi' ? 'trùng chính xác' : 'exact duplicates'}</span>
          <span>{audit.nearDuplicates.length} {language === 'vi' ? 'gần trùng' : 'near duplicates'}</span>
          <span>{audit.missingAnswers.length} {language === 'vi' ? 'thiếu đáp án' : 'missing answers'}</span>
          <span>{audit.invalidOptions.length} {language === 'vi' ? 'lỗi phương án' : 'option issues'}</span>
        </div>
      </div>
    </aside>
  );
}

function WorksheetPreview({ worksheet, teacherVersion, language }) {
  const html = useMemo(() => worksheetToHtml(worksheet, { teacherVersion, language, standalone: false }), [worksheet, teacherVersion, language]);
  return <div className={`wf-paper-preview ${teacherVersion ? 'teacher-version' : 'student-version'}`} dangerouslySetInnerHTML={{ __html: html }} />;
}

function ItemEditor({ item, activityType, onChange, onDelete, language }) {
  const hasOptions = ['multiple_choice', 'vocabulary_context', 'reading_comprehension', 'true_false'].includes(activityType) || item.options.length;
  return (
    <div className="wf-item-editor">
      <div className="wf-item-editor-head">
        <span>{language === 'vi' ? 'Câu hỏi / nhiệm vụ' : 'Question / task'}</span>
        <button type="button" onClick={onDelete} title={language === 'vi' ? 'Xóa câu' : 'Delete item'}>×</button>
      </div>
      <textarea rows={3} value={item.prompt} onChange={(event) => onChange({ ...item, prompt: event.target.value })} />
      {hasOptions && (
        <label>
          <span>{language === 'vi' ? 'Phương án — mỗi dòng một phương án' : 'Options — one per line'}</span>
          <textarea rows={4} value={item.options.join('\n')} onChange={(event) => onChange({ ...item, options: event.target.value.split('\n').map((value) => value.trim()).filter(Boolean) })} />
        </label>
      )}
      <div className="wf-item-editor-grid">
        <label><span>{language === 'vi' ? 'Đáp án' : 'Answer'}</span><input value={item.answer} onChange={(event) => onChange({ ...item, answer: event.target.value })} /></label>
        <label><span>{language === 'vi' ? 'Giải thích' : 'Explanation'}</span><input value={item.explanation} onChange={(event) => onChange({ ...item, explanation: event.target.value })} /></label>
      </div>
    </div>
  );
}

function WorksheetEditor({ worksheet, setWorksheet, language }) {
  const updateActivity = (activityIndex, patch) => {
    setWorksheet((current) => ({ ...current, activities: current.activities.map((activity, index) => index === activityIndex ? { ...activity, ...patch } : activity) }));
  };
  const deleteActivity = (activityIndex) => setWorksheet((current) => ({ ...current, activities: current.activities.filter((_, index) => index !== activityIndex) }));
  const moveActivity = (activityIndex, direction) => {
    setWorksheet((current) => {
      const activities = [...current.activities];
      const target = activityIndex + direction;
      if (target < 0 || target >= activities.length) return current;
      [activities[activityIndex], activities[target]] = [activities[target], activities[activityIndex]];
      return { ...current, activities };
    });
  };
  const addItem = (activityIndex) => {
    const activity = worksheet.activities[activityIndex];
    updateActivity(activityIndex, { items: [...activity.items, { id: `item-${Date.now()}`, prompt: '', options: ['multiple_choice', 'vocabulary_context', 'reading_comprehension'].includes(activity.type) ? ['', '', '', ''] : [], answer: '', explanation: '' }] });
  };

  return (
    <div className="wf-editor-form">
      <div className="wf-editor-header-fields">
        <label><span>{language === 'vi' ? 'Tiêu đề' : 'Title'}</span><input value={worksheet.title} onChange={(event) => setWorksheet({ ...worksheet, title: event.target.value })} /></label>
        <label><span>{language === 'vi' ? 'Dòng mô tả' : 'Subtitle'}</span><input value={worksheet.subtitle} onChange={(event) => setWorksheet({ ...worksheet, subtitle: event.target.value })} /></label>
      </div>
      {worksheet.activities.map((activity, activityIndex) => (
        <section className="wf-activity-editor" key={activity.id}>
          <header>
            <div><span>{String(activityIndex + 1).padStart(2, '0')}</span><strong>{activity.title}</strong><small>{activity.type.replaceAll('_', ' ')}</small></div>
            <div><button type="button" onClick={() => moveActivity(activityIndex, -1)}>↑</button><button type="button" onClick={() => moveActivity(activityIndex, 1)}>↓</button><button type="button" onClick={() => deleteActivity(activityIndex)}>×</button></div>
          </header>
          <div className="wf-activity-editor-fields">
            <label><span>{language === 'vi' ? 'Tên hoạt động' : 'Activity title'}</span><input value={activity.title} onChange={(event) => updateActivity(activityIndex, { title: event.target.value })} /></label>
            <label><span>{language === 'vi' ? 'Hướng dẫn' : 'Instructions'}</span><input value={activity.instructions} onChange={(event) => updateActivity(activityIndex, { instructions: event.target.value })} /></label>
            {activity.passage !== undefined && <label><span>{language === 'vi' ? 'Đoạn văn chung' : 'Shared passage'}</span><textarea rows={5} value={activity.passage || ''} onChange={(event) => updateActivity(activityIndex, { passage: event.target.value })} /></label>}
          </div>
          <div className="wf-item-editor-list">
            {activity.items.map((item, itemIndex) => (
              <ItemEditor
                key={item.id}
                item={item}
                activityType={activity.type}
                language={language}
                onDelete={() => updateActivity(activityIndex, { items: activity.items.filter((_, index) => index !== itemIndex) })}
                onChange={(next) => updateActivity(activityIndex, { items: activity.items.map((current, index) => index === itemIndex ? next : current) })}
              />
            ))}
          </div>
          <button type="button" className="wf-add-item" onClick={() => addItem(activityIndex)}>+ {language === 'vi' ? 'Thêm câu hỏi' : 'Add item'}</button>
        </section>
      ))}
    </div>
  );
}

function ResultStep({ language, worksheet, setWorksheet, audit, onBack, exportActions, statusMessage }) {
  const [view, setView] = useState('preview');
  const [teacherVersion, setTeacherVersion] = useState(false);
  return (
    <section className="wf-result-step">
      <div className="wf-result-toolbar">
        <div className="wf-result-tabs">
          <button type="button" className={view === 'preview' ? 'active' : ''} onClick={() => setView('preview')}>{language === 'vi' ? 'Xem trước' : 'Preview'}</button>
          <button type="button" className={view === 'edit' ? 'active' : ''} onClick={() => setView('edit')}>{language === 'vi' ? 'Biên tập' : 'Edit'}</button>
          <button type="button" className={view === 'quality' ? 'active' : ''} onClick={() => setView('quality')}>{language === 'vi' ? 'Chất lượng' : 'Quality'}</button>
        </div>
        <div className="wf-version-toggle">
          <button type="button" className={!teacherVersion ? 'active' : ''} onClick={() => setTeacherVersion(false)}>{language === 'vi' ? 'Bản học sinh' : 'Student'}</button>
          <button type="button" className={teacherVersion ? 'active' : ''} onClick={() => setTeacherVersion(true)}>{language === 'vi' ? 'Bản giáo viên' : 'Teacher'}</button>
        </div>
      </div>

      <QualityCard audit={audit} language={language} />
      {statusMessage && <div className="wf-result-message">{statusMessage}</div>}

      <div className="wf-result-layout">
        <div className="wf-result-main">
          {view === 'preview' && <WorksheetPreview worksheet={worksheet} teacherVersion={teacherVersion} language={language} />}
          {view === 'edit' && <WorksheetEditor worksheet={worksheet} setWorksheet={setWorksheet} language={language} />}
          {view === 'quality' && (
            <div className="wf-panel wf-audit-detail">
              <h2>{language === 'vi' ? 'Báo cáo kiểm tra tự động' : 'Automated quality report'}</h2>
              <div className="wf-audit-grid">
                <article><strong>{audit.exactDuplicates.length}</strong><span>{language === 'vi' ? 'Câu trùng chính xác' : 'Exact duplicates'}</span><p>{audit.exactDuplicates.length ? audit.exactDuplicates.map((pair) => `#${pair[0]} ↔ #${pair[1]}`).join(', ') : (language === 'vi' ? 'Không phát hiện.' : 'None detected.')}</p></article>
                <article><strong>{audit.nearDuplicates.length}</strong><span>{language === 'vi' ? 'Câu gần trùng' : 'Near duplicates'}</span><p>{audit.nearDuplicates.length ? audit.nearDuplicates.slice(0, 8).map((pair) => `#${pair[0]} ↔ #${pair[1]} (${Math.round(pair[2] * 100)}%)`).join(', ') : (language === 'vi' ? 'Không phát hiện.' : 'None detected.')}</p></article>
                <article><strong>{audit.missingAnswers.length}</strong><span>{language === 'vi' ? 'Thiếu đáp án' : 'Missing answers'}</span><p>{audit.missingAnswers.length ? audit.missingAnswers.map((index) => `#${index}`).join(', ') : (language === 'vi' ? 'Tất cả câu đều có đáp án.' : 'Every item has an answer.')}</p></article>
                <article><strong>{audit.invalidOptions.length}</strong><span>{language === 'vi' ? 'Lỗi phương án' : 'Option issues'}</span><p>{audit.invalidOptions.length ? audit.invalidOptions.map((index) => `#${index}`).join(', ') : (language === 'vi' ? 'Phương án hợp lệ.' : 'Options are valid.')}</p></article>
              </div>
              <p className="wf-audit-note">{language === 'vi' ? 'Kiểm tra tự động giúp phát hiện lỗi kỹ thuật. Giáo viên vẫn cần đọc lại nội dung, độ chính xác chuyên môn và độ phù hợp với học sinh.' : 'Automated checks detect technical issues. Teachers should still review content accuracy and learner suitability.'}</p>
            </div>
          )}
        </div>

        <aside className="wf-panel wf-export-panel">
          <span className="wf-kicker">04 · {language === 'vi' ? 'Xuất bản' : 'Publish'}</span>
          <h2>{language === 'vi' ? 'Dùng phiếu ở bất cứ đâu' : 'Use the worksheet anywhere'}</h2>
          <p>{language === 'vi' ? 'Xuất đúng phiên bản đang chọn: học sinh hoặc giáo viên.' : 'Exports follow the selected student or teacher version.'}</p>
          <div className="wf-export-buttons">
            <button type="button" onClick={() => exportActions.docx(teacherVersion)}><ActionIcon>W</ActionIcon><span><strong>Word .docx</strong><small>{language === 'vi' ? 'File Word thật, khổ A4' : 'Real Word file, A4 layout'}</small></span></button>
            <button type="button" onClick={() => exportActions.print(teacherVersion)}><ActionIcon>PDF</ActionIcon><span><strong>{language === 'vi' ? 'In / Lưu PDF' : 'Print / Save PDF'}</strong><small>{language === 'vi' ? 'Mở bố cục in sạch' : 'Open clean print layout'}</small></span></button>
            <button type="button" onClick={() => exportActions.html(teacherVersion)}><ActionIcon>&lt;/&gt;</ActionIcon><span><strong>HTML</strong><small>{language === 'vi' ? 'Dùng offline trên trình duyệt' : 'Use offline in a browser'}</small></span></button>
            <button type="button" onClick={exportActions.json}><ActionIcon>{'{ }'}</ActionIcon><span><strong>JSON</strong><small>{language === 'vi' ? 'Lưu dữ liệu có cấu trúc' : 'Structured worksheet data'}</small></span></button>
            <button type="button" onClick={() => exportActions.copy(teacherVersion)}><ActionIcon>⧉</ActionIcon><span><strong>{language === 'vi' ? 'Sao chép văn bản' : 'Copy text'}</strong><small>{language === 'vi' ? 'Dán vào Word hoặc LMS' : 'Paste into Word or LMS'}</small></span></button>
          </div>
          <div className="wf-export-divider" />
          <button type="button" className="wf-library-action" onClick={exportActions.saveLibrary}>☆ {language === 'vi' ? 'Lưu vào Thư viện' : 'Save to Library'}</button>
          <button type="button" className="wf-library-action" onClick={exportActions.addBank}>▣ {language === 'vi' ? 'Đưa MCQ vào ngân hàng câu hỏi' : 'Add MCQs to Question Bank'}</button>
          <button type="button" className="wf-library-action" onClick={() => setWorksheet(shuffleWorksheet(worksheet))}>↻ {language === 'vi' ? 'Đảo câu và phương án' : 'Shuffle items and options'}</button>
          <button type="button" className="wf-secondary full" onClick={onBack}>← {language === 'vi' ? 'Tạo phiếu khác' : 'Create another worksheet'}</button>
        </aside>
      </div>
    </section>
  );
}

export default function WorksheetFactory({ language = 'vi', apiKey = '', aiModel = '', hasApiKey = false, aiSummary = {}, currentUser = null }) {
  const [step, setStep] = useState(1);
  const [sourceText, setSourceText] = useState('');
  const [sourceName, setSourceName] = useState('');
  const [topic, setTopic] = useState('');
  const [selectedTypes, setSelectedTypes] = useState(PRESETS[0].types);
  const [settings, setSettings] = useState({
    title: language === 'vi' ? 'Phiếu học tập tiếng Anh' : 'English Worksheet',
    level: 'B2',
    audience: 'THPT',
    itemsPerActivity: 6,
    topic: '',
    customInstruction: '',
    includeExplanations: true,
    avoidRepeatedContentWords: true,
  });
  const [worksheet, setWorksheet] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [statusMessage, setStatusMessage] = useState('');

  const draftKey = useMemo(() => `bes-worksheet-factory-draft:${currentUser?.id || currentUser?.email || 'guest'}`, [currentUser]);
  const audit = useMemo(() => worksheet ? auditWorksheet(worksheet) : null, [worksheet]);

  useEffect(() => {
    const onAiUseResult = (event) => {
      const detail = event.detail || {};
      if (detail.toolSlug !== 'worksheet-factory' || !String(detail.text || '').trim()) return;
      setSourceText(String(detail.text).trim());
      setSourceName(language === 'vi' ? 'Kết quả từ Brian AI' : 'Brian AI result');
      setStep(1);
      setStatusMessage(language === 'vi' ? 'Đã đưa kết quả AI vào nguồn nội dung của Worksheet Factory.' : 'AI result added to the Worksheet Factory source.');
      detail.markHandled?.();
    };
    const onContentTransfer = (event) => {
      const detail = event.detail || {};
      if (detail.target !== 'worksheet-factory' || !String(detail.content || '').trim()) return;
      setSourceText(String(detail.content).trim());
      setSourceName(String(detail.title || (language === 'vi' ? 'Nội dung được chuyển tới' : 'Transferred content')));
      setStep(1);
      setStatusMessage(language === 'vi' ? `Đã nhận nội dung từ ${detail.sourceTitle || 'ứng dụng khác'}.` : `Received content from ${detail.sourceTitle || 'another app'}.`);
    };
    window.addEventListener('bes-ai-use-result', onAiUseResult);
    window.addEventListener('bes-content-transfer-apply', onContentTransfer);
    return () => {
      window.removeEventListener('bes-ai-use-result', onAiUseResult);
      window.removeEventListener('bes-content-transfer-apply', onContentTransfer);
    };
  }, [language]);

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(draftKey) || 'null');
      if (saved?.worksheet?.activities?.length) {
        setWorksheet(normalizeWorksheet(saved.worksheet, { language }));
        setSourceText(saved.sourceText || '');
        setSourceName(saved.sourceName || '');
        setSettings((current) => ({ ...current, ...(saved.settings || {}) }));
      }
    } catch { /* draft restoration is optional */ }
  }, [draftKey]);

  useEffect(() => {
    if (!worksheet) return;
    try { localStorage.setItem(draftKey, JSON.stringify({ worksheet, sourceText, sourceName, settings })); } catch { /* local autosave is optional */ }
  }, [draftKey, worksheet, sourceText, sourceName, settings]);

  const generateWorksheet = async () => {
    setBusy(true);
    setError('');
    setMessage('');
    const input = {
      sourceText: sourceText || topic,
      sourceName,
      title: settings.title,
      topic: settings.topic || topic,
      level: settings.level,
      audience: settings.audience,
      activityTypes: selectedTypes,
      itemsPerActivity: settings.itemsPerActivity,
      language,
      includeExplanations: settings.includeExplanations,
      avoidRepeatedContentWords: settings.avoidRepeatedContentWords,
      customInstruction: settings.customInstruction,
    };

    try {
      let nextWorksheet;
      if (hasApiKey) {
        const prompt = buildWorksheetPrompt(input);
        const raw = await callAI({
          apiKey,
          model: aiModel,
          prompt,
          systemInstruction: 'You are a meticulous English worksheet designer. Return valid JSON only. Respect every requested activity type, item count, answer and option constraint. Never include markdown fences.',
          temperature: 0.45,
          responseMimeType: 'application/json',
          maxOutputTokens: 8192,
          loadingLabel: language === 'vi' ? 'Worksheet Factory đang tạo phiếu, đáp án và giải thích…' : 'Worksheet Factory is creating tasks, answers and explanations…',
        });
        nextWorksheet = normalizeWorksheet(extractJson(raw), { language });
        const presentTypes = new Set(nextWorksheet.activities.map((activity) => activity.type));
        const missingTypes = selectedTypes.filter((type) => !presentTypes.has(type));
        if (missingTypes.length) {
          const offlineMissing = generateOfflineWorksheet({ ...input, activityTypes: missingTypes });
          nextWorksheet = normalizeWorksheet({ ...nextWorksheet, activities: [...nextWorksheet.activities, ...offlineMissing.activities] }, { language });
          setMessage(language === 'vi' ? `AI thiếu ${missingTypes.length} dạng bài; hệ thống đã bổ sung bản nháp để không mất cấu trúc.` : `AI omitted ${missingTypes.length} activity type(s); offline drafts were added to preserve the requested structure.`);
        }
        if (!nextWorksheet.activities.length) throw new Error(language === 'vi' ? 'AI không trả về hoạt động hợp lệ.' : 'AI returned no valid activities.');
      } else {
        nextWorksheet = generateOfflineWorksheet(input);
        setMessage(language === 'vi' ? 'Đã tạo bản nháp offline. Cấu hình AI để có câu hỏi phong phú và chính xác hơn.' : 'Offline draft created. Configure AI for richer, more accurate questions.');
      }
      setWorksheet(nextWorksheet);
      setStep(4);
      setStatusMessage('');
    } catch (generationError) {
      const fallback = generateOfflineWorksheet(input);
      setWorksheet(fallback);
      setStep(4);
      setError('');
      setStatusMessage(language === 'vi'
        ? `AI gặp lỗi: ${generationError?.message || 'Không xác định'}. Hệ thống đã tạo bản nháp offline để thầy tiếp tục biên tập.`
        : `AI error: ${generationError?.message || 'Unknown error'}. An offline draft was created so you can continue editing.`);
    } finally {
      setBusy(false);
    }
  };

  const exportActions = {
    docx: async (teacherVersion) => {
      if (!worksheet) return;
      setStatusMessage(language === 'vi' ? 'Đang tạo file Word…' : 'Creating Word file…');
      try {
        const blob = await worksheetToDocxBlob(worksheet, { teacherVersion, language });
        downloadBlob(blob, `${safeFileName(worksheet.title)}-${teacherVersion ? 'teacher' : 'student'}.docx`);
        setStatusMessage(language === 'vi' ? 'Đã xuất file Word.' : 'Word file exported.');
      } catch (exportError) {
        setStatusMessage(exportError?.message || (language === 'vi' ? 'Không thể xuất Word.' : 'Could not export Word.'));
      }
    },
    print: (teacherVersion) => {
      if (!worksheet) return;
      const html = worksheetToHtml(worksheet, { teacherVersion, language });
      const printWindow = window.open('', '_blank', 'noopener,noreferrer');
      if (!printWindow) {
        setStatusMessage(language === 'vi' ? 'Trình duyệt đang chặn cửa sổ in. Hãy cho phép pop-up.' : 'The browser blocked the print window. Allow pop-ups and try again.');
        return;
      }
      printWindow.document.open();
      printWindow.document.write(html);
      printWindow.document.close();
      printWindow.addEventListener('load', () => printWindow.print(), { once: true });
    },
    html: (teacherVersion) => {
      if (!worksheet) return;
      downloadText(worksheetToHtml(worksheet, { teacherVersion, language }), `${safeFileName(worksheet.title)}-${teacherVersion ? 'teacher' : 'student'}.html`, 'text/html;charset=utf-8');
      setStatusMessage(language === 'vi' ? 'Đã xuất HTML.' : 'HTML exported.');
    },
    json: () => {
      if (!worksheet) return;
      downloadText(JSON.stringify(worksheet, null, 2), `${safeFileName(worksheet.title)}.json`, 'application/json;charset=utf-8');
      setStatusMessage(language === 'vi' ? 'Đã xuất JSON.' : 'JSON exported.');
    },
    copy: async (teacherVersion) => {
      if (!worksheet) return;
      try {
        await navigator.clipboard.writeText(worksheetToPlainText(worksheet, { teacherVersion, language }));
        setStatusMessage(language === 'vi' ? 'Đã sao chép toàn bộ phiếu.' : 'Worksheet copied.');
      } catch {
        setStatusMessage(language === 'vi' ? 'Không thể sao chép tự động.' : 'Could not copy automatically.');
      }
    },
    saveLibrary: () => {
      if (!worksheet) return;
      addHistoryEntry({
        kind: 'worksheet',
        toolSlug: 'worksheet-factory',
        toolTitle: 'Worksheet Factory',
        sourceApp: 'worksheet-factory',
        sourceAppTitle: 'Worksheet Factory',
        title: worksheet.title,
        content: worksheetToPlainText(worksheet, { teacherVersion: true, language }),
        tags: ['worksheet', worksheet.level, worksheet.topic || 'english'],
        activityData: { type: 'worksheet-factory', worksheet },
      });
      setStatusMessage(language === 'vi' ? 'Đã lưu phiếu vào Thư viện.' : 'Worksheet saved to Library.');
    },
    addBank: () => {
      if (!worksheet) return;
      const items = worksheetMcqBankItems(worksheet, { level: worksheet.level, source: worksheet.title });
      addBankItems(items);
      setStatusMessage(language === 'vi' ? `Đã thêm ${items.length} câu vào ngân hàng câu hỏi.` : `${items.length} questions added to the Question Bank.`);
    },
  };

  return (
    <div className="page worksheet-factory-page">
      <div className="wf-commandbar">
        <button type="button" className="back-btn" onClick={() => (window.location.hash = '#/apps')}>← {language === 'vi' ? 'Quay lại Ứng dụng' : 'Back to Apps'}</button>
        <div className="wf-command-status">
          <span className={hasApiKey ? 'ready' : 'offline'}>{hasApiKey ? (language === 'vi' ? 'AI sẵn sàng' : 'AI ready') : (language === 'vi' ? 'Chế độ offline' : 'Offline mode')}</span>
          <strong>{aiSummary?.providerName || (hasApiKey ? 'AI Provider' : 'Local Engine')}</strong>
        </div>
      </div>

      <section className="wf-hero">
        <div className="wf-hero-copy">
          <span className="wf-version">V10.83 · AI WORKSHEET PRODUCTION</span>
          <h1><span>Worksheet</span><br />Factory</h1>
          <p>{language === 'vi' ? 'Biến PDF, Word, PowerPoint, Excel, bài báo, danh sách từ hoặc một chủ đề thành phiếu học tập có đáp án, kiểm tra trùng lặp và xuất Word thật.' : 'Turn PDFs, Word files, slides, spreadsheets, articles, word lists or a topic into complete worksheets with answers, duplicate checks and real Word export.'}</p>
          <div className="wf-hero-tags"><span>PDF → WORKSHEET</span><span>11 ACTIVITY TYPES</span><span>DOCX · HTML · PDF</span></div>
        </div>
        <div className="wf-hero-art" aria-hidden="true">
          <div className="wf-hero-paper wf-paper-back"><span>ANSWER KEY</span></div>
          <div className="wf-hero-paper wf-paper-mid"><b>A</b><i /><i /><i /></div>
          <div className="wf-hero-paper wf-paper-front"><small>ENGLISH WORKSHEET</small><strong>01</strong><h3>READ · THINK<br />PRACTISE</h3><div><i /><i /><i /><i /></div></div>
          <div className="wf-hero-stamp">AI<br />READY</div>
        </div>
      </section>

      <StepNavigation step={step} setStep={setStep} language={language} hasWorksheet={Boolean(worksheet)} />

      {step === 1 && <SourceStep language={language} sourceText={sourceText} setSourceText={setSourceText} sourceName={sourceName} setSourceName={setSourceName} topic={topic} setTopic={setTopic} onNext={() => setStep(2)} />}
      {step === 2 && <ConfigureStep language={language} selectedTypes={selectedTypes} setSelectedTypes={setSelectedTypes} settings={settings} setSettings={setSettings} onBack={() => setStep(1)} onNext={() => setStep(3)} />}
      {step === 3 && <GenerateStep language={language} hasApiKey={hasApiKey} providerName={aiSummary?.providerName} sourceText={sourceText || topic} sourceName={sourceName} settings={{ ...settings, topic: settings.topic || topic }} selectedTypes={selectedTypes} busy={busy} error={error} message={message} onBack={() => setStep(2)} onGenerate={generateWorksheet} />}
      {step === 4 && worksheet && audit && <ResultStep language={language} worksheet={worksheet} setWorksheet={setWorksheet} audit={audit} onBack={() => setStep(1)} exportActions={exportActions} statusMessage={statusMessage} />}
    </div>
  );
}
