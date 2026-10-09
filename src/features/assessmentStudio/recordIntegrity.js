/**
 * Stable per-student identifiers for defensible pre/post comparisons.
 * No automatic guessing from student names. Codes remain strings (leading zeros preserved).
 */
export function normalizeStudentCode(input) {
  const code=String(input??'').trim().toUpperCase();
  if(!/^[A-Z0-9][A-Z0-9._-]{0,39}$/.test(code)) {
    throw new Error('Mã học sinh bắt buộc (1–40 ký tự A–Z, 0–9, dấu chấm, gạch dưới hoặc gạch nối).');
  }
  return code;
}

export function ensureNewStudentCodes(candidates,existing=[]) {
  const previous=new Set(existing.map(item=>String(typeof item==='string'?item:item.student_code||'').trim().toUpperCase()).filter(Boolean));
  const batch=new Set();
  const codes=[];
  for(const candidate of candidates) {
    const code=normalizeStudentCode(candidate);
    if(batch.has(code))throw new Error('Trùng mã học sinh trong dữ liệu đang nhập: '+code+'.');
    if(previous.has(code))throw new Error('Học sinh '+code+' đã có kết quả ở đợt này. Không ghi đè hoặc tạo bản trùng; cần đối chiếu kết quả hiện có.');
    batch.add(code); codes.push(code);
  }
  return codes;
}

export function assertScoredResult(result) {
  const score=Number(result?.score),max=Number(result?.max_score);
  if(!Number.isFinite(score)||!Number.isFinite(max)||max<=0||score<0||score>max){
    throw new Error('Điểm số hoặc điểm tối đa không hợp lệ; chưa thể lưu.');
  }
  return true;
}
