import React, { useMemo, useState } from 'react';
import { AI_TOOL_PRESETS, generateGenericToolOutput } from '../utils/openRouter.js';
import {
  addHistoryEntry,
  addQuestionsFromTextToBank,
  exportAsHtml,
  exportAsWord,
  parseMcqFromText,
  savePromptEntry,
  slugify,
} from '../utils/library.js';

function saveTextFile(filename, content, type = 'text/plain;charset=utf-8') {
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

export default function AITool({ tool, language = 'vi', apiKey = '', aiModel = '', hasApiKey = false }) {
  const preset = useMemo(() => AI_TOOL_PRESETS[tool?.slug] || AI_TOOL_PRESETS.text2quiz, [tool?.slug]);
  const toolTitle = language === 'vi' ? tool?.titleVi || tool?.title : tool?.title;
  const toolDesc = language === 'vi' ? tool?.descVi || tool?.desc : tool?.desc;
  const [instruction, setInstruction] = useState(preset.defaultInstruction || '');
  const [sourceText, setSourceText] = useState('');
  const [level, setLevel] = useState('B2-C1');
  const [itemCount, setItemCount] = useState(10);
  const [output, setOutput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const questions = useMemo(
    () => parseMcqFromText(output, { source: toolTitle, level, topic: instruction.slice(0, 70) }),
    [output, toolTitle, level, instruction],
  );

  const showNotice = (message) => {
    setNotice(message);
    window.clearTimeout(showNotice.timer);
    showNotice.timer = window.setTimeout(() => setNotice(''), 2400);
  };

  const generate = async () => {
    setError('');
    if (!hasApiKey) {
      setError(language === 'vi' ? 'Hãy cấu hình AI trong Cài đặt trước.' : 'Configure AI in Settings first.');
      return;
    }
    if (!instruction.trim() && !sourceText.trim()) {
      setError(language === 'vi' ? 'Hãy nhập yêu cầu hoặc nội dung nguồn.' : 'Enter an instruction or source text.');
      return;
    }
    setLoading(true);
    try {
      const result = await generateGenericToolOutput({
        apiKey,
        model: aiModel,
        slug: tool?.slug,
        instruction,
        sourceText,
        level,
        itemCount,
        language,
      });
      setOutput(result);
      addHistoryEntry({
        kind: 'ai-output',
        toolSlug: tool?.slug,
        toolTitle,
        title: instruction.slice(0, 90) || toolTitle,
        content: result,
        level,
        itemCount,
        tags: [tool?.slug, level].filter(Boolean),
        model: aiModel,
        sourceApp: tool?.slug,
        sourceAppTitle: toolTitle,
      });
      showNotice(language === 'vi' ? 'Đã tạo và lưu kết quả.' : 'Generated and saved.');
    } catch (generationError) {
      setError(generationError?.message || String(generationError));
    } finally {
      setLoading(false);
    }
  };

  const copyOutput = async () => {
    try {
      await navigator.clipboard.writeText(output);
      showNotice(language === 'vi' ? 'Đã sao chép.' : 'Copied.');
    } catch {
      showNotice(language === 'vi' ? 'Trình duyệt không cho phép sao chép.' : 'Copy is unavailable.');
    }
  };

  const savePrompt = () => {
    savePromptEntry({ title: instruction.slice(0, 70) || toolTitle, category: toolTitle, body: instruction });
    showNotice(language === 'vi' ? 'Đã lưu prompt.' : 'Prompt saved.');
  };

  const addToBank = () => {
    const added = addQuestionsFromTextToBank(output, { source: toolTitle, level, topic: instruction.slice(0, 70) });
    showNotice(language === 'vi' ? `Đã thêm ${added.length} câu.` : `Added ${added.length} questions.`);
  };

  return (
    <div className="page tool-page ai-tool-page">
      <button className="back-btn" type="button" onClick={() => window.history.back()}>← {language === 'vi' ? 'Quay lại' : 'Back'}</button>
      <section className="tool-hero panel ai-hero">
        <div>
          <span className="eyebrow">AI Generator</span>
          <h1><span>{tool?.icon}</span> {toolTitle}</h1>
          <p>{toolDesc}</p>
        </div>
        <div className="tool-state">
          <span>✨ AI</span>
          <span>{hasApiKey ? 'AI OK' : 'AI chưa cấu hình'}</span>
          <span>{aiModel || 'openrouter/free'}</span>
        </div>
      </section>

      <section className="ai-builder-grid">
        <article className="panel builder-panel">
          <span className="eyebrow">1. {language === 'vi' ? 'Yêu cầu' : 'Request'}</span>
          <h2>{language === 'vi' ? 'Tạo nội dung' : 'Generate content'}</h2>
          <label>{language === 'vi' ? 'Bạn muốn tạo gì?' : 'What do you want to create?'}</label>
          <textarea value={instruction} onChange={(event) => setInstruction(event.target.value)} rows={6} placeholder={preset.defaultInstruction} />
          <div className="two-fields">
            <div>
              <label>Level</label>
              <select value={level} onChange={(event) => setLevel(event.target.value)}>
                <option>A2-B1</option><option>B1-B2</option><option>B2-C1</option><option>C1</option><option>THPT</option>
              </select>
            </div>
            <div>
              <label>{language === 'vi' ? 'Số lượng' : 'Quantity'}</label>
              <input type="number" min="1" max="100" value={itemCount} onChange={(event) => setItemCount(Math.max(1, Number(event.target.value) || 1))} />
            </div>
          </div>
          <label>{language === 'vi' ? 'Nội dung nguồn' : 'Source content'}</label>
          <textarea value={sourceText} onChange={(event) => setSourceText(event.target.value)} rows={9} placeholder={language === 'vi' ? 'Dán văn bản hoặc dữ liệu nguồn…' : 'Paste source text or data…'} />
          <button className="primary full" type="button" onClick={generate} disabled={loading}>{loading ? (language === 'vi' ? 'Đang tạo…' : 'Generating…') : (language === 'vi' ? '✨ Tạo bằng AI' : '✨ Generate with AI')}</button>
          {!hasApiKey ? <button className="secondary full" type="button" onClick={() => { window.location.hash = '#/settings'; }}>{language === 'vi' ? 'Mở Cài đặt AI' : 'Open AI Settings'}</button> : null}
          {error ? <p className="error-box">⚠️ {error}</p> : null}
        </article>

        <article className="panel preview-panel ai-output-panel">
          <div className="preview-head">
            <div><span className="eyebrow">2. {language === 'vi' ? 'Kết quả' : 'Output'}</span><h2>{preset.outputHint}</h2></div>
            <div className="preview-actions wrap-actions">
              <button type="button" onClick={copyOutput} disabled={!output}>Copy</button>
              <button type="button" onClick={() => saveTextFile(`${slugify(toolTitle)}.txt`, output)} disabled={!output}>TXT</button>
              <button type="button" onClick={() => exportAsHtml(toolTitle, output)} disabled={!output}>HTML</button>
              <button type="button" onClick={() => exportAsWord(toolTitle, output)} disabled={!output}>Word</button>
              <button type="button" onClick={addToBank} disabled={!questions.length}>{language === 'vi' ? 'Ngân hàng' : 'Question bank'}</button>
              <button type="button" onClick={savePrompt} disabled={!instruction.trim()}>{language === 'vi' ? 'Lưu prompt' : 'Save prompt'}</button>
            </div>
          </div>
          {output ? <pre className="ai-output">{output}</pre> : <div className="empty-state"><p>{language === 'vi' ? 'Kết quả sẽ hiện ở đây.' : 'The generated output will appear here.'}</p></div>}
        </article>
      </section>
      {notice ? <div className="toast">{notice}</div> : null}
    </div>
  );
}
