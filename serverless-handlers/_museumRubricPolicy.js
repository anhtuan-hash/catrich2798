// Grading is an assessment record, independent of publication status.
// Only a school-authorized Admin may call the rubric API. Publishing must
// never discard or freeze the separate teacher rubric record.
export const GRADEABLE_REVIEW_STATES=Object.freeze([
 'submitted','ttcm_review','approved_locked','published'
]);
export function canGradeReviewState(state){
 return GRADEABLE_REVIEW_STATES.includes(String(state||''));
}
