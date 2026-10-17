const PUBLIC_GUEST_ACTIONS = new Set(['join','view','submit']);
export async function questGuestRequest(action,payload) {
  if (!PUBLIC_GUEST_ACTIONS.has(action)) throw new Error('Hành động phòng chơi không hợp lệ.');
  const controller=new AbortController();
  const timeout=setTimeout(()=>controller.abort(),9500);
  try {
    const response=await fetch('/api/questatlas-live',{
      method:'POST',
      headers:{'Content-Type':'application/json','Accept':'application/json'},
      credentials:'same-origin',
      cache:'no-store',
      body:JSON.stringify({action,...payload}),
      signal:controller.signal,
    });
    const data=await response.json().catch(()=>({}));
    if(!response.ok){
      if(response.status===429)throw new Error('Hệ thống đang giới hạn lượt truy cập. Hãy thử lại sau.');
      if(data.code==='TEAM_TAKEN')throw new Error('Đội này đã có thiết bị tham gia. Chọn đội khác hoặc nhờ giáo viên đặt lại.');
      if(data.code==='GATEWAY_NOT_CONFIGURED')throw new Error('Máy chủ chưa được cấu hình tính năng thi đấu. Vui lòng báo giáo viên.');
      throw new Error(data.error||'Không thể kết nối phòng chơi.');
    }
    return data;
  } catch(e) {
    if(e?.name==='AbortError'||e?.name==='TimeoutError')
      throw new Error('Kết nối chậm hoặc gián đoạn. Vui lòng kiểm tra Wi-Fi.');
    throw e;
  } finally {clearTimeout(timeout);}
}
