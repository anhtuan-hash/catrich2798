import React from 'react';
import {ArrowRight, Box, Camera, Check, ClipboardList, Eye, Images, MapPin, QrCode, Quote, ScanSearch, UploadCloud} from 'lucide-react';
import {ASEAN_FRAMES} from '../../v3/aseanLesson.js';
import './aseanLiveSlide.css';

const prompts = [
 ['Khách cần biết những gì?', 'What does a visitor need to know?'],
 ['Ảnh nào trả lời được câu hỏi của khách?', 'Which photos answer the visitor’s questions?'],
 ['Dựng triển lãm 3D của nhóm', 'Build your group’s 3D exhibit'],
 ['Tìm câu trả lời trong phòng 3D', 'Find the answers in another group’s 3D room'],
 ['Sửa một khung. Thử lại cùng nhóm mới.', 'Revise one frame. Test it with a new group.'],
 ['Nộp phòng 3D hoàn chỉnh', 'Submit the finished 3D exhibit'],
];
const frameQuestions = ['Ở đâu?', 'Có thể làm gì?', 'Cần lưu ý gì?'];
const buildSteps = [
 ['Tải 3 ảnh', 'Upload three photos', UploadCloud],
 ['Viết chú thích và ghi nguồn', 'Write captions and add credits', ClipboardList],
 ['Xem phòng 3D', 'Preview the 3D room', Box],
 ['Lưu bản V1', 'Save V1', Check],
];

function Frames({language, type}) {
 const icons = type === 'plan' ? [Camera, Images, Camera] : [MapPin, Eye, ClipboardList];
 return <ul className={'asean-slide-frames is-'+type}>
  {ASEAN_FRAMES.map((frame, index) => {
   const Icon = icons[index], vi = language === 'vi';
   return <li key={frame.key}><Icon aria-hidden="true"/><strong>{frame.label}</strong>
    <small>{vi ? frameQuestions[index] : frame.question}</small></li>;
  })}
 </ul>;
}

function Process({items}) {
 return <ol className="asean-slide-process">{items.map(([heading,detail,Icon])=>
  <li key={heading}><Icon aria-hidden="true"/><div><strong>{heading}</strong>{detail&&<small>{detail}</small>}</div></li>)}</ol>;
}

export default function AseanLiveSlide({stage,currentIndex,language,revealed,onJoin,onStudioHelp,draftTools}) {
 const t = (vi,en) => language === 'vi' ? vi : en;
 const stagePrompt = prompts[currentIndex];
 if(!stagePrompt)return null;
 const join = onJoin && <button className="adv-toolbtn" type="button" onClick={onJoin}><QrCode size={16}/>{t('QR vào lớp','Class join QR')}</button>;
 let content;
 switch(currentIndex) {
 case 0:
  content = <div className="asean-slide-body asean-slide-baseline">
   <div className="asean-slide-writing"><Quote aria-hidden="true"/>
    <h3>{t('Cả nhóm viết 2 câu','Write two sentences together')}</h3>
    <p lang="en">Visitors can …<br/>Visitors should …</p>
   </div>
   <div><h3>{t('Sau đó, tìm thông tin còn thiếu','Then find the missing information')}</h3>
    <Frames language={language} type="baseline"/>
    <p>{t('Hỏi: “Bạn có thể làm gì ở đó?” Nếu lời giới thiệu chỉ nêu địa điểm, nhóm còn thiếu khung Experience.','Ask “What can you do there?” If the introduction only names the place, the Experience frame is missing.')}</p>
   </div>
  </div>;
  break;
 case 1:
  content = <div className="asean-slide-body asean-slide-plan">
   <Frames language={language} type="plan"/>
   <p>{t('Chọn một ảnh cho mỗi khung. So sánh một ảnh thay thế và giải thích vì sao nhóm chọn ảnh này.','Choose a photo for each frame. Compare one alternative and explain why you chose your photo.')}</p>
  </div>;
  break;
 case 2:
  content = <div className="asean-slide-body asean-slide-build">
   <div>
    <Process items={buildSteps.map(([vi,en,Icon])=>[t(vi,en),null,Icon])}/>
    <p>{t('Mỗi chú thích tiếng Anh dài 20–30 từ. Ghi nguồn và quyền sử dụng từng ảnh, cùng nguồn của dữ kiện.','Write 20–30 English words per caption. Credit each photo, record its permission and cite the source of your fact.')}</p>
    <div className="asean-slide-actions">{join}{onStudioHelp&&<button type="button" className="adv-toolbtn" onClick={onStudioHelp}>{t('Hướng dẫn mở Xưởng 3D','How to open the 3D Studio')} <ArrowRight size={15}/></button>}</div>
   </div>
   <div className="asean-slide-wall"><Frames language={language} type="wall"/>
    {draftTools&&<div className="asean-slide-drafts">{draftTools}</div>}
   </div>
  </div>;
  break;
 case 3:
  content = <div className="asean-slide-body asean-slide-visit">
   <Process items={[
    [t('Mở phòng V1 được giao','Open your assigned V1 room'),t('Mở từng ảnh và đọc chú thích.','Open the frames and read the captions.'),Box],
    [t('Trả lời 3 câu','Answer three questions'),t('Ghi số khung giúp nhóm tìm được câu trả lời.','Record the frame number that supports each answer.'),ScanSearch],
    [t('Gửi một góp ý','Send one suggestion'),t('Chỉ rõ khung nào cần làm rõ và sửa thế nào.','Name the frame and suggest a specific change.'),ClipboardList],
   ]}/>
  </div>;
  break;
 case 4:
  content = <div className="asean-slide-body asean-slide-revise">
   <div><strong>V1</strong><p>{t('Đọc góp ý. Chọn một khung cần sửa.','Read the feedback. Choose one frame to improve.')}</p></div>
   <ArrowRight aria-hidden="true"/>
   <div><strong>V2</strong><p>{t('Lưu phiên bản mới. Nhờ một nhóm khác trả lời lại đúng câu hỏi đó.','Save the new version. Ask a different group to answer the same question.')}</p></div>
  </div>;
  break;
 case 5:
  content = <div className="asean-slide-body asean-slide-finish">
   <div className="asean-slide-final"><Box aria-hidden="true"/>
    <h3>{t('Phòng 3D của nhóm','Your group’s 3D room')}</h3>
    <p>{t('Giới thiệu thay đổi và kết quả thử lại. Nộp bản cuối để giáo viên duyệt.','Explain your change and the retest result. Submit the final exhibit for teacher review.')}</p>
   </div>
   <div className="asean-slide-writing"><Quote aria-hidden="true"/>
    <h3>{t('Viết vận dụng','Transfer writing')}</h3>
    <p>{t('Viết 2 câu cho một điểm đến mới.','Write two sentences for a new destination.')}</p>
    <p lang="en">Visitors can …<br/>Visitors should …</p>
   </div>
  </div>;
  break;
 }
 return <div className={'asean-live-slide asean-live-slide--'+currentIndex} data-testid={'asean-slide-'+(currentIndex+1)}>
  <h2 className="asean-slide-heading">{t(...stagePrompt)}</h2>
  {content}
  {revealed&&<p className="asean-slide-note" lang="en">{stage.teaching} <strong>{stage.expected}</strong></p>}
 </div>;
}
