import React from 'react';

// Footer — 3-column info footer + final dark credit rail. Rendered LAST on every screen.
// Identity content is verbatim from the official source HTML / existing app
// (teacher = Thạc sĩ Nguyễn Anh Tuấn, Pétrus Ký, Cambridge VN070). NO portrait.
const schoolLogo = '/museum/branding/petrus-ky-original.png';

const TEACHER_LINES = [
  'Trường Trung – Tiểu học Pétrus Ký',
  'Tổ trưởng chuyên môn tiếng Anh',
  '0339 270798',
  'Trung tâm khảo thí ủy quyền tiếng Anh Cambridge VN070 | Sở giáo dục và đào tạo Thành phố Hồ Chí Minh',
  'Giám khảo vấn đáp các kì thi tiếng Anh Cambridge',
];

const QUALIFICATION_LINES = [
  'Cử nhân Ngôn ngữ Anh',
  'Văn bằng sau đại học chuyên ngành Quản lý giáo dục và lãnh đạo (Vương quốc Anh)',
  'Thạc sĩ Giảng dạy tiếng Anh cho người nói ngôn ngữ khác',
  'Thạc sĩ Quản lí giáo dục',
  'Đang theo học Thạc sĩ Ngôn ngữ Anh',
];

export default function Footer() {
  return (
    <>
      <section className="profile-footer" data-testid="igv2-footer" aria-label="Teacher identity and qualifications">
        <div className="foot-col">
          <div className="logo-line">
            <div className="foot-logo" aria-hidden="true">B.</div>
            <div><b>BRIAN<br/>ENGLISH</b></div>
            <img className="foot-partner" src={schoolLogo} alt="Trường Trung - Tiểu học Pétrus Ký" width={48} height={48} />
            <div className="foot-cambridge">CAMBRIDGE<br/>ASSESSMENT<br/>ENGLISH</div>
          </div>
          <div className="motto">Better Learners · Brighter Futures</div>
          <p className="foot-note">Brand and partner marks are visual references. Confirm source assets and usage rights before production.</p>
        </div>
        <div className="foot-col">
          <h3>NGUYỄN ANH TUẤN (MR.)</h3>
          <ul>{TEACHER_LINES.map((l,i) => <li key={i}>{l}</li>)}</ul>
        </div>
        <div className="foot-col">
          <h3>HỌC VẤN & CHỨNG CHỈ CHUYÊN MÔN</h3>
          <ul>{QUALIFICATION_LINES.map((l,i) => <li key={i}>{l}</li>)}</ul>
        </div>
      </section>
      <footer className="footer-final">
        <div><strong>BRIAN ENGLISH</strong> &nbsp; / &nbsp; Designed &amp; Developed by <strong>Nguyễn Anh Tuấn</strong></div>
        <em>Teach Better Together ♡</em>
      </footer>
    </>
  );
}
