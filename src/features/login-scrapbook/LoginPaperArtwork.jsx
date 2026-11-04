import React from 'react';

export function LoginPaperMasthead({ language }) {
  const vi = language !== 'en';
  return <header className="login-paper-masthead">
    <a className="login-paper-brand" href="#/home" aria-label={vi ? 'Brian English · Trang chủ' : 'Brian English · Home'}>
      <img src="/assets/login-scrapbook/brand-tag.webp" alt="Brian English" width="300" height="90" />
    </a>
    <button className="login-paper-jump" type="button" onClick={() => {
      const input = document.querySelector('#teacher-login-form input');
      input?.focus();
      input?.scrollIntoView({ block: 'center', behavior: 'instant' });
    }}>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true"><circle cx="12" cy="7" r="4" /><path d="M3 22v-3a9 9 0 0 1 18 0v3Z" /></svg>
      {vi ? 'Đăng nhập' : 'Sign in'}
    </button>
  </header>;
}

// The supplied lettering and still life are illustration. All form controls,
// footer details and navigation are live DOM, independent of this artwork.
export function LoginPaperEditorial({ language }) {
  const vi = language !== 'en';
  return <section className="login-paper-editorial" aria-label={vi ? 'Không gian giáo viên' : 'Teacher workspace'}>
    <div className="login-paper-accessible-copy">
      <h1>{vi ? 'Đăng nhập giáo viên' : 'Teacher sign in'}</h1>
      <p>{vi ? 'Truy cập không gian làm việc, học liệu và các công cụ được cấp quyền để đồng hành cùng học viên trên hành trình chinh phục tiếng Anh.' : 'Access your teaching workspace, learning resources and authorized tools to support your learners.'}</p>
      <ul>
        <li>{vi ? 'Học liệu được cấp quyền: tài liệu, giáo án và ngân hàng đề.' : 'Authorized materials, lesson plans and question banks.'}</li>
        <li>{vi ? 'Công cụ hỗ trợ giảng dạy: quản lý lớp học, theo dõi tiến độ học viên.' : 'Teaching tools to manage classes and track learner progress.'}</li>
        <li>{vi ? 'Kết nối cộng đồng giáo viên Brian English.' : 'Connect with the Brian English teaching community.'}</li>
      </ul>
    </div>
  </section>;
}
