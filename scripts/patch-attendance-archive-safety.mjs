import fs from 'node:fs';

const path = 'supabase/migrations/20260914_attendance_archive.sql';
let source = fs.readFileSync(path, 'utf8');

function replaceOnce(before, after, label) {
  const count = source.split(before).length - 1;
  if (count !== 1) throw new Error(`${label}: expected exactly one match, found ${count}`);
  source = source.replace(before, after);
}

replaceOnce(
  "check (delete_request_status in ('none', 'pending', 'rejected'))",
  "check (delete_request_status in ('none', 'pending', 'approved', 'rejected'))",
  'approved request state',
);

replaceOnce(
  "  if not found then\n    raise exception 'Không tìm thấy mục lưu trữ cần khôi phục.' using errcode = 'P0002';\n  end if;\n\n  if v_archive.source_type = 'extra' then",
  "  if not found then\n    raise exception 'Không tìm thấy mục lưu trữ cần khôi phục.' using errcode = 'P0002';\n  end if;\n  if v_archive.delete_request_status = 'approved' then\n    raise exception 'Mục này đã được Admin duyệt xóa và đang chờ hoàn tất, không thể khôi phục.' using errcode = '22023';\n  end if;\n\n  if v_archive.source_type = 'extra' then",
  'block restore after approval',
);

replaceOnce(
  "    if exists (select 1 from public.bes_supplemental_sessions s where s.id = v_supp.id) then\n      update public.bes_supplemental_sessions s",
  "    if exists (select 1 from public.bes_supplemental_sessions s where s.id = v_supp.id) then\n      if exists (\n        select 1\n        from public.bes_supplemental_sessions s\n        where s.id = v_supp.id\n          and (\n            s.status <> 'scheduled'\n            or s.roster_frozen_at is not null\n            or s.attendance_confirmed_at is not null\n            or s.checked_by is not null\n            or trim(coalesce(s.proof_path, '')) <> ''\n          )\n      ) then\n        raise exception 'Buổi Học bổ sung này đã có dữ liệu điểm danh mới. Không thể khôi phục chồng dữ liệu.' using errcode = '23505';\n      end if;\n\n      update public.bes_supplemental_sessions s",
  'protect supplemental re-attendance',
);

replaceOnce(
  "  if not found then\n    raise exception 'Không tìm thấy mục lưu trữ.' using errcode = 'P0002';\n  end if;\n\n  update public.bes_attendance_archive a\n  set delete_request_status = 'pending',",
  "  if not found then\n    raise exception 'Không tìm thấy mục lưu trữ.' using errcode = 'P0002';\n  end if;\n  if v_archive.delete_request_status = 'approved' then\n    raise exception 'Mục này đã được Admin duyệt xóa và đang chờ hoàn tất.' using errcode = '22023';\n  end if;\n\n  update public.bes_attendance_archive a\n  set delete_request_status = 'pending',",
  'protect approved delete request',
);

replaceOnce(
  "  if v_archive.delete_request_status <> 'pending' then\n    raise exception 'Mục này không có yêu cầu xóa đang chờ duyệt.' using errcode = '22023';\n  end if;\n\n  if coalesce(p_approve, false) then\n    if trim(coalesce(v_archive.proof_path, '')) <> '' then\n      delete from storage.objects o\n      where o.bucket_id = 'attendance-session-proofs'\n        and o.name = v_archive.proof_path;\n    end if;\n    delete from public.bes_attendance_archive a where a.id = p_archive_id;\n    return jsonb_build_object(\n      'archive_id', p_archive_id,\n      'approved', true,\n      'permanently_deleted', true,\n      'reviewed_by', v_uid,\n      'note', trim(coalesce(p_note, ''))\n    );\n  end if;",
  "  if v_archive.delete_request_status not in ('pending', 'approved') then\n    raise exception 'Mục này không có yêu cầu xóa đang chờ duyệt.' using errcode = '22023';\n  end if;\n\n  if coalesce(p_approve, false) then\n    update public.bes_attendance_archive a\n    set delete_request_status = 'approved',\n        delete_reviewed_by = v_uid,\n        delete_reviewed_at = clock_timestamp(),\n        delete_review_note = trim(coalesce(p_note, ''))\n    where a.id = p_archive_id;\n\n    return jsonb_build_object(\n      'archive_id', p_archive_id,\n      'approved', true,\n      'ready_for_permanent_delete', true,\n      'proof_path', v_archive.proof_path,\n      'reviewed_by', v_uid,\n      'note', trim(coalesce(p_note, ''))\n    );\n  end if;\n\n  if v_archive.delete_request_status = 'approved' then\n    raise exception 'Yêu cầu này đã được duyệt xóa, không thể chuyển sang từ chối.' using errcode = '22023';\n  end if;",
  'two phase review',
);

replaceOnce(
  "-- Backward-compatible hard-delete endpoints now route to the archive. This closes",
  `create or replace function public.bes_finalize_attendance_archive_delete(p_archive_id uuid)\nreturns jsonb\nlanguage plpgsql\nsecurity definer\nset search_path = ''\nas $$\ndeclare\n  v_uid uuid := auth.uid();\n  v_archive public.bes_attendance_archive%rowtype;\nbegin\n  if not public.is_admin() then\n    raise exception 'Chỉ Admin được hoàn tất xóa vĩnh viễn.' using errcode = '42501';\n  end if;\n\n  select * into v_archive\n  from public.bes_attendance_archive a\n  where a.id = p_archive_id\n  for update;\n  if not found then\n    raise exception 'Không tìm thấy mục lưu trữ.' using errcode = 'P0002';\n  end if;\n  if v_archive.delete_request_status <> 'approved' then\n    raise exception 'Mục này chưa được Admin duyệt xóa.' using errcode = '22023';\n  end if;\n\n  delete from public.bes_attendance_archive a where a.id = p_archive_id;\n  return jsonb_build_object(\n    'archive_id', p_archive_id,\n    'approved', true,\n    'permanently_deleted', true,\n    'finalized_by', v_uid\n  );\nend;\n$$;\n\n-- Backward-compatible hard-delete endpoints now route to the archive. This closes`,
  'finalize function',
);

replaceOnce(
  "revoke all on function public.bes_review_attendance_archive_delete(uuid, boolean, text) from public, anon;",
  "revoke all on function public.bes_review_attendance_archive_delete(uuid, boolean, text) from public, anon;\nrevoke all on function public.bes_finalize_attendance_archive_delete(uuid) from public, anon;",
  'finalize revoke',
);

replaceOnce(
  "grant execute on function public.bes_review_attendance_archive_delete(uuid, boolean, text) to authenticated;",
  "grant execute on function public.bes_review_attendance_archive_delete(uuid, boolean, text) to authenticated;\ngrant execute on function public.bes_finalize_attendance_archive_delete(uuid) to authenticated;",
  'finalize grant',
);

fs.writeFileSync(path, source);
console.log('Attendance archive safety patch applied.');
