-- Task done flag, optional due date, and manual sort order.
-- Safe to run multiple times. Do not apply from this worktree; Petra applies later.

alter table public.tasks
  add column if not exists is_done boolean not null default false;

alter table public.tasks
  add column if not exists due_date date;

alter table public.tasks
  add column if not exists sort_order integer not null default 0;

create index if not exists tasks_project_sort on public.tasks(project_id, sort_order);

-- Backfill sort_order alphabetically per project (only rows still at default 0).
with ranked as (
  select
    id,
    (row_number() over (partition by project_id order by name, id) - 1) as rn
  from public.tasks
)
update public.tasks t
set sort_order = ranked.rn
from ranked
where t.id = ranked.id
  and t.sort_order = 0;

comment on column public.tasks.is_done is 'When true, task is marked complete in the project Tasks list';
comment on column public.tasks.due_date is 'Optional calendar due date (date-only, no timezone)';
comment on column public.tasks.sort_order is 'Manual order within a project; lower comes first';
