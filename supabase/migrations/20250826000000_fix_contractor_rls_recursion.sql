-- Definitive fix: clients ↔ projects RLS recursion breaking contractor dashboards.
-- Any clients SELECT was evaluating the contractor-assignment policy, which
-- re-entered projects policies and aborted the whole query (empty lists).

create or replace function public.user_owns_client(p_client_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.clients c
    where c.id = p_client_id and c.user_id = auth.uid()
  );
$$;

create or replace function public.user_has_portal_access(p_client_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.client_portal_access cpa
    where cpa.client_id = p_client_id and cpa.user_id = auth.uid()
  );
$$;

create or replace function public.user_has_project_assignment(p_client_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.projects p
    join public.project_contractors pc on pc.project_id = p.id
    where p.client_id = p_client_id
      and pc.contractor_user_id = auth.uid()
  );
$$;

create or replace function public.get_client_organization_id(p_client_id uuid)
returns uuid
language sql
security definer
set search_path = public
stable
as $$
  select c.organization_id from public.clients c where c.id = p_client_id;
$$;

create or replace function public.user_is_assigned_to_project(p_project_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.project_contractors pc
    where pc.project_id = p_project_id
      and pc.contractor_user_id = auth.uid()
  );
$$;

grant execute on function public.user_owns_client(uuid) to authenticated, anon;
grant execute on function public.user_has_portal_access(uuid) to authenticated, anon;
grant execute on function public.user_has_project_assignment(uuid) to authenticated;
grant execute on function public.get_client_organization_id(uuid) to authenticated;
grant execute on function public.user_is_assigned_to_project(uuid) to authenticated;

-- Clients: assignment check must never touch projects under RLS
drop policy if exists "Contractors can view clients for assigned projects" on public.clients;
create policy "Contractors can view clients for assigned projects"
  on public.clients for select
  using (public.user_has_project_assignment(id));

-- Projects: owner policy must never SELECT clients under RLS
drop policy if exists "Users can manage projects of own clients" on public.projects;
create policy "Users can manage projects of own clients"
  on public.projects for all
  using (public.user_owns_client(client_id))
  with check (public.user_owns_client(client_id));

-- Projects: org policies must never SELECT clients under RLS
drop policy if exists "Projects: org members select" on public.projects;
drop policy if exists "Projects: org managers insert" on public.projects;
drop policy if exists "Projects: org managers update" on public.projects;
drop policy if exists "Projects: org managers delete" on public.projects;

create policy "Projects: org members select"
  on public.projects for select
  using (
    public.get_client_organization_id(client_id) is not null
    and public.is_org_member(public.get_client_organization_id(client_id))
  );

create policy "Projects: org managers insert"
  on public.projects for insert
  with check (
    public.get_client_organization_id(client_id) is not null
    and public.is_org_manager(public.get_client_organization_id(client_id))
  );

create policy "Projects: org managers update"
  on public.projects for update
  using (
    public.get_client_organization_id(client_id) is not null
    and public.is_org_manager(public.get_client_organization_id(client_id))
  )
  with check (
    public.get_client_organization_id(client_id) is not null
    and public.is_org_manager(public.get_client_organization_id(client_id))
  );

create policy "Projects: org managers delete"
  on public.projects for delete
  using (
    public.get_client_organization_id(client_id) is not null
    and public.is_org_manager(public.get_client_organization_id(client_id))
  );

-- Assigned-project view: use definer helper (avoids any edge-case joins)
drop policy if exists "Contractors can view assigned org projects" on public.projects;
create policy "Contractors can view assigned org projects"
  on public.projects for select
  using (public.user_is_assigned_to_project(id));
