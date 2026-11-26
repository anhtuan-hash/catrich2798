import React,{forwardRef,useEffect,useRef} from 'react';
import {X,Minimize2,Radio} from 'lucide-react';
import MuseumScene from '../../v3/MuseumScene.jsx';
import StageArt from './StageArt.jsx';
import TeacherLiveSlideContent from './TeacherLiveSlideContent.jsx';
import AseanLiveSlide from './AseanLiveSlide.jsx';
import {MUSEUM_ACTIVITY_SLIDES} from '../../v3/museumActivitySlides.js';
const t=(lang,vi,en)=>lang==='en'?en:vi;
const pad=value=>String(value).padStart(2,'0');
const fmtClock=sec=>{
  if(!Number.isFinite(sec)||sec<0)sec=0;
  const m=Math.floor(sec/60),s=Math.floor(sec%60);
  return String(m).padStart(2,'0')+':'+String(s).padStart(2,'0');
};
/**
 * TeacherLiveStage — Swiss paper activity board (all 11 slides).
 * Forwarded ref is the fullscreen element (requestFullscreen target).
 */
const TeacherLiveStage=forwardRef(function TeacherLiveStage({
  session,stage,currentIndex,stageCount=11,language='vi',
  readOnly=false,frozenReason='',focusMode=false,focusControls=null,
  spotlight=null,onCloseSpotlight,
  curriculumNode=null,view='task',questions=null,survey=null,questionIndex=0,onPresent,presentationBusy=false,
  revealed=false,
  elapsed=0,remaining=0,
  respondedCount=null, progressLabel=null,
  isFullscreen=false,onExitFullscreen,
  fullscreenControls=null,fullscreenPanel=null,toolHub=null,workspaceContent=null,
  assignments=[],assignmentId='',assignmentBusy=false,onAssignment,onAseanJoin,onAseanStudioHelp,aseanDraftTools,aseanHighlights,aseanContextCard
},ref){
  const period=stage?.period??1;
  const asean=stage?.kind==='asean';
  const phaseLanguage=asean?'en':language;
  const phaseName=period===1
    ?t(phaseLanguage,'KHỞI ĐỘNG & THIẾT KẾ','INVESTIGATE & DESIGN')
    :t(phaseLanguage,'TẠO, KIỂM TRA & CẢI TIẾN','CREATE, TEST & IMPROVE');
  const phaseLabel=`${phaseName}${stage?.kind&&stage.kind!=='asean'?` · ${String(stage.kind).toUpperCase()}`:''}`;
  const taskOpen=Boolean(session?.stageOpen);
  const statusLabel=readOnly?t(language,'CHỈ XEM','VIEW ONLY'):taskOpen
    ?t(language,'ĐANG MỞ HOẠT ĐỘNG','TASK OPEN')
    :t(language,'HOẠT ĐỘNG CHƯA MỞ','TASK CLOSED');
  const hasLessonSlide=Boolean(MUSEUM_ACTIVITY_SLIDES[stage?.id]);
  const isPresenting=asean&&isFullscreen;
  const scrollRegion=useRef(null);
  useEffect(()=>{
    if(isPresenting)scrollRegion.current?.focus({preventScroll:true});
  },[isPresenting]);
  useEffect(()=>{
    if(isPresenting&&scrollRegion.current)scrollRegion.current.scrollTop=0;
  },[isPresenting,currentIndex]);
  const videoLayout=Boolean(curriculumNode&&view==='video');
  const timer=<strong className="adv-stage-timer" aria-label={t(language,'Thời gian còn lại','Time remaining')}>{readOnly?'00:00':fmtClock(remaining)}</strong>;
  const status=<span className="adv-live-status" data-open={taskOpen&&!readOnly?'true':'false'} title={readOnly?frozenReason:undefined}><i/>{statusLabel}</span>;
  return (
    <section className={'stage adv-stage adv-stage--paper'+(hasLessonSlide?' adv-p2-slide':'')+(videoLayout?' adv-p2-video':'')+(asean?' adv-stage--asean':'')+(isPresenting?' is-presenting':'')+(toolHub?' adv-stage--with-hub':'')+(focusMode?' adv-stage--teaching-focus':'')} ref={ref} data-testid="igv2-teacher-live-stage"
      aria-label={t(language,'Sân khấu hoạt động lớp học trực tiếp','Live classroom activity stage')}>
      {isFullscreen&&!asean?<button type="button" className="adv-stage-exit-fullscreen" onClick={onExitFullscreen} aria-label={t(language,'Thoát toàn màn hình','Exit fullscreen')}><Minimize2 size={13}/> {t(language,'Thoát','Exit')}</button>:null}
      <div className="adv-slide-scroll" ref={scrollRegion} role={isPresenting?'region':undefined}
        tabIndex={isPresenting?0:undefined} aria-label={isPresenting?t(language,'Nội dung slide có thể cuộn','Scrollable slide content'):undefined}>
      <header className="adv-live-mast">
        {focusMode?<div className="adv-teaching-label"><Radio size={24} aria-hidden="true"/><div><span>{t(language,'LỚP HỌC TRỰC TIẾP','LIVE CLASS')}</span><h1>{t(language,'Màn hình giảng dạy','Teaching View')}</h1></div></div>:<h1>{t(language,'Giảng dạy','Teacher Live')}</h1>}
        <label className="adv-live-picker">
          <span className="adv-sr-only">{t(language,'Chọn bài học','Select lesson')}</span>
          <select value={assignmentId} disabled={assignmentBusy} onChange={onAssignment}>
            {!assignments.length?<option value="">{t(language,'Chưa có bài học','No lesson')}</option>:null}
            {assignments.map(item=><option value={item.id} key={item.id}>{item.title}{item.class_scope?` · ${item.class_scope}`:''}</option>)}
          </select>
        </label>
        <p className={'adv-live-flag'+(readOnly?' is-review':'')}><i/><strong>{readOnly?t(language,'Xem lại','Review'):t(language,'Trực tiếp','Live')}</strong>{!focusMode&&<span> · {t(language,'Học sinh vào bằng mã nhóm','Students join by group pass')}</span>}</p>
      </header>
      <div className="adv-live-meta">
        {focusMode?<>
          <div><small>{t(language,'TIẾT','PERIOD')}</small><strong>{pad(period)} / 02</strong></div>
          <div><small>{t(language,'HOẠT ĐỘNG','ACTIVITY')}</small><strong>{pad(Math.min(currentIndex+1,stageCount))} / {pad(stageCount)}</strong></div>
          <div><small>{t(language,'THỜI LƯỢNG','DURATION')}</small><strong>{stage?.minutes??'—'} {t(language,'phút','min')}</strong></div>
        </>:<><span>{t(language,'TIẾT','PERIOD')} {pad(period)} / 02</span><span>{t(language,'HOẠT ĐỘNG','ACTIVITY')} {pad(Math.min(currentIndex+1,stageCount))} / {pad(stageCount)}</span><span>{stage?.minutes?`${pad(stage.minutes)} ${t(language,'PHÚT','MIN')}`:''}</span></>}
      </div>
      <div className="adv-stage-body">
        {spotlight?(
          <div style={{display:'flex',flexDirection:'column',minHeight:0,flex:1,overflow:'hidden',gap:8}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',flex:'0 0 auto'}}>
              <strong style={{fontSize:12,letterSpacing:'.12em',textTransform:'uppercase',color:'#e10600'}}>{t(language,'TRÌNH CHIẾU NHÓM','GROUP SPOTLIGHT')} · {spotlight.groupLabel}</strong>
              <button type="button" onClick={onCloseSpotlight} style={{background:'#fffdf8',color:'#111',border:'1.5px solid #111',padding:'5px 10px',fontSize:11,cursor:'pointer'}} aria-label={t(language,'Đóng trình chiếu nhóm','Close group spotlight')}><X size={13}/> {t(language,'Đóng','Close')}</button>
            </div>
            <div style={{flex:'1 1 auto',minHeight:0,overflow:'hidden',background:'#0a1522',borderRadius:3}}>
              <MuseumScene gallery={spotlight.gallery} language={language} embedded initial3D={stage?.kind==='asean'}/>
            </div>
          </div>
        ):(
          <>
            <div className={'adv-stage-layout' + (videoLayout||stage?.kind==='asean'?' is-video':'')}>
              <div className="adv-stage-copy">
                <div className="adv-stage-section" lang={phaseLanguage}>{phaseLabel}</div>
                {stage?.kind==='asean'?<AseanLiveSlide focusMode={focusMode} currentIndex={currentIndex} language={language} revealed={revealed}
                  onJoin={onAseanJoin} onStudioHelp={onAseanStudioHelp} draftTools={aseanDraftTools} highlights={aseanHighlights} contextCard={aseanContextCard}/>:<>
                <h2 className="adv-stage-title">{stage?.title||t(language,'Đang tải hoạt động…','Loading activity…')}</h2>
                {language!=='en'&&stage?.vi?<p className="adv-stage-vi">{stage.vi}</p>:null}
                {hasLessonSlide?<TeacherLiveSlideContent key={stage.id} stage={stage} language={language}
                  view={view} questions={questions} revealed={revealed} survey={survey} readOnly={readOnly} curriculumNode={curriculumNode}
                  questionIndex={questionIndex} onPresent={onPresent} busy={presentationBusy}/>
                 :<div><p className="adv-stage-question">{stage?.question}</p>
                   {stage?.expected&&<p><strong>Group output</strong> · {stage.expected}</p>}
                   {revealed&&stage?.teaching&&<p>{stage.teaching}</p>}
                  </div>}</>}
              </div>
              {!videoLayout&&stage?.kind!=='asean'?<StageArt id={stage?.id}/>:null}
            </div>
          </>
        )}
      </div>
      </div>
      {toolHub?<aside className="adv-live-hub" data-testid="teacher-live-tool-hub" aria-label={t(language,'Công cụ giảng dạy','Tool hub')}>
        <h2>{t(language,'Công cụ giảng dạy','Tool hub')}</h2>
        <div className="adv-hub-status">{timer}{status}</div>
        {toolHub}
      </aside>:<div className={'adv-stage-bottom'+(asean?' adv-stage-bottom--asean':'')}>
        {timer}{status}
        {!asean&&<span>{progressLabel??(respondedCount!=null?`${respondedCount} ${t(language,'phản hồi nhóm','group responses')}`:'')}</span>}
      </div>}
      {focusControls&&<div className="adv-teaching-controls">{focusControls}</div>}
      {workspaceContent&&<div className="adv-live-evidence" hidden={isFullscreen}>{workspaceContent}</div>}
      {isFullscreen&&fullscreenControls?<div className="adv-stage-fullscreen-controls" data-testid="museum-fullscreen-viewer-controls"
        style={asean?undefined:{position:'absolute',zIndex:30,left:12,right:12,bottom:8,padding:'8px 10px',background:'#fffdf8',color:'#111',border:'1.5px solid #111'}}>
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
