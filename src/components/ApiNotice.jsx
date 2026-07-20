import React from 'react';

export default function ApiNotice({ language, hasApiKey }) {
  return <section className={`api-notice ${hasApiKey ? 'ready' : 'warning'}`}>
    <div>
      <strong>{language === 'vi' ? 'OpenRouter Gateway dùng chung' : 'Shared OpenRouter Gateway'}</strong>
      <p>{language === 'vi' ? 'Giáo viên không cần nhập API key. Key được bảo vệ trong Vercel Environment Variables; model và hạn mức do Admin quản lý.' : 'Teachers do not enter API keys. The key stays in Vercel Environment Variables; model and quotas are managed by Admin.'}</p>
    </div>
    <button onClick={() => (window.location.hash = '#/ai-governance')}>{language === 'vi' ? 'Xem trạng thái AI' : 'View AI status'}</button>
  </section>;
}
