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
export const query=async promise=>{
 const {data,error}=await promise;
 if(error)throw fail(error.message?.includes('version_conflict')?409:400,'Không thể hoàn tất yêu cầu.');
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
export async function guestContext(req,admin,{write=false}={}){
 const token=cookie(req);
 if(!token||token.length>128)throw fail(401,'Cần nhập mã nhóm để tiếp tục.');
 const now=new Date().toISOString();
 const sess=await query(admin.from('gcp_sessions')
  .select('token_hash,group_id,csrf_token,expires_at,revoked_at').eq('token_hash',digest('session:'+token)).maybeSingle());
 if(!sess||sess.revoked_at||sess.expires_at<=now)throw fail(401,'Phiên làm việc đã hết hạn.');
 const group=await query(admin.from('gcp_groups').select('*').eq('id',sess.group_id).single());
 const assignment=await query(admin.from('gcp_assignments').select('*').eq('id',group.assignment_id).single());
 const invite=await query(admin.from('gcp_invites').select('revoked_at,expires_at')
  .eq('group_id',group.id).maybeSingle());
 if(!invite||invite.revoked_at||invite.expires_at<=now)throw fail(401,'Mã nhóm đã bị thu hồi hoặc hết hạn.');
 if(write){
  guardOrigin(req);
  if(!safeEqual(req.headers['x-gallery-csrf'],sess.csrf_token))throw fail(403,'CSRF không hợp lệ.');
  const config=await settings(admin);
  if(!config.enabled||assignment.status!=='active'||assignment.deadline_at<=now)
   throw fail(423,'Nhiệm vụ đang đóng.');
 }
 return {session:sess,group,assignment};
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
