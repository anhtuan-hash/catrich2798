import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { callAI } from '../utils/gemini.js';
import { getProviderSummary } from '../utils/aiProviders.js';
import { readDocxTextFromBuffer, readPdfTextFromBuffer } from '../utils/documentParsers.js';
import { getRuntimeClient } from '../services/runtime/core.js';
import { useRuntimeCore } from '../services/runtime/useRuntimeCore.js';
import { downloadText, readLocal, scopedLocalKey, uid, writeLocal } from './v1093/shared.js';

const MODES = {
  ask: { label: 'Hỏi', instruction: 'Answer the user accurately using the supplied sources. State when the sources do not contain enough information.' },
  create: { label: 'Tạo', instruction: 'Create polished classroom-ready English teaching content. Avoid duplication and include an answer key when relevant.' },
  transform: { label: 'Chuyển đổi', instruction: 'Transform the supplied source into the requested format while preserving essential meaning and accuracy.' },
  act: { label: 'Hành động', instruction: 'Prepare a safe action plan. Do not claim that any external action was executed. Return a preview with explicit confirmation steps.' },
};

function emptyProject() {
  return { id: '', title: 'Dự án AI mới', mode: 'create', instruction: '', source_text: '', output_text: '', status: 'draft', metadata: { attachments: [] } };
}

async function readFile(file) {
  const ext = file.name.split('.').pop()?.toLowerCase();
  const buffer = await file.arrayBuffer();
  if (ext === 'pdf') return readPdfTextFromBuffer(buffer, { maxPages: 60, maxChars: 150000 });
  if (ext === 'docx') return readDocxTextFromBuffer(buffer);
  if (['txt','md','csv','json','html','htm'].includes(ext)) return new TextDecoder('utf-8').decode(buffer);
  throw new Error(`Chưa hỗ trợ đọc trực tiếp file .${ext || 'unknown'}`);
}

