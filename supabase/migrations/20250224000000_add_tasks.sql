-- Tasks (belong to projects) - Client > Project > Task hierarchy like ClickUp
create table public.tasks (
  id uuid primary key default uuid_generate_v4(),
  project_id uuid not null references public.projects(id) on delete cascade,
  name text not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index tasks_project_id on public.tasks(project_id);

alter table public.tasks enable row level security;

-- Tasks: users can manage tasks of projects they own
create policy "Users can manage tasks of own projects"
  on public.tasks for all
  using (
    exists (
      select 1 from public.projects p
      join public.clients c on c.id = p.client_id
      where p.id = tasks.project_id and c.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.projects p
      join public.clients c on c.id = p.client_id
      where p.id = tasks.project_id and c.user_id = auth.uid()
    )
  );

-- Add task_id to time_logs (nullable for backwards compat with existing logs)
alter table public.time_logs
  add column if not exists task_id uuid references public.tasks(id) on delete set null;

create index time_logs_task_id on public.time_logs(task_id);

-- Client portal: allow viewing time logs with tasks
-- (existing RLS on time_logs already allows portal users via projects)
