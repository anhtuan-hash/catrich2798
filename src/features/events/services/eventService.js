import { supabase, isSupabaseConfigured } from '../../../utils/supabase.js';

const BUCKET = 'bes-event-assets';
const fail = (error) => { if (error) throw new Error(error.message || String(error)); };
const client = () => { if (!isSupabaseConfigured || !supabase) throw new Error('Supabase chưa được kết nối.'); return supabase; };
export const EVENT_STATUS = Object.freeze({ draft:'draft', published:'published', cancelled:'cancelled', archived:'archived' });
export const EVENT_CATEGORIES = ['Sinh hoạt chuyên đề','Hội thảo / tập huấn','Họp tổ chuyên môn','Thao giảng','Ngoại khóa','Thông báo chung','Khác'];
export const HALLOWEEN_TEMPLATE = Object.freeze({
  title:'Sinh hoạt chuyên đề bộ môn Tiếng Anh hưởng ứng Halloween',
  category:'Sinh hoạt chuyên đề', summary:'Kính mời Quý Thầy/Cô tham dự buổi sinh hoạt chuyên đề Tiếng Anh dành cho học sinh khối 11.',
  description:'Năm học 2026–2027. GVCN khối 11 chuẩn bị điểm cầu Google Meet, TV; phân nhóm học sinh và quản lý nề nếp theo thư mời.',
  organizer:'Tổ Tiếng Anh THPT',school_year:'2026-2027',
  event_start_at:'2026-10-30T13:55',event_end_at:'2026-10-30T15:45',
  display_start_at:'2026-10-23T18:00',display_end_at:'2026-10-30T15:45',
  venue_type:'online',venue_name:'Trực tuyến qua Google Meet',
  meeting_url:'https://meet.google.com/pgv-devx-kms',meeting_code:'pgv-devx-kms',
  priority:'important',frequency:'once',
});

