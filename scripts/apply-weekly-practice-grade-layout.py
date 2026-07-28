from pathlib import Path


def replace_once(text: str, old: str, new: str, label: str) -> str:
    count = text.count(old)
    if count != 1:
        raise RuntimeError(f"{label}: expected exactly one match, found {count}")
    return text.replace(old, new, 1)


bridge_path = Path("src/components/GlobalWeeklyPracticeBridge.jsx")
bridge = bridge_path.read_text(encoding="utf-8")

bridge = replace_once(
    bridge,
    "    grade: 'Tất cả',",
    "    grade: '10',",
    "default grade",
)

bridge = replace_once(
    bridge,
    "    <span>Tối thiểu 45 phút</span>",
    "    <span>Khuyến nghị 45 phút</span>",
    "practice meta duration",
)

practice_meta = """function PracticeMeta({ item, language = 'vi' }) {
  return <div className=\"bes-weekly-meta\">
    <span>File HTML</span>
    <span>{formatBytes(item.file_size)}</span>
    <span>Khuyến nghị 45 phút</span>
    {item.created_at ? <span>Đăng {formatDate(item.created_at, language)}</span> : null}
  </div>;
}
"""
practice_meta_with_grade = practice_meta + """
function getPracticeGrade(item) {
  const explicit = String(item?.grade || '').match(/(?:^|\\D)(10|11|12)(?:\\D|$)/)?.[1];
  if (explicit) return explicit;
  return String(item?.title || '').match(/(?:tiếng\\s*anh|english)\\s*(10|11|12)/i)?.[1] || '10';
}
"""
bridge = replace_once(bridge, practice_meta, practice_meta_with_grade, "practice grade helper")

bridge = replace_once(
    bridge,
    "  ctx.fillText('Ảnh được hệ thống tạo khi học sinh xác nhận sau tối thiểu 45 phút.', 120, 601);",
    "  ctx.fillText('Ảnh được hệ thống tạo khi học sinh xác nhận chắc chắn đã hoàn thành.', 120, 601);",
    "proof footer",
)

bridge = replace_once(
    bridge,
    "      <p>Hệ thống bắt đầu tính 45 phút sau khi em xác nhận thông tin. Em chưa thể gửi bài trước thời gian này.</p>",
    "      <p>Hệ thống bắt đầu tính thời gian sau khi em xác nhận thông tin. Em được phép nộp trước 45 phút nhưng phải xác nhận chắc chắn trước khi gửi.</p>",
    "identity help",
)

bridge = replace_once(
    bridge,
    "        setNotice(activeSeconds >= WEEKLY_PRACTICE_MINIMUM_SECONDS\n          ? 'Nội dung HTML đã báo hoàn thành. Em hãy tạo ảnh xác nhận.'\n          : 'Nội dung HTML đã báo hoàn thành. Hệ thống vẫn khóa gửi bài cho đến đủ 45 phút.');",
    "        setNotice(activeSeconds >= WEEKLY_PRACTICE_MINIMUM_SECONDS\n          ? 'Nội dung HTML đã báo hoàn thành. Em hãy tạo ảnh xác nhận.'\n          : 'Nội dung HTML đã báo hoàn thành. Em có thể nộp sớm sau khi xác nhận chắc chắn.');",
    "html complete notice",
)

bridge = replace_once(
    bridge,
    "  const confirmCompletion = async () => {\n    if (!identity || submitted || activeSeconds < WEEKLY_PRACTICE_MINIMUM_SECONDS) return;\n    if (!window.confirm('Em xác nhận đã làm xong bài và đồng ý tạo ảnh xác nhận hoàn thành?')) return;",
    "  const confirmCompletion = async () => {\n    if (!identity || submitted) return;\n    const earlyNote = activeSeconds < WEEKLY_PRACTICE_MINIMUM_SECONDS\n      ? ` Em mới làm ${formatDuration(activeSeconds)}, chưa đủ 45 phút.`\n      : '';\n    if (!window.confirm(`Em xác nhận đã làm xong bài và đồng ý tạo ảnh xác nhận hoàn thành?${earlyNote}`)) return;",
    "completion guard",
)

