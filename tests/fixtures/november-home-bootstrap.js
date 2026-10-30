// Local browser QA only: actual app and components with an isolated HTTP fixture.
const theme={id:true,november_home_enabled:true,november_avatar_url:'',halloween_home_enabled:false,halloween_enabled:false,halloween_footer_enabled:false,updated_at:new Date().toISOString()};
const lessons=Array.from({length:65},(_,i)=>({id:`fixture-${i}`,title:`Term 1 | Grade ${10+i%3} | Week ${String(Math.floor(i/3)+1).padStart(2,'0')}`,grade:String(10+i%3),status:'published',school_year:'2026-2027',week_key:`week-${i}`,opens_at:'2026-01-01T00:00:00Z',published_at:`2026-10-${String(1+i%28).padStart(2,'0')}T00:00:00Z`,created_at:'2026-01-01T00:00:00Z',storage_path:'fixture.html'}));
const realFetch=window.fetch.bind(window);
window.fetch=async(input,init)=>{
 const url=new URL(typeof input==='string'?input:input.url,location.href);
 if(url.hostname!=='november-fixture.invalid')return realFetch(input,init);
 let data=[];
 const requestBody=init?.body || (typeof input!=='string' && input.method==='POST' ? await input.clone().text() : '{}');
 const requestHeaders=new Headers(init?.headers || (typeof input!=='string' ? input.headers : {}));
 if(url.pathname.endsWith('/bes_navigation_theme_settings'))data={...theme};
 else if(url.pathname.endsWith('/bes_set_november_home_enabled')){const body=JSON.parse(requestBody);Object.assign(theme,{november_home_enabled:body.p_enabled,halloween_home_enabled:false,halloween_enabled:false,halloween_footer_enabled:false,updated_at:new Date().toISOString()});data=[{...theme}];}
 else if(url.pathname.endsWith('/bes_set_halloween_home_enabled')){const body=JSON.parse(requestBody);Object.assign(theme,{november_home_enabled:false,halloween_home_enabled:body.p_enabled,halloween_enabled:body.p_enabled,halloween_footer_enabled:body.p_enabled,updated_at:new Date().toISOString()});data=[{...theme}];}
 else if(url.pathname.endsWith('/weekly_practice_items'))data=lessons;
 else if(url.pathname.includes('/auth/v1/'))data={user:null};
 else if(requestHeaders.get('accept')?.includes('vnd.pgrst.object'))data=null;
 return new Response(JSON.stringify(data),{status:200,headers:{'content-type':'application/json'}});
};
localStorage.setItem('bes-november-home-v1',JSON.stringify({enabled:true,avatarUrl:'',updatedAt:theme.updated_at}));
location.hash='#/home';
await import('/src/main.jsx');
const React=await import('react');
const {createRoot}=await import('react-dom/client');
const {default:Panel}=await import('/src/components/admin/NovemberHomeAdminPanel.jsx');
const {default:Halloween}=await import('/src/components/admin/HalloweenHomeAdminPanel.jsx');
const host=document.createElement('details');host.style.cssText='position:fixed;bottom:4px;left:4px;z-index:999999;max-width:min(800px,96vw);background:white;border:1px solid #aaa;padding:8px;max-height:90vh;overflow:auto';
host.innerHTML='<summary>QA · Seasonal controls</summary><div id="november-qa-panel"></div>';document.body.append(host);
const user={id:'00000000-0000-0000-0000-000000000001',role:'admin',approved:true,provider:'supabase'};
createRoot(host.lastChild).render(React.createElement(React.Fragment,null,React.createElement(Panel,{currentUser:user}),React.createElement(Halloween,{currentUser:user})));