export async function listManagedEvents() {
  const { data,error }=await client().from('bes_events').select('*').order('created_at',{ascending:false}).limit(100);
  fail(error); return data || [];
}
export async function listEventProfiles() {
  const { data,error }=await client().from('profiles').select('id,full_name,email,role,approved,job_title').eq('approved',true).in('role',['teacher','department_head','admin']).order('full_name');
  fail(error);return data || [];
}
export function toIsoFromLocal(local) {
  const date=new Date(local);
  if(!local || !Number.isFinite(date.getTime())) throw new Error('Ngày giờ không hợp lệ.');
  return date.toISOString();
}
export function toLocalDateTime(iso) {
  if(!iso) return '';
  const date=new Date(iso);
  if(Number.isNaN(date.getTime())) return '';
  const pad=(v)=>String(v).padStart(2,'0');
  return date.getFullYear()+'-'+pad(date.getMonth()+1)+'-'+pad(date.getDate())+'T'+pad(date.getHours())+':'+pad(date.getMinutes());
}
export function validateEvent(payload) {
  if(!String(payload.title||'').trim() || payload.title.trim().length<4) throw new Error('Vui lòng nhập tên sự kiện (tối thiểu 4 ký tự).');
  const start=new Date(payload.event_start_at).getTime(), end=new Date(payload.event_end_at).getTime();
  const displayStart=new Date(payload.display_start_at).getTime(), displayEnd=new Date(payload.display_end_at).getTime();
  if(![start,end,displayStart,displayEnd].every(Number.isFinite) || end<=start || displayEnd<=displayStart)
    throw new Error('Kiểm tra lại thời gian sự kiện và khoảng hiển thị thông báo.');
  if(payload.meeting_url && !/^https:\/\/[^\s]+$/i.test(payload.meeting_url)) throw new Error('Liên kết tham gia phải là HTTPS hợp lệ.');
  return true;
}
export async function saveEventDraft(values,existingId,posterPath) {
  const payload={
    title:String(values.title||'').trim(),category:values.category||'Thông báo chung',
    summary:String(values.summary||'').trim(),description:String(values.description||'').trim(),
    organizer:String(values.organizer||'').trim(),school_year:String(values.school_year||'2026-2027'),
    event_start_at:toIsoFromLocal(values.event_start_at),event_end_at:toIsoFromLocal(values.event_end_at),
    display_start_at:toIsoFromLocal(values.display_start_at),display_end_at:toIsoFromLocal(values.display_end_at),
    venue_type:values.venue_type||'online',venue_name:String(values.venue_name||''),
    meeting_url:String(values.meeting_url||'').trim(),meeting_code:String(values.meeting_code||'').trim(),
    priority:values.priority||'normal',frequency:values.frequency||'once',
    ...(posterPath?{poster_path:posterPath}:{})
  };
  validateEvent(payload);
  if(existingId){
    const {data,error}=await client().from('bes_events').update(payload).eq('id',existingId).in('status',['draft','published']).select('*').single();
    fail(error);return data;
  }
  const {data:{user},error:userError}=await client().auth.getUser();fail(userError);
  if(!user) throw new Error('Phiên đăng nhập đã hết hạn.');
  const {data,error}=await client().from('bes_events').insert({...payload,created_by:user.id}).select('*').single();
  fail(error);return data;
}
export async function uploadEventPoster(eventId,file) {
  if(!eventId)throw new Error('Hãy lưu bản nháp trước khi tải poster.');
  if(!file || file.size>10*1024*1024)throw new Error('Poster phải nhỏ hơn 10MB.');
  const types=['image/jpeg','image/png','image/webp'];
  if(!types.includes(file.type)) throw new Error('Chỉ hỗ trợ JPG, PNG, WebP.');
  const suffix=file.type==='image/jpeg'?'jpg':file.type==='image/png'?'png':'webp';
  const path=eventId+'/poster-'+Date.now()+'.'+suffix;
  const {error}=await client().storage.from(BUCKET).upload(path,file,{upsert:false,contentType:file.type,cacheControl:'3600'});
  fail(error);
  const {error:updateError}=await client().from('bes_events').update({poster_path:path}).eq('id',eventId);
  fail(updateError);
  return path;
}
export async function getEventPosterUrl(path) {
  if(!path)return '';
  const {data,error}=await client().storage.from(BUCKET).createSignedUrl(path,3600);
  fail(error);return data?.signedUrl||'';
}
export async function publishEvent(id,recipientIds) {
  const ids=[...new Set((recipientIds||[]).filter(Boolean))];
  if(!ids.length) throw new Error('Cần chọn ít nhất một người nhận.');
  const {data,error}=await client().rpc('bes_publish_event',{p_event_id:id,p_recipients:ids});
  fail(error);return data;
}
export async function reannounceEvent(id) {
  const {data,error}=await client().rpc('bes_reannounce_event',{p_event_id:id});
  fail(error);return data;
}
export async function changeEventStatus(id,status) {
  if(!['cancelled','archived','draft'].includes(status)) throw new Error('Trạng thái không hỗ trợ.');
  const {data,error}=await client().from('bes_events').update({status}).eq('id',id).select('*').single();
  fail(error);return data;
}
export async function listRecipientIds(eventId) {
  const {data,error}=await client().from('bes_event_recipients').select('user_id').eq('event_id',eventId);
  fail(error);return (data||[]).map(x=>x.user_id);
}
export async function eventAnalytics(eventId) {
  const c=client();
  const [rec,receipts]=await Promise.all([
    c.from('bes_event_recipients').select('user_id').eq('event_id',eventId),
    c.from('bes_event_receipts').select('user_id,first_shown_at,detail_viewed_at,acknowledged_at,impression_count').eq('event_id',eventId)
  ]);
  fail(rec.error); fail(receipts.error);
  const recipients=rec.data||[],rows=receipts.data||[];
  const unique=(field)=>new Set(rows.filter(r=>r[field]).map(r=>r.user_id)).size;
  return {recipients:recipients.length,shown:unique('first_shown_at'),details:unique('detail_viewed_at'),acknowledged:unique('acknowledged_at')};
}
export async function eligibleEvents(userId) {
  if(!userId)return [];
  const c=client();
  const {data:recipientRows,error:rErr}=await c.from('bes_event_recipients').select('event_id').eq('user_id',userId).limit(100);
  fail(rErr);
  const ids=(recipientRows||[]).map(x=>x.event_id);
  if(!ids.length)return [];
  const now=new Date().toISOString();
  const [events,receipts]=await Promise.all([
    c.from('bes_events').select('*').in('id',ids).eq('status','published').lte('display_start_at',now).gt('display_end_at',now).limit(100),
    c.from('bes_event_receipts').select('*').eq('user_id',userId).in('event_id',ids).limit(100)
  ]);
  fail(events.error);fail(receipts.error);
  const allReceipts=receipts.data||[];
  return (events.data||[]).map(event=>({...event,receipt:allReceipts.find(x=>x.event_id===event.id && x.event_version===event.version)||null}));
}
export function shouldAutoShow(event,now=new Date()) {
  const r=event.receipt;
  if(!r)return true;
  const ts=now.getTime();
  if(r.acknowledged_at)return false;
  // Explicit snooze/hide choices override one-time frequency. Once their
  // deadline has passed, show again; a subsequent impression clears the
  // expired override so "Close" finally ends the one-time notification.
  if(r.hidden_until)return new Date(r.hidden_until).getTime()<=ts;
  if(r.snooze_until)return new Date(r.snooze_until).getTime()<=ts;
  if(event.frequency==='once')return !r.first_shown_at;
  if(event.frequency==='daily')return !r.last_shown_at || new Date(r.last_shown_at).toLocaleDateString('en-CA',{timeZone:'Asia/Ho_Chi_Minh'})!==now.toLocaleDateString('en-CA',{timeZone:'Asia/Ho_Chi_Minh'});
  return true;
}
export async function recordEventInteraction(event,userId,action) {
  const c=client(),time=new Date().toISOString(),old=event.receipt||{};
  const patch={event_id:event.id,user_id:userId,event_version:event.version,updated_at:time};
  if(action==='shown'){patch.first_shown_at=old.first_shown_at||time;patch.last_shown_at=time;patch.impression_count=(old.impression_count||0)+1;patch.snooze_until=null;patch.hidden_until=null;}
  else if(action==='detail')patch.detail_viewed_at=time;
  else if(action==='acknowledge')patch.acknowledged_at=time;
  else if(action==='dismiss')patch.dismissed_at=time;
  else if(action==='snooze')patch.snooze_until=new Date(Date.now()+4*3600000).toISOString();
  else if(action==='today'){
    const parts=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Ho_Chi_Minh',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
    patch.hidden_until=new Date(parts+'T23:59:59+07:00').toISOString();
  }
  else throw new Error('Tương tác không hợp lệ.');
  const {data,error}=await c.from('bes_event_receipts').upsert(patch,{onConflict:'event_id,user_id,event_version'}).select('*').single();
  fail(error);return data;
}
