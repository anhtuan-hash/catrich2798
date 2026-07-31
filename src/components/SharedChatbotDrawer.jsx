import React, { useEffect, useMemo, useRef, useState } from 'react';
import { isSupabaseConfigured, supabase } from '../utils/supabase.js';
import '../styles/SharedChatbotDrawer.css';

const MAX_HISTORY = 24;

function createWelcome(language) {
  return {
    id: `welcome-${language}`,
    role: 'assistant',
    content: language === 'vi'
      ? 'Xin chào! Tôi là Brian AI, được vận hành bởi Kira AI. Tôi có thể hỗ trợ soạn bài, thiết kế hoạt động, giải thích ngữ pháp và xử lý công việc chuyên môn.'
      : 'Hello! I am Brian AI, powered by Kira AI. I can help with lesson planning, classroom activities, grammar explanations, and professional tasks.',
  };
}

function normalizeStoredMessages(value, language) {
  if (!Array.isArray(value)) return [createWelcome(language)];
  const messages = value
    .filter((item) => item && ['user', 'assistant'].includes(item.role) && typeof item.content === 'string')
    .map((item, index) => ({
      id: String(item.id || `${item.role}-${index}-${Date.now()}`),
      role: item.role,
      content: item.content.slice(0, 12000),
    }))
    .slice(-MAX_HISTORY);
  return messages.length ? messages : [createWelcome(language)];
}

function ChatIcon({ close = false }) {
  if (close) {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M6.4 6.4 17.6 17.6M17.6 6.4 6.4 17.6" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M5.4 4.5h13.2a2.9 2.9 0 0 1 2.9 2.9v7.1a2.9 2.9 0 0 1-2.9 2.9h-7.2L6 21v-3.6h-.6a2.9 2.9 0 0 1-2.9-2.9V7.4a2.9 2.9 0 0 1 2.9-2.9Z" />
      <path d="M7 10.9h.01M12 10.9h.01M17 10.9h.01" />
    </svg>
  );
}

