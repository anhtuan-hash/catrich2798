import React from 'react';
import {ChevronDown,ChevronUp,Cloud,CloudAlert,CloudUpload,Trophy,Users} from 'lucide-react';
import MuseumCompetitionRibbon from './MuseumCompetitionRibbon.jsx';

const T=(lang,vi,en)=>lang==='en'?en:vi;

export function StudentLangToggle({language,onChange}){
 return <div className="bml-student-lang" role="group" aria-label={T(language,'Ngôn ngữ giao diện','Interface language')}>
  <button type="button" aria-pressed={language!=='en'} onClick={()=>onChange('vi')}>VI</button>
  <button type="button" aria-pressed={language==='en'} onClick={()=>onChange('en')}>EN</button>
 </div>;
}

export default function MuseumStudentWorkshop({language,onLanguageChange,onLogout,dossierHref,groupLabel,saveState,
 bannerExpanded,onBannerChange,lessonTemplate,title='Our Climate Action Museum',testId='museum-student-wizard',
 activity,navigation,children,overlays}){
 return <main className="bml bml-student-shell bml-student-canvas16 bml-student-editorial bml-student-dual-workspace" data-testid={testId}
  data-workshop-activity={activity} data-public-workshop={dossierHref?true:undefined}
  lang={language} data-ui-locale={language==='en'?'en-US':'vi-VN'}>
  <div className="bml-student-masthead" data-testid="student-masthead" data-banner-expanded={bannerExpanded}>
   <header className="bml-student-bar">
    <div className="bml-workshop-identity">
     <span className="bml-workshop-school" lang="en"><img src="/museum/branding/contest-school.png" width="28" height="34" alt=""/>Pétrus Ký School System</span>
     <span className="bml-group-pill"><Users size={18} aria-hidden="true"/>{groupLabel}</span>
    </div>
    <div className="bml-student-right">
     {saveState&&<span className={'bml-save-indicator bml-save-'+saveState} title={T(language,'Đã lưu bản nháp chưa có nghĩa là đã nộp bảo tàng.','Saved draft does not mean the museum project was submitted.')}>{saveState==='saved'?<><Cloud size={16}/>{T(language,'Đã lưu','Saved')}</>:
      saveState==='saving'?<><CloudUpload size={16}/>{T(language,'Đang lưu…','Saving…')}</>:<><CloudAlert size={16}/>{T(language,'Cần xử lý','Action needed')}</>}</span>}
     <StudentLangToggle language={language} onChange={onLanguageChange}/>
     {dossierHref?<a className="bml-outline bml-public-dossier-link" href={dossierHref}>{T(language,'Về hồ sơ dự thi','Back to the dossier')}</a>:
      <button type="button" className="bml-outline" onClick={onLogout}>{T(language,'Thoát','Exit')}</button>}
    </div>
   </header>
   <div className="bml-workshop-ribbon">
    <div id="bml-workshop-contest" hidden={!bannerExpanded}>
     <MuseumCompetitionRibbon language={language} lessonTemplate={lessonTemplate}/>
    </div>
    <div className="bml-workshop-ribbon-bar">
     {!bannerExpanded?<strong lang="en"><Trophy size={17} aria-hidden="true"/>{title}</strong>:null}
     <button type="button" className="bml-outline" aria-expanded={bannerExpanded} aria-controls="bml-workshop-contest"
      onClick={()=>onBannerChange(!bannerExpanded)}>
      {bannerExpanded?<>{T(language,'Ẩn banner','Hide banner')}<ChevronUp size={17}/></>:
       <>{T(language,'Hiện banner','Show banner')}<ChevronDown size={17}/></>}
     </button>
    </div>
   </div>
   <section className="bml-student-focus" data-testid="student-focus-switch" aria-labelledby="bml-workshop-heading">
    <h1 id="bml-workshop-heading">{T(language,'Xưởng bảo tàng của em','Your museum workshop')}<span aria-hidden="true">.</span></h1>
    {navigation}
   </section>
  </div>
  <div className="bml-student-content">
   <div className="bml-student-workbench" data-testid="student-one-screen-workspace">
    {children}
   </div>
  </div>
  {overlays}
 </main>;
}
