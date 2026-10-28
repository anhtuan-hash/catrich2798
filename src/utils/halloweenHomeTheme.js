import { useEffect, useState } from 'react';
import { getRuntimeClient, subscribeTable } from '../services/runtime/core.js';

const TABLE = 'bes_navigation_theme_settings';
const KEY = 'bes-halloween-home-master-v4';
const EVENT = 'bes-halloween-home-master-updated';
const FALLBACK = Object.freeze({enabled:false,verified:false,updatedAt:''});
let state = cached();
let inflight = null;
let sequence = 0;

function cached(){
  if(typeof window==='undefined') return {...FALLBACK};
  try{
    const x=JSON.parse(window.localStorage.getItem(KEY)||'null');
    return x && typeof x.enabled==='boolean'
      ? {enabled:x.enabled,updatedAt:String(x.updatedAt||''),verified:false}
      : {...FALLBACK};
  }catch{return {...FALLBACK};}
}
export function getHalloweenHomeTheme(){return {...state};}
function publish(enabled,updatedAt,force=false){
  if(typeof enabled!=='boolean') return getHalloweenHomeTheme();
  const nextDate=Date.parse(updatedAt||'')||0,oldDate=Date.parse(state.updatedAt||'')||0;
  if(!force && nextDate && oldDate && nextDate<oldDate) return getHalloweenHomeTheme();
  const next={enabled,updatedAt:String(updatedAt||state.updatedAt||''),verified:true};
  if(Object.keys(next).every(k=>next[k]===state[k]))return getHalloweenHomeTheme();
  state=next;
  if(typeof window!=='undefined'){
    try{window.localStorage.setItem(KEY,JSON.stringify(next));}catch{/* optional */}
    window.dispatchEvent(new CustomEvent(EVENT,{detail:getHalloweenHomeTheme()}));
  }
  return getHalloweenHomeTheme();
}
export async function loadHalloweenHomeTheme(){
  const client=getRuntimeClient();
  if(!client)return {ok:false,error:'Supabase không khả dụng.',settings:getHalloweenHomeTheme()};
  if(inflight)return inflight;
  inflight=(async()=>{
    try{
      const {data,error}=await client.from(TABLE)
        .select('halloween_home_enabled,updated_at').eq('id',true).maybeSingle();
      if(error)return {ok:false,error:error.message,settings:getHalloweenHomeTheme()};
      if(!data || typeof data.halloween_home_enabled!=='boolean')
        return {ok:false,error:'Chưa tìm thấy cấu hình toàn trang.',settings:getHalloweenHomeTheme()};
      return {ok:true,settings:publish(data.halloween_home_enabled,data.updated_at)};
    }catch(error){return {ok:false,error:error?.message||'Không tải được cài đặt.',settings:getHalloweenHomeTheme()};}
    finally{inflight=null;}
  })();
  return inflight;
}
export async function saveHalloweenHomeTheme(enabled){
  if(typeof enabled!=='boolean')return {ok:false,error:'Giá trị không hợp lệ.'};
  const client=getRuntimeClient();
  if(!client)return {ok:false,error:'Supabase không khả dụng.'};
  try{
    const {data,error}=await client.rpc('bes_set_halloween_home_enabled',{p_enabled:enabled});
    if(error)return {ok:false,error:error.message};
    const row=Array.isArray(data)?data[0]:data;
    if(!row || typeof row.halloween_home_enabled!=='boolean' ||
       row.halloween_home_enabled!==enabled ||
       row.halloween_enabled!==enabled ||
       row.halloween_footer_enabled!==enabled)
      return {ok:false,error:'Máy chủ không xác nhận đủ ba trạng thái.'};
    const settings=publish(row.halloween_home_enabled,row.updated_at,true);
    // Refresh individual navbar/footer subscriptions on the same active tab.
    if(typeof window!=='undefined')window.dispatchEvent(new Event('focus'));
    return {ok:true,settings};
  }catch(error){return {ok:false,error:error?.message||'Không lưu được chủ đề.'};}
}
export function useHalloweenHomeTheme(){
  const [settings,setSettings]=useState(getHalloweenHomeTheme);
  useEffect(()=>{
    if(typeof window==='undefined')return undefined;
    let active=true;
    const sync=e=>{if(active)setSettings({...((e&&e.detail)||getHalloweenHomeTheme())});};
    const refresh=()=>{if(active)void loadHalloweenHomeTheme();};
    const onStorage=e=>{
      if(e.key!==KEY)return;
      const next=cached(),a=Date.parse(next.updatedAt||'')||0,b=Date.parse(state.updatedAt||'')||0;
      if(a>=b){state=next;sync({detail:next});}
      refresh();
    };
    const onVisibility=()=>{if(!document.hidden)refresh();};
    window.addEventListener(EVENT,sync);
    window.addEventListener('storage',onStorage);
    window.addEventListener('focus',refresh);
    window.addEventListener('online',refresh);
    document.addEventListener('visibilitychange',onVisibility);
    const unsubscribe=subscribeTable({
      key:'halloween-home-v4-'+(++sequence),table:TABLE,
      onChange:payload=>{
        const row=payload?.new;
        if(row && typeof row.halloween_home_enabled==='boolean')
          publish(row.halloween_home_enabled,row.updated_at);
        else refresh();
      },
    });
    const poll=window.setInterval(()=>{if(!document.hidden)refresh();},30000);
    sync();refresh();
    return ()=>{
      active=false;unsubscribe?.();window.clearInterval(poll);
      window.removeEventListener(EVENT,sync);
      window.removeEventListener('storage',onStorage);
      window.removeEventListener('focus',refresh);
      window.removeEventListener('online',refresh);
      document.removeEventListener('visibilitychange',onVisibility);
    };
  },[]);
  return settings;
}
