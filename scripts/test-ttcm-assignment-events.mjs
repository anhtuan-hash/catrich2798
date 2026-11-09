import assert from 'node:assert/strict';
import { isEligibleTtcmAssignment, selectTtcmAssignmentEvents } from '../src/utils/ttcmAssignmentEvents.mjs';

const owner='00000000-0000-4000-8000-000000000001';
const receiver='00000000-0000-4000-8000-000000000002';
const stranger='00000000-0000-4000-8000-000000000003';
const item={ id:'00000000-0000-4000-8000-000000000099', owner_id:owner, created_by:owner,
  assignee_ids:[owner,receiver], source_module:'ttcm', status:'assigned',
  metadata:{ ttcm:true, ttcm_action_required:true, notify_assignee:true }, title:'Soạn đề thi' };
const notification={id:111, user_id:receiver, item_id:item.id, notification_type:'work_item_assigned',
  read_at:null, created_at:'2026-11-07T08:00:00.000Z'};

assert.equal(isEligibleTtcmAssignment(notification,item,receiver),true);
assert.equal(isEligibleTtcmAssignment(notification,item,owner),false,'Owner must not get their own popup');
assert.equal(isEligibleTtcmAssignment(notification,item,stranger),false,'Unassigned accounts must not see a popup');
assert.equal(isEligibleTtcmAssignment({...notification,read_at:'2026-11-07'},item,receiver),false);
assert.equal(isEligibleTtcmAssignment(notification,{...item,source_module:'work-schedule'},receiver),false);
assert.equal(isEligibleTtcmAssignment(notification,{...item,status:'completed'},receiver),false);
assert.equal(isEligibleTtcmAssignment(notification,{...item,metadata:{...item.metadata,ttcm_action_required:false}},receiver),false);
assert.equal(isEligibleTtcmAssignment(notification,{...item,assignee_ids:[owner]},receiver),false);
assert.equal(isEligibleTtcmAssignment({...notification,notification_type:'work_item_comment'},item,receiver),false);
assert.equal(selectTtcmAssignmentEvents([notification, {...notification,id:112}],[item],receiver).length,1,'One popup per task');
assert.equal(selectTtcmAssignmentEvents([notification],[item],receiver,id=>id===111).length,0,'Previously shown event skipped');
console.log('TTCM assignment event recipient tests passed.');
