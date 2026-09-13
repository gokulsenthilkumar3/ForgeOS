-- Module 1: Core Schema for PromptVault
-- Run this in your Supabase SQL editor

create extension if not exists "uuid-ossp";

-- Prompts table
create table if not exists prompts (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  description text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz default now()
);

-- Prompt Versions table
create table if not exists prompt_versions (
  id uuid primary key default uuid_generate_v4(),
  prompt_id uuid not null references prompts(id) on delete cascade,
  version_number integer not null,
  content text not null,
  model text default 'gpt-4o',
  temperature numeric(3,2) default 0.7,
  created_at timestamptz default now(),
  unique(prompt_id, version_number)
);

-- Enable Row Level Security
alter table prompts enable row level security;
alter table prompt_versions enable row level security;

-- RLS Policies (allow authenticated users to manage their own prompts)
create policy "Users can view their prompts" on prompts
  for select using (auth.uid() = created_by);

create policy "Users can insert prompts" on prompts
  for insert with check (auth.uid() = created_by);

create policy "Users can update their prompts" on prompts
  for update using (auth.uid() = created_by);

create policy "Users can delete their prompts" on prompts
  for delete using (auth.uid() = created_by);

create policy "Users can manage versions of their prompts" on prompt_versions
  for all using (
    exists (
      select 1 from prompts
      where prompts.id = prompt_versions.prompt_id
      and prompts.created_by = auth.uid()
    )
  );
