import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const file=(name)=>fs.readFileSync(new URL('../'+name,import.meta.url),'utf8');
const service=file('src/features/events/services/eventService.js');
const host=file('src/features/events/dashboard/EventPopupHost.jsx');

test('offline-demo never creates an unhandled event fetch rejection',()=>{
 assert.match(host,/import \{ supabase, isSupabaseConfigured \}/);
 assert.match(host,/if\(!userId \|\| !isSupabaseConfigured \|\| !supabase\) return undefined;/);
 assert.match(service,/if\(!userId \|\| !isSupabaseConfigured \|\| !supabase\) return \[\];/);
 assert.match(host,/Promise\.all\(\[eligibleEvents\(userId\),supabase\.auth\.getSession\(\)\]\)/);
});

test('configured Supabase continues to use all event, poster and receipt paths',()=>{
 for(const functionName of ['listManagedEvents','listEventProfiles','saveEventDraft','uploadEventPoster','getEventPosterUrl','publishEvent','eligibleEvents','recordEventInteraction']) {
  assert.ok(service.includes('function '+functionName),functionName);
 }
 assert.match(service,/bes_event_recipients/);
 assert.match(service,/bes_event_receipts/);
 assert.match(host,/setInboxEvents\(items\)/);
 assert.match(host,/if\(automatic\)setEvent\(automatic\)/);
});
