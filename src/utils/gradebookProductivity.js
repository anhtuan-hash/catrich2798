// Pure, deterministic Gradebook productivity helpers.
// All analysis is derived from teacher-entered scores, with no AI.
export function numericGrade(value) {
  if (value === '' || value == null) return null;
  const text = String(value).trim().replace(',', '.');
  if (!/^\d{1,2}(?:\.\d{1,2})?$/.test(text)) return null;
  const n = Number(text);
  return Number.isFinite(n) && n >= 0 && n <= 10 ? n : null;
}

export function parseGradeMatrix(text) {
  const source = String(text || '').replace(/\r\n?/g, '\n').replace(/\n+$/, '');
  if (!source.trim()) return [];
  // TSV is the standard clipboard format from Excel / Google Sheets.
  // CSV is also supported for plain number-only files.
  const delimiter = source.includes('\t') ? '\t' : ',';
  return source.split('\n').map((line) => line.split(delimiter).map((cell) => cell.trim()));
}

export function previewGradePaste({text, students = [], columns = [], startRow = 0, startColumn = 0, scores = {}}) {
  const matrix = parseGradeMatrix(text);
  const entries = [];
  const issues = [];
  const rowStart = Number(startRow) || 0;
  const colStart = Number(startColumn) || 0;
  for (let r = 0; r < matrix.length; r++) {
    const row = matrix[r];
    for (let c = 0; c < row.length; c++) {
      const raw = row[c];
      if (raw === '') continue; // pasted blank cells never clear existing scores
      const student = students[rowStart + r];
      const column = columns[colStart + c];
      if (!student || !column) {
        issues.push({row:r+1,col:c+1,reason:'Vượt quá danh sách học sinh hoặc số cột điểm hiện có'});
        continue;
      }
      const value = numericGrade(raw);
      if (value == null) {
        issues.push({row:r+1,col:c+1,reason:'Điểm phải nằm trong khoảng 0–10, tối đa 2 chữ số thập phân'});
        continue;
      }
      const existing = scores?.[student.id]?.[column.id];
      entries.push({
        studentId:student.id,
        studentName:student.fullName || student.name || '',
        columnId:column.id,
        columnLabel:column.label || '',
        value: String(value),
        overwritten: existing !== '' && existing != null && numericGrade(existing) !== value,
        previous: existing ?? '',
      });
    }
  }
  return {entries,issues,totalCells:matrix.reduce((n,row)=>n+row.length,0),rows:matrix.length,columns:Math.max(0,...matrix.map(row=>row.length)),overwrites:entries.filter(x=>x.overwritten).length};
}

export function analyzeGradebook({students=[], semester, minimum=5, decline=2, computeRoundScore=null}) {
  const active = students.filter(s=>s?.active!==false);
  const regular = Array.isArray(semester?.regular) ? semester.regular : [];
  const results = active.map(student=>{
    const gradeValues = regular.map(round=>{
      const values = (round?.columns || []).map(col=>numericGrade(round?.scores?.[student.id]?.[col.id])).filter(v=>v!=null);
      if (typeof computeRoundScore === 'function') return computeRoundScore(round,student.id);
      return values.length ? values.reduce((a,b)=>a+b,0)/values.length : null;
    });
    const mids = numericGrade(semester?.midterm?.scores?.[student.id]);
    const finals = numericGrade(semester?.final?.scores?.[student.id]);
    const available = [...gradeValues,mids,finals].filter(x=>x!=null);
    const lastTwo=gradeValues.filter(v=>v!=null).slice(-2);
    const low=available.length>0 && available.some(v=>v<minimum);
    const dropping=lastTwo.length===2 && (lastTwo[0]-lastTwo[1])>=decline;
    return {
      id:student.id,name:student.fullName||student.name||'',code:student.code||'',
      rounds:gradeValues,midterm:mids,final:finals,completed:available.length,
      missing:6-available.length,low,dropping,
      reasons:[...(low?['Có điểm dưới ngưỡng '+minimum]:[]),...(dropping?['Kết quả TX giảm ít nhất '+decline+' điểm']:[])],
    };
  });
  return {
    rows:results,
    students:active.length,
    complete:results.filter(x=>x.completed===6).length,
    incomplete:results.filter(x=>x.completed<6).length,
    missingCells:results.reduce((total,x)=>total+x.missing,0),
    atRisk:results.filter(x=>x.low||x.dropping),
  };
}

