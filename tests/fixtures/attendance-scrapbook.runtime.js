// Test-only transport. Vite substitutes this module only in the browser fixture.
// It reads generated records in memory and accepts only the theme preference write.
const role = new URLSearchParams(location.search).get('role') || 'admin';
const user = { id: 'fixture-user', name: 'Giáo viên minh họa', role, provider: 'supabase', approved: true,
  permissions: { allowed: role === 'teacher' ? ['attendance:calendar','attendance:history'] : [] } };
const runtime = { ready:true, role, profile:user, user, session:{user} };
export const getRuntimeState = () => runtime;
export const bootRuntimeCore = async () => runtime;
export const ensureRuntimeReady = async () => runtime;
export const subscribeRuntime = () => () => {};
export const subscribeTable = () => () => {};

const subjects = ['Tiếng Anh','Địa lí','Hóa học','Lịch sử','Ngữ văn','Sinh học','Toán','Vật lí'];
const classes = subjects.map((subject,i) => ({
  id:'class-'+i, class_name:(i ? 'Bồi dưỡng ' : 'Phụ đạo ')+subject+' '+(i%3+10),
  subject, grade_level:i%3+10, class_type:i ? 'gifted':'remedial', active:true,
  teacher_name:'Giáo viên '+String.fromCharCode(65+i), room:(i%2?'B30':'A20')+(i+1),
  weekdays:'2,3,4,5,6,7', time_range:'16h45 đến 17h55', school_year:'2026-2027'
}));
const members = classes.flatMap((c,i) => Array.from({length:5+(i%4)},(_,j) => ({
  id:c.id+'-member-'+j, member_key:c.id+'-member-'+j, class_id:c.id,
  student_full_name:'Học sinh mẫu '+String(j+1).padStart(2,'0'), school_class_name:(10+i%3)+'.2', active:true
})));
const sessions = classes.map((c,i) => ({
  id:'session-'+i, class_id:c.id, class_name:c.class_name, class_type:c.class_type, subject:c.subject,
  teacher_name:c.teacher_name, teaching_room:c.room, teaching_time_range:c.time_range,
  attendance_date:'2026-11-02', checked_at:'2026-11-02T10:'+String(10+i)+':00Z', checked_by:user.id,
  checked_by_name:user.name, session_status:'completed', total_students:5+i%4,
  present_count:4+i%4, absent_count:1, lesson_periods:i ? 2:1.5, note:'Buổi học minh họa.'
}));
const records = sessions.flatMap(s => members.filter(m=>m.class_id===s.class_id).map((m,i)=>({
  ...m, member_id:m.id, session_id:s.id, status:i===0?'absent':i===1?'late':'present',
  absence_reason_code:i===0?'excused':null
})));

function themeRow(){
  const state=window.attendanceServer;
  return { id:true, attendance_scrapbook_enabled:state.enabled, apps_scrapbook_enabled:false,
    dashboard_scrapbook_enabled:false, halloween_home_enabled:false, halloween_enabled:false,
    halloween_footer_enabled:false, november_home_enabled:false, november_avatar_url:'',
    updated_at:new Date(Date.UTC(2026,10,3,0,0,state.revision)).toISOString() };
}
function read(table){
  const data={bes_extra_classes:classes,bes_extra_class_members:members,bes_extra_class_teachers:[],
    bes_extra_attendance_sessions:sessions,bes_extra_attendance_records:records,bes_extra_attendance_record_changes:[],
    bes_attendance_global_settings:[{id:true,allow_teacher_period_selection:false}],profiles:[user],
    bes_navigation_theme_settings:[themeRow()]};
  let rows=[...(data[table]||[])], error=null;
  return {
    select(columns='*'){if(table==='bes_navigation_theme_settings' && columns.includes('attendance_scrapbook_enabled') && window.attendanceServer.missing) error={message:'column attendance_scrapbook_enabled does not exist'};return this;},
    eq(k,v){rows=rows.filter(r=>r[k]===v);return this;},
    gte(k,v){rows=rows.filter(r=>r[k]>=v);return this;},
    lte(k,v){rows=rows.filter(r=>r[k]<=v);return this;},
    lt(k,v){rows=rows.filter(r=>r[k]<v);return this;},
    in(k,values){rows=rows.filter(r=>values.includes(r[k]));return this;},
    order(k,{ascending=true}={}){rows.sort((a,b)=>String(a[k]).localeCompare(String(b[k]),'vi')*(ascending?1:-1));return this;},
    limit(n){rows=rows.slice(0,n);return this;}, range(start,end){rows=rows.slice(start,end+1);return this;},
    maybeSingle(){return Promise.resolve({data:rows[0]||null,error});},
    then(ok,fail){return Promise.resolve({data:rows,error}).then(ok,fail);}
  };
}
const client={
  from:read,
  channel:()=>({on(){return this;},subscribe(){return this;}}),removeChannel(){},
  async rpc(name,args){
    if(name==='bes_set_attendance_scrapbook_enabled'){
      if(role!=='admin'||window.attendanceServer.reject)return {error:{message:'Approved admin required'}};
      window.attendanceServer.enabled=args.p_enabled;window.attendanceServer.revision++;
      return {data:[themeRow()]};
    }
    if (name === 'bes_get_extra_attendance_edit_access') {
      const allowed = role === 'admin' && sessions.some(session => session.id === args.p_session_id);
      return {data:{allowed, bypass:allowed, reason:allowed ? 'admin_bypass' : 'edit_window_expired', server_now:new Date().toISOString()}};
    }
    if(name.startsWith('bes_list_')||name.startsWith('bes_get_'))return {data:[]};
    throw Error('Unexpected mutation in read-only attendance fixture: '+name);
  }
};
export const getRuntimeClient=()=>client;
