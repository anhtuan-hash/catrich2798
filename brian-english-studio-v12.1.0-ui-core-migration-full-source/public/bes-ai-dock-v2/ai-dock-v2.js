(() => {
  'use strict';

  const VERSION = '11.6.7';
  const HOST_ID = 'bes-ai-dock-v2-host';
  const STORE_KEY = 'bes.aiDockV2.state';
  const OPENROUTER_ENDPOINT = 'https://openrouter.ai/api/v1/chat/completions';
  const MAX_ATTACHMENTS = 5;
  const legacySelector = [
    '[data-bes-ai-panel-v1164]',
    '[data-bes-ai-panel-v1166]',
    '[data-bes-ai-composer-v1164]',
    '[data-bes-ai-composer-v1166]'
  ].join(',');

  let host = null;
  let shadow = null;
  let observer = null;
  let legacySweepTimer = 0;
  let recognition = null;
  let state = loadState();
  let attachments = [];

  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
  const clampText = (value, max) => String(value || '').replace(/\s+/g, ' ').trim().slice(0, max);
  const escapeHtml = (value) => String(value || '').replace(/[&<>"']/g, (char) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;'
  })[char]);

  function loadState() {
    try {
      const parsed = JSON.parse(localStorage.getItem(STORE_KEY) || '{}');
      return {
        open: Boolean(parsed.open),
        expanded: Boolean(parsed.expanded),
        messages: Array.isArray(parsed.messages) ? parsed.messages.slice(-30) : [],
        model: typeof parsed.model === 'string' ? parsed.model : '',
        usePageContext: parsed.usePageContext !== false
      };
    } catch {
      return { open: false, expanded: false, messages: [], model: '', usePageContext: true };
    }
  }

  function saveState() {
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify({
        open: state.open,
        expanded: state.expanded,
        messages: state.messages.slice(-30),
        model: state.model,
        usePageContext: state.usePageContext
      }));
    } catch {}
  }

  function visible(node) {
    if (!(node instanceof HTMLElement)) return false;
    const style = getComputedStyle(node);
    const rect = node.getBoundingClientRect();
    return style.display !== 'none' && style.visibility !== 'hidden' && Number(style.opacity) !== 0 && rect.width > 2 && rect.height > 2;
  }

  function isLegacyPanel(node) {
    if (!(node instanceof HTMLElement) || node === host || host?.contains(node)) return false;
    if (!visible(node)) return false;
    const rect = node.getBoundingClientRect();
    const style = getComputedStyle(node);
    const text = clampText(node.textContent, 600).toLowerCase();
    const fixedLike = style.position === 'fixed' || style.position === 'sticky';
    const rightDocked = rect.right >= innerWidth - 48 || Number.parseFloat(style.right) >= 0;
    const sizeMatches = rect.width >= 250 && rect.width <= 680 && rect.height >= 280 && rect.height <= innerHeight + 40;
    const identityMatches = text.includes('brian ai') && (text.includes('đang hoạt động') || text.includes('tệp') || text.includes('màn hình') || text.includes('enter để gửi'));
    return fixedLike && rightDocked && sizeMatches && identityMatches;
  }

  function isLegacyLauncher(node) {
    if (!(node instanceof HTMLElement) || node === host || host?.contains(node)) return false;
    if (!visible(node)) return false;
    const rect = node.getBoundingClientRect();
    const style = getComputedStyle(node);
    const text = clampText(node.getAttribute('aria-label') || node.getAttribute('title') || node.textContent, 100).toLowerCase();
    const fixedLike = style.position === 'fixed';
    const corner = rect.right >= innerWidth - 18 && rect.bottom >= innerHeight - 18;
    const compact = rect.width <= 120 && rect.height <= 120;
    return fixedLike && corner && compact && (text.includes('brian') || text.includes('ai'));
  }

  function removeLegacyAI() {
    document.querySelectorAll(legacySelector).forEach((node) => node.remove());
    const candidates = [...document.querySelectorAll('aside,[role="dialog"],dialog,section,div,button')];
    for (const node of candidates) {
      if (isLegacyPanel(node) || isLegacyLauncher(node)) node.remove();
    }
    document.documentElement.dataset.besAiDock = VERSION;
  }

  function scheduleLegacySweep(delay = 40) {
    clearTimeout(legacySweepTimer);
    legacySweepTimer = setTimeout(removeLegacyAI, delay);
  }

  function pageContext() {
    const selected = clampText(getSelection?.()?.toString?.(), 1400);
    const main = document.querySelector('main,[role="main"],#root,#app') || document.body;
    const raw = clampText(main?.innerText || '', 2600);
    return {
      route: location.hash || location.pathname,
      title: document.title,
      selected,
      excerpt: raw
    };
  }

  function deepStrings(value, path = '', depth = 0, output = []) {
    if (depth > 5 || output.length > 800) return output;
    if (typeof value === 'string') {
      output.push({ path, value });
      if ((value.startsWith('{') || value.startsWith('[')) && value.length < 50000) {
        try { deepStrings(JSON.parse(value), path, depth + 1, output); } catch {}
      }
      return output;
    }
    if (Array.isArray(value)) {
      value.slice(0, 100).forEach((item, index) => deepStrings(item, `${path}[${index}]`, depth + 1, output));
      return output;
    }
    if (value && typeof value === 'object') {
      Object.entries(value).slice(0, 160).forEach(([key, item]) => deepStrings(item, path ? `${path}.${key}` : key, depth + 1, output));
    }
    return output;
  }

  function storageStrings() {
    const output = [];
    for (const storage of [localStorage, sessionStorage]) {
      for (let index = 0; index < storage.length; index += 1) {
        const key = storage.key(index);
        if (!key) continue;
        const value = storage.getItem(key);
        deepStrings(value, key, 0, output);
      }
    }
    deepStrings(window.__BES_AI_CONFIG__, '__BES_AI_CONFIG__', 0, output);
    deepStrings(window.BES_AI_CONFIG, 'BES_AI_CONFIG', 0, output);
    return output;
  }

  function discoverProvider() {
    const values = storageStrings();
    const keyItem = values.find(({ value }) => /^sk-or-v1-[A-Za-z0-9_-]{20,}$/.test(value.trim())) ||
      values.find(({ path, value }) => /openrouter/i.test(path) && /^sk-[A-Za-z0-9_-]{20,}$/.test(value.trim()));
    const modelItem = values.find(({ path, value }) => /model/i.test(path) && /\//.test(value) && value.length < 180 && !value.startsWith('http'));
    return {
      provider: keyItem ? 'OpenRouter' : 'Chưa cấu hình',
      apiKey: keyItem?.value.trim() || '',
      model: state.model || modelItem?.value.trim() || 'openrouter/free'
    };
  }

  function bridgeCandidates() {
    return [window.BESAIAdapter, window.BrianAI, window.BESAI, window.__BRIAN_AI__]
      .filter((service) => service && typeof service.send === 'function');
  }

  async function callBridge(payload) {
    const candidates = bridgeCandidates();
    for (const service of candidates) {
      try {
        const result = await service.send.call(service, payload);
        const text = result?.text || result?.content || result?.message || (typeof result === 'string' ? result : '');
        if (text) return String(text);
      } catch {}
    }

    let settled = false;
    let bridgeValue = '';
    window.dispatchEvent(new CustomEvent('bes:ai-dock-request', {
      detail: {
        payload,
        respond(value) { settled = true; bridgeValue = value?.text || value?.content || String(value || ''); },
        reject() { settled = true; }
      }
    }));
    for (let index = 0; index < 8 && !settled; index += 1) await sleep(80);
    return bridgeValue;
  }

  function compactMessages(userText, ultra = false) {
    const context = state.usePageContext ? pageContext() : null;
    const history = state.messages.slice(ultra ? -2 : -6).map((message) => ({
      role: message.role === 'assistant' ? 'assistant' : 'user',
      content: clampText(message.content, ultra ? 500 : 1100)
    }));
    const contextText = context ? [
      `Trang: ${clampText(context.title, 160)}`,
      `Route: ${clampText(context.route, 160)}`,
      context.selected ? `Đoạn được chọn: ${clampText(context.selected, ultra ? 300 : 900)}` : '',
      `Nội dung trang: ${clampText(context.excerpt, ultra ? 500 : 1500)}`
    ].filter(Boolean).join('\n') : '';
    const attachmentText = attachments.map((item) => `${item.name}: ${clampText(item.text || '[tệp đính kèm]', ultra ? 250 : 700)}`).join('\n');
    const system = ultra
      ? 'Bạn là Brian AI. Trả lời ngắn gọn, chính xác bằng ngôn ngữ của người dùng.'
      : 'Bạn là Brian AI trong Brian English Studio. Hỗ trợ giáo viên tạo học liệu, phân tích nội dung trang và thực hiện tác vụ giáo dục. Không bịa dữ liệu; khi thiếu thông tin hãy nói rõ.';
    return [
      { role: 'system', content: system },
      ...(contextText ? [{ role: 'system', content: contextText }] : []),
      ...(attachmentText ? [{ role: 'system', content: `Tệp:\n${attachmentText}` }] : []),
      ...history,
      { role: 'user', content: clampText(userText, ultra ? 900 : 2600) }
    ];
  }

  async function callOpenRouter(userText, ultra = false) {
    const config = discoverProvider();
    if (!config.apiKey) {
      const error = new Error('AI_PROVIDER_MISSING');
      error.code = 'AI_PROVIDER_MISSING';
      throw error;
    }
    const response = await fetch(OPENROUTER_ENDPOINT, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': location.origin,
        'X-Title': 'Brian English Studio'
      },
      body: JSON.stringify({
        model: config.model || 'openrouter/free',
        messages: compactMessages(userText, ultra),
        max_tokens: ultra ? 420 : 700,
        temperature: 0.65
      })
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      const message = data?.error?.message || data?.message || `OpenRouter HTTP ${response.status}`;
      const error = new Error(message);
      error.status = response.status;
      throw error;
    }
    return data?.choices?.[0]?.message?.content || '';
  }

  async function sendToAI(userText) {
    const payload = {
      text: userText,
      messages: state.messages.slice(-10),
      attachments: attachments.map(({ name, type, size, text }) => ({ name, type, size, text })),
      context: state.usePageContext ? pageContext() : null,
      source: 'Brian AI Dock V2',
      version: VERSION
    };
    const bridge = await callBridge(payload);
    if (bridge) return bridge;
    try {
      return await callOpenRouter(userText, false);
    } catch (error) {
      if (/prompt tokens limit exceeded|context length|too many tokens|maximum context/i.test(error.message || '')) {
        return await callOpenRouter(userText, true);
      }
      throw error;
    }
  }

  function styles() {
    return `
      @font-face{font-family:"Brian Personal";src:url("/bes-fonts/brian-personal-font.woff2") format("woff2"),url("/bes-fonts/brian-personal-font.woff") format("woff"),url("/bes-fonts/brian-personal-font.ttf") format("truetype"),url("/bes-fonts/brian-personal-font.otf") format("opentype");font-style:normal;font-weight:100 900;font-display:swap}
      :host{all:initial;--accent:#265d97;--accent2:#6e5bd8;--surface:#fffdfa;--surface2:#f4f7fb;--text:#10263d;--muted:#607286;--line:#cdd9e5;--danger:#b42318;font-family:"Brian Personal",Arial,sans-serif;color:var(--text)}
      *,*::before,*::after{box-sizing:border-box;font-family:inherit}
      button,input,textarea{font:inherit}
      .launcher{position:fixed;right:22px;bottom:22px;z-index:2147483600;width:58px;height:58px;border:0;border-radius:20px;background:linear-gradient(135deg,var(--accent),var(--accent2));color:#fff;display:grid;place-items:center;box-shadow:0 18px 45px rgba(20,45,75,.28);cursor:pointer;font-size:24px;transition:transform .18s ease,box-shadow .18s ease}
      .launcher:hover{transform:translateY(-3px);box-shadow:0 22px 52px rgba(20,45,75,.34)}
      .panel{position:fixed;right:18px;bottom:18px;z-index:2147483601;width:min(410px,calc(100vw - 24px));height:min(650px,calc(100vh - 24px));background:var(--surface);border:1px solid rgba(79,101,124,.28);border-radius:28px;box-shadow:0 24px 70px rgba(18,38,60,.30);display:grid;grid-template-rows:auto auto minmax(0,1fr) auto;overflow:hidden;transform-origin:bottom right;animation:open .18s ease-out}
      .panel.expanded{right:18px;bottom:18px;width:min(760px,calc(100vw - 36px));height:min(820px,calc(100vh - 36px))}
      @keyframes open{from{opacity:0;transform:scale(.94) translateY(12px)}to{opacity:1;transform:none}}
      .header{min-height:74px;padding:13px 14px 12px 16px;background:linear-gradient(135deg,var(--accent),var(--accent2));color:#fff;display:flex;align-items:center;gap:11px}
      .mark{width:44px;height:44px;border-radius:15px;background:rgba(255,255,255,.18);display:grid;place-items:center;font-size:22px;border:1px solid rgba(255,255,255,.3)}
      .title{min-width:0;flex:1}.title strong{display:block;font-size:17px;line-height:1.15}.status{font-size:12px;opacity:.88;margin-top:4px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
      .header-actions{display:flex;gap:5px}.icon-btn{width:35px;height:35px;border:0;border-radius:12px;background:rgba(255,255,255,.12);color:#fff;display:grid;place-items:center;cursor:pointer}.icon-btn:hover{background:rgba(255,255,255,.24)}
      .context{padding:10px 14px;border-bottom:1px solid var(--line);background:var(--surface2);display:flex;align-items:center;gap:9px;font-size:12px;color:var(--muted)}
      .context-text{min-width:0;flex:1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.context strong{color:var(--text)}
      .context-toggle{appearance:none;width:36px;height:21px;border-radius:999px;background:#b8c4d0;position:relative;cursor:pointer;flex:0 0 auto}.context-toggle::after{content:"";position:absolute;width:15px;height:15px;border-radius:50%;background:white;left:3px;top:3px;transition:left .15s ease}.context-toggle:checked{background:var(--accent)}.context-toggle:checked::after{left:18px}
      .messages{min-height:0;overflow:auto;padding:14px;display:flex;flex-direction:column;gap:11px;scroll-behavior:smooth;background:linear-gradient(180deg,#fffdfa,#f8fafc)}
      .empty{margin:auto 8px;text-align:center;color:var(--muted)}.empty .big{font-size:28px;margin-bottom:8px}.empty strong{display:block;color:var(--text);font-size:16px;margin-bottom:5px}
      .chips{display:flex;flex-wrap:wrap;gap:7px;justify-content:center;margin-top:14px}.chip{border:1px solid var(--line);background:white;border-radius:999px;padding:8px 11px;color:var(--text);font-size:12px;cursor:pointer}.chip:hover{border-color:var(--accent);color:var(--accent)}
      .message{max-width:88%;border-radius:18px;padding:10px 12px;font-size:13.5px;line-height:1.5;white-space:pre-wrap;overflow-wrap:anywhere}.message.user{align-self:flex-end;background:var(--accent);color:#fff;border-bottom-right-radius:6px}.message.assistant{align-self:flex-start;background:white;border:1px solid var(--line);border-bottom-left-radius:6px}.message.error{align-self:stretch;max-width:100%;background:#fff2f0;border:1px solid #f3b7b1;color:var(--danger)}
      .typing{display:inline-flex;gap:5px;align-items:center}.typing i{width:6px;height:6px;border-radius:50%;background:var(--muted);animation:pulse .9s infinite alternate}.typing i:nth-child(2){animation-delay:.18s}.typing i:nth-child(3){animation-delay:.36s}@keyframes pulse{to{opacity:.25;transform:translateY(-2px)}}
      .composer{border-top:1px solid var(--line);background:var(--surface);padding:10px 11px 11px;display:grid;gap:8px;min-width:0}
      .attachment-list{display:flex;gap:6px;overflow:auto}.attachment{max-width:160px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;border:1px solid var(--line);border-radius:999px;padding:5px 9px;background:var(--surface2);font-size:11px;color:var(--muted)}
      .tool-row{display:flex;align-items:center;gap:6px;min-width:0}.tool{border:1px solid var(--line);background:white;border-radius:11px;padding:7px 9px;color:var(--text);font-size:12px;cursor:pointer;white-space:nowrap}.tool:hover{border-color:var(--accent)}.count{margin-left:auto;color:var(--muted);font-size:11px}
      .input-shell{position:relative;display:block;width:100%;min-width:0}.editor{display:block!important;width:100%!important;min-width:0!important;max-width:100%!important;height:92px!important;min-height:82px!important;max-height:220px!important;resize:none!important;border:1px solid var(--line)!important;border-radius:17px!important;padding:13px 58px 13px 13px!important;background:white!important;color:var(--text)!important;writing-mode:horizontal-tb!important;text-orientation:mixed!important;white-space:pre-wrap!important;overflow-wrap:anywhere!important;line-height:1.45!important;outline:none!important;box-shadow:none!important}.editor:focus{border-color:var(--accent)!important;box-shadow:0 0 0 3px color-mix(in srgb,var(--accent) 18%,transparent)!important}
      .send{position:absolute;right:8px;bottom:8px;width:43px;height:43px;border:0;border-radius:15px;background:var(--accent);color:#fff;display:grid;place-items:center;cursor:pointer;font-size:19px}.send:disabled{opacity:.45;cursor:not-allowed}
      .provider-warning{display:flex;align-items:center;gap:8px;background:#fff8df;border:1px solid #ecd991;border-radius:12px;padding:8px 9px;font-size:11.5px;color:#715c11}.provider-warning button{margin-left:auto;border:1px solid #d9b94f;background:white;border-radius:9px;padding:5px 8px;cursor:pointer;color:#715c11}
      .hidden{display:none!important}.file-input{display:none}.sr-only{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0}
      @media(max-width:560px){.panel,.panel.expanded{right:8px;bottom:8px;width:calc(100vw - 16px);height:calc(100vh - 16px);border-radius:22px}.launcher{right:14px;bottom:14px}.editor{height:86px!important;min-height:78px!important}.tool{padding:7px 8px}}
      @media(prefers-reduced-motion:reduce){*,*::before,*::after{animation:none!important;transition:none!important;scroll-behavior:auto!important}}
    `;
  }

  function template() {
    return `
      <button class="launcher" type="button" aria-label="Mở Brian AI" title="Brian AI">✦</button>
      <section class="panel hidden" role="dialog" aria-label="Brian AI Dock V2">
        <header class="header">
          <div class="mark">✦</div>
          <div class="title"><strong>Brian AI</strong><div class="status">Dock V2 · Giao diện cô lập</div></div>
          <div class="header-actions">
            <button class="icon-btn clear" type="button" aria-label="Xóa hội thoại" title="Xóa hội thoại">↻</button>
            <button class="icon-btn expand" type="button" aria-label="Mở rộng" title="Mở rộng">↗</button>
            <button class="icon-btn close" type="button" aria-label="Đóng" title="Đóng">×</button>
          </div>
        </header>
        <div class="context"><span>Trang hiện tại:</span><strong class="context-text"></strong><input class="context-toggle" type="checkbox" aria-label="Dùng ngữ cảnh trang" /></div>
        <main class="messages" aria-live="polite"></main>
        <footer class="composer">
          <div class="provider-warning hidden"><span>⚠</span><span>Chưa tìm thấy cấu hình OpenRouter.</span><button type="button">Mở thiết lập</button></div>
          <div class="attachment-list hidden"></div>
          <div class="tool-row">
            <button class="tool attach" type="button">📎 Tệp</button>
            <button class="tool screen" type="button">▣ Màn hình</button>
            <button class="tool voice" type="button">🎙 Nói</button>
            <span class="count">0/${MAX_ATTACHMENTS}</span>
          </div>
          <div class="input-shell">
            <label class="sr-only" for="bes-ai-dock-editor">Nhắn tin cho Brian AI</label>
            <textarea id="bes-ai-dock-editor" class="editor" rows="3" placeholder="Nhắn tin cho Brian AI…"></textarea>
            <button class="send" type="button" aria-label="Gửi">➤</button>
          </div>
          <input class="file-input" type="file" multiple />
        </footer>
      </section>`;
  }

  function q(selector) { return shadow.querySelector(selector); }

  function renderContext() {
    const context = pageContext();
    q('.context-text').textContent = context.title || context.route || 'Trang hiện tại';
    q('.context-toggle').checked = state.usePageContext;
    const provider = discoverProvider();
    const gatewayAvailable = bridgeCandidates().length > 0;
    q('.status').textContent = gatewayAvailable
      ? 'AI Gateway · Đã kết nối'
      : provider.apiKey
        ? `${provider.provider} · ${provider.model}`
        : 'Dock V2 · Chưa cấu hình AI';
    q('.provider-warning').classList.toggle('hidden', gatewayAvailable || Boolean(provider.apiKey));
  }

  function renderMessages() {
    const node = q('.messages');
    if (!state.messages.length) {
      node.innerHTML = `<div class="empty"><div class="big">✦</div><strong>Brian AI đã sẵn sàng</strong><div>Ô nhập mới được dựng trong Shadow DOM nên không còn chịu CSS của ứng dụng.</div><div class="chips"><button class="chip">Tạo một hoạt động dạy học B2-C1</button><button class="chip">Giải thích nội dung trên trang này</button><button class="chip">Gợi ý bước tiếp theo cho tôi</button></div></div>`;
    } else {
      node.innerHTML = state.messages.map((message) => `<div class="message ${message.role === 'user' ? 'user' : message.role === 'error' ? 'error' : 'assistant'}">${escapeHtml(message.content)}</div>`).join('');
    }
    node.scrollTop = node.scrollHeight;
  }

  function renderAttachments() {
    const list = q('.attachment-list');
    list.classList.toggle('hidden', attachments.length === 0);
    list.innerHTML = attachments.map((item, index) => `<button type="button" class="attachment" data-index="${index}" title="Bấm để bỏ tệp">${escapeHtml(item.name)}</button>`).join('');
    q('.count').textContent = `${attachments.length}/${MAX_ATTACHMENTS}`;
  }

  function toggle(open = !state.open) {
    state.open = Boolean(open);
    q('.panel').classList.toggle('hidden', !state.open);
    q('.launcher').classList.toggle('hidden', state.open);
    saveState();
    if (state.open) {
      renderContext();
      renderMessages();
      setTimeout(() => q('.editor')?.focus(), 60);
    }
  }

  function setBusy(busy) {
    q('.send').disabled = busy;
    q('.editor').disabled = busy;
    q('.send').textContent = busy ? '…' : '➤';
  }

  async function handleSend(prefill = '') {
    const editor = q('.editor');
    const text = clampText(prefill || editor.value, 6000);
    if (!text) return;
    editor.value = '';
    state.messages.push({ role: 'user', content: text });
    renderMessages();
    saveState();
    setBusy(true);
    const typing = document.createElement('div');
    typing.className = 'message assistant';
    typing.innerHTML = '<span class="typing"><i></i><i></i><i></i></span>';
    q('.messages').appendChild(typing);
    q('.messages').scrollTop = q('.messages').scrollHeight;
    try {
      const reply = await sendToAI(text);
      typing.remove();
      state.messages.push({ role: 'assistant', content: reply || 'AI không trả về nội dung.' });
      attachments = [];
      renderAttachments();
    } catch (error) {
      typing.remove();
      const missing = error?.code === 'AI_PROVIDER_MISSING' || error?.message === 'AI_PROVIDER_MISSING';
      state.messages.push({
        role: 'error',
        content: missing
          ? 'Chưa tìm thấy API key OpenRouter trong cấu hình của ứng dụng. Hãy mở Cài đặt → API key rồi lưu lại.'
          : `Không thể gửi yêu cầu: ${error?.message || 'Lỗi không xác định'}`
      });
    } finally {
      setBusy(false);
      renderContext();
      renderMessages();
      saveState();
      editor.focus();
    }
  }

  async function readFiles(fileList) {
    const files = [...fileList].slice(0, Math.max(0, MAX_ATTACHMENTS - attachments.length));
    for (const file of files) {
      let text = '';
      if (/^(text\/|application\/(json|xml|javascript))/.test(file.type) || /\.(txt|md|csv|json|html|css|js|ts|tsx|jsx)$/i.test(file.name)) {
        try { text = (await file.text()).slice(0, 5000); } catch {}
      }
      attachments.push({ name: file.name, type: file.type, size: file.size, text });
    }
    renderAttachments();
  }

  async function captureScreen() {
    if (!navigator.mediaDevices?.getDisplayMedia) {
      state.messages.push({ role: 'error', content: 'Trình duyệt này chưa hỗ trợ chụp màn hình trực tiếp.' });
      renderMessages();
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: false });
      const video = document.createElement('video');
      video.srcObject = stream;
      await video.play();
      await sleep(180);
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth || 1280;
      canvas.height = video.videoHeight || 720;
      canvas.getContext('2d').drawImage(video, 0, 0, canvas.width, canvas.height);
      stream.getTracks().forEach((track) => track.stop());
      const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.82));
      attachments.push({ name: `screen-${Date.now()}.jpg`, type: 'image/jpeg', size: blob?.size || 0, text: '[Ảnh chụp màn hình]' });
      renderAttachments();
    } catch {}
  }

  function toggleVoice() {
    const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!Recognition) {
      state.messages.push({ role: 'error', content: 'Trình duyệt này chưa hỗ trợ nhập liệu bằng giọng nói.' });
      renderMessages();
      return;
    }
    if (recognition) {
      recognition.stop();
      recognition = null;
      q('.voice').textContent = '🎙 Nói';
      return;
    }
    recognition = new Recognition();
    recognition.lang = document.documentElement.lang?.startsWith('en') ? 'en-US' : 'vi-VN';
    recognition.interimResults = true;
    recognition.continuous = true;
    recognition.onresult = (event) => {
      const transcript = [...event.results].map((result) => result[0].transcript).join(' ');
      q('.editor').value = transcript;
    };
    recognition.onend = () => { recognition = null; q('.voice').textContent = '🎙 Nói'; };
    recognition.start();
    q('.voice').textContent = '■ Dừng';
  }

  function bind() {
    q('.launcher').addEventListener('click', () => toggle(true));
    q('.close').addEventListener('click', () => toggle(false));
    q('.expand').addEventListener('click', () => {
      state.expanded = !state.expanded;
      q('.panel').classList.toggle('expanded', state.expanded);
      q('.expand').textContent = state.expanded ? '↙' : '↗';
      saveState();
    });
    q('.clear').addEventListener('click', () => {
      state.messages = [];
      attachments = [];
      renderMessages();
      renderAttachments();
      saveState();
    });
    q('.context-toggle').addEventListener('change', (event) => { state.usePageContext = event.target.checked; saveState(); });
    q('.attach').addEventListener('click', () => q('.file-input').click());
    q('.file-input').addEventListener('change', (event) => readFiles(event.target.files));
    q('.screen').addEventListener('click', captureScreen);
    q('.voice').addEventListener('click', toggleVoice);
    q('.send').addEventListener('click', () => handleSend());
    q('.editor').addEventListener('keydown', (event) => {
      if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault();
        handleSend();
      }
    });
    q('.messages').addEventListener('click', (event) => {
      const chip = event.target.closest('.chip');
      if (chip) handleSend(chip.textContent);
    });
    q('.attachment-list').addEventListener('click', (event) => {
      const item = event.target.closest('[data-index]');
      if (!item) return;
      attachments.splice(Number(item.dataset.index), 1);
      renderAttachments();
    });
    q('.provider-warning button').addEventListener('click', () => {
      window.dispatchEvent(new CustomEvent('bes:open-ai-settings'));
      location.hash = '#/settings';
      toggle(false);
    });
    addEventListener('hashchange', renderContext);
  }

  function mount() {
    removeLegacyAI();
    document.getElementById(HOST_ID)?.remove();
    host = document.createElement('div');
    host.id = HOST_ID;
    host.dataset.version = VERSION;
    shadow = host.attachShadow({ mode: 'open' });
    shadow.innerHTML = `<style>${styles()}</style>${template()}`;
    document.body.appendChild(host);
    bind();
    q('.panel').classList.toggle('expanded', state.expanded);
    q('.expand').textContent = state.expanded ? '↙' : '↗';
    renderContext();
    renderMessages();
    renderAttachments();
    toggle(state.open);

    observer = new MutationObserver((records) => {
      if (records.some((record) => record.addedNodes.length || record.removedNodes.length)) scheduleLegacySweep(25);
    });
    observer.observe(document.documentElement, { childList: true, subtree: true });
    setInterval(removeLegacyAI, 1800);
    window.dispatchEvent(new CustomEvent('bes:ai-dock-ready', { detail: { version: VERSION } }));
  }

  window.BESAIDockV2 = {
    version: VERSION,
    open: () => toggle(true),
    close: () => toggle(false),
    removeLegacyAI,
    provider: discoverProvider,
    destroy() {
      observer?.disconnect();
      clearTimeout(legacySweepTimer);
      recognition?.stop?.();
      host?.remove();
    }
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount, { once: true });
  else mount();
})();
