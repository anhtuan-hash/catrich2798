import React, { useEffect, useMemo, useRef, useState } from 'react';
import { buildStandaloneHtml, downloadFile, parseActivity, seededShuffle, slugify } from '../utils/activityEngine.js';

function normalizeAnswerIndex(answer, options = []) {
  if (typeof answer === 'number') return answer;
  const text = String(answer || '').trim();
  if (/^[A-D]$/i.test(text)) return text.toUpperCase().charCodeAt(0) - 65;
  const idx = options.findIndex((option) => String(option).trim().toLowerCase() === text.toLowerCase());
  return idx >= 0 ? idx : -1;
}

function QuizPlayer({ questions = [], language }) {
  const [answers, setAnswers] = useState({});
  const [showReview, setShowReview] = useState(false);
  const normalized = questions.map((q, idx) => ({
    id: q.id || `q-${idx}`,
    question: q.question || q.text || '',
    options: q.options || [],
    answerIndex: q.answerIndex ?? normalizeAnswerIndex(q.answer, q.options || []),
    explanation: q.explanation || '',
  })).filter((q) => q.question && q.options.length >= 2);
  const correct = Object.entries(answers).filter(([index, answerIndex]) => normalized[Number(index)]?.answerIndex === answerIndex).length;
  const done = Object.keys(answers).length;

  if (!normalized.length) return <div className="empty-state"><p>{language === 'vi' ? 'Chưa nhận diện được câu hỏi tương tác.' : 'No interactive questions detected.'}</p></div>;

  return (
    <div className="live-player-wrap">
      <div className="live-scorebar metro-panel">
        <strong>{language === 'vi' ? 'Điểm trực tiếp' : 'Live score'}: {correct}/{normalized.length}</strong>
        <span>{language === 'vi' ? 'Đã trả lời' : 'Answered'}: {done}/{normalized.length}</span>
        <button onClick={() => setShowReview((v) => !v)}>{showReview ? (language === 'vi' ? 'Ẩn đáp án' : 'Hide key') : (language === 'vi' ? 'Hiện đáp án' : 'Show key')}</button>
        <button onClick={() => { setAnswers({}); setShowReview(false); }}>{language === 'vi' ? 'Làm lại' : 'Reset'}</button>
      </div>
      <div className="live-question-grid">
        {normalized.map((question, index) => {
          const chosen = answers[index];
          return (
            <article className="live-question-tile metro-tile" key={question.id}>
              <div className="question-topline">
                <span>{language === 'vi' ? 'Câu' : 'Question'} {index + 1}</span>
                {chosen !== undefined && <strong className={chosen === question.answerIndex ? 'good-text' : 'bad-text'}>{chosen === question.answerIndex ? '✓' : '×'}</strong>}
              </div>
              <h3>{question.question}</h3>
              <div className="live-options">
                {question.options.map((option, optionIndex) => {
                  const isChosen = chosen === optionIndex;
                  const isCorrect = question.answerIndex === optionIndex;
                  const reveal = showReview || isChosen;
                  const cls = `live-option ${isChosen ? 'chosen' : ''} ${reveal && isCorrect ? 'ok' : ''} ${isChosen && !isCorrect ? 'bad' : ''}`;
                  return (
                    <button key={`${option}-${optionIndex}`} className={cls} onClick={() => setAnswers((prev) => ({ ...prev, [index]: optionIndex }))}>
                      <span>{String.fromCharCode(65 + optionIndex)}</span>
                      <b>{option}</b>
                    </button>
                  );
                })}
              </div>
              {(showReview || chosen !== undefined) && question.answerIndex >= 0 && (
                <p className="feedback-line">
                  {language === 'vi' ? 'Đáp án' : 'Answer'}: {String.fromCharCode(65 + question.answerIndex)}. {question.options[question.answerIndex]}
                  {question.explanation ? ` — ${question.explanation}` : ''}
                </p>
              )}
            </article>
          );
        })}
      </div>
    </div>
  );
}

