// Gradebook .xlsx import: explicit worksheet and student identifier mapping.
// This module parses locally; it never sends files to a remote service.
const MAX_BYTES=2*1024*1024;
const MAX_ROWS=350;
const MAX_COLUMNS=60;
const MAX_SHEETS=12;

export function normalizeGradeMatch(value){
  return String(value??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'')
    .replace(/đ/g,'d').replace(/Đ/g,'D').toLowerCase().replace(/\s+/g,' ').trim();
}
export function normalizeGradeCode(value){
  return String(value??'').trim().toUpperCase().replace(/\s+/g,'');
}
function gradeValue(value){
  if(value==null||value==='')return null;
  const text=String(value).trim().replace(',','.');
  if(!/^\d{1,2}(?:\.\d{1,2})?$/.test(text))return null;
  const num=Number(text);
  return num>=0&&num<=10&&Number.isFinite(num)?String(num):null;
}

export function previewGradebookExcelImport({
  rows=[],students=[],columns=[],scores={},
  firstDataRow=1,studentColumn=0,scoreColumn=1,matchBy='code',
}={}){
  const errors=[], entries=[], used=new Set(), processed=new Set();
  const roster=new Map(), ambiguous=new Set();
  const visible=students.filter(s=>s?.active!==false);
  for(const student of visible){
    const key=matchBy==='name'?normalizeGradeMatch(student.fullName):normalizeGradeCode(student.code);
    if(!key)continue;
    if(roster.has(key))ambiguous.add(key);
    else roster.set(key,student);
  }
  if(!['code','name'].includes(matchBy))return {entries:[],errors:[{row:0,reason:'Chế độ ghép học sinh không hợp lệ'}],matched:0,overwrites:0};
  if(!Number.isInteger(firstDataRow)||firstDataRow<0||!Number.isInteger(studentColumn)||studentColumn<0||!Number.isInteger(scoreColumn)||scoreColumn<0)
    return {entries:[],errors:[{row:0,reason:'Vị trí cột hoặc dòng không hợp lệ'}],matched:0,overwrites:0};
  for(let index=firstDataRow;index<rows.length;index++){
    const row=Array.isArray(rows[index])?rows[index]:[];
    if(!row.some(cell=>String(cell??'').trim()))continue;
    const token=matchBy==='name'?normalizeGradeMatch(row[studentColumn]):normalizeGradeCode(row[studentColumn]);
    if(!token){errors.push({row:index+1,reason:'Thiếu mã hoặc tên học sinh'});continue;}
    if(ambiguous.has(token)){errors.push({row:index+1,reason:'Mã hoặc tên học sinh bị trùng trong lớp'});continue;}
    const student=roster.get(token);
    if(!student){errors.push({row:index+1,reason:'Không tìm thấy học sinh trùng mã hoặc tên trong lớp'});continue;}
    if(processed.has(student.id)){errors.push({row:index+1,reason:'Học sinh xuất hiện nhiều dòng trong tệp'});continue;}
    processed.add(student.id);
    for(let col=scoreColumn;col<row.length;col++){
      const raw=row[col];
      if(raw==null||String(raw).trim()==='')continue;
      const target=columns[col-scoreColumn];
      if(!target){errors.push({row:index+1,column:col+1,reason:'Số cột điểm vượt quá đợt đang mở'});continue;}
      const grade=gradeValue(raw);
      if(grade==null){errors.push({row:index+1,column:col+1,reason:'Điểm phải từ 0 đến 10, tối đa hai chữ số thập phân'});continue;}
      const prior=scores?.[student.id]?.[target.id]??'';
      const overwritten=prior!=='' && Number(prior)!==Number(grade);
      const unique=student.id+'|'+target.id;
      if(used.has(unique)){errors.push({row:index+1,column:col+1,reason:'Ô điểm bị nhập trùng'});continue;}
      used.add(unique);
      entries.push({studentId:student.id,studentName:student.fullName,columnId:target.id,columnLabel:target.label||'',value:grade,previous:prior,overwritten});
    }
  }
  return {
    entries,errors,
    matched:processed.size,
    unmatched:Math.max(0,visible.length-processed.size),
    overwrites:entries.filter(item=>item.overwritten).length,
    processedRows:rows.length-firstDataRow,
  };
}

function assertExcelFile(file){
  if(!file||!/\.xlsx$/i.test(file.name||''))throw new Error('Chỉ hỗ trợ file Excel .xlsx.');
  if(!Number.isFinite(file.size)||file.size<1||file.size>MAX_BYTES)throw new Error('File Excel phải có dung lượng từ 1 byte đến 2 MB.');
}

export async function readGradebookXlsx(file,{sheet}={}){
  assertExcelFile(file);
  const readExcelFile=(await import('read-excel-file/browser')).default;
  const buffer=await file.arrayBuffer();
  const names=await readExcelFile(buffer,{getSheets:true});
  const sheetNames=(names||[]).map(item=>item.name).filter(Boolean);
  if(!sheetNames.length||sheetNames.length>MAX_SHEETS)throw new Error('File Excel không có worksheet hợp lệ hoặc vượt giới hạn 12 sheet.');
  const chosen=sheetNames.includes(sheet)?sheet:sheetNames[0];
  const rows=await readExcelFile(buffer,{sheet:chosen});
  if(rows.length>MAX_ROWS || rows.some(row=>row.length>MAX_COLUMNS))
    throw new Error('Bảng Excel vượt giới hạn 350 dòng hoặc 60 cột. Hãy chia file thành nhiều đợt.');
  return {sheetNames,selectedSheet:chosen,rows:rows.map(row=>row.map(cell=>cell==null?'':cell)),fileName:file.name};
}
