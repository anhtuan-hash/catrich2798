import React from 'react';
import './contestMasthead.css';

const deptLogo = '/museum/branding/contest-dept.png';
const schoolLogo = '/museum/branding/contest-school.png';
const bamboo = '/museum/branding/contest-bamboo.png';
const leaves = '/museum/branding/contest-leaves.png';
const hillLeft = '/museum/branding/contest-hill-left.png';
const hillRight = '/museum/branding/contest-hill-right.png';

export default function ContestMasthead() {
  return (
    <div className="cmast">
      <span className="cmast-corner cmast-corner-tl" aria-hidden="true" />
      <span className="cmast-corner cmast-corner-br" aria-hidden="true" />
      <img className="cmast-hill cmast-hill-l" src={hillLeft} alt="" />
      <img className="cmast-hill cmast-hill-r" src={hillRight} alt="" />
      <img className="cmast-bamboo" src={bamboo} alt="" />
      <img className="cmast-leaves" src={leaves} alt="" />
      <img className="cmast-logo cmast-logo-dept" src={deptLogo} alt="Logo Sở Giáo dục và Đào tạo Thành phố Hồ Chí Minh" width={299} height={300} />
      <div className="cmast-copy">
        <p className="cmast-award"><i /><span><b>★</b> BÀI DỰ THI <b>★</b></span><i /></p>
        <p className="cmast-event">HỘI THI THIẾT KẾ CHỦ ĐỀ DẠY HỌC STEM/STEAM, CHỦ ĐỀ DẠY HỌC SỐ</p>
        <p className="cmast-level">CẤP THÀNH PHỐ · NĂM HỌC 2026–2027</p>
        <p className="cmast-field">Lĩnh vực dự thi: Chủ đề số</p>
        <p className="cmast-title"><span>OUR CLIMATE ACTION MUSEUM</span></p>
        <p className="cmast-meta">Môn học: Tiếng Anh · Lớp: 11 – Global Success, Unit 5: Global Warming · Thời lượng: 02 tiết × 45 phút</p>
        <p className="cmast-teacher"><i /><span>GV thực hiện: Thạc sĩ Nguyễn Anh Tuấn</span></p>
      </div>
      <img className="cmast-logo cmast-logo-school" src={schoolLogo} alt="Logo Trường Trung - Tiểu học Pétrus Ký – The Pioneers" width={720} height={877} />
    </div>
  );
}
