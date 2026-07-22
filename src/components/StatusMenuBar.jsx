import React, { useEffect, useMemo, useState } from 'react';

const routeLabels = {
  vi: {
    home: 'Trang chủ', apps: 'Ứng dụng', news: 'Đọc báo', games: 'Trò chơi', tools: 'Công cụ',
    resources: 'Tài nguyên', library: 'Thư viện', practice: 'Luyện tập', qa: 'Kiểm tra',
    contact: 'Liên hệ', settings: 'Cài đặt', admin: 'Quản trị', setup: 'Supabase',
    login: 'Đăng nhập', register: 'Đăng kí', tool: 'Công cụ', homeroom: 'Chủ nhiệm',
    dashboard: 'Bảng điều hành', 'work-hub': 'Trung tâm công việc',
  },
  en: {
    home: 'Home', apps: 'Apps', news: 'News', games: 'Games', tools: 'Tools',
    resources: 'Resources', library: 'Library', practice: 'Practice', qa: 'System health',
    contact: 'Contact', settings: 'Settings', admin: 'Admin', setup: 'Supabase',
    login: 'Login', register: 'Register', tool: 'Tool', homeroom: 'Homeroom',
    dashboard: 'Dashboard', 'work-hub': 'Work Hub',
  },
};

function formatClock(language, date) {
  const locale = language === 'vi' ? 'vi-VN' : 'en-US';
  return {
    time: new Intl.DateTimeFormat(locale, { hour: '2-digit', minute: '2-digit', hour12: false }).format(date),
    date: new Intl.DateTimeFormat(locale, { weekday: 'short', day: '2-digit', month: '2-digit' }).format(date),
  };
}

export default function StatusMenuBar({
  language = 'vi', route = 'home', currentUser, hasApiKey, theme = 'light', setTheme,
}) {
  const [now, setNow] = useState(() => new Date());
  const labels = routeLabels[language] || routeLabels.vi;
  const clock = useMemo(() => formatClock(language, now), [language, now]);
  const routeLabel = route?.startsWith('tool/') || route === 'tool' ? labels.tool : labels[route] || labels.home;
  const account = currentUser?.name || currentUser?.email || (language === 'vi' ? 'Khách' : 'Guest');

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 30000);
    return () => window.clearInterval(timer);
  }, []);

  return (
    <div
      aria-label={language === 'vi' ? 'Thanh trạng thái hệ thống' : 'System status bar'}
      style={{
        minHeight: 32,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 12,
        padding: '4px 14px',
        borderBottom: '1px solid color-mix(in srgb, currentColor 14%, transparent)',
        background: 'var(--surface, #fff)',
        color: 'var(--ink, #191515)',
        fontSize: 12,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
        <strong style={{ whiteSpace: 'nowrap' }}>{routeLabel}</strong>
        <span aria-hidden="true" style={{ opacity: 0.35 }}>•</span>
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', opacity: 0.72 }}>{account}</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, whiteSpace: 'nowrap' }}>
        <span title={hasApiKey ? 'AI ready' : 'AI unavailable'} style={{ opacity: hasApiKey ? 1 : 0.5 }}>{hasApiKey ? 'AI ✓' : 'AI —'}</span>
        <span>{clock.date}</span>
        <strong>{clock.time}</strong>
        <button
          type="button"
          onClick={() => setTheme?.(theme === 'dark' ? 'light' : 'dark')}
          aria-label={language === 'vi' ? 'Đổi chế độ sáng tối' : 'Toggle color mode'}
          style={{ border: 0, background: 'transparent', color: 'inherit', cursor: 'pointer', padding: 4 }}
        >
          {theme === 'dark' ? '☀' : '☾'}
        </button>
      </div>
    </div>
  );
}
