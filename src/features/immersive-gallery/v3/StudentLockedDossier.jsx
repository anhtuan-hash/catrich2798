import React from 'react';

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

export default function StudentLockedDossier({language='en',studio,artAssets=[]}){
  const learning=studio?.learning||{};
  const poster=(artAssets||[]).find(asset=>asset?.image_url)?.image_url||'';
  return (
    <div className="bml-locked-dossier" data-testid="student-locked-dossier">
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
    </div>
  );
}
