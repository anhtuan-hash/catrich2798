/**
 * BRIAN Evidence Portfolio.
 * Imports locally exported assessment JSON backups and revalidates them against
 * their deterministic rubrics/answer keys. No AI, network or browser storage.
 * Source student names and answers are intentionally not returned in summaries.
 */
import {verifyBackup,checklist,pairedComparison,stats} from './speakingCore.js';
import {verifyDiagnosticBackup,diagnosticReadiness,pairedDiagnostic,scorePhase} from './diagnosticCore.js';
import {loadExitBackup,exitReadiness,pairExit,groupExit} from './exitTicketCore.js';
import {restoreTwoTierBackup,twoTierReadiness,pairedTwoTier,summarizeTwoTier} from './twoTierCore.js';
export const PORTFOLIO_TYPES=Object.freeze({
 BRIAN_SPEAKSCALE_BACKUP:{id:'speaking',name:'SpeakScale – Speaking Rubric'},
 BRIAN_DIAGNOSTICSCAN_BACKUP:{id:'diagnostic',name:'DiagnosticScan – Chẩn đoán'},
 BRIAN_EXIT_TICKET:{id:'exit',name:'ExitTicket – Cuối tiết'},
 BRIAN_TWO_TIER_V1:{id:'two-tier',name:'Two-Tier – Đánh giá hai tầng'},
});
function trim(value,max=300){return String(value??'').trim().slice(0,max);}
function summaryStats(pre,post,paired){
 return {preCount:pre.count,postCount:post.count,pairedCount:paired.count||0,
   preAverage:pre.average??null,postAverage:post.average??null,
   delta:paired.averageDelta??paired.delta??paired.change??null};
}
function hashString(s){let h=2166136261;for(let i=0;i<s.length;i++)h=Math.imul(h^s.charCodeAt(i),16777619);return (h>>>0).toString(36)}
export function validatePortfolioFile(data){
 const type=PORTFOLIO_TYPES[data?.format];
 if(!type)throw new Error('Không nhận dạng được sao lưu từ bốn công cụ BRIAN đã hỗ trợ.');
 let clean,ready,stat,adjustment;
 if(type.id==='speaking'){
  clean=verifyBackup(data);
  ready=checklist({...clean});
  const pre=stats(clean.records,'pre'),post=stats(clean.records,'post');
  const paired=pairedComparison(clean.records);
  stat={preCount:pre.count,postCount:post.count,pairedCount:paired.count,
   preAverage:pre.average==null?null:pre.average*5,
   postAverage:post.average==null?null:post.average*5,
   delta:paired.delta==null?null:paired.delta*5};
  adjustment={finding:clean.intervention.finding,action:clean.intervention.action,
   date:clean.intervention.date,evidence:clean.intervention.evidence,reflection:clean.intervention.reflection};
 }else if(type.id==='diagnostic'){
  clean=verifyDiagnosticBackup(data);
  ready=diagnosticReadiness({...clean});
  const pre=scorePhase(clean.records,'pre'),post=scorePhase(clean.records,'post');
  stat=summaryStats(pre,post,pairedDiagnostic(clean.records));
  adjustment={finding:clean.adjustment.finding,action:clean.adjustment.action,
   date:clean.adjustment.date,evidence:clean.adjustment.evidence,reflection:clean.adjustment.reflection};
 }else if(type.id==='exit'){
  clean=loadExitBackup(data);
  ready=exitReadiness({...clean});
  const pre=groupExit(clean.records,'initial'),post=groupExit(clean.records,'followup');
  stat=summaryStats(pre,post,pairExit(clean.records));
  adjustment={finding:clean.adjustment.weakness,action:clean.adjustment.action,
   date:clean.adjustment.implementedDate,evidence:clean.adjustment.evidence,reflection:clean.adjustment.followupReflection};
 }else{
  clean=restoreTwoTierBackup(data);
  ready=twoTierReadiness({...clean});
  const pre=summarizeTwoTier(clean.records,'pre'),post=summarizeTwoTier(clean.records,'post');
  stat=summaryStats(pre,post,pairedTwoTier(clean.records));
  adjustment={finding:clean.adjustment.finding,action:clean.adjustment.action,
   date:clean.adjustment.implementedDate,evidence:clean.adjustment.evidence,reflection:clean.adjustment.reflection};
 }
 const title=trim(clean.meta.title||clean.meta.task||clean.meta.lesson||clean.meta.objective||type.name);
 const className=trim(clean.meta.className,100),teacher=trim(clean.meta.teacher,150);
 const when=trim(clean.meta.date,40);
 const checks=(ready.items||ready.checks||[]).map(x=>({label:trim(x.label),ok:Boolean(x.ok)}));
 const readyCount=checks.filter(x=>x.ok).length;
 return {
   id:type.id+'-'+hashString(JSON.stringify(data)),type:type.id,name:type.name,
   title,className,teacher,date:when,
   demo:Boolean(clean.demo),complete:Boolean(ready.complete),checks,
   readyCount,readyTotal:checks.length,
   ...stat,
   adjustment:Object.fromEntries(Object.entries(adjustment).map(([k,v])=>[k,trim(v,1000)])),
   // Do NOT hold onto individual marks, names, roster, question wording, answers.
 };
}
export function portfolioReadiness(items,meta={}){
 const safe=(items||[]).filter(x=>x&&!x.demo&&x.complete&&x.preCount>0&&x.pairedCount>0);
 const types=[...new Set(safe.map(x=>x.type))];
 const hasInterventions=safe.filter(x=>x.adjustment?.action&&x.adjustment?.date&&x.adjustment?.evidence);
 const teacher=trim(meta.teacher,150),term=trim(meta.term,30),year=trim(meta.year,30);
 const checks=[
  {label:'Có ít nhất 02 loại công cụ đánh giá khác nhau, kèm dữ liệu có thể đối chiếu',ok:types.length>=2},
  {label:'Các công cụ được dùng với kết quả học sinh và lượt đánh giá lại',ok:safe.length>=2},
  {label:'Có minh chứng sử dụng kết quả đánh giá để điều chỉnh dạy học',ok:hasInterventions.length>=2},
  {label:'Khai báo thông tin giáo viên, học kỳ và năm học',ok:Boolean(teacher&&term&&year)},
  {label:'Không sử dụng dữ liệu DEMO để tính hồ sơ',ok:items.length>0&&!items.some(x=>x.demo)},
 ];
 return {checks,complete:checks.every(x=>x.ok),
   eligibleCount:safe.length,distinctTypes:types.length,hasInterventions:hasInterventions.length,
   qualified:safe};
}
