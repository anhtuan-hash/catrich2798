import React,{forwardRef} from 'react';
import {X,Minimize2} from 'lucide-react';
import MuseumScene from '../../v3/MuseumScene.jsx';
import StageArt from './StageArt.jsx';
import TeacherLiveSlideContent from './TeacherLiveSlideContent.jsx';
import {MUSEUM_ACTIVITY_SLIDES} from '../../v3/museumActivitySlides.js';
const t=(lang,vi,en)=>lang==='en'?en:vi;
const fmtClock=sec=>{
  if(!Number.isFinite(sec)||sec<0)sec=0;
  const m=Math.floor(sec/60),s=Math.floor(sec%60);
  return String(m).padStart(2,'0')+':'+String(s).padStart(2,'0');
};
/**
 * TeacherLiveStage — visual-first 16:9 activity stage.
 * Hard rule: aspect-ratio 16/9, overflow hidden, NO inner vertical scroll.
 * readOnly/frozen lessons get a non-blocking reason overlay; controls live in the toolbar (disabled + reason in screen).
 * Forwarded ref is the fullscreen element (requestFullscreen target).
 */
const TeacherLiveStage=forwardRef(function TeacherLiveStage({
  session,stage,currentIndex,language='vi',
  readOnly=false,frozenReason='',
  spotlight=null,onCloseSpotlight,
  curriculumNode=null,view='task',questions=null,survey=null,
  revealed=false,
  elapsed=0,remaining=0,
  respondedCount=null,
  isFullscreen=false,onExitFullscreen,
  fullscreenControls=null,fullscreenPanel=null
},ref){
  const period=stage?.period??1;
  const periodLabel=period===1
    ?t(language,'TIẾT 01 · KHỞI ĐỘNG & THIẾT KẾ','PERIOD 01 · INVESTIGATE & DESIGN')
    :t(language,'TIẾT 02 · TẠO, KIỂM TRA & CẢI TIẾN','PERIOD 02 · CREATE, TEST & IMPROVE');
  const taskOpen=Boolean(session?.stageOpen);
  const statusLabel=readOnly?t(language,'CHỈ XEM','VIEW ONLY'):taskOpen
    ?t(language,'ĐANG MỞ HOẠT ĐỘNG','TASK OPEN')
    :t(language,'HOẠT ĐỘNG CHƯA MỞ','TASK CLOSED');
  const hasLessonSlide=Boolean(MUSEUM_ACTIVITY_SLIDES[stage?.id]);
  const focusedLayout=hasLessonSlide&&stage.id!=='climate-detective';
  return (
    <section className={'stage adv-stage'+(hasLessonSlide?' adv-p2-slide':'')+(curriculumNode&&view==='video'?' adv-p2-video':'')} ref={ref} data-testid="igv2-teacher-live-stage"
      aria-label={t(language,'Sân khấu hoạt động lớp học trực tiếp','Live classroom activity stage')}>
      {isFullscreen?<button type="button" className="adv-stage-exit-fullscreen" onClick={onExitFullscreen} aria-label={t(language,'Thoát toàn màn hình','Exit fullscreen')}><Minimize2 size={13}/> {t(language,'Thoát','Exit')}</button>:null}
      <div className="adv-stage-top">
        <span className="adv-stage-brand"><span className="adv-stage-dot" aria-hidden="true"/>PÉTRUS KÝ SCHOOL SYSTEM · TEACHER LIVE</span>
        <span className="adv-stage-progress">
          <span>{t(language,'TIẾT','PERIOD')} {period}/2</span>
          <span>{t(language,'HOẠT ĐỘNG','ACTIVITY')} {Math.min(currentIndex+1,11)}/11</span>
          {stage?.minutes?<span>{stage.minutes} {t(language,'PHÚT','MIN')}</span>:null}
        </span>
      </div>
      <div className="adv-stage-body">
        {spotlight?(
          <div style={{display:'flex',flexDirection:'column',minHeight:0,flex:1,overflow:'hidden',gap:8}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',flex:'0 0 auto'}}>
              <strong style={{fontSize:12,letterSpacing:'.12em',textTransform:'uppercase',color:'#ffdd75'}}>{t(language,'TRÌNH CHIẾU NHÓM','GROUP SPOTLIGHT')} · {spotlight.groupLabel}</strong>
              <button type="button" onClick={onCloseSpotlight} style={{background:'rgba(255,255,255,.12)',color:'#fff',border:0,padding:'5px 10px',fontSize:11,cursor:'pointer',borderRadius:2}} aria-label={t(language,'Đóng trình chiếu nhóm','Close group spotlight')}><X size={13}/> {t(language,'Đóng','Close')}</button>
            </div>
            <div style={{flex:'1 1 auto',minHeight:0,overflow:'hidden',background:'#0a1522',borderRadius:3}}>
              <MuseumScene gallery={spotlight.gallery} language={language} embedded/>
            </div>
          </div>
        ):(
          <>
            <div className={'adv-stage-layout' + (curriculumNode||focusedLayout?' is-video':'')}>
              <div className="adv-stage-copy">
                <div className="adv-stage-section">{periodLabel}{stage?.kind?` · ${stage.kind}`:''}</div>
                <h2 className="adv-stage-title">{stage?.title||t(language,'Đang tải hoạt động…','Loading activity…')}</h2>
                {language!=='en'&&stage?.vi?<p className="adv-stage-vi">{stage.vi}</p>:null}
                {hasLessonSlide?<TeacherLiveSlideContent key={stage.id} stage={stage} language={language}
                  view={view} questions={questions} revealed={revealed} survey={survey} curriculumNode={curriculumNode}/>
                 :<p className="adv-stage-question">{stage?.question}</p>}
              </div>
              {!curriculumNode&&!focusedLayout?<StageArt id={stage?.id}/>:null}
            </div>
          </>
        )}
      </div>
      <div className="adv-stage-bottom">
        <strong className="adv-stage-timer" aria-label={readOnly?'Review mode':t(language,'Thời gian còn lại','Time remaining')}>◷ {readOnly?'REVIEW MODE':fmtClock(remaining)}</strong>
        <span className="status" data-open={taskOpen&&!readOnly?'true':'false'} title={readOnly?frozenReason:undefined} style={{background:readOnly?'#dff3e8':taskOpen?'#dff3e8':'#fdecec',color:readOnly?'#14532d':taskOpen?'#14532d':'#7f1d1d',padding:'3px 10px',fontSize:10,fontWeight:850,letterSpacing:'.08em'}}>{statusLabel}</span>
        <span style={{color:'#9fb3c6'}}>{respondedCount!=null?`${respondedCount} ${t(language,'phản hồi nhóm','group responses')}`:''}</span>
      </div>
      {isFullscreen&&fullscreenControls?<div className="adv-stage-fullscreen-controls" data-testid="museum-fullscreen-viewer-controls"
        style={{position:'absolute',zIndex:30,left:12,right:12,bottom:8,padding:'8px 10px',background:'rgba(8,28,51,.96)',borderRadius:8}}>
        {fullscreenControls}
      </div>:null}
      {isFullscreen&&fullscreenPanel?<div className="adv-stage-fullscreen-panel" data-testid="museum-fullscreen-viewer-panel"
        style={{position:'absolute',zIndex:40,top:'8%',right:12,width:'min(480px,92vw)',maxHeight:'72%',overflowY:'auto',background:'#fff',color:'#173452',borderRadius:10,padding:16,boxShadow:'0 12px 32px rgba(0,0,0,.3)'}}>
        {fullscreenPanel}
      </div>:null}

    </section>
  );
});
export default TeacherLiveStage;
export {TeacherLiveStage};