export function gradebookAuditChanges(previous={}, current={}) {
  const diffs=[];
  const before=previous?.subjects||{}, after=current?.subjects||{};
  for(const key of new Set([...Object.keys(before),...Object.keys(after)])){
    const bs=before[key]?.semesters||{},as=after[key]?.semesters||{};
    for(const term of new Set([...Object.keys(bs),...Object.keys(as)])){
      const br=bs[term]||{}, ar=as[term]||{};
      const rounds=Math.max(br.regular?.length||0,ar.regular?.length||0);
      for(let r=0;r<rounds;r++){
        const oldR=br.regular?.[r]||{},newR=ar.regular?.[r]||{};
        for(const kind of ['scores','plusCounts']){
          const oldRows=oldR[kind]||{},newRows=newR[kind]||{};
          for(const studentId of new Set([...Object.keys(oldRows),...Object.keys(newRows)])){
            const oldValues=kind==='scores'?(oldRows[studentId]||{}):{plus:oldRows[studentId]};
            const newValues=kind==='scores'?(newRows[studentId]||{}):{plus:newRows[studentId]};
            for(const col of new Set([...Object.keys(oldValues),...Object.keys(newValues)])){
              const oldVal=oldValues[col]??'',newVal=newValues[col]??'';
              if(String(oldVal)!==String(newVal))diffs.push({subject:key,term,kind,round:r,studentId,column:col,from:oldVal,to:newVal});
            }
          }
        }
      }
      for(const kind of ['midterm','final']){
        const oldRows=br[kind]?.scores||{},newRows=ar[kind]?.scores||{};
        for(const studentId of new Set([...Object.keys(oldRows),...Object.keys(newRows)])){
          const from=oldRows[studentId]??'',to=newRows[studentId]??'';
          if(String(from)!==String(to))diffs.push({subject:key,term,kind,studentId,from,to});
        }
      }
    }
    // Audit changes to a mock-exam ledger separately from semester grading.
    const oldMocks = before[key]?.mockExams || [];
    const newMocks = after[key]?.mockExams || [];
    const previous = new Map(oldMocks.map((exam) => [exam.id, exam]));
    const current = new Map(newMocks.map((exam) => [exam.id, exam]));
    for (const id of new Set([...previous.keys(), ...current.keys()])) {
      const oldExam = previous.get(id) || {};
      const newExam = current.get(id) || {};
      for (const field of ['label', 'date', 'locked']) {
        if ((oldExam[field] || '') !== (newExam[field] || '')) diffs.push({ subject:key, kind:'mock-exam', examId:id, field, from:oldExam[field] || '', to:newExam[field] || '' });
      }
      for (const studentId of new Set([...Object.keys(oldExam.scores || {}), ...Object.keys(newExam.scores || {})])) {
        const from = oldExam.scores?.[studentId] ?? '';
        const to = newExam.scores?.[studentId] ?? '';
        if (String(from) !== String(to)) diffs.push({ subject:key, kind:'mock-exam', examId:id, studentId, from, to });
      }
    }
  }
  return diffs;
}


export function gradebookQualityReport({students=[], semester}) {
  const issues=[];
  const usedCodes=new Set();
  for(const student of students.filter(s=>s?.active!==false)){
    const code=String(student.code||'').trim().toLowerCase();
    if(code && usedCodes.has(code))issues.push({studentId:student.id,reason:'Mã học sinh bị trùng: '+code});
    if(code)usedCodes.add(code);
    if(!String(student.fullName||'').trim())issues.push({studentId:student.id,reason:'Thiếu tên học sinh'});
  }
  for(const round of semester?.regular||[]){
    for(const [studentId,row] of Object.entries(round.scores||{})){
      for(const [columnId,value] of Object.entries(row||{})){
        if(value!==''&&value!=null&&numericGrade(value)==null)issues.push({studentId,columnId,reason:'Điểm TX không hợp lệ: '+String(value)});
      }
    }
    for(const [studentId,value] of Object.entries(round.plusCounts||{})){
      if(value!==''&&value!=null&&(!/^\d+$/.test(String(value))||Number(value)<0))issues.push({studentId,reason:'Số dấu cộng không hợp lệ'});
    }
  }
  for(const kind of ['midterm','final']){
    for(const [studentId,value] of Object.entries(semester?.[kind]?.scores||{})){
      if(value!==''&&value!=null&&numericGrade(value)==null)issues.push({studentId,reason:'Điểm '+kind+' không hợp lệ: '+String(value)});
    }
  }
  return issues;
}
