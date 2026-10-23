import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Bell, ChevronRight, Compass, Database, Grid2X2, LayoutGrid, List, LockKeyhole, Palette, Pin, Search, Settings2, ShieldCheck, Sparkles, UserRound, UserPlus, WandSparkles, Layers3, Clock3, ArrowUpRight } from 'lucide-react';
import { isDepartmentLeaderRole } from '../../utils/roles.js';

const TILES = [
  {id:'account',vi:'Tài khoản',en:'Account',desc:'Hồ sơ và mật khẩu',sub:'Profile and password',icon:UserRound,tone:'blue',keys:'người dùng hồ sơ mật khẩu password profile'},
  {id:'appearance',vi:'Giao diện',en:'Appearance',desc:'Ngôn ngữ và chuyển động',sub:'Language and motion',icon:Palette,tone:'pink',keys:'chủ đề ngôn ngữ hiệu ứng preset motion animation'},
  {id:'navigation',vi:'Điều hướng',en:'Navigation',desc:'Action Dock và tin vắn',sub:'Action Dock and newswire',icon:Compass,tone:'indigo',keys:'sidebar dock newswire hiển thị chung',manager:true},
  {id:'hero',vi:'Hero',en:'Hero',desc:'Ảnh nền từng ứng dụng',sub:'App backgrounds',icon:Layers3,tone:'violet',keys:'dashboard chủ nhiệm sổ điểm kiểm tra nền'},
  {id:'apps',vi:'Ứng dụng',en:'Apps',desc:'Kho ứng dụng',sub:'Application directory',icon:Grid2X2,tone:'green',keys:'ứng dụng app catalog launcher'},
  {id:'permissions',vi:'Phân quyền',en:'Permissions',desc:'Quản trị và truy cập',sub:'Access management',icon:ShieldCheck,tone:'orange',keys:'admin ttcm quyền truy cập role',admin:true},
  {id:'teacher-create',vi:'Tạo giáo viên',en:'Create teacher',desc:'Tạo nhanh tài khoản',sub:'Quick teacher account',icon:UserPlus,tone:'blue',keys:'tạo nhanh giáo viên tài khoản đăng nhập mật khẩu quick create teacher',admin:true},
  {id:'notifications',vi:'Thông báo',en:'Notifications',desc:'Âm báo và nhắc nhở',sub:'Alerts and reminders',icon:Bell,tone:'coral',keys:'email push nhắc nhở âm thanh rung'},
  {id:'data',vi:'Dữ liệu',en:'Data & sync',desc:'Đồng bộ và hiệu năng',sub:'Sync and performance',icon:Database,tone:'teal',keys:'wifi cache lưu trữ nhập xuất json dọn dẹp'},
  {id:'security',vi:'Bảo mật',en:'Security',desc:'Quyền riêng tư và MFA',sub:'Privacy and MFA',icon:LockKeyhole,tone:'slate',keys:'mfa xác thực quyền riêng tư bảo vệ'}
];
const read=(key,fallback)=>{try{return localStorage.getItem(key)??fallback;}catch{return fallback;}};
const save=(key,value)=>{try{localStorage.setItem(key,value);}catch{/* optional device setting */}};
export const SETTINGS_LAUNCHER_TILES=TILES;

