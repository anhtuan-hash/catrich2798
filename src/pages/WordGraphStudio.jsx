import React, { useMemo, useRef, useState } from 'react';
import { AI_TOOL_PRESETS, generateGenericToolOutput } from '../utils/gemini.js';
import { addHistoryEntry, downloadFile, exportAsWord, slugify } from '../utils/library.js';

const GROUP_COLORS = {
  family: '#5b3df5',
  collocations: '#45d3bd',
  meaning: '#ff9a3d',
  examples: '#ff7a96',
  notes: '#5aa7ff',
};

const GROUP_SHORT = {
  family: 'Family',
  collocations: 'Collocations',
  meaning: 'Meaning',
  examples: 'Examples',
  notes: 'Notes',
};

const WORDGRAPH_AI_TEMPLATES = [
  {
    label: 'Word family',
    hint: 'Từ loại · họ từ · ví dụ',
    prompt: 'Tạo sơ đồ WordGraph cho các từ vựng tiếng Anh. Với mỗi từ, hãy tạo các nhánh: Word Family, Collocations, Meaning, Examples và Teaching Note. Ưu tiên ví dụ ngắn, rõ, phù hợp học sinh THPT level B2-C1.',
  },
  {
    label: 'Collocation map',
    hint: 'Cụm từ · pattern · usage',
    prompt: 'Tạo sơ đồ collocation map cho chủ điểm/từ vựng tôi nhập. Với mỗi mục, hãy chia thành: common collocations, verb patterns, adjective/noun phrases, example sentences và classroom practice ideas. Nội dung ngắn gọn để hiển thị đẹp trên mind map.',
  },
  {
    label: 'Reading vocabulary',
    hint: 'Từ trong bài đọc',
    prompt: 'Từ bài đọc hoặc danh sách từ tôi dán bên dưới, hãy chọn các từ quan trọng nhất và tạo WordGraph. Mỗi từ cần có nghĩa trong ngữ cảnh, word family, collocations, ví dụ từ ngữ cảnh và gợi ý kiểm tra nhanh trên lớp.',
  },
  {
    label: 'THPT revision',
    hint: 'Ôn thi · B2-C1',
    prompt: 'Tạo sơ đồ ôn tập từ vựng THPT theo hướng B2-C1. Mỗi nhánh cần giúp học sinh nhớ word form, collocation, synonym/antonym nếu có, ví dụ câu và lỗi thường gặp khi dùng từ.',
  },
];