bridge = replace_once(
    bridge,
    "  const sendToTtcm = async () => {\n    if (!identity || !proofBlob || submitted || sending) return;\n    setSending(true);",
    "  const sendToTtcm = async () => {\n    if (!identity || !proofBlob || submitted || sending) return;\n    const confirmation = activeSeconds < WEEKLY_PRACTICE_MINIMUM_SECONDS\n      ? `Em mới làm ${formatDuration(activeSeconds)}, chưa đủ 45 phút. Em có chắc chắn đã hoàn thành và vẫn muốn gửi bài cho TTCM không?`\n      : 'Em có chắc chắn đã hoàn thành và muốn gửi bài cho TTCM không?';\n    if (!window.confirm(confirmation)) return;\n    setSending(true);",
    "final submission confirmation",
)

bridge = replace_once(
    bridge,
    "  const remainingSeconds = Math.max(0, WEEKLY_PRACTICE_MINIMUM_SECONDS - activeSeconds);\n  const canConfirm = Boolean(identity) && !submitted && remainingSeconds === 0;",
    "  const remainingSeconds = Math.max(0, WEEKLY_PRACTICE_MINIMUM_SECONDS - activeSeconds);\n  const canConfirm = Boolean(identity) && !submitted;",
    "submission eligibility",
)

bridge = replace_once(
    bridge,
    "<span>{remainingSeconds ? `Còn ${formatDuration(remainingSeconds)} để được nộp` : 'Đã đủ điều kiện xác nhận'}</span>",
    "<span>{remainingSeconds ? `Khuyến nghị thêm ${formatDuration(remainingSeconds)}` : 'Đã làm đủ 45 phút khuyến nghị'}</span>",
    "timer label",
)

bridge = replace_once(
    bridge,
    "<div className=\"bes-weekly-completion-copy\"><strong>{submitted ? '✓ Đã gửi cho TTCM' : proofUrl ? 'Ảnh xác nhận đã sẵn sàng' : remainingSeconds ? 'Chưa thể nộp bài' : 'Đã đủ 45 phút'}</strong><span>{notice || (remainingSeconds ? 'Tiếp tục làm bài. Đồng hồ chỉ tăng khi cửa sổ bài tập đang hiển thị.' : 'Bấm xác nhận để hệ thống tạo ảnh hoàn thành.')}</span></div>",
    "<div className=\"bes-weekly-completion-copy\"><strong>{submitted ? '✓ Đã gửi cho TTCM' : proofUrl ? 'Ảnh xác nhận đã sẵn sàng' : 'Có thể xác nhận hoàn thành'}</strong><span>{notice || (remainingSeconds ? 'Em được phép nộp sớm; hệ thống sẽ yêu cầu xác nhận chắc chắn trước khi gửi.' : 'Bấm xác nhận để hệ thống tạo ảnh hoàn thành.')}</span></div>",
    "completion footer copy",
)

bridge = replace_once(
    bridge,
    "{!proofUrl && !submitted ? <button type=\"button\" disabled={!canConfirm || generatingProof} onClick={confirmCompletion}>{generatingProof ? 'Đang tạo ảnh…' : remainingSeconds ? `Còn ${formatDuration(remainingSeconds)}` : 'Xác nhận đã hoàn thành'}</button> : null}",
    "{!proofUrl && !submitted ? <button type=\"button\" disabled={!canConfirm || generatingProof} onClick={confirmCompletion}>{generatingProof ? 'Đang tạo ảnh…' : 'Xác nhận đã hoàn thành'}</button> : null}",
    "completion button",
)

bridge = replace_once(
    bridge,
    "      await createWeeklyPractice({ form: { ...defaultForm(), title: form.title }, file, currentUser });",
    "      await createWeeklyPractice({ form: { ...defaultForm(), title: form.title, grade: form.grade }, file, currentUser });",
    "manager submit grade",
)

bridge = replace_once(
    bridge,
    "      setMessage('Đã tải lên và công bố bài luyện tập. Học sinh bắt buộc khai báo tên, lớp và làm tối thiểu 45 phút.');",
    "      setMessage(`Đã tải lên và công bố trong cột Tiếng Anh ${form.grade}.`);",
    "manager success message",
)

