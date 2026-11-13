import React from 'react';
import {ArrowLeft,ArrowRight,BookOpen,Check,ChevronLeft,ChevronRight,Eye,Film,Focus,Fullscreen,HelpCircle,LayoutPanelRight,Lock,Maximize2,Minimize2,MoreHorizontal,Pause,Play,QrCode,RefreshCcw,Sparkles,Users,Volume2,X} from 'lucide-react';
const t=(language,vi,en)=>language==='en'?en:vi;
function Tool({label,icon:Icon,onClick,disabled=false,active=false,title}){
 return <button type="button" onClick={onClick} disabled={disabled} aria-pressed={active}
  title={title||label} className={'bml-presenter-tool'+(active?' is-active':'')}>
  <Icon size={19} aria-hidden="true"/><span>{label}</span>
 </button>;
}
export default function MuseumFullscreenDock({
 language='vi',session,currentIndex,busy,activeTool,motionOn,focusMode,needHelp=0,
 onAction,onTool,onMotion,onFocus,onExit,onRefresh
}){
 const ended=session?.status==='ended',open=session?.stageOpen;
 return <nav className={'bml-presenter-dock'+(focusMode?' is-focus':'')} data-testid="museum-fullscreen-toolbar"
  aria-label={t(language,'Điều khiển dạy trực tiếp toàn màn hình','Fullscreen teaching controls')}>
  <div className="bml-presenter-dock-main">
   <div className="bml-presenter-dock-nav">
    <Tool icon={ChevronLeft} label={t(language,'Trước','Previous')} disabled={busy||currentIndex===0} onClick={()=>onAction('previous')} title="←"/>
    <Tool icon={ChevronRight} label={t(language,'Tiếp','Next')} disabled={busy||ended||currentIndex===10} onClick={()=>onAction('next')} title="→"/>
    <Tool icon={open?Lock:Play} label={open?t(language,'Khóa','Lock'):t(language,'Mở lại','Reopen')}
     disabled={busy||ended} onClick={()=>onAction(open?'close':'open')}/>
    <Tool icon={Eye} label={t(language,'Giải thích','Explanation')} active={activeTool==='explain'}
     onClick={()=>{onAction('reveal');onTool('explain');}} disabled={busy||ended}/>
   </div>
   <div className="bml-presenter-dock-tools">
    <Tool icon={Volume2} label="Voiceover" active={activeTool==='voice'} onClick={()=>onTool('voice')} title="V"/>
    <Tool icon={Film} label="Video Lab" active={activeTool==='video'} onClick={()=>onTool('video')} title="Y"/>
    {!focusMode?<><Tool icon={BookOpen} label={t(language,'Kho tư liệu','Library')} active={activeTool==='resources'} onClick={()=>onTool('resources')} title="R"/>
     <Tool icon={BookOpen} label={t(language,'Ghi chú','Notes')} active={activeTool==='notes'} onClick={()=>onTool('notes')}/>
     <Tool icon={QrCode} label="QR" active={activeTool==='qr'} onClick={()=>onTool('qr')}/>
     <Tool icon={Users} label={t(language,'Nhóm','Groups')} active={activeTool==='groups'} onClick={()=>onTool('groups')}/></>:null}
    <Tool icon={MoreHorizontal} label={t(language,'Công cụ','Tools')} active={activeTool==='tools'} onClick={()=>onTool('tools')}/>
   </div>
   <div className="bml-presenter-dock-edge">
    <Tool icon={Focus} label={focusMode?t(language,'Đủ nút','Expand'):t(language,'Tập trung','Focus')}
     active={focusMode} onClick={onFocus}/>
    <Tool icon={Minimize2} label={t(language,'Thoát','Exit')} onClick={onExit} title="F / Esc"/>
   </div>
  </div>
  {!focusMode?<div className="bml-presenter-dock-secondary">
   <Tool icon={Sparkles} label={motionOn?'Motion ON':'Motion OFF'} active={motionOn} onClick={onMotion}/>
   <Tool icon={session.status==='paused'?Play:Pause} label={session.status==='paused'?t(language,'Tiếp tục','Resume'):t(language,'Tạm dừng','Pause')}
    onClick={()=>onAction(session.status==='paused'?'resume':'pause')} disabled={busy||ended} title="Space"/>
   <Tool icon={RefreshCcw} label={t(language,'Cập nhật','Refresh')} onClick={onRefresh}/>
   <Tool icon={Check} label={t(language,'Kết thúc buổi dạy','End lesson')} onClick={()=>onAction('end')} disabled={busy||ended}/>
   <span className="bml-presenter-help"><HelpCircle size={16}/>{needHelp} {t(language,'nhóm cần giúp','groups need help')}</span>
  </div>:null}
 </nav>;
}
