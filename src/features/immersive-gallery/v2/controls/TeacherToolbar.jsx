import React from 'react';
import {ArrowLeft,ArrowRight,QrCode,Maximize,BookOpen,Library,Volume2,Film,Sparkles,Pause,Play,RefreshCw,Eye,LockOpen,Lock} from 'lucide-react';
const t=(lang,vi,en)=>lang==='en'?en:vi;
/**
 * TeacherToolbar — the full teacher control row.
 * Browsing/revealing is display-only for frozen lessons; task open/pause remain locked.
 * view panels (QR/notes/resources/voiceover/video), fullscreen and refresh stay available
 * in read-only playback (per spec: QR, evidence, playback remain accessible).
 */
export default function TeacherToolbar({
  language='vi',
  readOnly=false,busy=false,
  session=null,currentIndex=0,
  motionOn=true,activeTool=null,
  onBack,onPrevious,onNext,onToggleTask,onReveal,onToggleTool,onFullscreen,
  onToggleMotion,onTogglePause,onRefresh
}){
  const ended=session?.status==='ended';
  const mutateLocked=readOnly||busy||ended;
  const browseLocked=busy||(!readOnly&&ended);
  const stageOpen=Boolean(session?.stageOpen);
  const revealed=Boolean(session?.revealed);
  const isLast=currentIndex>=10;
  const btn=(key,label,Icon,{onClick,disabled=false,pressed=false,variant='',extraAria=''}={})=>(
    <button key={key} type="button" className={`adv-toolbtn${variant?' adv-toolbtn--'+variant:''}${pressed?' is-active':''}`}
      onClick={onClick} disabled={disabled} aria-pressed={pressed||undefined} aria-label={extraAria||label}>
      {Icon?<Icon size={14} aria-hidden="true"/>:null}{label}
    </button>
  );
  return (
    <div className="toolbar adv-toolbar" role="toolbar" aria-label={t(language,'Thanh điều khiển giáo viên','Teacher control toolbar')}>
      {btn('previous',t(language,'Hoạt động trước','Previous activity'),ArrowLeft,{onClick:onPrevious,disabled:busy||currentIndex===0})}
      {btn('next',t(language,'Hoạt động tiếp theo →','Next activity →'),ArrowRight,{onClick:onNext,disabled:browseLocked||isLast,variant:'primary',extraAria:t(language,'Chuyển sang hoạt động tiếp theo','Advance to next activity')})}
      {btn('task',stageOpen?t(language,'Đóng nhiệm vụ','Close task'):t(language,'Mở nhiệm vụ','Open task'),stageOpen?Lock:LockOpen,{onClick:onToggleTask,disabled:mutateLocked,extraAria:stageOpen?t(language,'Đóng nhiệm vụ hiện tại','Close current task'):t(language,'Mở nhiệm vụ hiện tại','Open current task')})}
      {btn('reveal',readOnly?(revealed?t(language,'Ẩn giải thích','Hide explanation'):t(language,'Xem giải thích','Show explanation')):revealed?t(language,'Đã hiện giải thích','Explanation shown'):t(language,'Hiện giải thích','Reveal explanation'),Eye,{onClick:onReveal,disabled:busy||(!readOnly&&(ended||revealed))})}
      <span className="adv-toolbar-spacer" aria-hidden="true"/>
      {btn('qr','QR',QrCode,{onClick:()=>onToggleTool('qr'),pressed:activeTool==='qr'})}
      {btn('fullscreen',t(language,'Toàn màn hình','Fullscreen'),Maximize,{onClick:onFullscreen})}
      {btn('notes',t(language,'Ghi chú dạy','Teaching notes'),BookOpen,{onClick:()=>onToggleTool('notes'),pressed:activeTool==='notes'})}
      {btn('resources',t(language,'Thư viện','Research library'),Library,{onClick:()=>onToggleTool('resources'),pressed:activeTool==='resources'})}
      {btn('voice',t(language,'Giọng đọc','Voiceover'),Volume2,{onClick:()=>onToggleTool('voice'),pressed:activeTool==='voice'})}
      {btn('video',t(language,'Video Lab','Video Lab'),Film,{onClick:()=>onToggleTool('video'),pressed:activeTool==='video'})}
      {btn('motion',motionOn?t(language,'Chuyển động: BẬT','Motion ON'):t(language,'Chuyển động: TẮT','Motion OFF'),Sparkles,{onClick:onToggleMotion,pressed:motionOn,variant:motionOn?'mint':''})}
      {btn('pause',session?.status==='paused'?t(language,'Tiếp tục','Resume'):t(language,'Tạm dừng','Pause'),session?.status==='paused'?Play:Pause,{onClick:onTogglePause,disabled:mutateLocked})}
      {btn('refresh',t(language,'Làm mới','Refresh'),RefreshCw,{onClick:onRefresh,disabled:busy})}
    </div>
  );
}
export {TeacherToolbar};
