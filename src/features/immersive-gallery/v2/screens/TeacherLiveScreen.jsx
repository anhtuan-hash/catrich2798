import React,{useCallback,useEffect,useMemo,useRef,useState} from 'react';
import {ArrowLeft,Box,Play,MonitorPlay,BookOpen,Printer,X} from 'lucide-react';
import {presentationFor} from '../../v3/livePresentation.js';
import {LIVE_STAGES,liveStage,LEGACY_LANGUAGE_MINI_LESSON} from '../../v3/liveLesson.js';
import {ASEAN_STAGES,isAsean,ASEAN_DESTINATIONS,ASEAN_FRAMES,aseanDestination,aseanPeerGroup,aseanWritingCard} from '../../v3/aseanLesson.js';
import {ASEAN_HUE_QUESTIONS} from '../../v3/aseanHueQuestions.js';
import {liveStaff} from '../../v3/museumLiveApi.js';
import {englishSystemGroupLabel} from '../../v3/museumApi.js';
import {MUSEUM_CURRICULUM_VIDEOS} from '../../v3/museumLiveExtensions.js';
import MuseumVoiceover from '../../v3/MuseumVoiceover.jsx';
import MuseumVideoLab from '../../v3/MuseumVideoLab.jsx';
import MuseumResourceHub from '../../v3/MuseumResourceHub.jsx';
import MuseumP2Workbook from '../../v3/MuseumP2Workbook.jsx';
import LessonResources from '../../v3/LessonResources.jsx';
import MuseumCurriculumStageVideo from '../../v3/MuseumCurriculumStageVideo.jsx';
import {loadPresenterRecovery,savePresenterRecovery,shouldRestorePanel} from '../../v3/museumPresenterRecovery.js';
import TeacherLiveStage from '../controls/TeacherLiveStage.jsx';
import TeacherToolbar from '../controls/TeacherToolbar.jsx';
import CommandCenter from '../controls/CommandCenter.jsx';
import AseanSubmissionBoard from '../controls/AseanSubmissionBoard.jsx';
import '../../v3/museumLive.css';
import '../../v3/museumLivePaper.css';
import '../../v3/museumLiveCompetition.css';
import '../../v3/museumLivePresenter.css';
import '../../v3/museumStageMotionV54.css';
import '../../v3/museumCurriculumVideo.css';
import '../../v3/museumBeforeAfter.css';
import '../advanced.css';
import '../teacherLivePaper.css';
const t=(lang,vi,en)=>lang==='en'?en:vi;
const link=typeof window!=='undefined'?window.location.origin+window.location.pathname+'#/gallery-create':'/#/gallery-create';
/**
 * 05 Teacher Live — Swiss Editorial V2.
 * State machine, mutation handlers, transport, fullscreen, keyboard shortcuts,
 * presenter recovery, voiceover share, spotlight and compare are preserved from v3
 * MuseumLiveTeacher (same modules: liveStaff, LIVE_STAGES, MUSEUM_CURRICULUM_VIDEOS,
 * museumPresenterRecovery). Presentation is the new editorial stage/toolbar/command-center.
 * Completed/frozen lessons are read-only with the reason surfaced; mutating controls are
 * disabled AND the reason banner is shown (disabled buttons alone are insufficient).
 */
