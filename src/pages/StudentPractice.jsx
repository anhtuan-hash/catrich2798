import React, { useEffect, useMemo, useRef, useState } from 'react';
import AICopilotPanel from '../components/AICopilotPanel.jsx';
import { addHistoryEntry, addQuestionsFromTextToBank, downloadFile, loadBank, loadHistory, slugify } from '../utils/library.js';

function shuffleArray(items) {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function answerToText(item) {
  const answer = String(item.answer || '').trim();
  const options = Array.isArray(item.options) ? item.options : [];
  if (/^[A-D]$/i.test(answer)) {
    return String(options[answer.toUpperCase().charCodeAt(0) - 65] || answer).trim();
  }
  return answer;
}

function buildSessionItems(items, shouldShuffleOptions) {
  return items.map((item, index) => {
    const originalOptions = Array.isArray(item.options) ? item.options.filter(Boolean) : [];
    const correctText = answerToText(item);
    const optionObjects = originalOptions.map((text, optionIndex) => ({
      id: `${item.id || index}-${optionIndex}`,
      text,
      originalLetter: String.fromCharCode(65 + optionIndex),
    }));
    const options = shouldShuffleOptions ? shuffleArray(optionObjects) : optionObjects;
    return {
      ...item,
      sessionId: `${item.id || 'q'}-${index}-${Math.random().toString(36).slice(2, 7)}`,
      correctText,
      options,
    };
  });
}

function csvEscape(value) {
  return `"${String(value ?? '').replace(/"/g, '""')}"`;
}

function buildReportCsv(title, results) {
  const rows = [['Test Title', 'No.', 'Question', 'Student Answer', 'Correct Answer', 'Result', 'Level', 'Topic', 'Source']];
  results.forEach((item, index) => {
    rows.push([
      title,
      index + 1,
      item.question,
      item.choiceText || '(blank)',
      item.correctText || '',
      item.isCorrect ? 'Correct' : 'Incorrect',
      item.level || '',
      item.topic || '',
      item.source || '',
    ]);
  });
  return rows.map((row) => row.map(csvEscape).join(',')).join('\n');
}

function buildReportText(title, results, startedAt, finishedAt) {
  const correct = results.filter((item) => item.isCorrect).length;
  const percent = results.length ? Math.round((correct / results.length) * 100) : 0;
  const lines = [
    `${title}`,
    `Score: ${correct}/${results.length} (${percent}%)`,
    `Started: ${startedAt ? new Date(startedAt).toLocaleString() : ''}`,
    `Finished: ${finishedAt ? new Date(finishedAt).toLocaleString() : ''}`,
    '',
    'REVIEW',
  ];
  results.forEach((item, index) => {
    lines.push(`${index + 1}. ${item.question}`);
    (item.options || []).forEach((option, optionIndex) => {
      lines.push(`${String.fromCharCode(65 + optionIndex)}. ${option.text}`);
    });
    lines.push(`Your answer: ${item.choiceText || '(blank)'}`);
    lines.push(`Correct answer: ${item.correctText || ''}`);
    lines.push(`Result: ${item.isCorrect ? 'Correct' : 'Incorrect'}`);
    if (item.explanation) lines.push(`Explanation: ${item.explanation}`);
    lines.push('');
  });
  return lines.join('\n');
}

export default function StudentPractice({ language, apiKey, aiModel, hasApiKey }) {
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
  const [title, setTitle] = useState('Brian English Practice');
  const [query, setQuery] = useState('');
  const [level, setLevel] = useState('All');
  const [count, setCount] = useState(20);
  const [secondsPerQuestion, setSecondsPerQuestion] = useState(30);
  const [shuffleQuestions, setShuffleQuestions] = useState(true);
  const [shuffleOptions, setShuffleOptions] = useState(true);
  const [showInstantFeedback, setShowInstantFeedback] = useState(true);
  const [stage, setStage] = useState('setup');
  const [session, setSession] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [timeLeft, setTimeLeft] = useState(secondsPerQuestion);
  const [results, setResults] = useState([]);
  const [locked, setLocked] = useState(false);
  const [startedAt, setStartedAt] = useState('');
  const [finishedAt, setFinishedAt] = useState('');
  const [toast, setToast] = useState('');
  const setupRef = useRef(null);
  const previewRef = useRef(null);
  const reportRef = useRef(null);

  const levels = useMemo(() => ['All', ...Array.from(new Set(bank.map((item) => item.level).filter(Boolean)))], [bank]);
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return bank.filter((item) => {
      const hasOptions = Array.isArray(item.options) && item.options.length >= 2;
      const levelOk = level === 'All' || item.level === level;
      const qOk = !q || `${item.question} ${item.topic} ${item.source} ${item.level}`.toLowerCase().includes(q);
      return hasOptions && levelOk && qOk;
    });
  }, [bank, level, query]);

  const current = session[currentIndex];
  const correctCount = results.filter((item) => item.isCorrect).length;
  const percent = results.length ? Math.round((correctCount / results.length) * 100) : 0;
  const progressPercent = session.length ? Math.round(((currentIndex + (stage === 'results' ? 1 : 0)) / session.length) * 100) : 0;
  const previewQuestion = filtered[0] || null;
  const latestReport = useMemo(() => loadHistory().find((item) => item.kind === 'practice-report') || null, [stage, toast]);
  const plannedCount = Math.min(Number(count) || 1, filtered.length || Number(count) || 1);

  const scrollToRef = (ref) => {
    ref.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const showToast = (message) => {
    setToast(message);
    window.clearTimeout(showToast.timer);
    showToast.timer = window.setTimeout(() => setToast(''), 2400);
  };

  const startPractice = () => {
    const pool = shuffleQuestions ? shuffleArray(filtered) : [...filtered];
    const chosen = pool.slice(0, Math.min(Number(count) || 1, pool.length));
    const items = buildSessionItems(chosen, shuffleOptions);
    setSession(items);
    setResults([]);
    setCurrentIndex(0);
    setTimeLeft(Number(secondsPerQuestion) || 30);
    setLocked(false);
    setStartedAt(new Date().toISOString());
    setFinishedAt('');
    setStage('running');
  };

  const finishPractice = (finalResults) => {
    setResults(finalResults);
    setFinishedAt(new Date().toISOString());
    setStage('results');
    setLocked(false);
  };

  const chooseAnswer = (choiceText = '') => {
    if (!current || locked) return;
    const cleanChoice = String(choiceText || '').trim();
    const cleanCorrect = String(current.correctText || '').trim();
    const record = {
      ...current,
      choiceText: cleanChoice,
      isCorrect: cleanChoice && cleanCorrect && cleanChoice.toLowerCase() === cleanCorrect.toLowerCase(),
      timeUsed: Math.max(0, (Number(secondsPerQuestion) || 30) - timeLeft),
    };
    const nextResults = [...results, record];
    setResults(nextResults);
    setLocked(true);

    const advance = () => {
      if (currentIndex + 1 >= session.length) {
        finishPractice(nextResults);
      } else {
        setCurrentIndex((value) => value + 1);
        setTimeLeft(Number(secondsPerQuestion) || 30);
        setLocked(false);
      }
    };

    if (showInstantFeedback && cleanChoice) {
      window.setTimeout(advance, 850);
    } else {
      advance();
    }
  };

  useEffect(() => {
    if (stage !== 'running' || locked || !current) return undefined;
    if (timeLeft <= 0) {
      chooseAnswer('');
      return undefined;
    }
    const timer = window.setTimeout(() => setTimeLeft((value) => Math.max(0, value - 1)), 1000);
    return () => window.clearTimeout(timer);
  }, [stage, locked, currentIndex, timeLeft]);

  const reportText = useMemo(() => buildReportText(title, results, startedAt, finishedAt), [title, results, startedAt, finishedAt]);
  const reportCsv = useMemo(() => buildReportCsv(title, results), [title, results]);

  const saveReport = () => {
    addHistoryEntry({
      kind: 'practice-report',
      toolSlug: 'student-practice',
      toolTitle: 'Student Practice',
      title: `${title} · ${correctCount}/${results.length}`,
      content: reportText,
      tags: ['practice', 'score-report', 'interactive'],
      itemCount: results.length,
      sourceApp: 'student-practice',
      sourceAppTitle: 'Student Practice',
      templateId: 'quiz',
      activityData: {
        type: 'quiz',
        templateId: 'quiz',
        sourceApp: 'student-practice',
        questions: session,
        settings: { secondsPerQuestion, showInstantFeedback, shuffle },
      },
    });
    showToast(language === 'vi' ? 'Đã lưu báo cáo vào Thư viện.' : 'Report saved to Library.');
  };

  return (
    <div className="page narrow practice-page practice-v39-page">
      <button className="back-btn practice-v39-back" onClick={() => window.history.back()}>← {language === 'vi' ? 'Quay lại' : 'Back'}</button>

      <section className="practice-v39-hero">
        <div className="practice-v39-hero-main">
          <div className="practice-v39-hero-art" aria-hidden="true">
            <div className="practice-v39-orbit orbit-one" />
            <div className="practice-v39-orbit orbit-two" />
            <div className="practice-v39-stopwatch"><span>30</span><small>s</small></div>
            <div className="practice-v39-question-sheet">
              <div className="practice-v39-sheet-line wide" />
              <div className="practice-v39-answer-row"><b>A</b><i /></div>
              <div className="practice-v39-answer-row active"><b>B</b><i /><strong>✓</strong></div>
              <div className="practice-v39-answer-row"><b>C</b><i /></div>
              <div className="practice-v39-answer-row"><b>D</b><i /></div>
            </div>
            <div className="practice-v39-score-card"><small>Score</small><strong>92</strong><span>/100</span></div>
            <div className="practice-v39-chart-card"><i /><i /><i /><i /><span /></div>
            <div className="practice-v39-report-card"><b>PDF</b><span>↓</span></div>
          </div>

          <div className="practice-v39-hero-copy">
            <span className="practice-v39-kicker">Student Practice · Brian English</span>
            <h1>{language === 'vi' ? 'Luyện tập có chấm điểm' : 'Scored student practice'}</h1>
            <p>{language === 'vi' ? 'Tạo bài luyện tập từ ngân hàng câu hỏi, cấu hình thời gian, lọc câu hỏi, xem trước nội dung và chấm điểm tự động. Phản hồi tức thì, báo cáo chi tiết.' : 'Build timed practice from the question bank, preview selected items, score automatically, and export detailed reports.'}</p>
            <div className="practice-v39-hero-actions">
              <button className="practice-v39-hero-btn coral" onClick={() => { setStage('setup'); window.setTimeout(() => scrollToRef(setupRef), 20); }}>
                {language === 'vi' ? 'Thiết lập bài luyện tập' : 'Set up practice'}
              </button>
              <button className="practice-v39-hero-btn light" onClick={() => { setStage('setup'); window.setTimeout(() => scrollToRef(previewRef), 20); }}>
                {language === 'vi' ? 'Chọn nhanh từ ngân hàng' : 'Choose from bank'}
              </button>
              <button className="practice-v39-hero-btn outline" onClick={() => { setStage('setup'); window.setTimeout(() => scrollToRef(reportRef), 20); }}>
                {language === 'vi' ? 'Xem báo cáo gần đây' : 'Recent reports'}
              </button>
            </div>
          </div>
        </div>

        <div className="practice-v39-status-strip">
          <article>
            <span className="practice-v39-status-icon ai">AI</span>
            <div><strong>{language === 'vi' ? 'AI Copilot sẵn sàng' : 'AI Copilot ready'}</strong><small>{hasApiKey ? (language === 'vi' ? 'Hỗ trợ tạo câu hỏi và gợi ý nội dung' : 'Question generation and content suggestions') : (language === 'vi' ? 'Cần cấu hình API key' : 'API key required')}</small></div>
          </article>
          <article>
            <span className="practice-v39-status-icon bank">{bank.length}</span>
            <div><strong>{bank.length.toLocaleString('vi-VN')} {language === 'vi' ? 'câu hỏi' : 'questions'}</strong><small>{language === 'vi' ? 'Ngân hàng đang có sẵn' : 'Available in the question bank'}</small></div>
          </article>
          <article>
            <span className="practice-v39-status-icon score">✓</span>
            <div><strong>{language === 'vi' ? 'Chấm điểm & Báo cáo' : 'Scoring & reports'}</strong><small>{language === 'vi' ? 'Tự động · Tức thì · Xuất báo cáo' : 'Automatic · Instant · Exportable'}</small></div>
          </article>
        </div>
      </section>

      {stage === 'setup' && (
        <section className="practice-v39-grid" ref={setupRef}>
          <div className="practice-v39-card-wrap practice-v39-ai-wrap">
            <span className="practice-v39-step-badge blue">1</span>
            <AICopilotPanel
              language={language}
              apiKey={apiKey}
              aiModel={aiModel}
              hasApiKey={hasApiKey}
              title={language === 'vi' ? 'AI tạo bài luyện tập' : 'AI Practice Builder'}
              description={language === 'vi' ? 'AI gợi ý câu hỏi phù hợp với mục tiêu, chủ đề và cấp độ của bạn.' : 'Generate practice questions aligned with your goal, topic, and level.'}
              task="Create student practice MCQs for timed self-study."
              defaultInstruction="Create 20 B2 multiple-choice practice questions about Past Simple vs Past Continuous. Include answer key and explanations."
              defaultCount={20}
              outputFormat="Use numbered MCQ format: 1. Question
A. option
B. option
C. option
D. option
Answer: A
Explanation: short explanation."
              applyLabel={language === 'vi' ? 'Đưa vào luyện tập' : 'Add to practice bank'}
              onApply={(text, meta) => { const added = addQuestionsFromTextToBank(text, { source: 'AI Practice Builder', level: meta.level, topic: meta.instruction }); setBank(loadBank()); setQuery('AI Practice Builder'); showToast(language === 'vi' ? `Đã thêm ${added.length} câu. Có thể bắt đầu luyện tập.` : `Added ${added.length} questions. Ready to start practice.`); }}
            />
          </div>

          <article className="panel practice-v39-card practice-v39-settings-card">
            <span className="practice-v39-step-badge purple">2</span>
            <div className="practice-v39-card-head">
              <div>
                <span className="practice-v39-card-kicker">{language === 'vi' ? 'Thiết lập' : 'Configuration'}</span>
                <h2>{language === 'vi' ? 'Thiết lập bài luyện tập' : 'Practice settings'}</h2>
                <p>{language === 'vi' ? 'Cấu hình thời gian, phạm vi câu hỏi và tiêu chí phản hồi.' : 'Configure timing, scope, and feedback behavior.'}</p>
              </div>
              <span className="practice-v39-card-icon purple">≡</span>
            </div>

            <label>{language === 'vi' ? 'Tên bài luyện tập' : 'Practice title'}</label>
            <input value={title} onChange={(e) => setTitle(e.target.value)} />
            <div className="practice-v39-setting-grid">
              <div><label>Level</label><select value={level} onChange={(e) => setLevel(e.target.value)}>{levels.map((item) => <option key={item}>{item}</option>)}</select></div>
              <div><label>{language === 'vi' ? 'Số câu' : 'Questions'}</label><input type="number" min="1" max="200" value={count} onChange={(e) => setCount(Number(e.target.value) || 1)} /></div>
              <div><label>{language === 'vi' ? 'Giây/câu' : 'Seconds/question'}</label><input type="number" min="5" max="300" value={secondsPerQuestion} onChange={(e) => setSecondsPerQuestion(Number(e.target.value) || 30)} /></div>
              <div><label>{language === 'vi' ? 'Tìm kiếm' : 'Search'}</label><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="word form, past simple..." /></div>
            </div>
            <div className="practice-v39-toggle-list">
              <label><input type="checkbox" checked={shuffleQuestions} onChange={(e) => setShuffleQuestions(e.target.checked)} /><span>{language === 'vi' ? 'Đảo thứ tự câu hỏi' : 'Shuffle questions'}</span></label>
              <label><input type="checkbox" checked={shuffleOptions} onChange={(e) => setShuffleOptions(e.target.checked)} /><span>{language === 'vi' ? 'Đảo phương án A–D' : 'Shuffle options'}</span></label>
              <label><input type="checkbox" checked={showInstantFeedback} onChange={(e) => setShowInstantFeedback(e.target.checked)} /><span>{language === 'vi' ? 'Phản hồi tức thì' : 'Instant feedback'}</span></label>
            </div>
            <div className="practice-v39-setting-summary">
              <span><small>{language === 'vi' ? 'Thời gian' : 'Time'}</small><strong>{secondsPerQuestion}s/câu</strong></span>
              <span><small>{language === 'vi' ? 'Số câu' : 'Questions'}</small><strong>{plannedCount}</strong></span>
              <span><small>{language === 'vi' ? 'Nguồn phù hợp' : 'Matching'}</small><strong>{filtered.length}</strong></span>
            </div>
            <button className="practice-v39-primary purple" onClick={startPractice} disabled={!filtered.length}>{language === 'vi' ? 'Bắt đầu luyện tập' : 'Start practice'}</button>
            {!bank.length && <p className="muted-line">{language === 'vi' ? 'Chưa có ngân hàng câu hỏi. Vào Thư viện để nhập câu hỏi hoặc dùng AI tạo nội dung.' : 'Your question bank is empty. Import questions in Library or generate AI content.'}</p>}
          </article>

          <article className="panel practice-v39-card practice-v39-preview-card" ref={previewRef}>
            <span className="practice-v39-step-badge teal">3</span>
            <div className="practice-v39-card-head">
              <div>
                <span className="practice-v39-card-kicker">Preview</span>
                <h2>{language === 'vi' ? 'Preview câu hỏi được chọn' : 'Selected question preview'}</h2>
                <p>{language === 'vi' ? 'Xem trước nội dung câu hỏi trước khi giao cho học viên.' : 'Review question content before assigning it.'}</p>
              </div>
              <span className="practice-v39-card-icon teal">▤</span>
            </div>
            <div className="practice-v39-preview-body">
              <div className="practice-v39-preview-stats">
                <span><small>{language === 'vi' ? 'Tổng câu' : 'Total'}</small><strong>{plannedCount}</strong></span>
                <span><small>{language === 'vi' ? 'Phù hợp' : 'Matching'}</small><strong>{filtered.length}</strong></span>
                <span><small>Level</small><strong>{level}</strong></span>
                <span><small>{language === 'vi' ? 'Thời gian' : 'Time'}</small><strong>{secondsPerQuestion}s</strong></span>
              </div>
              <div className="practice-v39-question-preview">
                <div className="practice-v39-question-meta"><span>{language === 'vi' ? 'Câu hỏi mẫu' : 'Sample question'}</span><b>{previewQuestion?.level || 'B2-C1'}</b></div>
                <h3>{previewQuestion?.question || (language === 'vi' ? 'Chưa có câu hỏi phù hợp với bộ lọc hiện tại.' : 'No question matches the current filters.')}</h3>
                <div className="practice-v39-preview-options">
                  {(previewQuestion?.options || ['Option A', 'Option B', 'Option C', 'Option D']).slice(0, 4).map((option, index) => {
                    const correct = previewQuestion && answerToText(previewQuestion).toLowerCase() === String(option).toLowerCase();
                    return <div key={`${option}-${index}`} className={correct ? 'is-answer' : ''}><span>{String.fromCharCode(65 + index)}</span><b>{option}</b>{correct && <strong>✓</strong>}</div>;
                  })}
                </div>
                {previewQuestion && <small>{language === 'vi' ? 'Đáp án đúng' : 'Correct answer'}: {answerToText(previewQuestion)}</small>}
              </div>
            </div>
            <div className="practice-v39-card-actions">
              <button className="practice-v39-primary teal" onClick={startPractice} disabled={!filtered.length}>{language === 'vi' ? 'Xem trước & bắt đầu' : 'Preview & start'}</button>
              <button className="practice-v39-link" onClick={() => (window.location.hash = '#/library')}>{language === 'vi' ? 'Chỉnh sửa câu hỏi' : 'Edit questions'} →</button>
            </div>
          </article>

          <article className="panel practice-v39-card practice-v39-report-card-panel" ref={reportRef}>
            <span className="practice-v39-step-badge coral">4</span>
            <div className="practice-v39-card-head">
              <div>
                <span className="practice-v39-card-kicker">{language === 'vi' ? 'Phân tích' : 'Analytics'}</span>
                <h2>{language === 'vi' ? 'Kết quả / Báo cáo' : 'Results / Reports'}</h2>
                <p>{language === 'vi' ? 'Xem kết quả, phân tích chi tiết và xuất báo cáo.' : 'Review results, inspect analytics, and export reports.'}</p>
              </div>
              <span className="practice-v39-card-icon coral">▥</span>
            </div>
            <div className="practice-v39-report-metrics">
              <span><small>{language === 'vi' ? 'Báo cáo gần nhất' : 'Latest report'}</small><strong>{latestReport?.title || (language === 'vi' ? 'Chưa có' : 'None yet')}</strong></span>
              <span><small>{language === 'vi' ? 'Điểm hiện tại' : 'Current score'}</small><strong>{results.length ? `${percent}%` : '—'}</strong></span>
              <span><small>{language === 'vi' ? 'Hoàn thành' : 'Completed'}</small><strong>{results.length ? `${results.length}/${session.length}` : '0'}</strong></span>
            </div>
            <div className="practice-v39-mini-chart" aria-hidden="true">
              <i style={{ height: '22%' }} /><i style={{ height: '36%' }} /><i style={{ height: '54%' }} /><i style={{ height: '72%' }} /><i style={{ height: '88%' }} />
            </div>
            <div className="practice-v39-report-notice">
              <strong>{language === 'vi' ? 'Báo cáo chi tiết sau khi hoàn thành' : 'Detailed report after completion'}</strong>
              <small>{language === 'vi' ? 'Bao gồm điểm số, đáp án, thời gian và file CSV/TXT.' : 'Includes score, answers, timing, and CSV/TXT export.'}</small>
            </div>
            <div className="practice-v39-card-actions vertical">
              <button className="practice-v39-primary coral" onClick={() => (window.location.hash = '#/library')}>{language === 'vi' ? 'Xem báo cáo đã lưu' : 'View saved reports'}</button>
              <button className="practice-v39-outline" onClick={startPractice} disabled={!filtered.length}>{language === 'vi' ? 'Làm bài để tạo báo cáo' : 'Start practice for report'}</button>
            </div>
          </article>
        </section>
      )}

      {stage === 'running' && current && (
        <section className="panel practice-player">
          <div className="practice-topline">
            <div>
              <span className="eyebrow">{currentIndex + 1}/{session.length}</span>
              <h2>{title}</h2>
            </div>
            <strong className={timeLeft <= 5 ? 'timer danger-time' : 'timer'}>{timeLeft}s</strong>
          </div>
          <div className="practice-progress"><span style={{ width: `${Math.min(100, Math.max(0, progressPercent))}%` }} /></div>
          <article className="practice-question-card">
            <h1>{current.question}</h1>
            <div className="practice-options">
              {current.options.map((option, optionIndex) => {
                const isChosen = locked && results[results.length - 1]?.choiceText === option.text;
                const isCorrect = locked && current.correctText.toLowerCase() === option.text.toLowerCase();
                return (
                  <button
                    key={option.id}
                    className={`${isChosen ? 'chosen' : ''} ${isCorrect ? 'correct' : ''}`}
                    onClick={() => chooseAnswer(option.text)}
                    disabled={locked}
                  >
                    <span>{String.fromCharCode(65 + optionIndex)}</span>
                    <strong>{option.text}</strong>
                  </button>
                );
              })}
            </div>
            {locked && showInstantFeedback && (
              <div className="answer-line">
                <strong>{results[results.length - 1]?.isCorrect ? (language === 'vi' ? 'Đúng!' : 'Correct!') : (language === 'vi' ? 'Chưa đúng.' : 'Not quite.')}</strong>
                {' '}{language === 'vi' ? 'Đáp án:' : 'Answer:'} {current.correctText}
              </div>
            )}
          </article>
          <div className="preview-actions wrap-actions modal-actions">
            <button onClick={() => finishPractice(results)}>{language === 'vi' ? 'Kết thúc sớm' : 'Finish now'}</button>
            <button className="danger-btn" onClick={() => setStage('setup')}>{language === 'vi' ? 'Thoát' : 'Exit'}</button>
          </div>
        </section>
      )}

      {stage === 'results' && (
        <section className="practice-results">
          <article className="panel result-summary">
            <span className="eyebrow">3. Score Report</span>
            <h1>{correctCount}/{results.length}</h1>
            <p>{language === 'vi' ? `Điểm số: ${percent}%` : `Score: ${percent}%`}</p>
            <div className="preview-actions wrap-actions">
              <button className="primary" onClick={() => setStage('setup')}>{language === 'vi' ? 'Tạo bài khác' : 'New practice'}</button>
              <button onClick={saveReport}>{language === 'vi' ? 'Lưu thư viện' : 'Save report'}</button>
              <button onClick={() => navigator.clipboard.writeText(reportText).then(() => showToast(language === 'vi' ? 'Đã copy báo cáo.' : 'Copied report.'))}>Copy</button>
              <button onClick={() => downloadFile(`${slugify(title)}-practice-report.txt`, reportText)}>TXT</button>
              <button onClick={() => downloadFile(`${slugify(title)}-practice-report.csv`, reportCsv, 'text/csv;charset=utf-8')}>CSV</button>
            </div>
          </article>
          <div className="library-list compact-list">
            {results.map((item, index) => (
              <article className={`question-row result-row ${item.isCorrect ? 'ok' : 'wrong'}`} key={item.sessionId}>
                <div>
                  <strong>{index + 1}. {item.question}</strong>
                  <small>{item.level || ''} · {item.source || item.topic || 'Question bank'}</small>
                  <ol type="A">
                    {(item.options || []).map((option) => <li key={option.id}>{option.text}</li>)}
                  </ol>
                  <p><b>{language === 'vi' ? 'Bạn chọn:' : 'Your answer:'}</b> {item.choiceText || '—'}</p>
                  <p><b>{language === 'vi' ? 'Đáp án:' : 'Answer:'}</b> {item.correctText || '—'}</p>
                  {item.explanation && <p><b>{language === 'vi' ? 'Giải thích:' : 'Explanation:'}</b> {item.explanation}</p>}
                </div>
                <span className="result-pill">{item.isCorrect ? '✓' : '×'}</span>
              </article>
            ))}
          </div>
        </section>
      )}
      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}