export default function SharedChatbotDrawer({ currentUser, language = 'vi' }) {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [messages, setMessages] = useState(() => [createWelcome(language)]);
  const scrollRef = useRef(null);
  const inputRef = useRef(null);
  const abortRef = useRef(null);

  const storageKey = useMemo(() => {
    const identity = currentUser?.id || currentUser?.email || 'signed-in-user';
    return `bes-kira-chat:${identity}`;
  }, [currentUser?.id, currentUser?.email]);

  const text = language === 'vi'
    ? {
        title: 'Brian AI',
        powered: 'Kết nối Kira AI',
        open: 'Mở Brian AI',
        close: 'Đóng Brian AI',
        clear: 'Xóa hội thoại',
        placeholder: 'Nhập câu hỏi hoặc yêu cầu…',
        send: 'Gửi',
        thinking: 'Đang suy nghĩ…',
        error: 'Tôi chưa thể phản hồi lúc này. Vui lòng thử lại sau.',
        setup: 'Chatbot chưa được cấu hình API key Kira AI trên máy chủ.',
        session: 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.',
        hint: 'Enter để gửi · Shift + Enter xuống dòng',
      }
    : {
        title: 'Brian AI',
        powered: 'Connected to Kira AI',
        open: 'Open Brian AI',
        close: 'Close Brian AI',
        clear: 'Clear conversation',
        placeholder: 'Ask a question or enter a request…',
        send: 'Send',
        thinking: 'Thinking…',
        error: 'I cannot respond right now. Please try again later.',
        setup: 'The Kira AI API key has not been configured on the server.',
        session: 'Your session has expired. Please sign in again.',
        hint: 'Enter to send · Shift + Enter for a new line',
      };

  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      setMessages(raw ? normalizeStoredMessages(JSON.parse(raw), language) : [createWelcome(language)]);
    } catch {
      setMessages([createWelcome(language)]);
    }
  }, [storageKey, language]);

  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(messages.slice(-MAX_HISTORY)));
    } catch {
      // Chat history persistence is optional.
    }
  }, [messages, storageKey]);

  useEffect(() => {
    if (!open) return;
    const timer = window.setTimeout(() => inputRef.current?.focus(), 120);
    return () => window.clearTimeout(timer);
  }, [open]);

  useEffect(() => {
    const node = scrollRef.current;
    if (node) node.scrollTop = node.scrollHeight;
  }, [messages, sending, open]);

  useEffect(() => () => abortRef.current?.abort(), []);

  const clearConversation = () => {
    abortRef.current?.abort();
    setSending(false);
    setMessages([createWelcome(language)]);
    setInput('');
    inputRef.current?.focus();
  };

  const sendMessage = async () => {
    const content = input.trim();
    if (!content || sending) return;

    const userMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: content.slice(0, 8000),
    };
    const nextMessages = [...messages, userMessage].slice(-MAX_HISTORY);
    setMessages(nextMessages);
    setInput('');
    setSending(true);

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const headers = { 'Content-Type': 'application/json' };
      if (isSupabaseConfigured) {
        const { data } = await supabase.auth.getSession();
        const token = data?.session?.access_token;
        if (!token) throw new Error(text.session);
        headers.Authorization = `Bearer ${token}`;
      }

      const response = await fetch('/api/kira-chat', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          language,
          messages: nextMessages.map(({ role, content: messageContent }) => ({ role, content: messageContent })),
        }),
        signal: controller.signal,
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        const message = payload?.code === 'KIRAAI_NOT_CONFIGURED'
          ? text.setup
          : payload?.code === 'UNAUTHORIZED'
            ? text.session
            : (payload?.error || text.error);
        throw new Error(message);
      }
      const answer = String(payload?.message || '').trim();
      if (!answer) throw new Error(text.error);
      setMessages((current) => [...current, {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: answer,
      }].slice(-MAX_HISTORY));
    } catch (error) {
      if (error?.name === 'AbortError') return;
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
    if (event.key === 'Escape') {
      setOpen(false);
      return;
    }
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className={`bes-kira-chat-root${open ? ' is-open' : ''}`} data-kira-chat-root>
      {open ? (
        <section className="bes-kira-chat-panel" role="dialog" aria-modal="false" aria-label={text.title}>
          <header className="bes-kira-chat-header">
            <div className="bes-kira-chat-brand" aria-hidden="true">AI</div>
            <div className="bes-kira-chat-heading">
              <strong>{text.title}</strong>
              <span><i />{text.powered}</span>
            </div>
            <div className="bes-kira-chat-actions">
              <button type="button" onClick={clearConversation} title={text.clear} aria-label={text.clear}>
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 7h14M9 7V4h6v3m-8 0 1 13h8l1-13M10 11v5M14 11v5" /></svg>
              </button>
              <button type="button" onClick={() => setOpen(false)} title={text.close} aria-label={text.close}>
                <ChatIcon close />
              </button>
            </div>
          </header>

          <div ref={scrollRef} className="bes-kira-chat-messages" aria-live="polite">
            {messages.map((message) => (
              <div key={message.id} className={`bes-kira-chat-message is-${message.role}${message.error ? ' is-error' : ''}`}>
                {message.role === 'assistant' ? <span className="bes-kira-chat-avatar" aria-hidden="true">AI</span> : null}
                <div className="bes-kira-chat-bubble">{message.content}</div>
              </div>
            ))}
            {sending ? (
              <div className="bes-kira-chat-message is-assistant">
                <span className="bes-kira-chat-avatar" aria-hidden="true">AI</span>
                <div className="bes-kira-chat-bubble bes-kira-chat-thinking">
                  <span /><span /><span /><em>{text.thinking}</em>
                </div>
              </div>
            ) : null}
          </div>

          <footer className="bes-kira-chat-composer">
            <div className="bes-kira-chat-input-wrap">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(event) => setInput(event.target.value)}
                onKeyDown={onComposerKeyDown}
                placeholder={text.placeholder}
                rows={1}
                maxLength={8000}
                aria-label={text.placeholder}
                disabled={sending}
              />
              <button type="button" className="bes-kira-chat-send" onClick={sendMessage} disabled={!input.trim() || sending} aria-label={text.send} title={text.send}>
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m4 4 17 8-17 8 3-8-3-8Zm3 8h14" /></svg>
              </button>
            </div>
            <small>{text.hint}</small>
          </footer>
        </section>
      ) : null}

      <button type="button" className="bes-kira-chat-launcher" onClick={() => setOpen((value) => !value)} aria-expanded={open} aria-label={open ? text.close : text.open} title={open ? text.close : text.open}>
        <span className="bes-kira-chat-launcher-glow" aria-hidden="true" />
        <ChatIcon close={open} />
        <span className="bes-kira-chat-online" aria-hidden="true" />
      </button>
    </div>
  );
}
