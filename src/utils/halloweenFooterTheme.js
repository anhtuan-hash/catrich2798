import { useEffect, useState } from 'react';
import { getRuntimeClient, subscribeTable } from '../services/runtime/core.js';

const TABLE='bes_navigation_theme_settings';
const STORAGE_KEY='bes-halloween-footer-v1';
const EVENT='bes-halloween-footer-updated';
const DEFAULT={enabled:false,updatedAt:'',verified:false};
let current=readCache();
let pending=null;
let sequence=0;

function readCache() {
  if(typeof window==='undefined') return {...DEFAULT};
  try {
    const data=JSON.parse(window.localStorage.getItem(STORAGE_KEY)||'null');
    return data && typeof data.enabled==='boolean'
      ? {enabled:data.enabled,updatedAt:String(data.updatedAt||''),verified:false}
      : {...DEFAULT};
  } catch { return {...DEFAULT}; }
}
export function getHalloweenFooterTheme(){return {...current};}
function publish(next,{force=false}={}) {
  if(!next || typeof next.enabled!=='boolean') return getHalloweenFooterTheme();
  const incoming=Date.parse(next.updatedAt||'')||0;
  const existing=Date.parse(current.updatedAt||'')||0;
  if(!force && incoming && existing && incoming < existing) return getHalloweenFooterTheme();
  const normalized={enabled:next.enabled,updatedAt:String(next.updatedAt||current.updatedAt||''),verified:true};
  if(Object.keys(normalized).every(k=>normalized[k]===current[k])) return getHalloweenFooterTheme();
  current=normalized;
  if(typeof window!=='undefined'){
    try{window.localStorage.setItem(STORAGE_KEY,JSON.stringify(current));}catch{/*optional*/}
    window.dispatchEvent(new CustomEvent(EVENT,{detail:getHalloweenFooterTheme()}));
  }
  return getHalloweenFooterTheme();
}
export async function loadHalloweenFooterTheme() {
  const client=getRuntimeClient();
  if(!client) return {ok:false,message:'Chưa kết nối Supabase.',settings:getHalloweenFooterTheme()};
  if(pending) return pending;
  pending=(async()=>{
    try {
      const {data,error}=await client.from(TABLE)
        .select('halloween_footer_enabled,updated_at').eq('id',true).maybeSingle();
      if(error) return {ok:false,message:error.message,settings:getHalloweenFooterTheme()};
      if(!data || typeof data.halloween_footer_enabled!=='boolean')
        return {ok:false,message:'Không tìm thấy cấu hình footer.',settings:getHalloweenFooterTheme()};
      return {ok:true,settings:publish({enabled:data.halloween_footer_enabled,updatedAt:data.updated_at})};
    } catch(error) {
      return {ok:false,message:error?.message||'Không đọc được cấu hình footer.',settings:getHalloweenFooterTheme()};
    } finally{pending=null;}
  })();
  return pending;
}
export async function saveHalloweenFooterTheme(enabled) {
  if(typeof enabled!=='boolean') return {ok:false,message:'Giá trị phải là bật hoặc tắt.'};
  const client=getRuntimeClient();
  if(!client) return {ok:false,message:'Chưa kết nối Supabase.'};
  try{
    const {data,error}=await client.rpc('bes_set_halloween_footer_enabled',{p_enabled:enabled});
    if(error) return {ok:false,message:error.message};
    const row=Array.isArray(data)?data[0]:data;
    if(!row || typeof row.halloween_footer_enabled!=='boolean')
      return {ok:false,message:'Máy chủ chưa xác nhận thay đổi.'};
    return {ok:true,settings:publish({enabled:row.halloween_footer_enabled,updatedAt:row.updated_at},{force:true})};
  }catch(error){return {ok:false,message:error?.message||'Không thể lưu giao diện footer.'};}
}

// Public, unconditionally mounted on visible Footers, including guest sessions.
export function useHalloweenFooterTheme(){
  const [settings,setSettings]=useState(getHalloweenFooterTheme);
  useEffect(()=>{
    if(typeof window==='undefined') return undefined;
    let active=true;
    const sync=e=>{if(active)setSettings({...((e&&e.detail)||getHalloweenFooterTheme())});};
    const refresh=()=>{if(active)void loadHalloweenFooterTheme();};
    const onStorage=e=>{
      if(e.key!==STORAGE_KEY)return;
      const saved=readCache();
      const a=Date.parse(saved.updatedAt||'')||0,b=Date.parse(current.updatedAt||'')||0;
      if(a>=b){current=saved;sync({detail:saved});}
      refresh();
    };
    const onVisible=()=>{if(!document.hidden)refresh();};
    window.addEventListener(EVENT,sync);
    window.addEventListener('storage',onStorage);
    window.addEventListener('focus',refresh);
    window.addEventListener('online',refresh);
    document.addEventListener('visibilitychange',onVisible);
    const unsubscribe=subscribeTable({
      key:'halloween-footer-'+(++sequence),table:TABLE,
      onChange:payload=>{
        const row=payload?.new;
        if(row && typeof row.halloween_footer_enabled==='boolean')
          publish({enabled:row.halloween_footer_enabled,updatedAt:row.updated_at});
        else refresh();
      },
    });
    const timer=window.setInterval(()=>{if(!document.hidden)refresh();},30000);
    sync();refresh();
    return ()=>{
      active=false;unsubscribe?.();window.clearInterval(timer);
      window.removeEventListener(EVENT,sync);
      window.removeEventListener('storage',onStorage);
      window.removeEventListener('focus',refresh);
      window.removeEventListener('online',refresh);
      document.removeEventListener('visibilitychange',onVisible);
    };
  },[]);
  return settings;
}
