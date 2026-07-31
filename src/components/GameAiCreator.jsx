import React, { useMemo, useState } from 'react';
import { callAI, extractJson } from '../utils/gemini.js';
import '../styles/GameAiCreator.css';

const SCHEMAS = {
  'top-five-arena': '{"title":"...","subtitle":"...","rounds":[{"question":"...","answers":[{"text":"...","points":50}],"explanation":"..."}]}',
  'flying-words': '{"title":"...","subtitle":"...","items":[{"sentence":"...","words":["..."],"answer":"...","explanation":"..."}]}',
  'crossword-trial': '{"title":"...","subtitle":"...","keyword":"8-12 letters, no spaces","items":[{"answer":"...","clue":"...","hint":"..."}]}',
  'knowledge-train': '{"title":"...","subtitle":"...","items":[{"question":"...","answer":"...","link":""}]}',
  'word-orbit': '{"title":"...","theme":"...","items":[{"prompt":"...","answer":"...","distractors":["...","...","..."],"explanation":"..."}]}',
  'domino-wordform': '{"title":"...","items":[{"left":"...","right":"...","answer":"..."}]}',
  'matching-battle': '{"title":"...","pairs":[{"left":"...","right":"..."}]}',
  'open-the-box': '{"title":"...","boxes":[{"label":"...","question":"...","answer":"..."}]}',
  'lucky-wheel': '{"title":"...","items":[{"label":"...","question":"...","answer":"..."}]}',
  'jeopardy-builder': '{"title":"...","categories":[{"name":"...","questions":[{"points":100,"question":"...","answer":"..."}]}]}',
  'team-race': '{"title":"...","items":[{"question":"...","answer":"...","difficulty":"B2"}]}',
};

function schemaFor(slug) {
  return SCHEMAS[slug] || '{"title":"...","instructions":"...","items":[{"question":"...","answer":"...","options":["..."],"explanation":"..."}]}';
}

