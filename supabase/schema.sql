-- IWP Work Tracker v2 schema — run this once in Supabase SQL Editor

create table if not exists entries (
  id            bigserial primary key,
  date          date not null,
  title         text not null,
  description   text default '',
  category      text default 'Other',
  project       text default '',
  hours         numeric(6,2) default 0,
  status        text default 'Completed',
  is_highlight  boolean default false,
  links         jsonb default '[]'::jsonb,
  created_at    timestamptz default now(),
  updated_at    timestamptz default now()
);
create index if not exists idx_entries_date      on entries(date);
create index if not exists idx_entries_project   on entries(project);
create index if not exists idx_entries_category  on entries(category);
create index if not exists idx_entries_highlight on entries(is_highlight);

create table if not exists categories (
  id     bigserial primary key,
  name   text unique not null,
  color  text default '#64748b',
  sort   int default 0
);

create table if not exists drafts (
  id         int primary key default 1 check (id = 1),
  payload    jsonb not null,
  updated_at timestamptz default now()
);

insert into categories (name, color, sort) values
  ('Development','#3b82f6',0),('Design','#a855f7',1),('Meetings','#f59e0b',2),
  ('Documentation','#10b981',3),('Research','#06b6d4',4),('Admin','#64748b',5),
  ('Client Work','#ec4899',6),('Learning','#8b5cf6',7),('Other','#94a3b8',8)
on conflict (name) do nothing;

create or replace function set_updated_at() returns trigger as $$
begin new.updated_at = now(); return new; end;
$$ language plpgsql;

drop trigger if exists trg_entries_updated on entries;
create trigger trg_entries_updated
  before update on entries
  for each row execute function set_updated_at();

alter table entries    enable row level security;
alter table categories enable row level security;
alter table drafts     enable row level security;
