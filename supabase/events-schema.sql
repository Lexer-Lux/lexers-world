create extension if not exists "pgcrypto";

create table if not exists public.events (
  id text primary key default gen_random_uuid()::text,
  name text not null,
  manual_location text not null,
  address text not null,
  lat double precision not null,
  lng double precision not null,
  description text not null,
  is_lexer_coming boolean not null default false,
  recurrent boolean not null default false,
  invite_url text not null,
  date timestamptz not null,
  cost numeric(10, 2) not null default 0,
  currency text not null default 'USD',
  has_additional_tiers boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.events enable row level security;

drop policy if exists "public read events" on public.events;

create policy "public read events"
on public.events
for select
to anon, authenticated
using (true);
