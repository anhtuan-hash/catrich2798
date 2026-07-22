import React from 'react';

const labels = {
  vi: {
    home: 'Trang chủ', apps: 'Ứng dụng', games: 'Trò chơi', tools: 'Công cụ', department: 'Hub Chuyên môn',
    resources: 'Tài nguyên', library: 'Thư viện', practice: 'Luyện tập', qa: 'Kiểm tra hệ thống',
    contact: 'Liên hệ', settings: 'Cài đặt', admin: 'Quản trị', setup: 'Supabase', login: 'Đăng nhập', register: 'Đăng kí', tool: 'Công cụ đang mở',
    active: 'Đang mở', ready: 'Sẵn sàng', loading: 'Đang chuyển cảnh', motion: 'Windows Phone 8 Motion',
  },
  en: {
    home: 'Home', apps: 'Apps', games: 'Games', tools: 'Tools', department: 'Department', resources: 'Resources',
    library: 'Library', practice: 'Practice', qa: 'System check', contact: 'Contact', settings: 'Settings',
    admin: 'Admin', setup: 'Supabase', login: 'Sign in', register: 'Register', tool: 'Open tool',
    active: 'Active', ready: 'Ready', loading: 'Transitioning', motion: 'Windows Phone 8 Motion',
  },
};

export default function WindowsPhoneIndicator({ route, language = 'vi', loading = false }) {
  const t = labels[language] || labels.vi;
  const routeLabel = t[route] || route || t.home;
  return (
    <div className={`wp8-global-indicator ${loading ? 'is-loading' : 'is-ready'}`} aria-label={`${t.motion}: ${routeLabel}`}>
      <div className="wp8-progress-track" aria-hidden="true">
        <span className="wp8-runner-dot dot-1" />
        <span className="wp8-runner-dot dot-2" />
        <span className="wp8-runner-dot dot-3" />
        <span className="wp8-runner-dot dot-4" />
        <span className="wp8-runner-dot dot-5" />
      </div>
      <div className="wp8-indicator-caption">
        <strong>{routeLabel}</strong>
        <em>{loading ? t.loading : t.ready}</em>
      </div>
    </div>
  );
}
