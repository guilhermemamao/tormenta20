-- Tabela de magias
create table spells (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  type text not null check (type in ('Arcana', 'Divina', 'Universal')),
  circle integer not null check (circle between 1 and 5),
  school text not null,
  execution text not null,
  range text not null,
  duration text not null,
  target text not null,
  resistance text,
  publication text,
  effect text not null,
  amplifiers jsonb default '[]',
  is_public boolean default true,
  created_by uuid references auth.users(id),
  created_at timestamp with time zone default timezone('utc'::text, now())
);

-- Tabela de raças
create table races (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  publication text,
  attribute_bonus text,
  abilities jsonb default '[]',
  created_by uuid references auth.users(id),
  created_at timestamp with time zone default timezone('utc'::text, now())
);

-- Tabela de origens
create table origins (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  publication text,
  starting_items text,
  benefits jsonb default '[]',
  choice_count integer default 2,
  special_abilities jsonb default '[]',
  created_by uuid references auth.users(id),
  created_at timestamp with time zone default timezone('utc'::text, now())
);

-- Tabela de classes
create table classes (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  publication text,
  hit_points text,
  mana_points text,
  skills jsonb default '[]',
  proficiencies jsonb default '[]',
  progression_table jsonb default '[]',
  created_by uuid references auth.users(id),
  created_at timestamp with time zone default timezone('utc'::text, now())
);

-- Tabela de poderes
create table powers (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  description text not null,
  prerequisites jsonb default '{}',
  source text,
  created_by uuid references auth.users(id),
  created_at timestamp with time zone default timezone('utc'::text, now())
);

-- Tabela de personagens
create table characters (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  player text,
  race text,
  origin text,
  classes jsonb default '[]',
  deity text,
  size text default 'Médio',
  movement integer default 9,
  xp integer default 0,
  attributes jsonb default '{}',
  hp jsonb default '{}',
  mp jsonb default '{}',
  attacks jsonb default '[]',
  defense jsonb default '{}',
  skills jsonb default '{}',
  spells jsonb default '[]',
  powers jsonb default '[]',
  equipment jsonb default '[]',
  money integer default 0,
  carry_limit integer default 0,
  notes text,
  user_id uuid references auth.users(id),
  created_at timestamp with time zone default timezone('utc'::text, now()),
  updated_at timestamp with time zone default timezone('utc'::text, now())
);

-- RLS policies
alter table spells enable row level security;
alter table characters enable row level security;
alter table races enable row level security;
alter table origins enable row level security;
alter table classes enable row level security;
alter table powers enable row level security;

-- Magias públicas visíveis para todos
create policy "Magias públicas visíveis para todos"
  on spells for select
  using (is_public = true);

-- Usuário vê suas próprias magias
create policy "Usuário vê suas magias"
  on spells for select
  using (auth.uid() = created_by);

-- Usuário cria magias
create policy "Usuário cria magias"
  on spells for insert
  with check (auth.uid() = created_by);

-- Usuário edita suas magias
create policy "Usuário edita suas magias"
  on spells for update
  using (auth.uid() = created_by);

-- Usuários logados podem editar magias importadas (sem dono)
create policy "Usuários logados editam magias sem dono"
  on spells for update
  using (created_by is null and auth.uid() is not null);

-- Tabela de magias favoritas
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

-- Personagens apenas do próprio usuário
create policy "Usuário vê seus personagens"
  on characters for select
  using (auth.uid() = user_id);

create policy "Usuário cria personagens"
  on characters for insert
  with check (auth.uid() = user_id);

create policy "Usuário edita personagens"
  on characters for update
  using (auth.uid() = user_id);

create policy "Usuário deleta personagens"
  on characters for delete
  using (auth.uid() = user_id);