bridge = replace_once(
    bridge,
    "<p>Tải file HTML; hệ thống tự áp dụng khai báo học sinh, đồng hồ 45 phút, ảnh xác nhận và gửi kết quả cho TTCM.</p>",
    "<p>Tải file HTML, chọn đúng khối lớp; hệ thống tự áp dụng khai báo học sinh, đồng hồ hoạt động, ảnh xác nhận và gửi kết quả cho TTCM.</p>",
    "manager heading description",
)

bridge = replace_once(
    bridge,
    "            <label>Tên bài<input required value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} placeholder=\"Ví dụ: Tiếng Anh 10 – Unit 1\" /></label>\n            <label className=\"bes-weekly-file\">File HTML",
    "            <label>Tên bài<input required value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} placeholder=\"Ví dụ: Tiếng Anh 10 – Unit 1\" /></label>\n            <label>Phân loại<select required value={form.grade} onChange={(event) => setForm({ ...form, grade: event.target.value })}><option value=\"10\">Tiếng Anh 10</option><option value=\"11\">Tiếng Anh 11</option><option value=\"12\">Tiếng Anh 12</option></select></label>\n            <label className=\"bes-weekly-file\">File HTML",
    "manager grade select",
)

bridge = replace_once(
    bridge,
    "<span>Bắt buộc họ tên · Chọn lớp 10.1–10.12, 11.1–11.6, 12.1–12.9 · Không nộp trước 45 phút · Tạo ảnh xác nhận · Gửi TTCM</span>",
    "<span>Bắt buộc họ tên · Chọn lớp 10.1–10.12, 11.1–11.6, 12.1–12.9 · Được nộp sớm sau bước xác nhận chắc chắn · Tạo ảnh xác nhận · Gửi TTCM</span>",
    "manager auto setup note",
)

bridge = replace_once(
    bridge,
    "<span>{formatBytes(practice.file_size)} · Tối thiểu 45 phút · {formatDate(practice.created_at)}</span>",
    "<span>Tiếng Anh {getPracticeGrade(practice)} · {formatBytes(practice.file_size)} · {formatDate(practice.created_at)}</span>",
    "manager list metadata",
)

bridge = replace_once(
    bridge,
    "  const featured = ordered[0] || null;",
    "  const gradeColumns = useMemo(() => ['10', '11', '12'].map((grade) => ({\n    grade,\n    label: `Tiếng Anh ${grade}`,\n    items: ordered.filter((practice) => getPracticeGrade(practice) === grade),\n  })), [ordered]);",
    "grade column data",
)

