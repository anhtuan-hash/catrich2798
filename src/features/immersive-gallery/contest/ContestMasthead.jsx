import React from 'react';
import './contestMasthead.css';

const title = 'Our Climate Action Museum';
const copy = {
  vi: {
    entry: 'BÀI DỰ THI',
    competition: 'HỘI THI THIẾT KẾ CHỦ ĐỀ DẠY HỌC STEM/STEAM, CHỦ ĐỀ DẠY HỌC SỐ',
    year: 'CẤP THÀNH PHỐ · NĂM HỌC 2026–2027',
    category: 'Lĩnh vực dự thi: Chủ đề số',
    subject: 'Môn học: Tiếng Anh',
    lesson: 'Lớp: 11 – Global Success, Unit 5: Global Warming',
    duration: 'Thời lượng: 02 tiết × 45 phút',
    author: 'GV thực hiện: Thạc sĩ Nguyễn Anh Tuấn',
    department: 'Sở Giáo dục và Đào tạo Thành phố Hồ Chí Minh',
  },
  en: {
    entry: 'COMPETITION ENTRY',
    competition: 'STEM/STEAM AND DIGITAL TEACHING THEME DESIGN COMPETITION',
    year: 'CITY LEVEL · 2026–2027 SCHOOL YEAR',
    category: 'Entry category: Digital teaching theme',
    subject: 'Subject: English',
    lesson: 'Grade 11 – Global Success, Unit 5: Global Warming',
    duration: 'Duration: 2 periods × 45 minutes',
    author: 'Teacher: Nguyễn Anh Tuấn, MA',
    department: 'Ho Chi Minh City Department of Education and Training',
  },
};

export default function ContestMasthead({language = 'vi'}) {
  const locale = language === 'en' ? 'en' : 'vi';
  const text = copy[locale];
  return (
    <div className="cmast cmast-plate" lang={locale} role="group" aria-label={text.entry + ' – ' + title}>
      <div className="cmast-layout">
        <img className="cmast-logo cmast-logo--department" src="/museum/branding/contest-dept.png" width={299} height={300} alt={text.department} />
        <div className="cmast-plate-copy">
          <p className="cmast-entry">{text.entry}</p>
          <p className="cmast-competition">{text.competition}</p>
          <p className="cmast-edition"><span>{text.year}</span><span>{text.category}</span></p>
          <p className="cmast-title" lang="en">{title}</p>
          <p className="cmast-meta"><span>{text.subject}</span><span>{text.lesson}</span><span>{text.duration}</span></p>
          <p className="cmast-author">{text.author}</p>
        </div>
        <img className="cmast-logo cmast-logo--school" src="/museum/branding/contest-school.png" width={720} height={877} alt="Pétrus Ký School" />
      </div>
    </div>
  );
}
