import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { callAI } from '../utils/gemini.js';
import { getProviderSummary } from '../utils/aiProviders.js';
import AISmartModelSelector from '../components/AISmartModelSelector.jsx';
import { getSmartProviderSummary } from '../utils/aiProviderOverrides.js';
import { buildWorkspaceLocalFallback, friendlyAiWorkspaceError, isProviderCapacityError } from '../utils/aiWorkspaceFallback.js';
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

const RESPONSE_BUDGETS = {
  economy: { label: 'Tiết kiệm', tokens: 420, hint: 'Phù hợp khi provider còn ít credit.' },
  balanced: { label: 'Cân bằng', tokens: 900, hint: 'Đủ chi tiết cho phần lớn nhiệm vụ.' },
  detailed: { label: 'Chi tiết', tokens: 1600, hint: 'Dùng khi tài khoản còn đủ quota.' },
};

function emptyProject() {
  return {
    id: '', title: 'Dự án AI mới', mode: 'create', instruction: '', source_text: '', output_text: '', status: 'draft',
    metadata: { attachments: [], responseBudget: 'balanced', autoFallback: true, engine: 'pending' },
  };
}

function normalizeMetadata(metadata) {
  const source = metadata && typeof metadata === 'object' ? metadata : {};
  return {
    attachments: Array.isArray(source.attachments) ? source.attachments : [],
    responseBudget: RESPONSE_BUDGETS[source.responseBudget] ? source.responseBudget : 'balanced',
    autoFallback: source.autoFallback !== false,
    engine: source.engine || 'pending',
    fallbackReason: source.fallbackReason || '',
    adaptiveTokens: Number(source.adaptiveTokens || 0),
    provider: source.provider || '',
    providerId: source.providerId || '',
    routingMode: source.routingMode || 'smart',
  };
}

async function readFile(file) {
  const ext = file.name.split('.').pop()?.toLowerCase();
  const buffer = await file.arrayBuffer();
  if (ext === 'pdf') return readPdfTextFromBuffer(buffer, { maxPages: 60, maxChars: 150000 });
  if (ext === 'docx') return readDocxTextFromBuffer(buffer);
  if (['txt', 'md', 'csv', 'json', 'html', 'htm'].includes(ext)) return new TextDecoder('utf-8').decode(buffer);
  throw new Error(`Chưa hỗ trợ đọc trực tiếp file .${ext || 'unknown'}`);
}

