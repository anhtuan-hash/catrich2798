
const SHEETJS_CDN = 'https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js';

function text(value) {
  if (value instanceof Date && Number.isFinite(value.getTime())) {
    return new Intl.DateTimeFormat('vi-VN').format(value);
  }
  return String(value ?? '').replace(/\u00a0/g, ' ').replace(/\s+/g, ' ').trim();
}

function fold(value) {
  return text(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .replace(/[.:;,()[\]{}]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeDate(value) {
  const raw = text(value);
  const match = raw.match(/(\d{1,2})[\/.\-](\d{1,2})[\/.\-](\d{4})/);
  return match ? [String(match[1]).padStart(2,'0'),String(match[2]).padStart(2,'0'),match[3]].join('/') : raw;
}

function digits(value) {
  const raw = text(value).replace(/[^\d]/g, '');
  return raw || text(value);
}

const CORE = Object.freeze({
  fullName: ['họ tên','họ và tên'],
  gender: ['giới tính'],
  birthDate: ['ngày sinh'],
  birthPlace: ['nơi sinh chi tiết'],
  currentAddress: ['chỗ ở hiện nay'],
  citizenId: ['số định danh cá nhân','số cmnd'],
  phone: ['sđt liên hệ'],
  fatherName: ['tên cha'],
  motherName: ['tên mẹ'],
});

const IDENTIFIERS = Object.freeze({
  ministryId: ['mã định danh bộ gd&đt','mã định danh bộ gd dt','mã định danh bộ giáo dục và đào tạo'],
  className: ['lớp học'],
  gradeName: ['khối học'],
  personalId: ['số định danh cá nhân'],
});

function aliasLookup(groups) {
  const lookup = new Map();
  Object.entries(groups).forEach(([key, aliases]) => aliases.forEach((alias) => lookup.set(fold(alias), key)));
  return lookup;
}
const CORE_LOOKUP=aliasLookup(CORE);
const ID_LOOKUP=aliasLookup(IDENTIFIERS);

function findHeaderRow(rows) {
  let best={index:-1,score:0};
  rows.slice(0,30).forEach((row,index)=>{
    const headers=(row||[]).map(fold);
    const hasName=headers.some((h)=>CORE_LOOKUP.get(h)==='fullName');
    const hasDob=headers.some((h)=>CORE_LOOKUP.get(h)==='birthDate');
    const hasMinistry=headers.some((h)=>ID_LOOKUP.get(h)==='ministryId');
    const score=headers.filter((h)=>CORE_LOOKUP.has(h)||ID_LOOKUP.has(h)||[
      'trạng thái','dân tộc','số cmnd','ngày cấp','nơi cấp','tên cha','tên mẹ','lớp học','khối học'
    ].includes(h)).length;
    if(hasName&&hasDob&&(hasMinistry||score>=6)&&score>best.score)best={index,score};
  });
  return best.index;
}

function combine(parts) {
  return parts.map(text).filter(Boolean).join(', ');
}

function buildCore(headers,row) {
  const fields={};
  const indexes={};
  headers.forEach((header,index)=>{
    const key=CORE_LOOKUP.get(fold(header));
    if(key!=null && indexes[key]==null)indexes[key]=index;
  });
  Object.entries(indexes).forEach(([key,index])=>{
    let value=text(row[index]);
    if(!value)return;
    if(key==='birthDate')value=normalizeDate(value);
    if(key==='citizenId'||key==='phone')value=digits(value);
    fields[key]=value;
  });

  const byLabel=new Map(headers.map((header,index)=>[fold(header),text(row[index])]));
  const val=(label)=>byLabel.get(fold(label))||'';

  const hometown=combine([val('Tổ thôn quê quán'),val('Phường Xã quê quán'),val('Tỉnh thành quê quán')]);
  if(hometown)fields.hometown=hometown;
  const birthReg=combine([val('Phường/Xã khai sinh'),val('Tỉnh thành khai sinh')]);
  if(birthReg)fields.birthRegistrationPlace=birthReg;
  const permanent=combine([val('Tổ/thôn Hộ khẩu thường trú'),val('Nơi thường trú Xã (cũ)'),val('Nơi thường trú Huyện (cũ)'),val('Nơi thường trú Tỉnh (cũ)')]);
  if(permanent)fields.permanentAddress=permanent;
  return fields;
}

function buildIdentifiers(headers,row) {
  const identifiers={};
  headers.forEach((header,index)=>{
    const key=ID_LOOKUP.get(fold(header));
    if(!key)return;
    const value=text(row[index]);
    if(value)identifiers[key]=value;
  });
  return identifiers;
}

function rawColumns(headers,row) {
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

export function parseMoetMatrix(matrix,sheetName='Sheet1') {
  const rows=Array.isArray(matrix)?matrix:[];
  const headerRowIndex=findHeaderRow(rows);
  if(headerRowIndex<0)throw new Error('Không tìm thấy dòng tiêu đề danh sách học sinh MOET.');
  const headers=(rows[headerRowIndex]||[]).map(text);
  const students=[];
  for(let rowIndex=headerRowIndex+1;rowIndex<rows.length;rowIndex+=1){
    const row=rows[rowIndex]||[];
    const fields=buildCore(headers,row);
    if(!text(fields.fullName))continue;
    const identifiers=buildIdentifiers(headers,row);
    const raw=rawColumns(headers,row);
    students.push({
      rowNumber:rowIndex+1,
      fields,
      identifiers,
      rawColumns:raw,
      mappedCount:Object.keys(raw).length,
    });
  }
  if(!students.length)throw new Error('Không tìm thấy học sinh trong file MOET.');
  return {sheetName,headerRowIndex,headers,students};
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

export async function readMoetExcelFile(file){
  if(!file)throw new Error('Chưa chọn file Excel.');
  if(!/\.(xls|xlsx)$/i.test(file.name||''))throw new Error('Chỉ hỗ trợ file .xls hoặc .xlsx xuất từ CSDL MOET.');
  const XLSX=await loadSheetJs();
  const buffer=await file.arrayBuffer();
  const workbook=XLSX.read(buffer,{type:'array',cellDates:true,cellText:true});
  let best=null;
  for(const sheetName of workbook.SheetNames||[]){
    const matrix=XLSX.utils.sheet_to_json(workbook.Sheets[sheetName],{
      header:1,raw:false,defval:'',dateNF:'dd/mm/yyyy',blankrows:false,
    });
    try{
      const parsed=parseMoetMatrix(matrix,sheetName);
      if(!best||parsed.students.length>best.students.length)best=parsed;
    }catch{}
  }
  if(!best)throw new Error('Không nhận diện được danh sách học sinh MOET trong file.');
  return {...best,fileName:file.name,fileSize:file.size};
}
