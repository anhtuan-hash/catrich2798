import React, { useId, useState } from 'react';
import { APP_VERSION } from '../config/version.js';
import './FooterCompactDisclosure.css';

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
  detailsLabel: 'Full information',
  collapseLabel: 'Hide information',
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
  detailsLabel: 'Thông tin đầy đủ',
  collapseLabel: 'Thu gọn thông tin',
};

function DetailRow({ type, children }) {
  return (
    <li className={`signature-footer-v50-detail detail-${type}`}>
      <span className="signature-footer-v50-detail-icon" aria-hidden="true" />
      <span>{children}</span>
    </li>
  );
}

export default function Footer({ language }) {
  const isVi = language === 'vi';
  const content = isVi ? VIETNAMESE_DETAILS : ENGLISH_DETAILS;
  const [expanded, setExpanded] = useState(false);
  const detailsId = useId();

  return (
    <footer
      className={`footer footer-v10 signature-footer-v75 signature-footer-v50 signature-footer-collapsible ${isVi ? 'signature-footer-v50-vi' : 'signature-footer-v50-en'}`}
      aria-label={isVi ? 'Thông tin English Hub' : 'English Hub information'}
      data-expanded={expanded ? 'true' : 'false'}
    >
      <button
        type="button"
        className="signature-footer-disclosure"
        aria-expanded={expanded}
        aria-controls={detailsId}
        onClick={() => setExpanded((value) => !value)}
      >
        <span className="signature-footer-summary">
          <strong>English Hub v{APP_VERSION}</strong>
          <span className="signature-footer-summary-separator" aria-hidden="true">•</span>
          <span>{content.copyright}</span>
        </span>
        <span className="signature-footer-disclosure-action">
          <span>{expanded ? content.collapseLabel : content.detailsLabel}</span>
          <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
            <path d="m7.41 8.59 4.59 4.58 4.59-4.58L18 10l-6 6-6-6 1.41-1.41Z" />
          </svg>
        </span>
      </button>

      {expanded ? (
        <div id={detailsId} className="signature-footer-expanded-panel">
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
    </footer>
  );
}
