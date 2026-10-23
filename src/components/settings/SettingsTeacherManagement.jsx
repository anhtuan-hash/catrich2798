import React, { useEffect, useMemo, useState } from 'react';
import { Check, ChevronDown, ChevronRight, KeyRound, LockKeyhole, RefreshCw, ShieldCheck, UserPlus, UsersRound } from 'lucide-react';
import { getUsers, updateUserPermissions, updateUserApproval, USERS_EVENT } from '../../utils/auth.js';
import { ALL_PERMISSION_IDS, PERMISSION_GROUPS, ASSESSMENT_PERMISSION_GROUP, ATTENDANCE_PERMISSION_GROUP,
  createAllAccessPermissions, createCustomPermissions, getAllowedIdsFromPermissions,
  normalizePermissions, summarizePermissions, PERMISSION_ITEMS } from '../../utils/permissions.js';
import { supabase } from '../../utils/supabase.js';
import { isAdminRole } from '../../utils/roles.js';
import './SettingsTeacherManagement.css';

const SPECIAL = [ASSESSMENT_PERMISSION_GROUP, ATTENDANCE_PERMISSION_GROUP];
const GROUPS = [...SPECIAL, ...PERMISSION_GROUPS];
const itemById = new Map(PERMISSION_ITEMS.map(item=>[item.id,item]));
const getLabel = (item,vi) => vi ? (item.titleVi || item.title || item.id) : (item.title || item.titleVi || item.id);
const cleanLogin = s => String(s||'').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim().replace(/\s+/g,'.').replace(/[^a-z0-9._-]/g,'').slice(0,32);

