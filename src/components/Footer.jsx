import React from 'react';
import { APP_VERSION } from '../config/version.js';
import './FooterCompactDisclosure.css';
import './FooterAuthCards.css';
import './FooterIntegrity.css';
import './FooterDashboardMockup.css';

const ENGLISH_DETAILS = {
  language: 'EN',
  name: 'NGUYEN ANH TUAN (MR.)',
  role: 'Head of English Department',
  school: 'Pétrus Ký Primary - High school',
  phone: '0339 270798',
  centre: 'Cambridge Authorised Test Centre VN070 | HCM Department of Education and Training.',
  examiner: 'Certified Cambridge English Speaking Examiner',
  credentialsTitle: 'Academic & professional credentials',
  credentials: [
    'Bachelor of Arts in English Linguistics',
    'Postgraduate Diploma in Educational Management and Leadership (UK)',
    'Master of Arts in Teaching English to Speakers of Other Languages',
    'Master of Arts in Educational Management',
    'Currently pursuing Master of Arts in English Linguistics',
  ],
  copyright: '© 2026 English Hub',
};

const VIETNAMESE_DETAILS = {
  language: 'VI',
  name: 'NGUYỄN ANH TUẤN (MR.)',
  role: 'Tổ trưởng chuyên môn tiếng Anh',
  school: 'Trường Trung – Tiểu học Pétrus Ký',
  phone: '0339 270798',
  centre: 'Trung tâm khảo thí uỷ quyền tiếng Anh Cambridge VN070 | Sở giáo dục và đào tạo Thành phố Hồ Chí Minh',
  examiner: 'Giám khảo vấn đáp các kì thi tiếng Anh Cambridge',
  credentialsTitle: 'Học vấn & chứng chỉ chuyên môn',
  credentials: [
    'Cử nhân Ngôn ngữ Anh',
    'Văn bằng sau đại học chuyên ngành Quản lý giáo dục và lãnh đạo (Vương quốc Anh)',
    'Thạc sĩ Giảng dạy tiếng Anh cho người nói ngôn ngữ khác',
    'Thạc sĩ Quản lí giáo dục',
    'Đang theo học Thạc sĩ Ngôn ngữ Anh',
  ],
  copyright: 'Bản quyền © 2026 English Hub',
};

function DashboardFooterArtwork() {
  return (
    <div className="signature-footer-dashboard-artwork" aria-hidden="true">
      <svg className="signature-footer-dashboard-landscape" viewBox="0 0 1440 150" preserveAspectRatio="none" focusable="false">
        <path d="M0 118C94 76 170 86 241 113c66-50 168-45 229-2 78-58 189-53 252 0 78-54 185-49 250 6 75-47 181-39 242 11 72-37 150-28 226 7v35H0Z" fill="#dff3ff" />
        <path d="M0 132c80-42 152-26 203 5 61-47 160-36 210 5 72-50 170-42 223 3 77-53 181-39 231 8 71-42 164-28 211 13 70-34 165-22 242 13v21H0Z" fill="#e5f7ed" opacity=".96" />
        <path d="M210 150c19-34 48-51 77-32 10-31 40-47 64-29 22-25 55-28 75-5 18-17 48-12 64 10 12 17 15 36 13 56H210Z" fill="#ffe7f1" opacity=".80" />
        <path d="M1010 150c20-42 56-59 87-34 11-31 39-47 66-28 25-31 65-31 86-3 23-17 55-8 69 18 7 13 10 29 9 47h-317Z" fill="#e7e0ff" opacity=".78" />
        <g transform="translate(66 75)" fill="none" stroke="#70bd8a" strokeWidth="3" strokeLinecap="round">
          <path d="M18 61C18 33 28 16 48 5M19 52C7 37 2 24 7 13M29 37c13-13 27-16 39-9" />
          <path d="M47 5c-18 1-25 10-25 23 16-1 24-9 25-23ZM7 13c-7 16-2 27 11 32 7-13 4-24-11-32Zm61 15c-17-3-27 3-31 16 15 5 26 0 31-16Z" fill="#a9ddb5" stroke="none" />
        </g>
        <g transform="translate(1260 70)" fill="none" stroke="#8f78e9" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
          <path d="M8 39c25-31 40 16 66-10 13-13 24-15 55-7-13 7-22 15-27 32" />
          <path d="M69 0v12M63 6h12" />
          <path d="m116 17 5 7 8-3-4 8 7 5-9 1-1 9-5-8-8 3 4-8-7-5 9-1Z" fill="#b9a9ff" stroke="none" />
        </g>
      </svg>
      <span className="signature-footer-dashboard-signoff">Teach Better Together ♡</span>
    </div>
  );
}

