export const isValidReportPeriod=value=>/^\d{4}-(0[1-9]|1[0-2])$/.test(String(value||''));
export function reportPeriodTitle(period){
  if(!isValidReportPeriod(period))return 'Chưa chọn tháng';
  const [year,month]=period.split('-');
  return 'Tháng '+Number(month)+'/'+year;
}
export function shiftReportPeriod(period,offset){
  if(!isValidReportPeriod(period)||!Number.isInteger(offset))return period;
  const [year,month]=period.split('-').map(Number);
  const d=new Date(year,month-1+offset,1);
  return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0');
}
export function reportSchoolYear(period,defaultYear){
  if(!isValidReportPeriod(period))return defaultYear;
  const [year,month]=period.split('-').map(Number);
  return month>=8?year:year-1;
}
