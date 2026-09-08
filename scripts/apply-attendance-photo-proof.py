from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
component_path = ROOT / 'src/components/GlobalAttendanceNavigationTab.jsx'
css_path = ROOT / 'src/components/attendance/AttendanceMaterial3.css'
utility_path = ROOT / 'src/utils/attendanceProofImage.js'
migration_path = ROOT / 'supabase/migrations/20260908_attendance_photo_proof.sql'


def replace_once(text: str, needle: str, replacement: str, label: str) -> str:
    count = text.count(needle)
    if count != 1:
        raise RuntimeError(f'{label}: expected one anchor, found {count}')
    return text.replace(needle, replacement, 1)


utility_path.write_text(r'''export const ATTENDANCE_PROOF_BUCKET = 'attendance-session-proofs';
export const ATTENDANCE_PROOF_MAX_EDGE = 1600;
export const ATTENDANCE_PROOF_MAX_BYTES = 1_500_000;

function decodeImage(file) {
  if (typeof createImageBitmap === 'function') return createImageBitmap(file);
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Không thể đọc ảnh đã chọn.'));
    };
    image.src = url;
  });
}

function canvasToJpeg(canvas, quality) {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error('Không thể nén ảnh minh chứng.'));
    }, 'image/jpeg', quality);
  });
}

export async function prepareAttendanceProofImage(file) {
  if (!file || typeof file.type !== 'string' || !file.type.startsWith('image/')) {
    throw new Error('Vui lòng chọn một tệp hình ảnh.');
  }
  if (typeof document === 'undefined') throw new Error('Thiết bị hiện tại không hỗ trợ xử lý ảnh.');

  const source = await decodeImage(file);
  const sourceWidth = Number(source.width || source.naturalWidth || 0);
  const sourceHeight = Number(source.height || source.naturalHeight || 0);
  if (!sourceWidth || !sourceHeight) {
    if (typeof source.close === 'function') source.close();
    throw new Error('Ảnh minh chứng không có kích thước hợp lệ.');
  }

  const scale = Math.min(1, ATTENDANCE_PROOF_MAX_EDGE / Math.max(sourceWidth, sourceHeight));
  const width = Math.max(1, Math.round(sourceWidth * scale));
  const height = Math.max(1, Math.round(sourceHeight * scale));
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d', { alpha: false });
  if (!context) {
    if (typeof source.close === 'function') source.close();
    throw new Error('Trình duyệt không thể chuẩn bị ảnh minh chứng.');
  }
  context.fillStyle = '#fff';
  context.fillRect(0, 0, width, height);
  context.drawImage(source, 0, 0, width, height);
  if (typeof source.close === 'function') source.close();

  let quality = 0.86;
  let blob = await canvasToJpeg(canvas, quality);
  while (blob.size > ATTENDANCE_PROOF_MAX_BYTES && quality > 0.55) {
    quality = Math.max(0.55, quality - 0.08);
    blob = await canvasToJpeg(canvas, quality);
  }
  if (blob.size > ATTENDANCE_PROOF_MAX_BYTES) {
    throw new Error('Ảnh vẫn quá lớn sau khi nén. Vui lòng chọn ảnh khác.');
  }
  return blob;
}

export function buildAttendanceProofPath(sessionId) {
  const id = String(sessionId || '').trim();
  if (!id) throw new Error('Không xác định được buổi điểm danh để lưu minh chứng.');
  return `${id}/${Date.now()}-attendance-proof.jpg`;
}
''', encoding='utf-8')

