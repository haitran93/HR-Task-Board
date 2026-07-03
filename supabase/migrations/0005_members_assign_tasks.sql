-- Lets any authenticated member create a task assigned to any other person
-- (not just admin, and not just themselves) — the client only exposes a
-- specific-person picker for non-admins, not the function/project-team/
-- everyone group-assignment modes, but that's a UI restriction, not a DB
-- one, so the insert policy needs to allow it at the database level too.

drop policy if exists tasks_insert on tasks;
create policy tasks_insert on tasks for insert with check (auth.role() = 'authenticated');
