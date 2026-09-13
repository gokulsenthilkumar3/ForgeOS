-- Module 2: Branches & Rollback
-- prompt_branches tracks named branches per prompt, each pointing to a head version

create table if not exists prompt_branches (
  id            uuid primary key default uuid_generate_v4(),
  prompt_id     uuid not null references prompts(id) on delete cascade,
  branch_name   text not null,
  head_version_id uuid references prompt_versions(id) on delete set null,
  created_at    timestamptz default now(),
  unique(prompt_id, branch_name)
);

-- Enable RLS
alter table prompt_branches enable row level security;

-- RLS: users can only manage branches on their own prompts
create policy "Users can manage branches on their prompts" on prompt_branches
  for all using (
    exists (
      select 1 from prompts
      where prompts.id = prompt_branches.prompt_id
        and prompts.created_by = auth.uid()
    )
  );

-- Auto-create a 'main' branch when a prompt is inserted
create or replace function create_default_branch()
returns trigger language plpgsql as $$
begin
  insert into prompt_branches (prompt_id, branch_name)
  values (new.id, 'main');
  return new;
end;
$$;

create trigger on_prompt_created
  after insert on prompts
  for each row execute procedure create_default_branch();
