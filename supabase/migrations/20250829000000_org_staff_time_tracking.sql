-- Org staff time tracking: manage tasks on org projects

drop policy if exists "Org members can manage tasks on org projects" on public.tasks;
create policy "Org members can manage tasks on org projects"
  on public.tasks for all
  using (
    exists (
      select 1 from public.projects p
      where p.id = tasks.project_id
        and public.get_client_organization_id(p.client_id) is not null
        and public.is_org_member(public.get_client_organization_id(p.client_id))
    )
  )
  with check (
    exists (
      select 1 from public.projects p
      where p.id = tasks.project_id
        and public.get_client_organization_id(p.client_id) is not null
        and public.is_org_member(public.get_client_organization_id(p.client_id))
    )
  );

-- Org members may insert/update their own logs on org-owned projects
-- (own-user policy already covers most cases; this makes intent explicit)
drop policy if exists "Org members can log time on org projects" on public.time_logs;
create policy "Org members can log time on org projects"
  on public.time_logs for insert
  with check (
    auth.uid() = user_id
    and exists (
      select 1 from public.projects p
      where p.id = time_logs.project_id
        and public.get_client_organization_id(p.client_id) is not null
        and public.is_org_member(public.get_client_organization_id(p.client_id))
    )
  );

drop policy if exists "Org members can update own logs on org projects" on public.time_logs;
create policy "Org members can update own logs on org projects"
  on public.time_logs for update
  using (
    auth.uid() = user_id
    and exists (
      select 1 from public.projects p
      where p.id = time_logs.project_id
        and public.get_client_organization_id(p.client_id) is not null
        and public.is_org_member(public.get_client_organization_id(p.client_id))
    )
  )
  with check (auth.uid() = user_id);
