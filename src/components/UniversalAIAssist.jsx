import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { runAITask } from '../utils/aiTaskRuntime.js';
import { readDocxTextFromBuffer, readPdfTextFromBuffer } from '../utils/documentParsers.js';
import { spreadsheetToTextSafe } from '../utils/safeSpreadsheet.js';
import { buildAiActionSuggestions, executeAiAction, prepareAiAction } from '../utils/aiActions.js';
import { createSpeechRecognition, speechRecognitionMessage } from '../utils/mediaCapture.js';

const ROUTE_LABELS = {
  home: { title: 'Brian English Studio', titleVi: 'Brian English Studio', taskVi: 'Hỗ trợ nhanh các công việc dạy học, quản lý lớp và điều hành tổ chuyên môn.', task: 'Support teaching, classroom management and department leadership tasks.' },
  apps: { title: 'Apps Hub', titleVi: 'Trung tâm ứng dụng', taskVi: 'Gợi ý ứng dụng phù hợp và xây dựng quy trình làm việc giữa các công cụ.', task: 'Recommend the right app and build workflows across tools.' },
  news: { title: 'Newsroom', titleVi: 'Ứng dụng đọc báo', taskVi: 'Tóm tắt bài báo, giải thích từ khó, tạo câu hỏi đọc hiểu và biến bài báo thành học liệu.', task: 'Summarize articles, explain vocabulary, create reading tasks and turn news into lessons.' },
  games: { title: 'Games Hub', titleVi: 'Trung tâm trò chơi', taskVi: 'Tạo câu hỏi, luật chơi, power-up và hoạt động chữa bài sau trò chơi.', task: 'Create questions, rules, power-ups and post-game review activities.' },
  tools: { title: 'Tools Hub', titleVi: 'Trung tâm công cụ', taskVi: 'Gợi ý công cụ, tạo dữ liệu đầu vào và định dạng kết quả xuất.', task: 'Recommend tools, create source content and format outputs.' },
  department: { title: 'TTCM Workspace', titleVi: 'Không gian TTCM', taskVi: 'Soạn kế hoạch, thông báo, báo cáo, biên bản và phân công nhiệm vụ tổ.', task: 'Draft plans, notices, reports, minutes and department task assignments.' },
  homeroom: { title: 'Homeroom', titleVi: 'Công tác chủ nhiệm', taskVi: 'Hỗ trợ thông báo phụ huynh, nhận xét học sinh, kế hoạch chủ nhiệm và tổng hợp rèn luyện.', task: 'Support parent notices, student feedback, homeroom planning and conduct summaries.' },
  resources: { title: 'Resources', titleVi: 'Tài nguyên', taskVi: 'Tìm ý tưởng sử dụng tài nguyên, xây dựng hoạt động và chuyển tài liệu thành học liệu.', task: 'Suggest resource uses, classroom activities and teaching-material transformations.' },
  library: { title: 'Library', titleVi: 'Thư viện', taskVi: 'Tóm tắt, phân loại, đặt tên và tái sử dụng học liệu đã lưu.', task: 'Summarize, tag, rename and reuse saved teaching content.' },
  'resource-library': { title: 'Resource Library', titleVi: 'Kho học liệu tổ chuyên môn', taskVi: 'Gợi ý cấu trúc thư mục, mô tả tài liệu, bộ từ khóa và cách tái sử dụng học liệu.', task: 'Suggest folder structures, file descriptions, tags and reuse workflows.' },
  practice: { title: 'Practice', titleVi: 'Luyện tập', taskVi: 'Tạo bài luyện, phản hồi lỗi sai và bài ôn cá nhân hóa.', task: 'Create practice sets, error feedback and personalized remedial tasks.' },
  admin: { title: 'Admin', titleVi: 'Quản trị', taskVi: 'Hỗ trợ viết thông báo, mô tả quyền và quy trình vận hành hệ thống.', task: 'Draft admin notices, permission descriptions and operating workflows.' },
  settings: { title: 'Settings', titleVi: 'Thiết lập', taskVi: 'Gợi ý cấu hình AI, hiệu năng và cách sử dụng công cụ trong lớp.', task: 'Suggest AI, performance and classroom-use configurations.' },
};

const SVG = {
  chat: <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3.25c-5.1 0-9.25 3.65-9.25 8.15 0 2.55 1.35 4.82 3.46 6.31l-.72 3.05 3.46-1.72c.95.3 1.98.47 3.05.47 5.1 0 9.25-3.65 9.25-8.11S17.1 3.25 12 3.25Z" fill="currentColor"/><path d="m7.25 13.22 3.05-3.27 2.05 1.78 4.4-3.05-3.06 3.28-2.03-1.79-4.41 3.05Z" fill="white"/></svg>,
  send: <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m3.6 4.1 17.1 7.1c.72.3.72 1.32 0 1.62L3.6 19.9c-.65.27-1.31-.34-1.1-1.01l1.63-5.2 8.18-1.68-8.18-1.7-1.63-5.2c-.21-.67.45-1.28 1.1-1.01Z" fill="currentColor"/></svg>,
  sparkle: <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2.5c.68 3.42 2.58 5.32 6 6-3.42.68-5.32 2.58-6 6-.68-3.42-2.58-5.32-6-6 3.42-.68 5.32-2.58 6-6Zm6.7 11.1c.34 1.72 1.29 2.67 3 3-1.71.34-2.66 1.29-3 3-.34-1.71-1.29-2.66-3-3 1.71-.33 2.66-1.28 3-3ZM5.2 15.2c.25 1.29.97 2.01 2.26 2.26-1.29.26-2.01.98-2.26 2.27-.26-1.29-.98-2.01-2.27-2.27 1.29-.25 2.01-.97 2.27-2.26Z" fill="currentColor"/></svg>,
  minus: <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 12h12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>,
  plus: <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>,
  gear: <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 8.2a3.8 3.8 0 1 0 0 7.6 3.8 3.8 0 0 0 0-7.6Zm8.3 4.78v-1.96l-2.13-.75a6.89 6.89 0 0 0-.59-1.42l.98-2.03-1.39-1.39-2.03.98a6.89 6.89 0 0 0-1.42-.59L12.98 3h-1.96l-.75 2.13c-.5.15-.97.35-1.42.59l-2.03-.98-1.39 1.39.98 2.03c-.24.45-.44.92-.59 1.42l-2.13.75v1.96l2.13.75c.15.5.35.97.59 1.42l-.98 2.03 1.39 1.39 2.03-.98c.45.24.92.44 1.42.59l.75 2.13h1.96l.75-2.13c.5-.15.97-.35 1.42-.59l2.03.98 1.39-1.39-.98-2.03c.24-.45.44-.92.59-1.42l2.13-.75Z" fill="currentColor"/></svg>,
  copy: <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 8h10v11H8zM5 5h10v3M5 5v11h3" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"/></svg>,
  history: <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7v5h5M5.2 9.2A8 8 0 1 1 4 13" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/><path d="M12 7.5V12l3 1.8" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>,
  attach: <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m8 12.5 5.8-5.8a3 3 0 0 1 4.2 4.2l-7.2 7.2a5 5 0 0 1-7.1-7.1l7-7" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>,
  screenshot: <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7.5h3l1.3-2h7.4l1.3 2h3v11H4z" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"/><circle cx="12" cy="13" r="3.2" fill="none" stroke="currentColor" strokeWidth="1.8"/></svg>,
  mic: <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="9" y="3" width="6" height="11" rx="3" fill="none" stroke="currentColor" strokeWidth="1.8"/><path d="M5.5 11.5A6.5 6.5 0 0 0 18.5 11.5M12 18v3M9 21h6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>,
  speaker: <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 10h3l4-3.5v11L8 14H5zM15 9a4 4 0 0 1 0 6M17.5 6.5a7.5 7.5 0 0 1 0 11" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  use: <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 12h12M12 7l5 5-5 5M20 5v14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  plan: <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 4h12v16H6zM9 8h6M9 12h6M9 16h3" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/><path d="m16.2 15.2 1.3 1.3 2.5-3" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  trash: <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 7h14M9 7V4h6v3M7.5 7l.7 13h7.6l.7-13M10 10v7M14 10v7" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  back: <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m14.5 6-6 6 6 6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>,
};

