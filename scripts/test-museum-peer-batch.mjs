import assert from 'node:assert/strict';
import test from 'node:test';
import {handleLivePeer} from '../serverless-handlers/_museumLivePeer.js';

const roomId=i=>'00000000-0000-4000-8000-'+String(i).padStart(12,'0');
const group={id:roomId(20)};
const session={id:roomId(21),status:'active',stage_open:true,stage_index:7};
const reviews=Array.from({length:9},(_,i)=>({
 roomId:roomId(i+1),
 value:{learned:'Specific learning for display '+i,clarify:'Specific revision for display '+i,rating:3}
}));
const rooms=reviews.map((r,i)=>({id:r.roomId,owner_group_id:roomId(30+i),is_open:true}));

function fixture({roomRows=rooms,insertError=null,saved=[]}={}){
 const calls=[];
 const res={statusCode:0,body:null,setHeader(){},status(code){this.statusCode=code;return this;},
  json(body){this.body=body;return this;},end(body){this.body=JSON.parse(body);}};
 const admin={from(table){return {select(){return this;},eq(){return this;},
  async in(){return {data:table==='museum_peer_live_rooms'?roomRows:saved};},
  then(resolve){resolve({data:table==='gcp_groups'?[group,...rooms.map(r=>({id:r.owner_group_id}))]:roomRows});},
  async insert(values){calls.push(values);return {error:insertError};}};}};
 const run=(entries=reviews,live=session)=>handleLivePeer({op:'peer-room-review-batch',
  req:{method:'POST',body:{reviews:entries}},res,admin,ctx:{group,assignment:{id:roomId(22)}},session:live});
 return {run,calls,res};
}

test('nine exhibition reviews are saved in one write and attributed to the signed-in group',async()=>{
 const {run,calls,res}=fixture();
 await run(reviews.map(review=>({...review,from_group_id:roomId(99)})));
 assert.equal(calls.length,1);
 assert.equal(calls[0].length,9);
 assert.ok(calls[0].every(row=>row.from_group_id===group.id));
 assert.deepEqual(res.body,{ok:true,count:9});
});

test('a duplicate, unavailable room, invalid form or closed activity prevents the entire write',async()=>{
 const {run,calls}=fixture({roomRows:rooms.slice(0,8)});
 await assert.rejects(run(),{status:423});
 await assert.rejects(run([reviews[0],reviews[0]]),{status:400});
 await assert.rejects(fixture().run(reviews.slice(0,8)),{status:409});
 await assert.rejects(run([{...reviews[0],value:{}}]),{status:400});
 await assert.rejects(run(reviews,{...session,stage_index:10}),{status:423});
 assert.deepEqual(calls,[]);
});

test('a retry of the same batch is accepted, but a changed retry cannot overwrite existing reviews',async()=>{
 const saved=reviews.map(({roomId,value})=>({room_id:roomId,...value,target_exhibit:null}));
 const {run,res}=fixture({insertError:{code:'23505'},saved});
 await run();
 assert.deepEqual(res.body,{ok:true,alreadySubmitted:true,count:9});
 await assert.rejects(run(reviews.map(entry=>({...entry,value:{...entry.value,rating:1}}))),{status:409});
});