function downloadJson(filename, value) {
  const blob = new Blob([JSON.stringify(value, null, 2)], { type: 'application/json;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

export default function GameAiCreator({ tool, language = 'vi', onApply }) {
  const vi = language !== 'en';
  const slug = tool?.slug || 'classroom-game';
  const title = vi ? (tool?.titleVi || tool?.title || 'Trò chơi') : (tool?.title || tool?.titleVi || 'Game');
  const [open, setOpen] = useState(false);
  const [topic, setTopic] = useState('Conditional sentences');
  const [level, setLevel] = useState('B2');
  const [count, setCount] = useState(8);
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [applying, setApplying] = useState(false);
  const [result, setResult] = useState(null);
  const [rawResult, setRawResult] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const resultText = useMemo(() => result ? JSON.stringify(result, null, 2) : rawResult, [result, rawResult]);

  const generate = async () => {
    if (!topic.trim()) {
      setError(vi ? 'Hãy nhập chủ đề cần tạo.' : 'Enter a topic first.');
      return;
    }
    setLoading(true);
    setError('');
    setNotice('');
    try {
      const schema = schemaFor(slug);
      const prompt = [
        `${vi ? 'Tạo dữ liệu cho trò chơi' : 'Create content for the game'}: ${title}.`,
        `${vi ? 'Chủ đề' : 'Topic'}: ${topic.trim()}.`,
        `${vi ? 'Trình độ' : 'Level'}: ${level}.`,
        `${vi ? 'Số lượng mục' : 'Number of items'}: ${Math.max(1, Math.min(30, Number(count) || 8))}.`,
        vi ? 'Ngôn ngữ câu hỏi theo đúng chủ đề; hướng dẫn và giải thích ngắn gọn, đáp án phải chính xác.' : 'Use the appropriate language for the topic; keep instructions and explanations concise and answers accurate.',
        slug === 'top-five-arena' ? (vi ? 'Mỗi vòng bắt buộc có đúng 5 đáp án, điểm giảm dần.' : 'Every round must contain exactly five answers with descending points.') : '',
        slug === 'crossword-trial' ? (vi ? 'Keyword có 3-12 ký tự; số items phải bằng số ký tự keyword; đáp án thứ i phải chứa ký tự thứ i của keyword.' : 'The keyword must have 3-12 characters; item count must equal keyword length; answer i must contain keyword character i.') : '',
        slug === 'knowledge-train' ? (vi ? 'Sắp xếp các cặp câu hỏi–đáp án thành một chuỗi kiến thức logic.' : 'Arrange question-answer pairs as one logical knowledge chain.') : '',
        notes.trim() ? `${vi ? 'Yêu cầu thêm' : 'Additional requirements'}: ${notes.trim()}` : '',
        `${vi ? 'Schema bắt buộc' : 'Required schema'}: ${schema}`,
        vi ? 'Chỉ trả về JSON hợp lệ. Không dùng markdown.' : 'Return valid JSON only. Do not use Markdown.',
      ].filter(Boolean).join('\n');

      const output = await callAI({
        task: 'game',
        language,
        prompt,
        context: { gameSlug: slug, gameTitle: title, level, count },
        label: vi ? `Đang tạo nội dung cho ${title}…` : `Creating content for ${title}…`,
      });
      const parsed = extractJson(output);
      setRawResult(output);
      setResult(parsed);
      if (!parsed) {
        setError(vi ? 'AI đã trả lời nhưng JSON chưa hợp lệ. Thầy/cô có thể tạo lại hoặc sao chép nội dung thô.' : 'AI responded, but the JSON is not valid. Generate again or copy the raw output.');
      }
    } catch (generateError) {
      setError(generateError?.message || (vi ? 'Không thể tạo dữ liệu trò chơi.' : 'Could not generate game content.'));
    } finally {
      setLoading(false);
    }
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(resultText);
      setNotice(vi ? 'Đã sao chép dữ liệu.' : 'Data copied.');
    } catch {
      setError(vi ? 'Trình duyệt không cho phép sao chép tự động.' : 'The browser blocked automatic copying.');
    }
  };

  const applyDirectly = async () => {
    if (!result) {
      setError(vi ? 'Cần có JSON hợp lệ trước khi thêm vào game.' : 'Valid JSON is required before applying to the game.');
      return;
    }
    setApplying(true);
    setError('');
    setNotice('');
    try {
      localStorage.setItem(`bes-game-ai-backup:${slug}`, JSON.stringify(result));
      const applied = await onApply?.(result);
      if (!onApply) {
        window.dispatchEvent(new CustomEvent('brian:game-ai-generated', { detail: { slug, data: result, raw: rawResult } }));
      }
      const countLabel = applied?.appliedCount ? ` (${applied.appliedCount} ${vi ? 'mục' : 'items'})` : '';
      setNotice(vi ? `Đã thêm trực tiếp vào ứng dụng${countLabel}.` : `Added directly to the app${countLabel}.`);
    } catch (applyError) {
      setError(applyError?.message || (vi ? 'Không thể thêm dữ liệu vào game.' : 'Could not apply data to the game.'));
    } finally {
      setApplying(false);
    }
  };

  return (
    <div className={`game-ai-root${open ? ' is-open' : ''}`} data-game-ai-creator>
      {open ? (
        <section className="game-ai-panel" role="dialog" aria-label={vi ? 'Tạo nội dung trò chơi bằng AI' : 'Create game content with AI'}>
          <header>
            <div><span aria-hidden="true">✦</span><div><small>OPENROUTER · FREE</small><h2>{vi ? 'Tạo nội dung AI' : 'AI Content Creator'}</h2><p>{title}</p></div></div>
            <button type="button" onClick={() => setOpen(false)} aria-label={vi ? 'Đóng' : 'Close'}>×</button>
          </header>

          <div className="game-ai-form">
            <label><span>{vi ? 'Chủ đề' : 'Topic'}</span><input value={topic} onChange={(event) => setTopic(event.target.value)} placeholder={vi ? 'Ví dụ: Câu điều kiện loại 2' : 'Example: Second conditional'} /></label>
            <div className="game-ai-grid">
              <label><span>{vi ? 'Trình độ' : 'Level'}</span><select value={level} onChange={(event) => setLevel(event.target.value)}><option>B1</option><option>B2</option><option>C1</option><option>Mixed B1–C1</option></select></label>
              <label><span>{vi ? 'Số mục' : 'Items'}</span><input type="number" min="1" max="30" value={count} onChange={(event) => setCount(event.target.value)} /></label>
            </div>
            <label><span>{vi ? 'Yêu cầu thêm' : 'Additional requirements'}</span><textarea rows={3} value={notes} onChange={(event) => setNotes(event.target.value)} placeholder={vi ? 'Không trùng từ khóa, có giải thích đáp án…' : 'No repeated keywords, include explanations…'} /></label>
            <button type="button" className="game-ai-generate" onClick={generate} disabled={loading}>{loading ? (vi ? 'Đang tạo…' : 'Generating…') : (vi ? 'Tạo nội dung' : 'Generate content')}</button>
          </div>

          {error ? <div className="game-ai-error" role="alert">{error}</div> : null}
          {notice ? <div className="game-ai-notice" role="status">{notice}</div> : null}

          {resultText ? (
            <div className="game-ai-result">
              <div><strong>{result ? (vi ? 'Dữ liệu sẵn sàng' : 'Content ready') : (vi ? 'Nội dung thô' : 'Raw output')}</strong><span>{resultText.length.toLocaleString(vi ? 'vi-VN' : 'en-US')} {vi ? 'ký tự' : 'characters'}</span></div>
              <textarea rows={12} value={resultText} readOnly />
              <footer>
                <button type="button" onClick={copy}>{vi ? 'Sao chép' : 'Copy'}</button>
                {result ? <button type="button" onClick={() => downloadJson(`${slug}-ai-content.json`, result)}>{vi ? 'Tải JSON dự phòng' : 'Download backup JSON'}</button> : null}
                <button type="button" className="primary" onClick={applyDirectly} disabled={!result || applying}>{applying ? (vi ? 'Đang thêm…' : 'Applying…') : (vi ? 'Thêm trực tiếp vào game' : 'Add directly to game')}</button>
              </footer>
            </div>
          ) : null}
        </section>
      ) : null}

      <button type="button" className="game-ai-launcher" onClick={() => setOpen((value) => !value)} aria-expanded={open} title={vi ? 'Tạo nội dung bằng AI' : 'Create content with AI'}>
        <span aria-hidden="true">✦</span><b>{vi ? 'Tạo bằng AI' : 'Create with AI'}</b>
      </button>
    </div>
  );
}
