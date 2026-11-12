// Original synthetic educational sample, isolated from Supabase/auth dependencies.
// No real students, school records, remote media or network calls.
const items=[
 ['classic','Student Creations',[
  ['Our Planet, Our Future','Climate change affects people and ecosystems around the world. Students can use English to explain how everyday choices influence our shared future.','text'],
  ['A City Powered by Sunshine','Imagine a city where rooftops collect solar energy and public spaces invite people to walk and cycle. Describe the design in English.','text'],
  ['One Minute for Nature','Record a short environmental pledge, or write one if recording is unavailable. Explain one feasible action and the reason it matters.','text']
 ]],
 ['culture','Explore the World',[
  ['Greetings Across Cultures','A greeting can be a word, a gesture, or a shared custom. Compare polite greetings in different contexts using clear English.','text'],
  ['A Festival of Light','Describe the atmosphere, symbols, and shared values of a cultural festival. Respect local perspectives and avoid stereotypes.','text'],
  ['Stories We Share','A short museum label can tell visitors where an object is used, how it is made, and why people value it.','text']
 ]],
 ['lab','Interactive Lab',[
  ['Our Blue Planet','Rotate the curated geometric globe and consider: what connects distant communities across oceans?','model'],
  ['The Book of New Words','Inspect a small 3D book shape and describe how one English word changes meaning across contexts.','model']
 ]]
];
export function buildMuseumDemo(){
 const rooms=items.map(([key,title,entries],i)=>({
  id:'demo-room-'+i,exhibition_id:'demo-museum',template_key:key,title,sort_order:i,
  exhibits:entries.map(([name,description,kind],j)=>({
   id:'demo-item-'+i+'-'+j,room_id:'demo-room-'+i,title:name,description,kind,
   model_key:kind==='model'?(j===0?'globe':'book'):null,asset_id:null,status:'published',
   transform:{position:[(j-(entries.length-1)/2)*3,2,-7.72],rotation:[0,0,0],scale:[1,1,1]}
  }))
 }));
 return {id:'demo-museum',slug:'demo-museum',title:'Our Planet, Our Future — 3D Demo',
  summary:'A fictional exhibition with eight original practice exhibits. No real student data.',
  status:'published',visibility:'private',accept_submissions:false,rooms};
}
export const DEMO_GALLERY=buildMuseumDemo();
