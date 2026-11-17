import React from 'react';
import {ArrowRight, QrCode} from 'lucide-react';
import AseanPresenterVisual from './AseanPresenterVisual.jsx';
import {ASEAN_ACTIVITY_DESIGN, ASEAN_DISCUSSION_MODEL} from '../../v3/aseanActivityDesign.js';
import {ASEAN_HUE_CORRECT, ASEAN_HUE_QUESTIONS} from '../../v3/aseanHueQuestions.js';
import {ASEAN_FRAMES} from '../../v3/aseanLesson.js';
import './aseanLiveSlide.css';

const studentActions = [
 [
  ['Viết và nộp hai câu theo thẻ', 'Write and submit two sentences from your card',
   'Dùng “Visitors can …” cho một hoạt động và “Visitors should …” cho một lời khuyên.',
   'Use “Visitors can …” for one activity and “Visitors should …” for one piece of advice.'],
  ['Đọc mẫu chung về Huế', 'Read the shared Hué example',
   'Tìm khung còn thiếu thông tin cụ thể cho du khách.', 'Find the frame that still needs more specific information for visitors.'],
  ['Nộp trắc nghiệm thảo luận', 'Submit the discussion quiz',
   'Thảo luận rồi chọn một đáp án cho mỗi câu trong ba câu.', 'Discuss, then choose one answer for each of the three questions.'],
 ],
 [
  ['Nhập ba mã ảnh', 'Enter three photo codes',
   'Ghi một mã riêng cho Địa điểm, Trải nghiệm và Lời khuyên.', 'Give Place, Experience and Visitor Advice a different code each.'],
  ['So sánh một ảnh thay thế', 'Compare one alternative photo',
   'Chọn khung, ghi mã của ảnh thay thế và giải thích vì sao chọn ảnh chính.',
   'Select a frame, name the alternative photo code and explain why you chose the main photo.'],
  ['Ghi dữ kiện và nộp kế hoạch', 'Record a sourced fact and submit the plan',
   'Viết một dữ kiện bằng lời của nhóm và kèm đường dẫn nguồn.', 'Write one fact in your own words and add its source link.'],
 ],
 [
  ['Mở Xưởng 3D và kiểm tra ba khung', 'Open the 3D Studio and check all three frames',
   'Dùng ảnh đã chọn. Nếu còn thiếu, tải ảnh lên đúng khung.', 'Use the chosen photos. Upload any missing photo into the correct frame.'],
  ['Hoàn thiện từng khung', 'Complete each frame',
   'Viết 20–30 từ tiếng Anh, thêm mô tả ảnh, ghi công, quyền sử dụng và nguồn dữ kiện.',
   'Write 20–30 words in English, add the image description, credit and permission, and cite the factual source.'],
  ['Xem thử 2D/3D và lưu bản nháp', 'Preview in 2D/3D and save the draft',
   'Bản lưu mới nhất khi mở Hoạt động 4 là bản trước góp ý của lượt tham quan.',
   'When Activity 4 opens, the latest saved draft becomes the first exhibit for the visitor test.'],
 ],
 [
  ['Mở phòng được giao', 'Open the assigned first exhibit',
   'Đọc ba khung và ghi nhớ khung đã mở đầu tiên.', 'Inspect all three frames and remember the one you opened first.'],
  ['Tìm câu trả lời và khung làm bằng chứng', 'Record answers and evidence frames',
   'Chấm từng câu: 1 nếu có bằng chứng, 0 nếu thiếu hoặc chưa rõ.',
   'Score each answer: 1 if you found it with evidence, 0 if it was missing or unclear.'],
  ['Nộp phiếu góp ý', 'Submit visitor feedback',
   'Viết một đề xuất cụ thể bằng tiếng Anh trước khi nộp.', 'Write one specific suggestion in English before submitting.'],
 ],
 [
  ['Phòng nhóm em: sửa một khung', 'Your exhibit: revise one frame',
   'Dùng góp ý, giải thích lý do và lưu bản đã chỉnh sửa. Đối chiếu cùng một khung trước và sau khi sửa.',
   'Use the feedback, explain the change and save the revised exhibit. Compare the same frame before and after.'],
  ['Phòng được giao: thử bản đã chỉnh sửa', 'Assigned exhibit: retest the revised exhibit',
   'Nhóm khách mới trả lời lại đúng câu hỏi được giao, chọn khung làm bằng chứng và nộp phiếu thử lại.',
   'The new visitor group answers the same assigned question, cites its evidence frame and submits the retest.'],
 ],
 [
  ['Trình bày bản chỉnh sửa', 'Present the revision',
   'Nêu điều đã sửa và điều nhóm khách tìm thấy khi thử lại.', 'Say what changed and what the visiting group found on the retest.'],
  ['Nộp hai câu tiếng Anh', 'Submit two sentences',
   'Dùng thẻ điểm đến mới ở phần Bài học để viết một hoạt động và một lời khuyên.',
   'Use the new destination card in Lesson to write one activity and one piece of advice.'],
  ['Nộp triển lãm 3D', 'Submit final 3D exhibit',
   'Xem thử rồi nộp bản đã chỉnh sửa trong phần Triển lãm của nhóm.', 'Preview the revised exhibit, then submit it in Group Exhibit.'],
 ],
];

