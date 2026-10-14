import { getLessonCheckActivityContent } from './lessonCheckActivities.js';

const PRIVATE_IP = /^(?:localhost|127(?:\.\d{1,3}){3}|10(?:\.\d{1,3}){3}|192\.168(?:\.\d{1,3}){2}|172\.(?:1[6-9]|2\d|3[01])(?:\.\d{1,3}){2}|169\.254(?:\.\d{1,3}){2}|0(?:\.\d{1,3}){3}|\[.*\]|[^.]+\.local)$/i;

export function extractActivityLink(embedCode, embedKind='url') {
  const raw=String(embedCode||'').trim();
  if(!raw)return {status:'invalid',reason:'Thiếu đường dẫn hoạt động.'};
  const candidate=embedKind==='html'
    ? (raw.match(/<iframe\b[^>]*\bsrc\s*=\s*["']([^"']+)["']/i)?.[1] || '')
    : raw;
  if(!candidate)return {status:'manual',reason:'HTML không có iframe src để kiểm tra tự động.'};
  try{
    const url=new URL(candidate);
    if(url.protocol!=='https:' || url.username || url.password || PRIVATE_IP.test(url.hostname))
      return {status:'invalid',reason:'Đường dẫn không phải HTTPS công khai hợp lệ.'};
    return {status:'ready',url:url.href,host:url.hostname};
  }catch{
    return {status:'invalid',reason:'Đường dẫn không đúng định dạng URL.'};
  }
}
export async function checkActivityLink(activity,{timeoutMs=6500}={}) {
  const result=await getLessonCheckActivityContent(activity.id);
  if(!result.ok) return {status:'restricted',reason:result.message||'Không có quyền kiểm tra nguồn.'};
  const source=extractActivityLink(result.content?.embedCode,result.content?.embedKind);
  if(source.status!=='ready')return source;
  const controller=new AbortController();
  const timeout=setTimeout(()=>controller.abort(),timeoutMs);
  try{
    const response=await fetch(source.url,{method:'HEAD',mode:'cors',credentials:'omit',redirect:'follow',signal:controller.signal,referrerPolicy:'no-referrer'});
    if(response.ok)return {...source,status:'healthy',reason:'Máy chủ phản hồi hợp lệ ('+response.status+').'};
    if(response.status===404||response.status===410)return {...source,status:'broken',reason:'Máy chủ trả về HTTP '+response.status+'.'};
    if(response.status===401||response.status===403)return {...source,status:'restricted',reason:'Nguồn yêu cầu đăng nhập hoặc hạn chế truy cập ('+response.status+').'};
    return {...source,status:'unknown',reason:'Máy chủ trả về HTTP '+response.status+'; cần kiểm tra thủ công.'};
  }catch(e){
    return {...source,status:'unknown',reason:e?.name==='AbortError'
      ? 'Hết thời gian kiểm tra; chưa thể kết luận liên kết hỏng.'
      : 'Trình duyệt bị CORS hoặc mạng chặn; chưa thể kết luận liên kết hỏng.'};
  }finally{clearTimeout(timeout);}
}
