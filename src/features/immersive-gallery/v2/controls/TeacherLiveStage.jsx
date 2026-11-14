import React,{forwardRef} from 'react';
import {X,Minimize2} from 'lucide-react';
import MuseumScene from '../../v3/MuseumScene.jsx';
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
  curriculumNode=null,
  result=null,revealed=false,
  elapsed=0,remaining=0,
  respondedCount=null,
  isFullscreen=false,onExitFullscreen
},ref){
  const period=stage?.period??1;
  const periodLabel=period===1
    ?t(language,'TIẾT 01 · KHỞI ĐỘNG & THIẾT KẾ','PERIOD 01 · INVESTIGATE & DESIGN')
    :t(language,'TIẾT 02 · TẠO, KIỂM TRA & CẢI TIẾN','PERIOD 02 · CREATE, TEST & IMPROVE');
  const taskOpen=Boolean(session?.stageOpen);
  const statusLabel=taskOpen
    ?t(language,'ĐANG MỞ HOẠT ĐỘNG','TASK OPEN')
    :t(language,'HOẠT ĐỘNG CHƯA MỞ','TASK CLOSED');
  const options=stage?.options||[];
  return (
    <section className="stage adv-stage" ref={ref} data-testid="igv2-teacher-live-stage"
      aria-label={t(language,'Sân khấu hoạt động lớp học trực tiếp','Live classroom activity stage')}>
      {isFullscreen?<button type="button" className="adv-stage-exit-fullscreen" onClick={onExitFullscreen} aria-label={t(language,'Thoát toàn màn hình','Exit fullscreen')}><Minimize2 size={13}/> {t(language,'Thoát','Exit')}</button>:null}
      <div className="adv-stage-top">
        <span className="adv-stage-brand"><span className="adv-stage-dot" aria-hidden="true"/>BRIAN MUSEUM LAB · TEACHER LIVE</span>
        <span className="adv-stage-progress">
          <span>{t(language,'TIẾT','PERIOD')} {period}/2</span>
          <span>{t(language,'HOẠT ĐỘNG','ACTIVITY')} {Math.min(currentIndex+1,11)}/11</span>
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
            <div className="adv-stage-section">{periodLabel}{stage?.kind?` · ${stage.kind}`:''}</div>
            <h2 className="adv-stage-title">{stage?.title||t(language,'Đang tải hoạt động…','Loading activity…')}</h2>
            {language!=='en'&&stage?.vi?<p className="adv-stage-vi">{stage.vi}</p>:null}
            {stage?.question?<p className="adv-stage-question">{stage.question}</p>:null}
            {curriculumNode}
            {options.length>0&&!revealed?(
              <div className="adv-stage-options" role="list" aria-label={t(language,'Lựa chọn hoạt động','Activity options')}>
                {options.map((o,i)=><div className="adv-stage-option" role="listitem" key={i}><b style={{color:'#ffdd75',marginRight:6}}>{String.fromCharCode(65+i)}.</b>{o}</div>)}
              </div>
            ):null}
            {revealed&&stage?.expected?<div style={{fontSize:'clamp(10px,1.6cqi,13px)',color:'#b7e4c7',lineHeight:1.45}}>✓ {stage.expected}</div>:null}
            {stage?.sentence?<div className="adv-stage-sentence">“{stage.sentence}”</div>:null}
          </>
        )}
      </div>
      <div className="adv-stage-bottom">
        <strong className="adv-stage-timer" aria-label={t(language,'Thời gian còn lại','Time remaining')}>◷ {fmtClock(remaining)}</strong>
        <span className="status" data-open={taskOpen?'true':'false'} style={{background:taskOpen?'#dff3e8':'#fdecec',color:taskOpen?'#14532d':'#7f1d1d',padding:'3px 10px',fontSize:10,fontWeight:850,letterSpacing:'.08em'}}>{statusLabel}</span>
        <span style={{color:'#9fb3c6'}}>{respondedCount!=null?`${respondedCount} ${t(language,'phản hồi nhóm','group responses')}`:''}</span>
      </div>
      {readOnly?(
        <div className="adv-stage-readonly" aria-live="polite">
          <span>🔒 {frozenReason||t(language,'Bài học đã kết thúc · Chỉ xem','Completed lesson · View only')}</span>
        </div>
      ):null}
    </section>
  );
});
export default TeacherLiveStage;
export {TeacherLiveStage};