function routeInfo(route, tool, language) {
  if (tool) {
    const title = language === 'vi' ? tool.titleVi || tool.title : tool.title;
    const desc = language === 'vi' ? tool.descVi || tool.desc : tool.desc;
    return {
      title,
      task: language === 'vi'
        ? `Người dùng đang ở ứng dụng ${title}. Mục đích của ứng dụng: ${desc}. Hỗ trợ tạo dữ liệu đầu vào, cải thiện kết quả, giải thích, viết đáp án và định dạng nội dung dùng ngay.`
        : `The user is in ${title}. App purpose: ${desc}. Help create inputs, improve outputs, explain, write answer keys and format ready-to-use content.`,
      quickPrompts: language === 'vi' ? [`Hướng dẫn tôi dùng ${title}`, `Tạo nội dung dùng ngay cho ${title}`, 'Kiểm tra và cải thiện nội dung của tôi'] : [`Show me how to use ${title}`, `Create ready-to-use content for ${title}`, 'Review and improve my content'],
    };
  }
  const item = ROUTE_LABELS[route] || ROUTE_LABELS.home;
  return {
    title: language === 'vi' ? item.titleVi : item.title,
    task: language === 'vi' ? item.taskVi : item.task,
    quickPrompts: language === 'vi'
      ? [route === 'news' ? 'Biến bài báo thành bài đọc B2' : 'Tạo một hoạt động dạy học B2-C1', route === 'department' ? 'Soạn thông báo gửi giáo viên' : 'Giải thích nội dung trên trang này', route === 'homeroom' ? 'Viết nhận xét học sinh tích cực' : 'Gợi ý bước tiếp theo cho tôi']
      : [route === 'news' ? 'Turn this article into a B2 reading task' : 'Create a B2-C1 classroom activity', route === 'department' ? 'Draft a teacher notice' : 'Explain the current page', route === 'homeroom' ? 'Write constructive student feedback' : 'Suggest my next step'],
  };
}

function userScope(currentUser) {
  return String(currentUser?.id || currentUser?.email || 'guest').trim().toLowerCase().replace(/[^a-z0-9@._-]+/g, '-') || 'guest';
}
function threadsKey(currentUser) { return `bes-ai-chat-threads:${userScope(currentUser)}`; }
function activeThreadKey(currentUser) { return `bes-ai-chat-active:${userScope(currentUser)}`; }
function legacyKey(currentUser) { return `bes-ai-chat-history:${userScope(currentUser)}`; }

function safeLocalGet(key, fallback = '') {
  if (typeof window === 'undefined') return fallback;
  try { return window.localStorage?.getItem(key) ?? fallback; } catch { return fallback; }
}
function safeLocalSet(key, value) {
  if (typeof window === 'undefined') return false;
  try { window.localStorage?.setItem(key, value); return true; } catch { return false; }
}

function initialGreeting(language, title) {
  return { id: `welcome-${Date.now()}`, role: 'assistant', createdAt: Date.now(), content: language === 'vi' ? `Xin chào thầy Tuấn! Em là Brian AI. Hiện thầy đang ở ${title}. Thầy có thể gửi file, chụp màn hình, dùng giọng nói hoặc yêu cầu em tạo nội dung dùng ngay.` : `Hello! I am Brian AI. You are currently in ${title}. You can send files, capture the screen, use voice mode or request ready-to-use content.` };
}
function createThread(language, info) {
  const now = Date.now();
  return { id: `thread-${now}-${Math.random().toString(36).slice(2, 7)}`, title: language === 'vi' ? 'Cuộc trò chuyện mới' : 'New conversation', routeTitle: info.title, createdAt: now, updatedAt: now, messages: [initialGreeting(language, info.title)] };
}
function normalizeMessage(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const content = String(raw.content || '').trim();
  if (!content) return null;
  return { id: String(raw.id || `message-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`), role: raw.role === 'user' ? 'user' : 'assistant', content, createdAt: Number(raw.createdAt) || Date.now(), attachments: Array.isArray(raw.attachments) ? raw.attachments.slice(0, 5).map((item) => ({ name: String(item.name || 'file'), type: String(item.type || ''), size: Number(item.size) || 0, kind: String(item.kind || 'file') })) : [] };
}
function normalizeThread(raw, language, info) {
  if (!raw || typeof raw !== 'object') return null;
  const messages = Array.isArray(raw.messages) ? raw.messages.map(normalizeMessage).filter(Boolean).slice(-60) : [];
  return { id: String(raw.id || `thread-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`), title: String(raw.title || (language === 'vi' ? 'Cuộc trò chuyện' : 'Conversation')).slice(0, 70), routeTitle: String(raw.routeTitle || info.title).slice(0, 80), createdAt: Number(raw.createdAt) || Date.now(), updatedAt: Number(raw.updatedAt) || Date.now(), messages: messages.length ? messages : [initialGreeting(language, info.title)] };
}
function loadThreads(currentUser, language, info) {
  try {
    const parsed = JSON.parse(safeLocalGet(threadsKey(currentUser)) || '[]');
    const normalized = Array.isArray(parsed) ? parsed.map((item) => normalizeThread(item, language, info)).filter(Boolean).slice(0, 20) : [];
    if (normalized.length) return normalized;
    const legacy = JSON.parse(safeLocalGet(legacyKey(currentUser)) || '[]');
    const legacyMessages = Array.isArray(legacy) ? legacy.map(normalizeMessage).filter(Boolean).slice(-60) : [];
    if (legacyMessages.length) return [{ ...createThread(language, info), title: language === 'vi' ? 'Lịch sử trước đây' : 'Previous conversation', messages: legacyMessages }];
  } catch { /* start a clean history */ }
  return [createThread(language, info)];
}

