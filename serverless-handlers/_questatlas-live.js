import { createHash } from 'node:crypto';
import { isIP } from 'node:net';

const RPC = Object.freeze({
  join: 'qatl_live_join',
  view: 'qatl_live_view',
  submit: 'qatl_live_submit',
});
const MAX_BODY_BYTES = 2048;

function fail(res, status, code, message) {
  return res.status(status).json({ code, error: message });
}
function bodyOf(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  if (typeof req.body === 'string') {
    try { return JSON.parse(req.body); } catch { return null; }
  }
  return null;
}
function normalizedClientIp(req) {
  // Vercel normalizes x-forwarded-for to protect against client spoofing.
  // Never trust arbitrary forwarded headers on another, unknown hosting provider.
  const forwarded = String(req.headers?.['x-vercel-forwarded-for'] ||
    req.headers?.['x-forwarded-for'] || '').split(',')[0].trim();
  const ip = process.env.VERCEL ? forwarded : String(req.socket?.remoteAddress || forwarded).trim();
  return isIP(ip) ? ip : '';
}
function sameOrigin(req) {
  const origin = String(req.headers?.origin || '').trim();
  if (!origin) return true;
  try {
    const allowedHost = String(req.headers?.host || '').toLowerCase();
    const actual = new URL(origin);
    return actual.host.toLowerCase() === allowedHost && actual.protocol === 'https:';
  } catch { return false; }
}
function validate(action, body) {
  if (!Object.hasOwn(RPC,action) || !body || typeof body !== 'object' ||
      Array.isArray(body)) return null;
  const code = String(body.code || '');
  if (!/^[A-F0-9]{12}$/.test(code)) return null;
  if (action === 'join') {
    const teamNo = Number(body.teamNo);
    const name = String(body.name || '').trim();
    if (!Number.isInteger(teamNo) || teamNo < 1 || teamNo > 8 ||
        name.length < 2 || name.length > 50 || /[\x00-\x1F\x7F]/.test(name))
      return null;
    return {p_code:code,p_team_no:teamNo,p_name:name};
  }
  const token = String(body.token || '');
  if (!/^[0-9a-f]{64}$/.test(token)) return null;
  if (action === 'view') return {p_code:code,p_token:token};
  const answer = String(body.answer || '').trim();
  if (!answer || answer.length > 180) return null;
  return {p_code:code,p_token:token,p_answer:answer};
}
function serverConfig() {
  const url = String(process.env.QUESTATLAS_SUPABASE_URL || process.env.SUPABASE_URL || '').replace(/\/$/,'');
  const key = String(process.env.QUESTATLAS_SUPABASE_SERVICE_KEY || '');
  const salt = String(process.env.QUESTATLAS_IP_SALT || '');
  if (!url || key.length < 24 || salt.length < 32) return null;
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== 'https:' || !/^[a-z0-9-]+\.supabase\.co$/i.test(parsed.hostname) ||
        parsed.pathname !== '/' || parsed.search || parsed.hash) return null;
  } catch { return null; }
  return {url,key,salt};
}
async function callRpc(config,name,payload) {
  const signal = AbortSignal.timeout(8000);
  const response = await fetch(config.url + '/rest/v1/rpc/' + name, {
    method:'POST',
    headers:{ apikey:config.key, authorization:'Bearer '+config.key,
      'Content-Type':'application/json','Accept':'application/json' },
    body:JSON.stringify(payload),
    signal,
  });
  const raw = await response.text();
  let data=null;
  try { data=JSON.parse(raw); } catch { /* avoid returning upstream HTML or traces */ }
  if (!response.ok || data == null) throw new Error('Supabase RPC failed');
  return data;
}
export default async function handler(req,res) {
  res.setHeader('Cache-Control','no-store, max-age=0');
  res.setHeader('X-Content-Type-Options','nosniff');
  if (req.method !== 'POST') {
    res.setHeader('Allow','POST');
    return fail(res,405,'METHOD_NOT_ALLOWED','Chỉ hỗ trợ POST.');
  }
  if (!sameOrigin(req)) return fail(res,403,'ORIGIN_REJECTED','Nguồn yêu cầu không hợp lệ.');
  const config=serverConfig();
  if (!config) return fail(res,503,'GATEWAY_NOT_CONFIGURED','Phòng chơi chưa được kích hoạt trên máy chủ.');
  const ip=normalizedClientIp(req);
  if (!ip) return fail(res,403,'NO_CLIENT_IP','Không thể xác thực nguồn kết nối.');
  const length=Number(req.headers?.['content-length'] || 0);
  if (length>MAX_BODY_BYTES) return fail(res,413,'BODY_TOO_LARGE','Yêu cầu quá dài.');
  const body=bodyOf(req);
  if (JSON.stringify(body || {}).length>MAX_BODY_BYTES) return fail(res,413,'BODY_TOO_LARGE','Yêu cầu quá dài.');
  const action=String(body?.action || '');
  const payload=validate(action,body);
  if (!payload) return fail(res,400,'INVALID_REQUEST','Dữ liệu tham gia phòng không hợp lệ.');
  // Server-only salted IP digest. No raw addresses or secret keys reach PostgreSQL.
  const ipDigest=createHash('sha256').update(config.salt+'|'+ip).digest('hex');
  try {
    const allowed=await callRpc(config,'qatl_live_gateway_budget',{
      p_ip_hash:ipDigest,p_action:action
    });
    if (allowed!==true) {
      res.setHeader('Retry-After','60');
      return fail(res,429,'RATE_LIMITED','Bạn thao tác quá nhanh. Hãy thử lại sau.');
    }
    const result=await callRpc(config,RPC[action],payload);
    if (result?.error==='rate_limited' || result?.reason==='rate_limited') {
      res.setHeader('Retry-After','60');
      return fail(res,429,'RATE_LIMITED','Phiên chơi đang giới hạn lưu lượng.');
    }
    if (result?.error==='team_taken') return fail(res,409,'TEAM_TAKEN','Đội này đã có thiết bị tham gia.');
    if (!result || typeof result!=='object') throw new Error('Unexpected upstream payload');
    if (action==='view') {
      // Defense in depth: a future RPC edit cannot accidentally expose answer keys.
      const puzzle=result.puzzle;
      result.puzzle=puzzle ? {
        position:puzzle.position,kind:puzzle.kind,stem:puzzle.stem,
        options:puzzle.options,points:puzzle.points
      } : null;
      delete result.puzzle_snapshot;
      delete result.correct_answer;
      delete result.token_hash;
    }
    return res.status(200).json(result);
  } catch {
    return fail(res,503,'ROOM_UNAVAILABLE','Không thể kết nối phòng chơi. Hãy thử lại sau.');
  }
}
