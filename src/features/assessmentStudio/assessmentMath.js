// Deterministic grading only: no remote services or generative systems.
import { LETTERS, RUBRICS } from './catalogue.js';
export { LETTERS, MODULES } from './catalogue.js';
export const SPEAKING_CRITERIA = RUBRICS.speaking;

export function parseQuestions(raw) {
  const lines = String(raw || '').split(/\r?\n/).map(x => x.trim()).filter(Boolean);
  if (!lines.length) throw new Error('Hãy nhập ít nhất một câu theo mẫu: Nội dung | A | B | C | D | Đáp án | Chủ điểm');
  if (lines.length > 50) throw new Error('Mỗi bài hỗ trợ tối đa 50 câu.');
  return lines.map((line, index) => {
    const parts = line.split('|').map(x => x.trim());
    if (parts.length !== 7 || !LETTERS.includes(parts[5].toUpperCase()) || parts.slice(0,5).some(x => !x)) {
      throw new Error('Dòng ' + (index + 1) + ' chưa đúng định dạng 7 cột hoặc đáp án A–D.');
    }
    return { stem: parts[0], options: parts.slice(1,5), correct: parts[5].toUpperCase(), topic: parts[6] || 'Chưa phân loại' };
  });
}

export function gradeObjective(questions, rawAnswers) {
  const answers = String(rawAnswers || '').toUpperCase().replace(/[\s,;|]+/g, '').split('');
  if (answers.length !== questions.length || answers.some(answer => !LETTERS.includes(answer))) {
    throw new Error('Cần nhập chính xác ' + questions.length + ' đáp án A–D, ví dụ: ABCD.');
  }
  const topics = {};
  let score = 0;
  const detail = questions.map((question, index) => {
    const correct = answers[index] === question.correct;
    if (correct) score += 1;
    const topic = question.topic || 'Chưa phân loại';
    if (!topics[topic]) topics[topic] = { achieved: 0, total: 0 };
    topics[topic].total += 1;
    if (correct) topics[topic].achieved += 1;
    return { number: index + 1, selected: answers[index], correctAnswer: question.correct, correct, topic };
  });
  return { score, maxScore: questions.length, answers, detail, topics };
}

export function gradeSpeaking(rawMarks) {
  const marks = SPEAKING_CRITERIA.map(key => Number(rawMarks?.[key]));
  if (marks.some(value => !Number.isInteger(value) || value < 0 || value > 4)) {
    throw new Error('Mỗi tiêu chí Speaking cần được chấm từ 0 đến 4.');
  }
  return { score: marks.reduce((sum, mark) => sum + mark, 0), maxScore: 20, criteria: Object.fromEntries(SPEAKING_CRITERIA.map((name, index) => [name, marks[index]])) };
}

export function summarizeResults(results) {
  const items = Array.isArray(results) ? results : [];
  const count = items.length;
  const average = count ? items.reduce((sum, item) => sum + Number(item.score || 0) / Math.max(1,Number(item.max_score||1)) * 100, 0) / count : 0;
  const topics = {};
  items.forEach(item => {
    Object.entries(item.breakdown?.topics || {}).forEach(([topic, value]) => {
      if (!topics[topic]) topics[topic] = { achieved: 0, total: 0 };
      topics[topic].achieved += Number(value.achieved || 0);
      topics[topic].total += Number(value.total || 0);
    });
  });
  return { count, average, topics };
}

