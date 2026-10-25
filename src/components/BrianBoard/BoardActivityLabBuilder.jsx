import React,{useState} from 'react';
import {ImagePlus,Layers3,MousePointerClick} from 'lucide-react';
import {LAB_IMAGE_TYPES,LAB_LABELS,LAB_EXAMPLES,validLabImage} from './boardActivityLab.js';
const usage={
 hotspot:['Mỗi dòng: Nhãn | X% | Y%. Chọn một nhãn, chạm ảnh để đặt điểm.','Each line: Label | X% | Y%. Select a label and tap the image to position it.'],
 drag_label:['Mỗi dòng: Nhãn | X% | Y%. Học sinh kéo nhãn đến vị trí.','Each line: Label | X% | Y%. Students drag each label to its position.'],
 cloze_snap:['Câu có một [[đáp án]]; thêm dòng DISTRACTORS: a, b nếu muốn.','One [[answer]] per sentence; optional DISTRACTORS: a, b line.'],
 error_detective:['Một lỗi/câu theo cú pháp [[sai=>đúng]].','One error per sentence as [[wrong=>correct]].'],
 evidence_hunter:['Bắt đầu PASSAGE:, sau đó mỗi dòng: câu hỏi | đáp án | bằng chứng nguyên văn | phương án sai.','Start with PASSAGE:, then Question | correct | exact evidence | distractor.'],
 four_corners:['Câu hỏi | A | B | C | D | chữ đáp án đúng.','Question | A | B | C | D | correct letter.'],
 flashcard_duel:['Mặt trước | mặt sau. Giáo viên xác nhận đội trả lời đúng/sai.','Front | Back. Teacher judges each oral answer.'],
 mystery_reveal:['Thử thách | đáp án chính xác. Mỗi câu đúng mở một ô ảnh.','Challenge | exact answer. Each correct response uncovers a tile.'],
 stress_tap:['Chia âm tiết bằng dấu / | số thứ tự âm tiết mang trọng âm.','Split syllables with / | 1-based stressed syllable index.'],
 concept_connection:['Khái niệm nguồn | quan hệ | khái niệm đích.','Source | relation | target.']
};
export default function BoardActivityLabBuilder({type,vi=true,raw,setRaw,image,setImage,setError}){
 const [placing,setPlacing]=useState(0);
 const supportsImage=LAB_IMAGE_TYPES.includes(type);
 const textLines=raw.split(/\r?\n/).map(x=>x.trim()).filter(Boolean);
 const onFile=async file=>{
  if(!file)return;
  if(!['image/jpeg','image/png','image/webp'].includes(file.type)||file.size>1024*1024){
   setError(vi?'Ảnh phải là PNG/JPEG/WebP dưới 1 MB.':'Use PNG/JPEG/WebP smaller than 1 MB.');return;
  }
  const reader=new FileReader();
  reader.onload=()=>{
   const data=String(reader.result||'');
   if(!validLabImage(data)){setError(vi?'Ảnh quá lớn hoặc không hợp lệ.':'Image is too large or invalid.');return;}
   setImage(data);setError('');
  };
  reader.readAsDataURL(file);
 };
 const place=e=>{
  if(!supportsImage)return;
  const rect=e.currentTarget.getBoundingClientRect();
  if(rect.width===0||rect.height===0)return;
  const x=Math.max(0,Math.min(100,Math.round((e.clientX-rect.left)/rect.width*100)));
  const y=Math.max(0,Math.min(100,Math.round((e.clientY-rect.top)/rect.height*100)));
  const lines=raw.split(/\r?\n/);
  const candidates=lines.map((line,i)=>({line,i})).filter(row=>row.line.trim());
  const chosen=candidates[placing];if(!chosen)return;
  const label=chosen.line.split('|')[0]?.trim();
  if(!label)return;
  lines[chosen.i]=label+' | '+x+' | '+y;
  setRaw(lines.join('\n'));setPlacing(i=>Math.min(candidates.length-1,i+1));
 };
 return <div className="bbd-lab-builder">
  <p>{usage[type]?.[vi?0:1]||''}</p>
  <button type="button" onClick={()=>{setRaw(LAB_EXAMPLES[type]);setPlacing(0);setError('');}}>
   <Layers3 size={16}/>{vi?'Nạp ví dụ để sửa':'Load editable example'}</button>
  {supportsImage&&<>
   <label className="bbd-import-image"><ImagePlus size={16}/>
    {vi?'Ảnh tương tác (không bắt buộc, ≤1 MB)':'Interactive image (optional, ≤1 MB)'}
    <input type="file" accept="image/png,image/jpeg,image/webp"
     onChange={e=>{void onFile(e.target.files?.[0]);e.target.value='';}}/>
   </label>
   {image&&<button type="button" onClick={()=>setImage('')}>{vi?'Gỡ ảnh':'Remove image'}</button>}
   <p><MousePointerClick size={15} style={{verticalAlign:'middle'}}/> {vi?'Chọn nhãn rồi chạm ảnh để cập nhật tọa độ.':'Select a label, then tap the picture to set its position.'}</p>
   <div className="bbd-lab-builder__targets">
    {textLines.map((line,i)=><button key={i} type="button"
     className={placing===i?'active':''} onClick={()=>setPlacing(i)}>{i+1}. {line.split('|')[0]}</button>)}
   </div>
   <div role="button" tabIndex={0} className="bbd-lab-builder__image" onClick={place}
    onKeyDown={e=>{if(e.key==='Enter')place({currentTarget:e.currentTarget,clientX:e.currentTarget.getBoundingClientRect().left+e.currentTarget.clientWidth/2,clientY:e.currentTarget.getBoundingClientRect().top+e.currentTarget.clientHeight/2});}}>
    {image?<img src={image} alt={vi?'Ảnh định vị':'Positioning image'}/>:
     <div>{vi?'Mẫu vị trí 16:9 · có thể thêm ảnh riêng':'16:9 calibration plane · upload your image if needed'}</div>}
   </div>
  </>}
 </div>;
}
