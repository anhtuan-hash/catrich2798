// Pure, deterministic accounting. One attendance source session ID = one contribution,
// even if assigned report rows overlap. Rates are weighted by actual student visits.
export function schoolYearStartYear(now=new Date()) {
  return now.getMonth()>=7 ? now.getFullYear() : now.getFullYear()-1;
}
export function schoolYearMonths(startYear) {
  return Array.from({length:12},(_,i)=>{
    const month=((i+7)%12)+1;
    const year=startYear+(i>=5?1:0);
    return String(year)+'-'+String(month).padStart(2,'0');
  });
}
const validNumber=value=>Number.isFinite(Number(value))?Number(value):0;
const uniqueBy=(items,key)=>Array.from(new Map((items||[]).filter(Boolean).map(x=>[key(x),x])).values());
const safeReports=items=>(items||[]).filter(item=>item?.id&&item?.teacherId);
const safeSessions=items=>uniqueBy(items,item=>item.id).filter(item=>item?.id&&item?.teacherId);
const sums=rows=>rows.reduce((sum,row)=>({
  sessions:sum.sessions+1,
  periods:sum.periods+validNumber(row.periods),
  expected:sum.expected+validNumber(row.expected),
  present:sum.present+validNumber(row.present),
  absent:sum.absent+validNumber(row.absent),
  late:sum.late+validNumber(row.late),
}),{sessions:0,periods:0,expected:0,present:0,absent:0,late:0});
export function summarizeLearningReports(reports=[],sessions=[]) {
  const rows=safeReports(reports);
  const sessionsUnique=safeSessions(sessions);
  const submitted=rows.filter(r=>['submitted','revision','approved'].includes(r.status)).length;
  const approved=rows.filter(r=>r.status==='approved').length;
  const revision=rows.filter(r=>r.status==='revision').length;
  const draft=rows.filter(r=>r.status==='draft').length;
  const attendance=sums(sessionsUnique);
  const uniqueClassIds=new Set(sessionsUnique.map(s=>s.classId).filter(Boolean));
  const recommendations=rows.filter(r=>r.hasRecommendation).length;
  const assessments=rows.reduce((n,r)=>n+validNumber(r.assessmentCount),0);
  const improved=rows.reduce((n,r)=>n+validNumber(r.improvedCount),0);
  const goals=rows.reduce((n,r)=>n+validNumber(r.goalMetCount),0);
  return {
    assigned:rows.length,teachers:new Set(rows.map(r=>r.teacherId)).size,
    submitted,approved,revision,draft,missing:rows.filter(r=>!['submitted','revision','approved'].includes(r.status)).length,
    submissionPct:rows.length ? Math.round(100*submitted/rows.length):null,
    approvalPct:rows.length ? Math.round(100*approved/rows.length):null,
    recommendations,assessments,improved,goals,
    achievements:rows.filter(r=>r.hasAchievement).length,
    classes:uniqueClassIds.size,...attendance,
    attendancePct:attendance.expected>0 ? Math.round(1000*attendance.present/attendance.expected)/10:null,
  };
}
export function buildLearningYearDashboard(raw,startYear) {
  const validMonths=schoolYearMonths(startYear);
  const reports=safeReports(raw?.reports).filter(r=>validMonths.includes(r.period));
  const sessions=safeSessions(raw?.sessions).filter(r=>validMonths.includes(r.period));
  const deadlines=(raw?.deadlines||[]).filter(d=>validMonths.includes(d.period));
  const overrides=new Map(deadlines.map(d=>[d.period,d]));
  const months=validMonths.map(period=>{
    const items=reports.filter(r=>r.period===period);
    const source=sessions.filter(s=>s.period===period);
    const override=overrides.get(period);
    const dueDates=[...new Set(items.map(r=>r.dueAt).filter(Boolean))];
    return {
      period,reports:items,sessions:source,summary:summarizeLearningReports(items,source),
      deadline:override
        ? {value:override.cleared?null:override.dueAt,cleared:Boolean(override.cleared),overridden:true}
        : {value:dueDates.length===1?dueDates[0]:null,cleared:false,overridden:false,multiple:dueDates.length>1},
    };
  });
  return {startYear,months,reports,sessions,summary:summarizeLearningReports(reports,sessions),
    teachers:uniqueBy(reports,r=>r.teacherId).map(r=>{
      const personalReports=reports.filter(x=>x.teacherId===r.teacherId);
      const personalSessions=sessions.filter(x=>x.teacherId===r.teacherId);
      return {teacherId:r.teacherId,reports:personalReports,sessions:personalSessions,
        summary:summarizeLearningReports(personalReports,personalSessions)};
    }).sort((a,b)=>b.summary.sessions-a.summary.sessions||a.teacherId.localeCompare(b.teacherId)),
  };
}
