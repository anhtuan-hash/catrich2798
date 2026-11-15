import React from 'react';
import './contestMasthead.css';

const art = '/museum/branding/contest-banner.png';

export default function ContestMasthead() {
  return (
    <div className="cmast cmast-plate">
      <img className="cmast-plate-img" src={art} alt="" width={2183} height={542} />
      <div className="cmast-plate-copy">
        <p>BÀI DỰ THI</p>
        <p>HỘI THI THIẾT KẾ CHỦ ĐỀ DẠY HỌC STEM/STEAM, CHỦ ĐỀ DẠY HỌC SỐ</p>
        <p>CẤP THÀNH PHỐ · NĂM HỌC 2026–2027</p>
        <p>Lĩnh vực dự thi: Chủ đề số</p>
        <p>OUR CLIMATE ACTION MUSEUM</p>
        <p>Môn học: Tiếng Anh · Lớp: 11 – Global Success, Unit 5: Global Warming · Thời lượng: 02 tiết × 45 phút</p>
        <p>GV thực hiện: Thạc sĩ Nguyễn Anh Tuấn</p>
      </div>
    </div>
  );
}
