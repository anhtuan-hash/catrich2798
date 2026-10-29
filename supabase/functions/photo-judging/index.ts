import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const URL = Deno.env.get("SUPABASE_URL") || "";
const SECRET = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const db = createClient(URL, SECRET, { auth: { persistSession: false, autoRefreshToken: false } });
const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info", "Access-Control-Allow-Methods": "POST, OPTIONS", "Cache-Control": "no-store", "Content-Type": "application/json" };
const send = (data: unknown, status = 200) => new Response(JSON.stringify(data), { status, headers: cors });
const bad = (message: string, status = 400) => send({ error: message }, status);
const required = (value: unknown) => String(value ?? "").trim();
async function digest(token: string) {
  const bytes = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(token));
  return [...new Uint8Array(bytes)].map(b => b.toString(16).padStart(2,"0")).join("");
}
function newToken() {
  return Array.from(crypto.getRandomValues(new Uint8Array(32)), b => b.toString(16).padStart(2,"0")).join("");
}
function assertResult<T>(result: {data:T,error: {message:string}|null}):T {
  if (result.error) throw new Error(result.error.message);
  return result.data;
}
async function requireAdmin(req: Request) {
  const token = (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
  if (!token || token === SECRET) throw new Error("Bạn cần đăng nhập bằng tài khoản Admin.");
  const { data: { user }, error } = await db.auth.getUser(token);
  if (error || !user) throw new Error("Phiên đăng nhập không hợp lệ.");
  const profile = assertResult(await db.from("profiles").select("role,approved").eq("id",user.id).maybeSingle());
  if (!profile || profile.role !== "admin" || profile.approved !== true) throw new Error("Chỉ Admin được quản lý giám khảo.");
  return user;
}
async function getJudge(token: string) {
  if (!/^[0-9a-f]{64}$/.test(token)) throw new Error("Liên kết giám khảo không hợp lệ.");
  const hash = await digest(token);
  const judge = assertResult(await db.from("bes_judging_invites").select("id,session_id,full_name,revoked_at,submitted_at").eq("token_hash",hash).maybeSingle());
  if (!judge || judge.revoked_at) throw new Error("Liên kết đã hết hiệu lực hoặc bị thu hồi.");
  return judge;
}
function validRubric(input: unknown) {
  if (!Array.isArray(input) || input.length < 2 || input.length > 8) throw new Error("Rubric cần 2–8 tiêu chí.");
  const ids = new Set<string>();
  const rubric = input.map((row: any) => {
    const id = required(row.id);
    const label = required(row.label).slice(0,80);
    const weight = Number(row.weight);
    if (!/^[a-z][a-z0-9_-]{1,30}$/.test(id) || ids.has(id) || !label || !Number.isInteger(weight) || weight < 1 || weight > 99) throw new Error("Tiêu chí hoặc trọng số không hợp lệ.");
    ids.add(id);
    return {id,label,weight};
  });
  if (rubric.reduce((sum, r) => sum+r.weight,0) !== 100) throw new Error("Tổng trọng số phải bằng 100%.");
  return rubric;
}
async function getSession(albumId: string) {
  const session = assertResult(await db.from("bes_judging_sessions").select("*").eq("album_id",albumId).maybeSingle());
  return session;
}
async function dashboard(session: any) {
  const judges = assertResult(await db.from("bes_judging_invites").select("id,full_name,revoked_at,submitted_at,last_seen_at,created_at").eq("session_id",session.id).order("created_at"));
  const ids = judges.map((j:any)=>j.id);
  const scores = ids.length ? assertResult(await db.from("bes_judging_scores").select("invite_id,slide_id,criteria,total,comment,updated_at").in("invite_id",ids)) : [];
  const counts:Record<string,number> = {};
  for (const score of scores as any[]) counts[score.invite_id] = (counts[score.invite_id] || 0) + 1;
  return { session, judges: judges.map((j:any)=>({...j,progress:counts[j.id]||0})),scores };
}
async function handle(req:Request, body:any) {
  const action = required(body.action);
  if (action.startsWith("admin:")) {
    await requireAdmin(req);
    const albumId = required(body.albumId);
    if (!/^[0-9a-f-]{36}$/i.test(albumId)) throw new Error("Album không hợp lệ.");
    const album = assertResult(await db.from("bes_slideshow_albums").select("id,title,is_published").eq("id",albumId).maybeSingle());
    if (!album) throw new Error("Không tìm thấy album.");
    let session:any = await getSession(albumId);
    if (!session && action === "admin:load") {
      session = assertResult(await db.from("bes_judging_sessions").insert({album_id:albumId}).select("*").single());
    }
    if (!session) throw new Error("Chưa tạo hội đồng giám khảo.");
    if (action === "admin:load") return send({ album, ...(await dashboard(session)) });
    if (action === "admin:rubric") {
      if (session.status !== "draft") throw new Error("Rubric đã khóa sau khi mở chấm.");
      const rubric = validRubric(body.rubric);
      assertResult(await db.from("bes_judging_sessions").update({rubric,updated_at:new Date().toISOString()}).eq("id",session.id).eq("status","draft").select("id").single());
    } else if (action === "admin:create") {
      if (session.status === "closed") throw new Error("Phiên đã kết thúc.");
      const full_name = required(body.fullName);
      if (full_name.length < 2 || full_name.length > 120) throw new Error("Họ tên giám khảo phải dài 2–120 ký tự.");
      const token = newToken();
      assertResult(await db.from("bes_judging_invites").insert({session_id:session.id,full_name,token_hash:await digest(token)}).select("id").single());
      return send({token, ...(await dashboard(await getSession(albumId)))});
    } else if (action === "admin:reissue") {
      const inviteId=required(body.inviteId);
      const judge=assertResult(await db.from("bes_judging_invites").select("id,submitted_at").eq("id",inviteId).eq("session_id",session.id).maybeSingle());
      if (!judge) throw new Error("Giám khảo không tồn tại.");
      if (session.status === "closed" || judge.submitted_at) throw new Error("Không thể cấp lại liên kết sau khi hoàn tất.");
      const token=newToken();
      assertResult(await db.from("bes_judging_invites").update({token_hash:await digest(token),revoked_at:null}).eq("id",inviteId).eq("session_id",session.id).select("id").single());
      return send({token,...(await dashboard(session))});
    } else if (action === "admin:revoke") {
      if (session.status === "closed") throw new Error("Phiên đã khóa.");
      const revokeJudge=assertResult(await db.from("bes_judging_invites").select("id,submitted_at").eq("id",required(body.inviteId)).eq("session_id",session.id).single());
      if(revokeJudge.submitted_at) throw new Error("Không thể thu hồi phiếu đã nộp nhằm bảo đảm tính công bằng.");
      assertResult(await db.from("bes_judging_invites").update({revoked_at:new Date().toISOString()}).eq("id",revokeJudge.id).eq("session_id",session.id).select("id").single());
    } else if (action === "admin:open") {
      if (session.status !== "draft") throw new Error("Phiên đã mở hoặc kết thúc.");
      if (!album.is_published) throw new Error("Chỉ mở chấm khi album đã công khai.");
      const slides = assertResult(await db.from("bes_slideshow_slides").select("id,image_path,sort_order,created_at").eq("album_id",albumId).order("sort_order").order("created_at"));
      if (!slides.length) throw new Error("Album chưa có tác phẩm.");
      const countCheck=await db.from("bes_judging_invites").select("id",{count:"exact",head:true}).eq("session_id",session.id).is("revoked_at",null);
      if ((countCheck.count||0)<1) throw new Error("Hãy tạo ít nhất một giám khảo.");
      validRubric(session.rubric);
      const snapshot=slides.map((s:any)=>({id:s.id,image_path:s.image_path}));
      assertResult(await db.from("bes_judging_sessions").update({status:"open",snapshot,opened_at:new Date().toISOString(),updated_at:new Date().toISOString()}).eq("id",session.id).eq("status","draft").select("id").single());
    } else if (action === "admin:close") {
      if (session.status !== "open") throw new Error("Phiên chưa mở hoặc đã kết thúc.");
      const result = await dashboard(session);
      const active=result.judges.filter((j:any)=>!j.revoked_at);
      if (!active.length || active.some((j:any)=>!j.submitted_at)) throw new Error("Tất cả giám khảo hợp lệ phải nộp phiếu trước khi khóa.");
      assertResult(await db.from("bes_judging_sessions").update({status:"closed",closed_at:new Date().toISOString()}).eq("id",session.id).eq("status","open").select("id").single());
    } else {return bad("Thao tác không được hỗ trợ.",404);}
    return send({album,...(await dashboard(await getSession(albumId)))});
  }
  if (action.startsWith("judge:")) {
    const judge:any = await getJudge(required(body.token));
    const session:any = assertResult(await db.from("bes_judging_sessions").select("id,album_id,status,rubric,snapshot").eq("id",judge.session_id).single());
    const album:any = assertResult(await db.from("bes_slideshow_albums").select("title").eq("id",session.album_id).single());
    if (action === "judge:load") {
      const scores = assertResult(await db.from("bes_judging_scores").select("slide_id,criteria,total,comment").eq("invite_id",judge.id));
      await db.from("bes_judging_invites").update({last_seen_at:new Date().toISOString()}).eq("id",judge.id);
      return send({title:album.title,fullName:judge.full_name,status:session.status,submitted:!!judge.submitted_at,rubric:session.rubric,slides:session.snapshot.map((s:any)=>({id:s.id,imageUrl:db.storage.from("brian-slideshows").getPublicUrl(s.image_path).data.publicUrl})),scores});
    }
    if (session.status !== "open" || judge.submitted_at) throw new Error("Phiếu chấm đã khóa hoặc phiên chưa mở.");
    if (action === "judge:save") {
      const slideId = required(body.slideId);
      if (!(session.snapshot as any[]).some(s=>s.id===slideId)) throw new Error("Tác phẩm không hợp lệ.");
      const rubric=validRubric(session.rubric);
      const values=body.criteria;
      if (!values || typeof values !== "object" || Array.isArray(values) || Object.keys(values).length!==rubric.length) throw new Error("Vui lòng chấm đủ các tiêu chí.");
      let total=0;
      for (const r of rubric) {
        const value=values[r.id];
        if (typeof value!=="number" || value<0 || value>10 || !Number.isInteger(value*2)) throw new Error("Điểm hợp lệ là 0–10, bước 0,5.");
        total += value*r.weight/10;
      }
      total=Math.round(total*100)/100;
      const comment=required(body.comment);
      if (comment.length>800) throw new Error("Nhận xét tối đa 800 ký tự.");
      assertResult(await db.from("bes_judging_scores").upsert({invite_id:judge.id,slide_id:slideId,criteria:values,total,comment,updated_at:new Date().toISOString()},{onConflict:"invite_id,slide_id"}).select("slide_id").single());
      return send({saved:true,total});
    }
    if (action === "judge:submit") {
      const scored=assertResult(await db.from("bes_judging_scores").select("slide_id").eq("invite_id",judge.id));
      const unique=new Set(scored.map((x:any)=>x.slide_id));
      if (unique.size!==session.snapshot.length || session.snapshot.some((s:any)=>!unique.has(s.id))) throw new Error("Hãy chấm đủ mọi tác phẩm trước khi nộp.");
      assertResult(await db.from("bes_judging_invites").update({submitted_at:new Date().toISOString()}).eq("id",judge.id).is("submitted_at",null).is("revoked_at",null).select("id").single());
      return send({submitted:true});
    }
    return bad("Thao tác không được hỗ trợ.",404);
  }
  return bad("Thao tác không được hỗ trợ.",404);
}
Deno.serve(async (req:Request)=>{
  if (req.method==="OPTIONS") return new Response(null,{status:204,headers:cors});
  if (req.method!=="POST") return bad("Method not allowed",405);
  try {
    if (Number(req.headers.get("content-length")||"0")>16000) return bad("Dữ liệu quá lớn.",413);
    const body=await req.json();
    return await handle(req,body);
  } catch(error) {
    const message=error instanceof Error ? error.message : "Không thể xử lý yêu cầu.";
    console.error("photo-judging",message);
    const code=/đăng nhập|Admin|quyền|Phiên đăng nhập/.test(message)?403:400;
    return bad(message,code);
  }
});
