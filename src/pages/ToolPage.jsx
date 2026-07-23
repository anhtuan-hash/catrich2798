import React, { Suspense, lazy, useMemo, useState } from 'react';

const WordGraphStudio = lazy(() => import('./WordGraphStudio.jsx'));
const ReadingStudio = lazy(() => import('./ReadingStudio.jsx'));
const NewsReader = lazy(() => import('./NewsReader.jsx'));
const VietnamTaxStudio = lazy(() => import('./VietnamTaxStudio.jsx'));
const TextCareStudio = lazy(() => import('./TextCareStudio.jsx'));
const LessonArchitect = lazy(() => import('./LessonArchitect.jsx'));
const SpecializedAppPage = lazy(() => import('./SpecializedAppPage.jsx'));
const DominoWordForm = lazy(() => import('./DominoWordForm.jsx'));
const PromptStudio = lazy(() => import('./PromptStudio.jsx'));
const ClassroomGame = lazy(() => import('./ClassroomGame.jsx'));
const TestBuilder = lazy(() => import('./TestBuilder.jsx'));
const StudentPractice = lazy(() => import('./StudentPractice.jsx'));
const AITool = lazy(() => import('./AITool.jsx'));
const TextLabActivities = lazy(() => import('./TextLabActivities.jsx'));
const THPTPracticeHub = lazy(() => import('./THPTPracticeHub.jsx'));
const ProfessionalHubApp = lazy(() => import('../apps/professional-hub/ProfessionalHubApp.jsx'));
const specializedToolSlugs = new Set([
  'exam-studio',
]);

function ToolFallback({ language = 'vi' }) {
  return (
    <div className="page narrow">
      <section className="panel empty-state">
        <h1>{language === 'vi' ? 'Đang mở công cụ...' : 'Opening tool...'}</h1>
        <p>{language === 'vi' ? 'Đang tải đúng mô-đun cần dùng để giao diện nhẹ hơn.' : 'Loading only the module you need for a lighter interface.'}</p>
      </section>
    </div>
  );
}

function renderLazy(Component, props, extraProps = {}) {
  return (
    <Suspense fallback={<ToolFallback language={props.language} />}>
      <Component {...props} {...extraProps} />
    </Suspense>
  );
}
const templates = [
  { id: 'quiz', icon: '❓', title: 'Quiz', descVi: 'Câu hỏi trắc nghiệm.', desc: 'Multiple-choice questions.' },
  { id: 'match', icon: '🔗', title: 'Match Up', descVi: 'Nối thuật ngữ và định nghĩa.', desc: 'Match terms and definitions.' },
  { id: 'cards', icon: '🎙️', title: 'Speaking Cards', descVi: 'Thẻ câu hỏi nói.', desc: 'Speaking prompt cards.' },
  { id: 'box', icon: '🎁', title: 'Open the Box', descVi: 'Mở hộp hiện câu hỏi.', desc: 'Reveal hidden prompts.' },
  { id: 'sort', icon: '🧩', title: 'Group Sort', descVi: 'Phân loại mục vào nhóm.', desc: 'Sort items into groups.' },
  { id: 'wordsearch', icon: '🔎', title: 'Wordsearch', descVi: 'Tìm từ trong bảng chữ.', desc: 'Find words in a grid.' },
];

function buildPreview(content, template, language) {
  const lines = content.split('\n').map((line) => line.trim()).filter(Boolean).slice(0, 8);
  if (!lines.length) return [];
  return lines.map((line, index) => {
    if (template === 'quiz') return `${index + 1}. ${line}?  A. Option 1  B. Option 2  C. Option 3  D. Option 4`;
    if (template === 'match') return `${index + 1}. ${line}  →  ${language === 'vi' ? 'Định nghĩa / nghĩa / ví dụ' : 'Definition / meaning / example'}`;
    if (template === 'cards') return `${index + 1}. Talk about: ${line}`;
    if (template === 'box') return `Box ${index + 1}: ${line}`;
    if (template === 'sort') return `${line}  →  Category A / Category B`;
    return `WORD: ${line.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 18)}`;
  });
}

