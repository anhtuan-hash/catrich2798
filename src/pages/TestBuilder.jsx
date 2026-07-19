import React, { useEffect, useMemo, useState } from 'react';
import SectionHeader from '../components/SectionHeader.jsx';
import AICopilotPanel from '../components/AICopilotPanel.jsx';
import { addHistoryEntry, addQuestionsFromTextToBank, bankToText, downloadFile, exportAsHtml, exportAsWord, loadBank, slugify } from '../utils/library.js';
import { buildGoogleFormsAppsScript, buildGoogleFormsCsv, buildGoogleFormsGuideHtml, normalizeQuestionsForGoogleForms } from '../utils/googleForms.js';

function shuffleArray(items) {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function toCsv(items) {
  const esc = (value) => `"${String(value || '').replace(/"/g, '""')}"`;
  const rows = [['Question', 'Option A', 'Option B', 'Option C', 'Option D', 'Answer', 'Level', 'Topic', 'Source']];
  items.forEach((item) => {
    rows.push([
      item.question,
      item.options?.[0] || '',
      item.options?.[1] || '',
      item.options?.[2] || '',
      item.options?.[3] || '',
      item.answer || '',
      item.level || '',
      item.topic || '',
      item.source || '',
    ]);
  });
  return rows.map((row) => row.map(esc).join(',')).join('\n');
}

function buildExamText(title, items, includeAnswers) {
  const questions = bankToText(items, false);
  const key = items.map((item, index) => `${index + 1}. ${item.answer || '—'}`).join('\n');
  return `${title}\n\nName: ________________________________   Class: ____________\n\n${questions}${includeAnswers ? `\n\nANSWER KEY\n${key}` : ''}`;
}

function buildFormsText(items) {
  return items.map((item, index) => {
    const options = (item.options || []).map((option, optionIndex) => `${String.fromCharCode(65 + optionIndex)}. ${option}`).join('\n');
    return `Question ${index + 1}: ${item.question}\n${options}\nCorrect answer: ${item.answer || ''}`;
  }).join('\n\n---\n\n');
}

export default function TestBuilder({ language, apiKey, aiModel, hasApiKey }) {
  const [bank, setBank] = useState(() => loadBank());
  useEffect(() => {
    const refresh = () => setBank(loadBank());
    window.addEventListener('bet-library-updated', refresh);
    window.addEventListener('storage', refresh);
    return () => {
      window.removeEventListener('bet-library-updated', refresh);
      window.removeEventListener('storage', refresh);
    };
  }, []);
  const [title, setTitle] = useState('Brian English Test');
  const [query, setQuery] = useState('');
  const [level, setLevel] = useState('All');
  const [count, setCount] = useState(30);
  const [includeAnswers, setIncludeAnswers] = useState(true);
  const [shuffle, setShuffle] = useState(true);
  const [toast, setToast] = useState('');
  const [showFormCreator, setShowFormCreator] = useState(false);

  const levels = useMemo(() => ['All', ...Array.from(new Set(bank.map((item) => item.level).filter(Boolean)))], [bank]);
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return bank.filter((item) => {
      const levelOk = level === 'All' || item.level === level;
      const qOk = !q || `${item.question} ${item.topic} ${item.source} ${item.level}`.toLowerCase().includes(q);
      return levelOk && qOk;
    });
  }, [bank, level, query]);

  const selected = useMemo(() => {
    const pool = shuffle ? shuffleArray(filtered) : [...filtered];
    return pool.slice(0, Math.min(count, pool.length));
  }, [filtered, shuffle, count]);
  const examText = useMemo(() => buildExamText(title, selected, includeAnswers), [title, selected, includeAnswers]);
  const formQuestions = useMemo(() => normalizeQuestionsForGoogleForms(selected), [selected]);
  const formScript = useMemo(() => buildGoogleFormsAppsScript(title, formQuestions, { description: 'Created from Exam Studio / question bank in Brian English Studio V1.0.' }), [title, formQuestions]);

  const showToast = (message) => {
    setToast(message);
    window.clearTimeout(showToast.timer);
    showToast.timer = window.setTimeout(() => setToast(''), 2400);
  };

  const saveExam = () => {
    addHistoryEntry({
      kind: 'test-paper',
      toolSlug: 'test-paper-builder',
      toolTitle: 'Test Paper Builder',
      sourceApp: 'test-paper-builder',
      sourceAppTitle: 'Test Paper Builder',
      title,
      content: examText,
      templateId: 'quiz',
      tags: ['test', 'question-bank', 'interactive'],
      itemCount: selected.length,
      activityData: { type: 'quiz', templateId: 'quiz', sourceApp: 'test-paper-builder', questions: selected },
    });
    showToast(language === 'vi' ? 'Đã lưu đề vào thư viện.' : 'Test saved to library.');
  };

  const copyFormScript = async () => {
    try {
      await navigator.clipboard.writeText(formScript);
      showToast(language === 'vi' ? 'Đã copy Apps Script tạo Google Form.' : 'Google Form Apps Script copied.');
    } catch {
      showToast(language === 'vi' ? 'Không copy được script.' : 'Copy failed.');
    }
  };

  const downloadFormScript = () => downloadFile(`${slugify(title)}-google-form.gs`, formScript, 'text/plain;charset=utf-8');
  const downloadFormGuide = () => downloadFile(`${slugify(title)}-google-form-guide.html`, buildGoogleFormsGuideHtml(title, formQuestions, formScript), 'text/html;charset=utf-8');

  return (
    <div className="page narrow test-builder-page">
      <button className="back-btn" onClick={() => window.history.back()}>← {language === 'vi' ? 'Quay lại' : 'Back'}</button>
      <SectionHeader
        eyebrow="V1.0 · Test Paper Builder"
        title={language === 'vi' ? 'Tạo đề từ ngân hàng câu hỏi' : 'Build tests from question bank'}
        text={language === 'vi' ? 'Chọn câu hỏi đã lưu trong ngân hàng, đảo thứ tự, xuất đề in, Word, HTML hoặc định dạng Google Forms.' : 'Select saved questions, shuffle them, and export printable tests, Word, HTML or Google Forms-friendly formats.'}
      />

      <section className="test-builder-grid">
        <AICopilotPanel
          language={language}
          apiKey={apiKey}
          aiModel={aiModel}
          hasApiKey={hasApiKey}
          title={language === 'vi' ? 'AI tạo câu hỏi cho đề' : 'AI Question Generator for Tests'}
          description={language === 'vi' ? 'Tạo câu hỏi mới rồi đưa thẳng vào ngân hàng để chọn đề.' : 'Generate new questions and send them directly to the bank for test building.'}
          task="Create multiple-choice questions for an English test."
          defaultInstruction="Create B2-C1 multiple-choice English questions about grammar, vocabulary, word form and reading. Include answer key and short explanations."
          defaultCount={30}
          outputFormat="Use numbered MCQ format: 1. Question
A. option
B. option
C. option
D. option
Answer: A
Explanation: short explanation."
          applyLabel={language === 'vi' ? 'Đưa vào ngân hàng' : 'Add to bank'}
          onApply={(text, meta) => { const added = addQuestionsFromTextToBank(text, { source: 'AI Test Generator', level: meta.level, topic: meta.instruction }); setBank(loadBank()); showToast(language === 'vi' ? `Đã thêm ${added.length} câu vào ngân hàng.` : `Added ${added.length} questions to bank.`); }}
        />

        <article className="panel builder-panel">
          <h2>2. {language === 'vi' ? 'Thiết lập đề' : 'Test settings'}</h2>
          <label>{language === 'vi' ? 'Tên đề' : 'Test title'}</label>
          <input value={title} onChange={(e) => setTitle(e.target.value)} />
          <div className="two-fields">
            <div><label>Level</label><select value={level} onChange={(e) => setLevel(e.target.value)}>{levels.map((item) => <option key={item}>{item}</option>)}</select></div>
            <div><label>{language === 'vi' ? 'Số câu' : 'Questions'}</label><input type="number" min="1" max="200" value={count} onChange={(e) => setCount(Number(e.target.value) || 1)} /></div>
          </div>
          <label>{language === 'vi' ? 'Tìm theo chủ điểm / nguồn / nội dung' : 'Search topic / source / content'}</label>
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="word form, B2-C1, grammar..." />
          <label className="check-line"><input type="checkbox" checked={shuffle} onChange={(e) => setShuffle(e.target.checked)} /> {language === 'vi' ? 'Đảo thứ tự câu hỏi' : 'Shuffle questions'}</label>
          <label className="check-line"><input type="checkbox" checked={includeAnswers} onChange={(e) => setIncludeAnswers(e.target.checked)} /> {language === 'vi' ? 'Xuất kèm đáp án' : 'Include answer key'}</label>
          <div className="hint-box"><strong>{selected.length}/{filtered.length}</strong> {language === 'vi' ? 'câu đang được chọn từ ngân hàng.' : 'questions selected from the bank.'}</div>
          <div className="preview-actions wrap-actions">
            <button className="primary" onClick={saveExam} disabled={!selected.length}>{language === 'vi' ? 'Lưu thư viện' : 'Save'}</button>
            <button onClick={() => navigator.clipboard.writeText(examText).then(() => showToast(language === 'vi' ? 'Đã copy đề.' : 'Copied.'))} disabled={!selected.length}>Copy</button>
            <button onClick={() => downloadFile(`${slugify(title)}.txt`, examText)} disabled={!selected.length}>TXT</button>
            <button onClick={() => exportAsWord(title, examText)} disabled={!selected.length}>Word .doc</button>
            <button onClick={() => exportAsHtml(title, examText)} disabled={!selected.length}>HTML</button>
            <button className="google-form-btn" onClick={() => setShowFormCreator((value) => !value)} disabled={!selected.length}>{language === 'vi' ? 'Tạo Google Form' : 'Google Form'}</button>
            <button onClick={() => downloadFile(`${slugify(title)}-google-forms.csv`, buildGoogleFormsCsv(selected), 'text/csv;charset=utf-8')} disabled={!selected.length}>CSV backup</button>
            <button onClick={() => downloadFile(`${slugify(title)}-forms.txt`, buildFormsText(selected))} disabled={!selected.length}>Forms TXT</button>
          </div>
        </article>

        {showFormCreator && selected.length > 0 && (
          <article className="panel google-form-panel test-google-form-panel">
            <div className="preview-head">
              <div>
                <span className="eyebrow">3. Google Form Creator</span>
                <h2>{language === 'vi' ? 'Tạo Google Form thật từ đề' : 'Create a real Google Form from this test'}</h2>
                <p>{language === 'vi' ? 'Copy Apps Script, chạy trong tài khoản Google để tạo form thật trong Drive.' : 'Copy the Apps Script and run it in your Google account to create a real form in Drive.'}</p>
              </div>
              <span className="status-badge">{formQuestions.length} MCQ</span>
            </div>
            <div className="forms-step-grid">
              <div className="hint-box">
                <strong>{language === 'vi' ? 'Các bước:' : 'Steps:'}</strong>
                <ol>
                  <li>{language === 'vi' ? 'Copy Apps Script.' : 'Copy Apps Script.'}</li>
                  <li>{language === 'vi' ? 'Mở script.new và dán vào.' : 'Open script.new and paste it.'}</li>
                  <li>{language === 'vi' ? 'Chạy createBrianEnglishGoogleForm.' : 'Run createBrianEnglishGoogleForm.'}</li>
                  <li>{language === 'vi' ? 'Cho phép quyền rồi lấy link form trong Logs.' : 'Authorize and get form links in Logs.'}</li>
                </ol>
              </div>
              <div className="forms-mini-list">
                {formQuestions.slice(0, 5).map((q, index) => (
                  <div key={`${q.question}-${index}`}>
                    <strong>{index + 1}. {q.question}</strong>
                    <small>{language === 'vi' ? 'Đáp án' : 'Answer'}: {q.answer || (q.answerIndex >= 0 ? String.fromCharCode(65 + q.answerIndex) : '—')}</small>
                  </div>
                ))}
              </div>
            </div>
            <div className="preview-actions wrap-actions">
              <button className="primary" onClick={copyFormScript}>{language === 'vi' ? 'Copy Apps Script' : 'Copy Apps Script'}</button>
              <button onClick={() => window.open('https://script.new', '_blank', 'noopener,noreferrer')}>{language === 'vi' ? 'Mở Apps Script' : 'Open Apps Script'}</button>
              <button onClick={downloadFormScript}>{language === 'vi' ? 'Tải .gs' : 'Download .gs'}</button>
              <button onClick={downloadFormGuide}>{language === 'vi' ? 'Tải hướng dẫn HTML' : 'Guide HTML'}</button>
            </div>
            <details className="script-details">
              <summary>{language === 'vi' ? 'Xem script' : 'View script'}</summary>
              <pre className="ai-output script-output">{formScript}</pre>
            </details>
          </article>
        )}

        <article className="panel preview-panel exam-preview-panel">
          <div className="preview-head"><div><span className="eyebrow">4. Preview</span><h2>{title}</h2></div><button onClick={() => window.print()} disabled={!selected.length}>{language === 'vi' ? 'In' : 'Print'}</button></div>
          {selected.length ? <pre className="ai-output exam-output">{examText}</pre> : <div className="empty-state"><p>{language === 'vi' ? 'Chưa có câu hỏi. Hãy vào Thư viện → Ngân hàng câu hỏi để nhập câu hỏi từ AI output.' : 'No questions yet. Go to Library → Question Bank to import questions from AI output.'}</p></div>}
        </article>
      </section>
      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}
