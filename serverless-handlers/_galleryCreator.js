import {isAsean} from '../src/features/immersive-gallery/v3/aseanLesson.js';
import {createClient} from '@supabase/supabase-js';
import {createHmac,randomBytes,timingSafeEqual} from 'node:crypto';
import {normalizeGuestDraft,validateGuestSubmission} from '../src/features/immersive-gallery/creatorPassPolicy.js';

export {normalizeGuestDraft,validateGuestSubmission};
export const randomSecret=(length=32)=>randomBytes(length).toString('base64url');
export const fail=(status,message)=>Object.assign(new Error(message),{status});
const env=k=>String(process.env[k]||'').trim();
const url=()=>env('VITE_SUPABASE_URL')||env('SUPABASE_URL');
export const db=()=>{
 const key=env('SUPABASE_SERVICE_ROLE_KEY');
 if(!url()||!key)throw fail(503,'Dịch vụ chưa được cấu hình.');
 return createClient(url(),key,{auth:{persistSession:false,autoRefreshToken:false}});
};
export const digest=value=>{
 const pepper=env('GCP_HASH_PEPPER');
 if(pepper.length<48)throw fail(503,'Cấu hình bảo mật Creator Pass chưa sẵn sàng.');
 return createHmac('sha256',pepper).update(String(value)).digest('hex');
};
export const safeEqual=(a,b)=>{
 const x=Buffer.from(String(a??'')),y=Buffer.from(String(b??''));
 return x.length===y.length&&timingSafeEqual(x,y);
};
export const clean=(v,n=140)=>String(v??'').replace(/[\u0000-\u001f\u007f]/g,' ').trim().slice(0,n);
export const uid=x=>/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(x||''));
// Anonymous competition visitors. Not a real account, and never an admin.
export const PUBLIC_MUSEUM_ACTOR='00000000-0000-4000-8000-000000000001';
export async function publicMuseumContext(admin){
 const rows=await query(admin.from('gcp_assignments')
  .select('school_scope,created_at,content_frozen_at')
  .is('archived_at',null)
  .order('created_at',{ascending:false})
  .limit(40));
 const school=rows.find(row=>row.content_frozen_at)?.school_scope||rows[0]?.school_scope;
 if(!clean(school,180))throw fail(404,'No public museum is available.');
 return {
  user:{id:PUBLIC_MUSEUM_ACTOR},
  profile:{id:PUBLIC_MUSEUM_ACTOR,role:'viewer',school,approved:true},
  admin,role:'viewer',publicReadOnly:true
 };
}
export const query=async promise=>{
 const {data,error}=await promise;
 if(error){
  // Present only deliberately allow-listed, actionable client messages.
  // Never expose raw database details or PostgREST internals to students.
  const safeFailures=[
   ['published_assignment_immutable',409,'Bài học có triển lãm đã công bố. Hãy tải lại trang để áp dụng phiên bản mới.'],
   ['assignment_missing',404,'Bài học không còn trong danh sách hoạt động. Hãy tải lại trang.'],
   ['admin_required',403,'Chỉ Admin đã được duyệt cùng trường mới có quyền thực hiện.'],
   ['approved_review_immutable',409,'Bài nộp đã duyệt hoặc công bố không thể xóa bằng chức năng này.'],
   ['review_missing',404,'Bài nộp không còn trong danh sách hoạt động.'],
   ['assignment_closed',423,'Bài học đã đóng hoặc đã được lưu trữ.'],
   ['stale_review',409,'Bài nộp đã thay đổi. Hãy tải lại trước khi duyệt.'],
   ['stale_rubric',409,'Another rubric was saved. Reload the submission before approving it.'],
   ['version_conflict',409,'Có thay đổi mới hơn. Hãy tải lại để tiếp tục.'],
   ['museum_lesson_frozen',423,'This lesson is locked for viewing. Editing and submissions are disabled.'],
   ['museum_lesson_staff_required',403,'Only authorized teachers can change the lesson status.'],
   ['museum_asean_editing_closed',423,'The teacher has closed this editing activity, or the revised exhibit is already open for visitors.'],
   ['museum_asean_submission_closed',423,'The teacher needs to open Activity 6.'],
   ['museum_asean_revision_unchanged',400,'Change a caption or photo, then save it before opening the revised exhibit.'],
   ['museum_live_session_missing',404,'A live lesson must be started before it can be completed.']
  ];
  const detail=String(error.message||'');
  const known=safeFailures.find(([code])=>detail.includes(code));
  if(known)throw fail(known[1],known[2]);
  throw fail(400,'Không thể hoàn tất yêu cầu. Hãy tải lại trang rồi thử lại.');
 }
 return data;
};
export const send=(res,status,data)=>{
 res.setHeader('Content-Type','application/json; charset=utf-8');
 res.setHeader('Cache-Control','no-store, no-cache, must-revalidate');
 res.setHeader('X-Content-Type-Options','nosniff');
 return res.status(status).json(data);
};
export function handleError(res,error){
 const code=[400,401,403,404,409,410,423,429,503].includes(error?.status)?error.status:500;
 if(code===500)console.error('[gallery-creator] error class:',error?.code||error?.name||'unknown');
 return send(res,code,{error:code===500?'Không thể xử lý yêu cầu.':error.message});
}
export function guardOrigin(req){
 const origin=String(req.headers?.origin||'');
 const host=String(req.headers?.host||'');
 if(!origin||!host)throw fail(403,'Yêu cầu không hợp lệ.');
 let u;
 try{u=new URL(origin);}catch{throw fail(403,'Yêu cầu không hợp lệ.');}
 if(u.protocol!=='https:'||u.host!==host)throw fail(403,'Nguồn truy cập không được phép.');
 const site=String(req.headers?.['sec-fetch-site']||'');
 if(site&& !['same-origin','none'].includes(site))throw fail(403,'Yêu cầu ngoài miền bị chặn.');
};
export function guardBody(req,max=100000){
 const raw=JSON.stringify(req.body||{});
 if(raw.length>max)throw fail(400,'Nội dung quá lớn.');
 if(!req.body||typeof req.body!=='object'||Array.isArray(req.body))
  throw fail(400,'Dữ liệu không hợp lệ.');
 return req.body;
}
export function cookie(req,name='brian_gcp'){
 const str=String(req.headers?.cookie||'');
 return str.split(';').map(x=>x.trim()).find(x=>x.startsWith(name+'='))?.slice(name.length+1)||'';
}
export function setCookie(res,token,age){
 const c='brian_gcp='+encodeURIComponent(token)+'; HttpOnly; Secure; SameSite=Strict; Path=/api/gallery-guest; Max-Age='+Math.max(0,Math.floor(age));
 res.setHeader('Set-Cookie',c);
}
export function clearCookie(res){setCookie(res,'',0);}
export async function settings(admin){
 const data=await query(admin.from('gcp_settings').select('enabled,upload_enabled').eq('id',true).maybeSingle());
 if(!data)throw fail(503,'Creator Pass chưa được thiết lập.');
 return data;
}
export function assertInviteScope(expectedHandle,invite){
 if(expectedHandle!==undefined&&(!/^[A-Za-z0-9_-]{16,80}$/.test(expectedHandle)||expectedHandle!==invite?.handle))
  throw fail(409,'This invitation is for a different group. Enter its own Creator Pass to continue.');
}
export function assertGuestLessonScope(expectedLesson,assignment){
 if(expectedLesson!==undefined&&(!uid(expectedLesson)||expectedLesson!==assignment?.id))
  throw fail(409,'This QR code is for a different lesson. Enter a Creator Pass for this lesson.');
}
export function assertActiveMuseumLesson(assignment){
 if(!isAsean(assignment))throw fail(404,'This lesson is no longer available in Museum Lab.');
}
export async function guestContext(req,admin,{write=false,allowPublishedWorksheet=false}={}){
 const token=cookie(req);
 if(!token||token.length>128)throw fail(401,'Cần nhập mã nhóm để tiếp tục.');
 const now=new Date().toISOString();
 const [sess,feature]=await Promise.all([
  query(admin.from('gcp_sessions').select(`token_hash,group_id,csrf_token,expires_at,revoked_at,auth_method,
   group:gcp_groups!gcp_sessions_group_id_fkey(*,
    assignment:gcp_assignments!gcp_groups_assignment_id_fkey(*,
     quick:gcp_quick_access!gcp_quick_access_assignment_id_fkey(enabled)),
    invite:gcp_invites!gcp_invites_group_id_fkey(handle,revoked_at,expires_at))`)
   .eq('token_hash',digest('session:'+token)).maybeSingle()),
  settings(admin)
 ]);
 if(!sess||sess.revoked_at||sess.expires_at<=now)throw fail(401,'Phiên làm việc đã hết hạn.');
 const {group:membership,...session}=sess;
 if(!membership?.assignment)throw fail(401,'Phiên làm việc đã hết hạn.');
 const {assignment:lesson,invite,...group}=membership;
 const {quick,...assignment}=lesson;
 assertActiveMuseumLesson(assignment);
 const readOnly=guestLessonReadOnly(assignment,group);
 assertInviteScope(req.headers?.['x-museum-invite'],invite);
 assertGuestLessonScope(req.headers?.['x-museum-lesson'],assignment);
 if(!invite||invite.revoked_at)throw fail(401,'Mã nhóm đã bị thu hồi.');
 if(assignment.archived_at||assignment.status!=='active')throw fail(410,'Bài học đã được đóng.');
 if(!assignment.content_frozen_at && (!feature.enabled || invite.expires_at<=now))
  throw fail(401,'Mã nhóm đã hết hạn hoặc Creator Pass đã đóng.');
 if(sess.auth_method==='quick'&&!quick?.enabled)
  throw fail(401,'Classroom quick access is disabled. Sign in again with your private passcode.');
 if(write){
  guardOrigin(req);
  if(readOnly&&!(allowPublishedWorksheet&&group.state==='published'&&!assignment.content_frozen_at))
   throw fail(423,'This lesson is locked for viewing. Editing and submissions are disabled.');
  if(!safeEqual(req.headers['x-gallery-csrf'],session.csrf_token))throw fail(403,'CSRF không hợp lệ.');
  if(!feature.enabled||assignment.archived_at||assignment.status!=='active'||assignment.deadline_at<=now)
   throw fail(423,'Nhiệm vụ đang đóng.');
 }
 return {session,group,assignment,feature,readOnly};
}
export function guestLessonReadOnly(assignment,group){
 return Boolean(assignment?.content_frozen_at||group?.state==='published');
}
export async function staffContext(req,admin){
 const bearer=String(req.headers?.authorization||'');
 if(!/^Bearer\s+\S{40,}$/i.test(bearer))throw fail(401,'Cần đăng nhập Brian.');
 const token=bearer.replace(/^Bearer\s+/i,'').trim();
 const {data:{user}={},error}=await admin.auth.getUser(token);
 if(error||!user?.id)throw fail(401,'Phiên Brian không hợp lệ.');
 const profile=await query(admin.from('profiles').select('id,role,school,approved')
  .eq('id',user.id).maybeSingle());
 if(!profile||profile.approved!==true)throw fail(403,'Tài khoản chưa được duyệt.');
 if(!clean(profile.school,180))throw fail(403,'Tài khoản chưa có trường công tác.');
 return {user,profile,admin,role:clean(profile.role,50).toLowerCase()};
}
export function assertStaff(ctx){
 if(!['admin','teacher','department_head','department-head','ttcm','to_truong','tổ trưởng','department_leader','department leader','subject_leader','subject leader','leader'].includes(ctx.role))
  throw fail(403,'Tài khoản không có quyền quản lý triển lãm.');
}
export function assertAdmin(ctx){if(ctx.role!=='admin')throw fail(403,'Chỉ quản trị viên được cấp quyền này.');}
export async function reviewer(ctx,reviewerId,{publish=false}={}){
 if(!uid(reviewerId))throw fail(400,'Mã TTCM không hợp lệ.');
 const [g,p]=await Promise.all([
  query(ctx.admin.from('gcp_reviewer_grants').select('*').eq('reviewer_id',reviewerId).eq('active',true).maybeSingle()),
  query(ctx.admin.from('profiles').select('id,school,approved').eq('id',reviewerId).maybeSingle())
 ]);
 if(!g||!p||p.approved!==true||clean(p.school,180)!==ctx.profile.school||g.school_scope!==ctx.profile.school||
   (publish&&!g.can_publish))throw fail(403,'TTCM chưa được cấp quyền đúng trường.');
 return g;
}
export function requireMethod(req,...methods){
 if(!methods.includes(req.method))throw fail(405,'Phương thức không được hỗ trợ.');
}
export const ipHash=req=>digest('ip:'+String(req.headers['x-forwarded-for']||req.socket?.remoteAddress||'').split(',')[0].trim().slice(0,100));