migration_path.write_text(r'''-- 2026-09-08: optional private photo evidence for completed extra-class attendance sessions.

alter table public.bes_extra_attendance_sessions
  add column if not exists proof_path text;

comment on column public.bes_extra_attendance_sessions.proof_path is
  'Optional private Storage object path for one attendance photo proof.';

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'attendance-session-proofs',
  'attendance-session-proofs',
  false,
  2097152,
  array['image/jpeg','image/png','image/webp']
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

create or replace function public.can_view_extra_attendance_proof()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.approved = true
      and (
        lower(coalesce(p.role, '')) in ('admin', 'administrator')
        or coalesce(p.permissions -> 'allowed', '[]'::jsonb) ? 'route:attendance'
        or coalesce(p.permissions -> 'allowed', '[]'::jsonb) ? 'attendance:history'
      )
  );
$$;

revoke all on function public.can_view_extra_attendance_proof() from public;
grant execute on function public.can_view_extra_attendance_proof() to authenticated;

drop policy if exists "Attendance takers upload session proof" on storage.objects;
create policy "Attendance takers upload session proof"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'attendance-session-proofs'
  and public.can_take_extra_class_attendance()
  and exists (
    select 1
    from public.bes_extra_attendance_sessions s
    where s.id::text = split_part(name, '/', 1)
      and s.session_status = 'completed'
      and s.checked_by = auth.uid()
  )
);

drop policy if exists "Attendance history viewers read session proof" on storage.objects;
create policy "Attendance history viewers read session proof"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'attendance-session-proofs'
  and public.can_view_extra_attendance_proof()
);

drop policy if exists "Attendance editors delete session proof" on storage.objects;
create policy "Attendance editors delete session proof"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'attendance-session-proofs'
  and (
    public.can_take_extra_class_attendance()
    or public.can_manage_extra_class_roster()
  )
);

create or replace function public.bes_set_extra_attendance_proof(
  p_session_id uuid,
  p_proof_path text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_path text := btrim(coalesce(p_proof_path, ''));
  v_updated integer := 0;
begin
  if not public.can_take_extra_class_attendance() then
    raise exception 'Bạn không có quyền lưu minh chứng điểm danh.';
  end if;
  if v_path = '' or length(v_path) > 500 or v_path not like p_session_id::text || '/%' then
    raise exception 'Đường dẫn ảnh minh chứng không hợp lệ.';
  end if;

  update public.bes_extra_attendance_sessions
  set proof_path = v_path
  where id = p_session_id
    and session_status = 'completed'
    and checked_by = auth.uid();
  get diagnostics v_updated = row_count;

  if v_updated <> 1 then
    raise exception 'Không tìm thấy buổi điểm danh đã chốt thuộc người dùng hiện tại.';
  end if;
end;
$$;

revoke all on function public.bes_set_extra_attendance_proof(uuid,text) from public;
grant execute on function public.bes_set_extra_attendance_proof(uuid,text) to authenticated;
''', encoding='utf-8')

component = component_path.read_text(encoding='utf-8')

if "../utils/attendanceProofImage.js" not in component:
    component = replace_once(
        component,
        "import './attendance/AttendanceMaterial3.css';",
        "import { ATTENDANCE_PROOF_BUCKET, buildAttendanceProofPath, prepareAttendanceProofImage } from '../utils/attendanceProofImage.js';\nimport './attendance/AttendanceMaterial3.css';",
        'proof utility import',
    )

component = replace_once(
    component,
    "const SESSION_COLUMNS = 'id,class_id,class_type,class_name,subject,teacher_id,teacher_name,teacher_email,attendance_date,checked_at,checked_by,total_students,present_count,absent_count,note,session_status,lesson_periods,cancellation_reason,teaching_room,teaching_time_range,created_at';",
    "const SESSION_COLUMNS = 'id,class_id,class_type,class_name,subject,teacher_id,teacher_name,teacher_email,attendance_date,checked_at,checked_by,total_students,present_count,absent_count,note,session_status,lesson_periods,cancellation_reason,teaching_room,teaching_time_range,proof_path,created_at';",
    'session proof column',
)

component = replace_once(
    component,
    "  const [reportMonth, setReportMonth] = useState(today.slice(0, 7));\n  const fileRef = useRef(null);",
    "  const [reportMonth, setReportMonth] = useState(today.slice(0, 7));\n  const [proofFile, setProofFile] = useState(null);\n  const [proofPreviewUrl, setProofPreviewUrl] = useState('');\n  const [historyProofUrl, setHistoryProofUrl] = useState('');\n  const [historyProofLoading, setHistoryProofLoading] = useState(false);\n  const fileRef = useRef(null);\n  const proofInputRef = useRef(null);",
    'proof state',
)

