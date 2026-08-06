import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import './ActivityGraphStudio.css';

const WORLD_WIDTH = 4200;
const WORLD_HEIGHT = 2600;
const MIN_SCALE = 0.24;
const MAX_SCALE = 2.2;
const STORAGE_VERSION = 1;
const HISTORY_LIMIT = 60;

const NODE_TYPES = {
  topic: { label: 'Topic', labelVi: 'Chủ đề', color: '#0B57D0', soft: '#E8F0FE', icon: 'T' },
  objective: { label: 'Objective', labelVi: 'Mục tiêu', color: '#7B1FA2', soft: '#F3E5F5', icon: 'O' },
  activity: { label: 'Activity', labelVi: 'Hoạt động', color: '#00897B', soft: '#E0F2F1', icon: 'A' },
  resource: { label: 'Resource', labelVi: 'Học liệu', color: '#F57C00', soft: '#FFF3E0', icon: 'R' },
  skill: { label: 'Skill', labelVi: 'Kĩ năng', color: '#C2185B', soft: '#FCE4EC', icon: 'S' },
  assessment: { label: 'Assessment', labelVi: 'Đánh giá', color: '#5D4037', soft: '#EFEBE9', icon: '✓' },
};

const EDGE_KINDS = {
  sequence: { label: 'Next', labelVi: 'Tiếp nối', dash: '' },
  supports: { label: 'Supports', labelVi: 'Hỗ trợ', dash: '8 6' },
  requires: { label: 'Requires', labelVi: 'Yêu cầu', dash: '3 6' },
  assesses: { label: 'Assesses', labelVi: 'Đánh giá', dash: '12 5 2 5' },
};

const COPY = {
  vi: {
    title: 'Brian Activity Graph', subtitle: 'Thiết kế mạch hoạt động dạy học bằng sơ đồ tương tác',
    projects: 'Sơ đồ của tôi', newProject: 'Sơ đồ mới', duplicate: 'Nhân bản', remove: 'Xóa',
    templates: 'Mẫu nhanh', blank: 'Sơ đồ trống', lesson: 'Tiến trình bài dạy', vocabulary: 'Mạng từ vựng', assessment: 'Kế hoạch đánh giá',
    search: 'Tìm node...', allTypes: 'Tất cả loại', add: 'Thêm node', connect: 'Nối node', select: 'Chọn', pan: 'Di chuyển',
    autoLayout: 'Sắp xếp tự động', fit: 'Vừa màn hình', present: 'Trình chiếu', exitPresent: 'Thoát trình chiếu',
    import: 'Nhập JSON', export: 'Xuất JSON', exportSvg: 'Xuất SVG', undo: 'Hoàn tác', redo: 'Làm lại',
    inspector: 'Thuộc tính', nothingSelected: 'Chọn một node hoặc đường nối để chỉnh sửa.',
    node: 'Node', edge: 'Đường nối', name: 'Tên', description: 'Mô tả', type: 'Loại', status: 'Trạng thái', tags: 'Nhãn',
    label: 'Nhãn đường nối', relation: 'Quan hệ', source: 'Nguồn', target: 'Đích', deleteNode: 'Xóa node', deleteEdge: 'Xóa đường nối',
    draft: 'Bản nháp', ready: 'Sẵn sàng', taught: 'Đã dạy', archived: 'Lưu trữ',
    saved: 'Đã tự động lưu trên thiết bị', nodes: 'node', edges: 'liên kết', zoom: 'Thu phóng',
    connectHint: 'Chọn node nguồn, sau đó chọn node đích.', sourceChosen: 'Đã chọn node nguồn. Hãy chọn node đích.',
    empty: 'Chưa có node. Thêm node hoặc chọn một mẫu để bắt đầu.', projectName: 'Tên sơ đồ', projectDescription: 'Mô tả sơ đồ',
    confirmDeleteProject: 'Xóa sơ đồ này? Thao tác không thể hoàn tác.', confirmDeleteNode: 'Xóa node và các đường nối liên quan?',
    imported: 'Đã nhập sơ đồ thành công.', importError: 'Tệp không đúng định dạng Brian Activity Graph.', exported: 'Đã xuất tệp.',
    keyboard: 'Phím tắt: Delete xóa · C nối node · F vừa màn hình · Ctrl/Cmd+Z hoàn tác',
    openProjects: 'Mở danh sách sơ đồ', openInspector: 'Mở thuộc tính', close: 'Đóng',
    connectionCancelled: 'Đã hủy chế độ nối.', cannotSelfConnect: 'Không thể nối một node với chính nó.', existingEdge: 'Hai node này đã được nối.',
    resetView: 'Đặt lại góc nhìn', editProject: 'Thông tin sơ đồ', created: 'Đã tạo', updated: 'Cập nhật',
    helpTitle: 'Cách dùng nhanh', helpText: 'Kéo node để sắp xếp. Kéo nền để di chuyển toàn bộ canvas. Dùng chế độ Nối node để tạo quan hệ.',
  },
  en: {
    title: 'Brian Activity Graph', subtitle: 'Design connected teaching activities on an interactive canvas',
    projects: 'My graphs', newProject: 'New graph', duplicate: 'Duplicate', remove: 'Delete',
    templates: 'Quick templates', blank: 'Blank graph', lesson: 'Lesson sequence', vocabulary: 'Vocabulary network', assessment: 'Assessment plan',
    search: 'Search nodes...', allTypes: 'All types', add: 'Add node', connect: 'Connect', select: 'Select', pan: 'Pan',
    autoLayout: 'Auto layout', fit: 'Fit view', present: 'Present', exitPresent: 'Exit presentation',
    import: 'Import JSON', export: 'Export JSON', exportSvg: 'Export SVG', undo: 'Undo', redo: 'Redo',
    inspector: 'Inspector', nothingSelected: 'Select a node or connection to edit it.',
    node: 'Node', edge: 'Connection', name: 'Name', description: 'Description', type: 'Type', status: 'Status', tags: 'Tags',
    label: 'Connection label', relation: 'Relationship', source: 'Source', target: 'Target', deleteNode: 'Delete node', deleteEdge: 'Delete connection',
    draft: 'Draft', ready: 'Ready', taught: 'Taught', archived: 'Archived',
    saved: 'Autosaved on this device', nodes: 'nodes', edges: 'connections', zoom: 'Zoom',
    connectHint: 'Select a source node, then select a target node.', sourceChosen: 'Source selected. Now choose a target node.',
    empty: 'No nodes yet. Add a node or choose a template to begin.', projectName: 'Graph name', projectDescription: 'Graph description',
    confirmDeleteProject: 'Delete this graph? This cannot be undone.', confirmDeleteNode: 'Delete this node and its connections?',
    imported: 'Graph imported successfully.', importError: 'This is not a valid Brian Activity Graph file.', exported: 'File exported.',
    keyboard: 'Shortcuts: Delete removes · C connects · F fits · Ctrl/Cmd+Z undoes',
    openProjects: 'Open graph list', openInspector: 'Open inspector', close: 'Close',
    connectionCancelled: 'Connection mode cancelled.', cannotSelfConnect: 'A node cannot connect to itself.', existingEdge: 'These nodes are already connected.',
    resetView: 'Reset view', editProject: 'Graph details', created: 'Created', updated: 'Updated',
    helpTitle: 'Quick guide', helpText: 'Drag nodes to arrange them. Drag the background to pan. Use Connect mode to create relationships.',
  },
};

