-- Execute no Supabase SQL Editor.

create table spell_favorites (
  id uuid default gen_random_uuid() primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  spell_id uuid not null references spells(id) on delete cascade,
  created_at timestamp with time zone default timezone('utc'::text, now()),
  unique(user_id, spell_id)
);

alter table spell_favorites enable row level security;

create policy "Usuário vê seus favoritos"
  on spell_favorites for select
  using (auth.uid() = user_id);

create policy "Usuário adiciona favoritos"
  on spell_favorites for insert
  with check (auth.uid() = user_id);

create policy "Usuário remove favoritos"
  on spell_favorites for delete
  using (auth.uid() = user_id);