component = replace_once(
    component,
    "  function toggleAbsent(memberKeyValue) {",
    "  useEffect(() => {\n    if (proofPreviewUrl) URL.revokeObjectURL(proofPreviewUrl);\n    setProofFile(null);\n    setProofPreviewUrl('');\n    if (proofInputRef.current) proofInputRef.current.value = '';\n  }, [selectedClassId, attendanceDate]);\n\n  useEffect(() => () => {\n    if (proofPreviewUrl) URL.revokeObjectURL(proofPreviewUrl);\n  }, [proofPreviewUrl]);\n\n  function toggleAbsent(memberKeyValue) {",
    'proof reset effects',
)

helpers = r'''  function clearProofSelection() {
    if (proofPreviewUrl) URL.revokeObjectURL(proofPreviewUrl);
    setProofFile(null);
    setProofPreviewUrl('');
    if (proofInputRef.current) proofInputRef.current.value = '';
  }

  function chooseProofFile(file) {
    if (!file) return;
    if (!String(file.type || '').startsWith('image/')) {
      setError('Vui lòng chọn một tệp hình ảnh để làm minh chứng.');
      return;
    }
    if (proofPreviewUrl) URL.revokeObjectURL(proofPreviewUrl);
    setProofFile(file);
    setProofPreviewUrl(URL.createObjectURL(file));
    setError('');
  }

  async function uploadAttendanceProof(session) {
    if (!proofFile || !session?.id || !client) return '';
    const prepared = await prepareAttendanceProofImage(proofFile);
    const proofPath = buildAttendanceProofPath(session.id);
    const { error: uploadError } = await client.storage
      .from(ATTENDANCE_PROOF_BUCKET)
      .upload(proofPath, prepared, { contentType: 'image/jpeg', upsert: false });
    if (uploadError) throw uploadError;

    const { error: attachError } = await client.rpc('bes_set_extra_attendance_proof', {
      p_session_id: session.id,
      p_proof_path: proofPath,
    });
    if (attachError) {
      await client.storage.from(ATTENDANCE_PROOF_BUCKET).remove([proofPath]);
      throw attachError;
    }
    clearProofSelection();
    return proofPath;
  }

  async function removeAttendanceProofPaths(paths) {
    const cleanPaths = Array.from(new Set((paths || []).map((value) => String(value || '').trim()).filter(Boolean)));
    if (!client || !cleanPaths.length) return;
    const { error: removeError } = await client.storage.from(ATTENDANCE_PROOF_BUCKET).remove(cleanPaths);
    if (removeError) console.warn('Không thể dọn ảnh minh chứng điểm danh:', removeError.message || removeError);
  }

'''
component = replace_once(component, "  async function confirmAttendance() {", helpers + "  async function confirmAttendance() {", 'proof helpers')

old_confirm = r'''      const created = Array.isArray(data) ? data[0] : data;
      setDaySession(created || null);
      setNotice(`Đã chốt điểm danh ${selectedClass.class_name} ngày ${formatDate(attendanceDate)} · GV ${sessionTeacher} · ${summary.present}/${summary.total} có mặt.`);
      await loadAll();
      await loadDaySession();
      await loadTeacherDaySessions();
      await loadMonthlySessions();'''
new_confirm = r'''      const created = Array.isArray(data) ? data[0] : data;
      setDaySession(created || null);
      let proofSaved = false;
      let proofUploadFailure = '';
      if (proofFile && created?.id) {
        try {
          await uploadAttendanceProof(created);
          proofSaved = true;
        } catch (proofError) {
          proofUploadFailure = proofError?.message || 'Không thể tải ảnh minh chứng lên hệ thống.';
          clearProofSelection();
        }
      }
      await loadAll();
      await loadDaySession();
      await loadTeacherDaySessions();
      await loadMonthlySessions();
      setNotice(`Đã chốt điểm danh ${selectedClass.class_name} ngày ${formatDate(attendanceDate)} · GV ${sessionTeacher} · ${summary.present}/${summary.total} có mặt.${proofSaved ? ' · Đã lưu ảnh minh chứng.' : ''}`);
      if (proofUploadFailure) setError(`Điểm danh đã được chốt, nhưng ảnh minh chứng chưa được lưu: ${proofUploadFailure}`);'''