export function csvEscape(value) {
  const raw = String(value ?? '');
  // Prefix potentially executable spreadsheet cell values.
  const safe = /^[\s]*[=+\-@\t\r]/.test(raw) ? "'" + raw : raw;
  return '"' + safe.replace(/"/g, '""') + '"';
}

/**
 * Compare only matching student codes. Class averages from different rosters
 * are not treated as individual improvement evidence.
 */
export function comparePairedOutcomes(before, after) {
  const indexed = new Map();
  (Array.isArray(before) ? before : []).forEach(row => {
    const code = String(row.student_code || '').trim().toUpperCase();
    if (code && !indexed.has(code)) indexed.set(code, row);
  });
  let pairs = 0;
  let beforeTotal = 0;
  let afterTotal = 0;
  const unique = new Set();
  (Array.isArray(after) ? after : []).forEach(row => {
    const code = String(row.student_code || '').trim().toUpperCase();
    if (!code || unique.has(code) || !indexed.has(code)) return;
    unique.add(code);
    const pre = indexed.get(code);
    if (!Number(pre.max_score) || !Number(row.max_score)) return;
    pairs += 1;
    beforeTotal += Number(pre.score) / Number(pre.max_score) * 100;
    afterTotal += Number(row.score) / Number(row.max_score) * 100;
  });
  return { pairs, beforeAverage: pairs ? beforeTotal / pairs : null,
    afterAverage: pairs ? afterTotal / pairs : null,
    change: pairs ? (afterTotal - beforeTotal) / pairs : null };
}

export function parseManualPrompts(raw) {
  const lines = String(raw || '').split(/\r?\n/).map(s => s.trim()).filter(Boolean);
  if (!lines.length || lines.length > 30) throw new Error('Nhập từ 1 đến 30 câu sửa lỗi hoặc viết lại.');
  return lines.map((line,index) => {
    const p=line.split('|').map(v=>v.trim());
    if (p.length !== 3 || p.some(v=>!v)) throw new Error('Dòng '+(index+1)+' cần: Yêu cầu | Đáp án tham khảo | Chủ điểm.');
    return { prompt:p[0], sampleAnswer:p[1], topic:p[2] };
  });
}

export function parseReadingQuestions(raw) {
  const lines=String(raw||'').split(/\r?\n/).map(s=>s.trim()).filter(Boolean);
  if (!lines.length || lines.length > 20) throw new Error('ReadProof cần 1–20 câu có dẫn chứng P1, P2, ...');
  return lines.map((line,index)=>{
    const p=line.split('|').map(v=>v.trim());
    if (p.length!==8 || !LETTERS.includes((p[5]||'').toUpperCase()) || p.slice(0,5).some(v=>!v) || !/^P[1-9]\d*$/i.test(p[7])){
      throw new Error('Dòng '+(index+1)+' cần 8 cột: Câu | A | B | C | D | Đáp án | Kỹ năng | Mã đoạn P1.');
    }
    return {stem:p[0],options:p.slice(1,5),correct:p[5].toUpperCase(),topic:p[6]||'Reading',evidence:p[7].toUpperCase()};
  });
}

function answerLetters(raw, count) {
  const result=String(raw||'').toUpperCase().replace(/[\s,;|]+/g,'').split('');
  if (result.length!==count || result.some(v=>!LETTERS.includes(v))){
    throw new Error('Cần nhập chính xác '+count+' đáp án A–D.');
  }
  return result;
}

export function gradeReading(questions, rawAnswers, rawEvidence) {
  if (!Array.isArray(questions)||!questions.length) throw new Error('Cần có câu hỏi ReadProof.');
  const responses=answerLetters(rawAnswers, questions.length);
  const cited=String(rawEvidence||'').toUpperCase().split(/[,;\n]/).map(x=>x.trim());
  if(cited.length!==questions.length || cited.some(v=>!/^P[1-9]\d*$/.test(v))) throw new Error('Nhập một mã dẫn chứng P1, P2,... cho mỗi câu, phân cách bằng dấu phẩy.');
  const topics={};
  let score=0;
  const detail=questions.map((q,i)=>{
    const answerOk=responses[i]===q.correct;
    const evidenceOk=cited[i]===q.evidence;
    const topic=q.topic||'Reading';
    if(!topics[topic])topics[topic]={achieved:0,total:0};
    topics[topic].total+=2;
    topics[topic].achieved+=Number(answerOk)+Number(evidenceOk);
    score+=Number(answerOk)+Number(evidenceOk);
    return {number:i+1,selected:responses[i],correctAnswer:q.correct,evidenceSelected:cited[i],correctEvidence:q.evidence,answerOk,evidenceOk,topic};
  });
  return {score,maxScore:questions.length*2,topics,detail,answers:responses,evidence:cited};
}

export function gradeManual(questions, rawResponses, rawDecisions) {
  if(!Array.isArray(questions)||!questions.length)throw new Error('Chưa có câu hỏi tự luận.');
  if(!Array.isArray(rawResponses)||rawResponses.length!==questions.length ||
    !Array.isArray(rawDecisions)||rawDecisions.length!==questions.length ||
    rawDecisions.some(v=>typeof v!=='boolean'))throw new Error('Cần chấm tất cả câu theo Đạt/Chưa đạt.');
  const topics={};
  let score=0;
  const detail=questions.map((q,i)=>{
    const passed=rawDecisions[i];
    const topic=q.topic||'Chưa phân loại';
    if(!topics[topic])topics[topic]={achieved:0,total:0};
    topics[topic].total+=1; topics[topic].achieved+=Number(passed);
    score+=Number(passed);
    return {number:i+1,studentResponse:String(rawResponses[i]||''),sampleAnswer:q.sampleAnswer,teacherAccepted:passed,topic};
  });
  return {score,maxScore:questions.length,answers:rawResponses,topics,detail};
}

export function gradeRubric(kind, rawMarks) {
  const criteria=RUBRICS[kind];
  if(!criteria)throw new Error('Không có rubric cho sản phẩm này.');
  const values=criteria.map(key=>Number(rawMarks?.[key]));
  if(values.some(v=>!Number.isInteger(v)||v<0||v>4))throw new Error('Mỗi tiêu chí rubric phải được chấm 0–4 điểm.');
  return {score:values.reduce((sum,v)=>sum+v,0),maxScore:criteria.length*4,
    criteria:Object.fromEntries(criteria.map((name,i)=>[name,values[i]]))};
}

export function gradeSelfRatings(statements, rawMarks) {
  if(!Array.isArray(statements)||!statements.length||statements.length>12) throw new Error('Cần từ 1 đến 12 phát biểu I can.');
  const values=statements.map((_,i)=>Number(rawMarks?.[i]));
  if(values.some(v=>!Number.isInteger(v)||v<1||v>4))throw new Error('Mỗi phát biểu I can cần có mức tự đánh giá từ 1 đến 4.');
  return {score:values.reduce((sum,v)=>sum+v,0),maxScore:values.length*4,
    criteria:Object.fromEntries(statements.map((name,i)=>[name,values[i]]))};
}

export function safeHttpUrl(raw) {
  const input=String(raw||'').trim();
  if(!input)return '';
  try {const url=new URL(input);if(url.protocol==='http:'||url.protocol==='https:')return url.href;}catch{}
  throw new Error('Đường dẫn audio phải sử dụng https:// hoặc http:// hợp lệ.');
}
