-- HR Program Hub — round 2 schema (Supabase/Postgres)
-- Replaces the v1 Express+SQLite schema. Run via `supabase db push` or the SQL editor.

create extension if not exists pgcrypto;

-- ============ TABLES ============

create table people (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid unique references auth.users(id) on delete set null,
  username text unique not null,
  name text not null,
  avatar_color text not null default '#2E5FE4',
  is_admin boolean not null default false,
  created_at timestamptz not null default now()
);

create table functions (
  id uuid primary key default gen_random_uuid(),
  name text unique not null
);

create table person_functions (
  person_id uuid not null references people(id) on delete cascade,
  function_id uuid not null references functions(id) on delete cascade,
  primary key (person_id, function_id)
);

create table projects (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  color text not null,
  created_at timestamptz not null default now()
);

create table project_teams (
  project_id uuid not null references projects(id) on delete cascade,
  person_id uuid not null references people(id) on delete cascade,
  primary key (project_id, person_id)
);

create table tasks (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  project_id uuid references projects(id) on delete set null,
  assignee_id uuid not null references people(id) on delete cascade,
  due_date date not null,
  priority text not null default 'med' check (priority in ('low', 'med', 'high')),
  status text not null default 'open' check (status in ('open', 'done')),
  reminder_enabled boolean not null default true,
  reminder_offset_days integer not null default 3,
  note text,
  completion_channel text check (completion_channel in ('email', 'chat', 'other')),
  completion_note text,
  completed_by uuid references people(id) on delete set null,
  completed_at timestamptz,
  batch_id uuid,
  created_at timestamptz not null default now()
);

create table events (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  project_id uuid not null references projects(id) on delete cascade,
  date date not null,
  is_milestone boolean not null default false,
  linked_task_id uuid references tasks(id) on delete set null
);

create table event_owners (
  event_id uuid not null references events(id) on delete cascade,
  person_id uuid not null references people(id) on delete cascade,
  primary key (event_id, person_id)
);

create table reminder_rules (
  project_id uuid primary key references projects(id) on delete cascade,
  offset_days integer not null default 3,
  morning_of boolean not null default true
);

create table ideas (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references people(id) on delete cascade,
  text text,
  image_url text,
  x real not null default 40,
  y real not null default 40,
  rotation real not null default 0,
  color text not null default 'yellow',
  visibility text not null default 'private' check (visibility in ('private', 'function')),
  shared_function_id uuid references functions(id) on delete set null,
  created_at timestamptz not null default now(),
  check (text is not null or image_url is not null)
);

-- ============ HELPERS ============
-- SECURITY DEFINER so these can read `people` for the calling user even though
-- RLS on `people` would otherwise block a plain lookup from inside a policy.

create or replace function current_person_id() returns uuid
language sql stable security definer set search_path = public as $$
  select id from people where auth_user_id = auth.uid()
$$;

create or replace function is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select is_admin from people where auth_user_id = auth.uid()), false)
$$;

-- ============ RLS ============
-- Internal 7-person tool: policies enforce row-level ownership (own tasks/ideas)
-- and admin-only writes for shared reference data (people/functions/projects/events).
-- They do NOT enforce column-level restrictions (e.g. a non-admin technically
-- could update a task's title, not just its completion fields) — add a trigger
-- later if that granularity becomes necessary.

alter table people enable row level security;
create policy people_select on people for select using (auth.role() = 'authenticated');
create policy people_write on people for all using (is_admin()) with check (is_admin());

alter table functions enable row level security;
create policy functions_select on functions for select using (auth.role() = 'authenticated');
create policy functions_write on functions for all using (is_admin()) with check (is_admin());

alter table person_functions enable row level security;
create policy person_functions_select on person_functions for select using (auth.role() = 'authenticated');
create policy person_functions_write on person_functions for all using (is_admin()) with check (is_admin());

alter table projects enable row level security;
create policy projects_select on projects for select using (auth.role() = 'authenticated');
create policy projects_write on projects for all using (is_admin()) with check (is_admin());

alter table project_teams enable row level security;
create policy project_teams_select on project_teams for select using (auth.role() = 'authenticated');
create policy project_teams_write on project_teams for all using (is_admin()) with check (is_admin());

alter table tasks enable row level security;
create policy tasks_select on tasks for select using (is_admin() or assignee_id = current_person_id());
create policy tasks_insert on tasks for insert with check (is_admin() or assignee_id = current_person_id());
create policy tasks_update on tasks for update
  using (is_admin() or assignee_id = current_person_id())
  with check (is_admin() or assignee_id = current_person_id());
create policy tasks_delete on tasks for delete using (is_admin());

alter table events enable row level security;
create policy events_select on events for select using (auth.role() = 'authenticated');
create policy events_write on events for all using (is_admin()) with check (is_admin());

alter table event_owners enable row level security;
create policy event_owners_select on event_owners for select using (auth.role() = 'authenticated');
create policy event_owners_write on event_owners for all using (is_admin()) with check (is_admin());

alter table reminder_rules enable row level security;
create policy reminder_rules_select on reminder_rules for select using (auth.role() = 'authenticated');
create policy reminder_rules_write on reminder_rules for all using (is_admin()) with check (is_admin());

alter table ideas enable row level security;
create policy ideas_select on ideas for select using (
  author_id = current_person_id()
  or is_admin()
  or (
    visibility = 'function'
    and shared_function_id in (select function_id from person_functions where person_id = current_person_id())
  )
);
create policy ideas_insert on ideas for insert with check (author_id = current_person_id());
create policy ideas_update on ideas for update
  using (author_id = current_person_id() or is_admin())
  with check (author_id = current_person_id() or is_admin());
create policy ideas_delete on ideas for delete using (author_id = current_person_id() or is_admin());

-- ============ STATIC REFERENCE SEED ============
-- Functions and the initial 4 projects are static reference data (no auth.users
-- dependency), so they're seeded directly here. People/auth/memberships are
-- seeded separately by scripts/seed.mjs, which needs the service-role key.

insert into functions (name) values
  ('Rewards & Culture'), ('L&D'), ('HRBP'), ('Recruiting'), ('Onboarding'), ('Office Management');

insert into projects (name, color) values
  ('Salary Review', '#EAB308'),
  ('360 Feedback', '#2E5FE4'),
  ('Manager Training', '#2E7D4F'),
  ('Leadership Retreat', '#E4572E');

insert into reminder_rules (project_id, offset_days, morning_of)
  select id, 3, true from projects;

-- ============ STORAGE (brainstorm image attachments) ============

insert into storage.buckets (id, name, public)
values ('brainstorm-images', 'brainstorm-images', true)
on conflict (id) do nothing;

create policy brainstorm_images_read on storage.objects for select
  using (bucket_id = 'brainstorm-images');
create policy brainstorm_images_insert on storage.objects for insert
  with check (bucket_id = 'brainstorm-images' and auth.role() = 'authenticated');
create policy brainstorm_images_delete on storage.objects for delete
  using (bucket_id = 'brainstorm-images' and owner = auth.uid());