component = replace_once(component, old_confirm, new_confirm, 'confirm attendance proof upload')

component = replace_once(
    component,
    "      const { error: deleteError } = await client.rpc('bes_delete_extra_class', { p_class_id: classRow.id });\n      if (deleteError) throw deleteError;\n      if (String(selectedClassId) === String(classRow.id)) setSelectedClassId('');",
    "      const classProofPaths = sessions.filter((session) => String(session.class_id) === String(classRow.id)).map((session) => session.proof_path);\n      const { error: deleteError } = await client.rpc('bes_delete_extra_class', { p_class_id: classRow.id });\n      if (deleteError) throw deleteError;\n      await removeAttendanceProofPaths(classProofPaths);\n      if (String(selectedClassId) === String(classRow.id)) setSelectedClassId('');",
    'class proof cleanup',
)

component = replace_once(
    component,
    "      const { error: deleteError } = await client.rpc('bes_delete_extra_attendance_session', { p_session_id: session.id });\n      if (deleteError) throw deleteError;\n      setSelectedSessionId(''); setRecords([]);",
    "      const { error: deleteError } = await client.rpc('bes_delete_extra_attendance_session', { p_session_id: session.id });\n      if (deleteError) throw deleteError;\n      await removeAttendanceProofPaths([session.proof_path]);\n      setSelectedSessionId(''); setRecords([]);",
    'single session proof cleanup',
)

component = replace_once(
    component,
    "    const failed = [];\n    const deletedIds = new Set();\n    try {",
    "    const failed = [];\n    const deletedIds = new Set();\n    const proofPathsToRemove = [];\n    try {",
    'bulk proof cleanup state',
)
component = replace_once(
    component,
    "        } else {\n          deletedIds.add(String(session.id));\n        }",
    "        } else {\n          deletedIds.add(String(session.id));\n          if (session.proof_path) proofPathsToRemove.push(session.proof_path);\n        }",
    'bulk proof cleanup collect',
)
component = replace_once(
    component,
    "      }\n      if (deletedIds.has(String(selectedSessionId))) {",
    "      }\n      await removeAttendanceProofPaths(proofPathsToRemove);\n      if (deletedIds.has(String(selectedSessionId))) {",
    'bulk proof cleanup remove',
)

history_effect = r'''  const selectedSession = sessions.find((session) => String(session.id) === String(selectedSessionId)) || monthlySessions.find((session) => String(session.id) === String(selectedSessionId));

  useEffect(() => {
    let cancelled = false;
    setHistoryProofUrl('');
    if (!client || view !== 'history' || !canAccessAttendanceView('history') || !selectedSession?.proof_path) {
      setHistoryProofLoading(false);
      return undefined;
    }
    setHistoryProofLoading(true);
    client.storage.from(ATTENDANCE_PROOF_BUCKET).createSignedUrl(selectedSession.proof_path, 300)
      .then(({ data, error: signedUrlError }) => {
        if (cancelled) return;
        setHistoryProofLoading(false);
        if (signedUrlError) {
          setHistoryProofUrl('');
          return;
        }
        setHistoryProofUrl(data?.signedUrl || '');
      });
    return () => { cancelled = true; };
  }, [view, selectedSession?.id, selectedSession?.proof_path, currentUser?.permissions, systemRole]);

  const selectedAbsentRecords = records.filter((record) => record.status === 'absent');'''
component = replace_once(
    component,
    "  const selectedSession = sessions.find((session) => String(session.id) === String(selectedSessionId)) || monthlySessions.find((session) => String(session.id) === String(selectedSessionId));\n  const selectedAbsentRecords = records.filter((record) => record.status === 'absent');",
    history_effect,
    'history signed URL effect',
)