export default function SettingsTeacherManagement({ currentUser, language='vi', initialTab='permissions' }) {
  const vi=language!=='en';
  const isAdmin=isAdminRole(currentUser?.role);
  const [tab,setTab]=useState(initialTab);
  const [users,setUsers]=useState([]);
  const [selected,setSelected]=useState('');
  const [query,setQuery]=useState('');
  const [loading,setLoading]=useState(false);
  const [status,setStatus]=useState('');
  const [error,setError]=useState('');
  const [draft,setDraft]=useState({ fullName:'', username:'', school:'', password:'' });
  const [created,setCreated]=useState(null);
  const [passwordShown,setPasswordShown]=useState(false);
  const [expanded,setExpanded]=useState({});
  const teacherUsers=useMemo(()=>users.filter(u=>u.role!=='admin'),[users]);
  const filtered=useMemo(()=>teacherUsers.filter(u=>[u.name,u.email,u.username,u.school].join(' ').toLowerCase().includes(query.trim().toLowerCase())),[teacherUsers,query]);
  const teacher=teacherUsers.find(u=>u.id===selected);
  const permissions=teacher?normalizePermissions(teacher.permissions):null;
  const allowed=teacher?getAllowedIdsFromPermissions(permissions):[];
  const isAll=permissions?.mode==='all';

  const load=async()=>{
    if(!isAdmin)return;
    try { const list=await getUsers();setUsers(list);setSelected(prev=>list.some(u=>u.id===prev&&u.role!=='admin')?prev:(list.find(u=>u.role!=='admin')?.id||'')); }
    catch(e){setError(e?.message||(vi?'Không tải được danh sách giáo viên.':'Cannot load teachers.'));}
  };
  useEffect(()=>{void load();const listen=()=>{void load();};window.addEventListener(USERS_EVENT,listen);return()=>window.removeEventListener(USERS_EVENT,listen);},[isAdmin]);
  useEffect(()=>setTab(initialTab),[initialTab]);

  const apply=async(next)=>{
    if(!teacher||loading||!isAdmin)return;
    setLoading(true);setError('');setStatus('');
    try {
      const result=await updateUserPermissions(teacher.id,next);
      if(!result?.ok)throw new Error(result?.message||(vi?'Không thể lưu quyền.':'Cannot save permissions.'));
      await load();
      setStatus(vi?'Đã lưu quyền truy cập cho '+teacher.name+'.':'Permissions updated for '+teacher.name+'.');
    } catch(e){setError(e?.message||String(e));}finally{setLoading(false);}
  };
  const setGroup=(ids,checked)=>{
    const next=new Set(allowed);
    ids.forEach(id=>checked?next.add(id):next.delete(id));
    void apply(isAll?createAllAccessPermissions([...next]):createCustomPermissions([...next]));
  };
  const toggleOne=(id,checked)=>setGroup([id],checked);
  const setMode=(mode)=>void apply(mode==='all'?createAllAccessPermissions(allowed):createCustomPermissions(allowed));
  const setApproval=async()=>{
    if(!teacher||loading||!isAdmin)return;
    const next=!teacher.approved;
    if(!window.confirm(vi?(next?'Kích hoạt tài khoản giáo viên này?':'Khóa tài khoản giáo viên này?'):(next?'Enable this teacher account?':'Disable this teacher account?')))return;
    setLoading(true);setError('');
    try{const res=await updateUserApproval(teacher.id,next);if(!res?.ok)throw new Error(res?.message);await load();setStatus(vi?'Đã cập nhật trạng thái tài khoản.':'Account status updated.');}
    catch(e){setError(e?.message||String(e));}finally{setLoading(false);}
  };
  const generatePassword=()=>{
    const chars='ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%';
    const bytes=new Uint32Array(18);
    if(!window.crypto?.getRandomValues){setError(vi?'Trình duyệt không hỗ trợ tạo mật khẩu an toàn.':'Secure password generation is unavailable.');return;}
    window.crypto.getRandomValues(bytes);
    setDraft(prev=>({...prev,password:[...bytes].map(x=>chars[x%chars.length]).join('')}));
  };
  const create=async(e)=>{
    e.preventDefault();if(!isAdmin||loading)return;
    const username=cleanLogin(draft.username);
    if(!/^[a-z0-9][a-z0-9._-]{2,31}$/.test(username)){setError(vi?'Tên đăng nhập phải có 3–32 ký tự hợp lệ.':'Username must be 3–32 valid characters.');return;}
    if(draft.password.length<8||draft.password.length>128){setError(vi?'Mật khẩu cần từ 8–128 ký tự.':'Password must be 8–128 characters.');return;}
    if(!draft.fullName.trim()){setError(vi?'Nhập họ tên giáo viên.':'Enter teacher name.');return;}
    if(!supabase){setError(vi?'Supabase chưa được kết nối.':'Supabase is not connected.');return;}
    setError('');setStatus('');setLoading(true);setCreated(null);
    try{
      const {data,error:invokeError}=await supabase.functions.invoke('teacher-accounts',{body:{action:'bulk_create',accounts:[{username,fullName:draft.fullName.trim(),school:draft.school.trim(),password:draft.password}]}});
      if(invokeError){
        let reason=invokeError.message||'';
        try{const details=await invokeError.context?.json?.();reason=details?.message||reason;}catch{ /* network error */ }
        throw new Error(reason||'Teacher account creation failed');
      }
      const entry=data?.results?.[0];
      if(!data?.ok||!entry?.ok)throw new Error(entry?.message||data?.message||(vi?'Tạo tài khoản thất bại.':'Account creation failed.'));
      setCreated({username,fullName:draft.fullName.trim()});
      setDraft({fullName:'',username:'',school:'',password:''});
      setStatus(vi?'Đã tạo tài khoản. Giáo viên phải đổi mật khẩu tạm khi đăng nhập lần đầu.':'Teacher created. A password change is required at first login.');
      await load();
    }catch(e){setError(e?.message||String(e));}finally{setLoading(false);}
  };
  if(!isAdmin)return <div className="stm-notice">{vi?'Chỉ Admin được cấp quyền và tạo tài khoản giáo viên.':'Only admins can manage teacher permissions and accounts.'}</div>;

  return <div className="stm">
    <div className="stm-tabs" role="tablist">
      <button type="button" role="tab" aria-selected={tab==='permissions'} className={tab==='permissions'?'active':''} onClick={()=>setTab('permissions')}><ShieldCheck size={17}/>{vi?'Phân quyền giáo viên':'Teacher permissions'}</button>
      <button type="button" role="tab" aria-selected={tab==='create'} className={tab==='create'?'active':''} onClick={()=>setTab('create')}><UserPlus size={17}/>{vi?'Tạo nhanh giáo viên':'Quick-create teacher'}</button>
    </div>
    {error?<div className="stm-alert error" role="alert">{error}</div>:null}
    {status?<div className="stm-alert success" role="status"><Check size={16}/>{status}</div>:null}
    {tab==='create'?<section className="stm-card">
      <h3><UserPlus size={20}/>{vi?'Tạo tài khoản giáo viên':'Create teacher account'}</h3>
      <p>{vi?'Sử dụng chức năng quản trị an toàn trên Supabase. Tài khoản mới được bật, có quyền giáo viên thông thường; quyền đặc biệt có thể cấp sau khi tạo.':'Uses the secured Supabase admin function. The new account is enabled with normal teacher access; special permissions can be granted later.'}</p>
      <form className="stm-form" onSubmit={create}>
        <label>{vi?'Họ và tên':'Full name'}<input required maxLength={120} autoComplete="off" value={draft.fullName} onChange={e=>setDraft(x=>({...x,fullName:e.target.value}))}/></label>
        <label>{vi?'Tên đăng nhập':'Username'}<input required autoCapitalize="none" spellCheck={false} maxLength={32} value={draft.username} onChange={e=>setDraft(x=>({...x,username:cleanLogin(e.target.value)}))} placeholder="nguyen.van.a"/><small>{vi?'Đăng nhập bằng tên này, không cần email cá nhân.':'Username sign-in, no personal email required.'}</small></label>
        <label>{vi?'Đơn vị / Trường':'School'}<input maxLength={160} value={draft.school} onChange={e=>setDraft(x=>({...x,school:e.target.value}))}/></label>
        <label>{vi?'Mật khẩu tạm':'Temporary password'}
          <div className="stm-password"><input required type={passwordShown?'text':'password'} autoComplete="new-password" minLength={8} maxLength={128} value={draft.password} onChange={e=>setDraft(x=>({...x,password:e.target.value}))}/><button type="button" aria-pressed={passwordShown} onClick={()=>setPasswordShown(value=>!value)}>{passwordShown?(vi?'Ẩn':'Hide'):(vi?'Hiện':'Show')}</button><button type="button" onClick={generatePassword}>{vi?'Tạo ngẫu nhiên':'Generate'}</button></div>
          <small>{vi?'Không lưu mật khẩu trên trang. Chia sẻ riêng với giáo viên qua kênh an toàn trước khi tạo.':'The password is not stored in this page. Share it securely before creating the account.'}</small>
        </label>
        <button className="stm-primary" type="submit" disabled={loading}>{loading?(vi?'Đang tạo…':'Creating…'):(vi?'Tạo tài khoản giáo viên':'Create teacher account')}</button>
      </form>
      {created?<div className="stm-created"><Check size={18}/><div><b>{created.fullName} — {created.username}</b><span>{vi?'Đã tạo thành công. Mở tab Phân quyền để kiểm tra và tùy chỉnh.':'Created. Open Permissions to review and customize access.'}</span></div><button type="button" onClick={()=>setTab('permissions')}>{vi?'Phân quyền':'Permissions'}</button></div>:null}
    </section>:<section className="stm-card">
      <div className="stm-title"><div><h3><UsersRound size={20}/>{vi?'Tài khoản giáo viên':'Teacher accounts'}</h3><p>{vi?'Chọn giáo viên để cấp hoặc thu hồi quyền sử dụng ứng dụng.':'Choose a teacher to manage their app access.'}</p></div><button type="button" onClick={()=>void load()} disabled={loading}><RefreshCw size={17}/>{vi?'Làm mới':'Refresh'}</button></div>
      <div className="stm-layout">
        <div className="stm-directory"><input type="search" value={query} onChange={e=>setQuery(e.target.value)} placeholder={vi?'Tìm giáo viên…':'Search teachers…'} aria-label={vi?'Tìm giáo viên':'Search teachers'}/>
          <div className="stm-directory-list">{filtered.map(u=><button type="button" className={u.id===selected?'active':''} key={u.id} onClick={()=>setSelected(u.id)}><span className="stm-initial">{(u.name||u.email||'T').slice(0,1).toUpperCase()}</span><span><strong>{u.name||u.email}</strong><small>{u.email}</small></span><ChevronRight size={16}/></button>)}{!filtered.length?<p>{vi?'Chưa có giáo viên phù hợp.':'No matching teachers.'}</p>:null}</div>
        </div>
        <div className="stm-editor">
          {!teacher?<p>{vi?'Chọn một giáo viên để chỉnh sửa quyền.':'Select a teacher to edit permissions.'}</p>:<>
            <div className="stm-user"><span className="stm-initial large">{(teacher.name||'T').slice(0,1).toUpperCase()}</span><span><strong>{teacher.name||teacher.email}</strong><small>{summarizePermissions(teacher,language)} · {teacher.approved?(vi?'Đang hoạt động':'Active'):(vi?'Đã khóa':'Disabled')}</small></span><button type="button" disabled={loading} onClick={setApproval}>{teacher.approved?(vi?'Khóa':'Disable'):(vi?'Mở khóa':'Enable')}</button></div>
            <div className="stm-mode"><button type="button" className={isAll?'active':''} disabled={loading} onClick={()=>setMode('all')}>{vi?'Quyền giáo viên thông thường':'Normal teacher access'}</button><button type="button" className={!isAll?'active':''} disabled={loading} onClick={()=>setMode('custom')}>{vi?'Quyền tùy chỉnh':'Custom permissions'}</button></div>
            <p className="stm-hint">{vi?'Các quyền Điểm danh và Ngân hàng câu hỏi luôn cấp riêng, kể cả chế độ quyền thông thường.':'Attendance and Assessment Core are always separately granted, even with normal access.'}</p>
            {GROUPS.filter(g=>!isAll||SPECIAL.some(s=>s.key===g.key)).map(g=>{
              const n=g.ids.filter(id=>allowed.includes(id)).length; const fully=n===g.ids.length;
              return <div className="stm-group" key={g.key}><div className="stm-group-head">
                <button type="button" aria-expanded={Boolean(expanded[g.key])} onClick={()=>setExpanded(state=>({...state,[g.key]:!state[g.key]}))}><ChevronDown size={16}/><strong>{vi?g.titleVi:g.title}</strong><small>{n}/{g.ids.length}</small></button>
                <label><input disabled={loading} type="checkbox" checked={fully} onChange={e=>setGroup(g.ids,e.target.checked)}/>{vi?'Cấp nhóm':'Allow group'}</label>
              </div>
              {expanded[g.key]?<div className="stm-permissions">{g.ids.map(id=>{const item=itemById.get(id);return <label key={id}><input type="checkbox" disabled={loading} checked={allowed.includes(id)} onChange={e=>toggleOne(id,e.target.checked)}/><span><b>{item?getLabel(item,vi):id}</b><small>{vi?item?.descVi:item?.desc}</small></span></label>;})}</div>:null}</div>;
            })}
          </>}
        </div>
      </div>
    </section>}
  </div>;
}
