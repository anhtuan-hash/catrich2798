import {drawMuseumArtwork} from './museumIllustrationCanvas.js';
// Original teacher-authored environmental English project collection.
// This catalog is NOT a student submission/grade/audit event. Never write it to
// live reviews, rubric scores, student identities, participation or statistics.
const definitions=[
 {key:'marine-12',scope:'12.1',title:'Protecting Marine Life',palette:['#07597b','#20a9a0','#e3f4ef'],items:[
 ['Ocean Guardians','Single-use Plastic','Disposable packaging can travel from streets to waterways and marine habitats.','Examine documented pathways of litter and impacts on wildlife.','UNEP: From Pollution to Solution','Offer school refill points and reusable bottles.','How can a visitor trace litter from land to sea?','Add a labelled pathway map.'],
 ['Blue Turtle Team','Sea Turtle Safety','Sea turtles can ingest floating plastic or become entangled in marine debris.','Compare ingestion and entanglement explanations from marine science resources.','NOAA Marine Debris Program','Promote safe plastic disposal and fishing-line collection by authorized adults.','What can students do far from the coast?','Include classroom waste actions.'],
 ['Coral Keepers','Coral Reef Futures','Reefs face pressures from ocean warming and pollution.','Explain coral bleaching and heat stress without inventing loss statistics.','NOAA Coral Reef Conservation Program','Present a reef care guide with practical climate and waste actions.','What exactly is coral bleaching?','Add a clear science diagram.'],
 ['SeaSmart Engineers','Ghost Fishing Gear','Lost fishing gear can continue to entangle sea creatures.','Explore examples of abandoned nets, ropes and fishing lines.','Global Ghost Gear Initiative','Propose a safe collection-point poster and community partnership.','Who safely handles discarded gear?','Specify trained adults and partners.'],
 ['Coastline Voices','Clean Shores Together','Beach litter is connected to everyday choices and waste systems.','Classify litter types described in published cleanup reports; do not invent a survey.','Ocean Conservancy: International Coastal Cleanup','Write a bilingual cleanup pledge with practical actions.','Can people keep these promises?','Use small, measurable commitments.'],
 ['Marine Food Web','A Connected Ocean','Changes to one marine habitat can affect many linked species.','Explain producers, consumers and energy flow in a marine food web.','NOAA Ocean Service','Build a labelled food-web exhibit and habitat-care message.','Do arrows show energy flow?','Revise the diagram legend.']
 ]},
 {key:'school-11',scope:'11.4',title:'Sustainable School',palette:['#176348','#9ac56c','#f7e7ac'],items:[
 ['Green Campus','Less Waste at Lunch','Single-use food packaging can increase school waste.','Compare reusable and disposable choices without invented local waste totals.','UNEP: Beat Plastic Pollution','Propose refill and reusable-lunchbox spaces.','Would this work during short breaks?','Add a practical location plan.'],
 ['Bright Minds','Save Classroom Energy','Lights, fans and digital devices need responsible use.','Use an energy checklist without claiming measured savings.','IEA Energy Efficiency resources','Create a three-step end-of-lesson power checklist.','Will students remember it?','Assign a rotating classroom role.'],
 ['Water Wise','Every Drop Counts','Leaks and wasteful habits increase water demand.','Discuss responsible water use without fabricated meter readings.','UN-Water: Water and Sanitation','Design tap reminders and a maintenance-report process.','Who repairs a leaking tap?','Assign repair tasks to authorized adults.'],
 ['Living Garden','A Garden for Biodiversity','A school garden can support observation of local plants and insects.','Separate proposed outcomes from observations yet to be collected.','UNESCO: Education for Sustainable Development','Plan native planting and English species signs.','Who waters plants during holidays?','Add a realistic care schedule.'],
 ['Paper Savers','Print Smart','Unnecessary printing uses paper and other resources.','Compare screen-based handouts with situations needing print access.','UNESCO: Greening Education','Offer digital-first worksheets with an accessible printed option.','What if a learner has no device?','Provide shared display and print fallback.'],
 ['Eco Commute','A Safer School Journey','Travel decisions influence traffic, air quality and safety.','Compare travel modes while recognizing distance and road conditions.','WHO: Active Mobility','Prepare a safety-first commuting decision guide.','Can everyone cycle safely?','Include family and accessibility options.']
 ]},
 {key:'marine-11',scope:'11.3',title:'Protecting Marine Life',palette:['#126988','#75c5d2','#f9deaa'],items:[
 ['Plastic-Free Crew','Rethink the Straw','Unneeded disposable items can contribute to litter.','Explain why source reduction matters, not only material substitution.','UNEP: Turning off the Tap','Create a polite refuse-a-straw ordering card.','What about accessibility needs?','Keep flexible personal choice.'],
 ['Dolphin Defenders','Sound Under the Sea','Human activity can change marine acoustic environments.','Describe dolphin communication and possible noise interference.','NOAA Fisheries: Ocean Noise','Create an explanatory soundscape graphic.','Is audio illustrative or recorded?','Clearly label created sound examples.'],
 ['Reef Rangers','The Reef in Colour','Coral reefs shelter diverse marine species.','Describe reef fish and habitat pressures without invented measurements.','NOAA Coral Reef Conservation Program','Tell a three-panel reef protection story.','Do illustrations prove reef health?','Explain limits of graphic colors.'],
 ['Wave Makers','From Street to Sea','Wind and rain can move litter into storm drains and waterways.','Trace an illustrative journey without claiming to map a real local drain.','UNEP: Marine Litter resources','Draw a numbered litter pathway and prevention steps.','Can anyone follow the pathway?','Add a visible legend and arrows.'],
 ['Sea Grass Circle','Blue Carbon Habitats','Seagrass meadows provide habitat and store carbon.','Distinguish flowering seagrass from marine algae.','UNEP: Seagrass — The Forgotten Ecosystems','Create a labelled habitat guide and conservation message.','How is seagrass unlike seaweed?','Add a simple plant comparison.'],
 ['Ocean Storytellers','A Letter to the Ocean','Environmental storytelling works best when grounded in sound facts.','Pair emotional messages with verifiable ocean-conservation principles.','United Nations: SDG 14','Write a friendly open letter with three achievable actions.','Is the letter inclusive and hopeful?','Replace guilt with shared responsibility.']
 ]}
];
const cache=new Map();
// Lazy media creation: illustrated canvases are drawn when the user enters a
// collection and are cached for room changes. No external URLs or image calls.
// Pre-rendered poster assets are uploaded to the repository and served directly.
// No browser-side drawing or external image generation is needed for this curated room.
const finishedPosterAssets=Object.freeze({
 'school-11:0:0':'/museum/artwork/green-campus-01-problem.avif',
 'school-11:0:1':'/museum/artwork/green-campus-02-evidence.avif',
 'school-11:0:2':'/museum/artwork/green-campus-03-solution.avif'
});
function poster(def,p,part,idx){
 const finished=finishedPosterAssets[def.key+':'+idx+':'+part];
 if(finished)return finished;
 if(typeof document==='undefined')return '';
 const key=def.key+'-'+idx+'-'+part;
 if(cache.has(key))return cache.get(key);
 const canvas=document.createElement('canvas');
 canvas.width=1024;canvas.height=768;
 const ctx=canvas.getContext('2d');
 if(!ctx)return '';
 try{
  drawMuseumArtwork(ctx,def,p,part,idx);
  const url=canvas.toDataURL('image/png');
  if(!url.startsWith('data:image/png;base64,'))return '';
  cache.set(key,url);
  return url;
 }catch(error){
  // A failed canvas should not turn the rest of the visitor experience blank.
  if(typeof console!=='undefined')console.warn('[Museum illustrations] Could not prepare poster',def.key,idx,part,error);
  return '';
 }
}
export const PREPARED_COLLECTIONS=Object.freeze(definitions.map(def=>Object.freeze({
 key:def.key,title:def.title,classScope:def.scope,
 groupCount:def.items.length,
 // Source provenance: never insert into live learning evidence tables.
 origin:'teacher_authored_content',
 projects:Object.freeze(def.items.map((p,i)=>Object.freeze({
  id:def.key+'-'+i,label:'Nhóm '+(i+1)+' · '+p[0],title:p[1],
  issue:p[2],evidence:p[3],source:p[4],solution:p[5],
  reviewQuestion:p[6],revisionGuide:p[7]
 })))
})));
export function preparedCollectionFor(assignment){
 if(!assignment)return null;
 const scope=String(assignment.class_scope||'').trim();
 const title=String(assignment.title||'').trim().toLowerCase().replace(/\s+/g,' ');
 return PREPARED_COLLECTIONS.find(x=>x.classScope===scope&&x.title.toLowerCase()===title)||null;
}
export function preparedGallery(key,groupIndex=null){
 const def=definitions.find(x=>x.key===key);if(!def)return null;
 const indexes=groupIndex===null?def.items.map((_,i)=>i):
  Number.isInteger(groupIndex)&&groupIndex>=0&&groupIndex<def.items.length?[groupIndex]:[];
 const rooms=indexes.map(idx=>{
  const p=def.items[idx],roomId=def.key+'-room-'+idx;
  const sections=[
   ['The Problem',p[2]],
   ['The Evidence',p[3]+'\n\nSource for further reading: '+p[4]],
   ['Our Solution',p[5]+'\n\nPeer-review prompt: '+p[6]+'\n\nRevision guide: '+p[7]]
  ];
  return {id:roomId,exhibition_id:'collection-'+key,sort_order:idx,
   title:'Nhóm '+(idx+1)+' · '+p[0],
   template_key:['classic','culture','lab'][idx%3],
   exhibits:sections.map(([heading,body],part)=>{
    const url=poster(def,p,part,idx);
    return {id:roomId+'-item-'+part,room_id:roomId,
     title:heading+' · '+p[1],description:body,kind:url?'image':'text',
     image_url:url||undefined,alt_text:heading+' — '+p[1],status:'published',
     asset_id:null,model_key:null,transform:{position:[(part-1)*3,2,-7.72],
      rotation:[0,0,0],scale:[1,1,1]}};
   })}
 });
 return {id:'collection-'+key+(groupIndex===null?'':'-group-'+groupIndex),
  slug:'collection-'+key,title:def.title+' · '+def.scope,
  summary:'English STEAM · '+def.items.length+' groups · '+rooms.length+' rooms',
  origin:'teacher_authored_content',status:'private',visibility:'private',
  accept_submissions:false,rooms};
}