proof_card = r'''                  <section className={`att-m3-proof-card ${isDayLocked ? 'is-locked' : ''}`}>
                    <div className="att-m3-proof-card-head"><span aria-hidden="true">📷</span><div><strong>Minh chứng hình ảnh</strong><small>Không bắt buộc · 01 ảnh cho mỗi buổi điểm danh</small></div>{daySession?.proof_path ? <em>Đã lưu</em> : null}</div>
                    <input ref={proofInputRef} type="file" accept="image/*" capture="environment" hidden disabled={isDayLocked} onChange={(event) => chooseProofFile(event.target.files?.[0])} />
                    {proofPreviewUrl && !isDayLocked ? <div className="att-m3-proof-preview"><img src={proofPreviewUrl} alt="Ảnh minh chứng đang chọn" /><div><b>Ảnh đã sẵn sàng</b><span>Ảnh sẽ được nén và lưu khi xác nhận điểm danh.</span><p><button type="button" onClick={() => proofInputRef.current?.click()}>Đổi ảnh</button><button type="button" className="is-remove" onClick={clearProofSelection}>Xóa ảnh</button></p></div></div> : !isDayLocked ? <button className="att-m3-proof-picker" type="button" onClick={() => proofInputRef.current?.click()}><span aria-hidden="true">📷</span><b>Chụp ảnh / Chọn ảnh</b><small>Tùy chọn, không ảnh hưởng việc xác nhận điểm danh</small></button> : <div className="att-m3-proof-locked-note">{daySession?.proof_path ? 'Buổi này đã có ảnh minh chứng. Xem ảnh tại tab Lịch sử.' : 'Buổi này đã chốt và không có ảnh minh chứng.'}</div>}
                  </section>
'''
component = replace_once(component, '                  <footer className="attendance-confirm-bar">', proof_card + '                  <footer className="attendance-confirm-bar">', 'quick proof card')

history_proof = r'''                {selectedSession.proof_path ? <section className="attendance-history-proof"><header><div><span aria-hidden="true">📷</span><div><strong>Minh chứng hình ảnh</strong><small>Ảnh được lưu riêng tư và chỉ mở bằng liên kết tạm thời.</small></div></div>{historyProofUrl ? <a href={historyProofUrl} target="_blank" rel="noreferrer">Mở ảnh lớn</a> : null}</header>{historyProofLoading ? <div className="attendance-history-proof-loading">Đang tải ảnh minh chứng…</div> : historyProofUrl ? <a className="attendance-history-proof-image" href={historyProofUrl} target="_blank" rel="noreferrer"><img src={historyProofUrl} alt={`Minh chứng điểm danh ${selectedSession.class_name} ngày ${formatDate(selectedSession.attendance_date)}`} /></a> : <div className="attendance-history-proof-loading">Không thể tải ảnh minh chứng lúc này.</div>}</section> : null}

'''
component = replace_once(component, "                {selectedSession.session_status === 'cancelled' ? <>", history_proof + "                {selectedSession.session_status === 'cancelled' ? <>", 'history proof viewer')

component_path.write_text(component, encoding='utf-8')