export default function AIWorkspace({ currentUser }) {
  const runtime = useRuntimeCore();
  const client = getRuntimeClient();
  const provider = getProviderSummary();
  const localKey = scopedLocalKey('bes-ai-workspace-v1093', currentUser);
  const [projects, setProjects] = useState([]);
  const [project, setProject] = useState(emptyProject);
  const [busy, setBusy] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [showSources, setShowSources] = useState(true);
  const fileInput = useRef(null);

  const loadProjects = useCallback(async () => {
    if (!currentUser) return;
    if (client && runtime.session) {
      const { data, error: loadError } = await client.from('ai_workspace_projects').select('*').order('updated_at', { ascending: false }).limit(200);
      if (!loadError) { setProjects(data || []); return; }
      if (!/does not exist|schema cache/i.test(loadError.message || '')) setError(loadError.message);
    }
    setProjects(readLocal(localKey, []));
  }, [client, currentUser, localKey, runtime.session]);

  useEffect(() => { loadProjects(); }, [loadProjects]);

  const currentId = project.id;
  const wordCount = useMemo(() => project.source_text.trim() ? project.source_text.trim().split(/\s+/).length : 0, [project.source_text]);

  function newProject() {
    setProject(emptyProject()); setError(''); setNotice('');
  }

  function openProject(item) {
    setProject({
      ...emptyProject(), ...item,
      metadata: typeof item.metadata === 'object' && item.metadata ? item.metadata : { attachments: [] },
    });
    setError(''); setNotice('');
  }

  async function saveProject(nextProject = project) {
    if (!currentUser) return null;
    setSaving(true); setError('');
    const payload = {
      ...(nextProject.id ? { id: nextProject.id } : {}),
      owner_id: currentUser.id,
      title: nextProject.title.trim() || 'Dự án AI chưa đặt tên',
      mode: nextProject.mode,
      instruction: nextProject.instruction,
      source_text: nextProject.source_text,
      output_text: nextProject.output_text,
      status: nextProject.status || 'draft',
      metadata: nextProject.metadata || {},
      updated_at: new Date().toISOString(),
    };
    try {
      let saved;
      if (client && runtime.session) {
        const { data, error: saveError } = await client.from('ai_workspace_projects').upsert(payload).select('*').single();
        if (saveError) throw saveError;
        saved = data;
      } else {
        saved = { ...payload, id: payload.id || uid('ai-project'), created_at: nextProject.created_at || new Date().toISOString() };
        const next = [saved, ...projects.filter((item) => item.id !== saved.id)];
        writeLocal(localKey, next);
      }
      setProject((current) => ({ ...current, ...saved }));
      setProjects((current) => [saved, ...current.filter((item) => item.id !== saved.id)]);
      setNotice('Đã lưu dự án.');
      return saved;
    } catch (saveError) {
      setError(saveError.message || String(saveError));
      return null;
    } finally { setSaving(false); }
  }

  async function handleFiles(files) {
    const list = Array.from(files || []).slice(0, 8);
    if (!list.length) return;
    setBusy(true); setError('');
    const attachments = [...(project.metadata?.attachments || [])];
    const blocks = [];
    for (const file of list) {
      try {
        const text = await readFile(file);
        attachments.push({ name: file.name, size: file.size, type: file.type, characters: text.length });
        blocks.push(`\n\n===== ${file.name} =====\n${text}`);
      } catch (fileError) {
        attachments.push({ name: file.name, size: file.size, type: file.type, error: fileError.message });
      }
    }
    setProject((current) => ({ ...current, source_text: `${current.source_text}${blocks.join('')}`.trim(), metadata: { ...(current.metadata || {}), attachments } }));
    setBusy(false);
  }

  async function runWorkspace() {
    if (!project.instruction.trim()) { setError('Hãy nhập yêu cầu cho Brian AI.'); return; }
    if (!provider.hasKey) { setError('Chưa có API key cho nhà cung cấp AI đang chọn. Hãy mở Cài đặt AI.'); return; }
    setBusy(true); setError(''); setNotice('');
    try {
      const mode = MODES[project.mode] || MODES.create;
      const prompt = `MODE: ${mode.label}\nUSER REQUEST:\n${project.instruction}\n\nSOURCE MATERIAL:\n${project.source_text || '(No source supplied)'}\n\nOUTPUT REQUIREMENTS:\n- Use clear headings.\n- Keep factual claims grounded in the supplied source when a source is provided.\n- For exercises, include an answer key.\n- Do not claim to have executed external actions.`;
      const result = await callAI({
        prompt,
        systemInstruction: `You are Brian AI Workspace, an expert assistant for a Vietnamese high-school English teacher. ${mode.instruction}`,
        temperature: project.mode === 'ask' ? 0.35 : 0.65,
        governanceProfile: project.mode === 'act' ? 'administrative' : 'teaching-content',
        loadingLabel: `${mode.label} nội dung trong AI Workspace`,
      });
      const next = { ...project, output_text: result, status: 'generated' };
      setProject(next);
      await saveProject(next);
    } catch (runError) { setError(runError.message || String(runError)); }
    finally { setBusy(false); }
  }

  function sendToContentFactory() {
    const transfer = { title: project.title, sourceText: project.source_text, aiOutput: project.output_text, instruction: project.instruction, createdAt: new Date().toISOString() };
    sessionStorage.setItem('bes-v1093-ai-to-content-factory', JSON.stringify(transfer));
    window.location.hash = '#/content-factory';
  }

  async function removeProject(item) {
    if (!window.confirm(`Xóa dự án “${item.title}”?`)) return;
    if (client && runtime.session) await client.from('ai_workspace_projects').delete().eq('id', item.id);
    const next = projects.filter((entry) => entry.id !== item.id);
    setProjects(next); writeLocal(localKey, next);
    if (project.id === item.id) newProject();
  }

  return <section className="v1093-page v1093-ai-workspace">
    <header className="v1093-hero v1093-hero-ai"><div><span className="v1093-kicker">V10.91 · Brian AI Workspace</span><h1>Không gian làm việc AI</h1><p>Đọc nhiều nguồn, tạo nội dung dài, lưu dự án và chuyển kết quả sang các ứng dụng khác.</p></div><div className="v1093-provider-card"><span>{provider.providerName}</span><b>{provider.model}</b><small>{provider.hasKey ? 'API key sẵn sàng' : 'Chưa có API key'}</small></div></header>
    {error && <div className="v1093-alert error"><b>AI Workspace cần xử lý</b><span>{error}</span>{!provider.hasKey && <button onClick={() => window.location.hash = '#/settings'}>Mở cài đặt AI</button>}</div>}
    {notice && <div className="v1093-alert success">{notice}</div>}

    <div className="v1093-ai-layout">
      <aside className="v1093-project-sidebar"><div className="v1093-panel-heading"><div><span>Dự án</span><h2>{projects.length}</h2></div><button onClick={newProject}>+ Mới</button></div><div className="v1093-project-list">{projects.map((item) => <article key={item.id} className={currentId === item.id ? 'active' : ''}><button onClick={() => openProject(item)}><b>{item.title}</b><span>{MODES[item.mode]?.label || item.mode} · {item.status}</span></button><button className="danger" onClick={() => removeProject(item)}>×</button></article>)}{!projects.length && <div className="v1093-empty compact"><span>Chưa có dự án đã lưu.</span></div>}</div></aside>

      <main className="v1093-ai-editor">
        <div className="v1093-ai-topbar"><input className="v1093-title-input" value={project.title} onChange={(e) => setProject({ ...project, title: e.target.value })} /><div>{Object.entries(MODES).map(([key, value]) => <button key={key} className={project.mode === key ? 'active' : ''} onClick={() => setProject({ ...project, mode: key })}>{value.label}</button>)}</div><button onClick={() => saveProject()} disabled={saving}>{saving ? 'Đang lưu…' : 'Lưu'}</button></div>
        <section className="v1093-panel v1093-ai-prompt"><label>Yêu cầu<textarea value={project.instruction} onChange={(e) => setProject({ ...project, instruction: e.target.value })} placeholder="Ví dụ: Tạo worksheet B2–C1 gồm 20 câu từ tài liệu đính kèm, không trùng nội dung, có đáp án và giải thích." /></label><div className="v1093-ai-actions"><button onClick={() => fileInput.current?.click()} disabled={busy}>📎 Thêm tài liệu</button><input ref={fileInput} type="file" multiple hidden accept=".pdf,.docx,.txt,.md,.csv,.json,.html" onChange={(e) => handleFiles(e.target.files)} /><button onClick={() => setShowSources((value) => !value)}>{showSources ? 'Ẩn nguồn' : 'Hiện nguồn'}</button><button className="v1093-primary" onClick={runWorkspace} disabled={busy}>{busy ? 'Brian AI đang xử lý…' : '✦ Chạy Brian AI'}</button></div></section>

        {showSources && <section className="v1093-panel v1093-source-panel"><div className="v1093-panel-heading"><div><span>Nguồn</span><h2>{wordCount.toLocaleString('vi-VN')} từ</h2></div><small>{(project.metadata?.attachments || []).length} tệp</small></div><textarea value={project.source_text} onChange={(e) => setProject({ ...project, source_text: e.target.value })} placeholder="Dán văn bản hoặc kéo dữ liệu từ tài liệu vào đây…" /><div className="v1093-attachment-chips">{(project.metadata?.attachments || []).map((file, index) => <span key={`${file.name}-${index}`} title={file.error || `${file.characters || 0} ký tự`}>{file.error ? '⚠ ' : '✓ '}{file.name}</span>)}</div></section>}

        <section className="v1093-panel v1093-output-panel"><div className="v1093-panel-heading"><div><span>Kết quả</span><h2>Bản thảo AI</h2></div><div><button disabled={!project.output_text} onClick={() => navigator.clipboard.writeText(project.output_text)}>Sao chép</button><button disabled={!project.output_text} onClick={() => downloadText(`${project.title || 'brian-ai'}.md`, project.output_text, 'text/markdown;charset=utf-8')}>Xuất Markdown</button><button disabled={!project.output_text} onClick={sendToContentFactory}>Gửi sang Content Factory</button></div></div><textarea value={project.output_text} onChange={(e) => setProject({ ...project, output_text: e.target.value })} placeholder="Kết quả sẽ xuất hiện tại đây và vẫn có thể chỉnh sửa." /></section>
      </main>
    </div>
  </section>;
}
