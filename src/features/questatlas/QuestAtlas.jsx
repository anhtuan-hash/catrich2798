import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { isSupabaseConfigured, supabase } from '../../utils/supabase.js';
import { WORLDS, answerMatches, cleanText, demoRecords, graphLayout, parseOptions, validatePuzzle, validateQuest } from './questModel.mjs';
import { assessmentToPuzzleDraft } from './questionAdapter.mjs';
import { mountQuestWorld } from './webglRoom.mjs';
import { hasRouteAccess } from '../../utils/permissions.js';
import './questatlas.css';

const TABLES = [
  ['nodes', 'qatl_nodes'],
  ['edges', 'qatl_edges'],
  ['quests', 'qatl_quests'],
  ['puzzles', 'qatl_puzzles'],
];
const EMPTY = { nodes: [], edges: [], quests: [], puzzles: [] };
const WORLD_NAMES = Object.fromEntries(WORLDS.map((item) => [item.id, item.title]));

function Info({ children, variant = '' }) { return <p className={'qa-info ' + variant}>{children}</p>; }
function Panel({ title, subtitle, children, extra = null }) {
  return <section className="qa-panel"><header className="qa-panel-head"><div><h2>{title}</h2>{subtitle && <p>{subtitle}</p>}</div>{extra}</header>{children}</section>;
}

function MapCanvas({ nodes, edges, selectedId, onSelect }) {
  const positioned = graphLayout(nodes);
  const byId = new Map(positioned.map((node) => [node.id, node]));
  return <div className="qa-map" role="group" aria-label="Bản đồ kiến thức">
    {nodes.length ? <svg viewBox="0 0 700 440" className="qa-graph" role="img" aria-label="Các node và đường nối kiến thức">
      <defs><linearGradient id="qa-edge-grad"><stop stopColor="#64a8ff" /><stop offset="1" stopColor="#be83ff" /></linearGradient></defs>
      {edges.map((edge) => {
        const a = byId.get(edge.from_node_id), b = byId.get(edge.to_node_id);
        return a && b ? <line key={edge.id} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="url(#qa-edge-grad)" strokeWidth="3" strokeDasharray={edge.relation === 'prerequisite' ? undefined : '8 6'} opacity=".8" /> : null;
      })}
      {positioned.map((node, i) => <g key={node.id} className="qa-graph-node" role="button" tabIndex="0" aria-label={'Chọn ' + node.title} onClick={() => onSelect(node.id)} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelect(node.id); } }}>
        <circle cx={node.x} cy={node.y} r="49" fill={selectedId === node.id ? '#3b5ce6' : i % 2 ? '#eef0ff' : '#e8f7ff'} stroke={selectedId === node.id ? '#8dbeff' : '#9db9e0'} strokeWidth="3" />
        <text x={node.x} y={node.y - 8} textAnchor="middle" fontSize="21">{i % 2 ? '✦' : '◇'}</text>
        <text x={node.x} y={node.y + 15} textAnchor="middle" fontSize="11" fontWeight="700" fill={selectedId === node.id ? 'white' : '#24335c'}>{cleanText(node.title, 16)}</text>
      </g>)}
    </svg> : <div className="qa-empty">Chưa có node. Thêm một kiến thức để bắt đầu bản đồ.</div>}
  </div>;
}