export default function TeacherLiveScreen({language='vi',data,initialReview,onBack,onRefresh,onNavigate,initialTemplate,onTemplateChange,transport=liveStaff,standalone=false}){
  const assignments=useMemo(()=>(data?.assignments||[]).filter(a=>data?.publicReadOnly||data?.offlineReadOnly||a.created_by===data?.profile?.id||data?.profile?.role==='admin'),[data]);
  const assignmentIds=useMemo(()=>assignments.map(a=>a.id),[assignments]);
  const savedPreference=useRef(loadPresenterRecovery(typeof window!=='undefined'?window.sessionStorage:null,assignmentIds));
  const [assignmentId,setAssignmentId]=useState((assignmentIds.includes(initialReview)?initialReview:null)||assignments.find(a=>isAsean(a)===isAsean(initialTemplate)&&a.id===savedPreference.current?.assignmentId)?.id||assignments.find(a=>isAsean(a)===isAsean(initialTemplate))?.id||assignments[0]?.id||'');
  const assignment=assignments.find(a=>a.id===assignmentId);
  const asean=isAsean(assignment);
  const stages=asean?ASEAN_STAGES:LIVE_STAGES;
  const focusMode=asean&&(standalone||Boolean(import.meta.env.MUSEUM_LAB_STANDALONE));
  const useToolHub=standalone&&asean&&!focusMode;
  useEffect(()=>{if(assignment)onTemplateChange?.(assignment.lesson_template||'climate');},[assignment,onTemplateChange]);
  const lessonLink=assignmentId?link+'?lesson='+encodeURIComponent(assignmentId):link;
  const [state,setState]=useState(null),[busy,setBusy]=useState(false),[error,setError]=useState('');
  const [readError,setReadError]=useState('');
  const contentFrozenAt=state?.contentFrozenAt===undefined?(assignment?.content_frozen_at??null):state.contentFrozenAt;
  const canManageLesson=Boolean(assignment&&data?.profile?.id&&!data.publicReadOnly&&!data.offlineReadOnly);
  const historicalSession=state?.session?.assignmentId===assignmentId?state.session:null;
  const readOnly=Boolean(data?.publicReadOnly||data?.offlineReadOnly||contentFrozenAt||historicalSession?.status==='ended');
  const [browseIndex,setBrowseIndex]=useState(null);
  const [jumpIndex,setJumpIndex]=useState(null);
  const [previewReveal,setPreviewReveal]=useState(false);
  const requestSequence=useRef(0);
  const frozenReason=contentFrozenAt
    ?t(language,'Bài dạy đã kết thúc · Chỉ xem.','Lesson completed · View only.')
    :'';
  const [activeTool,setActiveTool]=useState(null),[qr,setQr]=useState('');
  const [motionOn,setMotionOn]=useState(savedPreference.current?.motionOn!==false);
  const [previewPresentation,setPreviewPresentation]=useState(null);
  const [nativeFullscreen,setNativeFullscreen]=useState(false);
  const [fullscreenFallback,setFullscreenFallback]=useState(false);
  const isFullscreen=nativeFullscreen||fullscreenFallback;
  const [spotlight,setSpotlight]=useState(null),[time,setTime]=useState(Date.now());
  const [studioGroupId,setStudioGroupId]=useState('');
  const [workbookOpen,setWorkbookOpen]=useState(false);
  const [paper,setPaper]=useState(false),[tally,setTally]=useState(['','','','']),[tallyNote,setTallyNote]=useState('');
  const stageRef=useRef(null),inlineToolsRef=useRef(null),activeRef=useRef(true);
  useEffect(()=>{
    if(useToolHub&&!isFullscreen&&activeTool)inlineToolsRef.current?.scrollIntoView({block:'nearest'});
  },[useToolHub,isFullscreen,activeTool]);
  const refresh=useCallback(async()=>{
    if(!assignmentId)return;
    const sequence=++requestSequence.current;
    try{
      const response=await transport('state',null,{assignmentId,...(readOnly&&browseIndex!=null?{viewStage:String(browseIndex)}:{})});
      if(activeRef.current&&sequence===requestSequence.current){setState(response);setReadError('');}
    }catch(e){if(activeRef.current&&sequence===requestSequence.current)setReadError(e.message);}
  },[assignmentId,transport,readOnly,browseIndex]);
  useEffect(()=>{activeRef.current=true;refresh();const id=window.setInterval(()=>{refresh();setTime(Date.now());},readOnly?15000:3000);return()=>{activeRef.current=false;window.clearInterval(id);};},[refresh]);
  useEffect(()=>{
    const sync=()=>{
      const active=Boolean(stageRef.current&&(document.fullscreenElement||document.webkitFullscreenElement)===stageRef.current);
      setNativeFullscreen(active);
      if(!active)setActiveTool(null);
    };
    document.addEventListener('fullscreenchange',sync);
    document.addEventListener('webkitfullscreenchange',sync);
    return()=>{
      document.removeEventListener('fullscreenchange',sync);
      document.removeEventListener('webkitfullscreenchange',sync);
    };
  },[]);
  useEffect(()=>{if(activeTool!=='qr')return;setQr('');let active=true;import('qrcode').then(({default:QR})=>QR.toDataURL(lessonLink,{width:220,margin:2})).then(url=>{if(active)setQr(url);}).catch(()=>{});return()=>{active=false;};},[activeTool,lessonLink]);
  const slideOnly=Boolean(contentFrozenAt&&!historicalSession);
  const session=historicalSession
    ?(readOnly?{...historicalSession,revealed:previewReveal}:historicalSession)
    :(slideOnly?{status:'ended',stageIndex:0,questionVersion:2,revealed:previewReveal}:null);
  const serverIndex=session?.stageIndex??0;
  const currentIndex=readOnly?(browseIndex??serverIndex):(jumpIndex??serverIndex);
  const stage=asean?stages[currentIndex]:(readOnly||jumpIndex!=null)
    ?(currentIndex===1&&session?.questionVersion!==2?LEGACY_LANGUAGE_MINI_LESSON:liveStage(currentIndex))
    :session?.stage;
  const publicAsean=asean&&data?.publicReadOnly;
  const publicExhibits=asean&&(publicAsean||readOnly)
   ?data?.publishedGalleries?.find(gallery=>gallery.assignment_id===assignmentId)?.destinations||[]:[];
  const exhibitByLabel=new Map(publicExhibits.map(exhibit=>[exhibit.groupLabel,exhibit]));
  const rawGroups=publicAsean
   ?(data.groups||[]).filter(group=>group.assignment_id===assignmentId&&exhibitByLabel.has(group.label))
   :state?.groups||[];
  const groups=rawGroups.map(g=>({...g,label:language==='en'?englishSystemGroupLabel(g.label):g.label}));
  const selectedGroup=groups.find(group=>group.id===studioGroupId)||groups[0];
  const selectedPublicExhibit=exhibitByLabel.get(rawGroups.find(group=>group.id===selectedGroup?.id)?.label);
  const publicGroupIds=publicAsean?new Set(groups.map(group=>group.id)):null;
  const publicResponses=publicAsean?(data.aseanResponses||[]).filter(record=>
    record.stage_index===currentIndex&&publicGroupIds.has(record.group_id)):[];
  const displayedStageLoaded=Boolean(historicalSession&&serverIndex===currentIndex&&
   (state.activityDataStageIndex??serverIndex)===currentIndex&&!publicAsean);
  const displayedResponses=publicAsean?publicResponses:displayedStageLoaded?(state.responses||[]):[];
  const writingScores=publicAsean?(data.aseanWritingScores||[]).filter(score=>
   score.stage_index===currentIndex&&publicGroupIds.has(score.group_id)):(state?.writingScores||[]);
  const studioProgress=asean&&currentIndex===2&&displayedStageLoaded&&Array.isArray(state?.studioProgress)
   ?state.studioProgress:null;
  const selectedDraft=studioProgress?.find(draft=>draft.groupId===selectedGroup?.id);
  const studentCard=asean&&selectedGroup&&(currentIndex===0||currentIndex===5)
   ?aseanWritingCard(selectedGroup.label,currentIndex===5):null;
  const assignedRoom=asean&&displayedStageLoaded&&(currentIndex===3||currentIndex===4)
   ?aseanPeerGroup(groups,selectedGroup?.id,currentIndex):null;
  const retestQuestion=currentIndex===4&&assignedRoom
   ?ASEAN_FRAMES[(state.retestProgress?.find(row=>englishSystemGroupLabel(row.group)===englishSystemGroupLabel(selectedGroup.label))?.question??0)-1]?.question:null;
  const groupPicker=(studentCard||assignedRoom)&&<label>{t(language,'Chọn nhóm','Select group')}{' '}
   <select value={selectedGroup.id} onChange={event=>setStudioGroupId(event.target.value)}>
    {groups.map(group=><option key={group.id} value={group.id}>{group.label}</option>)}
   </select>
  </label>;
  const aseanHighlights=asean&&groups.length&&(displayedStageLoaded||publicAsean)
   ?aseanStageHighlights(currentIndex,publicAsean?{responses:publicResponses}:state,groups,language,publicAsean):null;
  const minute=stages[currentIndex]?.minutes||0;
  const curriculumVideo=asean?null:MUSEUM_CURRICULUM_VIDEOS[currentIndex]||null;
  const presentation=presentationFor(currentIndex,readOnly?previewPresentation:
    jumpIndex==null&&historicalSession?.presentation?{stageIndex:serverIndex,...historicalSession.presentation}:null);
  const curriculumMode=presentation.view;
  const showingCurriculumVideo=Boolean(curriculumVideo&&curriculumMode==='video');
  const showingVideoCheck=Boolean(curriculumVideo&&curriculumMode==='check');
  const legacyActivityTwo=!asean&&currentIndex===1&&session?.questionVersion!==2;
  const showingSavedQuestions=legacyActivityTwo&&curriculumMode==='saved';
  const questions=legacyActivityTwo&&readOnly&&!showingSavedQuestions
    ?LIVE_STAGES[1].questions
    :stage?.questions??stage?.videoQuestions;
  const restoreKey=String(session?.id||'')+'/'+String(session?.stageIndex??'-');
  const hydratedKey=useRef('');
  useEffect(()=>{
    if(!session?.id)return;if(hydratedKey.current===restoreKey)return;
    const saved=loadPresenterRecovery(window.sessionStorage,assignmentIds);
    const same=shouldRestorePanel(saved,session)&&saved?.assignmentId===assignmentId;
    hydratedKey.current=restoreKey;
  },[session?.id,session?.stageIndex,assignmentId,assignmentIds,session]);
  useEffect(()=>{
    if(!session?.id||hydratedKey.current!==restoreKey)return;
    savePresenterRecovery(window.sessionStorage,{assignmentId,sessionId:session.id,stageIndex:currentIndex,motionOn,panel:isFullscreen?activeTool:null,showVoiceover:false,showVideoLab:false},assignmentIds);
  },[session?.id,session?.stageIndex,assignmentId,motionOn,isFullscreen,activeTool,assignmentIds,currentIndex]);
  useEffect(()=>{setPreviewPresentation(null);},[assignmentId,currentIndex]);
  const elapsed=(session?.elapsedSeconds||0)+(session?.status==='active'&&session?.stageStartedAt?Math.max(0,Math.floor((time-Date.parse(session.stageStartedAt))/1000)):0);
  const remaining=Math.max(0,minute*60-elapsed);
  const act=useCallback(async(action,details={})=>{
    if(!assignmentId||busy)return;
    if(readOnly){
      if(action==='next'||action==='previous'){
        setBrowseIndex(i=>{
          const base=i??(session?.stageIndex??0);
          return Math.max(0,Math.min(stages.length-1,base+(action==='next'?1:-1)));
        });
        setPreviewReveal(false);setSpotlight(null);
      }else if(action==='reveal')setPreviewReveal(v=>!v);
      else if(action==='present')setPreviewPresentation(details);
      return;
    }
    if(action==='next'||action==='previous'){
      const base=jumpIndex??session?.stageIndex??0;
      setJumpIndex(Math.max(0,Math.min(stages.length-1,base+(action==='next'?1:-1))));
      setSpotlight(null);
    }
    setBusy(true);setError('');
    try{const payload=action==='start'?{assignmentId}:{assignmentId,action,version:session?.version,...details};
      const out=await transport(action==='start'?'start':'control',payload);
      if(out.session){
        ++requestSequence.current;
        setState(prev=>({...prev,session:out.session}));
      }
      setJumpIndex(null);
      if(action==='next'||action==='previous'||action==='present')refresh();
      else await refresh();
    }catch(e){setJumpIndex(null);setError(e.message);}finally{setBusy(false);}
  },[assignmentId,busy,readOnly,session?.version,session?.stageIndex,jumpIndex,transport,refresh,language,stages.length]);
  const changeCompletion=async()=>{
    if(!canManageLesson||busy||(!contentFrozenAt&&!historicalSession))return;
    const confirmText=contentFrozenAt
      ?t(language,'Mở khóa bài dạy này để cho phép chỉnh sửa và nộp bài theo quyền hiện có?','Unlock this lesson to restore editing and submission permissions?')
      :t(language,'Kết thúc bài dạy này? Bài nộp, điểm, phản hồi và minh chứng sẽ chuyển sang chế độ chỉ xem.','End this lesson? Submissions, scores, responses and evidence will become view-only.');
    if(!window.confirm(confirmText))return;

    setBusy(true);setError('');
    try{
      const out=contentFrozenAt
        ?await transport('unlock-lesson',{assignmentId,contentFrozenAt})
        :await transport('control',{assignmentId,action:'end',version:historicalSession.version});
      ++requestSequence.current;
      setState(prev=>({...prev,...out}));
      setBrowseIndex(null);setPreviewReveal(false);setPreviewPresentation(null);setSpotlight(null);
      await Promise.all([refresh(),onRefresh?.()]);
    }catch(e){setError(e.message);if(e.status===409)await refresh();}finally{setBusy(false);}
  };
  const present=(view,questionIndex=0)=>act('present',{stageIndex:currentIndex,view,questionIndex});
  const freeze=async()=>{if(readOnly)return;setBusy(true);setError('');try{await transport('freeze-survey',{assignmentId,version:session.version,...(paper?{counts:tally.map(v=>v===''?null:Number(v)),note:tallyNote}:{})});await refresh();}catch(e){setError(e.message);}finally{setBusy(false);}};
  const shareNarration=async()=>{
    if(readOnly||busy||!session||session.status==='ended')return;
    setBusy(true);setError('');
    try{
      const send=version=>transport('media-voice',{assignmentId,stageIndex:currentIndex,version,enabled:!session.media?.voiceEnabled});
      let out;
      try{out=await send(session.version);}
      catch(e){if(e.status!==409)throw e;const latest=await transport('state',null,{assignmentId});if(latest.session?.stageIndex!==currentIndex)throw new Error(t(language,'Hoạt động đã đổi. Hãy mở lại công cụ giọng đọc.','The activity changed. Reopen the narration tool.'));out=await send(latest.session.version);}
      if(out.session)setState(prev=>({...prev,session:out.session}));
      await refresh();
    }catch(e){setError(e.message);}finally{setBusy(false);}
  };
  const spotlightGroup=async groupId=>{
    setBusy(true);setError('');
    try{const r=await transport('group-gallery',null,{assignmentId,groupId});
      if(!r?.draft?.rooms?.length||asean&&!r.draft.rooms.some(room=>room.exhibits?.some(exhibit=>exhibit.kind==='image')))
       throw new Error(t(language,'Nhóm chưa lưu bản triển lãm có ảnh.','This group has not saved an exhibit with photos yet.'));
      const urls=new Map((r.artworks||[]).map(a=>[a.id,a.image_url]));
      const gallery={...r.draft,rooms:r.draft.rooms.map((room,i)=>({...room,id:'class-room-'+i,exhibits:room.exhibits.map((e,j)=>({...e,id:'class-exhibit-'+i+'-'+j,image_url:urls.get(e.asset_id)||'',status:'published'}))}))};
      setSpotlight({gallery,groupLabel:language==='en'?englishSystemGroupLabel(r.groupLabel):r.groupLabel});
    }catch(e){setError(e.message);}finally{setBusy(false);}
  };
  const compareGroup=async groupId=>transport('checkpoint-compare',null,{assignmentId,groupId});
  const fullscreen=async()=>{
    if(fullscreenFallback){setFullscreenFallback(false);setActiveTool(null);return;}
    try{
      const stageElement=stageRef.current;
      if(!stageElement)return;
      const active=document.fullscreenElement||document.webkitFullscreenElement;
      if(active){
        const exit=document.exitFullscreen||document.webkitExitFullscreen;
        await exit?.call(document);
        return;
      }
      const enter=stageElement.requestFullscreen||stageElement.webkitRequestFullscreen;
      if(enter){await enter.call(stageElement);return;}
      if(asean)setFullscreenFallback(true);
      else setError(t(language,'Trình duyệt không hỗ trợ chế độ toàn màn hình.','Fullscreen mode is unavailable in this browser.'));
    }catch{
      if(asean)setFullscreenFallback(true);
      else setError(t(language,'Không thể mở toàn màn hình. Hãy cho phép chế độ toàn màn hình trên trình duyệt.','Fullscreen was blocked. Please enable it in your browser.'));
    }
  };
  const toggleTool=key=>{if(key==='qr'&&(data?.offlineReadOnly||data?.publicReadOnly))return;setActiveTool(cur=>cur===key?null:key);};
  useEffect(()=>{
    if(!isFullscreen)return;
    const handle=e=>{
      if(e.altKey||e.ctrlKey||e.metaKey||e.isComposing||e.repeat)return;
      const target=e.target,tag=target?.tagName?.toLowerCase();
      if(['input','textarea','select'].includes(tag)||target?.isContentEditable)return;
      if(tag==='button'&&e.key===' ')return;
      const key=e.key.toLowerCase();
      if(key==='escape'&&activeTool){e.preventDefault();setActiveTool(null);return;}
      if(key==='escape'&&fullscreenFallback){e.preventDefault();setFullscreenFallback(false);return;}
      if(key==='arrowright'&&currentIndex<stages.length-1){e.preventDefault();act('next');}
      else if(key==='arrowleft'&&currentIndex>0){e.preventDefault();act('previous');}
      else if(key==='v'){e.preventDefault();toggleTool('voice');}
      else if(key==='r'){e.preventDefault();toggleTool('resources');}
      else if(key==='y'){e.preventDefault();toggleTool('video');}
      else if(key==='f'){e.preventDefault();fullscreen();}
      else if(key===' '&&!readOnly){e.preventDefault();act(session?.status==='paused'?'resume':'pause');}
    };
    window.addEventListener('keydown',handle);return()=>window.removeEventListener('keydown',handle);
  },[isFullscreen,fullscreenFallback,asean,activeTool,busy,currentIndex,session?.version,session?.status,act,readOnly,stages.length]);
  const respondedCount=displayedStageLoaded&&Array.isArray(state?.responses)?state.responses.length:null;
  const survey=state?.survey;
  const surveyOptions=displayedStageLoaded&&state?.result?.options;
  const slideSurvey=currentIndex===2&&survey&&surveyOptions?.length===survey.options?.length
    ?{...survey,options:survey.options.map((option,index)=>({...option,label:surveyOptions[index].label}))}
    :survey;
  const curriculumNode=curriculumVideo?(
    <div className="adv-nasa-strip">
      <strong>NASA VIDEO · ACTIVITY {currentIndex+1}</strong>
      <div className="adv-slide-view-tabs" role="group" aria-label={t(language,'Góc nhìn dạy học của hoạt động','Activity teaching view')}>
        <button type="button" aria-pressed={showingCurriculumVideo} disabled={busy} onClick={()=>present('video')}>{t(language,'Xem clip NASA','Watch NASA clip')}</button>
        {questions?.length?<button type="button" aria-pressed={showingVideoCheck} disabled={busy} onClick={()=>present('check')}>
          {legacyActivityTwo&&!readOnly?t(language,'3 câu hỏi của phiên cũ','3 questions from this session'):t(language,'3 câu hỏi video','3 video questions')}
        </button>:null}
        {legacyActivityTwo&&readOnly?<button type="button" aria-pressed={showingSavedQuestions} onClick={()=>present('saved')}>
          {t(language,'Câu hỏi đã lưu của phiên cũ','Saved questions from this session')}
        </button>:null}
        <button type="button" aria-pressed={curriculumMode==='task'} disabled={busy} onClick={()=>present('task')}>{t(language,'Nhiệm vụ','Task')}</button>
      </div>
      {showingCurriculumVideo?<MuseumCurriculumStageVideo video={curriculumVideo} stageIndex={currentIndex} language={language}
        continueLabel={legacyActivityTwo&&!readOnly?t(language,'Xem câu hỏi đã lưu','View saved questions'):undefined}
        onContinue={()=>present(questions?.length?'check':'task')}/>:null}
    </div>
  ):null;
  const exitResponses=stage?.kind==='exit'&&serverIndex===currentIndex&&Array.isArray(state?.responses)
    ?state.responses.filter(r=>r.stage_index===currentIndex||stage?.kind==='exit').slice(0,30):[];
  const toolbar=session?<TeacherToolbar focusMode={focusMode} onBrowse={readOnly?(index)=>{setBrowseIndex(index);setPreviewReveal(false);setPreviewPresentation(null);setSpotlight(null);}:undefined} hub={useToolHub&&!isFullscreen} offline={!!data?.offlineReadOnly} language={language} readOnly={readOnly} busy={busy} session={session} currentIndex={currentIndex} stageCount={stages.length}
    motionOn={motionOn} activeTool={activeTool} presentationActive={asean&&isFullscreen} showJoinQr={!data?.publicReadOnly}
    onChangeCompletion={canManageLesson&&(historicalSession||contentFrozenAt)?changeCompletion:undefined}
    completed={Boolean(contentFrozenAt)}
    onBack={onBack} onPrevious={()=>act('previous')} onNext={()=>act('next')} onToggleTask={()=>act(session.stageOpen?'close':'open')}
    onReveal={()=>act('reveal')} onToggleTool={toggleTool} onFullscreen={fullscreen}
    onToggleMotion={()=>setMotionOn(v=>!v)} onTogglePause={()=>act(session.status==='paused'?'resume':'pause')}
    onRefresh={()=>{refresh();onRefresh&&onRefresh();}}/>:null;
  const workspaceContent=session?(<>
          {!asean&&currentIndex===2&&!state?.survey&&!readOnly?(
            <div className="adv-panel-overlay" role="region" aria-label={t(language,'Chốt khảo sát','Freeze survey')}>
              <button type="button" className="adv-toolbtn" onClick={()=>setPaper(v=>!v)} aria-pressed={paper}>{paper?t(language,'Ẩn kiểm phiếu giấy','Hide paper tally'):t(language,'Nhập kiểm phiếu giấy','Enter paper tally')}</button>
              {paper?(<div style={{marginTop:10,display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:8}}>
                {['','','',''].map((_,i)=><input key={i} inputMode="numeric" value={tally[i]} placeholder={t(language,'Số nhóm','Count')} onChange={e=>setTally(v=>v.map((x,j)=>j===i?e.target.value:x))} aria-label={t(language,'Số nhóm lựa chọn ','Groups choosing option ')+(i+1)} style={{padding:'6px 8px',border:'1px solid var(--adv-divider)'}}/>)}
                <input value={tallyNote} placeholder={t(language,'Ghi chú (không bắt buộc)','Note (optional)')} onChange={e=>setTallyNote(e.target.value)} style={{gridColumn:'1 / -1',padding:'6px 8px',border:'1px solid var(--adv-divider)'}}/>
                <button type="button" className="adv-toolbtn adv-toolbtn--primary" style={{gridColumn:'1 / -1'}} disabled={busy} onClick={freeze}>{t(language,'Chốt khảo sát','Freeze survey')}</button>
              </div>):(<button type="button" className="adv-toolbtn adv-toolbtn--primary" style={{marginLeft:8}} disabled={busy} onClick={freeze}>{t(language,'Chốt khảo sát trực tuyến','Freeze online survey')}</button>)}
            </div>
          ):null}
          {activeTool&&!isFullscreen&&<div ref={inlineToolsRef}>
          {!isFullscreen&&activeTool==='qr'?(
            <div className="adv-panel-overlay" role="region" aria-label={t(language,'Mã QR vào lớp','Class join QR')}>
              <button type="button" className="adv-panel-close" onClick={()=>setActiveTool(null)} aria-label={t(language,'Đóng mã QR','Close QR')}><X size={14}/></button>
              <h3 style={{marginTop:0}}>{t(language,'Học sinh quét mã QR để vào','Students scan to join')}</h3>
              {qr?<><img className="adv-qr-img" src={qr} alt={t(language,'Mã QR vào bài học','Lesson join QR code')}/>
                <div style={{marginTop:10,display:'flex',gap:8,flexWrap:'wrap'}}>
                  <button type="button" className="adv-toolbtn" onClick={()=>window.print()}><Printer size={14}/>{t(language,'In mã QR','Print QR')}</button>
                  <button type="button" className="adv-toolbtn" onClick={async()=>{try{await navigator.clipboard.writeText(lessonLink);}catch{window.prompt(t(language,'Liên kết vào lớp','Class join link'),lessonLink);}}}>{t(language,'Sao chép liên kết','Copy link')}</button>
                </div></>:<p>{t(language,'Đang tạo mã QR…','Generating QR…')}</p>}
            </div>
          ):null}
          {!isFullscreen&&activeTool==='notes'?(
            <div className="adv-panel-overlay" role="region" aria-label={t(language,'Ghi chú dạy','Teaching notes')}>
              <button type="button" className="adv-panel-close" onClick={()=>setActiveTool(null)} aria-label={t(language,'Đóng ghi chú','Close notes')}><X size={14}/></button>
              {asean?<AseanTeachingNotes stage={stage} language={language} uploadsEnabled={data?.creatorSettings?.upload_enabled}/>:<LessonResources stageIndex={currentIndex} teacher language={language}/>}
            </div>
          ):null}
          {!isFullscreen&&activeTool==='resources'?(
            <div className="adv-panel-overlay" role="region" aria-label={t(language,'Thư viện nghiên cứu','Research library')}>
              <button type="button" className="adv-panel-close" onClick={()=>setActiveTool(null)} aria-label={t(language,'Đóng thư viện','Close library')}><X size={14}/></button>
              {asean?<AseanSources/>:<MuseumResourceHub stage={stage} language={language}/>}
            </div>
          ):null}
          {!isFullscreen&&activeTool==='voice'?(
            <div className="adv-panel-overlay" role="region" aria-label={t(language,'Giọng đọc','Voiceover')}>
              <button type="button" className="adv-panel-close" onClick={()=>setActiveTool(null)} aria-label={t(language,'Đóng giọng đọc','Close voiceover')}><X size={14}/></button>
              <MuseumVoiceover stage={stage} language={language} compact shareWithStudents={Boolean(session?.media?.voiceEnabled)} onShareToggle={readOnly?null:shareNarration}/>
            </div>
          ):null}
          {!isFullscreen&&activeTool==='video'?(
            <div className="adv-panel-overlay" role="region" aria-label={t(language,'Video Lab','Video Lab')}>
              <button type="button" className="adv-panel-close" onClick={()=>setActiveTool(null)} aria-label={t(language,'Đóng Video Lab','Close Video Lab')}><X size={14}/></button>
              <MuseumVideoLab mode="teacher" readOnly={readOnly} stage={stage} stageIndex={currentIndex} media={session?.media} assignmentId={assignmentId} version={session?.version} language={language} transport={transport}/>
            </div>
          ):null}
          </div>}
          {!isFullscreen&&canManageLesson&&session.p2Enabled&&!slideOnly?<details className="p2-workbook-section"
            onToggle={event=>setWorkbookOpen(event.currentTarget.open)}>
            <summary>{t(language,'Sổ phiếu P2 và đánh giá lớp','P2 worksheets and classroom assessment')}</summary>
            {workbookOpen?<div className="p2-controls">
              {!readOnly?<p>{t(language,'Thu nhật ký D2 sau một tuần học rồi khóa hồ sơ.','Collect the D2 logs after one school week, then lock the lesson record.')}</p>:null}
              {onNavigate?<button type="button" className="adv-toolbtn" onClick={()=>onNavigate('submissions')}>{t(language,'E2 · Chấm rubric bài nộp','E2 · Score group submissions')}</button>:null}
            </div>:null}
            {workbookOpen?<MuseumP2Workbook key={assignmentId} language={language} role="teacher" transport={transport}
              assignmentId={assignmentId} groups={groups} readOnly={readOnly}/>:null}
          </details>:null}
          {!useToolHub&&<div className="content-gap" style={{marginTop:20}}/>}
          {!slideOnly&&(!asean||!data?.publicReadOnly)?<CommandCenter groups={groups} responses={state?.responses||[]} feedback={state?.feedback||[]}
            microResults={state?.microResults||[]} helpGroups={state?.helpGroups||[]}
            session={session} busy={busy} onRefresh={refresh} onSpotlight={spotlightGroup} onCompare={compareGroup} language={language} asean={asean}/>:null}
          {!slideOnly&&asean&&currentIndex===4&&displayedStageLoaded&&state?.retestProgress?.length>0&&
            <AseanRetestProgress rows={state.retestProgress} language={language}/>}
          {asean&&currentIndex===0&&displayedStageLoaded&&!data?.publicReadOnly&&<section className="bml-surface">
            <h3>{t(language,'Kết quả trắc nghiệm Huế','Huế quiz results')}</h3>
            <p>{state.hueQuizResults?.length??0}/{groups.length} {t(language,'nhóm đã nộp','groups submitted')}</p>
            {state.hueQuizResults?.map(({group_id,details})=><details key={group_id}>
              <summary>{groups.find(group=>group.id===group_id)?.label} · {details.score}/{ASEAN_HUE_QUESTIONS.length}</summary>
              <ol lang="en">{details.answers.map((choice,i)=><li key={ASEAN_HUE_QUESTIONS[i].prompt}>
                {ASEAN_HUE_QUESTIONS[i].options[choice]} · {choice===details.expected[i]?'Correct':'Incorrect'}
              </li>)}</ol>
            </details>)}
          </section>}
          {asean&&displayedResponses.length>0&&<AseanSubmissionBoard
            key={assignmentId+'-'+currentIndex} language={language} stage={stage} stageIndex={currentIndex}
            groups={groups} responses={displayedResponses} writingScores={writingScores}
            canGrade={canManageLesson&&!readOnly}
            onSaveGrade={async(groupId,marks)=>{
             await transport('asean-writing-grade',{assignmentId,groupId,stageIndex:currentIndex,...marks});
             await refresh();
            }}/>}
          {exitResponses.length?(
            <>
              <div className="content-gap"><div className="section-title"><span>{t(language,'PHẢN HỒI NHÓM ĐÃ LƯU','RECORDED GROUP REFLECTIONS')}</span><span className="right">{t(language,'Minh chứng chỉ đọc','Read-only evidence')}</span></div></div>
              <div className="panel">
                <div className="adv-reflection-list">
                  {exitResponses.map((r,i)=>{
                    const g=groups.find(x=>x.id===r.group_id);
                    return <div className="adv-reflection-row" key={r.id||i}><strong>{englishSystemGroupLabel(g?.label||t(language,'Nhóm','Group'))}</strong><span>{typeof r.value==='string'?r.value:JSON.stringify(r.value)}</span></div>;
                  })}
                </div>
              </div>
            </>
          ):null}
  </>):null;
  // Fullscreen is rendered inside the fullscreen element; every viewer tool
  // remains usable without opening an API write path for completed lessons.
  const fullscreenPanel=isFullscreen&&activeTool?(
   <div className="adv-fullscreen-viewer-tool">
    <button type="button" className="adv-toolbtn" onClick={()=>setActiveTool(null)} aria-label="Close presenter tool">
     <X size={14}/> Close
    </button>
    {activeTool==='voice'?<MuseumVoiceover stage={stage} language={language} compact
      shareWithStudents={Boolean(session?.media?.voiceEnabled)}
      onShareToggle={readOnly?null:shareNarration}/>:null}
    {activeTool==='video'?<MuseumVideoLab mode="teacher" readOnly={readOnly} stage={stage}
      stageIndex={currentIndex} media={session?.media} assignmentId={assignmentId} version={session?.version}
      language={language} transport={transport}/>:null}
    {activeTool==='notes'?(asean?<AseanTeachingNotes stage={stage} language={language} uploadsEnabled={data?.creatorSettings?.upload_enabled}/>:<LessonResources stageIndex={currentIndex} teacher language={language}/>):null}
    {activeTool==='resources'?(asean?<AseanSources/>:<MuseumResourceHub stage={stage} language={language}/>):null}
    {activeTool==='qr'?<div><h3>Student Creator QR</h3>
      {qr?<img src={qr} width="160" height="160" alt="Student Creator QR"/>:null}
      <p>{lessonLink}</p></div>:null}
   </div>
  ):null;
  return (
    <div className="igv2 igv2-screen" data-testid="igv2-teacher-live-screen">
      {readOnly?<div className="adv-banner adv-banner--success" role="status">🔒 {frozenReason||t(language,'Chế độ chỉ xem.','View-only mode.')} {t(language,'Bạn vẫn có thể xem lại hoạt động, video, bài nộp và minh chứng.','You can still review activities, videos, submissions and evidence.')}</div>:null}
      {error||readError?<div className="adv-banner adv-banner--danger" role="alert">{error||readError}</div>:null}
      {slideOnly?<div className="adv-banner" role="status">{t(language,'Đang hiển thị slide theo kế hoạch P2. Dữ liệu đã lưu hiển thị khi phiên lớp có sẵn.','Showing the P2 teaching slides. Saved responses appear when the classroom session is available.')}</div>:null}
      {!assignments.length?<div className="panel" style={{padding:24,textAlign:'center'}}><BookOpen size={26}/><p>{t(language,'Hãy tạo bài học và mã nhóm trước khi mở Teacher Live.','Create a lesson and group passes first.')}</p></div>:null}
      {!session&&assignments.length?<label className="adv-dossier-field" style={{marginBottom:12}}>{t(language,'Chọn lớp và bài học','Choose lesson / class')}
        <select className="adv-assignment-select" value={assignmentId} disabled={busy} onChange={e=>{++requestSequence.current;setAssignmentId(e.target.value);setBrowseIndex(null);setJumpIndex(null);setPreviewReveal(false);setState(null);setSpotlight(null);}} aria-label={t(language,'Chọn bài học','Select lesson')}>
          {!assignments.length?<option value="">{t(language,'Chưa có bài học được giao','No lesson assigned')}</option>:null}
          {assignments.map(a=><option value={a.id} key={a.id}>{a.title} · {a.class_scope||''}</option>)}
        </select></label>:null}
      {assignmentId&&!session&&assignments.length?(
        <div className="panel" style={{padding:24,textAlign:'center'}}>
          <MonitorPlay size={42}/>
          <h2 style={{margin:'10px 0 6px'}}>{t(language,'Bắt đầu dạy trực tiếp','Start live teaching')}</h2>
          <p style={{fontSize:13,color:'var(--igv2-muted,#6b7782)',maxWidth:640,margin:'0 auto 14px'}}>{asean?'Six group activities over two 45-minute periods. Starting opens Activity 1 for all groups.':t(language,'Bài học có 11 hoạt động trong 90 phút (45 + 45). Nhấn Bắt đầu để học sinh vào hoạt động đầu tiên ngay; mỗi lần chuyển hoạt động, phần tương tác tiếp theo cũng tự mở.','The lesson has 11 stages over 90 minutes (45 + 45). Starting the lesson immediately opens the first student activity; advancing opens the next activity automatically.')}</p>
          <button type="button" className="adv-toolbtn adv-toolbtn--primary" disabled={busy||readOnly} onClick={()=>act('start')}><Play size={16}/>{t(language,'Bắt đầu buổi dạy','Start lesson')}</button>
        </div>
      ):null}
      {session?(
        <>
          <TeacherLiveStage ref={stageRef} focusMode={focusMode}
            session={session} stage={stage} currentIndex={currentIndex} stageCount={stages.length} language={language}
            readOnly={readOnly} frozenReason={frozenReason}
            spotlight={spotlight} onCloseSpotlight={()=>setSpotlight(null)}
            curriculumNode={curriculumNode} view={showingSavedQuestions?'check':curriculumMode}
            questionIndex={presentation.questionIndex} onPresent={showingSavedQuestions?(view,index)=>present(view==='check'?'saved':view,index):present} presentationBusy={busy}
            questions={questions} survey={slideSurvey}
            revealed={Boolean(session.revealed)}
            elapsed={elapsed} remaining={remaining}
            respondedCount={asean?null:respondedCount}
            isFullscreen={isFullscreen} onExitFullscreen={fullscreen}
            assignments={assignments} assignmentId={assignmentId} assignmentBusy={busy}
            onAssignment={e=>{++requestSequence.current;setAssignmentId(e.target.value);setBrowseIndex(null);setJumpIndex(null);setPreviewReveal(false);setState(null);setSpotlight(null);}}
            onAseanJoin={asean&&!data?.offlineReadOnly&&!data?.publicReadOnly?()=>toggleTool('qr'):undefined}
            onAseanStudioHelp={asean?()=>toggleTool('notes'):undefined}
            aseanHighlights={aseanHighlights}
            aseanContextCard={groupPicker&&<details className="asean-slide-disclosures asean-slide-writing-card" lang={language}>
             <summary>{studentCard?t(language,'Thẻ viết của nhóm','Group writing card'):t(language,'Phòng được giao theo nhóm','Assigned exhibit by group')}</summary>
             {groupPicker}
             {studentCard?<dl lang="en"><dt>{studentCard.title}</dt><dd>{studentCard.country}</dd>
              <dt>Visitors can …</dt><dd>{studentCard.experience}</dd>
              <dt>Visitors should …</dt><dd>{studentCard.advice}</dd>
             </dl>:<dl>
              <dt>{t(language,'Phòng cần tham quan','Exhibit to visit')}</dt>
              <dd>{[assignedRoom.label,aseanDestination(assignedRoom.label)?.name].filter(Boolean).join(' · ')}</dd>
              {retestQuestion&&<><dt>{t(language,'Câu hỏi thử lại','Retest question')}</dt><dd lang="en">{retestQuestion}</dd></>}
             </dl>}
            </details>}
            aseanDraftTools={asean&&currentIndex===2&&selectedPublicExhibit?<div>
              <label>{t(language,'Triển lãm của','Exhibit from')}{' '}
               <select value={selectedGroup.id} onChange={event=>setStudioGroupId(event.target.value)}>
                {groups.map(group=><option key={group.id} value={group.id}>{group.label}</option>)}
               </select>
              </label>
              <button type="button" className="adv-toolbtn" onClick={()=>onNavigate('gallery',selectedPublicExhibit.id)}>
               <Box size={15}/>{t(language,'Mở bản công bố','Open published version')}
              </button>
              <p>{t(language,'Liên kết mở sản phẩm sau duyệt. V1 là bản được xác nhận đã lưu trước lượt góp ý.','This link opens the approved exhibit. The V1 label identifies a verified version saved before visitor feedback.')}</p>
             </div>:asean&&currentIndex===2&&!data?.publicReadOnly&&selectedGroup?<div>
              <label>{t(language,'Bản đã lưu của','Saved draft from')}{' '}
               <select value={selectedGroup.id} onChange={event=>setStudioGroupId(event.target.value)}>
                {groups.map(group=>{
                 const draft=studioProgress?.find(item=>item.groupId===group.id);
                 const status=draft?.complete?t(language,'đủ nội dung','complete'):draft?t(language,'đã lưu nháp','draft saved'):t(language,'chưa lưu','not saved');
                 return <option key={group.id} value={group.id}>{group.label}{studioProgress?` · ${status}`:''}</option>;
                })}
               </select>
              </label>
              <button type="button" className="adv-toolbtn" disabled={busy||Boolean(studioProgress&&!selectedDraft)} onClick={()=>spotlightGroup(selectedGroup.id)}>
               <Box size={15}/>{t(language,'Mở bản lưu 3D','Open saved 3D draft')}
              </button>
              {selectedDraft?.missing?.length>0&&<details className="asean-slide-disclosures">
               <summary>{t(language,'Mục còn thiếu của nhóm','What this draft is missing')} ({selectedDraft.missing.length})</summary>
               <ul lang="en">{selectedDraft.missing.map(item=><li key={item}>{item}</li>)}</ul>
              </details>}
             </div>:null}
            toolHub={useToolHub&&!isFullscreen?toolbar:null} workspaceContent={useToolHub?workspaceContent:null}
            focusControls={focusMode&&!isFullscreen?toolbar:null} fullscreenControls={toolbar} fullscreenPanel={fullscreenPanel}/>
          {!focusMode&&!useToolHub&&!isFullscreen&&<div className="adv-live-dock">{toolbar}</div>}
          {!useToolHub&&workspaceContent}
        </>
      ):null}
      {onBack?<button type="button" className="adv-toolbtn" style={{marginTop:16}} onClick={onBack}><ArrowLeft size={14}/>{t(language,'Quay lại','Back')}</button>:null}
    </div>
  );
}
export {TeacherLiveScreen};

