-- Brian v11.8.0 · Canonical taxonomy + reusable blueprint library.
-- Safe to rerun; inserts only missing canonical values/titles.

with owners as (select distinct owner_id from public.assessment_items),
terms(kind,canonical_value,aliases) as (
  values
  ('skill','Reading',array['reading comprehension']::text[]),
  ('skill','Discourse',array['cohesion','coherence']::text[]),
  ('skill','Use of English',array['language use','use-of-english']::text[]),
  ('skill','Grammar',array['grammar and structures']::text[]),
  ('skill','Vocabulary',array['lexis','vocabulary use']::text[]),
  ('question_type','mcq',array['multiple choice','multiple-choice']::text[]),
  ('question_type','cloze',array['gap fill','cloze test']::text[]),
  ('question_type','reading',array['reading comprehension']::text[]),
  ('question_type','arrangement',array['sentence arrangement','dialogue arrangement']::text[]),
  ('grammar_point','articles',array['article','a an the']::text[]),
  ('grammar_point','tenses',array['tense','verb tense']::text[]),
  ('grammar_point','modal verbs',array['modals','modal']::text[]),
  ('grammar_point','relative clauses',array['relative clause','relative pronouns']::text[]),
  ('grammar_point','conditionals',array['conditional sentences','if clauses']::text[]),
  ('grammar_point','passive voice',array['passive']::text[]),
  ('grammar_point','gerunds and infinitives',array['gerund infinitive','verb patterns']::text[]),
  ('grammar_point','subject-verb agreement',array['subject verb agreement','sva']::text[]),
  ('grammar_point','comparison',array['comparatives','superlatives']::text[]),
  ('grammar_point','quantifiers',array['quantity expressions']::text[]),
  ('grammar_point','determiners',array['determiner']::text[]),
  ('grammar_point','prepositions',array['preposition']::text[]),
  ('grammar_point','pronouns',array['pronoun','reference words']::text[]),
  ('grammar_point','connectors',array['conjunctions','linking words','connector']::text[]),
  ('grammar_point','word form',array['word-form','word formation']::text[]),
  ('grammar_point','collocation',array['collocations']::text[]),
  ('grammar_point','phrasal verbs',array['phrasal verb']::text[]),
  ('grammar_point','reported speech',array['indirect speech']::text[]),
  ('tag','TNTHPT2025-2026',array['tnthpt','graduation-exam']::text[]),
  ('tag','arrangement',array['sentence-order','dialogue-order']::text[]),
  ('tag','discourse-cloze',array['discourse_cloze_5']::text[]),
  ('tag','functional-cloze',array['functional_cloze_6']::text[]),
  ('tag','reading-8',array['reading_8']::text[]),
  ('tag','reading-10',array['reading_10']::text[]),
  ('tag','vocabulary-in-context',array['vocab-context']::text[]),
  ('tag','reference',array['referent']::text[]),
  ('tag','inference',array['infer']::text[]),
  ('tag','main-idea',array['main idea']::text[]),
  ('tag','detail',array['specific-information']::text[]),
  ('tag','not-stated',array['not mentioned']::text[]),
  ('tag','true',array['true-statement']::text[]),
  ('tag','summary',array['summarise','summarize']::text[]),
  ('tag','title',array['best-title']::text[]),
  ('tag','sentence-insertion',array['sentence insertion']::text[]),
  ('tag','paragraph-location',array['paragraph location']::text[]),
  ('tag','paraphrase',array['restatement']::text[]),
  ('tag','word-form',array['word formation']::text[]),
  ('tag','collocation',array['collocations']::text[]),
  ('tag','connector',array['linker','linking-word']::text[]),
  ('topic','Environment & Sustainability',array['environment','sustainability','biodiversity','waste reduction','climate']::text[]),
  ('topic','Education & Learning',array['education','study skills','peer tutoring','learning']::text[]),
  ('topic','Technology & Digital Life',array['technology','digital habits','media literacy','ai in education']::text[]),
  ('topic','Health & Wellbeing',array['health','well-being','wellbeing','sleep and memory','nutrition']::text[]),
  ('topic','Community & Volunteering',array['community','volunteering','community activity']::text[]),
  ('topic','Culture & Heritage',array['culture','heritage','traditional crafts','museums']::text[]),
  ('topic','Work & Careers',array['career','employment','entrepreneurship','workplace']::text[]),
  ('topic','Transport & Urban Life',array['transport','urban design','street design','cycling']::text[]),
  ('topic','Consumer Awareness',array['consumer','subscription','shopping','financial literacy']::text[]),
  ('topic','Safety & First Aid',array['safety','first aid','fire safety','lightning safety']::text[]),
  ('topic','Science & Innovation',array['science','citizen science','innovation','research']::text[]),
  ('topic','Travel & Tourism',array['travel','tourism','responsible tourism']::text[])
)
insert into public.assessment_taxonomy_terms(owner_id,visibility,kind,canonical_value,aliases,active,metadata)
select o.owner_id,'personal',t.kind,t.canonical_value,t.aliases,true,jsonb_build_object('systemPreset','Brian v11.8')
from owners o cross join terms t
where not exists (
  select 1 from public.assessment_taxonomy_terms x
  where x.owner_id=o.owner_id and x.kind=t.kind and lower(x.canonical_value)=lower(t.canonical_value)
);

