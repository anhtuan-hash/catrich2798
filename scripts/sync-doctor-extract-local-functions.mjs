// Free/local-only harness: extract the ACTUAL repository PL/pgSQL definitions.
// Writes SQL to stdout. Never connects to Supabase, cloud or local databases.
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
const entries=[
  ['supabase/migrations/20261025103500_bes_sync_doctor_readonly_preflight.sql',['public.bes_sync_preview_review']],
  // The latest v1.8 migration supersedes both original backup and v1.5 functions.
  // Never test obsolete versions when deciding whether academic writes are safe.
  ['supabase/migrations/20261025170000_sync_doctor_exact_active_count.sql',
    ['public.bes_sync_create_private_backup','public.bes_sync_rehearse_private_restore',
     'public.bes_sync_authorize_transition','public.bes_sync_execute_one_student',
     'public.bes_sync_restore_single_link']],
];
const sections=['-- Generated for an isolated temporary LOCAL database only.'];
for(const [file,names] of entries){
  const sql=readFileSync(resolve(file),'utf8');
  for(const name of names){
    const escaped=name.replace(/\./g,'\\.');
    const pattern=new RegExp('create or replace function\\s+'+escaped+
      '\\s*\\([\\s\\S]*?\\bas\\s+(\\$[A-Za-z][A-Za-z0-9_]*\\$)[\\s\\S]*?\\1\\s*;','i');
    const match=sql.match(pattern);
    if(!match)throw Error('Missing complete real PL/pgSQL definition: '+name+' in '+file);
    sections.push('-- From: '+file+'\n'+match[0]);
  }
}
// Mimic the current conservative Production release gate.
sections.push([
  'revoke execute on function public.bes_sync_preview_review(uuid) from public,anon;',
  'revoke execute on function public.bes_sync_create_private_backup(uuid) from public,anon;',
  'revoke execute on function public.bes_sync_rehearse_private_restore(uuid) from public,anon;',
  'revoke execute on function public.bes_sync_authorize_transition(uuid,text) from public,anon,authenticated;',
  'revoke execute on function public.bes_sync_execute_one_student(uuid) from public,anon,authenticated;',
  'revoke execute on function public.bes_sync_restore_single_link(uuid) from public,anon,authenticated;'
].join('\n'));
process.stdout.write(sections.join('\n\n')+'\n');
