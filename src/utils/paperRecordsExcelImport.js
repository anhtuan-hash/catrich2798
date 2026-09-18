
const SHEETJS_CDN='https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js';

function text(value){
  if(value instanceof Date&&Number.isFinite(value.getTime()))return new Intl.DateTimeFormat('vi-VN').format(value);
  return String(value??'').replace(/\u00a0/g,' ').replace(/\s+/g,' ').trim();
}
function fold(value){
  return text(value).normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/đ/g,'d').replace(/Đ/g,'D').toLowerCase().replace(/[.:;,()[\]{}]+/g,' ').replace(/\s+/g,' ').trim();
}
function dateText(value){
  const raw=text(value);
  const match=raw.match(/(\d{1,2})[\/.\-](\d{1,2})[\/.\-](\d{4})/);
  return match?[String(match[1]).padStart(2,'0'),String(match[2]).padStart(2,'0'),match[3]].join('/'):raw;
}
function rawColumns(headers,row){
  const out={};
  const seen=new Map();
  headers.forEach((header,index)=>{
    const value=text(row[index]);
    if(!value)return;
    const base=text(header)||('Cột '+(index+1));
    const n=(seen.get(base)||0)+1;
    seen.set(base,n);
    out[n>1?base+' ('+n+')':base]=value;
  });
  return out;
}
function findHeaderRow(rows){
  let best={index:-1,score:0};
  rows.slice(0,15).forEach((row,index)=>{
    const hs=(row||[]).map(fold);
    const required=['ho va ten','ngay sinh','so hieu','loai gcn lop 10','loai giay khai sinh'];
    const score=required.filter((label)=>hs.includes(label)).length;
    if(hs.includes('ho va ten')&&hs.includes('ngay sinh')&&score>best.score)best={index,score};
  });
  return best.index;
}
function pick(raw,label){return text(raw[label]);}
function buildSections(raw){
  return {
    identity:{
      'Họ và tên':pick(raw,'Họ và tên'),
      'Ngày sinh':dateText(pick(raw,'Ngày sinh')),
      'Nơi sinh':pick(raw,'Nơi sinh'),
      'Giới tính':pick(raw,'Giới tính'),
      'Dân tộc':pick(raw,'Dân tộc'),
    },
    diploma:{
      'Học sinh trường':pick(raw,'Học sinh trường'),
      'Năm tốt nghiệp':pick(raw,'Năm tốt nghiệp'),
      'Xếp loại tốt nghiệp':pick(raw,'Xếp loại tốt nghiệp'),
      'Hình thức đào tạo':pick(raw,'Hình thức đào tạo'),
      'Nơi cấp bằng':pick(raw,'Nơi cấp bằng'),
      'Ngày cấp bằng':dateText(pick(raw,'Ngày cấp bằng')),
      'Số hiệu':pick(raw,'Số hiệu'),
      'Số vào sổ cấp bằng':pick(raw,'Số vào sổ cấp bằng'),
      'Trang PDF - Bằng THCS':pick(raw,'Trang PDF - Bằng THCS'),
      'Ghi chú - Bằng THCS':pick(raw,'Ghi chú - Bằng THCS'),
    },
    admission:{
      'Loại GCN lớp 10':pick(raw,'Loại GCN lớp 10'),
      'Nơi sinh theo GCN':pick(raw,'Nơi sinh theo GCN'),
      'Trường trúng tuyển lớp 10':pick(raw,'Trường trúng tuyển lớp 10'),
      'Năm học trúng tuyển':pick(raw,'Năm học trúng tuyển'),
      'Cơ quan cấp GCN':pick(raw,'Cơ quan cấp GCN'),
      'Ngày ký GCN':dateText(pick(raw,'Ngày ký GCN')),
      'Số GCN / Số vào sổ':pick(raw,'Số GCN / Số vào sổ'),
      'Hội đồng thi':pick(raw,'Hội đồng thi'),
      'Tổng điểm tuyển sinh':pick(raw,'Tổng điểm tuyển sinh'),
      'Trang PDF - GCN lớp 10':pick(raw,'Trang PDF - GCN lớp 10'),
      'Ghi chú đối chiếu':pick(raw,'Ghi chú đối chiếu'),
    },
    birth:{
      'Loại giấy khai sinh':pick(raw,'Loại giấy khai sinh'),
      'Nơi sinh theo khai sinh':pick(raw,'Nơi sinh theo khai sinh'),
      'Quê quán theo khai sinh':pick(raw,'Quê quán theo khai sinh'),
      'Quốc tịch theo khai sinh':pick(raw,'Quốc tịch theo khai sinh'),
      'Họ tên cha':pick(raw,'Họ tên cha'),
      'Năm sinh cha':pick(raw,'Năm sinh cha'),
      'Dân tộc cha':pick(raw,'Dân tộc cha'),
      'Quốc tịch cha':pick(raw,'Quốc tịch cha'),
      'Nơi cư trú cha':pick(raw,'Nơi cư trú cha'),
      'Họ tên mẹ':pick(raw,'Họ tên mẹ'),
      'Năm sinh mẹ':pick(raw,'Năm sinh mẹ'),
      'Dân tộc mẹ':pick(raw,'Dân tộc mẹ'),
      'Quốc tịch mẹ':pick(raw,'Quốc tịch mẹ'),
      'Nơi cư trú mẹ':pick(raw,'Nơi cư trú mẹ'),
      'Người đi khai sinh':pick(raw,'Người đi khai sinh'),
      'Quan hệ với người được khai sinh':pick(raw,'Quan hệ với người được khai sinh'),
      'Nơi đăng ký khai sinh':pick(raw,'Nơi đăng ký khai sinh'),
      'Ngày đăng ký khai sinh':dateText(pick(raw,'Ngày đăng ký khai sinh')),
      'Số khai sinh / Số đăng ký':pick(raw,'Số khai sinh / Số đăng ký'),
      'Quyển số':pick(raw,'Quyển số'),
      'Số bản sao / trích lục':pick(raw,'Số bản sao / trích lục'),
      'Ngày cấp bản sao / trích lục':dateText(pick(raw,'Ngày cấp bản sao / trích lục')),
      'Trang PDF - Khai sinh':pick(raw,'Trang PDF - Khai sinh'),
      'Ghi chú - Khai sinh':pick(raw,'Ghi chú - Khai sinh'),
    },
  };
}
function nonEmptyObject(obj){return Object.fromEntries(Object.entries(obj||{}).filter(([,value])=>text(value)));}
function buildFields(sections){
  const identity=sections.identity||{},birth=sections.birth||{};
  return nonEmptyObject({
    fullName:identity['Họ và tên'],
    birthDate:identity['Ngày sinh'],
    gender:identity['Giới tính'],
    ethnicity:identity['Dân tộc'],
    birthPlace:birth['Nơi sinh theo khai sinh']||identity['Nơi sinh'],
    hometown:birth['Quê quán theo khai sinh'],
    nationality:birth['Quốc tịch theo khai sinh'],
    fatherName:birth['Họ tên cha'],
    fatherBirthYear:birth['Năm sinh cha'],
    motherName:birth['Họ tên mẹ'],
    motherBirthYear:birth['Năm sinh mẹ'],
  });
}
function buildCanonical(fields){
  return nonEmptyObject({
    fullName:fields.fullName,
    birthDate:fields.birthDate,
    gender:fields.gender,
    ethnicity:fields.ethnicity,
    birthPlace:fields.birthPlace,
    hometown:fields.hometown,
    nationality:fields.nationality,
    fatherName:fields.fatherName,
    fatherBirthYear:fields.fatherBirthYear,
    motherName:fields.motherName,
    motherBirthYear:fields.motherBirthYear,
  });
}
export function parsePaperRecordsMatrix(matrix,sheetName='Du lieu hoc sinh'){
  const rows=Array.isArray(matrix)?matrix:[];
  const headerRowIndex=findHeaderRow(rows);
  if(headerRowIndex<0)throw new Error('Không tìm thấy dòng tiêu đề của file hồ sơ giấy.');
  const headers=(rows[headerRowIndex]||[]).map(text);
  const students=[];
  for(let rowIndex=headerRowIndex+1;rowIndex<rows.length;rowIndex+=1){
    const row=rows[rowIndex]||[];
    const raw=rawColumns(headers,row);
    const fullName=pick(raw,'Họ và tên');
    if(!fullName)continue;
    const sections=buildSections(raw);
    const fields=buildFields(sections);
    students.push({
      rowNumber:rowIndex+1,
      fields,
      canonicalFields:buildCanonical(fields),
      sections,
      rawColumns:raw,
      mappedCount:Object.keys(raw).length,
    });
  }
  if(!students.length)throw new Error('Không tìm thấy học sinh trong file hồ sơ giấy.');
  return {sheetName,headerRowIndex,headers,students};
}
export function parsePaperReviewMatrix(matrix){
  const rows=Array.isArray(matrix)?matrix:[];
  if(!rows.length)return [];
  const headerIndex=rows.findIndex((row)=>(row||[]).map(fold).includes('muc kiem tra')&&(row||[]).map(fold).includes('gia tri'));
  if(headerIndex<0)return [];
  return rows.slice(headerIndex+1).map((row,index)=>({
    rowNumber:headerIndex+index+2,
    type:text(row?.[0]),
    value:text(row?.[1]),
    note:text(row?.[2]),
    source:text(row?.[3]),
  })).filter((item)=>item.type||item.value||item.note||item.source);
}
function normalizeName(value){return fold(value).replace(/[^a-z0-9 ]+/g,' ').replace(/\s+/g,' ').trim();}
function attachReviewNotes(students,reviewRows){
  const byName=new Map();
  (students||[]).forEach((student)=>byName.set(normalizeName(student.fields?.fullName),student));
  (reviewRows||[]).forEach((review)=>{
    const student=byName.get(normalizeName(review.value));
    if(!student)return;
    if(!student.reviewNotes)student.reviewNotes=[];
    student.reviewNotes.push(review);
  });
  return students;
}
let sheetJsPromise=null;
async function loadSheetJs(){
  if(globalThis.XLSX?.read)return globalThis.XLSX;
  if(sheetJsPromise)return sheetJsPromise;
  sheetJsPromise=new Promise((resolve,reject)=>{
    const existing=document.querySelector('script[data-bes-sheetjs="true"]');
    if(existing){
      if(globalThis.XLSX?.read){resolve(globalThis.XLSX);return;}
      existing.addEventListener('load',()=>resolve(globalThis.XLSX),{once:true});
      existing.addEventListener('error',()=>reject(new Error('Không thể tải bộ đọc Excel.')),{once:true});
      return;
    }
    const script=document.createElement('script');
    script.src=SHEETJS_CDN;
    script.async=true;
    script.dataset.besSheetjs='true';
    script.onload=()=>resolve(globalThis.XLSX);
    script.onerror=()=>reject(new Error('Không thể tải bộ đọc Excel. Kiểm tra kết nối và thử lại.'));
    document.head.appendChild(script);
  });
  return sheetJsPromise;
}
export async function readPaperRecordsExcelFile(file){
  if(!file)throw new Error('Chưa chọn file Excel.');
  if(!/\.(xls|xlsx)$/i.test(file.name||''))throw new Error('Chỉ hỗ trợ file .xls hoặc .xlsx.');
  const XLSX=await loadSheetJs();
  const buffer=await file.arrayBuffer();
  const workbook=XLSX.read(buffer,{type:'array',cellDates:true,cellText:true});
  let best=null;
  let reviewRows=[];
  for(const sheetName of workbook.SheetNames||[]){
    const matrix=XLSX.utils.sheet_to_json(workbook.Sheets[sheetName],{header:1,raw:false,defval:'',dateNF:'dd/mm/yyyy',blankrows:false});
    if(fold(sheetName).includes('kiem tra')){reviewRows=parsePaperReviewMatrix(matrix);continue;}
    try{
      const parsed=parsePaperRecordsMatrix(matrix,sheetName);
      if(!best||parsed.students.length>best.students.length)best=parsed;
    }catch{}
  }
  if(!best)throw new Error('Không nhận diện được bảng hồ sơ học sinh trong file.');
  attachReviewNotes(best.students,reviewRows);
  return {...best,reviewRows,fileName:file.name,fileSize:file.size};
}
