
const text=(value)=>String(value??'').replace(/\u00a0/g,' ').replace(/\s+/g,' ').trim();

const fold=(value)=>text(value)
  .normalize('NFD').replace(/[\u0300-\u036f]/g,'')
  .replace(/đ/g,'d').replace(/Đ/g,'D')
  .toLowerCase();

const digits=(value)=>text(value).replace(/[^\d]/g,'');

const dateText=(value)=>{
  const raw=text(value);
  const match=raw.match(/(\d{1,2})[\/.\-](\d{1,2})[\/.\-](\d{4})/);
  return match?[String(match[1]).padStart(2,'0'),String(match[2]).padStart(2,'0'),match[3]].join('/'):raw;
};

const cleanText=(value)=>fold(value)
  .replace(/[.,;:()[\]{}'"“”‘’\-_/\\]+/g,' ')
  .replace(/\s+/g,' ')
  .trim();

const cleanPlace=(value)=>cleanText(value)
  .replace(/\b(tp|tp hcm|tphcm)\b/g,' thanh pho ho chi minh')
  .replace(/\bthanh pho ho chi minh city\b/g,' thanh pho ho chi minh')
  .replace(/\bho chi minh city\b/g,' thanh pho ho chi minh')
  .replace(/\bsai gon\b/g,' thanh pho ho chi minh')
  .replace(/\bphuong\b/g,' ')
  .replace(/\bxa\b/g,' ')
  .replace(/\bthi tran\b/g,' ')
  .replace(/\btinh\b/g,' ')
  .replace(/\bthanh pho\b/g,' ')
  .replace(/\bquan\b/g,' ')
  .replace(/\bhuyen\b/g,' ')
  .replace(/\bthi xa\b/g,' ')
  .replace(/\s+/g,' ')
  .trim();

const cleanBoolean=(value)=>{
  const v=cleanText(value);
  if(!v)return '';
  if(['x','co','yes','true','1','tham gia','tu nguyen','ban tru'].includes(v))return 'yes';
  if(['khong','no','false','0','khong tham gia'].includes(v))return 'no';
  return v;
};

const normalize=(value,mode)=>{
  if(!text(value))return '';
  if(mode==='date')return dateText(value);
  if(mode==='digits')return digits(value);
  if(mode==='place')return cleanPlace(value);
  if(mode==='boolean')return cleanBoolean(value);
  return cleanText(value);
};

const raw=(source)=>source?.excel?.rawColumns||{};
const ids=(source)=>source?.excel?.identifiers||{};
const extra=(source)=>source?.excel?.extra||{};
const fields=(source)=>source?.fields||{};

const first=(...values)=>values.find((value)=>text(value))||'';

export const STANDARD_COMPARE_FIELDS=Object.freeze([
  {key:'ministryId',group:'Định danh',label:'Mã định danh Bộ GD&ĐT',mode:'digits'},
  {key:'fullName',group:'Cá nhân',label:'Họ và tên',mode:'text'},
  {key:'birthDate',group:'Cá nhân',label:'Ngày sinh',mode:'date'},
  {key:'gender',group:'Cá nhân',label:'Giới tính',mode:'text'},
  {key:'ethnicity',group:'Cá nhân',label:'Dân tộc',mode:'text'},
  {key:'nationality',group:'Cá nhân',label:'Quốc tịch',mode:'text'},
  {key:'citizenId',group:'Định danh',label:'CCCD / Số định danh cá nhân',mode:'digits'},
  {key:'citizenIdIssueDate',group:'Định danh',label:'Ngày cấp CCCD',mode:'date'},
  {key:'citizenIdIssuePlace',group:'Định danh',label:'Nơi cấp CCCD',mode:'text',compare:'contains'},
  {key:'contactPhone',group:'Liên hệ',label:'SĐT liên hệ',mode:'digits'},
  {key:'birthPlace',group:'Nơi sinh & khai sinh',label:'Nơi sinh chi tiết',mode:'place',compare:'contains'},
  {key:'birthWard',group:'Nơi sinh & khai sinh',label:'Phường/Xã nơi sinh',mode:'place'},
  {key:'birthProvince',group:'Nơi sinh & khai sinh',label:'Tỉnh/TP nơi sinh',mode:'place'},
  {key:'birthRegistrationWard',group:'Nơi sinh & khai sinh',label:'Phường/Xã khai sinh',mode:'place'},
  {key:'birthRegistrationProvince',group:'Nơi sinh & khai sinh',label:'Tỉnh/TP khai sinh',mode:'place'},
  {key:'hometownText',group:'Quê quán',label:'Quê quán (dòng địa chỉ)',mode:'place',compare:'contains'},
  {key:'hometownWard',group:'Quê quán',label:'Phường/Xã quê quán',mode:'place'},
  {key:'hometownProvince',group:'Quê quán',label:'Tỉnh/TP quê quán',mode:'place'},
  {key:'currentAddress',group:'Cư trú',label:'Chỗ ở hiện nay',mode:'place',compare:'contains'},
  {key:'currentWard',group:'Cư trú',label:'Phường/Xã chỗ ở hiện nay',mode:'place'},
  {key:'currentProvince',group:'Cư trú',label:'Tỉnh/TP chỗ ở hiện nay',mode:'place'},
  {key:'permanentAddress',group:'Cư trú',label:'Hộ khẩu thường trú',mode:'place',compare:'contains'},
  {key:'permanentWard',group:'Cư trú',label:'Phường/Xã thường trú',mode:'place'},
  {key:'permanentProvince',group:'Cư trú',label:'Tỉnh/TP thường trú',mode:'place'},
  {key:'fatherName',group:'Gia đình',label:'Họ tên cha',mode:'text'},
  {key:'fatherBirthYear',group:'Gia đình',label:'Năm sinh cha',mode:'digits'},
  {key:'fatherOccupation',group:'Gia đình',label:'Nghề nghiệp cha',mode:'text'},
  {key:'motherName',group:'Gia đình',label:'Họ tên mẹ',mode:'text'},
  {key:'motherBirthYear',group:'Gia đình',label:'Năm sinh mẹ',mode:'digits'},
  {key:'motherOccupation',group:'Gia đình',label:'Nghề nghiệp mẹ',mode:'text'},
  {key:'teamMember',group:'Học tập & chính sách',label:'Đội viên',mode:'boolean'},
  {key:'semiBoarding',group:'Học tập & chính sách',label:'Bán trú',mode:'boolean'},
  {key:'disability',group:'Học tập & chính sách',label:'Khuyết tật',mode:'text'},
  {key:'policyCategory',group:'Học tập & chính sách',label:'Diện/đối tượng chính sách',mode:'text'},
]);

export function standardizeStudentSource(sourceKey,source){
  const r=raw(source), i=ids(source), e=extra(source), f=fields(source);
  if(sourceKey==='vnedu'){
    return {
      ministryId:first(i.moetCode,r['Mã MOET']),
      fullName:first(f.fullName,r['Họ và tên']),
      birthDate:first(f.birthDate,r['Ngày sinh']),
      gender:first(f.gender,r['Giới tính']),
      ethnicity:first(e.ethnicity,r['Dân tộc']),
      nationality:first(e.nationality,r['Quốc tịch']),
      citizenId:first(f.citizenId,r['Căn cước']),
      citizenIdIssueDate:first(e.citizenIdIssueDate,r['Ngày cấp Căn cước']),
      citizenIdIssuePlace:first(e.citizenIdIssuePlace,r['Nơi cấp Căn cước']),
      contactPhone:first(e.contactPhone,r['Điện thoại SLL']),
      birthPlace:first(f.birthPlace,r['Nơi sinh']),
      birthWard:first(r['Phường/Xã nơi sinh'],r['Cột 20']),
      birthProvince:first(r['Tỉnh/TP nơi sinh'],r['Cột 21']),
      birthRegistrationWard:first(f.birthRegistrationPlace,r['Nơi khai sinh']),
      birthRegistrationProvince:first(r['Tỉnh/TP khai sinh'],r['Cột 26']),
      hometownText:first(f.hometown,r['Quê quán']),
      hometownWard:first(r['Phường/Xã quê quán'],r['Cột 23']),
      hometownProvince:first(r['Tỉnh/TP quê quán'],r['Cột 24']),
      currentAddress:first(f.currentAddress,r['Chỗ ở hiện nay']),
      currentWard:first(r['Phường/Xã chỗ ở hiện nay'],r['Cột 13']),
      currentProvince:first(r['Tỉnh/TP chỗ ở hiện nay'],r['Cột 14']),
      permanentAddress:first(f.permanentAddress,r['Hộ khẩu thường trú']),
      permanentWard:first(r['Phường/Xã hộ khẩu thường trú'],r['Cột 17']),
      permanentProvince:first(r['Tỉnh/TP hộ khẩu thường trú'],r['Cột 18']),
      fatherName:first(f.fatherName,r['Tên cha']),
      fatherBirthYear:first(e.fatherBirthYear,r['Năm sinh cha']),
      fatherOccupation:first(e.fatherOccupation,r['Nghề nghiệp cha']),
      motherName:first(f.motherName,r['Tên mẹ']),
      motherBirthYear:first(e.motherBirthYear,r['Năm sinh mẹ']),
      motherOccupation:first(e.motherOccupation,r['Nghề nghiệp mẹ']),
      teamMember:first(r['Đội viên']),
      semiBoarding:first(e.residenceType,r['N.trú, B.trú']),
      disability:first(e.disability,r['Khuyết tật']),
      policyCategory:first(e.policyCategory,r['Diện chính sách']),
    };
  }
  if(sourceKey==='moet'){
    return {
      ministryId:first(i.ministryId,r['Mã định danh Bộ GD&ĐT']),
      fullName:first(f.fullName,r['Họ tên']),
      birthDate:first(f.birthDate,r['Ngày sinh']),
      gender:first(f.gender,r['Giới tính']),
      ethnicity:first(r['Dân tộc']),
      nationality:first(r['Quốc tịch']),
      citizenId:first(i.personalId,r['Số định danh cá nhân'],f.citizenId,r['Số CMND']),
      citizenIdIssueDate:first(r['Ngày cấp']),
      citizenIdIssuePlace:first(r['Nơi cấp']),
      contactPhone:first(f.phone,r['SĐT liên hệ']),
      birthPlace:first(f.birthPlace,r['Nơi sinh chi tiết']),
      birthWard:first(r['Phường/Xã nơi sinh'],r['Nơi sinh Xã (cũ)']),
      birthProvince:first(r['Nơi sinh Tỉnh (cũ)']),
      birthRegistrationWard:first(r['Phường/Xã khai sinh'],r['Nơi khai sinh Xã (cũ)']),
      birthRegistrationProvince:first(r['Tỉnh thành khai sinh'],r['Nơi khai sinh Tỉnh (cũ)']),
      hometownText:first(r['Tổ thôn quê quán']),
      hometownWard:first(r['Phường Xã quê quán'],r['Quê quán Xã (cũ)']),
      hometownProvince:first(r['Tỉnh thành quê quán'],r['Quê quán Tỉnh (cũ)']),
      currentAddress:first(f.currentAddress,r['Chỗ ở hiện nay']),
      currentWard:first(r['Phường/Xã chỗ ở hiện nay']),
      currentProvince:first(r['Tỉnh thành chỗ ở hiện nay']),
      permanentAddress:first(f.permanentAddress,r['Tổ/thôn Hộ khẩu thường trú']),
      permanentWard:first(r['Nơi thường trú Xã (cũ)']),
      permanentProvince:first(r['Nơi thường trú Tỉnh (cũ)']),
      fatherName:first(f.fatherName,r['Tên cha']),
      fatherBirthYear:first(r['Năm sinh cha']),
      fatherOccupation:first(r['Nghề nghiệp cha']),
      motherName:first(f.motherName,r['Tên mẹ']),
      motherBirthYear:first(r['Năm sinh mẹ']),
      motherOccupation:first(r['Nghề nghiệp mẹ']),
      teamMember:first(r['Đội viên']),
      semiBoarding:first(r['Học bán trú'],r['Học sinh lớp B.Trú']),
      disability:first(r['Loại khuyết tật']),
      policyCategory:first(r['Đối tượng chính sách']),
    };
  }
  return {};
}

export function compareStandardizedValue(field,vneduValue,moetValue){
  const left=normalize(vneduValue,field.mode);
  const right=normalize(moetValue,field.mode);
  if(!left&&!right)return {id:'empty',label:'Chưa có dữ liệu'};
  if(!left||!right)return {id:'review',label:'Thiếu một nguồn'};
  if(field.compare==='contains'){
    const match=left.includes(right)||right.includes(left);
    return match?{id:'match',label:'Khớp'}:{id:'mismatch',label:'Sai lệch'};
  }
  return left===right?{id:'match',label:'Khớp'}:{id:'mismatch',label:'Sai lệch'};
}