function DetailRow({ type, children }) {
  return (
    <li className={`signature-footer-v50-detail detail-${type}`}>
      <span className="signature-footer-v50-detail-icon" aria-hidden="true" />
      <span>{children}</span>
    </li>
  );
}

export default function Footer({ language, compact = false, route = '' }) {
  const isVi = language === 'vi';
  const resolvedRoute = route || (typeof document !== 'undefined' ? (document.querySelector('.app-shell')?.dataset?.route || '') : '');
  const content = isVi ? VIETNAMESE_DETAILS : ENGLISH_DETAILS;
  const compactMode = compact
    || (typeof window !== 'undefined' && String(window.location.hash || '').startsWith('#/assessment-core'))
    || (typeof document !== 'undefined' && document.querySelector('.app-shell')?.dataset?.route === 'assessment-core');

  return (
    <footer
      className={`footer footer-v10 signature-footer-v75 signature-footer-v50 signature-footer-collapsible ${compactMode ? 'signature-footer-assessment-compact' : ''} ${isVi ? 'signature-footer-v50-vi' : 'signature-footer-v50-en'}`}
      aria-label={isVi ? 'Thông tin English Hub' : 'English Hub information'}
      data-app-shell-footer="true"
      data-footer-mode={compactMode ? 'compact' : 'full'}
      data-footer-route={resolvedRoute || undefined}
    >
      {!compactMode ? (
      <div id="english-hub-footer-details" className="signature-footer-expanded-panel">
        <div className="signature-footer-v50-main">
          <section className="signature-footer-v50-brand" aria-label="English Hub, Pétrus Ký and Cambridge Assessment English">
            <img
              className="signature-footer-v50-brian-logo"
              src="/brian-english-brand-logo.png"
              alt="English Hub"
            />
            <div className="signature-footer-v50-affiliations">
              <img src="/footer-pek-logo.png" alt="Pétrus Ký School" />
              <span className="signature-footer-v50-logo-divider" aria-hidden="true" />
              <img src="/footer-cambridge-logo.png" alt="Cambridge Assessment English" />
            </div>
          </section>

          <section className="signature-footer-v50-profile">
            <span className="signature-footer-v50-language-badge">{content.language}</span>
            <h2>{content.name}</h2>
            <ul className="signature-footer-v50-details">
              <DetailRow type="school">{content.school}</DetailRow>
              <DetailRow type="role">{content.role}</DetailRow>
              <DetailRow type="phone">{content.phone}</DetailRow>
              <DetailRow type="centre">{content.centre}</DetailRow>
              <DetailRow type="examiner">{content.examiner}</DetailRow>
            </ul>
          </section>

          <section className="signature-footer-v50-credentials">
            <span className="signature-footer-v50-section-label">{content.credentialsTitle}</span>
            <ul>
              {content.credentials.map((item) => (
                <li key={item}>
                  <span className="signature-footer-v50-star" aria-hidden="true">★</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </section>
        </div>

        <div className="signature-footer-expanded-note">{content.examiner}</div>
      </div>
      ) : null}

      {resolvedRoute === 'dashboard' ? <DashboardFooterArtwork /> : null}

      <div className="signature-footer-static-summary">
        <span className="signature-footer-summary">
          <strong>English Hub v{APP_VERSION}</strong>
          <span className="signature-footer-summary-separator" aria-hidden="true">•</span>
          <span>{content.copyright}</span>
        </span>
      </div>
    </footer>
  );
}
