// Original, synthetic exhibition fixture. Invoked explicitly by an admin only.
// Never uses real student names, photos or protected school media.
import {createExhibition,createRoom,createExhibit} from './galleryData.js';
import {slugify,DEFAULT_TRANSFORM} from './sceneTemplates.js';
const SAMPLES=[
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
export async function seedDemoGallery(user) {
 if(user?.role!=='admin')throw new Error('Only admin can create demonstration content.');
 const doc=await createExhibition({title:'Our Planet, Our Future — Demo',slug:slugify('planet-demo-'+Date.now().toString(36)),summary:'Original, privacy-safe practice exhibits for evaluating Gallery R1.',visibility:'private'},user);
 for(let i=0;i<SAMPLES.length;i++){
  const [template,title,items]=SAMPLES[i];
  const room=await createRoom(doc.id,template,title,i,user);
  for(let k=0;k<items.length;k++){
   const [name,description,kind]=items[k];
   await createExhibit(room.id,{title:name,description,kind,model_key:kind==='model'?(k===0?'globe':'book'):null,transform:{...DEFAULT_TRANSFORM,position:[(k-(items.length-1)/2)*3,2,-7.72]}},user);
  }
 }
 return doc;
}
