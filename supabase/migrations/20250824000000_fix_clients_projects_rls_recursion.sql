-- Fix: infinite recursion between clients ↔ projects RLS policies
-- "Contractors can view clients for assigned projects" queried projects;
-- "Projects: org members select" queried clients → loop.
-- Use SECURITY DEFINER helpers (same pattern as fix_clients_rls_recursion).

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

grant execute on function public.user_has_project_assignment(uuid) to authenticated;
grant execute on function public.get_client_organization_id(uuid) to authenticated;

drop policy if exists "Contractors can view clients for assigned projects" on public.clients;

create policy "Contractors can view clients for assigned projects"
  on public.clients for select
  using (public.user_has_project_assignment(id));

-- Break projects → clients cycle when nested selects load org projects
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