function HueModel({en, revealed}) {
 const model = ASEAN_DISCUSSION_MODEL;
 return <div className="asean-slide-disclosures" lang="en">
  <details open={revealed||undefined}>
   <summary lang={en?'en':'vi'}>{en?'Shared Hué example':'Mẫu chung về Huế'}</summary>
   <h3>{model.title}</h3>
   <ul>{ASEAN_FRAMES.map(({label}, index)=><li key={label}><strong>{label}</strong> · {model.captions[index]}</li>)}</ul>
  </details>
  <details open={revealed||undefined}>
   <summary lang={en?'en':'vi'}>{en?'Discussion quiz · 3 questions':'Trắc nghiệm thảo luận · 3 câu'}</summary>
   <ol>{ASEAN_HUE_QUESTIONS.map(({prompt,options}, index)=><li key={prompt}>
    <strong>{prompt}</strong>
    <ol type="A">{options.map((option, choice)=><li key={option}>{option}
     {revealed&&choice===ASEAN_HUE_CORRECT[index]&&<strong> · {en?'Correct':'Đáp án đúng'}</strong>}</li>)}</ol>
   </li>)}</ol>
  </details>
 </div>;
}

export default function AseanLiveSlide({currentIndex, language, revealed, onJoin, onStudioHelp, draftTools, highlights, contextCard}) {
 const slide = ASEAN_ACTIVITY_DESIGN[currentIndex];
 if (!slide) return null;
 const en = language === 'en';
 const lang = en ? 1 : 0;
 const build = slide.id === 'build';
 return <article key={slide.id} className={'asean-live-slide asean-live-slide--'+slide.id} data-testid={'asean-slide-'+(currentIndex+1)}>
  <h2 className="asean-slide-heading">{slide.title[lang]}</h2>
  <div className="asean-slide-body">
   <div className="asean-slide-visual">
    <AseanPresenterVisual key={slide.id} activity={slide.id} language={language}/>
    {currentIndex===0&&<HueModel key={String(revealed)} en={en} revealed={revealed}/>}
    {contextCard}
   </div>
   <section className="asean-slide-plan" aria-labelledby="asean-student-task-heading">
    <h3 id="asean-student-task-heading" className="asean-slide-section-title">{en?'On the student screen':'Trên màn hình học sinh'}</h3>
    <ol className="asean-slide-student-actions">
     {studentActions[currentIndex].map(([vi, title])=><li key={title}>
      <strong>{en?title:vi}</strong>
     </li>)}
    </ol>
    <details className="asean-slide-disclosures asean-slide-instructions">
     <summary>{en?'Student instructions':'Hướng dẫn chi tiết cho học sinh'}</summary>
     <ol>{studentActions[currentIndex].map(([,title,detailVi,detail])=><li key={title}>{en?detail:detailVi}</li>)}</ol>
    </details>
    <details className="asean-slide-disclosures">
     <summary>{en?'Teacher pacing':'Phân bổ thời gian cho giáo viên'}</summary>
     <ol className="asean-slide-timing" aria-label={en?'Activity timing':'Phân bổ thời gian'}>
      {slide.steps.map(([minutes, vi, text])=><li key={text}><strong>{minutes} <span>{en?'min':'phút'}</span></strong><span>{en?text:vi}</span></li>)}
     </ol>
    </details>
   </section>
  </div>
  {highlights?.length>0&&<dl className="asean-slide-highlights" aria-label={en?'Class progress':'Tiến độ của lớp'}>
   {highlights.map(({label,count,extra})=><div key={label}><dt>{label}</dt><dd>{count}{extra&&<small>{' '}{extra}</small>}</dd></div>)}
  </dl>}
  <div className="asean-slide-end">
   <div className="asean-slide-output"><strong>{en?'Group output':'Sản phẩm nhóm'}</strong><p>{slide.output[lang]}</p></div>
   {build&&(onJoin||onStudioHelp||draftTools)&&<div className="asean-slide-actions">
    {onJoin&&<button className="adv-toolbtn" type="button" onClick={onJoin}><QrCode size={16}/>{en?'Class join QR':'QR vào lớp'}</button>}
    {onStudioHelp&&<button className="adv-toolbtn" type="button" onClick={onStudioHelp}>{en?'How to open the 3D Studio':'Hướng dẫn mở Xưởng 3D'} <ArrowRight size={15}/></button>}
    {draftTools&&<div className="asean-slide-drafts">{draftTools}</div>}
   </div>}
  </div>
  {revealed&&currentIndex!==0&&<p className="asean-slide-note" lang="en">{slide.studentTask}</p>}
 </article>;
}
