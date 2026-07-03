-- Calendar events no longer require a project — matches tasks, which have
-- always allowed project_id to be null ("None" unless explicitly chosen).

alter table events alter column project_id drop not null;
