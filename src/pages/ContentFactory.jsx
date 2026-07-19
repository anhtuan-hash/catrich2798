import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { callAI, extractJson } from '../utils/gemini.js';
import { getProviderSummary } from '../utils/aiProviders.js';
import { getRuntimeClient } from '../services/runtime/core.js';
import { useRuntimeCore } from '../services/runtime/useRuntimeCore.js';
import { downloadText, readLocal, safeJsonParse, scopedLocalKey, uid, writeLocal } from './v1093/shared.js';

const OUTPUTS = [
  ['worksheet', 'Worksheet', 'Phiếu học tập có nhiều phần và đáp án'],
  ['quiz', 'Quiz', 'Câu hỏi trắc nghiệm A–D'],
  ['cloze', 'Cloze test', 'Đoạn văn điền khuyết theo ngữ cảnh'],
  ['wordform', 'Word formation', 'Bài tập biến đổi từ B2–C1'],
  ['matching', 'Matching', 'Ghép từ, nghĩa, ví dụ hoặc khái niệm'],
  ['ordering', 'Sentence ordering', 'Sắp xếp câu hoặc đoạn hội thoại'],
  ['flashcards', 'Flashcards', 'Thẻ từ vựng hai mặt'],
  ['lesson-sequence', 'Lesson sequence', 'Chuỗi hoạt động cho một tiết dạy'],
];

function emptyProject() {
  return { id: '', title: 'Nội dung mới', output_type: 'worksheet', level: 'B2', item_count: 15, instruction: '', source_text: '', output: null, status: 'draft' };
}

