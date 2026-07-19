import React from 'react';

export default function ApiNotice({ language, hasApiKey }) {
  if (hasApiKey) {
    return (
      <div className="api-notice success">
        <div>
          <strong>🔐 API Key ready</strong>
          <p>{language === 'vi' ? 'Các công cụ AI dùng key đã lưu trong trình duyệt.' : 'AI tools can use the key stored in this browser.'}</p>
        </div>
        <button onClick={() => (window.location.hash = '#/settings')}>{language === 'vi' ? 'Cài đặt' : 'Settings'}</button>
      </div>
    );
  }

  return (
    <div className="api-notice">
      <div>
        <strong>🔑 API Key Required</strong>
        <p>{language === 'vi' ? 'Công cụ AI cần API key từ provider đã chọn: Gemini, OpenAI, Claude, Groq, OpenRouter, Mistral hoặc endpoint riêng.' : 'AI tools need an API key from your selected provider: Gemini, OpenAI, Claude, Groq, OpenRouter, Mistral or custom endpoints.'}</p>
      </div>
      <button onClick={() => (window.location.hash = '#/settings')}>{language === 'vi' ? 'Nhập API key' : 'Add API key'}</button>
    </div>
  );
}