function uid(prefix = 'id') {
  if (globalThis.crypto?.randomUUID) return `${prefix}-${globalThis.crypto.randomUUID()}`;
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
}

function deepClone(value) {
  if (globalThis.structuredClone) return globalThis.structuredClone(value);
  return JSON.parse(JSON.stringify(value));
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function escapeXml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function downloadText(filename, content, mime = 'application/json') {
  const blob = new Blob([content], { type: `${mime};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function slugify(value) {
  return String(value || 'activity-graph')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'activity-graph';
}

function makeNode(type, title, x, y, extra = {}) {
  return {
    id: uid('node'), type, title, description: '', x, y, width: 230, height: 126,
    status: 'draft', tags: [], createdAt: new Date().toISOString(), ...extra,
  };
}

function makeEdge(source, target, kind = 'sequence', label = '') {
  return { id: uid('edge'), source, target, kind, label };
}

function buildTemplate(templateId, language = 'vi') {
  const now = new Date().toISOString();
  const isVi = language === 'vi';
  let title = isVi ? 'Sơ đồ hoạt động mới' : 'New activity graph';
  let description = '';
  let nodes = [];
  let edges = [];

  if (templateId === 'lesson') {
    title = isVi ? 'Tiến trình bài dạy tiếng Anh' : 'English lesson sequence';
    description = isVi ? 'Mẫu tổ chức mục tiêu, hoạt động và đánh giá trong một tiết học.' : 'A connected lesson flow with objectives, activities and assessment.';
    const topic = makeNode('topic', isVi ? 'Chủ đề bài học' : 'Lesson topic', 160, 460, { status: 'ready' });
    const objective = makeNode('objective', isVi ? 'Mục tiêu học tập' : 'Learning objective', 520, 220, { description: isVi ? 'Học sinh vận dụng ngôn ngữ mục tiêu trong ngữ cảnh.' : 'Learners use the target language in context.' });
    const warmup = makeNode('activity', isVi ? 'Khởi động' : 'Warm-up', 520, 520, { status: 'ready' });
    const input = makeNode('resource', isVi ? 'Ngữ liệu đầu vào' : 'Language input', 900, 220);
    const practice = makeNode('activity', isVi ? 'Luyện tập có hướng dẫn' : 'Guided practice', 900, 520);
    const production = makeNode('skill', isVi ? 'Vận dụng giao tiếp' : 'Communicative production', 1280, 520);
    const check = makeNode('assessment', isVi ? 'Đánh giá cuối tiết' : 'Exit assessment', 1660, 360, { status: 'ready' });
    nodes = [topic, objective, warmup, input, practice, production, check];
    edges = [
      makeEdge(topic.id, objective.id, 'supports'), makeEdge(topic.id, warmup.id),
      makeEdge(objective.id, input.id, 'requires'), makeEdge(warmup.id, practice.id),
      makeEdge(input.id, practice.id, 'supports'), makeEdge(practice.id, production.id),
      makeEdge(objective.id, check.id, 'assesses'), makeEdge(production.id, check.id, 'assesses'),
    ];
  } else if (templateId === 'vocabulary') {
    title = isVi ? 'Mạng từ vựng theo chủ đề' : 'Thematic vocabulary network';
    description = isVi ? 'Mẫu liên kết từ khóa, nghĩa, collocation, ví dụ và nhiệm vụ vận dụng.' : 'Connect a key word to meaning, collocations, examples and application tasks.';
    const center = makeNode('topic', isVi ? 'Từ khóa trung tâm' : 'Core word', 920, 430, { width: 250, height: 140, status: 'ready' });
    const meaning = makeNode('resource', isVi ? 'Nghĩa & phát âm' : 'Meaning & pronunciation', 420, 150);
    const family = makeNode('skill', 'Word family', 930, 80);
    const collocation = makeNode('resource', 'Collocations', 1430, 150);
    const example = makeNode('activity', isVi ? 'Ví dụ trong ngữ cảnh' : 'Context example', 420, 760);
    const contrast = makeNode('objective', isVi ? 'Từ dễ nhầm' : 'Commonly confused words', 930, 850);
    const task = makeNode('activity', isVi ? 'Nhiệm vụ vận dụng' : 'Application task', 1430, 760);
    const check = makeNode('assessment', isVi ? 'Kiểm tra nhanh' : 'Quick check', 1880, 430);
    nodes = [center, meaning, family, collocation, example, contrast, task, check];
    edges = [meaning, family, collocation, example, contrast, task].map((node) => makeEdge(center.id, node.id, 'supports'));
    edges.push(makeEdge(task.id, check.id, 'assesses'), makeEdge(center.id, check.id, 'assesses'));
  } else if (templateId === 'assessment') {
    title = isVi ? 'Kế hoạch đánh giá' : 'Assessment plan';
    description = isVi ? 'Mẫu nối chuẩn đầu ra, minh chứng, nhiệm vụ và phản hồi.' : 'Map outcomes to evidence, tasks and feedback.';
    const outcome = makeNode('objective', isVi ? 'Chuẩn đầu ra' : 'Learning outcome', 180, 420, { status: 'ready' });
    const criteria = makeNode('assessment', isVi ? 'Tiêu chí thành công' : 'Success criteria', 600, 180);
    const task = makeNode('activity', isVi ? 'Nhiệm vụ đánh giá' : 'Assessment task', 600, 600);
    const evidence = makeNode('resource', isVi ? 'Minh chứng học tập' : 'Learning evidence', 1040, 420);
    const feedback = makeNode('activity', isVi ? 'Phản hồi & sửa bài' : 'Feedback & revision', 1460, 180);
    const next = makeNode('skill', isVi ? 'Bước học tiếp theo' : 'Next learning step', 1460, 600);
    nodes = [outcome, criteria, task, evidence, feedback, next];
    edges = [
      makeEdge(outcome.id, criteria.id, 'assesses'), makeEdge(outcome.id, task.id, 'requires'),
      makeEdge(criteria.id, evidence.id, 'assesses'), makeEdge(task.id, evidence.id),
      makeEdge(evidence.id, feedback.id, 'supports'), makeEdge(evidence.id, next.id, 'supports'),
      makeEdge(feedback.id, next.id),
    ];
  }

  return {
    id: uid('graph'), title, description, nodes, edges,
    createdAt: now, updatedAt: now, view: { scale: 0.72, offsetX: 80, offsetY: 70 },
  };
}

function loadWorkspace(storageKey, language) {
  try {
    const raw = localStorage.getItem(storageKey);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed?.version === STORAGE_VERSION && Array.isArray(parsed.projects) && parsed.projects.length) {
        return { projects: parsed.projects, activeProjectId: parsed.activeProjectId || parsed.projects[0].id };
      }
    }
  } catch (error) {
    console.warn('[ActivityGraph] Could not load local workspace', error);
  }
  const first = buildTemplate('lesson', language);
  return { projects: [first], activeProjectId: first.id };
}

function nodeCenter(node) {
  return { x: node.x + (node.width || 230) / 2, y: node.y + (node.height || 126) / 2 };
}

function edgePath(source, target) {
  const start = nodeCenter(source);
  const end = nodeCenter(target);
  const dx = end.x - start.x;
  const control = Math.max(70, Math.min(260, Math.abs(dx) * 0.45));
  const c1x = start.x + (dx >= 0 ? control : -control);
  const c2x = end.x - (dx >= 0 ? control : -control);
  return `M ${start.x} ${start.y} C ${c1x} ${start.y}, ${c2x} ${end.y}, ${end.x} ${end.y}`;
}

function projectBounds(nodes) {
  if (!nodes.length) return { minX: 0, minY: 0, maxX: 1200, maxY: 700 };
  return nodes.reduce((bounds, node) => ({
    minX: Math.min(bounds.minX, node.x), minY: Math.min(bounds.minY, node.y),
    maxX: Math.max(bounds.maxX, node.x + (node.width || 230)),
    maxY: Math.max(bounds.maxY, node.y + (node.height || 126)),
  }), { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity });
}

function MiniMap({ project, selectedNodeId, onJump }) {
  const bounds = projectBounds(project.nodes);
  const padding = 80;
  const width = Math.max(1, bounds.maxX - bounds.minX + padding * 2);
  const height = Math.max(1, bounds.maxY - bounds.minY + padding * 2);
  const scale = Math.min(210 / width, 122 / height);
  return (
    <button type="button" className="ag-minimap" onClick={onJump} aria-label="Mini map">
      <svg viewBox={`0 0 ${width} ${height}`} role="img">
        {project.edges.map((edge) => {
          const source = project.nodes.find((node) => node.id === edge.source);
          const target = project.nodes.find((node) => node.id === edge.target);
          if (!source || !target) return null;
          const a = nodeCenter(source); const b = nodeCenter(target);
          return <line key={edge.id} x1={a.x - bounds.minX + padding} y1={a.y - bounds.minY + padding} x2={b.x - bounds.minX + padding} y2={b.y - bounds.minY + padding} />;
        })}
        {project.nodes.map((node) => {
          const type = NODE_TYPES[node.type] || NODE_TYPES.activity;
          return <rect key={node.id} className={node.id === selectedNodeId ? 'selected' : ''} x={node.x - bounds.minX + padding} y={node.y - bounds.minY + padding} width={node.width || 230} height={node.height || 126} rx="14" style={{ fill: type.color }} />;
        })}
      </svg>
      <span>{Math.round(scale * 100)}%</span>
    </button>
  );
}

function IconButton({ title, active = false, disabled = false, onClick, children, className = '' }) {
  return <button type="button" className={`ag-icon-button ${active ? 'active' : ''} ${className}`} title={title} aria-label={title} disabled={disabled} onClick={onClick}>{children}</button>;
}

export default function ActivityGraphStudio({ language = 'vi', currentUser }) {
  const t = COPY[language] || COPY.vi;
  const userKey = currentUser?.id || currentUser?.email || 'guest';
  const storageKey = `brian-activity-graph:v${STORAGE_VERSION}:${userKey}`;
  const initialWorkspace = useMemo(() => loadWorkspace(storageKey, language), [storageKey]);
  const [projects, setProjects] = useState(initialWorkspace.projects);
  const [activeProjectId, setActiveProjectId] = useState(initialWorkspace.activeProjectId);
  const [selectedNodeId, setSelectedNodeId] = useState('');
  const [selectedEdgeId, setSelectedEdgeId] = useState('');
  const [mode, setMode] = useState('select');
  const [connectionSourceId, setConnectionSourceId] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [undoStack, setUndoStack] = useState([]);
  const [redoStack, setRedoStack] = useState([]);
  const [toast, setToast] = useState('');
  const [presentMode, setPresentMode] = useState(false);
  const [leftOpen, setLeftOpen] = useState(false);
  const [inspectorOpen, setInspectorOpen] = useState(false);
  const canvasRef = useRef(null);
  const pageRef = useRef(null);
  const importRef = useRef(null);
  const dragRef = useRef(null);
  const toastTimerRef = useRef(null);

  const activeProject = useMemo(() => projects.find((project) => project.id === activeProjectId) || projects[0], [projects, activeProjectId]);
  const selectedNode = activeProject?.nodes.find((node) => node.id === selectedNodeId) || null;
  const selectedEdge = activeProject?.edges.find((edge) => edge.id === selectedEdgeId) || null;
  const view = activeProject?.view || { scale: 0.72, offsetX: 80, offsetY: 70 };

  const showToast = useCallback((message) => {
    window.clearTimeout(toastTimerRef.current);
    setToast(message);
    toastTimerRef.current = window.setTimeout(() => setToast(''), 2600);
  }, []);

  useEffect(() => () => window.clearTimeout(toastTimerRef.current), []);

  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify({ version: STORAGE_VERSION, projects, activeProjectId }));
    } catch (error) {
      console.warn('[ActivityGraph] Could not autosave workspace', error);
    }
  }, [storageKey, projects, activeProjectId]);

  const replaceActiveProject = useCallback((nextProject) => {
    setProjects((current) => current.map((project) => project.id === nextProject.id ? nextProject : project));
  }, []);

  const captureHistory = useCallback(() => {
    if (!activeProject) return;
    setUndoStack((stack) => [...stack, deepClone(activeProject)].slice(-HISTORY_LIMIT));
    setRedoStack([]);
  }, [activeProject]);

  const commitProject = useCallback((producer, { record = true } = {}) => {
    if (!activeProject) return;
    if (record) captureHistory();
    const draft = deepClone(activeProject);
    const result = producer(draft) || draft;
    result.updatedAt = new Date().toISOString();
    replaceActiveProject(result);
  }, [activeProject, captureHistory, replaceActiveProject]);

  const undo = useCallback(() => {
    if (!undoStack.length || !activeProject) return;
    const previous = undoStack[undoStack.length - 1];
    setUndoStack((stack) => stack.slice(0, -1));
    setRedoStack((stack) => [...stack, deepClone(activeProject)].slice(-HISTORY_LIMIT));
    replaceActiveProject(previous);
    setSelectedNodeId(''); setSelectedEdgeId('');
  }, [undoStack, activeProject, replaceActiveProject]);

  const redo = useCallback(() => {
    if (!redoStack.length || !activeProject) return;
    const next = redoStack[redoStack.length - 1];
    setRedoStack((stack) => stack.slice(0, -1));
    setUndoStack((stack) => [...stack, deepClone(activeProject)].slice(-HISTORY_LIMIT));
    replaceActiveProject(next);
    setSelectedNodeId(''); setSelectedEdgeId('');
  }, [redoStack, activeProject, replaceActiveProject]);

  const setView = useCallback((nextView, record = false) => {
    commitProject((project) => { project.view = { ...project.view, ...nextView }; }, { record });
  }, [commitProject]);

  const fitView = useCallback(() => {
    if (!activeProject || !canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const bounds = projectBounds(activeProject.nodes);
    const contentWidth = Math.max(400, bounds.maxX - bounds.minX);
    const contentHeight = Math.max(300, bounds.maxY - bounds.minY);
    const scale = clamp(Math.min((rect.width - 180) / contentWidth, (rect.height - 160) / contentHeight), MIN_SCALE, 1.35);
    setView({
      scale,
      offsetX: (rect.width - contentWidth * scale) / 2 - bounds.minX * scale,
      offsetY: (rect.height - contentHeight * scale) / 2 - bounds.minY * scale,
    });
  }, [activeProject, setView]);

  const resetView = useCallback(() => setView({ scale: 0.72, offsetX: 70, offsetY: 60 }), [setView]);

  const zoomAtCenter = useCallback((factor) => {
    if (!canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const nextScale = clamp(view.scale * factor, MIN_SCALE, MAX_SCALE);
    const worldX = (rect.width / 2 - view.offsetX) / view.scale;
    const worldY = (rect.height / 2 - view.offsetY) / view.scale;
    setView({ scale: nextScale, offsetX: rect.width / 2 - worldX * nextScale, offsetY: rect.height / 2 - worldY * nextScale });
  }, [view, setView]);

  const canvasPoint = useCallback((clientX, clientY) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };
    return {
      x: (clientX - rect.left - view.offsetX) / view.scale,
      y: (clientY - rect.top - view.offsetY) / view.scale,
    };
  }, [view]);

  const addNode = useCallback((type = 'activity') => {
    if (!activeProject || !canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const center = canvasPoint(rect.left + rect.width / 2, rect.top + rect.height / 2);
    const typeCopy = NODE_TYPES[type] || NODE_TYPES.activity;
    const node = makeNode(type, language === 'vi' ? typeCopy.labelVi : typeCopy.label, clamp(center.x - 115, 20, WORLD_WIDTH - 260), clamp(center.y - 63, 20, WORLD_HEIGHT - 160));
    commitProject((project) => { project.nodes.push(node); });
    setSelectedNodeId(node.id); setSelectedEdgeId(''); setInspectorOpen(true); setMode('select');
  }, [activeProject, canvasPoint, commitProject, language]);

  const deleteSelected = useCallback(() => {
    if (selectedNode) {
      if (!window.confirm(t.confirmDeleteNode)) return;
      commitProject((project) => {
        project.nodes = project.nodes.filter((node) => node.id !== selectedNode.id);
        project.edges = project.edges.filter((edge) => edge.source !== selectedNode.id && edge.target !== selectedNode.id);
      });
      setSelectedNodeId(''); setConnectionSourceId('');
    } else if (selectedEdge) {
      commitProject((project) => { project.edges = project.edges.filter((edge) => edge.id !== selectedEdge.id); });
      setSelectedEdgeId('');
    }
  }, [selectedNode, selectedEdge, commitProject, t.confirmDeleteNode]);

  const selectProject = useCallback((projectId) => {
    setActiveProjectId(projectId); setSelectedNodeId(''); setSelectedEdgeId('');
    setConnectionSourceId(''); setUndoStack([]); setRedoStack([]); setLeftOpen(false);
  }, []);

  const createProject = useCallback((templateId = 'blank') => {
    const project = buildTemplate(templateId, language);
    setProjects((current) => [...current, project]);
    selectProject(project.id);
  }, [language, selectProject]);

  const duplicateProject = useCallback(() => {
    if (!activeProject) return;
    const copy = deepClone(activeProject);
    copy.id = uid('graph');
    copy.title = `${activeProject.title} · ${language === 'vi' ? 'Bản sao' : 'Copy'}`;
    copy.createdAt = new Date().toISOString(); copy.updatedAt = copy.createdAt;
    const idMap = new Map();
    copy.nodes = copy.nodes.map((node) => { const id = uid('node'); idMap.set(node.id, id); return { ...node, id }; });
    copy.edges = copy.edges.map((edge) => ({ ...edge, id: uid('edge'), source: idMap.get(edge.source), target: idMap.get(edge.target) }));
    setProjects((current) => [...current, copy]); selectProject(copy.id);
  }, [activeProject, language, selectProject]);

  const deleteProject = useCallback(() => {
    if (!activeProject || !window.confirm(t.confirmDeleteProject)) return;
    if (projects.length === 1) {
      const blank = buildTemplate('blank', language);
      setProjects([blank]); selectProject(blank.id); return;
    }
    const remaining = projects.filter((project) => project.id !== activeProject.id);
    setProjects(remaining); selectProject(remaining[0].id);
  }, [activeProject, projects, t.confirmDeleteProject, language, selectProject]);

  const updateNode = useCallback((patch, record = false) => {
    if (!selectedNode) return;
    commitProject((project) => {
      const node = project.nodes.find((entry) => entry.id === selectedNode.id);
      if (node) Object.assign(node, patch);
    }, { record });
  }, [selectedNode, commitProject]);

  const updateEdge = useCallback((patch, record = false) => {
    if (!selectedEdge) return;
    commitProject((project) => {
      const edge = project.edges.find((entry) => entry.id === selectedEdge.id);
      if (edge) Object.assign(edge, patch);
    }, { record });
  }, [selectedEdge, commitProject]);

  const handleNodeActivate = useCallback((nodeId) => {
    if (mode === 'connect') {
      if (!connectionSourceId) {
        setConnectionSourceId(nodeId); setSelectedNodeId(nodeId); setSelectedEdgeId(''); showToast(t.sourceChosen); return;
      }
      if (connectionSourceId === nodeId) { showToast(t.cannotSelfConnect); return; }
      const exists = activeProject.edges.some((edge) => edge.source === connectionSourceId && edge.target === nodeId);
      if (exists) { showToast(t.existingEdge); return; }
      const edge = makeEdge(connectionSourceId, nodeId);
      commitProject((project) => { project.edges.push(edge); });
      setSelectedEdgeId(edge.id); setSelectedNodeId(''); setConnectionSourceId(''); setMode('select'); setInspectorOpen(true);
      return;
    }
    setSelectedNodeId(nodeId); setSelectedEdgeId(''); setInspectorOpen(true);
  }, [mode, connectionSourceId, activeProject, commitProject, showToast, t]);

  const beginNodeDrag = useCallback((event, node) => {
    if (mode === 'connect') { event.preventDefault(); handleNodeActivate(node.id); return; }
    if (mode === 'pan') return;
    event.preventDefault(); event.stopPropagation();
    captureHistory();
    dragRef.current = { kind: 'node', nodeId: node.id, startX: event.clientX, startY: event.clientY, nodeX: node.x, nodeY: node.y };
    setSelectedNodeId(node.id); setSelectedEdgeId('');
    event.currentTarget.setPointerCapture?.(event.pointerId);
  }, [mode, captureHistory, handleNodeActivate]);

  const beginCanvasPan = useCallback((event) => {
    if (event.button !== 0 || event.target.closest?.('.ag-node, .ag-edge-hit, .ag-floating-toolbar, .ag-zoom-controls, .ag-minimap')) return;
    setSelectedNodeId(''); setSelectedEdgeId('');
    dragRef.current = { kind: 'pan', startX: event.clientX, startY: event.clientY, offsetX: view.offsetX, offsetY: view.offsetY };
    event.currentTarget.setPointerCapture?.(event.pointerId);
  }, [view]);

  const handlePointerMove = useCallback((event) => {
    const drag = dragRef.current;
    if (!drag || !activeProject) return;
    if (drag.kind === 'pan') {
      setView({ offsetX: drag.offsetX + event.clientX - drag.startX, offsetY: drag.offsetY + event.clientY - drag.startY });
      return;
    }
    const dx = (event.clientX - drag.startX) / view.scale;
    const dy = (event.clientY - drag.startY) / view.scale;
    const nextX = clamp(drag.nodeX + dx, 0, WORLD_WIDTH - 250);
    const nextY = clamp(drag.nodeY + dy, 0, WORLD_HEIGHT - 150);
    commitProject((project) => {
      const node = project.nodes.find((entry) => entry.id === drag.nodeId);
      if (node) { node.x = nextX; node.y = nextY; }
    }, { record: false });
  }, [activeProject, view.scale, setView, commitProject]);

  const endPointer = useCallback(() => { dragRef.current = null; }, []);

  const handleWheel = useCallback((event) => {
    event.preventDefault();
    if (!canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const mouseX = event.clientX - rect.left;
    const mouseY = event.clientY - rect.top;
    const worldX = (mouseX - view.offsetX) / view.scale;
    const worldY = (mouseY - view.offsetY) / view.scale;
    const factor = event.deltaY < 0 ? 1.1 : 0.9;
    const nextScale = clamp(view.scale * factor, MIN_SCALE, MAX_SCALE);
    setView({ scale: nextScale, offsetX: mouseX - worldX * nextScale, offsetY: mouseY - worldY * nextScale });
  }, [view, setView]);

  const autoLayout = useCallback(() => {
    if (!activeProject?.nodes.length) return;
    commitProject((project) => {
      const nodeMap = new Map(project.nodes.map((node) => [node.id, node]));
      const incoming = new Map(project.nodes.map((node) => [node.id, 0]));
      const outgoing = new Map(project.nodes.map((node) => [node.id, []]));
      project.edges.forEach((edge) => {
        if (!nodeMap.has(edge.source) || !nodeMap.has(edge.target)) return;
        incoming.set(edge.target, (incoming.get(edge.target) || 0) + 1);
        outgoing.get(edge.source).push(edge.target);
      });
      const queue = project.nodes.filter((node) => incoming.get(node.id) === 0).map((node) => node.id);
      const depth = new Map(queue.map((id) => [id, 0]));
      while (queue.length) {
        const id = queue.shift();
        (outgoing.get(id) || []).forEach((targetId) => {
          depth.set(targetId, Math.max(depth.get(targetId) || 0, (depth.get(id) || 0) + 1));
          incoming.set(targetId, incoming.get(targetId) - 1);
          if (incoming.get(targetId) === 0) queue.push(targetId);
        });
      }
      const typeDepth = { topic: 0, objective: 1, resource: 2, activity: 3, skill: 4, assessment: 5 };
      project.nodes.forEach((node) => { if (!depth.has(node.id)) depth.set(node.id, typeDepth[node.type] ?? 3); });
      const columns = new Map();
      project.nodes.forEach((node) => {
        const d = depth.get(node.id) || 0;
        if (!columns.has(d)) columns.set(d, []);
        columns.get(d).push(node);
      });
      [...columns.entries()].sort((a, b) => a[0] - b[0]).forEach(([d, nodes]) => {
        nodes.sort((a, b) => (NODE_TYPES[a.type]?.label || '').localeCompare(NODE_TYPES[b.type]?.label || '') || a.title.localeCompare(b.title));
        nodes.forEach((node, index) => { node.x = 140 + d * 360; node.y = 130 + index * 190; });
      });
    });
    window.setTimeout(fitView, 60);
  }, [activeProject, commitProject, fitView]);

  const exportJson = useCallback(() => {
    if (!activeProject) return;
    const payload = { format: 'brian-activity-graph', version: STORAGE_VERSION, exportedAt: new Date().toISOString(), project: activeProject };
    downloadText(`${slugify(activeProject.title)}.brian-graph.json`, JSON.stringify(payload, null, 2));
    showToast(t.exported);
  }, [activeProject, showToast, t.exported]);

  const exportSvg = useCallback(() => {
    if (!activeProject) return;
    const bounds = projectBounds(activeProject.nodes);
    const pad = 90;
    const width = Math.max(900, bounds.maxX - bounds.minX + pad * 2);
    const height = Math.max(600, bounds.maxY - bounds.minY + pad * 2 + 90);
    const shiftX = -bounds.minX + pad; const shiftY = -bounds.minY + pad + 90;
    const edgesSvg = activeProject.edges.map((edge) => {
      const source = activeProject.nodes.find((node) => node.id === edge.source);
      const target = activeProject.nodes.find((node) => node.id === edge.target);
      if (!source || !target) return '';
      return `<path d="${edgePath(source, target)}" fill="none" stroke="#8190A5" stroke-width="3" marker-end="url(#arrow)"/>`;
    }).join('');
    const nodesSvg = activeProject.nodes.map((node) => {
      const type = NODE_TYPES[node.type] || NODE_TYPES.activity;
      const x = node.x; const y = node.y; const w = node.width || 230; const h = node.height || 126;
      const words = String(node.title || '').split(/\s+/); const lines = []; let line = '';
      words.forEach((word) => { const candidate = `${line} ${word}`.trim(); if (candidate.length > 25 && line) { lines.push(line); line = word; } else line = candidate; });
      if (line) lines.push(line);
      return `<g><rect x="${x}" y="${y}" width="${w}" height="${h}" rx="20" fill="#FFFFFF" stroke="${type.color}" stroke-width="3"/><rect x="${x}" y="${y}" width="12" height="${h}" rx="6" fill="${type.color}"/><text x="${x + 28}" y="${y + 31}" font-family="Arial, sans-serif" font-size="13" font-weight="700" fill="${type.color}">${escapeXml(language === 'vi' ? type.labelVi : type.label)}</text>${lines.slice(0, 3).map((text, index) => `<text x="${x + 28}" y="${y + 60 + index * 23}" font-family="Arial, sans-serif" font-size="17" font-weight="700" fill="#172033">${escapeXml(text)}</text>`).join('')}</g>`;
    }).join('');
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><defs><marker id="arrow" markerWidth="12" markerHeight="12" refX="10" refY="6" orient="auto"><path d="M0,0 L12,6 L0,12 z" fill="#8190A5"/></marker><pattern id="grid" width="32" height="32" patternUnits="userSpaceOnUse"><circle cx="1" cy="1" r="1" fill="#D8DFEA"/></pattern></defs><rect width="100%" height="100%" fill="#F7F9FC"/><rect width="100%" height="100%" fill="url(#grid)"/><text x="${pad}" y="50" font-family="Arial, sans-serif" font-size="30" font-weight="700" fill="#172033">${escapeXml(activeProject.title)}</text><text x="${pad}" y="78" font-family="Arial, sans-serif" font-size="15" fill="#607087">${escapeXml(activeProject.description)}</text><g transform="translate(${shiftX} ${shiftY})">${edgesSvg}${nodesSvg}</g></svg>`;
    downloadText(`${slugify(activeProject.title)}.svg`, svg, 'image/svg+xml'); showToast(t.exported);
  }, [activeProject, language, showToast, t.exported]);

  const importJson = useCallback(async (event) => {
    const file = event.target.files?.[0]; event.target.value = '';
    if (!file) return;
    try {
      const parsed = JSON.parse(await file.text());
      const project = parsed?.format === 'brian-activity-graph' ? parsed.project : parsed;
      if (!project || !Array.isArray(project.nodes) || !Array.isArray(project.edges)) throw new Error('Invalid graph');
      const imported = deepClone(project);
      imported.id = uid('graph'); imported.title = imported.title || file.name.replace(/\.json$/i, '');
      imported.createdAt = new Date().toISOString(); imported.updatedAt = imported.createdAt;
      imported.view = imported.view || { scale: 0.72, offsetX: 70, offsetY: 60 };
      setProjects((current) => [...current, imported]); selectProject(imported.id); showToast(t.imported);
    } catch (error) {
      console.warn('[ActivityGraph] Import failed', error); showToast(t.importError);
    }
  }, [selectProject, showToast, t.imported, t.importError]);

  const togglePresent = useCallback(async () => {
    const next = !presentMode; setPresentMode(next);
    if (next) {
      try { await pageRef.current?.requestFullscreen?.(); } catch { /* fullscreen is optional */ }
      window.setTimeout(fitView, 80);
    } else if (document.fullscreenElement) {
      try { await document.exitFullscreen(); } catch { /* optional */ }
    }
  }, [presentMode, fitView]);

  useEffect(() => {
    const onFullscreen = () => { if (!document.fullscreenElement) setPresentMode(false); };
    document.addEventListener('fullscreenchange', onFullscreen);
    return () => document.removeEventListener('fullscreenchange', onFullscreen);
  }, []);

  useEffect(() => {
    const onKeyDown = (event) => {
      const tag = event.target?.tagName?.toLowerCase();
      const typing = ['input', 'textarea', 'select'].includes(tag) || event.target?.isContentEditable;
      const mod = event.metaKey || event.ctrlKey;
      if (mod && event.key.toLowerCase() === 'z') { event.preventDefault(); event.shiftKey ? redo() : undo(); return; }
      if (mod && event.key.toLowerCase() === 'y') { event.preventDefault(); redo(); return; }
      if (typing) return;
      if (event.key === 'Delete' || event.key === 'Backspace') { event.preventDefault(); deleteSelected(); }
      if (event.key.toLowerCase() === 'c') { setMode('connect'); setConnectionSourceId(''); showToast(t.connectHint); }
      if (event.key.toLowerCase() === 'f') fitView();
      if (event.key === 'Escape') {
        if (presentMode) togglePresent();
        else { setMode('select'); setConnectionSourceId(''); setSelectedNodeId(''); setSelectedEdgeId(''); showToast(t.connectionCancelled); }
      }
      if (event.key === '+' || event.key === '=') zoomAtCenter(1.1);
      if (event.key === '-') zoomAtCenter(0.9);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [undo, redo, deleteSelected, fitView, presentMode, togglePresent, zoomAtCenter, showToast, t]);

  const normalizedSearch = searchQuery.trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const matchingNodeIds = useMemo(() => new Set((activeProject?.nodes || []).filter((node) => {
    const typeMatches = typeFilter === 'all' || node.type === typeFilter;
    if (!typeMatches) return false;
    if (!normalizedSearch) return true;
    const haystack = [node.title, node.description, ...(node.tags || [])].join(' ').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    return normalizedSearch.split(/\s+/).filter(Boolean).every((token) => haystack.includes(token));
  }).map((node) => node.id)), [activeProject, typeFilter, normalizedSearch]);

  if (!activeProject) return null;

  return (
    <div ref={pageRef} className={`activity-graph-page ${presentMode ? 'is-presenting' : ''} ${leftOpen ? 'left-open' : ''} ${inspectorOpen ? 'inspector-open' : ''}`}>
      <header className="ag-topbar">
        <div className="ag-brand-block">
          <button type="button" className="ag-back" onClick={() => { window.location.hash = '#/apps'; }} aria-label={language === 'vi' ? 'Quay lại ứng dụng' : 'Back to apps'}>‹</button>
          <div className="ag-mark" aria-hidden="true"><span /><span /><span /></div>
          <div><strong>{t.title}</strong><small>{t.subtitle}</small></div>
        </div>
        <label className="ag-project-title"><span>{t.projectName}</span><input value={activeProject.title} onFocus={captureHistory} onChange={(event) => commitProject((project) => { project.title = event.target.value.slice(0, 120); }, { record: false })} /></label>
        <div className="ag-top-actions">
          <span className="ag-save-state"><i /> {t.saved}</span>
          <IconButton title={t.undo} disabled={!undoStack.length} onClick={undo}>↶</IconButton>
          <IconButton title={t.redo} disabled={!redoStack.length} onClick={redo}>↷</IconButton>
          <button type="button" className="ag-present-button" onClick={togglePresent}>{presentMode ? '×' : '▶'} <span>{presentMode ? t.exitPresent : t.present}</span></button>
        </div>
      </header>

      <div className="ag-mobile-bar">
        <IconButton title={t.openProjects} onClick={() => setLeftOpen((value) => !value)}>☰</IconButton>
        <strong>{activeProject.title}</strong>
        <IconButton title={t.openInspector} onClick={() => setInspectorOpen((value) => !value)}>⚙</IconButton>
      </div>

      <div className="ag-workspace">
        <aside className="ag-sidebar ag-projects-panel">
          <div className="ag-panel-heading"><div><small>BRIAN</small><h2>{t.projects}</h2></div><button type="button" className="ag-close-mobile" onClick={() => setLeftOpen(false)} aria-label={t.close}>×</button></div>
          <button type="button" className="ag-new-project" onClick={() => createProject('blank')}>＋ {t.newProject}</button>
          <div className="ag-project-list">
            {projects.map((project) => <button type="button" key={project.id} className={project.id === activeProject.id ? 'active' : ''} onClick={() => selectProject(project.id)}><span>{project.title.slice(0, 2).toUpperCase()}</span><div><strong>{project.title}</strong><small>{project.nodes.length} {t.nodes} · {project.edges.length} {t.edges}</small></div></button>)}
          </div>
          <div className="ag-sidebar-actions"><button type="button" onClick={duplicateProject}>⧉ {t.duplicate}</button><button type="button" className="danger" onClick={deleteProject}>⌫ {t.remove}</button></div>
          <div className="ag-section-title"><span>{t.templates}</span></div>
          <div className="ag-template-list">
            <button type="button" onClick={() => createProject('blank')}><b>＋</b><span>{t.blank}</span></button>
            <button type="button" onClick={() => createProject('lesson')}><b>→</b><span>{t.lesson}</span></button>
            <button type="button" onClick={() => createProject('vocabulary')}><b>✦</b><span>{t.vocabulary}</span></button>
            <button type="button" onClick={() => createProject('assessment')}><b>✓</b><span>{t.assessment}</span></button>
          </div>
          <div className="ag-section-title"><span>{language === 'vi' ? 'Chú giải' : 'Legend'}</span></div>
          <div className="ag-legend">{Object.entries(NODE_TYPES).map(([key, item]) => <span key={key}><i style={{ background: item.color }} />{language === 'vi' ? item.labelVi : item.label}</span>)}</div>
          <div className="ag-help-card"><strong>{t.helpTitle}</strong><p>{t.helpText}</p><small>{t.keyboard}</small></div>
        </aside>

        <main className="ag-main-stage">
          <div className="ag-stage-toolbar">
            <div className="ag-search-group"><span>⌕</span><input value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} placeholder={t.search} /><select value={typeFilter} onChange={(event) => setTypeFilter(event.target.value)}><option value="all">{t.allTypes}</option>{Object.entries(NODE_TYPES).map(([key, item]) => <option key={key} value={key}>{language === 'vi' ? item.labelVi : item.label}</option>)}</select></div>
            <div className="ag-mode-group">
              <button type="button" className={mode === 'select' ? 'active' : ''} onClick={() => { setMode('select'); setConnectionSourceId(''); }}>↖ <span>{t.select}</span></button>
              <button type="button" className={mode === 'pan' ? 'active' : ''} onClick={() => { setMode('pan'); setConnectionSourceId(''); }}>✋ <span>{t.pan}</span></button>
              <button type="button" className={mode === 'connect' ? 'active' : ''} onClick={() => { setMode('connect'); setConnectionSourceId(''); showToast(t.connectHint); }}>⌁ <span>{t.connect}</span></button>
            </div>
            <div className="ag-menu-wrap">
              <details><summary>＋ {t.add}</summary><div>{Object.entries(NODE_TYPES).map(([key, item]) => <button type="button" key={key} onClick={() => addNode(key)}><i style={{ background: item.color }}>{item.icon}</i>{language === 'vi' ? item.labelVi : item.label}</button>)}</div></details>
              <button type="button" onClick={autoLayout}>▦ <span>{t.autoLayout}</span></button>
              <button type="button" onClick={() => importRef.current?.click()}>⇧ <span>{t.import}</span></button>
              <details><summary>⇩</summary><div><button type="button" onClick={exportJson}>JSON · {t.export}</button><button type="button" onClick={exportSvg}>SVG · {t.exportSvg}</button></div></details>
            </div>
          </div>

          {mode === 'connect' && <div className="ag-connect-banner"><span>{connectionSourceId ? '2' : '1'}</span>{connectionSourceId ? t.sourceChosen : t.connectHint}<button type="button" onClick={() => { setMode('select'); setConnectionSourceId(''); }}>×</button></div>}

          <div
            ref={canvasRef}
            className={`ag-canvas mode-${mode}`}
            onPointerDown={beginCanvasPan}
            onPointerMove={handlePointerMove}
            onPointerUp={endPointer}
            onPointerCancel={endPointer}
            onWheel={handleWheel}
          >
            <div className="ag-world" style={{ width: WORLD_WIDTH, height: WORLD_HEIGHT, transform: `translate(${view.offsetX}px, ${view.offsetY}px) scale(${view.scale})` }}>
              <svg className="ag-edges" width={WORLD_WIDTH} height={WORLD_HEIGHT} viewBox={`0 0 ${WORLD_WIDTH} ${WORLD_HEIGHT}`} aria-label={language === 'vi' ? 'Các đường nối' : 'Connections'}>
                <defs><marker id="ag-arrow" markerWidth="11" markerHeight="11" refX="9" refY="5.5" orient="auto"><path d="M0,0 L11,5.5 L0,11 z" /></marker></defs>
                {activeProject.edges.map((edge) => {
                  const source = activeProject.nodes.find((node) => node.id === edge.source);
                  const target = activeProject.nodes.find((node) => node.id === edge.target);
                  if (!source || !target) return null;
                  const path = edgePath(source, target); const kind = EDGE_KINDS[edge.kind] || EDGE_KINDS.sequence;
                  const dimmed = (normalizedSearch || typeFilter !== 'all') && (!matchingNodeIds.has(source.id) || !matchingNodeIds.has(target.id));
                  return <g key={edge.id} className={`ag-edge ${edge.id === selectedEdgeId ? 'selected' : ''} ${dimmed ? 'dimmed' : ''}`} onClick={(event) => { event.stopPropagation(); setSelectedEdgeId(edge.id); setSelectedNodeId(''); setInspectorOpen(true); }}><path className="ag-edge-visible" d={path} strokeDasharray={kind.dash} markerEnd="url(#ag-arrow)"/><path className="ag-edge-hit" d={path}/>{edge.label && <text><textPath href={`#edge-${edge.id}`} startOffset="50%">{edge.label}</textPath></text>}<path id={`edge-${edge.id}`} d={path} fill="none" stroke="none" /></g>;
                })}
              </svg>

              {activeProject.nodes.map((node) => {
                const type = NODE_TYPES[node.type] || NODE_TYPES.activity;
                const isSelected = node.id === selectedNodeId;
                const isSource = node.id === connectionSourceId;
                const dimmed = (normalizedSearch || typeFilter !== 'all') && !matchingNodeIds.has(node.id);
                return (
                  <article
                    key={node.id}
                    className={`ag-node ${isSelected ? 'selected' : ''} ${isSource ? 'connection-source' : ''} ${dimmed ? 'dimmed' : ''}`}
                    style={{ left: node.x, top: node.y, width: node.width || 230, minHeight: node.height || 126, '--node-color': type.color, '--node-soft': type.soft }}
                    onPointerDown={(event) => beginNodeDrag(event, node)}
                    onDoubleClick={() => { setSelectedNodeId(node.id); setSelectedEdgeId(''); setInspectorOpen(true); }}
                    tabIndex={0}
                    role="button"
                    aria-pressed={isSelected}
                    onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); handleNodeActivate(node.id); } }}
                  >
                    <div className="ag-node-accent" />
                    <header><span>{type.icon}</span><small>{language === 'vi' ? type.labelVi : type.label}</small><i className={`status-${node.status}`} title={t[node.status] || node.status} /></header>
                    <h3>{node.title || (language === 'vi' ? 'Chưa đặt tên' : 'Untitled')}</h3>
                    {node.description && <p>{node.description}</p>}
                    {!!node.tags?.length && <footer>{node.tags.slice(0, 3).map((tag) => <span key={tag}>{tag}</span>)}</footer>}
                    <button type="button" className="ag-node-connector" onPointerDown={(event) => { event.stopPropagation(); }} onClick={(event) => { event.stopPropagation(); setMode('connect'); setConnectionSourceId(node.id); setSelectedNodeId(node.id); showToast(t.sourceChosen); }} aria-label={t.connect}>＋</button>
                  </article>
                );
              })}
            </div>

            {!activeProject.nodes.length && <div className="ag-empty-canvas"><div>⌘</div><h2>{t.empty}</h2><button type="button" onClick={() => addNode('topic')}>＋ {t.add}</button></div>}
            <div className="ag-floating-toolbar"><IconButton title={t.fit} onClick={fitView}>⛶</IconButton><IconButton title={t.resetView} onClick={resetView}>⌂</IconButton><IconButton title={t.autoLayout} onClick={autoLayout}>▦</IconButton></div>
            <div className="ag-zoom-controls"><IconButton title={`${t.zoom} +`} onClick={() => zoomAtCenter(1.12)}>＋</IconButton><span>{Math.round(view.scale * 100)}%</span><IconButton title={`${t.zoom} -`} onClick={() => zoomAtCenter(0.89)}>−</IconButton></div>
            <MiniMap project={activeProject} selectedNodeId={selectedNodeId} onJump={fitView} />
            <div className="ag-canvas-status"><span>{activeProject.nodes.length} {t.nodes}</span><span>{activeProject.edges.length} {t.edges}</span><span>{t.updated}: {new Date(activeProject.updatedAt).toLocaleString(language === 'vi' ? 'vi-VN' : 'en-US', { hour: '2-digit', minute: '2-digit' })}</span></div>
          </div>
        </main>

        <aside className="ag-sidebar ag-inspector-panel">
          <div className="ag-panel-heading"><div><small>BRIAN GRAPH</small><h2>{t.inspector}</h2></div><button type="button" className="ag-close-mobile" onClick={() => setInspectorOpen(false)} aria-label={t.close}>×</button></div>
          {!selectedNode && !selectedEdge && <div className="ag-inspector-empty"><div>◎</div><p>{t.nothingSelected}</p><small>{t.helpText}</small></div>}
          {selectedNode && <div className="ag-inspector-form">
            <div className="ag-inspector-kind"><i style={{ background: NODE_TYPES[selectedNode.type]?.color }} />{t.node}<span>{selectedNode.id.slice(-6)}</span></div>
            <label><span>{t.name}</span><input value={selectedNode.title} onFocus={captureHistory} onChange={(event) => updateNode({ title: event.target.value.slice(0, 140) })} /></label>
            <label><span>{t.description}</span><textarea rows="5" value={selectedNode.description || ''} onFocus={captureHistory} onChange={(event) => updateNode({ description: event.target.value.slice(0, 800) })} /></label>
            <div className="ag-form-grid"><label><span>{t.type}</span><select value={selectedNode.type} onFocus={captureHistory} onChange={(event) => updateNode({ type: event.target.value })}>{Object.entries(NODE_TYPES).map(([key, item]) => <option key={key} value={key}>{language === 'vi' ? item.labelVi : item.label}</option>)}</select></label><label><span>{t.status}</span><select value={selectedNode.status || 'draft'} onFocus={captureHistory} onChange={(event) => updateNode({ status: event.target.value })}><option value="draft">{t.draft}</option><option value="ready">{t.ready}</option><option value="taught">{t.taught}</option><option value="archived">{t.archived}</option></select></label></div>
            <label><span>{t.tags}</span><input value={(selectedNode.tags || []).join(', ')} onFocus={captureHistory} onChange={(event) => updateNode({ tags: event.target.value.split(',').map((tag) => tag.trim()).filter(Boolean).slice(0, 8) })} placeholder="B1, grammar, pair work" /></label>
            <div className="ag-position-readout"><span>X <b>{Math.round(selectedNode.x)}</b></span><span>Y <b>{Math.round(selectedNode.y)}</b></span><span>{selectedNode.width || 230} × {selectedNode.height || 126}</span></div>
            <button type="button" className="ag-danger-button" onClick={deleteSelected}>⌫ {t.deleteNode}</button>
          </div>}
          {selectedEdge && <div className="ag-inspector-form">
            <div className="ag-inspector-kind"><i className="edge-dot" />{t.edge}<span>{selectedEdge.id.slice(-6)}</span></div>
            <label><span>{t.label}</span><input value={selectedEdge.label || ''} onFocus={captureHistory} onChange={(event) => updateEdge({ label: event.target.value.slice(0, 80) })} /></label>
            <label><span>{t.relation}</span><select value={selectedEdge.kind || 'sequence'} onFocus={captureHistory} onChange={(event) => updateEdge({ kind: event.target.value })}>{Object.entries(EDGE_KINDS).map(([key, item]) => <option key={key} value={key}>{language === 'vi' ? item.labelVi : item.label}</option>)}</select></label>
            <div className="ag-edge-summary"><span><small>{t.source}</small><b>{activeProject.nodes.find((node) => node.id === selectedEdge.source)?.title || '—'}</b></span><i>→</i><span><small>{t.target}</small><b>{activeProject.nodes.find((node) => node.id === selectedEdge.target)?.title || '—'}</b></span></div>
            <button type="button" className="ag-danger-button" onClick={deleteSelected}>⌫ {t.deleteEdge}</button>
          </div>}
          <div className="ag-project-meta"><strong>{t.editProject}</strong><label><span>{t.projectDescription}</span><textarea rows="4" value={activeProject.description || ''} onFocus={captureHistory} onChange={(event) => commitProject((project) => { project.description = event.target.value.slice(0, 600); }, { record: false })} /></label><div><span>{t.created}</span><b>{new Date(activeProject.createdAt).toLocaleDateString(language === 'vi' ? 'vi-VN' : 'en-US')}</b></div></div>
        </aside>
      </div>

      <input ref={importRef} type="file" accept="application/json,.json" hidden onChange={importJson} />
      {toast && <div className="ag-toast" role="status">{toast}</div>}
      {(leftOpen || inspectorOpen) && <button type="button" className="ag-mobile-scrim" aria-label={t.close} onClick={() => { setLeftOpen(false); setInspectorOpen(false); }} />}
    </div>
  );
}
