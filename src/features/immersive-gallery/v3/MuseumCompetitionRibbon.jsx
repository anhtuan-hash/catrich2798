import React from 'react';
import './museumCompetitionRibbon.css';

// Official contest masthead. The artwork is the approved banner for both
// the teacher studio and the student workshop.
const bannerSrc='/museum/branding/contest-banner.jpg';
const awardLabel='BÀI DỰ THI';
const lessonTitle='OUR CLIMATE ACTION MUSEUM';
const credits='BÀI DỰ THI. Hội thi thiết kế chủ đề dạy học STEM/STEAM, chủ đề dạy học số. Cấp thành phố · Năm học 2026–2027. Lĩnh vực dự thi: Chủ đề số. Our Climate Action Museum. Môn học: Tiếng Anh · Lớp: 11 – Global Success, Unit 5: Global Warming · Thời lượng: 02 tiết × 45 phút. GV thực hiện: Thạc sĩ Nguyễn Anh Tuấn. Trường Trung - Tiểu học Pétrus Ký.';

export default function MuseumCompetitionRibbon({variant='student'}){
 const dashboard=variant==='dashboard';
 return <section className={`bml-competition-ribbon bml-contest-art${dashboard ? ' bml-competition-ribbon--dashboard' : ''}`} data-testid="museum-competition-ribbon"
  lang="vi" aria-label={awardLabel+' – '+lessonTitle}>
  <img src={bannerSrc} alt="" width={2116} height={463}/>
  <p className="bml-contest-credits">{credits}</p>
 </section>;
}
