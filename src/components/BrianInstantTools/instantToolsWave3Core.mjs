// No-network Wave 3 helpers. Never evaluate user text as JavaScript.
export const NOTE_COLORS=['sun','mint','sky','rose','lavender'];
export const clampNumber=(v,min,max,fallback=min)=>{
 const n=Number(v);
 return Number.isFinite(n)?Math.min(max,Math.max(min,n)):fallback;
};
export const textBound=(v,max,fallback='')=>typeof v==='string'?v.slice(0,max):fallback;
export function normalizeQuickUrl(raw){
 const value=String(raw??'').trim();
 if(!value||value.length>500)return null;
 try{
   const u=new URL(value);
   if(!['http:','https:'].includes(u.protocol)||!u.hostname||u.username||u.password)return null;
   return u.href;
 }catch{return null;}
}
export function textStats(input){
 const text=textBound(input,20000);
 const words=(text.match(/[\p{L}\p{N}]+(?:['’\-][\p{L}\p{N}]+)*/gu)||[]).length;
 const charsNoSpaces=(text.match(/\S/gu)||[]).length;
 let chars=[...text].length;
 try{
   if(typeof Intl?.Segmenter==='function')chars=[...new Intl.Segmenter(undefined,{granularity:'grapheme'}).segment(text)].length;
 }catch{}
 const sentences=(text.match(/[^.!?。！？\n]+[.!?。！？]+|[^.!?。！？\n]+$/gm)||[]).filter(s=>s.trim()).length;
 const paragraphs=text.split(/\n\s*\n/).filter(s=>s.trim()).length;
 return {words,chars,charsNoSpaces,sentences,paragraphs};
}
export function transformText(input,operation){
 const text=textBound(input,20000);
 if(operation==='upper')return text.toLocaleUpperCase();
 if(operation==='lower')return text.toLocaleLowerCase();
 if(operation==='title')return text.toLocaleLowerCase().replace(/(^|[^\p{L}])(\p{L})/gu,(_,sep,c)=>sep+c.toLocaleUpperCase());
 if(operation==='trim')return text.trim().replace(/[ \t]+/g,' ').replace(/[ \t]*\n[ \t]*/g,'\n').replace(/\n{3,}/g,'\n\n');
 return text;
}
export function calculate(expression){
 const raw=textBound(expression,120).trim().replace(/[×x]/g,'*').replace(/[÷]/g,'/').replace(/[−]/g,'-').replace(/,/g,'.');
 if(!raw||/[^0-9+\-*/%().\s]/.test(raw))throw Error('SYNTAX');
 let i=0,ops=0;
 const skip=()=>{while(/\s/.test(raw[i]||'')&&i<raw.length)i++;};
 function factor(){
   if(++ops>500)throw Error('SYNTAX');
   skip();
   const ch=raw[i];
   if(ch==='+'||ch==='-'){i++;const n=factor();return ch==='-'?-n:n;}
   let n;
   if(ch==='('){
     i++;n=expressionLevel();skip();if(raw[i]!==')')throw Error('SYNTAX');i++;
   }else{
     const rest=raw.slice(i);
     const m=rest.match(/^(?:\d+(?:\.\d*)?|\.\d+)/);
     if(!m)throw Error('SYNTAX');
     i+=m[0].length;n=Number(m[0]);
   }
   skip();
   while(raw[i]==='%'){i++;n/=100;skip();}
   return n;
 }
 function term(){
   let n=factor();skip();
   while(raw[i]==='*'||raw[i]==='/'){
     const op=raw[i++],rhs=factor();
     if(op==='/'&&rhs===0)throw Error('DIV_ZERO');
     n=op==='*'?n*rhs:n/rhs;
     skip();
   }
   return n;
 }
 function expressionLevel(){
   let n=term();skip();
   while(raw[i]==='+'||raw[i]==='-'){
     const op=raw[i++],rhs=term();n=op==='+'?n+rhs:n-rhs;skip();
   }
   return n;
 }
 const result=expressionLevel();skip();
 if(i!==raw.length||!Number.isFinite(result))throw Error('SYNTAX');
 return Number(result.toPrecision(12));
}
export function sanitizeWave3(saved){
 const base={
   notes:{items:[]},
   textTools:{text:''},
   calculator:{expression:'',history:[]},
   quickLinks:{items:[]},
   checklist:{items:[]}
 };
 const s=saved&&typeof saved==='object'?saved:{};
 const list=v=>Array.isArray(v)?v:[];
 const safeId=(x,i,pre)=>typeof x==='string'&&/^[a-zA-Z0-9_-]{1,80}$/.test(x)?x:pre+'-'+i;
 const unique=(rows)=>rows.filter((row,i)=>rows.findIndex(r=>r.id===row.id)===i);
 base.notes.items=unique(list(s.notes?.items).slice(0,35).map((n,i)=>({
   id:safeId(n?.id,i,'note'),title:textBound(n?.title,80,''),
   body:textBound(n?.body,4000,''),color:NOTE_COLORS.includes(n?.color)?n.color:'sun',
   updatedAt:clampNumber(n?.updatedAt,0,4102444800000,0)
 })));
 base.textTools.text=textBound(s.textTools?.text,20000);
 base.calculator.expression=textBound(s.calculator?.expression,120);
 base.calculator.history=list(s.calculator?.history).slice(0,10).map(h=>({
   expression:textBound(h?.expression,120),result:textBound(h?.result,40)
 })).filter(h=>h.expression&&h.result);
 base.quickLinks.items=unique(list(s.quickLinks?.items).slice(0,30).map((l,i)=>({
    id:safeId(l?.id,i,'link'),title:textBound(l?.title,70,''),
    url:normalizeQuickUrl(l?.url)||'',color:NOTE_COLORS.includes(l?.color)?l.color:'sky'
 })).filter(x=>x.title&&x.url));
 base.checklist.items=unique(list(s.checklist?.items).slice(0,60).map((x,i)=>({
    id:safeId(x?.id,i,'todo'),text:textBound(x?.text,160,''),done:x?.done===true
 })).filter(x=>x.text.trim()));
 return base;
}
