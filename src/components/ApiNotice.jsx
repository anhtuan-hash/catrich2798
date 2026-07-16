import React from 'react';

export default function ApiNotice({ language, hasApiKey }) {
  if (hasApiKey) {
    return (
      <div className="api-notice success">
        <div>
          <strong>🔐 API Key ready</strong>
          <p>{language === 'vi' ? 'Toàn bộ công cụ AI dùng chung OpenRouter key đã lưu trong trình duyệt.' : 'All AI tools use the shared OpenRouter key stored in this browser.'}</p>
        </div>
        <button onClick={() => (window.location.hash = '#/settings')}>{language === 'vi' ? 'Cài đặt' : 'Settings'}</button>
      </div>
    );
  }

  return (
    <div className="api-notice">
      <div>
        <strong>🔑 API Key Required</strong>
        <p>{language === 'vi' ? 'Toàn bộ chức năng AI cần một OpenRouter API key dùng chung.' : 'All AI features require one shared OpenRouter API key.'}</p>
      </div>
      <button onClick={() => (window.location.hash = '#/settings')}>{language === 'vi' ? 'Nhập API key' : 'Add API key'}</button>
    </div>
  );
}
