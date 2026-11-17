import {SNAPSHOT_FORMAT} from '../../src/features/immersive-gallery/v3/offline/snapshot.js';
export function fixture(){
 const image='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a6xkAAAAASUVORK5CYII=';
 const assignment={id:'qa-lesson',created_by:'qa-teacher',title:'Synthetic Offline QA Museum',class_scope:'QA ONLY',content_frozen_at:'2026-11-14T00:00:00Z'};
 const group={id:'qa-group',assignment_id:assignment.id,label:'QA Group',state:'submitted'};
 const gallery={id:'qa-gallery',slug:'qa-gallery',title:'Synthetic QA exhibition',status:'published',visibility:'school',owner_id:'qa-teacher',rooms:[{id:'qa-room',title:'QA room',template_key:'classic',exhibits:[{id:'qa-art',asset_id:'qa-image',title:'Synthetic QA artwork',kind:'image',description:'Synthetic browser test fixture; never classroom evidence.',image_url:image,status:'published'}]}]};
 return {format:SNAPSHOT_FORMAT,startedAt:'2026-11-14T00:00:00Z',completedAt:'2026-11-14T00:00:01Z',source:'SYNTHETIC QA ONLY',warnings:[],media:[],
 staff:{profile:{id:'qa-teacher',role:'admin'},creatorSettings:{enabled:false},assignments:[assignment],groups:[group],reviews:[{id:'qa-review',group_id:group.id,state:'submitted',version:1,snapshot:gallery}],rubrics:[],exitTickets:[],publishedGalleries:[gallery]},
 showcase:{hiddenCollections:[],archivedGalleries:[],galleryEnabled:true,publishedGalleries:[gallery]},galleries:[gallery],
 artworks:{'qa-group':[{id:'qa-image',image_url:image}]},groupDrafts:{'qa-group':{groupLabel:group.label,draft:gallery,version:1,artworks:[{id:'qa-image',image_url:image}]}},
 live:{'qa-lesson':{session:{id:'qa-session',stageIndex:0,questionVersion:2},groups:[group]}},
 evidence:{'qa-lesson':{assignment,session:{id:'qa-session'},groups:[group],responses:[{group_id:group.id,stage_index:0,value:{answer:'QA recorded response'},created_at:'2026-11-14T00:00:00Z'}],feedback:[],microResponses:[],teacherMediaBoard:{},presentationProvenance:{teacher_visible_note:'SYNTHETIC QA ONLY'}}},comparisons:{}};
}

export function aseanFixture(){
 const f=fixture(),assignment={...f.staff.assignments[0],title:'ASEAN in Three Frames',lesson_template:'asean-in-three-frames'};
 const groups=[{...f.staff.groups[0],label:'Nhóm 01'},
  ...[2,3].map(n=>({id:'qa-group-'+n,assignment_id:assignment.id,label:'Nhóm 0'+n,state:'submitted'}))];
 const [first,second,third]=groups;
 const market={group_id:first.id,stage_index:0,value:{experience:'Visitors can explore the QA market.',advice:'Visitors should stay on the marked path.'}};
 const transfer={group_id:first.id,stage_index:5,value:{experience:'Visitors can see the QA temple.',advice:'Visitors should leave the entrance clear.'}};
 const retest={group_id:second.id,stage_index:4,value:{question:1,answer:'The QA footpath is marked.',frame:1,score:1}};
 const comments={group_id:third.id,stage_index:3,value:{first:1,comment:'Explain how to reach the QA footpath.',
  answers:[1,2,3].map(frame=>({text:'QA visitor evidence '+frame,frame,score:1}))}};
 const unrelated={group_id:second.id,stage_index:0,value:{experience:'OTHER GROUP QA ANSWER',advice:'Visitors should follow directions.'}};
 const before={id:'qa-before',group_id:first.id,kind:'before',version:1,doc:{learning:{issue:'QA first caption.'}}};
 const after={id:'qa-after',group_id:first.id,kind:'after',version:2,doc:{learning:{issue:'QA revised caption.'},revisionReason:'Clarified the QA footpath.',retestQuestion:1}};
 f.staff={...f.staff,assignments:[assignment],groups,aseanWritingScores:[{group_id:first.id,stage_index:0,details:{experience:1,advice:1}}]};
 f.galleries[0]={...f.galleries[0],lesson_template:assignment.lesson_template,assignment_id:assignment.id};
 f.staff.publishedGalleries=f.showcase.publishedGalleries=f.galleries;
 f.live[assignment.id]={session:{id:'qa-session',stageIndex:0,status:'ended',lessonTemplate:assignment.lesson_template},groups};
 f.evidence[assignment.id]={...f.evidence[assignment.id],assignment,groups,
  responses:[market,transfer,retest,comments,unrelated],checkpoints:[before,after],
  hueQuizResults:[{group_id:first.id,details:{answers:[0,1,2],score:2,expected:[0,1,0],feedback:['QA quiz feedback']}}]};
 return f;
}
