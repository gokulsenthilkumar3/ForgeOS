-- Module 4: A/B Tests table

create table if not exists ab_tests (
  id            uuid primary key default uuid_generate_v4(),
  prompt_id     uuid not null references prompts(id) on delete cascade,
  version_a_id  uuid not null references prompt_versions(id) on delete cascade,
  version_b_id  uuid not null references prompt_versions(id) on delete cascade,
  provider      text not null default 'openai',
  input         text not null,
  result_a      jsonb,
  result_b      jsonb,
  winner        text check (winner in ('a', 'b', 'tie')),
  created_by    uuid references auth.users(id) on delete set null,
  created_at    timestamptz default now()
);

alter table ab_tests enable row level security;

create policy "Users can manage their ab tests" on ab_tests
  for all using (auth.uid() = created_by);
