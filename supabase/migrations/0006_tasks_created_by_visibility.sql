-- Fixes the real bug behind "assign to others doesn't work": the INSERT
-- policy was already permissive enough, but Postgres also requires the
-- inserting user to be visible under the SELECT policy for the row it just
-- created (needed to return the inserted row, which every client call does).
-- A member creating a task for someone else was neither the assignee nor
-- admin, so that implicit re-select failed with the same RLS error — making
-- it look like the insert itself was blocked.
--
-- Fix: track who created each task, and let creators see their own creations
-- too (in addition to the existing assignee/admin visibility).

alter table tasks add column created_by uuid references people(id) on delete set null;

create or replace function set_task_created_by() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.created_by is null then
    new.created_by := current_person_id();
  end if;
  return new;
end;
$$;

drop trigger if exists tasks_set_created_by on tasks;
create trigger tasks_set_created_by
before insert on tasks
for each row execute function set_task_created_by();

drop policy if exists tasks_select on tasks;
create policy tasks_select on tasks for select using (
  is_admin() or assignee_id = current_person_id() or created_by = current_person_id()
);