function buildFallback(project) {
  const sentences = project.source_text.split(/(?<=[.!?])\s+/).map((value) => value.trim()).filter((value) => value.length > 30);
  const words = [...new Set((project.source_text.match(/[A-Za-z][A-Za-z'-]{4,}/g) || []).map((value) => value.toLowerCase()))];
  const count = Math.max(3, Number(project.item_count || 10));
  const items = Array.from({ length: count }, (_, index) => {
    const sentence = sentences[index % Math.max(sentences.length, 1)] || `Write an accurate ${project.level} example related to the source topic.`;
    const target = words[index % Math.max(words.length, 1)] || 'language';
    if (project.output_type === 'matching' || project.output_type === 'flashcards') return { prompt: target, answer: `Definition or example for “${target}”`, explanation: sentence };
    if (project.output_type === 'ordering') return { prompt: sentence.split(/\s+/).sort(() => 0.5 - Math.random()).join(' / '), answer: sentence, explanation: 'Restore the original logical order.' };
    return { prompt: `Choose the best completion based on the source: ${sentence.replace(new RegExp(`\\b${target}\\b`, 'i'), '_____')}`, options: [target, `${target}s`, `${target}ed`, `${target}ing`], answer: target, explanation: `The source uses “${target}” in this context.` };
  });
  return { title: project.title, type: project.output_type, level: project.level, instructions: project.instruction || 'Complete the following activities.', items, answerKey: items.map((item, index) => `${index + 1}. ${item.answer}`) };
}

function renderHtml(project, output) {
  const data = JSON.stringify(output).replace(/</g, '\\u003c');
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${project.title}</title><style>body{font-family:system-ui,sans-serif;background:#eef4fb;color:#10264a;margin:0;padding:30px}.sheet{max-width:900px;margin:auto;background:white;padding:32px;border:2px solid #10264a}.item{padding:18px 0;border-bottom:1px solid #ccd8e8}.options{display:grid;gap:8px;margin-top:10px}.options button{padding:10px;text-align:left;background:#f4f8fd;border:1px solid #9eb6d1;cursor:pointer}.answer{display:none;margin-top:10px;padding:10px;background:#e5f7ed}.show .answer{display:block}button.reveal{margin-top:10px;padding:9px 14px}</style></head><body><main class="sheet"><h1>${project.title}</h1><p>${output.instructions || ''}</p><div id="app"></div></main><script>const data=${data};const root=document.getElementById('app');root.innerHTML=(data.items||[]).map((item,i)=>'<section class="item"><b>'+(i+1)+'. '+item.prompt+'</b>'+(item.options?'<div class="options">'+item.options.map((o,j)=>'<button type="button">'+String.fromCharCode(65+j)+'. '+o+'</button>').join('')+'</div>':'')+'<button class="reveal" onclick="this.parentElement.classList.toggle(\\'show\\')">Show answer</button><div class="answer"><strong>'+item.answer+'</strong><p>'+(item.explanation||'')+'</p></div></section>').join('');</script></body></html>`;
}

export default function ContentFactory({ currentUser }) {
  const runtime = useRuntimeCore();
  const client = getRuntimeClient();
  const provider = getProviderSummary();
  const localKey = scopedLocalKey('bes-content-factory-v1093', currentUser);
  const [projects, setProjects] = useState([]);
  const [project, setProject] = useState(emptyProject);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [step, setStep] = useState(1);

  const loadProjects = useCallback(async () => {
    if (client && runtime.session) {
      const { data, error: loadError } = await client.from('content_factory_projects').select('*').order('updated_at', { ascending: false }).limit(200);
      if (!loadError) { setProjects((data || []).map((row) => ({ ...row, output: row.output_json || row.output }))); return; }
    }
    setProjects(readLocal(localKey, []));
  }, [client, localKey, runtime.session]);

  useEffect(() => {
    const learningTransfer = safeJsonParse(sessionStorage.getItem('bes-automation-practice-to-content'), null);
    if (learningTransfer) {
      setProject((current) => ({
        ...current,
        title: learningTransfer.title || current.title,
        source_text: learningTransfer.sourceText || '',
        instruction: learningTransfer.instruction || current.instruction,
        level: learningTransfer.level || current.level,
        item_count: Number(learningTransfer.itemCount || current.item_count),
        output_type: 'worksheet',
      }));
      sessionStorage.removeItem('bes-automation-practice-to-content');
      setNotice('Đã nhận bản nháp luyện tập từ Trung tâm tự động hóa.');
    }
    loadProjects();
  }, [loadProjects]);

  const output = project.output || null;
  const itemCount = output?.items?.length || 0;

  function openProject(item) {
    setProject({ ...emptyProject(), ...item, output: item.output_json || item.output || null });
    setStep(item.output_json || item.output ? 4 : 2);
  }

  async function saveProject(nextProject = project) {
    const payload = {
      ...(nextProject.id ? { id: nextProject.id } : {}), owner_id: currentUser.id,
      title: nextProject.title.trim() || 'Nội dung chưa đặt tên', output_type: nextProject.output_type,
      level: nextProject.level, item_count: Number(nextProject.item_count || 0), instruction: nextProject.instruction,
      source_text: nextProject.source_text, output_json: nextProject.output || {}, status: nextProject.output ? 'generated' : 'draft',
      updated_at: new Date().toISOString(),
    };
    let saved;
    if (client && runtime.session) {
      const { data, error: saveError } = await client.from('content_factory_projects').upsert(payload).select('*').single();
      if (saveError) throw saveError;
      saved = { ...data, output: data.output_json };
    } else {
      saved = { ...nextProject, ...payload, output: nextProject.output, id: nextProject.id || uid('content'), created_at: nextProject.created_at || new Date().toISOString() };
      writeLocal(localKey, [saved, ...projects.filter((entry) => entry.id !== saved.id)]);
    }
    setProject(saved);
    setProjects((current) => [saved, ...current.filter((entry) => entry.id !== saved.id)]);
    return saved;
  }

  async function generate() {
    if (!project.source_text.trim() && !project.instruction.trim()) { setError('Hãy nhập nguồn nội dung hoặc yêu cầu.'); return; }
    setBusy(true); setError(''); setNotice('');
    try {
      let result;
      if (provider.hasKey) {
        const outputInfo = OUTPUTS.find(([value]) => value === project.output_type);
        const prompt = `Create a ${project.level} English ${outputInfo?.[1] || project.output_type} for a Vietnamese high-school context.\nNumber of items: ${project.item_count}.\nTeacher instruction: ${project.instruction || 'Use the source accurately.'}\nSource:\n${project.source_text}\n\nReturn strict JSON only with schema:\n{"title":"...","type":"${project.output_type}","level":"${project.level}","instructions":"...","items":[{"prompt":"...","options":["..."],"answer":"...","explanation":"..."}],"answerKey":["1. ..."]}\nFor non-MCQ types, omit options. Avoid duplicate prompts and duplicate content words whenever feasible.`;
        const raw = await callAI({ prompt, systemInstruction: 'You are Brian Content Factory, an expert assessment and learning-material designer. Produce valid JSON only.', temperature: 0.55, responseMimeType: 'application/json', governanceProfile: 'teaching-content', loadingLabel: 'Content Factory đang tạo học liệu' });
        result = extractJson(raw);
      } else {
        result = buildFallback(project);
        setNotice('Đã tạo bản mẫu offline. Cài API key để tạo nội dung AI phong phú hơn.');
      }
      const next = { ...project, output: result, status: 'generated' };
      setProject(next); setStep(4); await saveProject(next);
    } catch (generateError) { setError(generateError.message || String(generateError)); }
    finally { setBusy(false); }
  }

  function updateItem(index, field, value) {
    const nextItems = output.items.map((item, itemIndex) => itemIndex === index ? { ...item, [field]: value } : item);
    setProject({ ...project, output: { ...output, items: nextItems } });
  }

  function sendToAssessment() {
    sessionStorage.setItem('bes-v1093-content-to-assessment', JSON.stringify({ title: project.title, level: project.level, source: 'content-factory', items: output?.items || [] }));
    window.location.hash = '#/assessment-core';
  }

  return <section className="v1093-page v1093-content-factory">
    <header className="v1093-hero v1093-hero-content"><div><span className="v1093-kicker">V10.92 · Teaching Content Factory</span><h1>Xưởng tạo học liệu</h1><p>Một nguồn nội dung có thể tạo worksheet, quiz, cloze test, flashcard và chuỗi hoạt động.</p></div><button className="v1093-primary" onClick={() => { setProject(emptyProject()); setStep(1); }}>+ Dự án mới</button></header>
    {error && <div className="v1093-alert error"><b>Chưa thể tạo học liệu</b><span>{error}</span></div>}{notice && <div className="v1093-alert success">{notice}</div>}
    <nav className="v1093-stepper">{['Nguồn','Mục tiêu','Tạo nội dung','Biên tập & xuất'].map((label,index) => <button key={label} className={step === index + 1 ? 'active' : step > index + 1 ? 'done' : ''} onClick={() => setStep(index + 1)}><span>{index + 1}</span>{label}</button>)}</nav>

    <div className="v1093-factory-layout">
      <aside className="v1093-project-sidebar"><div className="v1093-panel-heading"><div><span>Dự án đã lưu</span><h2>{projects.length}</h2></div></div><div className="v1093-project-list">{projects.map((item) => <article key={item.id} className={project.id === item.id ? 'active' : ''}><button onClick={() => openProject(item)}><b>{item.title}</b><span>{item.output_type} · {item.level}</span></button></article>)}</div></aside>
      <main className="v1093-factory-main">
        {step === 1 && <section className="v1093-panel v1093-factory-source"><div className="v1093-panel-heading"><div><span>Bước 1</span><h2>Nguồn nội dung</h2></div><button onClick={() => setStep(2)}>Tiếp tục →</button></div><label>Tên dự án<input value={project.title} onChange={(e) => setProject({ ...project, title: e.target.value })} /></label><label>Nội dung nguồn<textarea value={project.source_text} onChange={(e) => setProject({ ...project, source_text: e.target.value })} placeholder="Dán văn bản, danh sách từ, nội dung ngữ pháp hoặc bài đọc…" /></label></section>}
        {step === 2 && <section className="v1093-panel"><div className="v1093-panel-heading"><div><span>Bước 2</span><h2>Chọn sản phẩm</h2></div><button onClick={() => setStep(3)}>Tiếp tục →</button></div><div className="v1093-output-grid">{OUTPUTS.map(([value,label,description]) => <button key={value} className={project.output_type === value ? 'active' : ''} onClick={() => setProject({ ...project, output_type: value })}><b>{label}</b><span>{description}</span></button>)}</div><div className="v1093-form-grid"><label>Trình độ<select value={project.level} onChange={(e) => setProject({ ...project, level: e.target.value })}>{['A1','A2','B1','B2','C1','C2'].map((value) => <option key={value}>{value}</option>)}</select></label><label>Số câu<input type="number" min="3" max="100" value={project.item_count} onChange={(e) => setProject({ ...project, item_count: e.target.value })} /></label></div></section>}
        {step === 3 && <section className="v1093-panel v1093-generate-panel"><div className="v1093-panel-heading"><div><span>Bước 3</span><h2>Yêu cầu tạo nội dung</h2></div></div><textarea value={project.instruction} onChange={(e) => setProject({ ...project, instruction: e.target.value })} placeholder="Ví dụ: bám sát đề thi THPT, không trùng câu, đáp án đảo ngẫu nhiên, có giải thích ngắn…" /><div className="v1093-generation-summary"><span>{OUTPUTS.find(([value]) => value === project.output_type)?.[1]}</span><span>{project.level}</span><span>{project.item_count} mục</span><span>{provider.hasKey ? `AI: ${provider.providerName}` : 'Offline template'}</span></div><button className="v1093-primary large" onClick={generate} disabled={busy}>{busy ? 'Đang tạo…' : '✦ Tạo nội dung'}</button></section>}
        {step === 4 && <section className="v1093-panel v1093-editor-panel"><div className="v1093-panel-heading"><div><span>Bước 4</span><h2>{itemCount} mục đã tạo</h2></div><div><button onClick={() => saveProject(project)}>Lưu</button><button disabled={!output} onClick={() => downloadText(`${project.title}.json`, JSON.stringify(output, null, 2), 'application/json')}>Xuất JSON</button><button disabled={!output} onClick={() => downloadText(`${project.title}.html`, renderHtml(project, output), 'text/html;charset=utf-8')}>Xuất HTML</button><button disabled={!output} onClick={sendToAssessment}>Gửi sang Assessment</button></div></div>{output ? <><label>Hướng dẫn<textarea value={output.instructions || ''} onChange={(e) => setProject({ ...project, output: { ...output, instructions: e.target.value } })} /></label><div className="v1093-edit-items">{(output.items || []).map((item,index) => <article key={index}><b>Câu {index + 1}</b><textarea value={item.prompt || ''} onChange={(e) => updateItem(index, 'prompt', e.target.value)} /><input value={item.answer || ''} onChange={(e) => updateItem(index, 'answer', e.target.value)} placeholder="Đáp án" /><textarea value={item.explanation || ''} onChange={(e) => updateItem(index, 'explanation', e.target.value)} placeholder="Giải thích" /></article>)}</div></> : <div className="v1093-empty"><strong>Chưa có sản phẩm</strong><span>Quay lại bước 3 để tạo nội dung.</span></div>}</section>}
      </main>
    </div>
  </section>;
}