export default function AIWorkspace({ currentUser }) {
  const runtime = useRuntimeCore();
  const client = getRuntimeClient();
  const localKey = scopedLocalKey('bes-ai-workspace-v1093', currentUser);
  const [provider, setProvider] = useState(() => getSmartProviderSummary(getProviderSummary()));
  const [lastRoute, setLastRoute] = useState(() => (typeof window !== 'undefined' ? window.__besLastAiRoute || null : null));
  const [projects, setProjects] = useState([]);
  const [project, setProject] = useState(emptyProject);
  const [busy, setBusy] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [recovery, setRecovery] = useState(null);
  const [showSources, setShowSources] = useState(true);
  const fileInput = useRef(null);

  useEffect(() => {
    const refresh = () => setProvider(getSmartProviderSummary(getProviderSummary()));
    const route = (event) => {
      const nextRoute = event.detail || window.__besLastAiRoute || null;
      setLastRoute(nextRoute);
      refresh();
    };
    window.addEventListener('bes-ai-settings-updated', refresh);
    window.addEventListener('bes-ai-routing-updated', refresh);
    window.addEventListener('bes-ai-routing-success', route);
    return () => {
      window.removeEventListener('bes-ai-settings-updated', refresh);
      window.removeEventListener('bes-ai-routing-updated', refresh);
      window.removeEventListener('bes-ai-routing-success', route);
    };
  }, []);

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
  const metadata = normalizeMetadata(project.metadata);
  const responseBudget = RESPONSE_BUDGETS[metadata.responseBudget] || RESPONSE_BUDGETS.balanced;
  const wordCount = useMemo(() => project.source_text.trim() ? project.source_text.trim().split(/\s+/).length : 0, [project.source_text]);

  function patchMetadata(patch) {
    setProject((current) => ({ ...current, metadata: { ...normalizeMetadata(current.metadata), ...patch } }));
  }

  function newProject() {
    setProject(emptyProject()); setError(''); setNotice(''); setRecovery(null);
  }

  function openProject(item) {
    setProject({ ...emptyProject(), ...item, metadata: normalizeMetadata(item.metadata) });
    setError(''); setNotice(''); setRecovery(null);
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
      metadata: normalizeMetadata(nextProject.metadata),
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
      setProject((current) => ({ ...current, ...saved, metadata: normalizeMetadata(saved.metadata) }));
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
    const attachments = [...metadata.attachments];
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
    setProject((current) => ({
      ...current,
      source_text: `${current.source_text}${blocks.join('')}`.trim(),
      metadata: { ...normalizeMetadata(current.metadata), attachments },
    }));
    setBusy(false);
  }

  async function useLocalFallback(reason = 'provider-unavailable', append = false) {
    const fallbackText = buildWorkspaceLocalFallback({ mode: project.mode, instruction: project.instruction, sourceText: project.source_text });
    const output = append && project.output_text.trim() ? `${project.output_text.trim()}\n\n---\n\n${fallbackText}` : fallbackText;
    const next = {
      ...project,
      output_text: output,
      status: 'generated-local',
      metadata: { ...metadata, engine: 'internal', fallbackReason: reason, provider: 'Brian Internal Engine' },
    };
    setProject(next);
    setError('');
    setRecovery({ type: 'internal', message: 'Đã chuyển sang bộ máy nội bộ để công việc không bị gián đoạn.' });
    await saveProject(next);
    setNotice('Bản nháp nội bộ đã được tạo và có thể chỉnh sửa, lưu hoặc gửi sang ứng dụng khác.');
    return output;
  }

  async function runWorkspace({ continueOutput = false, alternateModel = false } = {}) {
    if (!project.instruction.trim()) { setError('Hãy nhập yêu cầu cho Brian AI.'); return; }
    setBusy(true); setError(''); setNotice(''); setRecovery(null);


    try {
      const mode = MODES[project.mode] || MODES.create;
      const continuation = continueOutput && project.output_text.trim()
        ? `\n\nCURRENT DRAFT TO CONTINUE FROM:\n${project.output_text.slice(-12000)}\n\nContinue with the next useful section. Do not repeat completed content.`
        : '';
      const prompt = `MODE: ${mode.label}\nUSER REQUEST:\n${project.instruction}\n\nSOURCE MATERIAL:\n${project.source_text || '(No source supplied)'}${continuation}\n\nOUTPUT REQUIREMENTS:\n- Use clear headings.\n- Keep factual claims grounded in the supplied source when a source is provided.\n- For exercises, include an answer key.\n- If the request is large, complete one coherent section instead of truncating mid-sentence.\n- Do not claim to have executed external actions.`;
      let adaptiveInfo = null;
      const result = await callAI({
        prompt,
        systemInstruction: `You are Brian AI Workspace, an expert assistant for a Vietnamese high-school English teacher. ${mode.instruction}`,
        temperature: project.mode === 'ask' ? 0.35 : 0.65,
        governanceProfile: project.mode === 'act' ? 'administrative' : 'teaching-content',
        loadingLabel: `${mode.label} nội dung trong AI Workspace`,
        maxOutputTokens: responseBudget.tokens,
        excludeProviders: alternateModel && lastRoute?.provider ? [lastRoute.provider] : [],
        onAdaptiveRetry: (info) => {
          adaptiveInfo = info;
          setRecovery({ type: 'adaptive', message: `OpenRouter còn ít credit; Brian đã tự giảm phản hồi xuống khoảng ${info.maxOutputTokens} tokens và thử lại.` });
        },
      });
      const actualRoute = (typeof window !== 'undefined' ? window.__besLastAiRoute : null) || lastRoute;
      if (actualRoute) setLastRoute(actualRoute);
      const combined = continueOutput && project.output_text.trim() ? `${project.output_text.trim()}\n\n${result.trim()}` : result;
      const next = {
        ...project,
        output_text: combined,
        status: adaptiveInfo ? 'generated-economy' : 'generated',
        metadata: {
          ...metadata,
          engine: 'provider',
          provider: actualRoute ? `${actualRoute.providerName || actualRoute.provider} · ${actualRoute.model}` : `${provider.providerName} · ${provider.model}`,
          providerId: actualRoute?.provider || '',
          routingMode: actualRoute?.routingMode || provider.routingMode || 'smart',
          fallbackReason: adaptiveInfo ? 'adaptive-credit-retry' : actualRoute?.fallbackUsed ? 'provider-fallback' : '',
          adaptiveTokens: adaptiveInfo?.maxOutputTokens || 0,
        },
      };
      setProject(next);
      await saveProject(next);
      setNotice(adaptiveInfo
        ? 'Đã tạo phản hồi ở chế độ tiết kiệm. Với tài liệu dài, bấm “Tạo tiếp phần” để nối thêm nội dung.'
        : actualRoute?.fallbackUsed
          ? `Brian AI đã tự chuyển sang ${actualRoute.providerName || actualRoute.provider} và hoàn tất bản nháp.`
          : 'Brian AI đã hoàn tất bản nháp.');
    } catch (runError) {
      const recoverable = isProviderCapacityError(runError)
        || ['AI_PROVIDER_NOT_CONFIGURED', 'AI_ALL_PROVIDERS_FAILED', 'AI_AUTH_MISSING'].includes(runError?.code)
        || /network|failed to fetch|load failed|rate limit|429|authentication|api key|chưa có ai provider|tất cả provider/i.test(runError?.message || '');
      if (metadata.autoFallback && recoverable) {
        await useLocalFallback(runError?.code || 'provider-error', continueOutput);
      } else {
        setError(friendlyAiWorkspaceError(runError));
      }
    } finally { setBusy(false); }
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
    <header className="v1093-hero v1093-hero-ai"><div><span className="v1093-kicker">V11.5.7 · Brian AI Workspace</span><h1>Không gian làm việc AI</h1><p>Đọc nhiều nguồn, chọn linh động provider/model và tự chuyển sang mô hình phù hợp khi provider hết quota hoặc tạm thời không khả dụng.</p></div><div className="v1093-provider-card"><span>{lastRoute?.providerName || provider.providerName}</span><b>{lastRoute?.model || provider.model}</b><small>{provider.hasKey ? `AI ${provider.routingMode === 'manual' ? 'thủ công' : 'tự động'} sẵn sàng` : 'Hãy cấu hình ít nhất một provider'}</small></div></header>

    {error && <div className="v1093-alert error"><b>AI Workspace cần xử lý</b><span>{error}</span><button onClick={() => useLocalFallback('manual-error-recovery')}>Dùng bộ máy nội bộ</button><button onClick={() => { window.location.hash = '#/settings'; }}>Cài đặt AI</button></div>}
    {recovery && <div className="v1093-alert warning"><b>{recovery.type === 'adaptive' ? 'Đã tự tối ưu chi phí' : 'Chế độ dự phòng đang hoạt động'}</b><span>{recovery.message}</span>{recovery.type === 'internal' && <button onClick={() => { window.location.hash = '#/settings'; }}>Thêm provider khác</button>}</div>}
    {notice && <div className="v1093-alert success">{notice}</div>}

    <div className="v1093-ai-layout">
      <aside className="v1093-project-sidebar"><div className="v1093-panel-heading"><div><span>Dự án</span><h2>{projects.length}</h2></div><button onClick={newProject}>+ Mới</button></div><div className="v1093-project-list">{projects.map((item) => <article key={item.id} className={currentId === item.id ? 'active' : ''}><button onClick={() => openProject(item)}><b>{item.title}</b><span>{MODES[item.mode]?.label || item.mode} · {item.status}</span></button><button className="danger" onClick={() => removeProject(item)}>×</button></article>)}{!projects.length && <div className="v1093-empty compact"><span>Chưa có dự án đã lưu.</span></div>}</div></aside>

      <main className="v1093-ai-editor">
        <div className="v1093-ai-topbar"><input className="v1093-title-input" value={project.title} onChange={(e) => setProject({ ...project, title: e.target.value })} /><div>{Object.entries(MODES).map(([key, value]) => <button key={key} className={project.mode === key ? 'active' : ''} onClick={() => setProject({ ...project, mode: key })}>{value.label}</button>)}</div><button onClick={() => saveProject()} disabled={saving}>{saving ? 'Đang lưu…' : 'Lưu'}</button></div>

        <section className="v1093-panel v1093-ai-prompt">
          <label>Yêu cầu<textarea value={project.instruction} onChange={(e) => setProject({ ...project, instruction: e.target.value })} placeholder="Ví dụ: Tạo đề thi THPT môn tiếng Anh. Nếu nội dung dài, Brian sẽ tự tạo theo từng phần hoặc dùng bản dự phòng nội bộ." /></label>
          <div className="v1156-resilience-bar">
            <AISmartModelSelector context="ai-workspace" />
            <label><span>Độ dài phản hồi</span><select value={metadata.responseBudget} onChange={(e) => patchMetadata({ responseBudget: e.target.value })}>{Object.entries(RESPONSE_BUDGETS).map(([id, item]) => <option key={id} value={id}>{item.label} · {item.tokens} tokens</option>)}</select><small>{responseBudget.hint}</small></label>
            <label className="v1156-switch"><input type="checkbox" checked={metadata.autoFallback} onChange={(e) => patchMetadata({ autoFallback: e.target.checked })} /><span>Tự chuyển sang bộ máy nội bộ khi AI hết credit</span></label>
            <div className={`v1156-engine-status ${metadata.engine}`}><b>{metadata.engine === 'internal' ? 'Bộ máy nội bộ' : metadata.engine === 'provider' ? 'AI thật' : 'Tự động'}</b><span>{metadata.provider || `${provider.providerName} · ${provider.model}`}</span></div>
          </div>
          <div className="v1093-ai-actions"><button onClick={() => fileInput.current?.click()} disabled={busy}>📎 Thêm tài liệu</button><input ref={fileInput} type="file" multiple hidden accept=".pdf,.docx,.txt,.md,.csv,.json,.html" onChange={(e) => handleFiles(e.target.files)} /><button onClick={() => setShowSources((value) => !value)}>{showSources ? 'Ẩn nguồn' : 'Hiện nguồn'}</button><button onClick={() => useLocalFallback('manual') } disabled={busy}>Bộ máy nội bộ</button><button className="v1093-primary" onClick={() => runWorkspace()} disabled={busy}>{busy ? 'Brian đang xử lý…' : '✦ Chạy Brian AI'}</button></div>
        </section>

        {showSources && <section className="v1093-panel v1093-source-panel"><div className="v1093-panel-heading"><div><span>Nguồn</span><h2>{wordCount.toLocaleString('vi-VN')} từ</h2></div><small>{metadata.attachments.length} tệp</small></div><textarea value={project.source_text} onChange={(e) => setProject({ ...project, source_text: e.target.value })} placeholder="Dán văn bản hoặc kéo dữ liệu từ tài liệu vào đây…" /><div className="v1093-attachment-chips">{metadata.attachments.map((file, index) => <span key={`${file.name}-${index}`} title={file.error || `${file.characters || 0} ký tự`}>{file.error ? '⚠ ' : '✓ '}{file.name}</span>)}</div></section>}

        <section className="v1093-panel v1093-output-panel"><div className="v1093-panel-heading"><div><span>Kết quả</span><h2>Bản thảo AI</h2></div><div><button disabled={!project.output_text || busy} onClick={() => runWorkspace({ continueOutput: true })}>Tạo tiếp phần</button><button disabled={busy} onClick={() => runWorkspace({ alternateModel: true })}>Dùng mô hình khác</button><button disabled={!project.output_text} onClick={() => navigator.clipboard.writeText(project.output_text)}>Sao chép</button><button disabled={!project.output_text} onClick={() => downloadText(`${project.title || 'brian-ai'}.md`, project.output_text, 'text/markdown;charset=utf-8')}>Xuất Markdown</button><button disabled={!project.output_text} onClick={sendToContentFactory}>Gửi sang Content Factory</button></div></div><textarea value={project.output_text} onChange={(e) => setProject({ ...project, output_text: e.target.value })} placeholder="Kết quả sẽ xuất hiện tại đây và vẫn có thể chỉnh sửa." /></section>
      </main>
    </div>
  </section>;
}