function aseanStageHighlights(stage,state,groups,language,publicReadOnly){
 const found=Array.isArray(state.responses)?state.responses.length:null;
 const item=(vi,en,value)=>Number.isInteger(value)
  ?{label:t(language,vi,en),count:`${value}/${groups.length}`}:null;
 let result;
 switch(stage){
  case 0: result=[
   item('Nhóm đã nộp hai câu đầu','Baseline writing submitted',found),
   item('Nhóm đã nộp trắc nghiệm Huế','Hué quiz submitted',state.hueQuizResults?.length),
  ];break;
  case 1: result=[item('Nhóm đã nộp kế hoạch ảnh','Photo plans submitted',found)];break;
  case 2: result=[
   item('Nhóm đã lưu bản nháp','3D drafts saved',state.studioProgress?.length),
   item('Bản nháp đủ nội dung','Complete 3D drafts',state.studioProgress?.filter(draft=>draft.complete).length),
  ];break;
  case 3: result=[item('Nhóm đã nộp phiếu góp ý','Visitor feedback submitted',found)];break;
  case 4: result=[
   item('Bản chỉnh sửa sẵn sàng để thử','Revised exhibits ready',state.retestProgress?.filter(row=>row.ready).length),
   item('Nhóm đã nộp phiếu thử lại','Retests submitted',publicReadOnly?found:state.retestProgress?.filter(row=>row.score!=null).length),
  ];break;
  case 5: result=[
   item('Phiếu vận dụng đã ghi nhận','Transfer cards recorded',found),
   item('Nhóm đã gửi triển lãm 3D','3D exhibits submitted',groups.filter(group=>
     ['submitted','ttcm_review','changes_requested','approved_locked','published'].includes(group.state)).length),
  ];break;
  default: return [];
 }
 return result.filter(Boolean);
}