content_start = bridge.index("  const content = (\n")
content_end = bridge.index("\n\n  return <>", content_start)
new_content = """  const content = (
    <div className=\"bes-weekly-section bes-weekly-section--grades\">
      <div className=\"bes-weekly-heading\"><div><span className=\"bes-weekly-kicker\">WEEKLY ENGLISH PRACTICE</span><h2>Bài luyện tập tiếng Anh theo tuần</h2><p>Chọn đúng khối, khai báo họ tên và lớp, làm bài rồi xác nhận chắc chắn trước khi gửi cho TTCM.</p></div>{canManage ? <button type=\"button\" className=\"bes-weekly-manage-button\" onClick={() => setManagerOpen(true)}>Quản lý bài tuần</button> : null}</div>
      {loading ? <div className=\"bes-weekly-empty\"><span className=\"bes-weekly-spinner\" />Đang tải bài tuần…</div> : null}
      {!loading ? <div className=\"bes-weekly-grade-grid\">{gradeColumns.map((column) => <section className={`bes-weekly-grade-column is-grade-${column.grade}`} key={column.grade}><header className=\"bes-weekly-grade-column__header\"><div><span>KHỐI {column.grade}</span><h3>{column.label}</h3></div><strong>{column.items.length} bài</strong></header><div className=\"bes-weekly-grade-column__list\">{column.items.length ? column.items.map((practice, index) => { const progress = readWeeklyPracticeProgress(practice.id); const availability = getWeeklyPracticeAvailability(practice); return <article className={index === 0 ? 'is-latest' : ''} key={practice.id}><div className=\"bes-weekly-grade-card__top\"><StatusPill item={practice} />{index === 0 ? <span className=\"bes-weekly-grade-card__new\">Mới nhất</span> : null}</div><h4>{practice.title}</h4><PracticeMeta item={practice} language={language} /><div className=\"bes-weekly-grade-card__action\">{progress?.submitted ? <span className=\"bes-weekly-complete\">✓ Đã gửi TTCM</span> : <span>{availability.label}</span>}<button type=\"button\" disabled={!availability.canOpen} onClick={() => start(practice)}>{progress?.submitted ? 'Xem lại' : progress?.identity ? 'Tiếp tục' : 'Mở bài'}</button></div></article>; }) : <div className=\"bes-weekly-grade-empty\"><strong>Chưa có bài</strong><span>{canManage ? `Chọn “${column.label}” khi tải bài lên.` : 'Bài tập đang được chuẩn bị.'}</span></div>}</div></section>)}</div> : null}
      {!loading && !ordered.length ? <div className=\"bes-weekly-empty\"><strong>Bài tuần đang được chuẩn bị</strong><p>{canManage ? error || 'Nhấn “Quản lý bài tuần” để tải file HTML đầu tiên.' : 'Vui lòng quay lại sau để xem bài luyện tập mới.'}</p></div> : null}
      {error && ordered.length && canManage ? <div className=\"bes-weekly-inline-error\">{error}</div> : null}
    </div>
  );"""
bridge = bridge[:content_start] + new_content + bridge[content_end:]
bridge_path.write_text(bridge, encoding="utf-8")

utils_path = Path("src/utils/weeklyPractice.js")
utils = utils_path.read_text(encoding="utf-8")
utils = replace_once(utils, "duration_minutes: Math.max(45, toInteger(item?.duration_minutes, 45)),", "duration_minutes: Math.max(0, toInteger(item?.duration_minutes, 45)),", "normalized duration")
utils = replace_once(utils, "duration_minutes: Math.max(45, toInteger(form?.duration_minutes, 45)),", "duration_minutes: Math.max(0, toInteger(form?.duration_minutes, 45)),", "created duration")
utils = replace_once(utils, "duration_minutes: Math.max(45, toInteger(item?.duration_minutes, 45)),", "duration_minutes: Math.max(0, toInteger(item?.duration_minutes, 45)),", "updated duration")
utils = replace_once(utils, "  if (durationSeconds < WEEKLY_PRACTICE_MINIMUM_SECONDS) throw new Error('Chưa đủ 45 phút để gửi bài.');\n", "", "result minimum duration check")
utils_path.write_text(utils, encoding="utf-8")

statistics_path = Path("src/components/WeeklyPracticeStatisticsPanel.jsx")
statistics = statistics_path.read_text(encoding="utf-8")
statistics = replace_once(statistics, "note=\"Mỗi bài nộp tối thiểu 45 phút\"", "note=\"Thời lượng hoạt động thực tế\"", "statistics duration note")
statistics = replace_once(statistics, "Học sinh phải đủ 45 phút, tạo ảnh xác nhận và bấm “Gửi cho TTCM” thì mới xuất hiện tại đây.", "Học sinh tạo ảnh xác nhận, xác nhận chắc chắn và bấm “Gửi cho TTCM” thì mới xuất hiện tại đây.", "statistics empty note")
statistics_path.write_text(statistics, encoding="utf-8")

navigation_path = Path("src/components/GlobalFlatNavigation.jsx")
navigation = navigation_path.read_text(encoding="utf-8")
navigation = replace_once(navigation, "import './GlobalWeeklyPracticeStudentProof.css';", "import './GlobalWeeklyPracticeStudentProof.css';\nimport './GlobalWeeklyPracticeGradeColumns.css';", "grade column css import")
navigation_path.write_text(navigation, encoding="utf-8")

