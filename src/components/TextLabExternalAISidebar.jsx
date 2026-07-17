import React, { useMemo, useState } from 'react';
import './TextLabExternalAISidebar.css';

const PLATFORM_LINKS = Object.freeze({
  chatgpt: 'https://chatgpt.com/',
  gemini: 'https://gemini.google.com/app',
});

const DEFAULT_PROMPTS = Object.freeze({
  vi: [
    'Viết giáo án tiếng Anh về chủ đề môi trường cho lớp 10 trong 45 phút.',
    'Gợi ý 10 hoạt động khởi động (warm-up) cho bài học về chủ đề gia đình.',
    'Tạo 5 câu hỏi tư duy bậc cao (HOTS) cho bài đọc sau.',
    'Đề xuất một dự án nhóm cho chủ đề “Bảo vệ môi trường”.',
  ],
  en: [
    'Write a 45-minute Grade 10 English lesson plan about the environment.',
    'Suggest 10 warm-up activities for a lesson about family.',
    'Create 5 higher-order thinking questions for the following reading text.',
    'Suggest a group project for the topic “Protecting the environment”.',
  ],
});

const CUSTOM_PROMPTS_KEY = 'bes-textlab-external-ai-prompts-v1';

function readCustomPrompts() {
  try {
    const value = JSON.parse(window.localStorage.getItem(CUSTOM_PROMPTS_KEY) || '[]');
    return Array.isArray(value) ? value.filter(Boolean).slice(0, 12) : [];
  } catch {
    return [];
  }
}

function saveCustomPrompts(prompts) {
  try {
    window.localStorage.setItem(CUSTOM_PROMPTS_KEY, JSON.stringify(prompts.slice(0, 12)));
  } catch {
    // The sidebar remains usable when storage is unavailable.
  }
}

function PlatformMark({ platform }) {
  if (platform === 'gemini') return <span className="textlab-ai-platform-mark gemini" aria-hidden="true">✦</span>;
  return <span className="textlab-ai-platform-mark chatgpt" aria-hidden="true">◎</span>;
}

