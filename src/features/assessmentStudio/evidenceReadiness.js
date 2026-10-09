/**
 * Readiness checks are transparent heuristics, not a judgment on whether
 * a teacher has earned any official competition points.
 */
export function evidenceReadiness(assessment,results=[],adjustments=[],paired=null){
  const checks=[
    {id:'identity',label:'Có lớp và mục tiêu đánh giá được khai báo',
      ok:Boolean(String(assessment?.class_label||'').trim()&&String(assessment?.objective||'').trim())},
    {id:'results',label:'Có kết quả đánh giá thực tế được lưu',
      ok:Array.isArray(results)&&results.length>0},
    {id:'action',label:'Giáo viên đã ghi biện pháp điều chỉnh có ngày và mô tả minh chứng',
      ok:adjustments.some(a=>['implemented','reviewed'].includes(a.status) &&
        Boolean(a.implementation_date && String(a.action_taken||'').trim() && String(a.evidence_note||'').trim()))},
    {id:'comparison',label:'Đã có ít nhất một kết quả trước–sau ghép theo mã học sinh',
      ok:Boolean(paired && paired.pairs>0)},
    {id:'reflection',label:'Có ghi nhận kết quả và nhận xét sau điều chỉnh',
      ok:adjustments.some(a=>a.status==='reviewed' && a.followup_assessment_id && String(a.followup_result||'').trim())},
  ];
  return {checks,completed:checks.every(x=>x.ok),
    count:checks.filter(x=>x.ok).length,total:checks.length,
    missing:checks.filter(x=>!x.ok).map(x=>x.label)};
}
