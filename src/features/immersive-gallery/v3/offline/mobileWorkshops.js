import {isPublicWorkshopGroup,publicWorkshopHref} from '../aseanPublicWorkshop.js';
export const MOBILE_WORKSHOP_VERSION=1;
export function mobileRoute(hash){
 const [route,query='']=String(hash||'').split('?');
 if(route!=='#/gallery-create')return null;
 const p=new URLSearchParams(query),id=p.get('viewGroup');
 return id?{id,language:p.get('lang')==='en'?'en':'vi'}:null;
}
export function mobileEligible(assignment,group){return isPublicWorkshopGroup(assignment,group);}
export async function captureMobileWorkshop(group,assignment,read,embed){
 const main=await embed(await read(group.id));
 if(main.assignment?.id!==assignment.id||main.groupLabel!==group.label||!main.draft||!Array.isArray(main.records?.rows)||!Array.isArray(main.assets))throw new Error('Invalid published mobile workshop: '+group.label);
 const assertImages=(draft,assets)=>{
  const ids=new Set([...Object.values(draft?.artworks||{}),...(draft?.rooms||[]).flatMap(r=>(r.exhibits||[]).map(e=>e.asset_id))].filter(Boolean));
  for(const id of ids)if(!assets.some(a=>a.id===id&&typeof a.image_url==='string'&&a.image_url.startsWith('data:image/')))throw new Error('Published mobile image missing: '+group.label);
 };
 assertImages(main.draft,main.assets);
 let first=null;
 if(main.records.checkpoints?.some(c=>c.kind==='before'&&c.reconstructed)){
  first=await embed(await read(group.id,{section:'first'}));
  if(!first?.draft||!Array.isArray(first.assets))throw new Error('Invalid saved reference: '+group.label);
  assertImages(first.draft,first.assets);
 }
 return {main,first};
}
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function mobileLauncherEntries(groups,workshops){
 const rows=groups.filter(g=>workshops[g.id]?.main);
 const link=(g,lang)=>'../PetrusKy_Museum_Offline.html'+publicWorkshopHref(g.id,lang);
 const wrap=(title,body)=>'<!doctype html><html lang="vi"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>'+esc(title)+'</title><style>*{box-sizing:border-box}body{max-width:720px;margin:0 auto;padding:24px;font:16px system-ui,sans-serif;background:#f7f4ed;color:#181818}h1{font-size:32px;line-height:1.1}a{color:#151515}li{list-style:none;margin:10px 0}ul{padding:0}.open{display:block;padding:14px;border:1px solid #222;background:white;text-decoration:none;font-weight:700}.tag{color:#bd001f;font-weight:700}</style></head><body>'+body+'</body></html>';
 const files={'mobile/index.html':wrap('Bản mobile học sinh','<p class="tag">ASEAN IN THREE FRAMES · OFFLINE</p><h1>Bản mobile học sinh</h1><p>'+rows.length+' nhóm · Chỉ đọc · Không cần mạng</p><ul>'+rows.map(g=>'<li><a class="open" href="'+esc(g.filename)+'">'+esc(g.label)+' · '+esc(g.classScope)+' →</a></li>').join('')+'</ul><p><a href="../PetrusKy_Museum_Offline.html#student-workshops">Danh sách bài thực hành</a></p>')};
 for(const g of rows)files['mobile/'+g.filename]=wrap(g.label,'<p class="tag">MUSEUM LAB · OFFLINE</p><h1>'+esc(g.label)+' · '+esc(g.classScope)+'</h1><p>Mở đúng bài đã công bố của nhóm. Giữ nguyên thư mục sau khi giải nén.</p><a class="open" href="'+esc(link(g,'vi'))+'">Mở bản mobile · VI</a><p><a class="open" href="'+esc(link(g,'en'))+'">Open mobile view · EN</a></p><p><a href="index.html">Tất cả nhóm</a></p>');
 return files;
}