function AseanTeachingNotes({stage,language,uploadsEnabled}){
 return stage?<div><h3 lang="en">{stage.title}</h3>
  {stage.id==='asean-build'&&<>
   <ol lang="en">
    <li>Students open the class QR or their invitation link and sign in with their group pass.</li>
    <li>The workshop appears on the student page when Activity 3 is open. If students are browsing another activity, select Follow teacher.</li>
    <li>Upload the three photos, write the captions and add credits. Preview the exhibit, then save the draft. When the teacher opens Activity 4, the latest saved draft becomes the first exhibit.</li>
   </ol>
   {uploadsEnabled===false&&<p role="status">{t(language,'Tải ảnh đang tắt. Bật “Tải tranh ảnh 3D” trong Cài đặt để nhóm có thể dựng phòng.','Photo uploads are off. Enable 3D artwork uploads in Settings so groups can build their rooms.')}</p>}
  </>}
  <p lang="en">{stage.teaching}</p><p lang="en">{stage.expected}</p></div>:null;
}
function AseanSources(){
 return <div><h3>Destination sources</h3><ul>{ASEAN_DESTINATIONS.map(destination=><li key={destination.name}>
  <a href={destination.source} target="_blank" rel="noreferrer">{destination.name}</a>
 </li>)}</ul></div>;
}
function AseanRetestProgress({rows,language}){
 const submitted=rows.filter(row=>row.score!==null).length;
 const staffChecked=rows.filter(row=>row.staffReview).length;
 const v1References=rows.filter(row=>row.baselineReconstructed).length;
 const incomplete=rows.filter(row=>!row.baselineReady).length;
 return <section className="bml-surface" aria-labelledby="asean-retest-progress">
  <h3 id="asean-retest-progress">{t(language,'Tiến độ thử lại bản đã chỉnh sửa','Revised exhibit retest progress')} · {submitted}/{rows.length}</h3>
  {staffChecked>0&&<p role="status"><strong>{t(language,`Phiếu tham chiếu kỹ thuật · ${staffChecked}/${rows.length}`,`Technical reference checks · ${staffChecked}/${rows.length}`)}</strong>
   {' · '}{t(language,`Học sinh tự nộp · ${submitted}/${rows.length}`,`Student submissions · ${submitted}/${rows.length}`)}</p>}
  {v1References>0&&<p>{t(language,`${v1References} phòng có bản trước góp ý được dựng lại từ ảnh đã lưu. Dùng các bản này để đối chiếu nội dung triển lãm.`,
   `${v1References} rooms use reconstructed first exhibits based on saved photos. Use these references to compare the exhibits.`)}</p>}
  {incomplete>0&&<p>{t(language,`${incomplete} phòng có bản trước góp ý chưa hoàn chỉnh. Dùng phiếu hiện tại để ghi lại điều khách tìm thấy trong bản đã chỉnh sửa.`,
   `${incomplete} rooms have incomplete first exhibits. Use this round to record what visitors find in the revised exhibits.`)}</p>}
  <div className="asean-retest-progress-table" tabIndex={0} role="region" aria-label={t(language,'Phân công thử lại bản đã chỉnh sửa','Revised exhibit retest assignments')}>
   <table>
    <thead><tr>{[["Nhóm làm phiếu","Visitor group"],["Phòng được giao","Assigned exhibit"],["Câu hỏi","Question"],["Kết quả","Result"]]
     .map(([vi,en])=><th key={en} scope="col">{t(language,vi,en)}</th>)}</tr></thead>
    <tbody>{rows.map(row=>{
     const frame=ASEAN_FRAMES[row.question-1];
     return <tr key={row.group}>
      <th scope="row">{t(language,row.group,englishSystemGroupLabel(row.group))}</th>
      <td>{row.target?`${t(language,row.target,englishSystemGroupLabel(row.target))} · ${aseanDestination(row.target)?.name||''}`:'—'}</td>
      <td>{frame?.question||'—'}
       {row.reference&&<details><summary>{t(language,'Chú thích để đối chiếu','Caption for reference')}</summary><p lang="en">{row.reference}</p></details>}
      </td>
      <td>{row.score!==null?`${row.score}/1`:row.ready?t(language,'Chờ học sinh nộp','Awaiting response'):t(language,'Bản đã chỉnh sửa chưa sẵn sàng','Revised exhibit unavailable')}
       {row.staffReview&&<details><summary>{t(language,'Kết quả tham chiếu kỹ thuật','Technical reference result')} · {row.staffReview.score}/1</summary>
        <p lang="en">{row.staffReview.answer}</p></details>}
      </td>
     </tr>;
    })}</tbody>
   </table>
  </div>
 </section>;
}
