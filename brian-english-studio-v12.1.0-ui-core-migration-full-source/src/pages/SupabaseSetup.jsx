import React from 'react';
import { getSupabaseStatus } from '../utils/supabase.js';

const sqlPreview = `-- Run the complete file in Supabase SQL Editor:
-- supabase/schema.sql

-- Then promote your first admin account:
update public.profiles
set role = 'admin', approved = true
where email = 'your-admin-email@example.com';`;

export default function SupabaseSetup({ language }) {
  const status = getSupabaseStatus();
  const prodUrl = typeof window !== 'undefined' ? window.location.origin : 'https://your-app.vercel.app';

  const copy = async (text) => {
    try { await navigator.clipboard.writeText(text); } catch {}
  };

  return (
    <div className="page setup-page">
      <section className="metro-admin-header metro-panel">
        <span className="eyebrow">Brian English Studio V9.4</span>
        <h1>{language === 'vi' ? 'Kết nối Supabase' : 'Connect Supabase'}</h1>
        <p>
          {language === 'vi'
            ? 'Trang này dùng để kiểm tra cấu hình Supabase Auth trước khi phát hành app chính thức.'
            : 'Use this page to check the Supabase Auth configuration before launching the official app.'}
        </p>
      </section>

      <section className="admin-grid setup-grid">
        <article className="metro-tile teacher-tile">
          <span className={status.configured ? 'status-badge' : 'status-badge warning'}>
            {status.configured ? 'CONNECTED' : 'NOT CONFIGURED'}
          </span>
          <h2>{language === 'vi' ? 'Trạng thái biến môi trường' : 'Environment status'}</h2>
          <div className="admin-user-meta">
            <span>VITE_SUPABASE_URL: {status.hasUrl ? '✅' : '❌'}</span>
            <span>VITE_SUPABASE_ANON_KEY: {status.hasAnonKey ? '✅' : '❌'}</span>
            <span>Current URL: {prodUrl}</span>
          </div>
        </article>

        <article className="metro-tile admin-tile">
          <span className="status-badge">STEP 1</span>
          <h2>{language === 'vi' ? 'Tạo project Supabase' : 'Create Supabase project'}</h2>
          <p>{language === 'vi' ? 'Vào Supabase Dashboard, tạo project mới, chọn region gần Việt Nam/Singapore nếu có.' : 'Open Supabase Dashboard, create a new project, and choose a nearby region when possible.'}</p>
        </article>

        <article className="metro-tile teacher-tile">
          <span className="status-badge">STEP 2</span>
          <h2>{language === 'vi' ? 'Chạy database schema' : 'Run database schema'}</h2>
          <p>{language === 'vi' ? 'Mở SQL Editor trong Supabase và chạy toàn bộ file supabase/schema.sql.' : 'Open SQL Editor in Supabase and run the full supabase/schema.sql file.'}</p>
          <pre className="code-card">{sqlPreview}</pre>
          <button className="metro-small-btn" onClick={() => copy(sqlPreview)}>{language === 'vi' ? 'Copy lệnh admin mẫu' : 'Copy admin SQL sample'}</button>
        </article>

        <article className="metro-tile teacher-tile">
          <span className="status-badge">STEP 3</span>
          <h2>{language === 'vi' ? 'Thêm biến môi trường ở Vercel' : 'Add Vercel environment variables'}</h2>
          <pre className="code-card">{`VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
VITE_ADMIN_EMAILS=your-admin-email@example.com`}</pre>
        </article>

        <article className="metro-tile teacher-tile">
          <span className="status-badge">STEP 4</span>
          <h2>{language === 'vi' ? 'Cấu hình Auth URL' : 'Configure Auth URLs'}</h2>
          <p>{language === 'vi' ? 'Trong Supabase → Authentication → URL Configuration, đặt Site URL và Redirect URLs.' : 'In Supabase → Authentication → URL Configuration, set Site URL and Redirect URLs.'}</p>
          <pre className="code-card">{`Site URL:
${prodUrl}

Redirect URLs:
${prodUrl}/**
http://localhost:5173/**`}</pre>
        </article>

        <article className="metro-tile admin-tile">
          <span className="status-badge">STEP 5</span>
          <h2>{language === 'vi' ? 'Tạo admin đầu tiên' : 'Create first admin'}</h2>
          <p>{language === 'vi' ? 'Đăng kí bằng email admin, xác nhận email nếu Supabase yêu cầu, rồi chạy câu SQL promote admin trong SQL Editor.' : 'Register with the admin email, confirm the email if required, then run the admin promotion SQL in SQL Editor.'}</p>
        </article>
      </section>
    </div>
  );
}