function PreviewWorld({ quest, puzzles, onClose }) {
  const canvasRef = useRef(null);
  const [webglActive, setWebglActive] = useState(false);
  useEffect(() => {
    const dispose = mountQuestWorld(canvasRef.current, quest.world, () => setWebglActive(false));
    if (dispose) setWebglActive(true);
    return () => { dispose?.(); };
  }, [quest.world]);
  const [index, setIndex] = useState(0);
  const [answer, setAnswer] = useState('');
  const [feedback, setFeedback] = useState('');
  const [score, setScore] = useState(0);
  const ordered = useMemo(() => [...puzzles].sort((a, b) => a.position - b.position), [puzzles]);
  const current = ordered[index];
  const complete = index >= ordered.length;
  const world = quest.world;
  const submit = () => {
    if (!current) return;
    if (!answerMatches(current, answer)) {
      setFeedback('Chưa đúng. Hãy thử lại.' + (current.clue ? ' Gợi ý: ' + current.clue : ''));
      return;
    }
    setScore((value) => value + Number(current.points || 10));
    setAnswer('');
    setFeedback('');
    setIndex((value) => value + 1);
  };
  return <div className={'qa-preview qa-world-' + world}>
    <header className="qa-preview-header"><div><span>TEACHER PREVIEW · Không phải phiên học sinh</span><h2>{quest.title}</h2></div><button type="button" onClick={onClose}>Đóng bản xem thử ×</button></header>
    <div className={"qa-scene" + (webglActive ? " qa-render-webgl" : "")} aria-label={'Thế giới ' + WORLD_NAMES[world]}>
      <canvas ref={canvasRef} className="qa-webgl-canvas" aria-label="Phòng 3D có thể kéo để xoay góc nhìn" />
      <div className="qa-scene-ceiling" />
      <div className="qa-scene-wall qa-scene-wall-left" />
      <div className="qa-scene-wall qa-scene-wall-right" />
      <div className="qa-scene-floor" />
      <div className="qa-scene-door"><span>{complete ? '✓' : '◇'}</span><small>{complete ? 'OPEN' : 'LOCKED'}</small></div>
      <div className="qa-scene-orb orb-a" /><div className="qa-scene-orb orb-b" />
      {webglActive && <span className="qa-webgl-hint">Kéo để xoay góc nhìn 3D · 360° orbit</span>}
    </div>
    <div className="qa-puzzle-overlay">
      {complete ? <div className="qa-puzzle-card qa-victory"><span className="qa-puzzle-kicker">QUEST COMPLETE</span><h3>Kho báu đã mở!</h3><p>Điểm thử nghiệm: {score}. Chưa lưu kết quả vào hệ thống.</p><button onClick={() => { setIndex(0); setScore(0); }}>Chơi lại</button></div>
        : <div className="qa-puzzle-card">
          <div className="qa-puzzle-progress"><span>Trạm {index + 1}/{ordered.length}</span><span>{score} điểm</span></div>
          <h3>{current.stem}</h3>
          {current.kind === 'choice' ? <div className="qa-answer-options">{parseOptions(current.options).map((option) => <button type="button" aria-pressed={answer === option} className={answer === option ? 'chosen' : ''} key={option} onClick={() => { setAnswer(option); setFeedback(''); }}>{option}</button>)}</div> : <label className="qa-field">Nhập mật mã<input value={answer} onChange={(e) => setAnswer(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') submit(); }} maxLength="180" /></label>}
          {feedback && <Info variant="qa-warning">{feedback}</Info>}
          <button className="qa-primary" type="button" disabled={!answer.trim()} onClick={submit}>Xác nhận đáp án →</button>
        </div>}
    </div>
  </div>;
}

export default function QuestAtlas({ currentUser }) {
  const [mode, setMode] = useState('loading');
  const [records, setRecords] = useState(EMPTY);
  const [tab, setTab] = useState('atlas');
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [selectedNode, setSelectedNode] = useState('');
  const [selectedQuest, setSelectedQuest] = useState('');
  const [showPreview, setShowPreview] = useState(false);
  const [nodeTitle, setNodeTitle] = useState('');
  const [nodeSummary, setNodeSummary] = useState('');
  const [nodeUnit, setNodeUnit] = useState('');
  const [nodeGrade, setNodeGrade] = useState(11);
  const [linkTarget, setLinkTarget] = useState('');
  const [questTitle, setQuestTitle] = useState('');
  const [questWorld, setQuestWorld] = useState('temple');
  const [questDescription, setQuestDescription] = useState('');
  const [puzzleKind, setPuzzleKind] = useState('choice');
  const [puzzleStem, setPuzzleStem] = useState('');
  const [puzzleOptions, setPuzzleOptions] = useState('');
  const [puzzleAnswer, setPuzzleAnswer] = useState('');
  const [puzzleHint, setPuzzleHint] = useState('');
  const [sourceNodeId, setSourceNodeId] = useState('');
  const [bankItems, setBankItems] = useState([]);
  const [bankQuery, setBankQuery] = useState('');
  const [bankLoaded, setBankLoaded] = useState(false);
  const [bankBusy, setBankBusy] = useState(false);

  const load = useCallback(async () => {
    if (!isSupabaseConfigured || !supabase || !currentUser?.id) { setMode('unavailable'); return; }
    setMode('loading');
    try {
      const responses = await Promise.all(TABLES.map(([, table]) => supabase.from(table).select('*').order('created_at', { ascending: true }).limit(500)));
      const failed = responses.find((response) => response.error);
      if (failed) throw failed.error;
      setRecords(Object.fromEntries(TABLES.map(([key], index) => [key, responses[index].data || []])));
      setMode('cloud');
      setError('');
    } catch (e) {
      setMode('unavailable');
      setError(e.message || 'Không đọc được cơ sở dữ liệu QuestAtlas.');
    }
  }, [currentUser?.id]);

  useEffect(() => { void load(); }, [load]);

  const selectedNodeData = records.nodes.find((node) => node.id === selectedNode);
  const quest = records.quests.find((item) => item.id === selectedQuest);
  const questPuzzles = records.puzzles.filter((puzzle) => puzzle.quest_id === selectedQuest).sort((a, b) => a.position - b.position);
  const isDemo = mode === 'demo';
  const canUseBank = hasRouteAccess(currentUser, 'assessment-core');
  const bankMatches = bankItems.filter((item) => cleanText(item.stem).toLowerCase().includes(bankQuery.toLowerCase())).slice(0, 12);
  const loadBank = async () => {
    if (!canUseBank || !supabase || mode !== 'cloud') return;
    setBankBusy(true); setError('');
    try {
      const { data, error: bankError } = await supabase.from('assessment_items')
        .select('id,stem,options,correct_answer,explanation,question_type')
        .order('updated_at', { ascending: false }).limit(100);
      if (bankError) throw bankError;
      setBankItems((data || []).filter((item) => assessmentToPuzzleDraft(item)));
      setBankLoaded(true);
    } catch (e) { setError(e.message || 'Không đọc được Question Bank.'); }
    finally { setBankBusy(false); }
  };
  const chooseBankItem = (item) => {
    const draft = assessmentToPuzzleDraft(item);
    if (!draft) { setError('Chỉ hỗ trợ câu hỏi có bốn lựa chọn.'); return; }
    setPuzzleKind('choice');
    setPuzzleStem(draft.stem);
    setPuzzleOptions(draft.options.join('\n'));
    setPuzzleAnswer(draft.correct_answer);
    setPuzzleHint(draft.clue);
    setNotice('Đã đưa câu hỏi vào trình soạn. Hãy kiểm tra lại đáp án trước khi lưu.');
  };

  const create = async (table, key, payload) => {
    setBusy(true); setError('');
    try {
      let row;
      if (isDemo) row = { ...payload, id: 'demo-new-' + Date.now() + '-' + Math.random().toString(36).slice(2), owner_id: 'demo', created_at: new Date().toISOString() };
      else {
        const { data, error: insertError } = await supabase.from(table).insert({ ...payload, owner_id: currentUser.id }).select('*').single();
        if (insertError) throw insertError;
        row = data;
      }
      setRecords((old) => ({ ...old, [key]: [...old[key], row] }));
      setNotice(isDemo ? 'Đã cập nhật bản demo (không lưu lên server).' : 'Đã lưu lên Supabase.');
      return row;
    } catch (e) { setError(e.message || 'Không thể lưu.'); return null; }
    finally { setBusy(false); }
  };

  const remove = async (table, key, id) => {
    setBusy(true); setError('');
    try {
      if (!isDemo) {
        const { error: deletionError } = await supabase.from(table).delete().eq('id', id).eq('owner_id', currentUser.id);
        if (deletionError) throw deletionError;
      }
      setRecords((old) => ({ ...old, [key]: old[key].filter((item) => item.id !== id) }));
      setNotice(isDemo ? 'Đã xóa trong bản demo.' : 'Đã xóa.');
    } catch (e) { setError(e.message || 'Không thể xóa.'); } finally { setBusy(false); }
  };

  const addNode = async (e) => {
    e.preventDefault();
    if (cleanText(nodeTitle).length < 3) { setError('Tên kiến thức quá ngắn.'); return; }
    const row = await create('qatl_nodes', 'nodes', { title: cleanText(nodeTitle, 150), summary: cleanText(nodeSummary, 1000), unit_name: cleanText(nodeUnit, 80), grade: Number(nodeGrade), status: 'draft' });
    if (row) { setNodeTitle(''); setNodeSummary(''); setSelectedNode(row.id); }
  };
  const addEdge = async () => {
    if (!selectedNode || !linkTarget || selectedNode === linkTarget) { setError('Chọn hai node khác nhau.'); return; }
    await create('qatl_edges', 'edges', { from_node_id: selectedNode, to_node_id: linkTarget, relation: 'related' });
  };
  const addQuest = async (e) => {
    e.preventDefault();
    if (cleanText(questTitle).length < 5) { setError('Tên Quest phải có ít nhất 5 ký tự.'); return; }
    const row = await create('qatl_quests', 'quests', { title: cleanText(questTitle, 150), description: cleanText(questDescription, 1000), world: questWorld, status: 'draft' });
    if (row) { setSelectedQuest(row.id); setQuestTitle(''); setQuestDescription(''); }
  };
  const addPuzzle = async (e) => {
    e.preventDefault();
    if (!quest || quest.status === 'published') { setError('Chọn một Quest bản nháp để chỉnh sửa.'); return; }
    const options = puzzleKind === 'choice' ? parseOptions(puzzleOptions) : [];
    const draft = { quest_id: quest.id, source_node_id: sourceNodeId || null, position: questPuzzles.length + 1, kind: puzzleKind, stem: cleanText(puzzleStem, 500), options, correct_answer: cleanText(puzzleAnswer, 180), clue: cleanText(puzzleHint, 400), points: 10 };
    const issue = validatePuzzle(draft);
    if (issue) { setError(issue); return; }
    const row = await create('qatl_puzzles', 'puzzles', draft);
    if (row) { setPuzzleStem(''); setPuzzleOptions(''); setPuzzleAnswer(''); setPuzzleHint(''); }
  };
  const publishQuest = async () => {
    if (!quest || isDemo) { setError('Bản demo không xuất bản lên hệ thống.'); return; }
    const issue = validateQuest(quest, questPuzzles);
    if (issue) { setError(issue); return; }
    setBusy(true); setError('');
    try {
      const { error: updateError } = await supabase.from('qatl_quests').update({ status: 'published', updated_at: new Date().toISOString() }).eq('id', quest.id).eq('owner_id', currentUser.id);
      if (updateError) throw updateError;
      setRecords((old) => ({ ...old, quests: old.quests.map((q) => q.id === quest.id ? { ...q, status: 'published' } : q) }));
      setNotice('Đã xuất bản nội dung cho giáo viên. Chưa mở truy cập học sinh.');
    } catch (e) { setError(e.message || 'Xuất bản thất bại.'); } finally { setBusy(false); }
  };

  return <div className="qa-app">
    <header className="qa-hero"><div><span className="qa-eyebrow">BRIAN • TEACHING CREATOR SUITE</span><h1><span>Quest</span>Atlas <small>FOUNDATION</small></h1><p>Build knowledge. Create quests. Teach creatively — without AI.</p></div><div className="qa-hero-art" aria-hidden="true"><span>◇</span><span>✦</span><span>⌘</span></div></header>
    <div className="qa-toolbar">
      <nav className="qa-tabs" aria-label="QuestAtlas modules">
        <button type="button" aria-current={tab === 'atlas' ? 'page' : undefined} onClick={() => setTab('atlas')}>◈ Knowledge Atlas</button>
        <button type="button" aria-current={tab === 'studio' ? 'page' : undefined} onClick={() => setTab('studio')}>◇ Escape Studio</button>
        <button type="button" aria-current={tab === 'department' ? 'page' : undefined} onClick={() => setTab('department')}>♧ Department Hub</button>
      </nav>
      <span className={'qa-mode qa-mode-' + mode}>{mode === 'cloud' ? '● Supabase connected' : mode === 'demo' ? '◉ Unsaved demo' : mode === 'loading' ? '○ Checking…' : '○ Setup required'}</span>
    </div>
    {mode === 'loading' && <Info>Đang kiểm tra quyền truy cập và các bảng QuestAtlas…</Info>}
    {mode === 'unavailable' && <div className="qa-setup"><h2>QuestAtlas chưa được cấu hình đầy đủ</h2><p>{error || 'Chưa tìm thấy cấu hình Supabase và các bảng QuestAtlas.'}</p><p>Migration được giữ trong nhánh phát triển để kiểm duyệt trước khi triển khai. Bản demo chỉ lưu trong bộ nhớ của trang.</p><button type="button" className="qa-primary" onClick={() => { setRecords(demoRecords()); setMode('demo'); setError(''); setSelectedQuest('demo-quest-1'); }}>Khám phá bằng dữ liệu demo →</button><button onClick={() => void load()}>Thử kết nối lại</button></div>}
    {(mode === 'cloud' || mode === 'demo') && <>
      {isDemo && <Info variant="qa-warning">Bạn đang ở chế độ minh họa. Nội dung không được lưu vào Supabase và sẽ mất khi tải lại trang.</Info>}
      {error && <Info variant="qa-error" role="alert">{error}</Info>}
      {notice && <Info variant="qa-success">{notice}</Info>}
      {tab === 'atlas' && <div className="qa-grid">
        <Panel title="Knowledge Canvas" subtitle="Trực quan hóa nội dung và mối liên hệ giữa các chuyên đề" extra={<strong className="qa-stat">{records.nodes.length} nodes</strong>}>
          <MapCanvas nodes={records.nodes} edges={records.edges} selectedId={selectedNode} onSelect={setSelectedNode} />
          {selectedNodeData && <div className="qa-selection"><strong>{selectedNodeData.title}</strong><p>{selectedNodeData.summary || 'Chưa có mô tả'}</p><small>Grade {selectedNodeData.grade} · {selectedNodeData.unit_name || 'Chưa xác định Unit'}</small></div>}
          {selectedNodeData && <div className="qa-inline"><select aria-label="Node liên kết" value={linkTarget} onChange={(e) => setLinkTarget(e.target.value)}><option value="">Liên kết tới…</option>{records.nodes.filter((node) => node.id !== selectedNode).map((node) => <option key={node.id} value={node.id}>{node.title}</option>)}</select><button type="button" disabled={busy || !linkTarget} onClick={addEdge}>Tạo liên kết</button></div>}
        </Panel>
        <Panel title="Create Knowledge" subtitle="Thêm kiến thức dùng được trong nhiều trò chơi">
          <form className="qa-form" onSubmit={addNode}><label>Tên chuyên đề<input required minLength="3" maxLength="150" value={nodeTitle} onChange={(e) => setNodeTitle(e.target.value)} placeholder="E.g. Past Participle Clauses" /></label><label>Mô tả ngắn<textarea rows="3" maxLength="1000" value={nodeSummary} onChange={(e) => setNodeSummary(e.target.value)} placeholder="Kiến thức, ví dụ, lỗi thường gặp…" /></label><div className="qa-form-two"><label>Khối<select value={nodeGrade} onChange={(e) => setNodeGrade(e.target.value)}><option>10</option><option>11</option><option>12</option></select></label><label>Unit<input maxLength="80" value={nodeUnit} onChange={(e) => setNodeUnit(e.target.value)} placeholder="Unit 5" /></label></div><button className="qa-primary" disabled={busy}>+ Thêm node kiến thức</button></form>
          <div className="qa-mini-list"><strong>Node gần đây</strong>{records.nodes.slice(-7).reverse().map((node) => <button key={node.id} type="button" onClick={() => setSelectedNode(node.id)}><span>✦ {node.title}</span><small>Grade {node.grade}</small></button>)}</div>
        </Panel>
      </div>}
      {tab === 'studio' && <div className="qa-grid">
        <Panel title="Quest Builder" subtitle="Chọn thế giới và soạn chuỗi thử thách">
          <form className="qa-form" onSubmit={addQuest}><label>Tên cuộc phiêu lưu<input required minLength="5" maxLength="150" value={questTitle} onChange={(e) => setQuestTitle(e.target.value)} placeholder="The Vocabulary Vault" /></label><label>Giới thiệu<textarea rows="2" maxLength="1000" value={questDescription} onChange={(e) => setQuestDescription(e.target.value)} /></label><div className="qa-world-grid">{WORLDS.map((world) => <button type="button" className={questWorld === world.id ? 'active' : ''} aria-pressed={questWorld === world.id} key={world.id} onClick={() => setQuestWorld(world.id)}><span>{world.symbol}</span><strong>{world.title}</strong><small>{world.subtitle}</small></button>)}</div><button className="qa-primary" type="submit" disabled={busy}>+ Tạo Quest mới</button></form>
          <div className="qa-mini-list"><strong>Danh sách Quest</strong>{records.quests.map((item) => <button key={item.id} type="button" className={selectedQuest === item.id ? 'selected' : ''} onClick={() => { setSelectedQuest(item.id); setShowPreview(false); }}><span>{WORLD_NAMES[item.world] ? '◇ ' : ''}{item.title}</span><small>{item.status === 'published' ? 'Published' : 'Draft'}</small></button>)}</div>
        </Panel>
        <Panel title={quest ? quest.title : 'Puzzle Workshop'} subtitle={quest ? WORLD_NAMES[quest.world] + ' · ' + questPuzzles.length + ' thử thách' : 'Chọn hoặc tạo một Quest'}>
          {!quest ? <div className="qa-empty">Chưa chọn Quest để soạn thử thách.</div> : <>
            <div className="qa-quest-actions"><button type="button" onClick={() => setShowPreview(true)} disabled={!questPuzzles.length}>▶ Xem thử Escape Room</button><button type="button" className="qa-primary" onClick={publishQuest} disabled={busy || isDemo || quest.status === 'published' || !questPuzzles.length}>{quest.status === 'published' ? '✓ Đã xuất bản' : 'Xuất bản nội dung'}</button></div>
            <div className="qa-puzzle-list">{questPuzzles.map((puzzle, i) => <div key={puzzle.id}><span>{String(i + 1).padStart(2, '0')}</span><div><strong>{puzzle.stem}</strong><small>{puzzle.kind === 'choice' ? 'Multiple choice' : 'Unlock code'} · {puzzle.points} points</small></div>{quest.status === 'draft' && <button type="button" disabled={busy} onClick={() => void remove('qatl_puzzles', 'puzzles', puzzle.id)} aria-label={'Xóa ' + puzzle.stem}>×</button>}</div>)}</div>
            {quest.status !== 'published' && <form className="qa-form qa-puzzle-form" onSubmit={addPuzzle}>
              <h3>Thêm puzzle</h3>
              {canUseBank && !isDemo && <section className="qa-bank-import">
                <header><strong>Nhập từ Question Bank</strong><button type="button" disabled={bankBusy} onClick={loadBank}>{bankBusy ? 'Đang đọc…' : bankLoaded ? 'Tải lại' : 'Chọn câu hỏi có sẵn'}</button></header>
                {bankLoaded && <><input aria-label="Tìm câu hỏi ngân hàng" value={bankQuery} onChange={(e) => setBankQuery(e.target.value)} placeholder="Tìm theo nội dung…" />
                <div className="qa-bank-results">{bankMatches.map((item) => <button type="button" key={item.id} onClick={() => chooseBankItem(item)}>{cleanText(item.stem, 145)}</button>)}
                  {!bankMatches.length && <span>Chưa tìm thấy câu hỏi trắc nghiệm phù hợp.</span>}</div></>}
                <small>Nội dung được sao chép để giáo viên kiểm tra, không chỉnh sửa câu hỏi gốc.</small>
              </section>}
              <div className="qa-form-two"><label>Dạng puzzle<select value={puzzleKind} onChange={(e) => { setPuzzleKind(e.target.value); setPuzzleAnswer(''); }}><option value="choice">Trắc nghiệm</option><option value="code">Giải mã</option></select></label><label>Liên kết Atlas<select value={sourceNodeId} onChange={(e) => setSourceNodeId(e.target.value)}><option value="">Không liên kết</option>{records.nodes.map((node) => <option key={node.id} value={node.id}>{node.title}</option>)}</select></label></div>
              <label>Câu hỏi<textarea required minLength="8" maxLength="500" rows="2" value={puzzleStem} onChange={(e) => setPuzzleStem(e.target.value)} /></label>
              {puzzleKind === 'choice' && <label>4 đáp án (mỗi dòng một lựa chọn)<textarea required rows="4" value={puzzleOptions} onChange={(e) => setPuzzleOptions(e.target.value)} placeholder={'Option A\nOption B\nOption C\nOption D'} /></label>}
              <label>Đáp án đúng {puzzleKind === 'choice' ? '(đúng chính tả như một lựa chọn)' : '(mật mã)'}<input required maxLength="180" value={puzzleAnswer} onChange={(e) => setPuzzleAnswer(e.target.value)} /></label>
              <label>Gợi ý (tùy chọn)<input maxLength="400" value={puzzleHint} onChange={(e) => setPuzzleHint(e.target.value)} /></label><button className="qa-primary" disabled={busy} type="submit">+ Thêm thử thách</button>
            </form>}
          </>}
        </Panel>
      </div>}
      {tab === 'department' && <Panel title="Department Hub" subtitle="Sẵn sàng kết nối tổ chuyên môn">
        <div className="qa-department"><div className="qa-department-icon">♧</div><h3>Chia sẻ học liệu có kiểm duyệt</h3><p>Đây là kiến trúc bước tiếp theo: tổ trưởng duyệt node và Quest, cấp quyền sử dụng, lưu phiên bản dùng chung. Đang khóa để tránh chia sẻ ngoài phạm vi tổ khi chưa có RLS chuyên biệt.</p><div className="qa-feature-tags"><span>Teacher contributions</span><span>TTCM approval</span><span>Shared quests</span><span>Version history</span></div></div>
      </Panel>}
      {showPreview && quest && <div className="qa-modal-layer" role="dialog" aria-modal="true" aria-label="Xem trước Quest"><PreviewWorld key={quest.id} quest={quest} puzzles={questPuzzles} onClose={() => setShowPreview(false)} /></div>}
    </>}
    <footer className="qa-footer">BRIAN QuestAtlas Foundation · No AI · Teacher-only editing & preview · Student mode pending security review</footer>
  </div>;
}
