-- Adds a free-text description to tasks, plus file/screenshot attachments.

alter table tasks add column description text;

create table task_attachments (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references tasks(id) on delete cascade,
  file_path text not null,
  file_name text not null,
  file_type text,
  uploaded_by uuid not null references people(id) on delete set null,
  created_at timestamptz not null default now()
);

alter table task_attachments enable row level security;

-- Same visibility rule as the parent task: admin, or the task's assignee.
create policy task_attachments_select on task_attachments for select using (
  exists (
    select 1 from tasks t
    where t.id = task_attachments.task_id
      and (is_admin() or t.assignee_id = current_person_id())
  )
);
create policy task_attachments_insert on task_attachments for insert with check (
  exists (
    select 1 from tasks t
    where t.id = task_attachments.task_id
      and (is_admin() or t.assignee_id = current_person_id())
  )
);
create policy task_attachments_delete on task_attachments for delete using (
  exists (
    select 1 from tasks t
    where t.id = task_attachments.task_id
      and (is_admin() or t.assignee_id = current_person_id())
  )
);

-- Storage bucket for the actual files. NOT public (unlike brainstorm-images) —
-- task attachments follow the same private, per-task visibility as the task
-- itself, so access is via short-lived signed URLs rather than public links.
insert into storage.buckets (id, name, public)
values ('task-attachments', 'task-attachments', false)
on conflict (id) do nothing;

-- Objects are stored at "{task_id}/{filename}" so the policy can read the
-- task_id out of the path and defer to the same rule as the task itself.
create policy task_attachments_storage_select on storage.objects for select using (
  bucket_id = 'task-attachments'
  and exists (
    select 1 from tasks t
    where t.id::text = (storage.foldername(name))[1]
      and (is_admin() or t.assignee_id = current_person_id())
  )
);
create policy task_attachments_storage_insert on storage.objects for insert with check (
  bucket_id = 'task-attachments'
  and exists (
    select 1 from tasks t
    where t.id::text = (storage.foldername(name))[1]
      and (is_admin() or t.assignee_id = current_person_id())
  )
);
create policy task_attachments_storage_delete on storage.objects for delete using (
  bucket_id = 'task-attachments'
  and exists (
    select 1 from tasks t
    where t.id::text = (storage.foldername(name))[1]
      and (is_admin() or t.assignee_id = current_person_id())
  )
);
