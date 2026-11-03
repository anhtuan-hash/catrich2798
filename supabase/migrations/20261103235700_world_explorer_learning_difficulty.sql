-- Complete the question-quality metadata contract.
alter table public.world_explorer_learning_questions
 add column if not exists difficulty text not null default 'locating'
 check(difficulty in ('locating','literal','inference'));
