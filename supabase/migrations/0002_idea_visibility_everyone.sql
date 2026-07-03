-- Adds a third idea visibility tier: 'everyone' (the whole-team "HR team" wall),
-- alongside the existing 'private' and 'function' tiers.

alter table ideas drop constraint ideas_visibility_check;
alter table ideas add constraint ideas_visibility_check check (visibility in ('private', 'function', 'everyone'));

drop policy ideas_select on ideas;
create policy ideas_select on ideas for select using (
  author_id = current_person_id()
  or is_admin()
  or visibility = 'everyone'
  or (
    visibility = 'function'
    and shared_function_id in (select function_id from person_functions where person_id = current_person_id())
  )
);
