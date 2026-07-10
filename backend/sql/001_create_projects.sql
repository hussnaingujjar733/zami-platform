create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  address text not null,
  surface numeric,
  dpe text,
  target_dpe text,
  estimated_cost numeric,
  subsidies numeric,
  net_cost numeric,
  yearly_savings numeric,
  confidence text,
  source text,
  note text,
  recommendations jsonb,
  created_at timestamptz default now()
);

alter table public.projects enable row level security;

create policy "Users can read own projects"
on public.projects
for select
using (auth.uid() = user_id);

create policy "Users can insert own projects"
on public.projects
for insert
with check (auth.uid() = user_id);

create policy "Users can update own projects"
on public.projects
for update
using (auth.uid() = user_id);