export default function ToolPage(props) {
  const { tool, language, hasApiKey } = props;
  const [selected, setSelected] = useState('quiz');
  const [content, setContent] = useState('Past Simple\nPast Continuous\nwhile\nwhen\nwas watching\nwent out');
  const [title, setTitle] = useState('My Activity');
  const preview = useMemo(() => buildPreview(content, selected, language), [content, selected, language]);

  if (tool?.slug === 'professional-hub') {
    return renderLazy(ProfessionalHubApp, props);
  }

if (tool?.slug === 'textlab-activities') {
    return renderLazy(TextLabActivities, props);
  }

  if (tool?.slug === 'thpt-practice-hub') {
    return renderLazy(THPTPracticeHub, props);
  }

  if (tool?.slug === 'word2graph') {
    return renderLazy(WordGraphStudio, props);
  }

  if (tool?.slug === 'reading-studio') {
    return renderLazy(ReadingStudio, props);
  }

  if (tool?.slug === 'news-reader') {
    return renderLazy(NewsReader, props);
  }

  if (tool?.slug === 'vietnam-tax') {
    return renderLazy(VietnamTaxStudio, props);
  }

  if (tool?.slug === 'textcare') {
    return renderLazy(TextCareStudio, props);
  }

  if (tool?.slug === 'lesson-plan-ai') {
    return renderLazy(LessonArchitect, props);
  }

  if (specializedToolSlugs.has(tool?.slug)) {
    return renderLazy(SpecializedAppPage, props);
  }


  if (tool?.slug === 'domino-wordform') {
    return renderLazy(DominoWordForm, props);
  }

  if (tool?.slug === 'prompt-studio') {
    return renderLazy(PromptStudio, props);
  }

  if (['jeopardy-builder', 'open-the-box', 'team-race', 'lucky-wheel', 'matching-battle'].includes(tool?.slug)) {
    return renderLazy(ClassroomGame, props);
  }

  if (tool?.slug === 'test-paper-builder') {
    return renderLazy(TestBuilder, props);
  }

  if (tool?.slug === 'student-practice') {
    return renderLazy(StudentPractice, props);
  }

  if (tool?.api) {
    return renderLazy(AITool, props);
  }

  if (!tool) {
    return (
      <div className="page narrow">
        <section className="panel empty-state">
          <h1>Tool not found</h1>
          <button className="primary" onClick={() => (window.location.hash = '#/apps')}>Back to Apps</button>
        </section>
      </div>
    );
  }

  const toolTitle = language === 'vi' ? tool.titleVi || tool.title : tool.title;
  const toolDesc = language === 'vi' ? tool.descVi || tool.desc : tool.desc;

  return (
    <div className="page tool-page">
      <button className="back-btn" onClick={() => window.history.back()}>← {language === 'vi' ? 'Quay lại' : 'Back'}</button>
      <section className="tool-hero panel">
        <div>
          <span className="eyebrow">{tool.group}</span>
          <h1><span>{tool.icon}</span> {toolTitle}</h1>
          <p>{toolDesc}</p>
        </div>
        <div className="tool-state">
          <span>{tool.api ? '🔑 AI/API' : '⚡ Offline'}</span>
          <span>{tool.status}</span>
          <span>{hasApiKey ? 'API OK' : 'No API Key'}</span>
        </div>
      </section>

      <section className="builder-grid">
        <div className="panel builder-panel">
          <h2>1. {language === 'vi' ? 'Chọn template' : 'Choose template'}</h2>
          <div className="template-grid">
            {templates.map((tpl) => (
              <button key={tpl.id} className={selected === tpl.id ? 'template active' : 'template'} onClick={() => setSelected(tpl.id)}>
                <span>{tpl.icon}</span>
                <strong>{tpl.title}</strong>
                <small>{language === 'vi' ? tpl.descVi : tpl.desc}</small>
              </button>
            ))}
          </div>
          <div className="hint-box">
            <strong>{language === 'vi' ? 'Ghi chú:' : 'Note:'}</strong>{' '}
            {language === 'vi' ? 'Trang demo cơ bản. Các công cụ chính đã có trang hoạt động riêng.' : 'Basic demo page. Main tools have their own working pages.'}
          </div>
        </div>

        <div className="panel builder-panel">
          <h2>2. {language === 'vi' ? 'Nội dung của bạn' : 'Your content'}</h2>
          <label>{language === 'vi' ? 'Tiêu đề hoạt động' : 'Activity title'}</label>
          <input value={title} onChange={(e) => setTitle(e.target.value)} />
          <label>{language === 'vi' ? 'Nhập nội dung, mỗi dòng một ý' : 'Enter content, one item per line'}</label>
          <textarea value={content} onChange={(e) => setContent(e.target.value)} rows={12} />
          <button className="primary full" onClick={() => {}}>{language === 'vi' ? 'Tạo preview' : 'Generate preview'}</button>
        </div>
      </section>

      <section className="panel preview-panel">
        <div className="preview-head">
          <div>
            <span className="eyebrow">3. Activity Preview</span>
            <h2>{title || 'My Activity'}</h2>
          </div>
          <div className="preview-actions">
            <button>{language === 'vi' ? 'Copy' : 'Copy'}</button>
            <button>{language === 'vi' ? 'Xuất HTML' : 'Export HTML'}</button>
          </div>
        </div>
        <div className="preview-box">
          {preview.length ? preview.map((line, i) => <div key={i} className="preview-item">{line}</div>) : <p>{language === 'vi' ? 'Nhập nội dung để xem preview.' : 'Enter content to preview.'}</p>}
        </div>
      </section>
    </div>
  );
}
