import React, { useMemo, useRef, useState } from 'react';
import {
  clearDashboardDropPacket,
  dashboardDropFileLabel,
  setDashboardDropPacket,
} from '../utils/dashboardDropZone.js';
import './BrianDashboardDropZone.css';

const ACCEPT = [
  '.pdf','.doc','.docx','.ppt','.pptx','.xls','.xlsx','.csv','.txt','.md','.html','.zip',
  '.png','.jpg','.jpeg','.webp','.gif','.mp3','.wav','.m4a','.mp4','.mov',
].join(',');

function extensionOf(name = '') {
  const clean = String(name).toLowerCase().split('?')[0].split('#')[0];
  const dot = clean.lastIndexOf('.');
  return dot >= 0 ? clean.slice(dot + 1) : '';
}

function classifyFiles(files = []) {
  if (files.length > 1) return 'files';
  const file = files[0];
  const ext = extensionOf(file?.name);
  const type = String(file?.type || '').toLowerCase();
  if (type.startsWith('image/') || ['png','jpg','jpeg','webp','gif'].includes(ext)) return 'image';
  if (type.startsWith('audio/') || type.startsWith('video/') || ['mp3','wav','m4a','mp4','mov'].includes(ext)) return 'media';
  if (['xls','xlsx','csv'].includes(ext)) return 'spreadsheet';
  if (['pdf','doc','docx','ppt','pptx','zip'].includes(ext)) return 'document';
  if (['txt','md','html'].includes(ext) || type.startsWith('text/')) return 'text-file';
  return 'file';
}

function packetFromTransfer(transfer) {
  const files = [...(transfer?.files || [])].slice(0, 8);
  if (files.length) {
    return {
      kind: classifyFiles(files),
      files,
      fileMeta: files.map((file) => ({ name: file.name, size: file.size, type: file.type })),
      text: '',
      url: '',
    };
  }
  const uri = String(transfer?.getData?.('text/uri-list') || '').trim().split(/\r?\n/).find((line) => line && !line.startsWith('#')) || '';
  const plain = String(transfer?.getData?.('text/plain') || '').trim();
  if (uri || /^https?:\/\//i.test(plain)) {
    return { kind: 'url', files: [], fileMeta: [], text: plain || uri, url: uri || plain };
  }
  if (plain) return { kind: 'text', files: [], fileMeta: [], text: plain, url: '' };
  return null;
}

