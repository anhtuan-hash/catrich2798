(function bootstrapBESSupabaseRuntimeBridge(){
  'use strict';
  if(window.BESSupabaseBridge&&window.BESSupabaseBridge.version==='10.90.0-HF1')return;

  var VERSION='10.90.0-HF1';
  var CACHE_KEY='bes-supabase-public-config-v10900hf1';
  var WORK_HUB_CACHE_KEY='bes-work-hub-public-config-v10890';
  var state={mode:'booting',session:null,config:null,lastError:'',attempts:0,readyAt:null,warming:false,reloadSent:false};

  function safeParse(raw,fallback){if(!raw)return fallback;try{return JSON.parse(raw);}catch(_){return fallback;}}
  function safeGet(key){try{return window.localStorage.getItem(key);}catch(_){return null;}}
  function safeSet(key,value){try{window.localStorage.setItem(key,value);return true;}catch(_){return false;}}
  function sleep(ms){return new Promise(function(resolve){setTimeout(resolve,ms);});}
  function decodeJwt(token){
    try{
      var part=String(token||'').split('.')[1];if(!part)return null;
      part=part.replace(/-/g,'+').replace(/_/g,'/');while(part.length%4)part+='=';
      var raw=atob(part),encoded='';
      for(var i=0;i<raw.length;i++)encoded+='%'+('00'+raw.charCodeAt(i).toString(16)).slice(-2);
      return JSON.parse(decodeURIComponent(encoded));
    }catch(_){return null;}
  }
  function isClient(candidate){return !!(candidate&&typeof candidate.from==='function'&&candidate.auth&&typeof candidate.auth.getSession==='function'&&!candidate.__besRuntimeBridge);}
  function discoverNativeClient(){
    var candidates=[window.__supabaseClient,window.BES_SUPABASE,window.besSupabase,window.__supabase,window.__SUPABASE__,window.sb,window.supabaseClient,window.supabase];
    for(var i=0;i<candidates.length;i++){
      if(isClient(candidates[i]))return candidates[i];
      if(candidates[i]&&isClient(candidates[i].client))return candidates[i].client;
    }
    return null;
  }
  function findSessionValue(value,depth,seen){
    if(!value||depth>8)return null;
    if(typeof value==='string'){var parsed=safeParse(value,null);return parsed?findSessionValue(parsed,depth+1,seen):null;}
    if(typeof value!=='object')return null;
    if(seen.indexOf(value)>=0)return null;seen.push(value);
    if(typeof value.access_token==='string'&&value.access_token.split('.').length===3){
      var payload=decodeJwt(value.access_token)||{};
      var user=value.user||(value.session&&value.session.user)||null;
      if(!user&&payload.sub)user={id:payload.sub,email:payload.email||'',app_metadata:payload.app_metadata||{},user_metadata:payload.user_metadata||{}};
      return {access_token:value.access_token,refresh_token:value.refresh_token||'',expires_at:value.expires_at||0,user:user};
    }
    var preferred=['currentSession','session','data','value','auth','persistedSession'];
    for(var i=0;i<preferred.length;i++)if(value[preferred[i]]){var direct=findSessionValue(value[preferred[i]],depth+1,seen);if(direct)return direct;}
    var keys=Object.keys(value).slice(0,100);
    for(var j=0;j<keys.length;j++){var found=findSessionValue(value[keys[j]],depth+1,seen);if(found)return found;}
    return null;
  }
  function discoverSession(){
    var preferred=[],fallback=[];
    try{
      for(var i=0;i<window.localStorage.length;i++){
        var key=window.localStorage.key(i);if(!key)continue;
        if(/^sb-[a-z0-9-]+-auth-token$/i.test(key))preferred.push(key);
        else if(/(auth|session|current.?user)/i.test(key))fallback.push(key);
      }
      var keys=preferred.concat(fallback);
      for(var j=0;j<keys.length;j++){
        var raw=window.localStorage.getItem(keys[j]);if(!raw||raw.length>2000000)continue;
        var session=findSessionValue(raw,0,[]);
        if(session){
          session.storageKey=keys[j];
          var match=keys[j].match(/^sb-([a-z0-9-]+)-auth-token$/i);if(match)session.projectRef=match[1];
          return session;
        }
      }
    }catch(_){}
    return null;
  }
  function scanObjectForConfig(value,depth,seen,result){
    if(!value||depth>5||typeof value!=='object'||seen.indexOf(value)>=0)return;seen.push(value);
    Object.keys(value).slice(0,120).forEach(function(key){
      var item;try{item=value[key];}catch(_){return;}
      if(typeof item==='string'){
        if(!result.url){var u=item.match(/https:\/\/[a-z0-9-]+\.supabase\.co/i);if(u)result.url=u[0];}
        if(!result.key&&/^sb_publishable_/i.test(item))result.key=item;
        if(!result.key&&item.split('.').length===3){var p=decodeJwt(item);if(p&&p.role==='anon')result.key=item;}
      }else if(item&&typeof item==='object')scanObjectForConfig(item,depth+1,seen,result);
    });
  }
  async function discoverPublicConfig(session){
    var caches=[safeParse(safeGet(CACHE_KEY),null),safeParse(safeGet(WORK_HUB_CACHE_KEY),null)];
    for(var c=0;c<caches.length;c++)if(caches[c]&&caches[c].url&&caches[c].key)return {url:caches[c].url,key:caches[c].key,savedAt:caches[c].savedAt||Date.now()};
    var result={url:'',key:''};
    [window.__ENV__,window.ENV,window.__APP_CONFIG__,window.BES_CONFIG,window.__VITE_ENV__,window.BES_RELEASE_CONFIG].forEach(function(item){scanObjectForConfig(item,0,[],result);});
    if(!result.url&&session&&session.projectRef)result.url='https://'+session.projectRef+'.supabase.co';
    var scripts=Array.prototype.map.call(document.scripts||[],function(script){return script.src;}).filter(function(src){
      if(!src)return false;try{return new URL(src,location.href).origin===location.origin;}catch(_){return false;}
    }).slice(-24);
    for(var i=0;i<scripts.length&&(!result.url||!result.key);i++){
      try{
        var response=await fetch(scripts[i],{credentials:'same-origin',cache:'force-cache'});if(!response.ok)continue;
        var source=await response.text();if(source.length>12000000)continue;
        if(!result.url){var urls=source.match(/https:\/\/[a-z0-9-]+\.supabase\.co/ig);if(urls&&urls[0])result.url=urls[0];}
        if(!result.key){var pub=source.match(/sb_publishable_[A-Za-z0-9._-]{20,}/g);if(pub&&pub[0])result.key=pub[0];}
        if(!result.key){
          var tokens=source.match(/eyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}/g)||[];
          for(var t=0;t<Math.min(tokens.length,80);t++){var payload=decodeJwt(tokens[t]);if(payload&&payload.role==='anon'){result.key=tokens[t];break;}}
        }
      }catch(_){}
    }
    if(result.url){
      if(!result.key&&session&&session.access_token)result.key=session.access_token;
      result.savedAt=Date.now();safeSet(CACHE_KEY,JSON.stringify(result));return result;
    }
    return null;
  }
  async function waitForSession(maxMs){
    var nativeClient=discoverNativeClient();
    if(nativeClient){try{var nativeResult=await nativeClient.auth.getSession();if(nativeResult&&nativeResult.data&&nativeResult.data.session)return nativeResult.data.session;}catch(_){}}
    var started=Date.now(),session=discoverSession();
    while(!session&&Date.now()-started<maxMs){await sleep(400);session=discoverSession();}
    return session;
  }
  async function ensureReady(){
    var nativeClient=discoverNativeClient();
    if(nativeClient)return {native:nativeClient,session:null,config:null};
    var session=state.session||await waitForSession(15000);if(!session)throw new Error('Không tìm thấy phiên đăng nhập Supabase trong trình duyệt.');
    state.session=session;
    var config=state.config||await discoverPublicConfig(session);if(!config||!config.url)throw new Error('Không xác định được Supabase URL từ phiên đăng nhập.');
    state.config=config;return {native:null,session:session,config:config};
  }
  function replayNative(nativeClient,table,operations){
    var query=nativeClient.from(table);
    for(var i=0;i<operations.length;i++){
      var op=operations[i];if(typeof query[op.name]==='function')query=query[op.name].apply(query,op.args);
    }
    return query;
  }
  function restBuilder(table){
    var operations=[];
    function add(name,args){operations.push({name:name,args:Array.prototype.slice.call(args)});return api;}
    async function execute(){
      try{
        var ready=await ensureReady();
        if(ready.native)return await replayNative(ready.native,table,operations);
        var method='GET',payload=null,select='*',filters=[],order='',limit='',onConflict='',returnRows=false,singleMode='';
        operations.forEach(function(op){
          var a=op.args;
          if(op.name==='select'){select=a[0]||'*';returnRows=method!=='GET'||returnRows;}
          else if(op.name==='eq')filters.push([a[0],'eq.'+String(a[1])]);
          else if(op.name==='order')order=String(a[0])+'.'+((a[1]&&a[1].ascending===false)?'desc':'asc');
          else if(op.name==='limit')limit=String(a[0]);
          else if(op.name==='insert'){method='POST';payload=a[0];}
          else if(op.name==='upsert'){method='POST';payload=a[0];onConflict=a[1]&&a[1].onConflict||'';}
          else if(op.name==='update'){method='PATCH';payload=a[0];}
          else if(op.name==='delete')method='DELETE';
          else if(op.name==='single')singleMode='single';
          else if(op.name==='maybeSingle')singleMode='maybeSingle';
        });
        var params=new URLSearchParams();params.set('select',select||'*');
        filters.forEach(function(pair){params.append(pair[0],pair[1]);});
        if(order)params.set('order',order);if(limit)params.set('limit',limit);if(onConflict)params.set('on_conflict',onConflict);
        var url=ready.config.url.replace(/\/$/,'')+'/rest/v1/'+encodeURIComponent(table)+'?'+params.toString();
        var prefer=[];if(onConflict)prefer.push('resolution=merge-duplicates');prefer.push(returnRows?'return=representation':'return=minimal');
        var headers={apikey:ready.config.key||ready.session.access_token,Authorization:'Bearer '+ready.session.access_token,'Content-Type':'application/json',Prefer:prefer.join(',')};
        var response=await fetch(url,{method:method,headers:headers,body:payload==null?undefined:JSON.stringify(payload)});
        var raw=await response.text(),data=raw?safeParse(raw,raw):null;
        if(!response.ok){var errorData=data&&typeof data==='object'?data:{};return {data:null,error:{message:errorData.message||errorData.details||String(data||response.statusText),code:errorData.code||String(response.status),details:errorData.details||'',hint:errorData.hint||''}};}
        if(singleMode&&Array.isArray(data))data=data.length?data[0]:null;
        return {data:data,error:null};
      }catch(error){state.lastError=String(error&&error.message||error);return {data:null,error:{message:state.lastError,code:'BES_BRIDGE',details:'',hint:''}};}
    }
    var api={
      select:function(){return add('select',arguments);},eq:function(){return add('eq',arguments);},order:function(){return add('order',arguments);},limit:function(){return add('limit',arguments);},
      insert:function(){return add('insert',arguments);},upsert:function(){return add('upsert',arguments);},update:function(){return add('update',arguments);},delete:function(){return add('delete',arguments);},
      single:function(){add('single',arguments);return execute();},maybeSingle:function(){add('maybeSingle',arguments);return execute();},
      then:function(resolve,reject){return execute().then(resolve,reject);},catch:function(reject){return execute().catch(reject);},finally:function(handler){return execute().finally(handler);}
    };
    return api;
  }
  function noOpChannel(){var channel={on:function(){return channel;},subscribe:function(callback){if(typeof callback==='function')setTimeout(function(){callback('SUBSCRIBED');},0);return channel;},unsubscribe:function(){return Promise.resolve('ok');}};return channel;}
  var bridgeClient={
    __besRuntimeBridge:true,
    auth:{getSession:async function(){
      var nativeClient=discoverNativeClient();if(nativeClient)return nativeClient.auth.getSession();
      var session=await waitForSession(15000);if(session){state.session=session;return {data:{session:session},error:null};}
      return {data:{session:null},error:{message:'Không tìm thấy phiên đăng nhập Supabase.'}};
    }},
    from:function(table){return restBuilder(table);},
    channel:function(name){var nativeClient=discoverNativeClient();return nativeClient&&typeof nativeClient.channel==='function'?nativeClient.channel(name):noOpChannel();},
    removeChannel:function(channel){var nativeClient=discoverNativeClient();return nativeClient&&typeof nativeClient.removeChannel==='function'?nativeClient.removeChannel(channel):Promise.resolve('ok');}
  };

  function report(){return {version:VERSION,mode:state.mode,hasSession:!!state.session,hasConfig:!!state.config,projectUrl:state.config&&state.config.url||'',attempts:state.attempts,readyAt:state.readyAt,lastError:state.lastError};}
  function notifyReady(){
    if(state.reloadSent)return;state.reloadSent=true;
    try{window.dispatchEvent(new CustomEvent('bes-supabase-bridge-ready',{detail:report()}));}catch(_){}
    setTimeout(function(){try{if(window.BESSmartKnowledge&&typeof window.BESSmartKnowledge.reload==='function')window.BESSmartKnowledge.reload();}catch(_){}},100);
  }
  async function warmup(){
    if(state.warming)return;state.warming=true;state.attempts+=1;
    try{
      var ready=await ensureReady();state.mode=ready.native?'native':'rest';state.lastError='';state.readyAt=new Date().toISOString();notifyReady();
    }catch(error){state.mode='waiting';state.lastError=String(error&&error.message||error);state.reloadSent=false;}
    finally{state.warming=false;}
  }

  var existing=discoverNativeClient();
  if(!existing)window.supabaseClient=bridgeClient;
  state.mode=existing?'native':'waiting';
  window.BESSupabaseBridge={version:VERSION,client:existing||bridgeClient,warmup:warmup,report:report,reset:function(){state.session=null;state.config=null;state.lastError='';state.reloadSent=false;try{localStorage.removeItem(CACHE_KEY);}catch(_){}return warmup();}};
  ['focus','online'].forEach(function(name){window.addEventListener(name,function(){state.reloadSent=false;warmup();});});
  window.addEventListener('storage',function(event){if(!event.key||/(^sb-|auth|session)/i.test(event.key)){state.session=null;state.reloadSent=false;warmup();}});
  document.addEventListener('visibilitychange',function(){if(!document.hidden){state.reloadSent=false;warmup();}});
  ['bes:auth-ready','bes-auth-ready','supabase-auth-ready'].forEach(function(name){window.addEventListener(name,function(){state.session=null;state.reloadSent=false;warmup();});});
  warmup();
})();
