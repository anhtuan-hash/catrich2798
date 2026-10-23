/** Pure popup eligibility rules. No I/O, UTC timestamps with VN day boundaries. */
export function isEventPopupDue(event, now = new Date()) {
  const r=event?.receipt;
  if(!r)return Boolean(event);
  const ts=now.getTime();
  if(r.acknowledged_at)return false;
  if(r.hidden_until)return new Date(r.hidden_until).getTime()<=ts;
  if(r.snooze_until)return new Date(r.snooze_until).getTime()<=ts;
  if(event.frequency==='once')return !r.first_shown_at;
  if(event.frequency==='daily'){
    if(!r.last_shown_at)return true;
    const day=(date)=>new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Ho_Chi_Minh',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(date));
    return day(r.last_shown_at)!==day(now);
  }
  return true; // until acknowledged
}
