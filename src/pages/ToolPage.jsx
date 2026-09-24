import React, { Suspense, lazy, useMemo, useState } from 'react';
import { isRetiredApp } from '../data/retiredApps.js';

const NewsReader = lazy(() => import('./NewsReader.jsx'));
const VietnamTaxStudio = lazy(() => import('./VietnamTaxStudio.jsx'));
const TextCareStudio = lazy(() => import('./TextCareStudio.jsx'));
const AITool = lazy(() => import('./AITool.jsx'));
const TextLabActivities = lazy(() => import('./TextLabActivities.jsx'));
const THPTPracticeHub = lazy(() => import('./THPTPracticeHub.jsx'));
const BrianTeamPortal = lazy(() => import('./BrianTeamPortal.jsx'));
const GradebookStudio = lazy(() => import('./GradebookStudio.jsx'));

function ToolFallback({ language = 'vi' }) {
  return <div className="page narrow"><section className="panel empty-state"><h1>{language === 'vi' ? 'Đang mở công cụ...' : 'Opening tool...'}</h1><p>{language === 'vi' ? 'Đang tải đúng mô-đun cần dùng để giao diện nhẹ hơn.' : 'Loading only the module you need for a lighter interface.'}</p></section></div>;
}

function renderLazy(Component, props, extraProps = {}) {
  return <Suspense fallback={<ToolFallback language={props.language} />}><Component {...props} {...extraProps} /></Suspense>;
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

  if (tool && isRetiredApp(tool)) {
    return <div className="page narrow"><section className="panel empty-state"><h1>{language === 'vi' ? 'Ứng dụng đã được gỡ' : 'App retired'}</h1><p>{language === 'vi' ? 'Ứng dụng này không còn thuộc Brian.' : 'This app is no longer part of Brian.'}</p><button className="primary" onClick={() => (window.location.hash = '#/apps')}>{language === 'vi' ? 'Về Ứng dụng' : 'Back to Apps'}</button></section></div>;
  }

  if (tool?.slug === 'gradebook-studio') return renderLazy(GradebookStudio, props);
  if (tool?.slug === 'textlab-activities') return renderLazy(TextLabActivities, props);
  if (tool?.slug === 'thpt-practice-hub') return renderLazy(THPTPracticeHub, props);
  if (tool?.slug === 'brian-team') return renderLazy(BrianTeamPortal, props);
  if (tool?.slug === 'news-reader') return renderLazy(NewsReader, props);
  if (tool?.slug === 'vietnam-tax') return renderLazy(VietnamTaxStudio, props);
  if (tool?.slug === 'textcare') return renderLazy(TextCareStudio, props);
  if (tool?.api) return renderLazy(AITool, props);

  if (!tool) {
    return <div className="page narrow"><section className="panel empty-state"><h1>Tool not found</h1><button className="primary" onClick={() => (window.location.hash = '#/apps')}>Back to Apps</button></section></div>;
  }

  const toolTitle = language === 'vi' ? tool.titleVi || tool.title : tool.title;
  const toolDesc = language === 'vi' ? tool.descVi || tool.desc : tool.desc;

  return (
    <div className="page tool-page">
      <button className="back-btn" onClick={() => window.history.back()}>← {language === 'vi' ? 'Quay lại' : 'Back'}</button>
      <section className="tool-hero panel"><div><span className="eyebrow">{tool.group}</span><h1><span>{tool.icon}</span> {toolTitle}</h1><p>{toolDesc}</p></div><div className="tool-state"><span>{tool.api ? '🔑 AI/API' : '⚡ Offline'}</span><span>{tool.status}</span><span>{hasApiKey ? 'API OK' : 'No API Key'}</span></div></section>
      <section className="builder-grid">
        <div className="panel builder-panel"><h2>1. {language === 'vi' ? 'Chọn template' : 'Choose template'}</h2><div className="template-grid">{templates.map((tpl) => <button key={tpl.id} className={selected === tpl.id ? 'template active' : 'template'} onClick={() => setSelected(tpl.id)}><span>{tpl.icon}</span><strong>{tpl.title}</strong><small>{language === 'vi' ? tpl.descVi : tpl.desc}</small></button>)}</div><div className="hint-box"><strong>{language === 'vi' ? 'Ghi chú:' : 'Note:'}</strong>{' '}{language === 'vi' ? 'Trang demo cơ bản. Các công cụ chính đã có trang hoạt động riêng.' : 'Basic demo page. Main tools have their own working pages.'}</div></div>
        <div className="panel builder-panel"><h2>2. {language === 'vi' ? 'Nội dung của bạn' : 'Your content'}</h2><label>{language === 'vi' ? 'Tiêu đề hoạt động' : 'Activity title'}</label><input value={title} onChange={(e) => setTitle(e.target.value)} /><label>{language === 'vi' ? 'Nhập nội dung, mỗi dòng một ý' : 'Enter content, one item per line'}</label><textarea value={content} onChange={(e) => setContent(e.target.value)} rows={12} /><button className="primary full" onClick={() => {}}>{language === 'vi' ? 'Tạo preview' : 'Generate preview'}</button></div>
      </section>
      <section className="panel preview-panel"><div className="preview-head"><div><span className="eyebrow">3. Activity Preview</span><h2>{title || 'My Activity'}</h2></div><div className="preview-actions"><button>Copy</button><button>{language === 'vi' ? 'Xuất HTML' : 'Export HTML'}</button></div></div><div className="preview-box">{preview.length ? preview.map((line, i) => <div key={i} className="preview-item">{line}</div>) : <p>{language === 'vi' ? 'Nhập nội dung để xem preview.' : 'Enter content to preview.'}</p>}</div></section>
    </div>
  );
}
