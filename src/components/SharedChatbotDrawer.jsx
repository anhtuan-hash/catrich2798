import React, { useEffect, useMemo, useRef, useState } from 'react';
import { callAI } from '../utils/gemini.js';
import '../styles/SharedChatbotDrawer.css';

const MAX_HISTORY = 24;

function createWelcome(language) {
  return {
    id: `welcome-${language}`,
    role: 'assistant',
    content: language === 'vi'
      ? 'Xin chào! Tôi là **Brian AI**, trợ lý dùng chung của Brian English Studio. Tôi có thể hỗ trợ soạn bài, tạo hoạt động, giải thích ngữ pháp và xử lý công việc chuyên môn.'
      : 'Hello! I am **Brian AI**, the shared assistant in Brian English Studio. I can help with lesson planning, classroom activities, grammar explanations, and professional tasks.',
  };
}

function normalizeStoredMessages(value, language) {
  if (!Array.isArray(value)) return [createWelcome(language)];
  const messages = value
    .filter((item) => item && ['user', 'assistant'].includes(item.role) && typeof item.content === 'string')
    .map((item, index) => ({
      id: String(item.id || `${item.role}-${index}-${Date.now()}`),
      role: item.role,
      content: item.content.slice(0, 12_000),
      error: item.error === true,
    }))
    .slice(-MAX_HISTORY);
  return messages.length ? messages : [createWelcome(language)];
}

function SparkIcon({ compact = false }) {
  return (
    <svg className={`bes-kira-spark${compact ? ' is-compact' : ''}`} viewBox="0 0 28 28" aria-hidden="true">
      <path className="spark-blue" d="M13.9 1.8c.8 5.5 3.5 8.2 9 9-5.5.8-8.2 3.5-9 9-.8-5.5-3.5-8.2-9-9 5.5-.8 8.2-3.5 9-9Z" />
      <path className="spark-red" d="M22.1 17.4c.35 2.35 1.5 3.5 3.85 3.85-2.35.35-3.5 1.5-3.85 3.85-.35-2.35-1.5-3.5-3.85-3.85 2.35-.35 3.5-1.5 3.85-3.85Z" />
      <circle className="spark-yellow" cx="5.1" cy="21.5" r="2.25" />
      <circle className="spark-green" cx="23.25" cy="5.15" r="1.75" />
    </svg>
  );
}

function ChatIcon({ close = false }) {
  if (close) {
    return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6.5 6.5 17.5 17.5M17.5 6.5 6.5 17.5" /></svg>;
  }
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M5.5 4.5h13a3 3 0 0 1 3 3v6.8a3 3 0 0 1-3 3h-7.1L6 20.8v-3.5h-.5a3 3 0 0 1-3-3V7.5a3 3 0 0 1 3-3Z" />
      <path d="M7.2 10.9h.01M12 10.9h.01M16.8 10.9h.01" />
    </svg>
  );
}