css = r"""
.bes-weekly-section--grades{padding-top:26px;padding-bottom:34px}
.bes-weekly-grade-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:20px;margin-top:22px}
.bes-weekly-grade-column{--grade-accent:#4f72d8;--grade-soft:#edf2ff;overflow:hidden;border:1px solid rgba(54,72,102,.12);border-radius:28px;background:rgba(255,255,255,.9);box-shadow:0 20px 50px rgba(30,43,68,.09);backdrop-filter:blur(18px)}
.bes-weekly-grade-column.is-grade-11{--grade-accent:#7750d6;--grade-soft:#f1edff}
.bes-weekly-grade-column.is-grade-12{--grade-accent:#2f8b68;--grade-soft:#e9f7f1}
.bes-weekly-grade-column__header{display:flex;align-items:center;justify-content:space-between;gap:14px;padding:22px 22px 18px;background:linear-gradient(135deg,var(--grade-soft),#fff)}
.bes-weekly-grade-column__header div{display:grid;gap:4px}.bes-weekly-grade-column__header span{color:var(--grade-accent);font-size:.72rem;font-weight:950;letter-spacing:.12em}.bes-weekly-grade-column__header h3{margin:0;color:#17233a;font-size:1.55rem;letter-spacing:-.035em}.bes-weekly-grade-column__header>strong{display:grid;place-items:center;min-width:58px;height:42px;padding:0 10px;border-radius:14px;background:#fff;color:var(--grade-accent);font-size:.8rem;box-shadow:0 8px 24px rgba(28,43,71,.08)}
.bes-weekly-grade-column__list{display:grid;gap:13px;padding:15px}.bes-weekly-grade-column__list article{display:grid;gap:12px;padding:18px;border:1px solid rgba(46,60,83,.1);border-radius:20px;background:#fff;box-shadow:0 10px 26px rgba(31,45,71,.055);transition:transform .2s ease,box-shadow .2s ease,border-color .2s ease}.bes-weekly-grade-column__list article:hover{transform:translateY(-3px);border-color:color-mix(in srgb,var(--grade-accent) 30%,transparent);box-shadow:0 16px 34px rgba(31,45,71,.1)}.bes-weekly-grade-column__list article.is-latest{border-color:color-mix(in srgb,var(--grade-accent) 34%,transparent);background:linear-gradient(160deg,#fff,var(--grade-soft))}
.bes-weekly-grade-card__top,.bes-weekly-grade-card__action{display:flex;align-items:center;justify-content:space-between;gap:10px}.bes-weekly-grade-card__new{padding:6px 9px;border-radius:999px;background:var(--grade-accent);color:#fff;font-size:.67rem;font-weight:900}.bes-weekly-grade-column h4{margin:0;color:#152238;font-size:1.04rem;line-height:1.35}.bes-weekly-grade-column .bes-weekly-meta{gap:6px}.bes-weekly-grade-column .bes-weekly-meta span{padding:6px 8px;border-radius:9px;background:#f4f6f1;font-size:.69rem}.bes-weekly-grade-card__action>span{color:#6a7463;font-size:.76rem;font-weight:800}.bes-weekly-grade-card__action>button{min-height:42px;padding:0 16px;border:0;border-radius:13px;background:var(--grade-accent);color:#fff;font:inherit;font-size:.82rem;font-weight:900;cursor:pointer;box-shadow:0 9px 20px color-mix(in srgb,var(--grade-accent) 24%,transparent)}.bes-weekly-grade-card__action>button:disabled{opacity:.5;cursor:not-allowed;box-shadow:none}.bes-weekly-grade-empty{display:grid;place-items:center;min-height:180px;padding:22px;text-align:center;color:#78816f}.bes-weekly-grade-empty strong{color:#394634;font-size:1rem}.bes-weekly-grade-empty span{max-width:220px;font-size:.78rem;line-height:1.5}
.bes-weekly-form--simple select{width:100%;box-sizing:border-box;min-height:48px;padding:10px 12px;border:1px solid #d9dfd1;border-radius:13px;background:#fff;color:#202719;font:inherit;outline:none}.bes-weekly-form--simple select:focus{border-color:#9bac42;box-shadow:0 0 0 3px rgba(178,194,72,.2)}
html[data-theme='dark'] .bes-weekly-grade-column{border-color:#3c4738;background:rgba(34,42,31,.94)}html[data-theme='dark'] .bes-weekly-grade-column__header{background:linear-gradient(135deg,#303a2d,#252d22)}html[data-theme='dark'] .bes-weekly-grade-column__header h3,html[data-theme='dark'] .bes-weekly-grade-column h4{color:#eef4e9}html[data-theme='dark'] .bes-weekly-grade-column__header>strong,html[data-theme='dark'] .bes-weekly-grade-column__list article{background:#293226}html[data-theme='dark'] .bes-weekly-grade-column__list article.is-latest{background:linear-gradient(160deg,#293226,#313b2d)}html[data-theme='dark'] .bes-weekly-grade-column .bes-weekly-meta span{background:#35402f;color:#dce5d6}html[data-theme='dark'] .bes-weekly-form--simple select{border-color:#485442;background:#30382d;color:#edf3e8}
@media(max-width:1180px){.bes-weekly-grade-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.bes-weekly-grade-column.is-grade-12{grid-column:1/-1}}
@media(max-width:760px){.bes-weekly-grade-grid{grid-template-columns:1fr}.bes-weekly-grade-column.is-grade-12{grid-column:auto}.bes-weekly-grade-column__header{padding:18px}.bes-weekly-grade-column__list{padding:12px}.bes-weekly-grade-card__action{align-items:stretch;flex-direction:column}.bes-weekly-grade-card__action>button{width:100%}}
""".strip() + "\n"
Path("src/components/GlobalWeeklyPracticeGradeColumns.css").write_text(css, encoding="utf-8")

