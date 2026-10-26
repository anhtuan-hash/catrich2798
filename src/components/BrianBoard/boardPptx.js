/** Private, client-side Open XML .pptx importer for Brian Board.
 * Imports editable text, simple solid-color shapes and supported raster pictures.
 * Does not execute macros, upload source files, or claim full PowerPoint fidelity.
 */
import JSZip from 'jszip';
import {BOARD_W,BOARD_H,makeId,newPage} from './boardModel.js';

export const MAX_BOARD_PPTX_MB=12;
export const MAX_BOARD_PPTX_SLIDES=20;
const MAX_IMAGE_BYTES=2_300_000;
const MAX_ZIP_FILES=1800;
const MAX_XML_BYTES=3_000_000;
const MAX_SLIDE_OBJECTS=450;
const EMU_PER_POINT=12700;
const MIME={png:'image/png',jpg:'image/jpeg',jpeg:'image/jpeg',webp:'image/webp'};
const FALLBACK_SCHEME={
 dk1:'#1e1e1e',lt1:'#ffffff',dk2:'#44546a',lt2:'#e7e6e6',
 accent1:'#4472c4',accent2:'#ed7d31',accent3:'#a5a5a5',accent4:'#ffc000',
 accent5:'#5b9bd5',accent6:'#70ad47',hlink:'#0563c1',folHlink:'#954f72'
};
const child=(n,local)=>Array.from(n?.childNodes||[]).find(x=>x.nodeType===1&&x.localName===local)||null;
const descendants=(n,local)=>Array.from(n?.getElementsByTagName('*')||[]).filter(x=>x.localName===local);
const first=(n,local)=>descendants(n,local)[0]||null;
const attr=(n,k,d='')=>n?.getAttribute?.(k)??d;
const num=(v,d=0)=>{const n=Number(v);return Number.isFinite(n)?n:d;};
const clamp=(n,min,max)=>Math.min(max,Math.max(min,n));
const hex=(s,d='#355d63')=>/^[0-9a-f]{6}$/i.test(s||'')?'#'+s.toLowerCase():d;
const bytes=(entry)=>num(entry?._data?.uncompressedSize);
const parseXml=s=>{
 const xml=new DOMParser().parseFromString(s,'application/xml');
 if(xml.getElementsByTagName('parsererror').length)throw Error('PowerPoint XML không hợp lệ');
 return xml;
};
const xmlFrom=async(zip,path)=>{
 const entry=zip.file(path);if(!entry)return null;
 if(bytes(entry)>MAX_XML_BYTES)throw Error('Thành phần XML quá lớn');
 const s=await entry.async('string');
 if(s.length>MAX_XML_BYTES)throw Error('Thành phần XML vượt giới hạn');
 return parseXml(s);
};
function shapeColor(node,theme,def=null){
 if(!node)return def;
 const solid=first(node,'solidFill');
 if(!solid)return def;
 const rgb=first(solid,'srgbClr');
 if(rgb)return hex(attr(rgb,'val'),def||'#355d63');
 const scheme=first(solid,'schemeClr');
 if(scheme)return theme[attr(scheme,'val')]||def;
 return def;
}
function relMap(xml){
 const map=new Map();
 for(const rel of descendants(xml,'Relationship')){
  const id=attr(rel,'Id'),target=attr(rel,'Target');
  if(id&&!/^[a-z]+:/i.test(target)&&!target.startsWith('/'))map.set(id,target);
 }
 return map;
}
function normalizedZipPath(base,target){
 const parts=(base+'/'+target).split('/');
 const out=[];
 for(const p of parts){if(!p||p==='.')continue;if(p==='..')out.pop();else out.push(p);}
 return out.join('/');
}
function transform(node,scale,shiftX,shiftY){
 const xfrm=first(node,'xfrm');if(!xfrm)return null;
 const off=child(xfrm,'off'),ext=child(xfrm,'ext');
 if(!off||!ext)return null;
 const w=num(attr(ext,'cx'))*scale,h=num(attr(ext,'cy'))*scale;
 if(w<2||h<2)return null;
 return {x:shiftX+num(attr(off,'x'))*scale,y:shiftY+num(attr(off,'y'))*scale,
  width:clamp(w,1,BOARD_W*3),height:clamp(h,1,BOARD_H*3)};
}
function splitLines(text,limit){
 const words=String(text||'').replace(/\s+/g,' ').trim().split(' ');
 const lines=[];let line='';
 for(const word of words){
  if(!word)continue;
  if(word.length>limit){
   if(line){lines.push(line);line='';}
   for(let i=0;i<word.length;i+=limit)lines.push(word.slice(i,i+limit));
  }else if((line+' '+word).trim().length>limit){if(line)lines.push(line);line=word;}
  else line=(line+' '+word).trim();
 }
 if(line)lines.push(line);
 return lines;
}
function parseText(sp,bounds,scale,theme){
 const tx=first(sp,'txBody');if(!tx)return [];
 const paragraphs=descendants(tx,'p');
 const out=[];let y=bounds.y+24;
 for(const p of paragraphs){
  const runs=descendants(p,'r');
  const rPr=runs.length?child(runs[0],'rPr'):null;
  const defaultRPr=first(p,'defRPr');
  const fontPr=rPr||defaultRPr;
  const raw=descendants(p,'t').map(n=>n.textContent||'').join('').trim();
  const fPt=num(attr(fontPr,'sz'),2400)/100;
  const fontSize=clamp(Math.round(fPt*EMU_PER_POINT*scale),15,105);
  const color=shapeColor(fontPr,theme,'#263a42');
  const bold=attr(fontPr,'b')==='1';
  const available=clamp(Math.floor(bounds.width/Math.max(10,fontSize*.54)),7,88);
  for(const line of splitLines(raw,available)){
   if(y>bounds.y+bounds.height+fontSize)break;
   out.push({id:makeId(),kind:'text',x:Math.round(bounds.x+9),y:Math.round(y+fontSize*.77),
    text:line.slice(0,90),fontSize,color,fontWeight:bold?'700':'550',studentVisible:true,pptxEditable:true});
   y+=fontSize*1.20;
   if(out.length>=80)break;
  }
  if(!raw)y+=fontSize*.45;
  if(out.length>=80)break;
 }
 return out;
}
async function imageObject(pic,bounds,rels,zip,slidePath,report){
 const blip=first(pic,'blip');
 const id=attr(blip,'r:embed')||attr(blip,'embed');
 const target=rels.get(id);
 if(!target)return null;
 const filePath=normalizedZipPath(slidePath.substring(0,slidePath.lastIndexOf('/')),target);
 if(!filePath.startsWith('ppt/media/')){report.skipped++;return null;}
 const ext=filePath.split('.').at(-1)?.toLowerCase(),mime=MIME[ext],entry=zip.file(filePath);
 if(!mime||!entry||bytes(entry)>MAX_IMAGE_BYTES){report.skipped++;return null;}
 const payload=await entry.async('base64');
 if(payload.length>3_100_000){report.skipped++;return null;}
 return {id:makeId(),kind:'image',src:'data:'+mime+';base64,'+payload,
  x:Math.round(bounds.x),y:Math.round(bounds.y),width:Math.round(bounds.width),
  height:Math.round(bounds.height),pptxEditable:true,studentVisible:true};
}
async function slideFromXml(zip,path,slideIndex,slideW,slideH,theme,report){
 const xml=await xmlFrom(zip,path);
 if(!xml)throw Error('Không đọc được slide '+(slideIndex+1));
 const scale=Math.min(BOARD_W/slideW,BOARD_H/slideH);
 const shiftX=(BOARD_W-slideW*scale)/2,shiftY=(BOARD_H-slideH*scale)/2;
 const relXml=await xmlFrom(zip,path.replace('/slides/','/slides/_rels/')+'.rels');
 const rels=relMap(relXml);
 const spTree=first(xml,'spTree');
 if(!spTree)throw Error('Không tìm thấy nội dung slide '+(slideIndex+1));
 const page=newPage('PPTX · '+(slideIndex+1));
 page.pptxSource=true;
 const objs=[];
 // Flatten root background; nested group transforms are deliberately not claimed supported.
 const bg=first(first(xml,'bg'),'solidFill');
 if(bg){
  const color=shapeColor(first(xml,'bg'),theme,'#ffffff');
  if(color)objs.push({id:makeId(),kind:'shape',shape:'rect',x:0,y:0,x2:BOARD_W,y2:BOARD_H,
    fill:color,color,width:0,locked:true,pptxBackground:true,studentVisible:true});
 }
 for(const node of Array.from(spTree.childNodes||[]).filter(n=>n.nodeType===1)){
  if(objs.length>=MAX_SLIDE_OBJECTS){report.skipped++;break;}
  const kind=node.localName;
  if(!['sp','pic','graphicFrame','grpSp','cxnSp'].includes(kind))continue;
  if(kind==='graphicFrame'||kind==='grpSp'){report.skipped++;continue;}
  const bounds=transform(node,scale,shiftX,shiftY);
  if(!bounds)continue;
  if(kind==='pic'){
   const picture=await imageObject(node,bounds,rels,zip,path,report);
   if(picture)objs.push(picture);
   continue;
  }
  const fill=shapeColor(child(node,'spPr'),theme);
  const outline=first(child(node,'spPr'),'ln');
  const outlineColor=shapeColor(outline,theme,fill||'#355d63');
  const geometry=first(node,'prstGeom'),prst=attr(geometry,'prst');
  const mapped=prst==='ellipse'?'ellipse':prst==='rect'||prst==='roundRect'?'rect':null;
  if((fill||outline)&&mapped)objs.push({id:makeId(),kind:'shape',shape:mapped,
    x:Math.round(bounds.x),y:Math.round(bounds.y),
    x2:Math.round(bounds.x+bounds.width),y2:Math.round(bounds.y+bounds.height),
    fill:fill||'none',color:outlineColor||'none',width:outline?2:0,studentVisible:true,pptxEditable:true});
  const txt=parseText(node,bounds,scale,theme);
  for(const t of txt){if(objs.length>=MAX_SLIDE_OBJECTS)break;objs.push(t);}
 }
 page.objects=objs;
 report.objects+=objs.length;
 return page;
}
export function validatePptxFile(file,currentPages=1){
 if(!file)return 'Chưa chọn tệp PowerPoint';
 if(!/\.pptx$/i.test(file.name||''))return 'Chỉ hỗ trợ tệp .pptx (không hỗ trợ .ppt)';
 if(file.size<100||file.size>MAX_BOARD_PPTX_MB*1024*1024)return 'Tệp phải từ 100 byte đến 12 MB';
 if(currentPages>=80)return 'Bài dạy đã đạt giới hạn 80 trang';
 return '';
}
export async function importBoardPptx(file,currentPages=1,onProgress=()=>{}){
 const invalid=validatePptxFile(file,currentPages);if(invalid)throw Error(invalid);
 const buffer=await file.arrayBuffer(),magic=new Uint8Array(buffer).slice(0,4);
 if(magic[0]!==0x50||magic[1]!==0x4b||![3,5,7].includes(magic[2]))throw Error('Đây không phải tệp PowerPoint Open XML hợp lệ');
 const zip=await JSZip.loadAsync(buffer,{checkCRC32:false});
 const archivePaths=Object.keys(zip.files);
 if(archivePaths.length>MAX_ZIP_FILES)throw Error('PowerPoint chứa quá nhiều thành phần');
 if(!zip.file('ppt/presentation.xml'))throw Error('Thiếu dữ liệu trình chiếu trong PPTX');
 const presentation=await xmlFrom(zip,'ppt/presentation.xml');
 const rels=relMap(await xmlFrom(zip,'ppt/_rels/presentation.xml.rels'));
 const list=first(presentation,'sldIdLst');
 const ordered=Array.from(list?.childNodes||[]).filter(n=>n.localName==='sldId')
  .map(n=>rels.get(attr(n,'r:id')||attr(n,'id')))
  .filter(Boolean).map(path=>normalizedZipPath('ppt',path))
  .filter(path=>/^ppt\/slides\/slide\d+\.xml$/.test(path));
 if(!ordered.length)throw Error('Không tìm thấy slide hợp lệ trong PPTX');
 if(ordered.length>MAX_BOARD_PPTX_SLIDES||currentPages+ordered.length>80)
  throw Error('Chỉ nhập tối đa 20 slide/lần và tổng không quá 80 trang');
 const sz=first(presentation,'sldSz');
 const w=Math.max(1,num(attr(sz,'cx'),12192000)),h=Math.max(1,num(attr(sz,'cy'),6858000));
 const themeXml=await xmlFrom(zip,'ppt/theme/theme1.xml');
 const theme={...FALLBACK_SCHEME};
 for(const node of descendants(themeXml,'clrScheme')[0]?.children||[]){
  const key=node.localName,clr=first(node,'srgbClr')||first(node,'sysClr');
  const val=attr(clr,'val')||attr(clr,'lastClr');
  if(val)theme[key]=hex(val,theme[key]||'#355d63');
 }
 const report={pages:ordered.length,objects:0,skipped:0};
 const pages=[];
 for(let i=0;i<ordered.length;i++){
  pages.push(await slideFromXml(zip,ordered[i],i,w,h,theme,report));
  onProgress({slide:i+1,total:ordered.length});
 }
 return {pages,report};
}
export const importedPptxPageIndices=lesson=>(lesson?.pages||[])
 .map((p,i)=>p.pptxSource?i:-1).filter(i=>i>=0);
