/**
 * Brian Event Posters — deterministic template selection, free of AI calls.
 * Admin-provided templates are image BACKGROUNDS with free space for text.
 */
export const POSTER_GROUPS = Object.freeze([
  { id:'halloween', label:'Halloween / Lễ hội', categories:['Sinh hoạt chuyên đề','Ngoại khóa'], words:['halloween','hoa trang','trick or treat'] },
  { id:'meeting', label:'Họp chuyên môn', categories:['Họp tổ chuyên môn'], words:['hop','hoi nghi','btc','ttcm','tt tpcm'] },
  { id:'teaching', label:'Thao giảng', categories:['Thao giảng'], words:['thao giang','du gio','hoi giang','minh hoa'] },
  { id:'seminar', label:'Chuyên đề', categories:['Sinh hoạt chuyên đề'], words:['chuyen de','sinh hoat chuyen de'] },
  { id:'training', label:'Tập huấn', categories:['Hội thảo / tập huấn'], words:['tap huan','boi duong','workshop','training'] },
  { id:'extracurricular', label:'Ngoại khóa', categories:['Ngoại khóa'], words:['ngoai khoa','cuoc thi','team building'] },
  { id:'general', label:'Thông báo chung', categories:['Thông báo chung','Khác'], words:[] },
]);

const norm=(s)=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[đĐ]/g,'d').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
const hasWord=(text,term)=>(' '+text+' ').includes(' '+norm(term)+' ');
const escapeSlug=(s)=>norm(s).replace(/\s+/g,'-').slice(0,42)||'mau';
const builtins=[
 ['halloween','Midnight Halloween','dark','left'],
 ['meeting','Midnight Slate','light','left'],
 ['teaching','Classroom Canvas','dark','right'],
 ['seminar','Ivory Academic','light','left'],
 ['training','Ocean Workshop','dark','left'],
 ['extracurricular','Vibrant Campus','dark','right'],
 ['general','Brian Executive','light','left'],
];
export const BUILTIN_POSTER_TEMPLATES=Object.freeze(builtins.map(([group,name,tone,side])=>Object.freeze({
  id:'preset-'+group,group,name,tone,side,source:'builtin',path:'',
})));

export function isAllowedPosterGroup(group){return POSTER_GROUPS.some(x=>x.id===group)}
export function posterTemplatePath({name,group,tone='dark',side='left',stamp='20261026',extension='png'}) {
  if(!isAllowedPosterGroup(group)) throw new Error('Invalid poster category');
  if(!['dark','light'].includes(tone)||!['left','right','center'].includes(side)) throw new Error('Invalid template layout');
  const stampSafe=String(stamp).replace(/[^0-9a-z]/gi,'').slice(0,24);
  if(!stampSafe)throw new Error('Invalid template ID');
  if(!['png','jpg','webp'].includes(extension)) throw new Error('Unsupported template file type');
  return 'templates/'+group+'/'+escapeSlug(name)+'--'+tone+'--'+side+'--'+stampSafe+'.'+extension;
}
export function decodePosterTemplatePath(path) {
  const match=/^templates\/(halloween|meeting|teaching|seminar|training|extracurricular|general)\/([a-z0-9-]+)--(dark|light)--(left|right|center)--([a-z0-9]+)\.(png|jpe?g|webp)$/.exec(String(path||''));
  if(!match)return null;
  const [,group,name,tone,side,,ext]=match;
  return {id:path,name:name.replace(/-/g,' '),group,tone,side,source:'uploaded',path,extension:ext};
}
function scoreTemplate(template,event={}) {
  const title=norm(event.title);
  const category=norm(event.category);
  const group=POSTER_GROUPS.find(x=>x.id===template.group);
  if(!group)return -1;
  let score=template.group==='general'?2:0;
  if(group.categories.some(x=>norm(x)===category))score+=50;
  if(group.words.some(term=>hasWord(title,term))) score+=85;
  if(template.group==='halloween'&&hasWord(title,'halloween'))score+=70;
  if(template.source==='uploaded')score+=12;
  return score;
}
/** Tie break is stable by id; user artwork outranks generic built-ins for matching groups. */
export function choosePosterTemplate(event,templates=BUILTIN_POSTER_TEMPLATES,preferredId='') {
  const candidates=[...templates].filter(x=>x&&isAllowedPosterGroup(x.group));
  if(preferredId){const forced=candidates.find(x=>x.id===preferredId);if(forced)return forced}
  if(!candidates.length)return null;
  return candidates.sort((a,b)=>scoreTemplate(b,event)-scoreTemplate(a,event) || String(a.id).localeCompare(String(b.id)))[0];
}
