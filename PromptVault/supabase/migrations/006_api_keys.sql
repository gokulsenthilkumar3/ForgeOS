-- Module 6: User API Key Vault
-- Keys are stored encrypted. Encryption/decryption happens at the application layer.
-- We use Supabase's pgcrypto for at-rest encryption (optional upgrade path).

create extension if not exists pgcrypto;

create table if not exists user_api_keys (
  id            uuid primary key default uuid_generate_v4(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  provider      text not null check (provider in ('openai', 'anthropic', 'google')),
  encrypted_key text not null,   -- AES-256 encrypted by app before insert
  key_hint      text,            -- last 4 chars of key for display (e.g. "...sk3a")
  created_at    timestamptz default now(),
  updated_at    timestamptz default now(),
  unique(user_id, provider)
);

alter table user_api_keys enable row level security;

-- Users can only see and manage their own keys
create policy "Users manage own api keys" on user_api_keys
  for all using (auth.uid() = user_id);

-- Trigger to keep updated_at fresh
create or replace function update_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger user_api_keys_updated_at
  before update on user_api_keys
  for each row execute procedure update_updated_at();