function renderInline(text) {
  return String(text || '').split(/(\*\*[^*]+\*\*|`[^`]+`)/g).filter(Boolean).map((part, index) => {
    if (part.startsWith('**') && part.endsWith('**')) return <strong key={`${part}-${index}`}>{part.slice(2, -2)}</strong>;
    if (part.startsWith('`') && part.endsWith('`')) return <code key={`${part}-${index}`}>{part.slice(1, -1)}</code>;
    return <React.Fragment key={`${part}-${index}`}>{part}</React.Fragment>;
  });
}

function MessageContent({ content }) {
  const lines = String(content || '').replace(/\r/g, '').split('\n');
  return (
    <div className="bes-kira-message-content">
      {lines.map((line, index) => {
        const trimmed = line.trim();
        if (!trimmed) return <span className="bes-kira-message-space" key={`space-${index}`} aria-hidden="true" />;
        if (/^---+$/.test(trimmed)) return <hr key={`rule-${index}`} />;
        const heading = trimmed.match(/^(#{1,3})\s+(.+)$/);
        if (heading) {
          const HeadingTag = heading[1].length === 1 ? 'h3' : heading[1].length === 2 ? 'h4' : 'h5';
          return <HeadingTag key={`heading-${index}`}>{renderInline(heading[2])}</HeadingTag>;
        }
        const bullet = trimmed.match(/^[-*•]\s+(.+)$/);
        if (bullet) {
          return <div className="bes-kira-message-list-item" key={`bullet-${index}`}><span aria-hidden="true" /><p>{renderInline(bullet[1])}</p></div>;
        }
        const numbered = trimmed.match(/^(\d+)[.)]\s+(.+)$/);
        if (numbered) {
          return <div className="bes-kira-message-list-item is-numbered" key={`number-${index}`}><b aria-hidden="true">{numbered[1]}</b><p>{renderInline(numbered[2])}</p></div>;
        }
        return <p key={`paragraph-${index}`}>{renderInline(trimmed)}</p>;
      })}
    </div>
  );
}

export default function SharedChatbotDrawer({ currentUser, language = 'vi' }) {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [messages, setMessages] = useState(() => [createWelcome(language)]);
  const [runtime, setRuntime] = useState({ model: '', remainingToday: null });
  const scrollRef = useRef(null);
  const inputRef = useRef(null);
  const abortRef = useRef(null);

  const storageKey = useMemo(() => {
    const identity = currentUser?.id || currentUser?.email || 'signed-in-user';
    return `bes-brian-ai-chat:${identity}`;
  }, [currentUser?.id, currentUser?.email]);

  const text = language === 'vi'
    ? {
        title: 'Brian AI',
        powered: runtime.model ? `OpenRouter · ${runtime.model.split('/').pop()}` : 'OpenRouter · Free Models',
        eyebrow: 'Trợ lý giảng dạy',
        open: 'Mở Brian AI', close: 'Đóng Brian AI', clear: 'Bắt đầu cuộc trò chuyện mới',
        placeholder: 'Hỏi Brian AI…', send: 'Gửi', thinking: 'Brian AI đang suy nghĩ',
        error: 'Tôi chưa thể phản hồi lúc này. Vui lòng thử lại sau.',
        hint: runtime.remainingToday == null ? 'Enter để gửi · Shift + Enter xuống dòng' : `Còn khoảng ${runtime.remainingToday} lượt AI hôm nay`,
        suggestions: ['Soạn một hoạt động khởi động 5 phút', 'Giải thích một điểm ngữ pháp khó', 'Tạo nhanh 10 câu luyện tập'],
      }
    : {
        title: 'Brian AI',
        powered: runtime.model ? `OpenRouter · ${runtime.model.split('/').pop()}` : 'OpenRouter · Free Models',
        eyebrow: 'Teaching assistant',
        open: 'Open Brian AI', close: 'Close Brian AI', clear: 'Start a new conversation',
        placeholder: 'Ask Brian AI…', send: 'Send', thinking: 'Brian AI is thinking',
        error: 'I cannot respond right now. Please try again later.',
        hint: runtime.remainingToday == null ? 'Enter to send · Shift + Enter for a new line' : `About ${runtime.remainingToday} AI requests left today`,
        suggestions: ['Plan a five-minute warm-up activity', 'Explain a difficult grammar point', 'Create ten quick practice questions'],
      };

  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      setMessages(raw ? normalizeStoredMessages(JSON.parse(raw), language) : [createWelcome(language)]);
    } catch { setMessages([createWelcome(language)]); }
  }, [storageKey, language]);

  useEffect(() => {
    try { localStorage.setItem(storageKey, JSON.stringify(messages.slice(-MAX_HISTORY))); } catch { /* optional */ }
  }, [messages, storageKey]);

  useEffect(() => {
    if (!open) return;
    const timer = window.setTimeout(() => inputRef.current?.focus(), 140);
    return () => window.clearTimeout(timer);
  }, [open]);

  useEffect(() => {
    const node = scrollRef.current;
    if (node) node.scrollTop = node.scrollHeight;
  }, [messages, sending, open]);

  useEffect(() => {
    const textarea = inputRef.current;
    if (!textarea) return;
    textarea.style.height = 'auto';
    textarea.style.height = `${Math.min(textarea.scrollHeight, 132)}px`;
  }, [input]);

  useEffect(() => () => abortRef.current?.abort(), []);

  const clearConversation = () => {
    abortRef.current?.abort();
    setSending(false);
    setMessages([createWelcome(language)]);
    setInput('');
    inputRef.current?.focus();
  };

  const sendMessage = async (overrideContent = '') => {
    const content = String(overrideContent || input).trim();
    if (!content || sending) return;
    const userMessage = { id: `user-${Date.now()}`, role: 'user', content: content.slice(0, 8_000) };
    const nextMessages = [...messages, userMessage].slice(-MAX_HISTORY);
    setMessages(nextMessages);
    setInput('');
    setSending(true);
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const result = await callAI({
        task: 'chat',
        language,
        messages: nextMessages.map(({ role, content: messageContent }) => ({ role, content: messageContent })),
        context: { pageTitle: document.title, route: window.location.hash },
        includeMetadata: true,
        signal: controller.signal,
        label: language === 'vi' ? 'Brian AI đang trả lời…' : 'Brian AI is replying…',
      });
      setRuntime({ model: result.model || '', remainingToday: result.remainingToday ?? null });
      setMessages((current) => [...current, { id: `assistant-${Date.now()}`, role: 'assistant', content: result.message }].slice(-MAX_HISTORY));
    } catch (error) {
      if (error?.code === 'AI_ABORTED') return;
      setMessages((current) => [...current, {
        id: `error-${Date.now()}`,
        role: 'assistant',
        content: error?.message || text.error,
        error: true,
      }].slice(-MAX_HISTORY));
    } finally {
      setSending(false);
      abortRef.current = null;
    }
  };

  const onComposerKeyDown = (event) => {
    if (event.key === 'Escape') { setOpen(false); return; }
    if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); sendMessage(); }
  };

  const showSuggestions = messages.length === 1 && messages[0]?.id?.startsWith('welcome-') && !sending;

  return (
    <div className={`bes-kira-chat-root${open ? ' is-open' : ''}`} data-brian-ai-root>
      {open ? (
        <section className="bes-kira-chat-panel" role="dialog" aria-modal="false" aria-label={text.title}>
          <header className="bes-kira-chat-header">
            <div className="bes-kira-chat-brand" aria-hidden="true"><SparkIcon /></div>
            <div className="bes-kira-chat-heading"><small>{text.eyebrow}</small><strong>{text.title}</strong><span title={runtime.model || 'openrouter/free'}><i />{text.powered}</span></div>
            <div className="bes-kira-chat-actions">
              <button type="button" onClick={clearConversation} title={text.clear} aria-label={text.clear}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14" /></svg></button>
              <button type="button" onClick={() => setOpen(false)} title={text.close} aria-label={text.close}><ChatIcon close /></button>
            </div>
          </header>

          <div ref={scrollRef} className="bes-kira-chat-messages" aria-live="polite">
            {messages.map((message) => (
              <div key={message.id} className={`bes-kira-chat-message is-${message.role}${message.error ? ' is-error' : ''}`}>
                {message.role === 'assistant' ? <span className="bes-kira-chat-avatar" aria-hidden="true"><SparkIcon compact /></span> : null}
                <div className="bes-kira-chat-bubble"><MessageContent content={message.content} /></div>
              </div>
            ))}
            {showSuggestions ? (
              <div className="bes-kira-chat-suggestions" aria-label={language === 'vi' ? 'Gợi ý nhanh' : 'Quick suggestions'}>
                {text.suggestions.map((suggestion) => <button key={suggestion} type="button" onClick={() => sendMessage(suggestion)}><SparkIcon compact /><span>{suggestion}</span><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 6 6 6-6 6" /></svg></button>)}
              </div>
            ) : null}
            {sending ? <div className="bes-kira-chat-message is-assistant"><span className="bes-kira-chat-avatar" aria-hidden="true"><SparkIcon compact /></span><div className="bes-kira-chat-bubble bes-kira-chat-thinking"><span /><span /><span /><em>{text.thinking}</em></div></div> : null}
          </div>

          <footer className="bes-kira-chat-composer">
            <div className="bes-kira-chat-input-wrap">
              <textarea ref={inputRef} value={input} onChange={(event) => setInput(event.target.value)} onKeyDown={onComposerKeyDown} placeholder={text.placeholder} rows={1} maxLength={8_000} aria-label={text.placeholder} disabled={sending} />
              <button type="button" className="bes-kira-chat-send" onClick={() => sendMessage()} disabled={!input.trim() || sending} aria-label={text.send} title={text.send}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 19V5m0 0-5.5 5.5M12 5l5.5 5.5" /></svg></button>
            </div>
            <small>{text.hint}</small>
          </footer>
        </section>
      ) : null}

      <button type="button" className="bes-kira-chat-launcher" onClick={() => setOpen((value) => !value)} aria-expanded={open} aria-label={open ? text.close : text.open} title={open ? text.close : text.open}>
        <span className="bes-kira-chat-launcher-glow" aria-hidden="true" />
        {open ? <ChatIcon close /> : <SparkIcon />}
        <span className="bes-kira-chat-online" aria-hidden="true" />
      </button>
    </div>
  );
}