with owners as (select distinct owner_id from public.assessment_items),
presets(title,total_items,criteria) as (
  values
  ('TN THPT 40 câu · 2025–2026',40,'{"version":1,"preset":"tnthpt_40","grade":"12","cefr":"B1-B2","cognitiveTargets":{"recognition":30,"comprehension":50,"application":20},"tolerance":10,"enforceCognitive":false,"parts":[{"type":"arrangement_5","label":"Arrangement","mode":"items","count":5},{"type":"discourse_cloze_5","label":"Discourse Cloze","mode":"bundles","bundleCount":1,"itemCount":5},{"type":"reading_10","label":"Reading 10","mode":"bundles","bundleCount":1,"itemCount":10},{"type":"reading_8","label":"Reading 8","mode":"bundles","bundleCount":1,"itemCount":8},{"type":"functional_cloze_6","label":"Functional Cloze","mode":"bundles","bundleCount":2,"itemCount":6}]}'::jsonb),
  ('English 10 · Midterm · 40 câu',40,'{"version":1,"preset":"custom","grade":"10","cefr":"B1","cognitiveTargets":{"recognition":60,"comprehension":30,"application":10},"tolerance":10,"enforceCognitive":true,"parts":[{"type":"standalone_mcq","label":"Grammar & Vocabulary","mode":"items","count":24},{"type":"functional_cloze_6","label":"Functional Cloze","mode":"bundles","bundleCount":1,"itemCount":6},{"type":"reading_10","label":"Reading","mode":"bundles","bundleCount":1,"itemCount":10}]}'::jsonb),
  ('English 10 · Final · 40 câu',40,'{"version":1,"preset":"custom","grade":"10","cefr":"B1","cognitiveTargets":{"recognition":50,"comprehension":35,"application":15},"tolerance":10,"enforceCognitive":true,"parts":[{"type":"standalone_mcq","label":"Grammar & Vocabulary","mode":"items","count":20},{"type":"functional_cloze_6","label":"Functional Cloze","mode":"bundles","bundleCount":2,"itemCount":6},{"type":"reading_8","label":"Reading","mode":"bundles","bundleCount":1,"itemCount":8}]}'::jsonb),
  ('English 11 · Midterm · 40 câu',40,'{"version":1,"preset":"custom","grade":"11","cefr":"B1","cognitiveTargets":{"recognition":60,"comprehension":30,"application":10},"tolerance":10,"enforceCognitive":true,"parts":[{"type":"standalone_mcq","label":"Grammar & Vocabulary","mode":"items","count":20},{"type":"functional_cloze_6","label":"Functional Cloze","mode":"bundles","bundleCount":2,"itemCount":6},{"type":"reading_8","label":"Reading","mode":"bundles","bundleCount":1,"itemCount":8}]}'::jsonb),
  ('English 11 · Final · 40 câu',40,'{"version":1,"preset":"custom","grade":"11","cefr":"B1-B2","cognitiveTargets":{"recognition":50,"comprehension":35,"application":15},"tolerance":10,"enforceCognitive":true,"parts":[{"type":"standalone_mcq","label":"Grammar & Vocabulary","mode":"items","count":16},{"type":"functional_cloze_6","label":"Functional Cloze","mode":"bundles","bundleCount":1,"itemCount":6},{"type":"reading_8","label":"Reading 8","mode":"bundles","bundleCount":1,"itemCount":8},{"type":"reading_10","label":"Reading 10","mode":"bundles","bundleCount":1,"itemCount":10}]}'::jsonb),
  ('English 12 · Midterm · 40 câu',40,'{"version":1,"preset":"custom","grade":"12","cefr":"B1-B2","cognitiveTargets":{"recognition":50,"comprehension":35,"application":15},"tolerance":10,"enforceCognitive":true,"parts":[{"type":"arrangement_5","label":"Arrangement","mode":"items","count":5},{"type":"standalone_mcq","label":"Grammar & Vocabulary","mode":"items","count":11},{"type":"functional_cloze_6","label":"Functional Cloze","mode":"bundles","bundleCount":1,"itemCount":6},{"type":"reading_10","label":"Reading 10","mode":"bundles","bundleCount":1,"itemCount":10},{"type":"reading_8","label":"Reading 8","mode":"bundles","bundleCount":1,"itemCount":8}]}'::jsonb),
  ('English 12 · Final · 40 câu',40,'{"version":1,"preset":"custom","grade":"12","cefr":"B1-B2","cognitiveTargets":{"recognition":40,"comprehension":40,"application":20},"tolerance":10,"enforceCognitive":true,"parts":[{"type":"arrangement_5","label":"Arrangement","mode":"items","count":5},{"type":"discourse_cloze_5","label":"Discourse Cloze","mode":"bundles","bundleCount":1,"itemCount":5},{"type":"standalone_mcq","label":"Grammar & Vocabulary","mode":"items","count":6},{"type":"functional_cloze_6","label":"Functional Cloze","mode":"bundles","bundleCount":1,"itemCount":6},{"type":"reading_8","label":"Reading 8","mode":"bundles","bundleCount":1,"itemCount":8},{"type":"reading_10","label":"Reading 10","mode":"bundles","bundleCount":1,"itemCount":10}]}'::jsonb),
  ('Chuyên đề · Relative Clauses · 40 câu',40,'{"version":1,"preset":"custom","grade":"12","cefr":"B1-B2","cognitiveTargets":{"recognition":50,"comprehension":35,"application":15},"tolerance":10,"enforceCognitive":true,"parts":[{"type":"standalone_mcq","label":"Relative Clauses","mode":"items","count":40,"filters":{"grammar":"relative clause"}}]}'::jsonb),
  ('Chuyên đề · Conditionals · 40 câu',40,'{"version":1,"preset":"custom","grade":"12","cefr":"B1-B2","cognitiveTargets":{"recognition":50,"comprehension":35,"application":15},"tolerance":10,"enforceCognitive":true,"parts":[{"type":"standalone_mcq","label":"Conditionals","mode":"items","count":40,"filters":{"grammar":"conditional"}}]}'::jsonb),
  ('Chuyên đề · Word Form · 40 câu',40,'{"version":1,"preset":"custom","grade":"12","cefr":"B1-B2","cognitiveTargets":{"recognition":55,"comprehension":35,"application":10},"tolerance":10,"enforceCognitive":true,"parts":[{"type":"standalone_mcq","label":"Word Form","mode":"items","count":40,"filters":{"tag":"word-form"}}]}'::jsonb),
  ('Chuyên đề · Tenses & Modal Verbs · 40 câu',40,'{"version":1,"preset":"custom","grade":"12","cefr":"B1-B2","cognitiveTargets":{"recognition":50,"comprehension":35,"application":15},"tolerance":10,"enforceCognitive":true,"parts":[{"type":"standalone_mcq","label":"Tenses","mode":"items","count":20,"filters":{"grammar":"tense"}},{"type":"standalone_mcq","label":"Modal Verbs","mode":"items","count":20,"filters":{"grammar":"modal"}}]}'::jsonb),
  ('Chuyên đề · Vocabulary & Collocation · 40 câu',40,'{"version":1,"preset":"custom","grade":"12","cefr":"B1-B2","cognitiveTargets":{"recognition":45,"comprehension":40,"application":15},"tolerance":10,"enforceCognitive":true,"parts":[{"type":"standalone_mcq","label":"Vocabulary","mode":"items","count":20,"filters":{"skill":"Vocabulary"}},{"type":"standalone_mcq","label":"Collocation","mode":"items","count":20,"filters":{"grammar":"collocation"}}]}'::jsonb)
)
insert into public.assessment_blueprints(owner_id,visibility,title,total_items,criteria,created_at,updated_at)
select o.owner_id,'personal',p.title,p.total_items,p.criteria,now(),now()
from owners o cross join presets p
where not exists (
  select 1 from public.assessment_blueprints b
  where b.owner_id=o.owner_id and lower(b.title)=lower(p.title)
);
