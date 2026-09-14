import fs from 'node:fs';

const path = 'supabase/migrations/20260914_attendance_archive.sql';
let source = fs.readFileSync(path, 'utf8');
const before = "create or replace function public.bes_finalize_attendance_archive_delete(p_archive_id uuid)\nreturns jsonb\nlanguage plpgsql\nsecurity definer\nset search_path = ''\nas $\n";
const after = "create or replace function public.bes_finalize_attendance_archive_delete(p_archive_id uuid)\nreturns jsonb\nlanguage plpgsql\nsecurity definer\nset search_path = ''\nas $$\n";
if (!source.includes(before)) throw new Error('Broken finalizer opening dollar quote not found.');
source = source.replace(before, () => after);
const endBefore = "  );\nend;\n$;\n\n-- Backward-compatible hard-delete endpoints";
const endAfter = "  );\nend;\n$$;\n\n-- Backward-compatible hard-delete endpoints";
if (!source.includes(endBefore)) throw new Error('Broken finalizer closing dollar quote not found.');
source = source.replace(endBefore, () => endAfter);
fs.writeFileSync(path, source);
console.log('Fixed attendance archive finalizer dollar quoting.');
