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
