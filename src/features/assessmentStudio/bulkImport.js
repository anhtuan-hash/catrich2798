import { moduleFor } from './catalogue.js';
import { scoreAssessmentSubmission } from './assessmentWorkflow.js';
import { normalizeStudentCode, ensureNewStudentCodes, assertScoredResult } from './recordIntegrity.js';

/**
 * Staff-only bulk transcription of responses previously obtained in class.
 * No anonymous student submission route. Entire batch is validated first.
 *
 * Quiz columns: student_code | student_name | answers
 * Reading columns: student_code | student_name | answers | evidence(P1,P2)
 * Can paste tab-separated spreadsheet cells or literal "|" delimiters.
 */
export function prepareBulkRows(assessment,raw){
  const engine=moduleFor(assessment?.kind)?.engine;
  if(!['quiz','reading'].includes(engine))throw new Error('Nhập hàng loạt hiện chỉ hỗ trợ trắc nghiệm và ReadProof.');
  const lines=String(raw||'').split(/\r?\n/).map(x=>x.trim()).filter(Boolean);
  if(lines.length<1||lines.length>80)throw new Error('Nhập từ 1 đến 80 học sinh một lượt.');
  const seen=new Set();
  const rows=lines.map((line,i)=>{
    const delimiter=line.includes('\t')?'\t':'|';
    const parts=line.split(delimiter).map(v=>v.trim());
    const required=engine==='reading'?4:3;
    if(parts.length!==required || !parts[0] || !parts[1]){
      throw new Error('Dòng '+(i+1)+' phải có '+required+' cột: Mã HS | Họ tên | Đáp án'+(required===4?' | Dẫn chứng':'')+'.');
    }
    const code=normalizeStudentCode(parts[0]);
    if(seen.has(code))throw new Error('Mã học sinh bị trùng trong đợt nhập: '+parts[0]);
    seen.add(code);
    if(parts[1].length>160)throw new Error('Mã hoặc họ tên quá dài ở dòng '+(i+1)+'.');
    let grade;
    try{
      grade=scoreAssessmentSubmission(assessment,{answers:parts[2],evidence:engine==='reading'?parts[3]:''});
    }catch(error){throw new Error('Dòng '+(i+1)+': '+error.message);}
    assertScoredResult(grade);
    return {student_code:code,student_name:parts[1],score:grade.score,
      max_score:grade.max_score,answers:grade.answers,breakdown:grade.breakdown};
  });
  ensureNewStudentCodes(rows.map(r=>r.student_code));
  return rows;
}
