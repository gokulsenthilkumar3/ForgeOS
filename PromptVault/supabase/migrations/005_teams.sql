-- Module 5: Teams & Workspaces

create table if not exists teams (
  id         uuid primary key default uuid_generate_v4(),
  name       text not null,
  owner_id   uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz default now()
);

create table if not exists team_members (
  team_id    uuid not null references teams(id) on delete cascade,
  user_id    uuid not null references auth.users(id) on delete cascade,
  role       text not null default 'viewer' check (role in ('viewer', 'editor', 'admin')),
  joined_at  timestamptz default now(),
  primary key (team_id, user_id)
);

-- Allow prompts to be associated with a team (optional)
alter table prompts add column if not exists team_id uuid references teams(id) on delete set null;

alter table teams enable row level security;
alter table team_members enable row level security;

-- Owners and members can view their teams
create policy "Team members can view team" on teams
  for select using (
    auth.uid() = owner_id or
    exists (select 1 from team_members where team_members.team_id = teams.id and team_members.user_id = auth.uid())
  );

create policy "Owners can manage team" on teams
  for all using (auth.uid() = owner_id);

create policy "Members can view membership" on team_members
  for select using (
    auth.uid() = user_id or
    exists (select 1 from teams where teams.id = team_members.team_id and teams.owner_id = auth.uid())
  );

create policy "Owners can manage members" on team_members
  for all using (
    exists (select 1 from teams where teams.id = team_members.team_id and teams.owner_id = auth.uid())
  );