css = css_path.read_text(encoding='utf-8')
if '.att-m3-proof-card{' not in css:
    css += r'''

/* Optional private attendance photo proof */
.att-m3-proof-card{margin-top:12px;padding:12px;border:1px solid color-mix(in srgb,var(--att-m3-primary) 18%,var(--att-m3-outline-variant));border-radius:18px;background:color-mix(in srgb,var(--att-m3-primary-container) 34%,var(--att-m3-surface));box-shadow:0 1px 5px rgba(35,42,58,.06)}
.att-m3-proof-card-head{display:flex;align-items:center;gap:10px}.att-m3-proof-card-head>span{display:grid;place-items:center;width:34px;height:34px;border-radius:12px;background:var(--att-m3-primary-container);font-size:18px}.att-m3-proof-card-head>div{display:grid;gap:2px;min-width:0}.att-m3-proof-card-head strong{font-size:12px;color:var(--att-m3-on-surface)}.att-m3-proof-card-head small{font-size:9px;color:var(--att-m3-on-variant)}.att-m3-proof-card-head em{margin-left:auto;padding:5px 8px;border-radius:999px;background:var(--att-m3-success-container);color:var(--att-m3-success);font-size:9px;font-style:normal;font-weight:900}.att-m3-proof-picker{display:grid;grid-template-columns:auto 1fr;column-gap:9px;row-gap:1px;align-items:center;width:100%;margin-top:10px;padding:10px 12px;border:1px dashed color-mix(in srgb,var(--att-m3-primary) 38%,var(--att-m3-outline-variant));border-radius:14px;background:var(--att-m3-surface);color:var(--att-m3-primary);font:inherit;text-align:left;cursor:pointer}.att-m3-proof-picker>span{grid-row:1/3;font-size:18px}.att-m3-proof-picker b{font-size:11px}.att-m3-proof-picker small{font-size:9px;color:var(--att-m3-on-variant)}.att-m3-proof-picker:hover{background:color-mix(in srgb,var(--att-m3-primary-container) 38%,var(--att-m3-surface))}.att-m3-proof-preview{display:grid;grid-template-columns:118px 1fr;gap:12px;align-items:center;margin-top:10px;padding:9px;border-radius:14px;background:var(--att-m3-surface)}.att-m3-proof-preview img{width:118px;height:78px;object-fit:cover;border-radius:11px}.att-m3-proof-preview>div{display:grid;gap:3px}.att-m3-proof-preview b{font-size:11px}.att-m3-proof-preview span{font-size:9px;color:var(--att-m3-on-variant)}.att-m3-proof-preview p{display:flex;gap:6px;margin:4px 0 0}.att-m3-proof-preview button{height:30px;border:0;border-radius:10px;padding:0 10px;background:var(--att-m3-secondary-container);color:var(--att-m3-primary);font:inherit;font-size:9px;font-weight:900;cursor:pointer}.att-m3-proof-preview button.is-remove{background:var(--att-m3-danger-container);color:var(--att-m3-danger)}.att-m3-proof-locked-note{margin-top:9px;padding:9px 11px;border-radius:12px;background:var(--att-m3-surface-container);color:var(--att-m3-on-variant);font-size:9px;font-weight:700}.att-m3-proof-card.is-locked{background:var(--att-m3-surface-container)}
.attendance-history-proof{margin:12px 0;padding:12px;border-radius:18px;background:color-mix(in srgb,var(--att-m3-primary-container) 38%,var(--att-m3-surface));border:1px solid color-mix(in srgb,var(--att-m3-primary) 16%,var(--att-m3-outline-variant))}.attendance-history-proof>header{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:10px}.attendance-history-proof>header>div{display:flex;align-items:center;gap:9px}.attendance-history-proof>header>div>span{display:grid;place-items:center;width:34px;height:34px;border-radius:12px;background:var(--att-m3-primary-container);font-size:18px}.attendance-history-proof>header>div>div{display:grid;gap:2px}.attendance-history-proof strong{font-size:12px}.attendance-history-proof small{font-size:9px;color:var(--att-m3-on-variant)}.attendance-history-proof>header>a{flex:0 0 auto;padding:7px 10px;border-radius:10px;background:var(--att-m3-primary);color:var(--att-m3-on-primary);font-size:9px;font-weight:900;text-decoration:none}.attendance-history-proof-image{display:block;overflow:hidden;border-radius:14px;background:var(--att-m3-surface)}.attendance-history-proof-image img{display:block;width:100%;max-height:330px;object-fit:contain;background:#111}.attendance-history-proof-loading{display:grid;place-items:center;min-height:92px;border-radius:14px;background:var(--att-m3-surface);color:var(--att-m3-on-variant);font-size:10px;font-weight:750}
@media(max-width:760px){.att-m3-proof-preview{grid-template-columns:92px 1fr}.att-m3-proof-preview img{width:92px;height:68px}.attendance-history-proof>header{align-items:flex-start;flex-direction:column}.attendance-history-proof>header>a{align-self:flex-start}}
'''
    css_path.write_text(css, encoding='utf-8')

print('Attendance photo-proof implementation applied.')
