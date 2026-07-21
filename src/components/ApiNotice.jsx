import React from 'react';

export default function ApiNotice({ language, hasApiKey }) {
  if (hasApiKey) {
    return (
      <div className="api-notice success">
        <div>
          <strong>🔐 OpenRouter Gateway ready</strong>
          <p>{language === 'vi' ? 'Máy chủ đã xác thực OpenRouter. API key không được lưu trong trình duyệt.' : 'The server has verified OpenRouter. The API key is not stored in this browser.'}</p>
        </div>
        <button onClick={() => (window.location.hash = '#/settings')}>{language === 'vi' ? 'Cài đặt' : 'Settings'}</button>
      </div>
    );
  }

  return (
      <div className="api-notice">
        <div>
        <strong>⚠ OpenRouter Gateway unavailable</strong>
        <p>{language === 'vi' ? 'Máy chủ chưa xác thực được OPENROUTER_API_KEY hoặc phiên đăng nhập đã hết hạn.' : 'The server could not verify OPENROUTER_API_KEY, or the sign-in session has expired.'}</p>
      </div>
      <button onClick={() => (window.location.hash = '#/settings')}>{language === 'vi' ? 'Kiểm tra gateway' : 'Check gateway'}</button>
    </div>
  );
}
