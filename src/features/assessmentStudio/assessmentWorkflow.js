import { RUBRICS, SELF_STATEMENTS, moduleFor } from './catalogue.js';
import { parseQuestions, parseManualPrompts, parseReadingQuestions, gradeObjective, gradeReading, gradeManual, gradeRubric, gradeSelfRatings, safeHttpUrl } from './assessmentMath.js';

export function buildAssessmentConfig(kind, draft={}) {
  const module=moduleFor(kind);
  if(!module)throw new Error('Công cụ đánh giá không tồn tại.');
  if(module.engine==='rubric')return {criteria:RUBRICS[kind],maxPerCriterion:4};
  if(module.engine==='scale'){
    const statements=String(draft.statements||'').split(/\r?\n/).map(v=>v.trim()).filter(Boolean);
    if(!statements.length||statements.length>12)throw new Error('CanDo Check cần 1–12 phát biểu I can.');
    return {statements};
  }
  if(module.engine==='manual')return {questions:parseManualPrompts(draft.prompts)};
  if(module.engine==='reading'){
    const paragraphs=String(draft.passage||'').split(/\n\s*\n/).map(s=>s.trim()).filter(Boolean);
    if(!paragraphs.length||paragraphs.length>20)throw new Error('ReadProof cần 1–20 đoạn văn, phân cách bằng dòng trống.');
    const questions=parseReadingQuestions(draft.questions);
    const invalid=questions.find(q=>Number(q.evidence.slice(1))>paragraphs.length);
    if(invalid)throw new Error('Mã dẫn chứng phải khớp đoạn P1–P'+paragraphs.length+'.');
    return {questions,paragraphs};
  }
  if(module.engine==='quiz'){
    const questions=parseQuestions(draft.questions);
    if(kind==='exit' && questions.length>3)throw new Error('ExitTicket tối đa 3 câu.');
    if(kind==='listening' && !String(draft.audioUrl||'').trim()) throw new Error('ListenCheck cần đường dẫn audio hợp lệ.');
    return kind==='listening' ? {questions,audioUrl:safeHttpUrl(draft.audioUrl)} : {questions};
  }
  throw new Error('Công cụ đánh giá chưa hỗ trợ.');
}

export function emptyStudentInput() {
  return {answers:'',evidence:'',comment:'',studentText:'',assessor:'',
    marks:{},manualResponses:[],manualAccepted:[],selfRatings:[]};
}

export function scoreAssessmentSubmission(assessment,input={}) {
  const kind=assessment?.kind;
  const module=moduleFor(kind);
  if(!module)throw new Error('Không tìm thấy hình thức đánh giá.');
  const config=assessment.config||{};
  const note=String(input.comment||'').trim();
  const studentText=String(input.studentText||'').trim();
  const assessor=String(input.assessor||'').trim();
  if(kind==='peer'&&!assessor)throw new Error('PeerRubric cần tên hoặc mã người đánh giá.');
  if(kind==='writing'&&!studentText)throw new Error('Writing Assessment cần nhập nội dung bài viết học sinh.');
  if(kind==='project'&&!studentText)throw new Error('ProjectMark cần ghi tên/mô tả sản phẩm được đánh giá.');
  if(module.engine==='rubric'){
    const grade=gradeRubric(kind,input.marks||{});
    return {score:grade.score,max_score:grade.maxScore,
      answers:grade.criteria,breakdown:{criteria:grade.criteria,note,studentText,assessor}};
  }
  if(module.engine==='scale'){
    const marks=(config.statements||[]).map((_,i)=>input.selfRatings?.[i]);
    const grade=gradeSelfRatings(config.statements||[],marks);
    return {score:grade.score,max_score:grade.maxScore,
      answers:marks,breakdown:{criteria:grade.criteria,assessmentType:'self_report',note}};
  }
  if(module.engine==='manual'){
    const responses=(config.questions||[]).map((_,i)=>input.manualResponses?.[i]||'');
    const decisions=(config.questions||[]).map((_,i)=>input.manualAccepted?.[i]);
    const grade=gradeManual(config.questions||[],responses,decisions);
    return {score:grade.score,max_score:grade.maxScore,answers:grade.answers,
      breakdown:{topics:grade.topics,detail:grade.detail,note,assessmentType:'teacher_marked'}};
  }
  if(module.engine==='reading'){
    const grade=gradeReading(config.questions||[],input.answers||'',input.evidence||'');
    return {score:grade.score,max_score:grade.maxScore,answers:grade.answers,
      breakdown:{topics:grade.topics,detail:grade.detail,note,assessmentType:'answer_and_evidence'}};
  }
  if(module.engine==='quiz'){
    const grade=gradeObjective(config.questions||[],input.answers||'');
    return {score:grade.score,max_score:grade.maxScore,answers:grade.answers,
      breakdown:{topics:grade.topics,detail:grade.detail,note}};
  }
  throw new Error('Hình thức đánh giá chưa hỗ trợ.');
}

export function startingDraft() {
  return {kind:'diagnostic',title:'',classLabel:'',objective:'',questions:'',
    prompts:'',passage:'',audioUrl:'',statements:SELF_STATEMENTS.join('\n')};
}