function fileSizeLabel(bytes = 0) {
  const value = Number(bytes) || 0;
  if (!value) return '';
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${Math.round(value / 1024)} KB`;
  return `${(value / (1024 * 1024)).toFixed(value > 10 * 1024 * 1024 ? 0 : 1)} MB`;
}

const COPY = {
  vi: {
    eyebrow: 'BRIAN DROP ZONE',
    title: 'Thả vào để xử lý',
    subtitle: 'File, ảnh, văn bản hoặc liên kết — Brian sẽ gợi ý đúng công cụ.',
    choose: 'Chọn file',
    paste: 'Dán văn bản',
    clear: 'Bỏ',
    ready: 'Sẵn sàng xử lý',
    clipboardDenied: 'Không đọc được clipboard. Hãy kéo thả hoặc chọn file.',
    emptyClipboard: 'Clipboard đang trống.',
    textLabel: 'Văn bản từ clipboard',
    urlLabel: 'Liên kết',
    filesLabel: 'tệp',
  },
  en: {
    eyebrow: 'BRIAN DROP ZONE',
    title: 'Drop it here',
    subtitle: 'Files, images, text or links — Brian suggests the right tool.',
    choose: 'Choose files',
    paste: 'Paste text',
    clear: 'Clear',
    ready: 'Ready to process',
    clipboardDenied: 'Clipboard access was blocked. Drag and drop or choose a file instead.',
    emptyClipboard: 'Clipboard is empty.',
    textLabel: 'Clipboard text',
    urlLabel: 'Link',
    filesLabel: 'files',
  },
};

function actionsFor(packet, language) {
  const vi = language === 'vi';
  if (!packet) return [];
  const actions = {
    textcare: { id: 'textcare', label: vi ? 'Chuẩn hóa với TextCare' : 'Normalize in TextCare', note: vi ? 'DOCX · PDF · TXT' : 'DOCX · PDF · TXT' },
    question: { id: 'question-bank', label: vi ? 'Nhập Ngân hàng câu hỏi' : 'Import to Question Bank', note: vi ? 'Phân tích văn bản' : 'Parse text' },
    resource: { id: 'resource-library', label: vi ? 'Lưu Kho học liệu' : 'Save to Resources', note: vi ? 'Tải lên Drive' : 'Upload to Drive' },
    gradebook: { id: 'gradebook', label: vi ? 'Mở Sổ điểm' : 'Open Gradebook', note: vi ? 'CSV · Excel' : 'CSV · Excel' },
    textlab: { id: 'textlab', label: vi ? 'Tạo hoạt động TextLab' : 'Create in TextLab', note: vi ? 'Từ nội dung đã thả' : 'From dropped content' },
    lesson: { id: 'lesson', label: vi ? 'Mở Lesson Architect' : 'Open Lesson Architect', note: vi ? 'Dùng làm học liệu bài dạy' : 'Use as lesson material' },
  };
  switch (packet.kind) {
    case 'text':
    case 'text-file':
      return [actions.question, actions.textcare, actions.textlab, actions.resource];
    case 'document':
      return [actions.textcare, actions.resource, actions.lesson];
    case 'spreadsheet':
      return [actions.gradebook, actions.resource];
    case 'image':
    case 'media':
      return [actions.resource, actions.lesson, actions.textlab];
    case 'url':
      return [actions.resource, actions.textlab];
    case 'files':
      return [actions.resource, actions.textcare];
    default:
      return [actions.resource, actions.textcare];
  }
}

function routeForAction(id) {
  if (id === 'textcare') return '#/tool/textcare';
  if (id === 'question-bank') return '#/assessment-core';
  if (id === 'resource-library') return '#/resource-library';
  if (id === 'gradebook') return '#/tool/gradebook-studio';
  if (id === 'textlab') return '#/tool/textlab-activities';
  if (id === 'lesson') return '#/tool/lesson-plan-ai';
  return '#/apps';
}

export default function BrianDashboardDropZone({ language = 'vi' }) {
  const t = COPY[language] || COPY.vi;
  const inputRef = useRef(null);
  const [dragging, setDragging] = useState(false);
  const [packet, setPacket] = useState(null);
  const [notice, setNotice] = useState('');

  const actions = useMemo(() => actionsFor(packet, language), [packet, language]);

  const acceptPacket = (next) => {
    if (!next) return;
    const enriched = { ...next, createdAt: Date.now(), source: 'dashboard-drop-zone' };
    setPacket(enriched);
    setNotice('');
    setDashboardDropPacket(enriched);
  };

  const handleFiles = (files) => {
    const list = [...(files || [])].filter(Boolean).slice(0, 8);
    if (!list.length) return;
    acceptPacket({
      kind: classifyFiles(list),
      files: list,
      fileMeta: list.map((file) => ({ name: file.name, size: file.size, type: file.type })),
      text: '',
      url: '',
    });
  };

  const pasteClipboard = async () => {
    try {
      const value = String(await navigator.clipboard.readText()).trim();
      if (!value) {
        setNotice(t.emptyClipboard);
        return;
      }
      acceptPacket(/^https?:\/\//i.test(value)
        ? { kind: 'url', files: [], fileMeta: [], text: value, url: value }
        : { kind: 'text', files: [], fileMeta: [], text: value, url: '' });
    } catch {
      setNotice(t.clipboardDenied);
    }
  };

  const launch = (actionId) => {
    if (!packet) return;
    const routed = setDashboardDropPacket({ ...packet, target: actionId, routedAt: Date.now() });
    try {
      if (actionId === 'question-bank' && routed?.text) {
        window.sessionStorage.setItem('bes-dashboard-drop-question-text', routed.text);
      }
      if (actionId === 'resource-library') {
        window.sessionStorage.setItem('bes-resource-library-drop-on-load', routed?.id || '1');
      }
    } catch {
      // Optional routing hints.
    }
    window.location.hash = routeForAction(actionId);
  };

  const clear = () => {
    clearDashboardDropPacket();
    setPacket(null);
    setNotice('');
    if (inputRef.current) inputRef.current.value = '';
  };

  const mainLabel = packet
    ? (dashboardDropFileLabel(packet)
      || (packet.kind === 'url' ? t.urlLabel : t.textLabel))
    : '';

  const secondary = packet
    ? (packet.files?.length
      ? [packet.files.length > 1 ? `${packet.files.length} ${t.filesLabel}` : '', fileSizeLabel(packet.files.reduce((sum, file) => sum + Number(file.size || 0), 0))].filter(Boolean).join(' · ')
      : packet.kind === 'url' ? packet.url : `${packet.text?.length || 0} ký tự`)
    : '';

  return (
    <section
      className={`brian-dashboard-drop-zone${dragging ? ' is-dragging' : ''}${packet ? ' has-packet' : ''}`}
      aria-label={t.title}
      onDragEnter={(event) => {
        event.preventDefault();
        setDragging(true);
      }}
      onDragOver={(event) => {
        event.preventDefault();
        event.dataTransfer.dropEffect = 'copy';
        setDragging(true);
      }}
      onDragLeave={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setDragging(false);
      }}
      onDrop={(event) => {
        event.preventDefault();
        setDragging(false);
        acceptPacket(packetFromTransfer(event.dataTransfer));
      }}
    >
      <input
        ref={inputRef}
        className="brian-drop-input"
        type="file"
        multiple
        hidden
        accept={ACCEPT}
        onChange={(event) => handleFiles(event.target.files)}
      />

      <div className="brian-drop-intro">
        <span className="brian-drop-mark" aria-hidden="true">
          <span>↓</span>
        </span>
        <div className="brian-drop-copy">
          <small>{t.eyebrow}</small>
          <strong>{packet ? t.ready : t.title}</strong>
          <p>{packet ? mainLabel : t.subtitle}</p>
          {packet && secondary ? <em title={secondary}>{secondary}</em> : null}
        </div>
      </div>

      {!packet ? (
        <div className="brian-drop-entry-actions">
          <button type="button" className="is-primary" onClick={() => inputRef.current?.click()}>
            <span aria-hidden="true">＋</span>{t.choose}
          </button>
          <button type="button" onClick={pasteClipboard}>
            <span aria-hidden="true">⌘</span>{t.paste}
          </button>
        </div>
      ) : (
        <div className="brian-drop-recommendations" aria-label={language === 'vi' ? 'Hành động gợi ý' : 'Suggested actions'}>
          {actions.slice(0, 4).map((action, index) => (
            <button
              type="button"
              key={action.id}
              className={index === 0 ? 'is-primary' : ''}
              onClick={() => launch(action.id)}
            >
              <span className="brian-drop-action-icon" aria-hidden="true">{index === 0 ? '✦' : '→'}</span>
              <span><b>{action.label}</b><small>{action.note}</small></span>
            </button>
          ))}
          <button type="button" className="brian-drop-clear" onClick={clear} title={t.clear} aria-label={t.clear}>×</button>
        </div>
      )}

      {notice ? <div className="brian-drop-notice" role="status">{notice}</div> : null}
    </section>
  );
}
