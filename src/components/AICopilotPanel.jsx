import React, { useState } from 'react';
import { runAITask } from '../utils/aiTaskRuntime.js';

export default function AICopilotPanel({
  language,
  apiKey,
  aiModel,
  hasApiKey,
  title = 'AI Copilot',
  description = '',
  task = '',
  outputFormat = '',
  defaultInstruction = '',
  defaultSource = '',
  defaultLevel = 'B2-C1',
  defaultCount = 20,
  applyLabel = '',
  onApply,
}) {
  const [instruction, setInstruction] = useState(defaultInstruction);
  const [sourceText, setSourceText] = useState(defaultSource);
  const [level, setLevel] = useState(defaultLevel);
  const [count, setCount] = useState(defaultCount);
  const [output, setOutput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  const generate = async () => {
    if (!hasApiKey) {
      setError(language === 'vi' ? 'Vui lòng cấu hình một AI provider trong Thiết lập.' : 'Please configure an AI provider in Settings.');
      return;
    }
    setLoading(true);
    setError('');
    setCopied(false);
    try {
      const prompt = `You are the Brian English Studio AI Copilot for a Vietnamese high-school English teacher.\n\nTool / feature:\n${title}\n\nTeacher goal:\n${task}\n\nLevel: ${level}\nQuantity / size: ${count}\nLanguage: ${language === 'vi' ? 'Vietnamese interface support is allowed. English learning content should remain in English unless Vietnamese explanation is necessary.' : 'English'}\n\nTeacher instruction:\n${instruction || '(none)'}\n\nSource text / vocabulary / existing content / notes:\n${sourceText || '(none)'}\n\nRequired output format:\n${outputFormat || 'Return classroom-ready content with clear headings and answer keys when relevant.'}\n\nRules:\n- Return only the usable content for this tool.\n- Do not use markdown fences.\n- Avoid duplicate questions, duplicate stems, and repeated content words when possible.\n- Make the output directly pasteable into the current Brian English Studio tool.\n- Include answer keys when the activity is assessment-related.`;
      const result = await runAITask('assistant.copilot', {
        apiKey,
        model: aiModel,
        prompt,
        systemInstruction: 'You create accurate classroom-ready English teaching content in exact formats for interactive tools. Be concise, practical, and format-compliant.',
        temperature: 0.68,
      });
      setOutput(result);
    } catch (err) {
      setError(err.message || 'AI generation failed.');
    } finally {
      setLoading(false);
    }
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(output || '');
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1300);
    } catch {
      setError(language === 'vi' ? 'Không copy được trên trình duyệt này.' : 'Copy failed in this browser.');
    }
  };

  return (
    <article className="panel ai-copilot-panel metro-panel">
      <div className="preview-head ai-copilot-head">
        <div>
          <span className="eyebrow">AI Copilot</span>
          <h2>{title}</h2>
          {description && <p className="muted-line">{description}</p>}
        </div>
        <span className={hasApiKey ? 'status-badge' : 'status-badge warning'}>{hasApiKey ? 'AI READY' : 'NO API KEY'}</span>
      </div>

      <div className="ai-copilot-grid">
        <div>
          <label>{language === 'vi' ? 'Yêu cầu tạo nội dung' : 'Content instruction'}</label>
          <textarea rows={5} value={instruction} onChange={(e) => setInstruction(e.target.value)} placeholder={language === 'vi' ? 'Ví dụ: tạo 20 câu về Past Simple vs Past Continuous, level B2...' : 'Example: create 20 questions about Past Simple vs Past Continuous, level B2...'} />
        </div>
        <div>
          <label>{language === 'vi' ? 'Nguồn / từ vựng / ghi chú' : 'Source / vocabulary / notes'}</label>
          <textarea rows={5} value={sourceText} onChange={(e) => setSourceText(e.target.value)} placeholder={language === 'vi' ? 'Dán văn bản, từ vựng, yêu cầu, hoặc bài viết học sinh...' : 'Paste text, vocabulary, requirements, or student writing...'} />
        </div>
      </div>

      <div className="ai-copilot-controls">
        <div>
          <label>Level</label>
          <select value={level} onChange={(e) => setLevel(e.target.value)}>
            {['A2', 'B1', 'B1-B2', 'B2', 'B2-C1', 'C1'].map((item) => <option key={item}>{item}</option>)}
          </select>
        </div>
        <div>
          <label>{language === 'vi' ? 'Số lượng' : 'Quantity'}</label>
          <input type="number" min="1" max="200" value={count} onChange={(e) => setCount(Number(e.target.value) || 1)} />
        </div>
        <button className="primary" onClick={generate} disabled={loading}>{loading ? (language === 'vi' ? 'Đang tạo...' : 'Generating...') : (language === 'vi' ? 'Tạo bằng AI' : 'Generate with AI')}</button>
        {!hasApiKey && <button className="secondary" onClick={() => (window.location.hash = '#/settings')}>{language === 'vi' ? 'Nhập API key' : 'Add API key'}</button>}
      </div>

      {error && <p className="error-box">⚠️ {error}</p>}
      {output && (
        <div className="ai-copilot-output">
          <div className="preview-head">
            <div><span className="eyebrow">Generated Content</span><h3>{language === 'vi' ? 'Nội dung AI đã tạo' : 'AI generated content'}</h3></div>
            <div className="preview-actions wrap-actions">
              <button onClick={copy}>{copied ? (language === 'vi' ? 'Đã copy' : 'Copied') : 'Copy'}</button>
              {onApply && <button className="primary" onClick={() => onApply(output, { instruction, sourceText, level, count })}>{applyLabel || (language === 'vi' ? 'Dùng nội dung này' : 'Use this content')}</button>}
            </div>
          </div>
          <pre className="ai-output compact-output">{output}</pre>
        </div>
      )}
    </article>
  );
}