function MatchPlayer({ pairs = [], language }) {
  const definitions = useMemo(() => seededShuffle(pairs.map((pair) => pair.right), pairs.map((p) => p.right).join('|')), [pairs]);
  const [selected, setSelected] = useState(null);
  const [result, setResult] = useState({});
  const matched = Object.values(result).filter(Boolean).length;
  return (
    <div className="live-player-wrap">
      <div className="live-scorebar metro-panel"><strong>{language === 'vi' ? 'Đúng' : 'Correct'}: {matched}/{pairs.length}</strong><span>{selected === null ? (language === 'vi' ? 'Chọn thuật ngữ trước' : 'Choose a term first') : (language === 'vi' ? 'Chọn nghĩa phù hợp' : 'Choose the matching meaning')}</span></div>
      <div className="live-match-grid">
        <section className="metro-panel live-column"><h3>{language === 'vi' ? 'Thuật ngữ' : 'Terms'}</h3>{pairs.map((pair, index) => <button key={pair.id} className={`live-pill ${selected === index ? 'selected' : ''} ${result[index] === true ? 'ok' : ''} ${result[index] === false ? 'bad' : ''}`} onClick={() => setSelected(index)}>{pair.left}</button>)}</section>
        <section className="metro-panel live-column"><h3>{language === 'vi' ? 'Định nghĩa' : 'Definitions'}</h3>{definitions.map((definition) => <button key={definition} className="live-pill" onClick={() => { if (selected === null) return; setResult((prev) => ({ ...prev, [selected]: pairs[selected].right === definition })); setSelected(null); }}>{definition}</button>)}</section>
      </div>
    </div>
  );
}

function CardsPlayer({ prompts = [], language }) {
  const [index, setIndex] = useState(0);
  const current = prompts[index] || prompts[0] || { text: '' };
  return (
    <div className="live-card-stage">
      <article className="metro-tile live-big-card">
        <span>{language === 'vi' ? 'Thẻ' : 'Card'} {index + 1}/{prompts.length}</span>
        <h2>{current.text}</h2>
      </article>
      <div className="live-scorebar metro-panel">
        <button onClick={() => setIndex((index + 1) % prompts.length)}>{language === 'vi' ? 'Tiếp theo' : 'Next'}</button>
        <button onClick={() => setIndex(Math.floor(Math.random() * prompts.length))}>Random</button>
        <button onClick={() => setIndex(0)}>{language === 'vi' ? 'Về đầu' : 'First'}</button>
      </div>
    </div>
  );
}

function BoxPlayer({ boxes = [], language }) {
  const [opened, setOpened] = useState({});
  return (
    <div className="live-player-wrap">
      <div className="live-box-grid">
        {boxes.map((box, index) => (
          <button key={box.id} className={`live-mystery-tile ${opened[index] ? 'opened' : ''}`} onClick={() => setOpened((prev) => ({ ...prev, [index]: true }))}>
            {opened[index] ? <><strong>{box.points !== null ? `${box.points} pts` : 'Open'}</strong><span>{box.text}</span></> : <><strong>{index + 1}</strong><span>{language === 'vi' ? 'Mở tile' : 'Open tile'}</span></>}
          </button>
        ))}
      </div>
      <div className="live-scorebar metro-panel"><button onClick={() => setOpened({})}>{language === 'vi' ? 'Đóng tất cả' : 'Reset boxes'}</button></div>
    </div>
  );
}

function SortPlayer({ activity, language }) {
  const [bank, setBank] = useState(activity.items || []);
  const [selected, setSelected] = useState(null);
  const [drops, setDrops] = useState(() => Object.fromEntries((activity.categories || []).map((category) => [category, []])));
  const [score, setScore] = useState(null);
  const moveToCategory = (category, itemId = selected) => {
    if (!itemId) return;
    const item = bank.find((entry) => entry.id === itemId);
    if (!item) return;
    setDrops((prev) => ({ ...prev, [category]: [...prev[category], item] }));
    setBank((prev) => prev.filter((entry) => entry.id !== itemId));
    setSelected(null);
    setScore(null);
  };
  const reset = () => {
    setBank(activity.items || []);
    setDrops(Object.fromEntries((activity.categories || []).map((category) => [category, []])));
    setSelected(null);
    setScore(null);
  };
  const check = () => {
    const placed = Object.entries(drops).flatMap(([category, items]) => items.map((item) => ({ ...item, placed: category })));
    const right = placed.filter((item) => item.category === item.placed).length;
    setScore({ right, total: (activity.items || []).length });
  };
  return (
    <div className="live-player-wrap">
      <section className="metro-panel live-bank"><h3>{language === 'vi' ? 'Kho item' : 'Item bank'}</h3>{bank.map((item) => <button key={item.id} className={`live-pill ${selected === item.id ? 'selected' : ''}`} onClick={() => setSelected(item.id)}>{item.text}</button>)}</section>
      <div className="live-sort-grid">{(activity.categories || []).map((category) => <section key={category} className="metro-panel live-column" onClick={() => moveToCategory(category)}><h3>{category}</h3>{drops[category].map((item) => <span key={item.id} className="live-pill placed">{item.text}</span>)}</section>)}</div>
      <div className="live-scorebar metro-panel"><button onClick={check}>{language === 'vi' ? 'Kiểm tra' : 'Check'}</button><button onClick={reset}>{language === 'vi' ? 'Làm lại' : 'Reset'}</button>{score && <strong>{score.right}/{score.total}</strong>}</div>
    </div>
  );
}

