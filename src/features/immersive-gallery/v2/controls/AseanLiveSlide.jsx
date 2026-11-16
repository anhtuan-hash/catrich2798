import React from 'react';
import {ArrowRight, QrCode} from 'lucide-react';
import AseanActivityArt from '../../v3/AseanActivityArt.jsx';
import {ASEAN_ACTIVITY_DESIGN} from '../../v3/aseanActivityDesign.js';
import './aseanLiveSlide.css';

const prompts = [
 [
  'Viết “Visitors can …” và “Visitors should …” theo thẻ. Sau khi xem mẫu, hỏi khách còn thiếu thông tin gì.',
  'Write “Visitors can …” and “Visitors should …” from the card. After the model, ask what the visitor still needs to know.',
 ],
 [
  'Mỗi khung trả lời một câu hỏi khác nhau. So sánh hai ảnh cho cùng một khung trước khi chốt.',
  'Give each frame a different purpose. Compare two photos for one frame before finalizing your choices.',
 ],
 [
  'Cho học sinh vào Xưởng 3D từ link hoặc QR nhóm. Làm mẫu từ tải một ảnh đến xem phòng rồi cho các nhóm tự dựng.',
  'Have students enter the 3D Studio through their group link or QR. Model one upload and room preview, then let groups build their own rooms.',
 ],
 [
  'Ghi đúng số khung dùng làm bằng chứng. Cho 1 điểm khi tìm được câu trả lời có căn cứ, 0 khi thiếu hoặc chưa rõ.',
  'Record the frame used as evidence. Award 1 when the answer is supported and 0 when it is missing or unclear.',
 ],
 [
  'Giữ nguyên câu hỏi của lượt đầu. Nhóm khách mới trả lời từ V2 để kiểm tra đúng thay đổi vừa thực hiện.',
  'Keep the first visitor question. A fresh group answers from V2 to test the specific change.',
 ],
 [
  'Nhóm báo cáo khung đã sửa và điều khách mới tìm được. Phát thẻ điểm đến mới để viết hai câu vận dụng.',
  'Groups report what they changed and what their fresh visitors found. Give them a new destination card for two transfer sentences.',
 ],
];

export default function AseanLiveSlide({currentIndex, language, revealed, onJoin, onStudioHelp, draftTools}) {
 const slide = ASEAN_ACTIVITY_DESIGN[currentIndex];
 if (!slide) return null;
 const lang = language === 'en' ? 1 : 0;
 const build = slide.id === 'build';
 return <article className={'asean-live-slide asean-live-slide--'+slide.id} data-testid={'asean-slide-'+(currentIndex+1)}>
  <h2 className="asean-slide-heading">{slide.title[lang]}</h2>
  <div className="asean-slide-body">
   <div className="asean-slide-visual"><AseanActivityArt activity={slide.id} language={lang ? 'en' : 'vi'}/></div>
   <div className="asean-slide-plan">
    <p className="asean-slide-prompt">{prompts[currentIndex][lang]}</p>
    <ol className="asean-slide-timing" aria-label={lang ? 'Activity timing' : 'Phân bổ thời gian'}>
     {slide.steps.map(([minutes, vi, en]) => <li key={en}><strong>{minutes} <span>{lang ? 'min' : 'phút'}</span></strong><span>{lang ? en : vi}</span></li>)}
    </ol>
   </div>
  </div>
  <div className="asean-slide-end">
   <div className="asean-slide-output"><strong>{lang ? 'Group output' : 'Sản phẩm nhóm'}</strong><p>{slide.output[lang]}</p></div>
   {build&&(onJoin||onStudioHelp||draftTools)&&<div className="asean-slide-actions">
    {onJoin&&<button className="adv-toolbtn" type="button" onClick={onJoin}><QrCode size={16}/>{lang ? 'Class join QR' : 'QR vào lớp'}</button>}
    {onStudioHelp&&<button className="adv-toolbtn" type="button" onClick={onStudioHelp}>{lang ? 'How to open the 3D Studio' : 'Hướng dẫn mở Xưởng 3D'} <ArrowRight size={15}/></button>}
    {draftTools&&<div className="asean-slide-drafts">{draftTools}</div>}
   </div>}
  </div>
  {revealed&&<p className="asean-slide-note" lang="en">{slide.studentTask}</p>}
 </article>;
}
