import React from 'react';
import {Eye,LockKeyhole} from 'lucide-react';

const T=(language,vi,en)=>language==='en'?en:vi;
const text=value=>String(value||'').trim();

const ROWS=[
  ['issue','Vấn đề','Problem'],
  ['audience','Khách tham quan','Visitors'],
  ['evidence','Bằng chứng','Evidence'],
  ['source','Nguồn','Source'],
  ['solution','Giải pháp','Solution'],
  ['feedback','Phản hồi bạn học','Peer feedback'],
  ['improvement','Điểm đã cải tiến','What the group improved'],
  ['reflection','Điều nhóm học được','Learning reflection']
];

export default function StudentLockedDossier({language='en',studio,artAssets=[],onPreview}){
  const learning=studio?.learning||{};
  const poster=(artAssets||[]).find(asset=>asset?.image_url)?.image_url||'';
  return (
    <div className="bml-locked-dossier" data-testid="student-locked-dossier">
      <p className="bml-locked-note"><LockKeyhole size={16}/> {T(language,'Bài đã khóa. Chỉ xem, không sửa.','This lesson is locked. View only.')}</p>
      <h3>{text(studio?.title)||'Our Climate Action Museum'}</h3>
      {text(studio?.summary)?<p className="bml-locked-lead">{studio.summary}</p>:null}
      {poster?<img className="bml-locked-poster" src={poster} alt="" />:null}
      <dl>
        {ROWS.map(([key,vi,en])=>{
          const value=text(learning[key]);
          if(!value)return null;
          return <div key={key}><dt>{T(language,vi,en)}</dt><dd>{value}</dd></div>;
        })}
      </dl>
      <button type="button" className="bml-primary" onClick={onPreview}><Eye size={18}/> {T(language,'Mở bảo tàng 2D/3D','Open the 2D/3D museum')}</button>
    </div>
  );
}
