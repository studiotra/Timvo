-- Allow contractors to view clients/projects they are assigned to and log time there

create policy "Contractors can view clients for assigned projects"
  on public.clients for select
  using (
    exists (
      select 1 from public.projects p
      join public.project_contractors pc on pc.project_id = p.id
      where p.client_id = clients.id
        and pc.contractor_user_id = auth.uid()
    )
  );

create policy "Contractors can view assigned org projects"
  on public.projects for select
  using (
    exists (
      select 1 from public.project_contractors pc
      where pc.project_id = projects.id
        and pc.contractor_user_id = auth.uid()
    )
  );

create policy "Contractors can log time on assigned org projects"
  on public.time_logs for insert
  with check (
    auth.uid() = user_id
    and exists (
      select 1 from public.project_contractors pc
      where pc.project_id = time_logs.project_id
        and pc.contractor_user_id = auth.uid()
    )
  );

create policy "Contractors can update own logs on assigned org projects"
  on public.time_logs for update
  using (
    auth.uid() = user_id
    and exists (
      select 1 from public.project_contractors pc
      where pc.project_id = time_logs.project_id
        and pc.contractor_user_id = auth.uid()
    )
  )
  with check (auth.uid() = user_id);
