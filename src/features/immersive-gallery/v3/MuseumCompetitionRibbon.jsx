import React from 'react';
import {BookOpen,Globe2,Leaf,Star} from 'lucide-react';
import './museumCompetitionRibbon.css';

// Competition credits are official Vietnamese document content, not translated
// navigation controls. Logos are optimized from the two files provided by
// the teacher; no generative redraws or personal identifiers are introduced.
const contestName='HỘI THI THIẾT KẾ CHỦ ĐỀ DẠY HỌC STEM/STEAM, CHỦ ĐỀ DẠY HỌC SỐ';
const awardLabel='BÀI DỰ THI';
const yearLabel='CẤP THÀNH PHỐ · NĂM HỌC 2026–2027';
const fieldLabel='Lĩnh vực: Chủ đề dạy học số – Môn Tiếng Anh THPT';
const teacherLabel='GV thực hiện:';
const teacherName='Thạc sĩ Nguyễn Anh Tuấn';
const schoolName='Trường Trung - Tiểu học Pétrus Ký';
const departmentLogo='/museum/branding/hcmc-department-education.png';
const schoolLogo='/museum/branding/petrus-ky-school.png';

export default function MuseumCompetitionRibbon(){
 return <section className="bml-competition-ribbon" data-testid="museum-competition-ribbon"
  lang="vi" aria-label="Bài dự thi hội thi thiết kế chủ đề dạy học số">
  <div className="bml-competition-decor bml-competition-decor--left" aria-hidden="true"/>
  <div className="bml-competition-decor bml-competition-decor--right" aria-hidden="true"/>
  <figure className="bml-competition-seal bml-competition-seal--department">
   <img src={departmentLogo} width="172" height="173" alt="Logo Sở Giáo dục và Đào tạo Thành phố Hồ Chí Minh" loading="eager" decoding="async"/>
  </figure>
  <div className="bml-competition-copy">
   <div className="bml-competition-award"><Star size={15} fill="currentColor" aria-hidden="true"/> {awardLabel} <Star size={15} fill="currentColor" aria-hidden="true"/></div>
   <h2>{contestName}</h2>
   <div className="bml-competition-year">{yearLabel}</div>
   <p className="bml-competition-field">{fieldLabel}</p>
   <p className="bml-competition-author">{teacherLabel} <strong>{teacherName}</strong></p>
   <p className="bml-competition-school">{schoolName}</p>
   <BookOpen className="bml-competition-accent bml-competition-accent--book" size={34} strokeWidth={1.6} aria-hidden="true"/>
   <Globe2 className="bml-competition-accent bml-competition-accent--globe" size={34} strokeWidth={1.6} aria-hidden="true"/>
   <Leaf className="bml-competition-accent bml-competition-accent--leaf" size={28} strokeWidth={1.6} aria-hidden="true"/>
  </div>
  <figure className="bml-competition-seal bml-competition-seal--school">
   <img src={schoolLogo} width="172" height="210" alt="Logo Trường Trung - Tiểu học Pétrus Ký – The Pioneers" loading="eager" decoding="async"/>
  </figure>
 </section>;
}
