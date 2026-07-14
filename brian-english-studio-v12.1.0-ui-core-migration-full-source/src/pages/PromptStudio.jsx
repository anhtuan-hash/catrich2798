import React, { useMemo, useState } from 'react';
import SectionHeader from '../components/SectionHeader.jsx';
import AICopilotPanel from '../components/AICopilotPanel.jsx';
import { PROMPTS_KEY, deleteFromList, downloadFile, exportJson, loadPrompts, savePromptEntry, slugify } from '../utils/library.js';

function formatDate(iso) {
  try {
    return new Intl.DateTimeFormat('vi-VN', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(iso));
  } catch {
    return iso || '';
  }
}

const PROMPT_TEMPLATES = [
  {
    title: 'B2-C1 Word Form MCQ',
    category: 'Assessment',
    body: 'Create 30 B2-C1 word form multiple-choice questions. Do not repeat content words. Randomize A-D options. Include answer key and short explanation for each item.',
  },
  {
    title: 'THPT Cloze Test',
    category: 'Exam Prep',
    body: 'Create a THPT-level cloze test with 10 numbered gaps on the topic below. Each gap has A-D options. Include answer key and explanations. Topic: ',
  },
  {
    title: 'Speaking Debate Cards',
    category: 'Speaking',
    body: 'Create 20 speaking cards for B2-C1 learners. Each card should include a debate question, two follow-up questions, and useful vocabulary.',
  },
];

function usePromptStore() {
  const [version, setVersion] = useState(0);
  const refresh = () => setVersion((value) => value + 1);
  return { prompts: loadPrompts(), refresh, version };
}

export default function PromptStudio({ language, apiKey, aiModel, hasApiKey }) {
  const { prompts, refresh } = usePromptStore();
  const [title, setTitle] = useState(PROMPT_TEMPLATES[0].title);
  const [category, setCategory] = useState(PROMPT_TEMPLATES[0].category);
  const [body, setBody] = useState(PROMPT_TEMPLATES[0].body);
  const [query, setQuery] = useState('');
  const [toast, setToast] = useState('');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return prompts;
    return prompts.filter((item) => `${item.title} ${item.category} ${item.body}`.toLowerCase().includes(q));
  }, [prompts, query]);

  const showToast = (message) => {
    setToast(message);
    window.clearTimeout(showToast.timer);
    showToast.timer = window.setTimeout(() => setToast(''), 2200);
  };

  const save = () => {
    if (!body.trim()) {
      showToast(language === 'vi' ? 'Prompt đang trống.' : 'Prompt is empty.');
      return;
    }
    savePromptEntry({ title: title || 'Untitled prompt', category: category || 'General', body });
    refresh();
    showToast(language === 'vi' ? 'Đã lưu prompt.' : 'Prompt saved.');
  };

  const copy = async (text) => {
    try {
      await navigator.clipboard.writeText(text || '');
      showToast(language === 'vi' ? 'Đã copy prompt.' : 'Prompt copied.');
    } catch {
      showToast(language === 'vi' ? 'Không copy được trên trình duyệt này.' : 'Copy failed in this browser.');
    }
  };

  const loadTemplate = (tpl) => {
    setTitle(tpl.title);
    setCategory(tpl.category);
    setBody(tpl.body);
  };

  return (
    <div className="page narrow prompt-studio-page">
      <button className="back-btn" onClick={() => window.history.back()}>← {language === 'vi' ? 'Quay lại' : 'Back'}</button>
      <SectionHeader
        eyebrow="Kho prompt"
        title={language === 'vi' ? 'Prompt Studio hoạt động thật' : 'Working Prompt Studio'}
        text={language === 'vi' ? 'Lưu, tìm, copy, xuất JSON/TXT và tái sử dụng prompt mẫu cho các công cụ AI.' : 'Save, search, copy, export and reuse prompts for AI teaching tools.'}
      />

      <section className="prompt-studio-grid">
        <AICopilotPanel
          language={language}
          apiKey={apiKey}
          aiModel={aiModel}
          hasApiKey={hasApiKey}
          title={language === 'vi' ? 'AI viết prompt mẫu' : 'AI Prompt Designer'}
          description={language === 'vi' ? 'Tạo prompt chất lượng cao cho các công cụ AI dạy học.' : 'Design high-quality reusable prompts for AI teaching tools.'}
          task="Create a reusable prompt for English teaching material generation."
          defaultInstruction="Write a prompt that creates 100 B2-C1 word form multiple-choice questions with randomized options, no duplicate content words, answer key and explanations."
          defaultCount={1}
          outputFormat="Return one polished reusable prompt only. No markdown fence. The prompt should be directly reusable."
          applyLabel={language === 'vi' ? 'Đưa vào trình soạn prompt' : 'Use in prompt editor'}
          onApply={(text) => { setBody(text); setTitle('AI Prompt'); setCategory('AI Generated'); showToast(language === 'vi' ? 'AI đã đưa prompt vào trình soạn.' : 'AI prompt applied to editor.'); }}
        />

        <article className="panel builder-panel">
          <h2>2. {language === 'vi' ? 'Soạn prompt' : 'Write a prompt'}</h2>
          <label>{language === 'vi' ? 'Mẫu nhanh' : 'Quick templates'}</label>
          <div className="template-row">
            {PROMPT_TEMPLATES.map((tpl) => <button key={tpl.title} onClick={() => loadTemplate(tpl)}>{tpl.title}</button>)}
          </div>
          <label>{language === 'vi' ? 'Tên prompt' : 'Prompt title'}</label>
          <input value={title} onChange={(e) => setTitle(e.target.value)} />
          <label>{language === 'vi' ? 'Nhóm' : 'Category'}</label>
          <input value={category} onChange={(e) => setCategory(e.target.value)} />
          <label>Prompt</label>
          <textarea rows={12} value={body} onChange={(e) => setBody(e.target.value)} />
          <div className="preview-actions wrap-actions">
            <button className="primary" onClick={save}>{language === 'vi' ? 'Lưu prompt' : 'Save prompt'}</button>
            <button onClick={() => copy(body)} disabled={!body.trim()}>Copy</button>
            <button onClick={() => downloadFile(`${slugify(title)}.txt`, body)} disabled={!body.trim()}>TXT</button>
          </div>
        </article>

        <article className="panel preview-panel">
          <div className="preview-head">
            <div><span className="eyebrow">3. Library</span><h2>{language === 'vi' ? 'Prompt đã lưu' : 'Saved prompts'}</h2></div>
            <button onClick={() => exportJson('brian-prompts.json', prompts)} disabled={!prompts.length}>JSON</button>
          </div>
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={language === 'vi' ? 'Tìm prompt...' : 'Search prompts...'} />
          <div className="prompt-list standalone-prompts">
            {filtered.length ? filtered.map((item) => (
              <div className="prompt-item" key={item.id}>
                <strong>{item.title}</strong>
                <small>{item.category} · {formatDate(item.createdAt)}</small>
                <p>{item.body}</p>
                <div className="preview-actions wrap-actions">
                  <button onClick={() => copy(item.body)}>Copy</button>
                  <button onClick={() => loadTemplate(item)}>{language === 'vi' ? 'Sửa từ bản này' : 'Edit from this'}</button>
                  <button onClick={() => { deleteFromList(PROMPTS_KEY, item.id); refresh(); }}>Delete</button>
                </div>
              </div>
            )) : <div className="empty-state"><p>{language === 'vi' ? 'Chưa có prompt phù hợp.' : 'No matching prompts.'}</p></div>}
          </div>
        </article>
      </section>
      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}