export default function TextLabExternalAISidebar({
  language = 'vi',
  open = true,
  onToggle,
}) {
  const vi = language === 'vi';
  const [platform, setPlatform] = useState('chatgpt');
  const [customPrompts, setCustomPrompts] = useState(readCustomPrompts);
  const [showAddPrompt, setShowAddPrompt] = useState(false);
  const [draftPrompt, setDraftPrompt] = useState('');
  const [notice, setNotice] = useState('');

  const prompts = useMemo(
    () => [...DEFAULT_PROMPTS[vi ? 'vi' : 'en'], ...customPrompts],
    [customPrompts, vi],
  );

  const platformName = platform === 'gemini' ? 'Google Gemini' : 'ChatGPT';

  const copyPrompt = async (prompt) => {
    const value = String(prompt || '').trim();
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
      setNotice(vi ? 'Đã sao chép prompt.' : 'Prompt copied.');
    } catch {
      const textarea = document.createElement('textarea');
      textarea.value = value;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      textarea.remove();
      setNotice(vi ? 'Đã sao chép prompt.' : 'Prompt copied.');
    }
    window.setTimeout(() => setNotice(''), 2200);
  };

  const openPlatform = (targetPlatform = platform, prompt = '') => {
    const url = PLATFORM_LINKS[targetPlatform] || PLATFORM_LINKS.chatgpt;
    window.open(url, '_blank', 'noopener,noreferrer');
    if (prompt) void copyPrompt(prompt);
  };

  const addPrompt = () => {
    const nextPrompt = draftPrompt.trim();
    if (!nextPrompt) return;
    const next = [nextPrompt, ...customPrompts.filter((item) => item !== nextPrompt)].slice(0, 12);
    setCustomPrompts(next);
    saveCustomPrompts(next);
    setDraftPrompt('');
    setShowAddPrompt(false);
    setNotice(vi ? 'Đã thêm prompt nhanh.' : 'Quick prompt added.');
    window.setTimeout(() => setNotice(''), 2200);
  };

  const removeCustomPrompt = (prompt) => {
    const next = customPrompts.filter((item) => item !== prompt);
    setCustomPrompts(next);
    saveCustomPrompts(next);
  };

  if (!open) {
    return (
      <button
        type="button"
        className="textlab-ai-sidebar-reopen"
        onClick={onToggle}
        aria-label={vi ? 'Hiện thanh trợ lý AI' : 'Show AI assistant sidebar'}
      >
        <span>AI</span>
        <b>{vi ? 'Trợ lý' : 'Assistant'}</b>
        <i aria-hidden="true">‹</i>
      </button>
    );
  }

  return (
    <aside className="textlab-ai-sidebar" aria-label={vi ? 'Trợ lý AI bên ngoài' : 'External AI assistant'}>
      <header className="textlab-ai-sidebar-header">
        <div>
          <span className="textlab-ai-sidebar-kicker">EXTERNAL AI</span>
          <h2>{vi ? 'Trợ lý AI bên ngoài' : 'External AI assistant'} <small title={vi ? 'Mở nền tảng AI trong tab mới' : 'Opens AI platforms in a new tab'}>i</small></h2>
          <p>{vi
            ? 'Kết nối nhanh với các nền tảng AI để hỗ trợ soạn bài, brainstorm ý tưởng và hoàn thiện hoạt động.'
            : 'Quickly access AI platforms for lesson planning, brainstorming, and activity design.'}</p>
        </div>
        <button type="button" className="textlab-ai-hide" onClick={onToggle}>
          <span aria-hidden="true">»</span>{vi ? 'Ẩn thanh bên' : 'Hide sidebar'}
        </button>
      </header>

      <div className="textlab-ai-platform-tabs" role="tablist" aria-label={vi ? 'Chọn nền tảng AI' : 'Choose an AI platform'}>
        <button
          type="button"
          role="tab"
          aria-selected={platform === 'chatgpt'}
          className={platform === 'chatgpt' ? 'is-active' : ''}
          onClick={() => setPlatform('chatgpt')}
        >
          <PlatformMark platform="chatgpt" />
          <span>ChatGPT</span>
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={platform === 'gemini'}
          className={platform === 'gemini' ? 'is-active' : ''}
          onClick={() => setPlatform('gemini')}
        >
          <PlatformMark platform="gemini" />
          <span>Google Gemini</span>
        </button>
      </div>

      <section className="textlab-ai-section">
        <div className="textlab-ai-section-heading">
          <div>
            <h3>{vi ? 'Prompt nhanh cho giáo viên' : 'Quick prompts for teachers'}</h3>
            <p>{vi ? 'Sao chép hoặc mở nền tảng đang chọn.' : 'Copy or open the selected platform.'}</p>
          </div>
          <button type="button" onClick={() => setShowAddPrompt((value) => !value)}>
            {showAddPrompt ? '×' : '+'} {vi ? (showAddPrompt ? 'Đóng' : 'Thêm prompt') : (showAddPrompt ? 'Close' : 'Add prompt')}
          </button>
        </div>

        {showAddPrompt ? (
          <div className="textlab-ai-add-prompt">
            <textarea
              value={draftPrompt}
              onChange={(event) => setDraftPrompt(event.target.value)}
              placeholder={vi ? 'Nhập prompt thường dùng của bạn…' : 'Enter a prompt you use often…'}
              rows={3}
              maxLength={700}
            />
            <div>
              <small>{draftPrompt.length}/700</small>
              <button type="button" onClick={addPrompt} disabled={!draftPrompt.trim()}>{vi ? 'Lưu prompt' : 'Save prompt'}</button>
            </div>
          </div>
        ) : null}

        <div className="textlab-ai-prompt-list">
          {prompts.map((prompt, index) => {
            const custom = customPrompts.includes(prompt);
            return (
              <article key={`${prompt}-${index}`} className="textlab-ai-prompt-row">
                <span className={`prompt-number tone-${index % 4}`} aria-hidden="true">{index + 1}</span>
                <p>{prompt}</p>
                <div>
                  <button type="button" title={vi ? 'Sao chép prompt' : 'Copy prompt'} onClick={() => copyPrompt(prompt)} aria-label={vi ? 'Sao chép prompt' : 'Copy prompt'}>▣</button>
                  <button type="button" title={`${vi ? 'Mở bằng' : 'Open with'} ${platformName}`} onClick={() => openPlatform(platform, prompt)} aria-label={`${vi ? 'Mở bằng' : 'Open with'} ${platformName}`}>↗</button>
                  {custom ? <button type="button" className="remove" title={vi ? 'Xoá prompt' : 'Delete prompt'} onClick={() => removeCustomPrompt(prompt)} aria-label={vi ? 'Xoá prompt' : 'Delete prompt'}>×</button> : null}
                </div>
              </article>
            );
          })}
        </div>
      </section>

      <section className="textlab-ai-section textlab-ai-launch-section">
        <div className="textlab-ai-section-heading simple">
          <div>
            <h3>{vi ? 'Mở nhanh & trò chuyện' : 'Open and start chatting'}</h3>
            <p>{vi ? 'Nền tảng sẽ mở trong tab mới để không làm mất nội dung TextLab.' : 'The platform opens in a new tab so your TextLab work stays intact.'}</p>
          </div>
        </div>

        <article className="textlab-ai-launch-card chatgpt">
          <div>
            <PlatformMark platform="chatgpt" />
            <span><strong>ChatGPT</strong><small>{vi ? 'Mở ChatGPT để chat và làm việc.' : 'Open ChatGPT to chat and work.'}</small></span>
          </div>
          <button type="button" onClick={() => openPlatform('chatgpt')}>{vi ? 'Mở trong tab mới' : 'Open in new tab'} ↗</button>
          <i aria-hidden="true">◌</i>
        </article>

        <article className="textlab-ai-launch-card gemini">
          <div>
            <PlatformMark platform="gemini" />
            <span><strong>Google Gemini</strong><small>{vi ? 'Mở Gemini để chat và làm việc.' : 'Open Gemini to chat and work.'}</small></span>
          </div>
          <button type="button" onClick={() => openPlatform('gemini')}>{vi ? 'Mở trong tab mới' : 'Open in new tab'} ↗</button>
          <i aria-hidden="true">✦</i>
        </article>
      </section>

      <footer className="textlab-ai-sidebar-tip">
        <span aria-hidden="true">💡</span>
        <p><strong>{vi ? 'Mẹo sử dụng' : 'Tip'}</strong>{vi
          ? 'Sao chép prompt trước, sau đó dán vào ChatGPT hoặc Gemini để tiếp tục làm việc.'
          : 'Copy a prompt first, then paste it into ChatGPT or Gemini to continue working.'}</p>
      </footer>

      {notice ? <div className="textlab-ai-notice" role="status">✓ {notice}</div> : null}
    </aside>
  );
}