function UnjumblePlayer({ sentences = [], language }) {
  const [built, setBuilt] = useState({});
  const [used, setUsed] = useState({});
  const [feedback, setFeedback] = useState({});
  const addWord = (sentenceIndex, wordIndex, word) => {
    const key = `${sentenceIndex}-${wordIndex}`;
    if (used[key]) return;
    setBuilt((prev) => ({ ...prev, [sentenceIndex]: [...(prev[sentenceIndex] || []), word] }));
    setUsed((prev) => ({ ...prev, [key]: true }));
  };
  const resetSentence = (sentenceIndex) => {
    setBuilt((prev) => ({ ...prev, [sentenceIndex]: [] }));
    setFeedback((prev) => ({ ...prev, [sentenceIndex]: '' }));
    setUsed((prev) => Object.fromEntries(Object.entries(prev).filter(([key]) => !key.startsWith(`${sentenceIndex}-`))));
  };
  return (
    <div className="live-question-grid">
      {sentences.map((sentence, sentenceIndex) => <article className="metro-tile live-question-tile" key={sentence.id}><h3>{language === 'vi' ? 'Câu' : 'Sentence'} {sentenceIndex + 1}</h3><div className="live-pill-bank">{sentence.words.map((word, wordIndex) => { const key = `${sentenceIndex}-${wordIndex}`; return <button key={key} disabled={used[key]} className="live-pill" onClick={() => addWord(sentenceIndex, wordIndex, word)}>{word}</button>; })}</div><div className="live-answer-line">{(built[sentenceIndex] || []).join(' ') || (language === 'vi' ? 'Bấm từ để xếp câu...' : 'Click words to build the sentence...')}</div><div className="live-options inline"><button onClick={() => setFeedback((prev) => ({ ...prev, [sentenceIndex]: ((built[sentenceIndex] || []).join(' ') === sentence.text) ? 'correct' : sentence.text }))}>{language === 'vi' ? 'Kiểm tra' : 'Check'}</button><button onClick={() => resetSentence(sentenceIndex)}>{language === 'vi' ? 'Làm lại' : 'Reset'}</button></div>{feedback[sentenceIndex] && <p className={feedback[sentenceIndex] === 'correct' ? 'good-text' : 'bad-text'}>{feedback[sentenceIndex] === 'correct' ? (language === 'vi' ? 'Chính xác.' : 'Correct.') : `${language === 'vi' ? 'Đáp án' : 'Answer'}: ${feedback[sentenceIndex]}`}</p>}</article>)}
    </div>
  );
}

function TextLabReplayFrame({ payload }) {
  const frameRef = useRef(null);
  const src = `${import.meta.env.BASE_URL || '/'}embedded/brian-textlab-activities/index.html?embedded=1&replay=1`;
  const send = () => frameRef.current?.contentWindow?.postMessage({
    type: 'BTL_LOAD_SAVED_ACTIVITY',
    payload: {
      templateId: payload.templateId || 'quiz',
      content: payload.content || '',
    },
  }, '*');
  useEffect(() => { send(); }, [payload.templateId, payload.content]);
  return (
    <iframe
      ref={frameRef}
      className="live-standalone-frame live-textlab-replay-frame"
      title="Brian TextLab saved activity"
      src={src}
      onLoad={send}
      sandbox="allow-scripts allow-same-origin allow-forms allow-modals allow-downloads allow-popups allow-presentation"
      allow="microphone; camera; autoplay; fullscreen; clipboard-read; clipboard-write"
    />
  );
}

function WordsearchPlayer({ activity, language }) {
  const [found, setFound] = useState({});
  return (
    <div className="live-wordsearch-grid">
      <div className="live-letter-grid" style={{ gridTemplateColumns: `repeat(${activity.grid?.length || 10}, 1fr)` }}>{(activity.grid || []).flat().map((letter, index) => <span key={`${letter}-${index}`}>{letter}</span>)}</div>
      <div className="metro-panel live-column"><h3>{language === 'vi' ? 'Từ cần tìm' : 'Words to find'}</h3>{(activity.entries || []).map((entry) => <button key={entry.word} className={`live-pill ${found[entry.word] ? 'ok' : ''}`} onClick={() => setFound((prev) => ({ ...prev, [entry.word]: !prev[entry.word] }))}><strong>{entry.word}</strong>{entry.clue ? <small>{entry.clue}</small> : null}</button>)}</div>
    </div>
  );
}