export default function SettingsLauncherHome({language='vi',currentUser,onOpen,dataSyncEnabled,liveSyncEnabled}){
  const vi=language!=='en', manager=isDepartmentLeaderRole(currentUser?.role);
  const admin=['admin','administrator'].includes(String(currentUser?.role||'').toLowerCase());
  const searchRef=useRef(null);
  const base='bes:settings-launcher:v2:'+String(currentUser?.id||currentUser?.email||'guest');
  const [search,setSearch]=useState('');
  const [view,setView]=useState(()=>read(base+':view','grid'));
  const [pins,setPins]=useState(()=>{try{return JSON.parse(read(base+':pins','["account","appearance","data"]'));}catch{return ['account','appearance','data'];}});
  const [recent,setRecent]=useState(()=>{try{return JSON.parse(read(base+':recent','[]'));}catch{return [];}});
  const tiles=useMemo(()=>TILES.filter(t=>(!t.manager||manager)&&(!t.admin||admin)&&(!search||[t.vi,t.en,t.desc,t.sub,t.keys].join(' ').toLocaleLowerCase().includes(search.trim().toLocaleLowerCase()))).sort((a,b)=>Number(pins.includes(b.id))-Number(pins.includes(a.id))||TILES.indexOf(a)-TILES.indexOf(b)),[manager,admin,search,pins]);
  const open=(id)=>{let next=[id,...recent.filter(x=>x!==id)].slice(0,5);setRecent(next);save(base+':recent',JSON.stringify(next));onOpen(id);};
  const pin=(e,id)=>{e.stopPropagation();const next=pins.includes(id)?pins.filter(x=>x!==id):[...pins,id];setPins(next);save(base+':pins',JSON.stringify(next));};
  const listMode=(mode)=>{setView(mode);save(base+':view',mode);};
  useEffect(()=>{const handler=(event)=>{if((event.metaKey||event.ctrlKey)&&event.key.toLowerCase()==='k'){event.preventDefault();searchRef.current?.focus();}};window.addEventListener('keydown',handler);return()=>window.removeEventListener('keydown',handler);},[]);
  const name=String(currentUser?.name||currentUser?.email||'Brian English');
  const initials=name.split(/\s+/).filter(Boolean).slice(-2).map(s=>s[0]).join('').toUpperCase();
  const visibleRecent=recent.map(id=>TILES.find(t=>t.id===id)).filter(t=>t&&(!t.manager||manager)&&(!t.admin||admin)).slice(0,4);
  const visiblePins=pins.map(id=>TILES.find(t=>t.id===id)).filter(t=>t&&(!t.manager||manager)&&(!t.admin||admin)).slice(0,5);
  return <div className="sl2">
    <header className="sl2-heading"><div><span className="sl2-eyebrow"><Sparkles size={15}/> BRIAN ENGLISH · SETTINGS</span><h1>{vi?'Cài đặt hệ thống':'System settings'}</h1><p>{vi?'Mọi tùy chỉnh trong một không gian gọn gàng.':'All your settings in one place.'}</p></div>
      <label className="sl2-search"><Search size={19}/><input ref={searchRef} value={search} onChange={e=>setSearch(e.target.value)} placeholder={vi?'Tìm ứng dụng hoặc cài đặt…':'Search apps and settings…'} aria-label={vi?'Tìm kiếm cài đặt':'Search settings'}/><kbd>⌘ K</kbd></label>
    </header>
    <section className="sl2-widgets">
      <button type="button" className="sl2-widget sl2-profile" onClick={()=>open('account')}><span className="sl2-avatar">{initials}</span><span><small>{vi?'Xin chào,':'Welcome,'}</small><strong>{name}</strong><em>{currentUser?.role||'Teacher'}</em></span><ArrowUpRight size={20}/><span className="sl2-profile-hint">{vi?'HỒ SƠ · CÀI ĐẶT TÀI KHOẢN':'PROFILE · ACCOUNT SETTINGS'}</span></button>
      <button type="button" className="sl2-widget sl2-sync" onClick={()=>open('data')}><span className="sl2-widget-caption"><Database size={18}/>{vi?'Trạng thái đồng bộ':'Sync settings'}<ChevronRight size={18}/></span><strong>{dataSyncEnabled&&liveSyncEnabled?(vi?'Đã bật đồng bộ':'Sync enabled'):(vi?'Kiểm tra cài đặt':'Review settings')}</strong><span>{vi?'Tự động':'Automatic'}: {dataSyncEnabled?(vi?'Bật':'On'):(vi?'Tắt':'Off')} · Live: {liveSyncEnabled?'On':'Off'}</span><small>{vi?'Theo cấu hình hiện tại, không phải chỉ số máy chủ.':'Based on your preferences, not server metrics.'}</small></button>
      <div className="sl2-widget sl2-quick"><strong><WandSparkles size={18}/>{vi?'Thao tác nhanh':'Quick actions'}</strong><div>{[['account',UserRound,vi?'Hồ sơ':'Profile'],['appearance',Palette,vi?'Giao diện':'Theme'],...(manager?[['navigation',Compass,vi?'Điều hướng':'Navigation']]:[]),['data',Database,vi?'Dữ liệu':'Data'],...(admin?[['teacher-create',UserPlus,vi?'Tạo GV':'Create']]:[])].map(([id,Icon,label])=><button type="button" key={id} onClick={()=>open(id)}><Icon size={23}/><span>{label}</span></button>)}</div></div>
    </section>
    <div className="sl2-bar"><div><h2>{vi?'Ứng dụng cài đặt':'Settings apps'}</h2><p>{vi?'Chạm vào một mục để quản lý và tùy chỉnh':'Select an app to configure'}</p></div><div className="sl2-switch"><button type="button" className={view==='grid'?'on':''} aria-pressed={view==='grid'} onClick={()=>listMode('grid')}><LayoutGrid size={17}/>{vi?'Lưới':'Grid'}</button><button type="button" className={view==='list'?'on':''} aria-pressed={view==='list'} onClick={()=>listMode('list')}><List size={17}/>{vi?'Danh sách':'List'}</button></div></div>
    <section className={'sl2-grid '+(view==='list'?'list':'')} aria-label={vi?'Ứng dụng cài đặt':'Settings apps'}>
      {tiles.map(t=>{const Icon=t.icon;return <article className={'sl2-tile tone-'+t.tone} key={t.id}><button type="button" className="sl2-tile-open" onClick={()=>open(t.id)}><span className="sl2-icon"><Icon size={26}/></span><strong>{vi?t.vi:t.en}</strong><small>{vi?t.desc:t.sub}</small><ArrowUpRight className="sl2-arrow" size={18}/></button><button className={'sl2-pin '+(pins.includes(t.id)?'active':'')} type="button" aria-label={(vi?'Ghim ':'Pin ')+(vi?t.vi:t.en)} aria-pressed={pins.includes(t.id)} title={vi?'Ghim / bỏ ghim':'Pin / unpin'} onClick={e=>pin(e,t.id)}><Pin size={15}/></button></article>;})}
      {!tiles.length&&<p className="sl2-no-results">{vi?'Không tìm thấy cài đặt phù hợp.':'No settings found.'}</p>}
    </section>
    <section className="sl2-extras"><div className="sl2-extra"><h3><Clock3 size={18}/>{vi?'Mở gần đây':'Recently opened'}</h3>{visibleRecent.length?visibleRecent.map(t=>{const Icon=t.icon;return <button type="button" key={t.id} onClick={()=>open(t.id)}><Icon size={19}/>{vi?t.vi:t.en}<ChevronRight size={16}/></button>;}):<p>{vi?'Các mục vừa sử dụng sẽ xuất hiện tại đây.':'Your recent settings will appear here.'}</p>}</div><div className="sl2-extra"><h3><ShieldCheck size={18}/>{vi?'Gợi ý cho bạn':'Suggested for you'}</h3><button type="button" onClick={()=>open('security')}><LockKeyhole size={19}/>{vi?'Kiểm tra quyền riêng tư':'Review privacy'}<ChevronRight size={16}/></button><button type="button" onClick={()=>open('appearance')}><Palette size={19}/>{vi?'Điều chỉnh giao diện':'Customize appearance'}<ChevronRight size={16}/></button></div></section>
    <nav className="sl2-dock" aria-label={vi?'Ứng dụng ghim':'Pinned settings'}><span><Settings2 size={17}/>{vi?'Đã ghim':'Pinned'}</span>{visiblePins.map(t=>{const Icon=t.icon;return <button type="button" key={t.id} onClick={()=>open(t.id)}><Icon size={20}/>{vi?t.vi:t.en}</button>;})}</nav>
  </div>;
}