migration = r"""-- Brian English Studio: optional early submission and grade-column classification v3

-- Existing uploaded items are assigned to a grade column from their title when possible.
update public.weekly_practice_items
set grade = '10'
where title ~* '(tiếng[[:space:]]*anh|english)[[:space:]]*10';

update public.weekly_practice_items
set grade = '11'
where title ~* '(tiếng[[:space:]]*anh|english)[[:space:]]*11';

update public.weekly_practice_items
set grade = '12'
where title ~* '(tiếng[[:space:]]*anh|english)[[:space:]]*12';

-- Students may submit before 45 minutes. Duration remains recorded for TTCM statistics.
alter table public.weekly_practice_results
  drop constraint if exists weekly_practice_result_minimum_duration;

alter table public.weekly_practice_results
  add constraint weekly_practice_result_non_negative_duration
  check (duration_seconds is null or duration_seconds >= 0) not valid;

-- Replace the insert policy from v2 without the 45-minute minimum.
drop policy if exists "Public can submit enabled weekly practice results" on public.weekly_practice_results;
create policy "Public can submit enabled weekly practice results"
on public.weekly_practice_results
for insert
to anon, authenticated
with check (
  char_length(btrim(student_name)) between 2 and 120
  and class_code in (
    '10.1','10.2','10.3','10.4','10.5','10.6','10.7','10.8','10.9','10.10','10.11','10.12',
    '11.1','11.2','11.3','11.4','11.5','11.6',
    '12.1','12.2','12.3','12.4','12.5','12.6','12.7','12.8','12.9'
  )
  and coalesce(duration_seconds, 0) >= 0
  and char_length(proof_path) between 1 and 500
  and proof_path like practice_id::text || '/%'
  and exists (
    select 1
    from public.weekly_practice_items item
    where item.id = practice_id
      and item.status = 'published'
      and item.collect_results = true
  )
);

comment on column public.weekly_practice_items.grade is
  'Home column classification: 10, 11 or 12 for weekly English practice.';
""".strip() + "\n"
Path("supabase/migrations/20260728050000_weekly_practice_early_submit_grade_columns_v3.sql").write_text(migration, encoding="utf-8")

# Remove the temporary patch infrastructure before committing the real product changes.
for temporary in [
    Path("scripts/apply-weekly-practice-grade-layout.py"),
    Path(".github/workflows/apply-weekly-practice-grade-layout.yml"),
]:
    if temporary.exists():
        temporary.unlink()