export default function LiveActivityPlayer({ payload, language = 'vi', title }) {
  const playerRef = useRef(null);
  const [fullscreenActive, setFullscreenActive] = useState(false);
  const parsed = useMemo(() => {
    if (!payload) return null;
    if (payload.type === 'textlab-activity') return { mode: 'textlab-activity', data: payload, raw: payload };
    if (payload.standaloneHtml) return { mode: 'standalone-html', data: payload, raw: payload };
    if (payload.questions) return { mode: 'quiz', data: { questions: payload.questions }, raw: payload };
    const template = payload.template || payload.templateId || payload.type || 'quiz';
    const content = payload.content || '';
    const activity = payload.activity || parseActivity(template, content).data;
    return { mode: template, data: activity, raw: payload };
  }, [payload]);

  const makeStandaloneHtml = () => {
    if (!parsed) return '';
    if (parsed.mode === 'standalone-html' || parsed.mode === 'textlab-activity') return parsed.data?.standaloneHtml || '';
    return buildStandaloneHtml({
      title: title || payload?.title || 'Brian English Live Activity',
      templateId: parsed.mode,
      activity: parsed.data || {},
    });
  };

  const downloadOfflineHtml = () => {
    const html = makeStandaloneHtml();
    if (!html) return;
    downloadFile(`${slugify(title || payload?.title || 'live-activity')}.html`, html, 'text/html;charset=utf-8');
  };

  const openInNewWindow = () => {
    const html = makeStandaloneHtml();
    const win = window.open('', '_blank');
    if (!win) return;
    win.document.open();
    win.document.write(html);
    win.document.close();
  };

  const toggleFullscreen = async () => {
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
        setFullscreenActive(false);
        return;
      }
      const el = playerRef.current;
      if (el?.requestFullscreen) {
        await el.requestFullscreen();
        setFullscreenActive(true);
      }
    } catch {
      setFullscreenActive(false);
    }
  };

  if (!parsed) return <div className="empty-state"><p>{language === 'vi' ? 'Chưa có dữ liệu hoạt động.' : 'No activity data.'}</p></div>;
  const data = parsed.data || {};
  return (
    <section className={`live-activity-player live-player-v14 ${fullscreenActive ? 'is-fullscreen' : ''}`} ref={playerRef}>
      <div className="live-controlbar metro-panel">
        <div>
          <span className="eyebrow">Live Activity Mode</span>
          <h2>{title || payload?.title || (language === 'vi' ? 'Hoạt động tương tác' : 'Interactive activity')}</h2>
        </div>
        <div className="preview-actions wrap-actions live-actions">
          <button className="primary" onClick={toggleFullscreen}>{language === 'vi' ? 'Toàn màn hình' : 'Fullscreen'}</button>
          <button className="secondary" onClick={openInNewWindow}>{language === 'vi' ? 'Mở cửa sổ lớp học' : 'Classroom window'}</button>
          <button className="secondary" onClick={downloadOfflineHtml}>{language === 'vi' ? 'Tải HTML offline' : 'Download offline HTML'}</button>
        </div>
      </div>
      {parsed.mode === 'textlab-activity' && <TextLabReplayFrame payload={data} />}
      {parsed.mode === 'standalone-html' && (
        <iframe
          className="live-standalone-frame"
          title={title || payload?.title || 'Saved interactive activity'}
          srcDoc={data.standaloneHtml || ''}
          sandbox="allow-scripts allow-same-origin allow-forms allow-modals allow-downloads allow-popups allow-presentation"
          allow="microphone; camera; autoplay; fullscreen; clipboard-read; clipboard-write"
        />
      )}
      {parsed.mode === 'quiz' && <QuizPlayer questions={data.questions || []} language={language} />}
      {parsed.mode === 'match' && <MatchPlayer pairs={data.pairs || []} language={language} />}
      {parsed.mode === 'pairs' && <MatchPlayer pairs={data.pairs || []} language={language} />}
      {parsed.mode === 'cards' && <CardsPlayer prompts={data.prompts || []} language={language} />}
      {parsed.mode === 'box' && <BoxPlayer boxes={data.boxes || []} language={language} />}
      {parsed.mode === 'sort' && <SortPlayer activity={data} language={language} />}
      {parsed.mode === 'unjumble' && <UnjumblePlayer sentences={data.sentences || []} language={language} />}
      {parsed.mode === 'wordsearch' && <WordsearchPlayer activity={data} language={language} />}
    </section>
  );
}

