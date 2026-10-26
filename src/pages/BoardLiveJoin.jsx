import React,{useEffect,useState} from 'react';
import {ArrowRight,CheckCircle2,Cloud,ShieldCheck,Vote,StickyNote,RefreshCw} from 'lucide-react';
import {joinGuestRoom,getGuestRoom,submitGuestRoom} from '../components/BrianBoard/boardLiveApi.js';
import '../components/BrianBoard/BoardLiveJoin.css';
const modeIcon={poll:Vote,cloud:Cloud,wall:StickyNote};
const readCode=()=>{
 const search=(window.location.hash||'').split('?')[1]||'';
 return String(new URLSearchParams(search).get('code')||'').trim().toLowerCase();
};
export default function BoardLiveJoin(){
 const [code,setCode]=useState(readCode),[token,setToken]=useState(''),[room,setRoom]=useState(null);
 const [loading,setLoading]=useState(false),[error,setError]=useState(''),[done,setDone]=useState(false);
 const [text,setText]=useState(''),[choice,setChoice]=useState(-1),[notice,setNotice]=useState('');
 const valid=/^[0-9a-f]{12}$/.test(code);
 const join=async(key=code)=>{
  if(!/^[0-9a-f]{12}$/.test(key)){setError('Mã lớp không hợp lệ. Hãy kiểm tra lại mã gồm 12 ký tự.');return;}
  setLoading(true);setError('');
  try{
   const existing=sessionStorage.getItem('bbd-guest-'+key);
   if(existing){
    try{const state=await getGuestRoom(key,existing);setToken(existing);setRoom(state);setDone(false);return;}
    catch{sessionStorage.removeItem('bbd-guest-'+key);}
   }
   const result=await joinGuestRoom(key);
   sessionStorage.setItem('bbd-guest-'+key,result.token);
   setToken(result.token);setRoom(result);
  }catch(e){setError(e.message||'Không thể vào lớp.');}
  finally{setLoading(false);}
 };
 useEffect(()=>{if(valid)void join(code);},[]);
 const refresh=async()=>{
  if(!token)return;
  setLoading(true);
  try{setRoom(await getGuestRoom(code,token));setError('');}
  catch(e){setError(e.message||'Không thể tải cập nhật');}
  finally{setLoading(false);}
 };
 const send=async()=>{
  if(!token||room?.status!=='live')return;
  setLoading(true);setError('');setNotice('');
  try{
   const result=await submitGuestRoom(code,token,room.mode==='poll'?choice:null,
    room.mode==='poll'?null:text.trim());
   if(result.status==='pending')setNotice('Đã gửi. Ý kiến sẽ hiển thị sau khi giáo viên duyệt.');
   else setNotice('Đã ghi nhận phiếu bình chọn.');
   setDone(true);setText('');
   await refresh();
  }catch(e){setError(e.message||'Không thể gửi câu trả lời');}
  finally{setLoading(false);}
 };
 const Icon=modeIcon[room?.mode]||Vote;
 const hasClosed=room?.status==='closed'||room?.expiresAt<=Date.now();
 return <main className="bbd-guest-page">
  <div className="bbd-guest-shell">
   <header className="bbd-guest-top"><div className="bbd-guest-monogram">B</div>
    <div><strong>BRIAN CLASSROOM LIVE</strong><small>Petrus Ky · English Department</small></div>
    <span className="bbd-guest-live">{room?.status==='live'&&!hasClosed?'● LIVE':'CLASSROOM'}</span>
   </header>
   {!room?<section className="bbd-guest-card">
    <div className="bbd-guest-symbol"><ShieldCheck size={30}/></div>
    <h1>Tham gia hoạt động lớp học</h1>
    <p>Nhập mã giáo viên cung cấp hoặc quét QR. Không cần đăng ký tài khoản.</p>
    <label htmlFor="bbd-guest-code">Mã phiên 12 ký tự</label>
    <input id="bbd-guest-code" inputMode="text" autoCapitalize="off" autoCorrect="off"
     maxLength={12} value={code} onChange={e=>setCode(e.target.value.trim().toLowerCase())}
     placeholder="Ví dụ: a1b2c3d4e5f6"/>
    <button disabled={loading||!valid} onClick={()=>void join()}>{loading?'Đang kết nối…':'Vào lớp'} <ArrowRight size={18}/></button>
    {error&&<p role="alert" className="bbd-guest-error">{error}</p>}
   </section>:
   <section className="bbd-guest-card">
    <div className="bbd-guest-meta"><Icon size={26}/><span>
     {room.mode==='poll'?'BÌNH CHỌN':room.mode==='cloud'?'ĐÁM MÂY TỪ':'BẢNG GHI CHÚ'}</span>
     <small>{code.toUpperCase()}</small></div>
    <h1>{room.question||'Hoạt động lớp học'}</h1>
    <p>{hasClosed?'Phiên đã kết thúc. Cảm ơn bạn đã tham gia.':
     room.status==='paused'?'Giáo viên đang tạm dừng hoạt động.':'Chọn phương án hoặc chia sẻ ý kiến của bạn.'}</p>
    {!hasClosed&&room.status==='live'&&<>
     {room.mode==='poll'?<div className="bbd-guest-choices" role="group" aria-label="Chọn phương án">
      {(room.options||[]).map((option,i)=><button key={i} type="button" disabled={done||loading}
       aria-pressed={choice===i} className={choice===i?'is-selected':''}
       onClick={()=>setChoice(i)}><span>{String.fromCharCode(65+i)}</span>{option}</button>)}
     </div>:<label className="bbd-guest-text-label">
      {room.mode==='cloud'?'Một từ hoặc cụm từ (tối đa 35 ký tự)':'Ý kiến (tối đa 80 ký tự)'}
      <textarea value={text} rows={3} maxLength={room.mode==='cloud'?35:80}
       disabled={loading} onChange={e=>setText(e.target.value)} placeholder="Viết câu trả lời tại đây…"/>
     </label>}
     <button type="button" disabled={loading||(room.mode==='poll'?(done||choice<0):!text.trim())}
      onClick={()=>void send()}>{loading?'Đang gửi…':room.mode==='poll'?'Gửi phiếu bình chọn':'Gửi ý kiến'} <ArrowRight size={18}/></button>
    </>}
    {notice&&<p role="status" className="bbd-guest-success"><CheckCircle2 size={18}/>{notice}</p>}
    {error&&<p role="alert" className="bbd-guest-error">{error}</p>}
    {room.mode==='poll'&&room.votes&&<div className="bbd-guest-results">
     <h3>Kết quả lớp học</h3>
     {(room.options||[]).map((o,i)=>{
      const sum=room.votes.reduce((a,b)=>a+b,0),n=room.votes[i]||0,percent=sum?Math.round(n/sum*100):0;
      return <div key={i} className="bbd-guest-result"><strong>{o}</strong><span>{percent}%</span>
       <div><span style={{width:percent+'%'}}/></div></div>;
     })}
    </div>}
    {['cloud','wall'].includes(room.mode)&&room.entries?.length>0&&
     <div className="bbd-guest-results"><h3>Ý kiến đã được giáo viên duyệt</h3>
      <div className="bbd-guest-tags">{room.entries.map((value,i)=><span key={i}>{value}</span>)}</div>
     </div>}
    <button type="button" className="bbd-guest-secondary" onClick={()=>void refresh()} disabled={loading}>
     <RefreshCw size={16}/>{loading?'Đang tải…':'Cập nhật kết quả'}</button>
   </section>}
   <footer><ShieldCheck size={14}/> Nội dung được kiểm duyệt · Không yêu cầu họ tên hoặc số điện thoại</footer>
  </div>
 </main>;
}