function cleanMarkdown(value = '') {
  return String(value)
    .replace(/^[-*•]\s*/, '')
    .replace(/^[a-z]\.\s*/i, '')
    .replace(/\*\*/g, '')
    .replace(/[`>#]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function titleCase(value = '') {
  const clean = cleanMarkdown(value).replace(/^\d+[.)]\s*/, '').trim();
  return clean.split(/\s+/).map((part) => part ? part.charAt(0).toUpperCase() + part.slice(1).toLowerCase() : '').join(' ');
}

function extractWords(seed = '') {
  const text = String(seed || '');
  const headingWords = [];
  const headingPattern = /^#{1,4}\s*(?:\d+[.)]?\s*)?([A-Za-z][A-Za-z\s'-]{2,36})\s*$/gm;
  let match;
  while ((match = headingPattern.exec(text))) {
    const candidate = titleCase(match[1]);
    if (!/(word family|collocation|meaning|example|teaching|outline|graph|notes|suggestion)/i.test(candidate)) headingWords.push(candidate);
  }
  if (headingWords.length) return [...new Set(headingWords)].slice(0, 10);

  const afterFor = text.match(/\bfor\s+([^.!?\n]+)/i)?.[1] || text;
  const chunks = afterFor
    .replace(/\band\b/gi, ',')
    .split(/[,,;\n]+/)
    .map((item) => cleanMarkdown(item).replace(/^(create|make|draw|vẽ|tạo|a|an|the|word family graph|mind map|sơ đồ)/i, '').trim())
    .filter((item) => /^[A-Za-z][A-Za-z\s'-]{1,28}$/.test(item))
    .map(titleCase);
  return [...new Set(chunks)].slice(0, 10);
}

function collectSection(block, patterns) {
  const lines = String(block || '').split('\n');
  const items = [];
  let active = false;
  for (const raw of lines) {
    const line = raw.trim();
    if (!line) continue;
    const isHeading = /^#{1,5}\s+/.test(line) || /^[a-z]\.\s+[A-Z]/.test(line);
    if (patterns.some((re) => re.test(line))) {
      active = true;
      const inline = line.split(/[:：]/).slice(1).join(':').trim();
      if (inline) items.push(cleanMarkdown(inline));
      continue;
    }
    if (active && isHeading && !/^[-*•]/.test(line)) break;
    if (active && (/^[-*•]/.test(line) || /^[A-Z][A-Za-z ]+[:：]/.test(line) || /^"/.test(line))) items.push(cleanMarkdown(line));
  }
  return [...new Set(items.filter(Boolean))].slice(0, 5);
}

function findBlocks(text, words) {
  const raw = String(text || '');
  if (!words.length) return [];
  return words.map((word, index) => {
    const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const startPattern = new RegExp(`^#{1,4}\\s*(?:${index + 1}[.)]?\\s*)?${escaped}\\s*$`, 'im');
    const start = raw.search(startPattern);
    if (start < 0) return { word, block: raw };
    const rest = raw.slice(start);
    const next = rest.slice(1).search(/^#{1,4}\s*(?:\d+[.)]?\s*)?[A-Za-z][A-Za-z\s'-]{2,36}\s*$/m);
    return { word, block: next > 0 ? rest.slice(0, next + 1) : rest };
  });
}

function fallbackFamily(word) {
  const lower = String(word || '').toLowerCase();
  return [`Base: ${lower}`, `Noun: ${lower}`, `Adjective: ${lower}`, `Adverb: ${lower}ly`];
}

export function buildWordGraph(rawText = '', instruction = '', sourceText = '') {
  const seed = [rawText, instruction, sourceText].filter(Boolean).join('\n');
  let words = extractWords(rawText);
  if (!words.length) words = extractWords(instruction || sourceText);
  if (!words.length) words = ['Vocabulary'];
  const blocks = findBlocks(rawText || seed, words);
  const clusters = blocks.map(({ word, block }) => {
    const family = collectSection(block, [/word\s*family/i, /family/i]);
    const collocations = collectSection(block, [/collocation/i, /phrase/i]);
    const meaning = collectSection(block, [/meaning/i, /definition/i, /nghĩa/i]);
    const examples = collectSection(block, [/example/i, /sentence/i, /ví dụ/i]);
    const notes = collectSection(block, [/teaching/i, /note/i, /suggestion/i, /gợi ý/i]);

    const roleLines = String(block).split('\n')
      .filter((line) => /(noun|verb|adjective|adverb|word family)\s*[:：]/i.test(line))
      .map(cleanMarkdown);
    const quoted = [...String(block).matchAll(/"([^"]{8,120})"/g)].map((m) => m[1]);

    return {
      word,
      groups: [
        { key: 'family', label: 'Word family', items: (family.length ? family : roleLines.length ? roleLines : fallbackFamily(word)).slice(0, 5) },
        { key: 'collocations', label: 'Collocations', items: (collocations.length ? collocations : [`${word.toLowerCase()} development`, `${word.toLowerCase()} in context`]).slice(0, 5) },
        { key: 'meaning', label: 'Meaning', items: (meaning.length ? meaning : [`Meaning and usage of ${word.toLowerCase()}.`]).slice(0, 3) },
        { key: 'examples', label: 'Examples', items: (examples.length ? examples : quoted.length ? quoted : [`Students use ${word.toLowerCase()} in a clear sentence.`]).slice(0, 3) },
        ...(notes.length ? [{ key: 'notes', label: 'Teaching note', items: notes.slice(0, 2) }] : []),
      ],
    };
  });

  return { title: 'Word Family Mind Map', clusters };
}

function wrapText(text, max = 30, limit = 4) {
  const words = String(text || '').split(/\s+/).filter(Boolean);
  const lines = [];
  let current = '';
  for (const word of words) {
    if ((current + ' ' + word).trim().length > max && current) {
      lines.push(current);
      current = word;
    } else {
      current = (current + ' ' + word).trim();
    }
  }
  if (current) lines.push(current);
  return lines.slice(0, limit);
}

function makeId(...parts) {
  return parts.join('-').replace(/[^A-Za-z0-9_-]/g, '_');
}

function applyOverrides(point, id, customPositions) {
  return customPositions[id] ? { ...point, ...customPositions[id] } : point;
}

function buildLayout(graph, mode, customPositions) {
  const clusters = graph.clusters || [];
  const groupW = mode === 'tree' ? 240 : 230;
  const groupH = 138;
  const wordR = 62;

  if (mode === 'tree') {
    const rowGap = 300;
    const top = 185;
    const width = 1860;
    const height = Math.max(760, top + clusters.length * rowGap + 120);
    const rootId = 'root';
    const rootBase = { id: rootId, x: 115, y: Math.max(360, height / 2), r: 76 };
    const root = applyOverrides(rootBase, rootId, customPositions);

    const wordNodes = clusters.map((cluster, index) => {
      const id = makeId('word', index, cluster.word);
      return applyOverrides({ id, clusterIndex: index, cluster, x: 330, y: top + index * rowGap, r: wordR, color: index % 2 ? '#45d3bd' : '#5b3df5' }, id, customPositions);
    });

    const groupNodes = [];
    const xStart = 590;
    const xGap = 286;
    clusters.forEach((cluster, index) => {
      const y = top + index * rowGap;
      cluster.groups.forEach((group, groupIndex) => {
        const id = makeId('group', index, group.key);
        const node = applyOverrides({
          id,
          clusterIndex: index,
          groupIndex,
          group,
          x: xStart + groupIndex * xGap,
          y,
          w: groupW,
          h: group.key === 'notes' ? 118 : groupH,
          color: GROUP_COLORS[group.key] || '#5aa7ff',
        }, id, customPositions);
        groupNodes.push(node);
      });
    });
    return { width, height, root, wordNodes, groupNodes, groupW, groupH };
  }

  const width = Math.max(1600, clusters.length * 260 + 860);
  const height = Math.max(1150, clusters.length * 240 + 360);
  const rootId = 'root';
  const rootBase = { id: rootId, x: width / 2, y: height / 2, r: 88 };
  const root = applyOverrides(rootBase, rootId, customPositions);
  const radius = Math.min(Math.max(360, clusters.length * 92), Math.min(width, height) * 0.36);
  const branchRadius = 245;

  const wordNodes = clusters.map((cluster, index) => {
    const angle = -Math.PI / 2 + (index / Math.max(1, clusters.length)) * Math.PI * 2;
    const id = makeId('word', index, cluster.word);
    return applyOverrides({ id, angle, clusterIndex: index, cluster, x: rootBase.x + Math.cos(angle) * radius, y: rootBase.y + Math.sin(angle) * radius, r: wordR, color: index % 2 ? '#45d3bd' : '#5b3df5' }, id, customPositions);
  });

  const groupNodes = [];
  clusters.forEach((cluster, index) => {
    const word = wordNodes[index];
    const baseAngle = word.angle ?? (-Math.PI / 2 + (index / Math.max(1, clusters.length)) * Math.PI * 2);
    const outerAngle = baseAngle;
    const perpendicular = outerAngle + Math.PI / 2;
    const side = Math.cos(outerAngle) >= 0 ? 1 : -1;
    const stackGap = 154;
    const startOffset = -((cluster.groups.length - 1) * stackGap) / 2;
    cluster.groups.forEach((group, groupIndex) => {
      const id = makeId('group', index, group.key);
      const outwardX = Math.cos(outerAngle) * branchRadius;
      const outwardY = Math.sin(outerAngle) * branchRadius;
      const stackX = Math.cos(perpendicular) * (startOffset + groupIndex * stackGap) * side;
      const stackY = Math.sin(perpendicular) * (startOffset + groupIndex * stackGap) * side;
      const node = applyOverrides({
        id,
        clusterIndex: index,
        groupIndex,
        group,
        x: word.x + outwardX + stackX,
        y: word.y + outwardY + stackY,
        w: groupW,
        h: group.key === 'notes' ? 118 : groupH,
        color: GROUP_COLORS[group.key] || '#5aa7ff',
      }, id, customPositions);
      groupNodes.push(node);
    });
  });

  return { width, height, root, wordNodes, groupNodes, groupW, groupH };
}

function smoothPath(from, to) {
  const midX = (from.x + to.x) / 2;
  return `M ${from.x} ${from.y} C ${midX} ${from.y}, ${midX} ${to.y}, ${to.x} ${to.y}`;
}

function nodeBox({ node, onStartDrag, editable }) {
  const { x, y, w, h, color, group } = node;
  const title = group.label || GROUP_SHORT[group.key] || 'Node';
  const items = group.items || [];
  return (
    <g
      key={node.id}
      className={`graph-node draggable-node ${editable ? 'can-drag' : 'locked'}`}
      transform={`translate(${x - w / 2},${y - h / 2})`}
      onPointerDown={(event) => editable && onStartDrag(event, node.id, { x, y })}
    >
      <rect width={w} height={h} rx="20" fill="white" stroke={color} strokeWidth="2" />
      <rect width={w} height="34" rx="20" fill={color} opacity=".12" />
      <circle cx={w - 21} cy="17" r="6" fill={color} opacity=".36" />
      <text x="16" y="23" fill={color} fontWeight="900" fontSize="14">{title}</text>
      {items.slice(0, 3).flatMap((item, idx) => wrapText(item, 32, 2).map((line, lineIndex) => (
        <text key={`${idx}-${lineIndex}`} x="16" y={54 + idx * 35 + lineIndex * 15} fill="#334155" fontSize="12" fontWeight="650">{line}</text>
      )))}
    </g>
  );
}

function WordGraphSvg({ graph, mode = 'tree', svgRef, customPositions, setCustomPositions, editable = true }) {
  const dragRef = useRef(null);
  const layout = useMemo(() => buildLayout(graph, mode, customPositions), [graph, mode, customPositions]);
  const wordsByIndex = useMemo(() => new Map(layout.wordNodes.map((node) => [node.clusterIndex, node])), [layout.wordNodes]);

  const toSvgPoint = (event) => {
    const svg = svgRef.current;
    if (!svg) return { x: event.clientX, y: event.clientY };
    const point = svg.createSVGPoint();
    point.x = event.clientX;
    point.y = event.clientY;
    const converted = point.matrixTransform(svg.getScreenCTM().inverse());
    return { x: converted.x, y: converted.y };
  };

  const onStartDrag = (event, id, base) => {
    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.setPointerCapture?.(event.pointerId);
    dragRef.current = { id, start: toSvgPoint(event), base };
  };

  const onPointerMove = (event) => {
    if (!dragRef.current || !editable) return;
    const current = toSvgPoint(event);
    const { id, start, base } = dragRef.current;
    const next = { x: Math.round(base.x + current.x - start.x), y: Math.round(base.y + current.y - start.y) };
    setCustomPositions((prev) => ({ ...prev, [id]: next }));
  };

  const endDrag = () => {
    dragRef.current = null;
  };

  return (
    <svg
      ref={svgRef}
      className={`wordgraph-svg ${editable ? 'editable-map' : 'locked-map'}`}
      viewBox={`0 0 ${layout.width} ${layout.height}`}
      role="img"
      aria-label="Word family mind map"
      onPointerMove={onPointerMove}
      onPointerUp={endDrag}
      onPointerLeave={endDrag}
    >
      <defs>
        <filter id="wgShadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="12" stdDeviation="12" floodColor="#5b3df5" floodOpacity="0.12" />
        </filter>
        <linearGradient id="wgCenter" x1="0" x2="1">
          <stop offset="0" stopColor="#5b3df5" />
          <stop offset="1" stopColor="#45d3bd" />
        </linearGradient>
        <pattern id="wgGrid" width="40" height="40" patternUnits="userSpaceOnUse">
          <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#dbeafe" strokeWidth="1" opacity=".46" />
        </pattern>
      </defs>

      <rect x="0" y="0" width={layout.width} height={layout.height} rx="34" fill="#f8fbff" />
      <rect x="0" y="0" width={layout.width} height={layout.height} rx="34" fill="url(#wgGrid)" />

      {layout.wordNodes.map((word) => (
        <path key={`root-path-${word.id}`} d={smoothPath(layout.root, word)} fill="none" stroke="#9bb4d2" strokeWidth="3" opacity=".58" />
      ))}
      {layout.groupNodes.map((group) => {
        const word = wordsByIndex.get(group.clusterIndex);
        if (!word) return null;
        return <path key={`group-path-${group.id}`} d={smoothPath(word, group)} fill="none" stroke={group.color} strokeWidth="2.4" opacity=".56" />;
      })}

      <g
        className={`word-root-node draggable-node ${editable ? 'can-drag' : 'locked'}`}
        onPointerDown={(event) => editable && onStartDrag(event, layout.root.id, { x: layout.root.x, y: layout.root.y })}
      >
        <circle cx={layout.root.x} cy={layout.root.y} r={layout.root.r} fill="url(#wgCenter)" opacity=".98" filter="url(#wgShadow)" />
        <text x={layout.root.x} y={layout.root.y - 10} textAnchor="middle" fill="white" fontSize="25" fontWeight="900">WordGraph</text>
        <text x={layout.root.x} y={layout.root.y + 22} textAnchor="middle" fill="white" fontSize="14" fontWeight="750">drag • arrange • export</text>
      </g>

      {layout.wordNodes.map((word) => (
        <g
          key={word.id}
          className={`word-main-node draggable-node ${editable ? 'can-drag' : 'locked'}`}
          onPointerDown={(event) => editable && onStartDrag(event, word.id, { x: word.x, y: word.y })}
        >
          <circle cx={word.x} cy={word.y} r={word.r} fill={word.color} filter="url(#wgShadow)" />
          {wrapText(word.cluster.word, 12, 2).map((line, index, arr) => (
            <text key={line} x={word.x} y={word.y + (index - (arr.length - 1) / 2) * 18 + 5} textAnchor="middle" fill="white" fontSize="17" fontWeight="900">{line}</text>
          ))}
        </g>
      ))}

      {layout.groupNodes.map((group) => nodeBox({ key: group.id, node: group, onStartDrag, editable }))}
    </svg>
  );
}

function buildMermaid(graph) {
  const lines = ['mindmap', '  root((WordGraph))'];
  for (const cluster of graph.clusters || []) {
    lines.push(`    ${cluster.word}`);
    for (const group of cluster.groups || []) {
      lines.push(`      ${group.label}`);
      for (const item of (group.items || []).slice(0, 4)) lines.push(`        ${cleanMarkdown(item).replace(/[()]/g, '')}`);
    }
  }
  return lines.join('\n');
}

function buildStandaloneHtml(title, svg, outline) {
  const safeTitle = String(title || 'WordGraph').replace(/[&<>"]/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch]));
  const safeOutline = String(outline || '').replace(/[&<>]/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[ch]));
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${safeTitle}</title><style>body{margin:0;background:#eef6ff;font-family:Inter,Arial,sans-serif;color:#0f172a}.wrap{max-width:1440px;margin:24px auto;padding:24px}.card{background:#fff;border-radius:0;box-shadow:none;padding:24px;overflow:auto}svg{width:100%;height:auto;min-width:1100px}pre{white-space:pre-wrap;background:#eef4ff;border-radius:0;padding:18px;line-height:1.55}</style></head><body><main class="wrap"><section class="card"><h1>${safeTitle}</h1>${svg}</section><section class="card" style="margin-top:18px"><h2>Outline</h2><pre>${safeOutline}</pre></section></main></body></html>`;
}

export default function WordGraphStudio({ tool, language, apiKey, aiModel, hasApiKey }) {
  const preset = AI_TOOL_PRESETS.word2graph;
  const [instruction, setInstruction] = useState(preset.defaultInstruction);
  const [sourceText, setSourceText] = useState('');
  const [level, setLevel] = useState('B2-C1');
  const [itemCount, setItemCount] = useState(10);
  const [output, setOutput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [mode, setMode] = useState('tree');
  const [zoom, setZoom] = useState(100);
  const [customPositions, setCustomPositions] = useState({});
  const [dragEnabled, setDragEnabled] = useState(true);
  const [activeWorkflow, setActiveWorkflow] = useState('create');
  const svgRef = useRef(null);
  const aiPanelRef = useRef(null);
  const canvasRef = useRef(null);
  const outlineRef = useRef(null);

  const toolTitle = language === 'vi' ? tool.titleVi || tool.title : tool.title;
  const graph = useMemo(() => buildWordGraph(output, instruction, sourceText), [output, instruction, sourceText]);

  const scrollToRef = (ref) => ref.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });

  const workflowCards = [
    { id: 'create', icon: '🧠', tone: 'mint', badge: language === 'vi' ? 'AI tạo' : 'AI build', title: language === 'vi' ? 'Ô AI tạo sơ đồ' : 'AI map maker', desc: language === 'vi' ? 'Nhập yêu cầu và tạo sơ đồ bằng AI.' : 'Prompt the AI and generate a visual map.', cta: language === 'vi' ? 'Tạo sơ đồ' : 'Generate', action: () => { setActiveWorkflow('create'); scrollToRef(aiPanelRef); } },
    { id: 'layout', icon: '🕸️', tone: 'sky', badge: language === 'vi' ? 'Sơ đồ' : 'Layout', title: language === 'vi' ? 'Sơ đồ tương tác' : 'Interactive map', desc: language === 'vi' ? 'Kéo node, đổi layout và xuất ảnh.' : 'Drag nodes, switch layout modes, and export.', cta: language === 'vi' ? 'Xem sơ đồ' : 'Open map', action: () => { setActiveWorkflow('layout'); scrollToRef(canvasRef); } },
    { id: 'outline', icon: '📝', tone: 'peach', badge: language === 'vi' ? 'Nội dung' : 'Outline', title: language === 'vi' ? 'Outline có thể sửa' : 'Editable outline', desc: language === 'vi' ? 'Sửa nội dung trước khi vẽ lại sơ đồ.' : 'Edit the outline directly before redrawing.', cta: language === 'vi' ? 'Mở outline' : 'Edit outline', action: () => { setActiveWorkflow('outline'); scrollToRef(outlineRef); } },
  ];

  const applyPromptTemplate = (template) => {
    setInstruction(template.prompt);
    setOutput('');
    setCustomPositions({});
  };

  const clearWorkspace = () => {
    setInstruction(preset.defaultInstruction);
    setSourceText('');
    setOutput('');
    setError('');
    setCustomPositions({});
  };

  const resetLayout = (nextMode = mode) => {
    setMode(nextMode);
    setCustomPositions({});
  };

  const generate = async () => {
    setError('');
    if (!hasApiKey) {
      setError(language === 'vi' ? 'Chưa có AI provider. Vào Cài đặt để nhập API key.' : 'Missing AI provider. Add an API key in Settings.');
      return;
    }
    setLoading(true);
    try {
      const result = await generateGenericToolOutput({
        apiKey,
        model: aiModel,
        slug: 'word2graph',
        instruction: `${instruction}\n\nReturn clear sections for each word: Word Family, Collocations, Meaning, Examples, Teaching Note. Keep items short so they fit inside a visual mind map.`,
        sourceText,
        level,
        itemCount,
        language,
      });
      setOutput(result);
      setCustomPositions({});
      setMode('tree');
      addHistoryEntry({
        toolSlug: 'word2graph',
        toolTitle,
        title: `${toolTitle}: ${instruction.slice(0, 54)}`,
        content: result,
        tags: ['wordgraph', level],
      });
    } catch (err) {
      setError(err.message || String(err));
    } finally {
      setLoading(false);
    }
  };

  const downloadSvg = () => {
    const svg = svgRef.current?.outerHTML || '';
    downloadFile(`${slugify(toolTitle)}.svg`, `<?xml version="1.0" encoding="UTF-8"?>\n${svg}`, 'image/svg+xml;charset=utf-8');
  };

  const downloadPng = () => {
    const svg = svgRef.current?.outerHTML || '';
    if (!svg) return;
    const img = new Image();
    const blob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = 2200;
      canvas.height = Math.round(2200 * (img.height / img.width || 0.62));
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = '#f8fbff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      canvas.toBlob((png) => {
        if (!png) return;
        const pngUrl = URL.createObjectURL(png);
        const a = document.createElement('a');
        a.href = pngUrl;
        a.download = `${slugify(toolTitle)}.png`;
        a.click();
        URL.revokeObjectURL(pngUrl);
      });
    };
    img.src = url;
  };

  const downloadHtml = () => {
    const svg = svgRef.current?.outerHTML || '';
    downloadFile(`${slugify(toolTitle)}-interactive-map.html`, buildStandaloneHtml(toolTitle, svg, output || buildMermaid(graph)), 'text/html;charset=utf-8');
  };

  const openFullscreen = () => {
    const svg = svgRef.current?.outerHTML || '';
    const html = buildStandaloneHtml(toolTitle, svg, output || buildMermaid(graph));
    const win = window.open('', '_blank', 'noopener,noreferrer');
    if (win) {
      win.document.write(html);
      win.document.close();
    }
  };

  return (
    <div className="page tool-page wordgraph-page wordgraph-v29-page">
      <button className="back-btn wordgraph-v29-back" onClick={() => window.history.back()}>← {language === 'vi' ? 'Quay lại' : 'Back'}</button>
      <section className="tool-hero panel wordgraph-hero wordgraph-v29-hero">
        <div className="wordgraph-v29-hero-art" aria-hidden="true">
          <div className="wordgraph-v29-node center">WORD</div>
          <div className="wordgraph-v29-node node-a">Family</div>
          <div className="wordgraph-v29-node node-b">Meaning</div>
          <div className="wordgraph-v29-node node-c">Example</div>
          <div className="wordgraph-v29-node node-d">Collocation</div>
          <div className="wordgraph-v29-link link-a"></div>
          <div className="wordgraph-v29-link link-b"></div>
          <div className="wordgraph-v29-link link-c"></div>
          <div className="wordgraph-v29-link link-d"></div>
        </div>
        <div className="wordgraph-v29-hero-copy">
          <span className="wordgraph-v29-tag">V1.0 · Drag & Auto Layout</span>
          <h1><span>{tool.icon}</span> {toolTitle}</h1>
          <p>{language === 'vi' ? 'Tự tối ưu bố cục, không đè chữ và có thể kéo thả từng node trước khi xuất file.' : 'Auto-optimized layout with draggable nodes before export.'}</p>
          <div className="wordgraph-v29-badges">
            <span>{language === 'vi' ? 'Mind map kéo thả' : 'Drag-and-drop mind map'}</span>
            <span>{language === 'vi' ? 'Auto layout' : 'Auto layout'}</span>
            <span>{language === 'vi' ? 'Xuất SVG / PNG / HTML' : 'Export SVG / PNG / HTML'}</span>
          </div>
        </div>
        <div className="wordgraph-v29-state-grid">
          <div className="wordgraph-v29-state-card"><strong>{language === 'vi' ? 'AI sẵn sàng' : 'AI ready'}</strong><small>{hasApiKey ? 'API connected' : 'No API key'}</small></div>
          <div className="wordgraph-v29-state-card"><strong>{mode === 'tree' ? 'Auto layout' : 'Radial map'}</strong><small>{language === 'vi' ? 'Chế độ sơ đồ' : 'Map mode'}</small></div>
          <div className="wordgraph-v29-state-card"><strong>{dragEnabled ? (language === 'vi' ? 'Kéo bật' : 'Drag on') : (language === 'vi' ? 'Kéo tắt' : 'Drag off')}</strong><small>{language === 'vi' ? 'Tương tác node' : 'Node interaction'}</small></div>
          <div className="wordgraph-v29-state-card"><strong>{graph.nodes.length}</strong><small>{language === 'vi' ? 'Node hiển thị' : 'Visible nodes'}</small></div>
        </div>
      </section>

      <section className="wordgraph-v29-flow-grid">
        {workflowCards.map((card) => (
          <article key={card.id} className={`panel wordgraph-v29-flow-card ${card.tone} ${activeWorkflow === card.id ? 'active' : ''}`}>
            <div className="wordgraph-v29-flow-icon">{card.icon}</div>
            <div className="wordgraph-v29-flow-copy">
              <span>{card.badge}</span>
              <strong>{card.title}</strong>
              <p>{card.desc}</p>
            </div>
            <button type="button" className="wordgraph-v29-flow-cta" onClick={card.action}>{card.cta} →</button>
          </article>
        ))}
      </section>

      <section className="wordgraph-ai-workspace wordgraph-v29-workspace">
        <article ref={aiPanelRef} className="panel wordgraph-ai-panel wordgraph-v29-ai-panel">
          <div className="wordgraph-step-title">
            <span>1</span>
            <div>
              <p className="eyebrow">AI Content Maker</p>
              <h2>{language === 'vi' ? 'Ô AI tạo sơ đồ' : 'AI map maker'}</h2>
              <p>{language === 'vi' ? 'Nhập yêu cầu, chọn prompt mẫu nếu cần, rồi bấm AI tạo. Nội dung tạo ra sẽ tự chuyển thành sơ đồ.' : 'Type your request, optionally use a prompt preset, then generate the map with AI.'}</p>
            </div>
          </div>

          <label>{language === 'vi' ? 'Yêu cầu AI' : 'AI request'}</label>
          <textarea
            className="wordgraph-ai-textarea"
            rows={8}
            value={instruction}
            onChange={(e) => setInstruction(e.target.value)}
            placeholder={language === 'vi' ? 'Ví dụ: Tạo sơ đồ word family cho chủ điểm volunteering, gồm word form, collocation, nghĩa, ví dụ và teaching note...' : 'Example: Create a word family map for volunteering vocabulary with word forms, collocations, meanings, examples and teaching notes...'}
          />

          <div className="wordgraph-prompt-bank" aria-label="WordGraph prompt templates">
            {WORDGRAPH_AI_TEMPLATES.map((template) => (
              <button
                key={template.label}
                type="button"
                className={instruction === template.prompt ? 'active' : ''}
                onClick={() => applyPromptTemplate(template)}
              >
                <strong>{template.label}</strong>
                <span>{template.hint}</span>
              </button>
            ))}
          </div>

          <div className="wordgraph-option-grid">
            <div>
              <label>Level</label>
              <select value={level} onChange={(e) => setLevel(e.target.value)}>
                <option>A2-B1</option>
                <option>B1-B2</option>
                <option>B2-C1</option>
                <option>C1</option>
              </select>
            </div>
            <div>
              <label>{language === 'vi' ? 'Quy mô sơ đồ' : 'Map size'}</label>
              <select value={itemCount} onChange={(e) => setItemCount(Number(e.target.value))}>
                <option value={6}>{language === 'vi' ? 'Gọn · 6 nhánh' : 'Compact · 6 branches'}</option>
                <option value={10}>{language === 'vi' ? 'Vừa · 10 nhánh' : 'Balanced · 10 branches'}</option>
                <option value={14}>{language === 'vi' ? 'Rộng · 14 nhánh' : 'Extended · 14 branches'}</option>
              </select>
            </div>
          </div>

          <label>{language === 'vi' ? 'Nguồn từ vựng / bài đọc / ghi chú thêm' : 'Vocabulary list / reading passage / extra notes'}</label>
          <textarea
            className="wordgraph-source-text"
            rows={7}
            value={sourceText}
            onChange={(e) => setSourceText(e.target.value)}
            placeholder={language === 'vi' ? 'Có thể dán danh sách từ, bài đọc, hoặc yêu cầu chi tiết ở đây. Nếu để trống, AI sẽ dựa vào yêu cầu phía trên.' : 'Paste a vocabulary list, a reading passage or extra requirements here. Leave blank to use the AI request only.'}
          />

          <div className="wordgraph-ai-actions">
            <button className="primary wordgraph-ai-generate" onClick={generate} disabled={loading}>
              {loading ? (language === 'vi' ? 'Đang tạo bằng AI...' : 'Generating with AI...') : (language === 'vi' ? '✨ AI tạo sơ đồ' : '✨ Generate with AI')}
            </button>
            <button className="secondary" onClick={clearWorkspace}>{language === 'vi' ? 'Làm mới' : 'Reset'}</button>
          </div>
          <button className="ghost full-width" onClick={() => { setOutput(''); setCustomPositions({}); }}>
            {language === 'vi' ? 'Vẽ nhanh từ nội dung đang nhập, không gọi AI' : 'Draw quickly from current input without AI'}
          </button>
          {!hasApiKey && <button className="secondary full-width" onClick={() => (window.location.hash = '#/settings')}>{language === 'vi' ? 'Nhập API key để dùng AI' : 'Add API key to use AI'}</button>}
          {error && <p className="error-box">⚠️ {error}</p>}
        </article>

        <article ref={canvasRef} className="panel preview-panel wordgraph-canvas-panel wordgraph-main-result wordgraph-v29-canvas-panel">
          <div className="preview-head wordgraph-result-head">
            <div>
              <span className="eyebrow">2. {language === 'vi' ? 'Sơ đồ tư duy' : 'Mind map'}</span>
              <h2>{graph.title}</h2>
              <p className="wordgraph-help">{language === 'vi' ? 'Kéo node để chỉnh vị trí. Dùng “Tự sắp xếp” nếu sơ đồ bị rối trước khi xuất file.' : 'Drag nodes to adjust. Use “Auto arrange” before export if the map looks crowded.'}</p>
            </div>
            <div className="preview-actions wrap-actions wordgraph-toolbar">
              <button onClick={() => resetLayout('tree')}>{language === 'vi' ? 'Tự sắp xếp' : 'Auto arrange'}</button>
              <button onClick={() => resetLayout(mode === 'tree' ? 'radial' : 'tree')}>{mode === 'tree' ? 'Radial' : 'Tree'}</button>
              <button className={dragEnabled ? 'primary' : ''} onClick={() => setDragEnabled(!dragEnabled)}>{dragEnabled ? (language === 'vi' ? 'Kéo: bật' : 'Drag: on') : (language === 'vi' ? 'Kéo: tắt' : 'Drag: off')}</button>
              <button onClick={() => setZoom(Math.max(55, zoom - 10))}>−</button>
              <button onClick={() => setZoom(Math.min(180, zoom + 10))}>＋</button>
              <button onClick={openFullscreen}>{language === 'vi' ? 'Toàn màn hình' : 'Fullscreen'}</button>
              <button onClick={downloadSvg}>SVG</button>
              <button onClick={downloadPng}>PNG</button>
              <button onClick={downloadHtml}>HTML</button>
              <button onClick={() => downloadFile(`${slugify(toolTitle)}-mermaid.mmd`, buildMermaid(graph))}>Mermaid</button>
            </div>
          </div>
          <div className="wordgraph-scroll">
            <div className="wordgraph-zoom" style={{ width: `${zoom}%` }}>
              <WordGraphSvg graph={graph} mode={mode} svgRef={svgRef} customPositions={customPositions} setCustomPositions={setCustomPositions} editable={dragEnabled} />
            </div>
          </div>
        </article>
      </section>

      <section ref={outlineRef} className="panel preview-panel wordgraph-outline-panel wordgraph-v29-outline-panel">
        <div className="preview-head">
          <div>
            <span className="eyebrow">3. Outline</span>
            <h2>{language === 'vi' ? 'Nội dung AI / nội dung có thể chỉnh' : 'AI outline / editable content'}</h2>
          </div>
          <div className="preview-actions wrap-actions">
            <button onClick={() => navigator.clipboard?.writeText(output || buildMermaid(graph))}>Copy</button>
            <button onClick={() => downloadFile(`${slugify(toolTitle)}.txt`, output || buildMermaid(graph))}>TXT</button>
            <button onClick={() => exportAsWord(toolTitle, output || buildMermaid(graph))}>Word .doc</button>
          </div>
        </div>
        <textarea className="wordgraph-outline-editor" rows={14} value={output} onChange={(e) => { setOutput(e.target.value); setCustomPositions({}); }} placeholder={language === 'vi' ? 'Sau khi tạo bằng AI, nội dung outline sẽ hiện ở đây. Bạn cũng có thể dán outline rồi hệ thống tự vẽ sơ đồ.' : 'AI outline appears here. You can also paste an outline and the app will draw a map.'} />
      </section>
    </div>
  );
}