function MessageText({ content }) {
  return <div className="ai-messenger-message-text">{String(content || '').split(/\n{2,}/g).map((part, index) => <p key={`${index}-${part.slice(0, 12)}`}>{part.split('\n').map((line, lineIndex) => <React.Fragment key={`${lineIndex}-${line.slice(0, 8)}`}>{lineIndex > 0 && <br />}{line}</React.Fragment>)}</p>)}</div>;
}

function stripHtml(html = '') {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  return doc.body?.innerText || '';
}
async function readPptxText(arrayBuffer) {
  const { default: JSZip } = await import('jszip');
  const zip = await JSZip.loadAsync(arrayBuffer);
  const files = Object.keys(zip.files).filter((name) => /^ppt\/slides\/slide\d+\.xml$/i.test(name)).sort((a, b) => Number(a.match(/slide(\d+)/i)?.[1] || 0) - Number(b.match(/slide(\d+)/i)?.[1] || 0));
  const chunks = [];
  for (const name of files.slice(0, 50)) {
    const xml = await zip.file(name)?.async('text');
    if (!xml) continue;
    const doc = new DOMParser().parseFromString(xml, 'application/xml');
    const lines = [...doc.getElementsByTagNameNS('*', 't')].map((node) => node.textContent || '').filter(Boolean);
    if (lines.length) chunks.push(`--- ${name.split('/').pop()} ---\n${lines.join('\n')}`);
  }
  return chunks.join('\n\n');
}
async function readSpreadsheetText(arrayBuffer) {
  return spreadsheetToTextSafe(arrayBuffer, { maxSheets: 10, maxRows: 3000 });
}
function fileToDataUrl(file) {
  return new Promise((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result || '')); reader.onerror = () => reject(reader.error || new Error('Cannot read file')); reader.readAsDataURL(file); });
}
async function prepareAttachment(file) {
  if (!file) return null;
  if (file.size > 12 * 1024 * 1024) throw new Error(`File ${file.name} exceeds 12 MB.`);
  const mimeType = file.type || 'application/octet-stream';
  const id = `attachment-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  if (mimeType.startsWith('image/')) {
    const dataUrl = await fileToDataUrl(file);
    return { id, name: file.name || 'screenshot.png', type: mimeType, mimeType, size: file.size, kind: 'image', dataUrl, base64: dataUrl.split(',')[1] || '', preview: dataUrl, text: '' };
  }
  const ext = String(file.name || '').split('.').pop()?.toLowerCase() || '';
  const buffer = await file.arrayBuffer();
  let text = '';
  if (ext === 'pdf') text = await readPdfTextFromBuffer(buffer, { maxPages: 40, maxChars: 65000 });
  else if (ext === 'docx') text = await readDocxTextFromBuffer(buffer);
  else if (ext === 'pptx') text = await readPptxText(buffer);
  else if (['xlsx', 'xls'].includes(ext)) text = await readSpreadsheetText(buffer);
  else {
    const raw = await file.text();
    text = ['html', 'htm'].includes(ext) ? stripHtml(raw) : raw;
  }
  return { id, name: file.name || 'document', type: mimeType, mimeType, size: file.size, kind: 'document', text: String(text || '').slice(0, 65000), preview: '', dataUrl: '', base64: '' };
}

function capturePageContext(info, currentRoute, selectedTool) {
  const root = document.querySelector('.wp8-page-stage') || document.querySelector('main') || document.body;
  const heading = root.querySelector('h1, h2, [role="heading"]')?.textContent?.trim() || info.title;
  const selectedText = window.getSelection?.()?.toString()?.trim().slice(0, 5000) || '';
  const values = [...root.querySelectorAll('input:not([type="password"]), textarea, select')].slice(0, 20).map((field) => {
    const value = String(field.value || '').trim();
    if (!value) return '';
    const label = field.getAttribute('aria-label') || field.name || field.placeholder || field.id || field.tagName;
    return `${label}: ${value.slice(0, 800)}`;
  }).filter(Boolean);
  const text = String(root.innerText || '').replace(/\s+/g, ' ').trim().slice(0, 9000);
  return { url: window.location.href, route: currentRoute, tool: selectedTool?.slug || '', heading, selectedText, values, visibleText: text };
}

function buildConversationPrompt({ messages, newest, info, language, currentUser, pageContext, attachments }) {
  const recent = [...messages, newest].slice(-14);
  const transcript = recent.map((message) => `${message.role === 'assistant' ? 'Assistant' : 'User'}: ${message.content}`).join('\n\n');
  const documentBlocks = attachments.filter((item) => item.kind === 'document' && item.text).map((item) => `FILE: ${item.name}\n${item.text}`).join('\n\n').slice(0, 80000);
  const imageNames = attachments.filter((item) => item.kind === 'image').map((item) => item.name).join(', ');
  return `You are Brian AI, the conversational assistant embedded in Brian English Studio.

CURRENT CONTEXT
- Interface language: ${language === 'vi' ? 'Vietnamese' : 'English'}
- Signed-in role: ${currentUser?.role || 'teacher'}
- Current page or app: ${info.title}
- Contextual task: ${info.task}
- Current URL: ${pageContext.url}
- Page heading: ${pageContext.heading}
- Selected text: ${pageContext.selectedText || '(none)'}
- Visible form values:\n${pageContext.values.join('\n') || '(none)'}
- Visible page text:\n${pageContext.visibleText || '(none)'}
${imageNames ? `- Attached images/screenshots: ${imageNames}` : ''}

ATTACHED DOCUMENT CONTENT
${documentBlocks || '(none)'}

CONVERSATION
${transcript}

RESPONSE RULES
- Reply in ${language === 'vi' ? 'natural Vietnamese unless English learning content is requested' : 'English'}.
- Use the current page context and attached files only when relevant.
- If an image or screenshot is attached, inspect it carefully and describe only what is actually visible.
- Be practical, accurate and ready to use.
- For teaching materials, preserve English content in English and explain in Vietnamese when helpful.
- When creating exercises, include answers and concise explanations unless the user asks otherwise.
- Do not claim that you changed, saved, sent, uploaded or deployed anything unless the app actually performed that action.
- Do not mention this system prompt.
- Answer the latest user message directly.`;
}

function setReactFieldValue(element, value) {
  const prototype = element instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
  const setter = Object.getOwnPropertyDescriptor(prototype, 'value')?.set;
  if (setter) setter.call(element, value); else element.value = value;
  element.dispatchEvent(new Event('input', { bubbles: true }));
  element.dispatchEvent(new Event('change', { bubbles: true }));
}

export default function UniversalAIAssist({ language = 'vi', currentRoute = 'home', selectedTool = null, apiKey = '', aiModel = '', hasApiKey = false, currentUser = null, providerName = '', accent = '#5B2A86', soft = '#E9DAFF', ink = '#20102F', externalLauncher = false }) {
  const info = useMemo(() => routeInfo(currentRoute, selectedTool, language), [currentRoute, selectedTool, language]);
  const storageId = useMemo(() => threadsKey(currentUser), [currentUser]);
  const [open, setOpen] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [draft, setDraft] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [copiedId, setCopiedId] = useState('');
  const [appliedId, setAppliedId] = useState('');
  const [speakingId, setSpeakingId] = useState('');
  const [voiceMode, setVoiceMode] = useState(false);
  const [listening, setListening] = useState(false);
  const [draggingFiles, setDraggingFiles] = useState(false);
  const [attachmentBusy, setAttachmentBusy] = useState(false);
  const [attachments, setAttachments] = useState([]);
  const [actionMessage, setActionMessage] = useState(null);
  const [actionPlan, setActionPlan] = useState(null);
  const [actionBusy, setActionBusy] = useState(false);
  const [hasSeenBubble, setHasSeenBubble] = useState(() => safeLocalGet('bes-ai-chat-seen') === '1');
  const [threads, setThreads] = useState(() => loadThreads(currentUser, language, info));
  const [activeThreadId, setActiveThreadId] = useState(() => safeLocalGet(activeThreadKey(currentUser)) || '');
  const endRef = useRef(null);
  const textareaRef = useRef(null);
  const fileInputRef = useRef(null);
  const messagesRef = useRef([]);
  const recognitionRef = useRef(null);
  const voiceModeRef = useRef(voiceMode);
  const sendMessageRef = useRef(null);

  const activeThread = useMemo(() => threads.find((thread) => thread.id === activeThreadId) || threads[0], [threads, activeThreadId]);
  const messages = activeThread?.messages || [];
  messagesRef.current = messages;
  voiceModeRef.current = voiceMode;

  useEffect(() => {
    const loaded = loadThreads(currentUser, language, info);
    const savedActive = safeLocalGet(activeThreadKey(currentUser));
    setThreads(loaded);
    setActiveThreadId(loaded.some((thread) => thread.id === savedActive) ? savedActive : loaded[0]?.id || '');
    setAttachments([]);
    setActionMessage(null);
    setActionPlan(null);
  }, [storageId]);

  useEffect(() => {
    if (!activeThreadId && threads[0]) setActiveThreadId(threads[0].id);
    try {
      safeLocalSet(storageId, JSON.stringify(threads.slice(0, 20).map((thread) => ({ ...thread, messages: Array.isArray(thread.messages) ? thread.messages.slice(-60) : [] }))));
      if (activeThreadId) safeLocalSet(activeThreadKey(currentUser), activeThreadId);
    } catch { /* history persistence is optional */ }
  }, [threads, activeThreadId, storageId]);

  useEffect(() => {
    if (!open) return;
    window.requestAnimationFrame(() => { endRef.current?.scrollIntoView({ block: 'end' }); textareaRef.current?.focus({ preventScroll: true }); });
  }, [open, messages.length, loading, attachments.length, showHistory]);

  useEffect(() => {
    const element = textareaRef.current;
    if (!element || !open) return;
    element.style.height = 'auto';
    const nextHeight = Math.min(260, Math.max(96, element.scrollHeight));
    element.style.height = `${nextHeight}px`;
  }, [draft, open]);

  useEffect(() => {
    const onKeyDown = (event) => { if (event.key === 'Escape' && open) { if (showHistory) setShowHistory(false); else setOpen(false); } };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, showHistory]);

  useEffect(() => {
    const openFromSystem = (event) => {
      window.dispatchEvent(new CustomEvent('bes-global-music-command', { detail: { action: 'collapse' } }));
      window.dispatchEvent(new CustomEvent('bes-sync-queue-close'));
      const prompt = String(event?.detail?.prompt || '').trim();
      setOpen(true);
      setShowHistory(false);
      setHasSeenBubble(true);
      safeLocalSet('bes-ai-chat-seen', '1');
      if (prompt) setDraft(prompt);
      if (prompt && event?.detail?.autoSend) {
        window.setTimeout(() => sendMessageRef.current?.(prompt), 120);
      }
    };
    const closeFromSystem = () => { setOpen(false); setShowHistory(false); };
    window.addEventListener('bes-ai-open', openFromSystem);
    window.addEventListener('bes-ai-close', closeFromSystem);
    return () => { window.removeEventListener('bes-ai-open', openFromSystem); window.removeEventListener('bes-ai-close', closeFromSystem); };
  }, []);

  useEffect(() => () => {
    recognitionRef.current?.abort?.();
    window.speechSynthesis?.cancel?.();
  }, []);

  const updateActiveMessages = useCallback((updater, titleSeed = '') => {
    setThreads((current) => current.map((thread) => {
      if (thread.id !== (activeThread?.id || current[0]?.id)) return thread;
      const nextMessages = typeof updater === 'function' ? updater(thread.messages) : updater;
      const firstUser = nextMessages.find((message) => message.role === 'user')?.content || titleSeed;
      const shouldRename = !thread.title || ['Cuộc trò chuyện mới', 'New conversation'].includes(thread.title);
      return { ...thread, title: shouldRename && firstUser ? firstUser.replace(/\s+/g, ' ').slice(0, 52) : thread.title, routeTitle: info.title, updatedAt: Date.now(), messages: nextMessages.slice(-60) };
    }));
  }, [activeThread?.id, info.title]);

  const newChat = () => {
    const thread = createThread(language, info);
    setThreads((current) => [thread, ...current].slice(0, 20));
    setActiveThreadId(thread.id); setDraft(''); setAttachments([]); setError(''); setShowHistory(false);
  };
  const deleteThread = (id) => {
    setThreads((current) => {
      const remaining = current.filter((thread) => thread.id !== id);
      const next = remaining.length ? remaining : [createThread(language, info)];
      if (id === activeThreadId) setActiveThreadId(next[0].id);
      return next;
    });
  };

  const addFiles = useCallback(async (fileList) => {
    const files = [...(fileList || [])].slice(0, Math.max(0, 5 - attachments.length));
    if (!files.length) return;
    setAttachmentBusy(true); setError('');
    try {
      const prepared = [];
      for (const file of files) prepared.push(await prepareAttachment(file));
      setAttachments((current) => [...current, ...prepared.filter(Boolean)].slice(0, 5));
      setNotice(language === 'vi' ? `Đã đính kèm ${prepared.length} tệp.` : `${prepared.length} file(s) attached.`);
      window.setTimeout(() => setNotice(''), 1400);
    } catch (err) {
      setError(err?.message || (language === 'vi' ? 'Không thể đọc tệp.' : 'Could not read the file.'));
    } finally { setAttachmentBusy(false); }
  }, [attachments.length, language]);

  const captureScreenshot = async () => {
    if (!navigator.mediaDevices?.getDisplayMedia) { setError(language === 'vi' ? 'Trình duyệt không hỗ trợ chụp màn hình.' : 'Screen capture is not supported.'); return; }
    setAttachmentBusy(true); setError('');
    let stream;
    try {
      stream = await navigator.mediaDevices.getDisplayMedia({ video: { displaySurface: 'browser' }, audio: false });
      const video = document.createElement('video'); video.srcObject = stream; video.muted = true; await video.play();
      await new Promise((resolve) => window.setTimeout(resolve, 180));
      const maxWidth = 1600; const scale = Math.min(1, maxWidth / Math.max(video.videoWidth, 1));
      const canvas = document.createElement('canvas'); canvas.width = Math.max(1, Math.round(video.videoWidth * scale)); canvas.height = Math.max(1, Math.round(video.videoHeight * scale));
      canvas.getContext('2d').drawImage(video, 0, 0, canvas.width, canvas.height);
      const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', .88));
      if (!blob) throw new Error('Could not capture the screen.');
      await addFiles([new File([blob], `Screenshot-${new Date().toISOString().replace(/[:.]/g, '-')}.jpg`, { type: 'image/jpeg' })]);
    } catch (err) {
      if (err?.name !== 'NotAllowedError') setError(err?.message || (language === 'vi' ? 'Không thể chụp màn hình.' : 'Could not capture the screen.'));
    } finally { stream?.getTracks?.().forEach((track) => track.stop()); setAttachmentBusy(false); }
  };

  const speakText = useCallback((text, id = '') => {
    if (!window.speechSynthesis) { setError(language === 'vi' ? 'Trình duyệt không hỗ trợ đọc giọng nói.' : 'Text-to-speech is not supported.'); return; }
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(String(text || '').slice(0, 10000));
    utterance.lang = language === 'vi' ? 'vi-VN' : 'en-US'; utterance.rate = 1;
    utterance.onstart = () => setSpeakingId(id);
    utterance.onend = () => setSpeakingId('');
    utterance.onerror = () => setSpeakingId('');
    window.speechSynthesis.speak(utterance);
  }, [language]);

  const startListening = () => {
    try { recognitionRef.current?.abort?.(); } catch { /* previous voice session */ }
    const recognition = createSpeechRecognition({
      language: language === 'vi' ? 'vi-VN' : 'en-US',
      continuous: false,
      interimResults: true,
      onStart: () => { setListening(true); setError(''); setNotice(language === 'vi' ? 'Đang nghe…' : 'Listening…'); },
      onEnd: () => { setListening(false); setNotice((current) => ['Đang nghe…', 'Listening…'].includes(current) ? '' : current); },
      onError: ({ code }) => {
        setListening(false);
        if (code === 'aborted') return;
        setNotice(speechRecognitionMessage(code, language));
        window.setTimeout(() => setNotice(''), 5200);
      },
      onResult: (event) => {
        let interim = ''; let finalText = '';
        for (let index = event.resultIndex; index < event.results.length; index += 1) {
          const text = event.results[index][0]?.transcript || '';
          if (event.results[index].isFinal) finalText += text; else interim += text;
        }
        const finalValue = finalText.trim();
        if (finalValue) setDraft((current) => current.trim() ? `${current.trim()} ${finalValue}` : finalValue);
        else if (interim.trim()) setNotice(`${language === 'vi' ? 'Đang nghe' : 'Listening'}: ${interim.trim().slice(0, 90)}`);
        if (finalValue && voiceModeRef.current) window.setTimeout(() => sendMessageRef.current?.(finalValue), 80);
      },
    });
    if (!recognition) {
      setNotice(language === 'vi' ? 'Trình duyệt không hỗ trợ nhập giọng nói. Hãy gõ nội dung trong ô nhập đã được mở rộng.' : 'Voice input is unavailable. Type in the expanded message box.');
      return;
    }
    try { recognitionRef.current = recognition; recognition.start(); }
    catch { setNotice(language === 'vi' ? 'Không thể khởi động nhập giọng nói. Hãy kiểm tra quyền micro hoặc nhập bằng bàn phím.' : 'Voice input could not start. Check microphone permission or type instead.'); }
  };

  const toggleVoiceMode = () => {
    const next = !voiceModeRef.current;
    voiceModeRef.current = next;
    setVoiceMode(next);
    if (!next) { recognitionRef.current?.abort?.(); window.speechSynthesis?.cancel?.(); setListening(false); setSpeakingId(''); }
    else startListening();
  };

  const sendMessage = useCallback(async (text = draft) => {
    const clean = String(text || '').trim();
    if ((!clean && !attachments.length) || loading) return;
    const outgoingAttachments = attachments;
    const userMessage = { id: `user-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, role: 'user', content: clean || (language === 'vi' ? 'Hãy phân tích các tệp đính kèm.' : 'Please analyze the attached files.'), createdAt: Date.now(), attachments: outgoingAttachments.map((item) => ({ name: item.name, type: item.type, size: item.size, kind: item.kind })) };
    updateActiveMessages((current) => [...current, userMessage], userMessage.content);
    setDraft(''); setAttachments([]); setError(''); setNotice('');

    if (!hasApiKey) {
      updateActiveMessages((current) => [...current, { id: `assistant-${Date.now()}-settings`, role: 'assistant', createdAt: Date.now(), content: language === 'vi' ? 'OpenRouter Production Gateway chưa sẵn sàng. Hãy mở Thiết lập và kiểm tra biến OPENROUTER_API_KEY trên Vercel.' : 'The OpenRouter Production Gateway is not ready. Open Settings and verify OPENROUTER_API_KEY on Vercel.', attachments: [] }]);
      return;
    }

    const assistantId = `assistant-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    updateActiveMessages((current) => [...current, { id: assistantId, role: 'assistant', content: language === 'vi' ? 'Đang kết nối OpenRouter…' : 'Connecting to OpenRouter…', createdAt: Date.now(), attachments: [], streaming: true }]);
    setLoading(true);
    try {
      const pageContext = capturePageContext(info, currentRoute, selectedTool);
      const prompt = buildConversationPrompt({ messages: messagesRef.current, newest: userMessage, info, language, currentUser, pageContext, attachments: outgoingAttachments });
      const result = await runAITask('assistant.pageChat', {
        apiKey, model: aiModel, prompt,
        attachments: outgoingAttachments.filter((item) => item.kind === 'image').map((item) => ({ name: item.name, mimeType: item.mimeType, dataUrl: item.dataUrl, base64: item.base64 })),
        systemInstruction: 'You are Brian AI, a reliable, context-aware in-app assistant for a Vietnamese high-school English teacher and subject-team leader. Be useful, honest and concise.',
        temperature: .66,
        maxOutputTokens: 3200,
        stream: true,
        onToken: (_delta, aggregate) => updateActiveMessages((current) => current.map((message) => message.id === assistantId ? { ...message, content: aggregate, streaming: true } : message)),
        loadingLabel: language === 'vi' ? 'Brian AI đang đọc ngữ cảnh và truyền câu trả lời...' : 'Brian AI is reading the context and streaming a reply...',
      });
      updateActiveMessages((current) => current.map((message) => message.id === assistantId ? { ...message, content: result, streaming: false } : message));
      if (voiceModeRef.current) speakText(result, assistantId);
    } catch (err) {
      const message = err?.message || (language === 'vi' ? 'Không thể kết nối AI.' : 'Unable to connect to AI.');
      setError(message);
      updateActiveMessages((current) => current.map((entry) => entry.id === assistantId ? { ...entry, streaming: false, content: language === 'vi' ? `Em chưa thể trả lời vì OpenRouter gặp lỗi: ${message}` : `I could not reply because OpenRouter failed: ${message}` } : entry));
    } finally { setLoading(false); }
  }, [draft, attachments, loading, hasApiKey, language, apiKey, aiModel, info, currentRoute, selectedTool, currentUser, updateActiveMessages, speakText]);
  sendMessageRef.current = sendMessage;

  const copyMessage = async (message) => {
    try { await navigator.clipboard.writeText(message.content); setCopiedId(message.id); window.setTimeout(() => setCopiedId(''), 1300); }
    catch { setError(language === 'vi' ? 'Trình duyệt không cho phép sao chép.' : 'The browser blocked copying.'); }
  };

  const useResult = async (message) => {
    const detail = { text: message.content, route: currentRoute, toolSlug: selectedTool?.slug || '', messageId: message.id, handled: false, markHandled() { this.handled = true; } };
    window.dispatchEvent(new CustomEvent('bes-ai-use-result', { detail }));
    if (!detail.handled) {
      const candidates = [...document.querySelectorAll('.wp8-page-stage textarea:not([disabled]), .wp8-page-stage input[type="text"]:not([disabled]), .wp8-page-stage [contenteditable="true"]')].filter((element) => !element.closest('.ai-messenger-root') && element.offsetParent !== null);
      const target = candidates[0];
      if (target?.isContentEditable) { target.textContent = message.content; target.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText', data: message.content })); detail.handled = true; }
      else if (target) { setReactFieldValue(target, message.content); target.focus(); detail.handled = true; }
    }
    try { sessionStorage.setItem('bes-ai-pending-result', JSON.stringify({ text: message.content, route: currentRoute, toolSlug: selectedTool?.slug || '', createdAt: Date.now() })); } catch { /* optional */ }
    if (!detail.handled) { try { await navigator.clipboard.writeText(message.content); } catch { /* clipboard optional */ } }
    setAppliedId(message.id); setNotice(detail.handled ? (language === 'vi' ? 'Đã đưa kết quả vào ứng dụng.' : 'Result applied to the app.') : (language === 'vi' ? 'Đã sao chép kết quả để dùng trong ứng dụng.' : 'Result copied for use in the app.'));
    window.setTimeout(() => { setAppliedId(''); setNotice(''); }, 1800);
  };

  const sendResultToApp = (message) => {
    window.dispatchEvent(new CustomEvent('bes-content-transfer-open', { detail: {
      type: 'ai-result',
      title: language === 'vi' ? 'Kết quả từ Brian AI' : 'Brian AI result',
      sourceApp: 'brian-ai',
      sourceTitle: 'Brian AI',
      content: message.content,
      metadata: { route: currentRoute, tool: selectedTool?.slug || '', messageId: message.id },
    } }));
    setOpen(false);
  };

  const openActionPicker = (message) => {
    const suggestions = buildAiActionSuggestions({ message: message.content, currentRoute, selectedTool, language });
    if (!suggestions.length) {
      setNotice(language === 'vi' ? 'Admin đã tắt các hành động AI cho trang này.' : 'AI actions are disabled for this page.');
      window.setTimeout(() => setNotice(''), 1800);
      return;
    }
    setActionMessage({ message, suggestions });
    setActionPlan(null);
  };

  const runActionPlan = async (plan) => {
    setActionBusy(true); setError('');
    try {
      const result = await executeAiAction(plan);
      const label = plan.action.label;
      setNotice(language === 'vi' ? `Đã thực hiện: ${label}.` : `Completed: ${label}.`);
      setActionMessage(null); setActionPlan(null);
      window.setTimeout(() => setNotice(''), 2200);
      if (result?.hash && plan.action.id !== 'current-app') {
        setOpen(false);
        window.setTimeout(() => { window.location.hash = result.hash; }, 80);
      }
    } catch (err) {
      setError(err?.message || (language === 'vi' ? 'Không thể thực hiện hành động AI.' : 'Could not execute the AI action.'));
    } finally { setActionBusy(false); }
  };

  const chooseAction = async (action) => {
    try {
      const plan = prepareAiAction(action.id, {
        text: actionMessage?.message?.content || '',
        title: language === 'vi' ? 'Kết quả từ Brian AI' : 'Brian AI result',
        messageId: actionMessage?.message?.id || '',
      }, { currentRoute, selectedTool, currentUser, language });
      if (plan.requiresConfirmation) setActionPlan(plan);
      else await runActionPlan(plan);
    } catch (err) {
      setError(err?.message || (language === 'vi' ? 'Không thể chuẩn bị hành động.' : 'Could not prepare the action.'));
    }
  };

  const onComposerKeyDown = (event) => { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); sendMessage(); } };
  const openChat = () => { setOpen(true); setHasSeenBubble(true); safeLocalSet('bes-ai-chat-seen', '1'); };

  const sortedThreads = [...threads].sort((a, b) => b.updatedAt - a.updatedAt);
  const portal = (
    <div className={`ai-messenger-root ai-messenger-v10860 bui-ai-dock ${open ? 'is-open' : 'is-collapsed'} ${draggingFiles ? 'is-file-dragging' : ''}`} style={{ '--ai-chat-accent': accent, '--ai-chat-soft': soft, '--ai-chat-ink': ink }} data-ui="ai-dock" data-ui-core="v12.6" data-route={currentRoute} data-external-launcher={externalLauncher ? 'true' : 'false'}
      onDragEnter={(event) => { if (open && event.dataTransfer?.types?.includes('Files')) { event.preventDefault(); setDraggingFiles(true); } }}
      onDragOver={(event) => { if (open && event.dataTransfer?.types?.includes('Files')) event.preventDefault(); }}
      onDragLeave={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setDraggingFiles(false); }}
      onDrop={(event) => { if (!open) return; event.preventDefault(); setDraggingFiles(false); addFiles(event.dataTransfer.files); }}>
      {open ? (
        <section className="ai-messenger-window bui-ai-dock-window" role="dialog" aria-modal="false" aria-label={language === 'vi' ? 'Trò chuyện với trợ lí AI' : 'Chat with AI assistant'}>
          <header className="ai-messenger-header">
            <div className="ai-messenger-avatar" aria-hidden="true">{SVG.sparkle}</div>
            <div className="ai-messenger-heading"><strong>Brian AI</strong><span><i /> {voiceMode ? (language === 'vi' ? 'Chế độ giọng nói' : 'Voice mode') : (language === 'vi' ? 'Đang hoạt động' : 'Active')} · {providerName || aiModel || 'AI'}</span></div>
            <div className="ai-messenger-header-actions">
              <button type="button" className={showHistory ? 'active' : ''} onClick={() => setShowHistory((value) => !value)} title={language === 'vi' ? 'Lịch sử hội thoại' : 'Conversation history'}>{SVG.history}</button>
              <button type="button" className={voiceMode || listening ? 'active voice' : ''} onClick={toggleVoiceMode} title={language === 'vi' ? 'Chế độ giọng nói' : 'Voice mode'}>{SVG.mic}</button>
              <button type="button" onClick={newChat} title={language === 'vi' ? 'Cuộc trò chuyện mới' : 'New chat'}>{SVG.plus}</button>
              <button type="button" onClick={() => { window.location.hash = '#/settings'; setOpen(false); }} title={language === 'vi' ? 'Thiết lập AI' : 'AI settings'}>{SVG.gear}</button>
              <button type="button" onClick={() => setOpen(false)} title={language === 'vi' ? 'Thu gọn' : 'Minimize'}>{SVG.minus}</button>
            </div>
          </header>

          {showHistory ? (
            <div className="ai-messenger-history-panel">
              <div className="ai-messenger-history-head"><button type="button" onClick={() => setShowHistory(false)}>{SVG.back}</button><div><strong>{language === 'vi' ? 'Lịch sử hội thoại' : 'Conversation history'}</strong><small>{threads.length}/20</small></div><button type="button" onClick={newChat}>＋</button></div>
              <div className="ai-messenger-history-list">
                {sortedThreads.map((thread) => (
                  <article key={thread.id} className={thread.id === activeThread?.id ? 'active' : ''}>
                    <button type="button" onClick={() => { setActiveThreadId(thread.id); setShowHistory(false); }}><strong>{thread.title}</strong><span>{thread.routeTitle}</span><small>{new Date(thread.updatedAt).toLocaleString(language === 'vi' ? 'vi-VN' : 'en-US')}</small></button>
                    <button type="button" onClick={() => deleteThread(thread.id)} aria-label={language === 'vi' ? 'Xóa cuộc trò chuyện' : 'Delete conversation'}>{SVG.trash}</button>
                  </article>
                ))}
              </div>
            </div>
          ) : (
            <>
              <div className="ai-messenger-context-strip"><span>{SVG.sparkle}</span><div><b>{info.title}</b><small>{language === 'vi' ? 'Đang dùng ngữ cảnh trang, nội dung hiển thị và dữ liệu biểu mẫu' : 'Using the current page, visible content and form context'}</small></div></div>

              <div className="ai-messenger-thread" aria-live="polite">
                <div className="ai-messenger-day-label">{language === 'vi' ? 'Hôm nay' : 'Today'}</div>
                {messages.map((message) => (
                  <div key={message.id} className={`ai-messenger-row is-${message.role}`}>
                    {message.role === 'assistant' && <div className="ai-messenger-mini-avatar">AI</div>}
                    <div className="ai-messenger-message-wrap">
                      {message.attachments?.length ? <div className="ai-message-attachment-list">{message.attachments.map((item, index) => <span key={`${item.name}-${index}`}>{item.kind === 'image' ? '▧' : '▤'} {item.name}</span>)}</div> : null}
                      <div className="ai-messenger-message"><MessageText content={message.content}/></div>
                      {message.role === 'assistant' && (
                        <div className="ai-messenger-message-actions">
                          <button type="button" onClick={() => copyMessage(message)}>{SVG.copy}<span>{copiedId === message.id ? (language === 'vi' ? 'Đã sao chép' : 'Copied') : (language === 'vi' ? 'Sao chép' : 'Copy')}</span></button>
                          <button type="button" onClick={() => useResult(message)} className={appliedId === message.id ? 'active' : ''}>{SVG.use}<span>{appliedId === message.id ? (language === 'vi' ? 'Đã dùng' : 'Applied') : (language === 'vi' ? 'Dùng kết quả trong ứng dụng' : 'Use result in app')}</span></button>
                          <button type="button" onClick={() => openActionPicker(message)} className="ai-action-trigger">{SVG.plan}<span>{language === 'vi' ? 'Hành động' : 'Actions'}</span></button>
                          <button type="button" onClick={() => sendResultToApp(message)}>{SVG.use}<span>{language === 'vi' ? 'Gửi sang…' : 'Send to…'}</span></button>
                          <button type="button" onClick={() => speakingId === message.id ? (window.speechSynthesis.cancel(), setSpeakingId('')) : speakText(message.content, message.id)} className={speakingId === message.id ? 'active' : ''}>{SVG.speaker}<span>{speakingId === message.id ? (language === 'vi' ? 'Dừng đọc' : 'Stop') : (language === 'vi' ? 'Nghe' : 'Listen')}</span></button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                {loading && <div className="ai-messenger-row is-assistant"><div className="ai-messenger-mini-avatar">AI</div><div className="ai-messenger-message ai-messenger-typing" aria-label={language === 'vi' ? 'AI đang nhập' : 'AI is typing'}><i/><i/><i/></div></div>}
                {messages.length <= 2 && !loading && <div className="ai-messenger-suggestions">{info.quickPrompts.map((prompt) => <button type="button" key={prompt} onClick={() => sendMessage(prompt)}>{prompt}</button>)}</div>}
                <div ref={endRef}/>
              </div>

              {attachments.length > 0 && <div className="ai-messenger-attachments">{attachments.map((item) => <article key={item.id}>{item.kind === 'image' ? <img src={item.preview} alt=""/> : <span>▤</span>}<div><strong>{item.name}</strong><small>{Math.max(1, Math.round(item.size / 1024))} KB</small></div><button type="button" onClick={() => setAttachments((current) => current.filter((entry) => entry.id !== item.id))}>×</button></article>)}</div>}
              {!hasApiKey && <div className="ai-messenger-config-note"><span>!</span><p>{language === 'vi' ? 'Cần cấu hình AI provider để gửi tin nhắn.' : 'Configure an AI provider to send messages.'}</p><button type="button" onClick={() => { window.location.hash = '#/settings'; setOpen(false); }}>{language === 'vi' ? 'Mở thiết lập' : 'Open settings'}</button></div>}
              {(error || notice) && <div className={error ? 'ai-messenger-error' : 'ai-messenger-notice'}>{error || notice}</div>}

              <footer className="ai-messenger-composer bui-ai-dock-composer">
                <div className="ai-composer-tools">
                  <input ref={fileInputRef} type="file" multiple hidden accept="image/*,.pdf,.docx,.pptx,.xlsx,.xls,.txt,.md,.csv,.json,.html,.htm" onChange={(event) => { addFiles(event.target.files); event.target.value = ''; }}/>
                  <button type="button" onClick={() => fileInputRef.current?.click()} disabled={attachmentBusy} title={language === 'vi' ? 'Đính kèm file' : 'Attach files'}>{SVG.attach}<span>{language === 'vi' ? 'Tệp' : 'Files'}</span></button>
                  <button type="button" onClick={captureScreenshot} disabled={attachmentBusy} title={language === 'vi' ? 'Chụp màn hình' : 'Capture screen'}>{SVG.screenshot}<span>{language === 'vi' ? 'Màn hình' : 'Screen'}</span></button>
                  <button type="button" onClick={startListening} className={listening ? 'active' : ''} title={language === 'vi' ? 'Nhập bằng giọng nói' : 'Voice input'}>{SVG.mic}<span>{listening ? (language === 'vi' ? 'Đang nghe' : 'Listening') : (language === 'vi' ? 'Nói' : 'Speak')}</span></button>
                  <small>{attachments.length}/5</small>
                </div>
                <div className="ai-composer-input-row bui-ai-dock-input-row">
                  <textarea className="bui-ai-dock-editor" ref={textareaRef} rows={4} value={draft} onChange={(event) => setDraft(event.target.value.slice(0, 7000))} onKeyDown={onComposerKeyDown} onPaste={(event) => { const imageFiles = [...(event.clipboardData?.files || [])].filter((file) => file.type.startsWith('image/')); if (imageFiles.length) { event.preventDefault(); addFiles(imageFiles); } }} placeholder={language === 'vi' ? 'Nhắn tin, kéo file hoặc dán ảnh cho Brian AI...' : 'Message, drop a file or paste an image...'} aria-label={language === 'vi' ? 'Tin nhắn cho trợ lí AI' : 'Message to AI assistant'}/>
                  <button type="button" onClick={() => sendMessage()} disabled={(!draft.trim() && !attachments.length) || loading} aria-label={language === 'vi' ? 'Gửi tin nhắn' : 'Send message'}>{SVG.send}</button>
                </div>
                <small>{voiceMode ? (language === 'vi' ? 'Voice mode: AI tự gửi khi nhận xong và đọc câu trả lời.' : 'Voice mode: auto-send and read replies aloud.') : (language === 'vi' ? 'Enter để gửi · Shift + Enter xuống dòng' : 'Enter to send · Shift + Enter for a new line')}</small>
              </footer>
            </>
          )}

          {actionMessage && !actionPlan ? (
            <div className="ai-action-panel" role="dialog" aria-label={language === 'vi' ? 'Chọn hành động AI' : 'Choose AI action'}>
              <header><div><span>{SVG.plan}</span><div><strong>{language === 'vi' ? 'Dùng kết quả để làm gì?' : 'What should AI do next?'}</strong><small>{language === 'vi' ? 'Brian AI đề xuất các hành động an toàn cho nội dung này.' : 'Brian AI suggests safe actions for this result.'}</small></div></div><button type="button" onClick={() => setActionMessage(null)}>×</button></header>
              <div className="ai-action-grid">
                {actionMessage.suggestions.map((action) => (
                  <button type="button" key={action.id} onClick={() => chooseAction(action)} disabled={actionBusy}>
                    <span>{action.icon}</span><div><strong>{action.label}</strong><small>{action.description}</small></div><b>›</b>
                  </button>
                ))}
              </div>
              <footer><small>{language === 'vi' ? 'Hành động làm thay đổi dữ liệu sẽ được xem trước trước khi thực hiện.' : 'Data-changing actions are previewed before execution.'}</small></footer>
            </div>
          ) : null}

          {actionPlan ? (
            <div className="ai-action-confirm" role="dialog" aria-label={language === 'vi' ? 'Xác nhận hành động AI' : 'Confirm AI action'}>
              <section>
                <header><div><span>{actionPlan.action.icon}</span><div><small>{language === 'vi' ? 'KẾ HOẠCH HÀNH ĐỘNG' : 'ACTION PLAN'}</small><strong>{actionPlan.action.label}</strong></div></div><button type="button" onClick={() => setActionPlan(null)} disabled={actionBusy}>×</button></header>
                <div className="ai-action-confirm-body">
                  <p>{actionPlan.action.description}</p>
                  <div className="ai-action-preview"><small>{language === 'vi' ? 'Xem trước nội dung' : 'Content preview'}</small><pre>{actionPlan.text.slice(0, 1800)}{actionPlan.text.length > 1800 ? '\n…' : ''}</pre></div>
                  <div className="ai-action-safety"><b>✓</b><span>{language === 'vi' ? 'Không xóa dữ liệu và không gửi ra bên ngoài. Bạn có thể hủy ở bước này.' : 'This does not delete data or send anything externally. You can cancel now.'}</span></div>
                </div>
                <footer><button type="button" className="secondary" onClick={() => setActionPlan(null)} disabled={actionBusy}>{language === 'vi' ? 'Hủy' : 'Cancel'}</button><button type="button" className="primary" onClick={() => runActionPlan(actionPlan)} disabled={actionBusy}>{actionBusy ? (language === 'vi' ? 'Đang thực hiện…' : 'Running…') : (language === 'vi' ? 'Thực hiện' : 'Execute')}</button></footer>
              </section>
            </div>
          ) : null}

          {draggingFiles && <div className="ai-messenger-drop-zone"><span>{SVG.attach}</span><strong>{language === 'vi' ? 'Thả file vào đây' : 'Drop files here'}</strong><small>PDF · DOCX · PPTX · XLSX · IMAGE</small></div>}
        </section>
      ) : externalLauncher ? null : (
        <div className="ai-messenger-collapsed-wrap"><span className="ai-messenger-tooltip">{language === 'vi' ? 'Trò chuyện với Brian AI' : 'Chat with Brian AI'}</span><button type="button" className="ai-messenger-bubble" onClick={openChat} aria-label={language === 'vi' ? 'Mở trợ lí AI' : 'Open AI assistant'}>{SVG.chat}{!hasSeenBubble && <i className="ai-messenger-unread-dot"/>}<b className="ai-messenger-online-dot"/></button></div>
      )}
    </div>
  );
  return typeof document === 'undefined' ? null : createPortal(portal, document.body);
}
