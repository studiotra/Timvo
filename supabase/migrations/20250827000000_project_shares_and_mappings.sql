-- Contractor ↔ agency project sharing + agency mapping board

create table if not exists public.project_shares (
  id uuid primary key default uuid_generate_v4(),
  project_id uuid not null references public.projects(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  shared_by uuid not null references auth.users(id) on delete cascade,
  status text not null default 'active' check (status in ('active', 'revoked')),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (project_id, organization_id)
);

create table if not exists public.project_share_mappings (
  id uuid primary key default uuid_generate_v4(),
  project_share_id uuid not null references public.project_shares(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  target_client_id uuid not null references public.clients(id) on delete cascade,
  target_project_id uuid not null references public.projects(id) on delete cascade,
  mapped_by uuid references auth.users(id) on delete set null,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  -- One active mapping per share per agency
  unique (project_share_id)
);

create index if not exists project_shares_org_status_idx
  on public.project_shares (organization_id, status);
create index if not exists project_shares_shared_by_idx
  on public.project_shares (shared_by);
create index if not exists project_share_mappings_org_idx
  on public.project_share_mappings (organization_id);
create index if not exists project_share_mappings_target_project_idx
  on public.project_share_mappings (target_project_id);

alter table public.project_shares enable row level security;
alter table public.project_share_mappings enable row level security;

drop policy if exists "Contractors insert project shares" on public.project_shares;
drop policy if exists "Contractors view own project shares" on public.project_shares;
drop policy if exists "Contractors update own project shares" on public.project_shares;
drop policy if exists "Org managers view project shares" on public.project_shares;
drop policy if exists "Org managers manage share mappings" on public.project_share_mappings;
drop policy if exists "Contractors view mappings of own shares" on public.project_share_mappings;
drop policy if exists "Contractors manage own project shares" on public.project_shares;

create policy "Contractors insert project shares"
  on public.project_shares for insert
  with check (
    shared_by = auth.uid()
    and public.user_owns_client((
      select p.client_id from public.projects p where p.id = project_id
    ))
    and exists (
      select 1 from public.contractor_org_links col
      where col.organization_id = organization_id
        and col.contractor_user_id = auth.uid()
        and col.status = 'active'
    )
  );

create policy "Contractors view own project shares"
  on public.project_shares for select
  using (shared_by = auth.uid());

create policy "Contractors update own project shares"
  on public.project_shares for update
  using (shared_by = auth.uid())
  with check (shared_by = auth.uid());

create policy "Org managers view project shares"
  on public.project_shares for select
  using (public.is_org_manager(organization_id));

create policy "Org managers manage share mappings"
  on public.project_share_mappings for all
  using (public.is_org_manager(organization_id))
  with check (
    public.is_org_manager(organization_id)
    and exists (
      select 1 from public.project_shares ps
      where ps.id = project_share_id
        and ps.organization_id = organization_id
        and ps.status = 'active'
    )
    and public.get_client_organization_id(target_client_id) = organization_id
  );

create policy "Contractors view mappings of own shares"
  on public.project_share_mappings for select
  using (
    exists (
      select 1 from public.project_shares ps
      where ps.id = project_share_mappings.project_share_id
        and ps.shared_by = auth.uid()
    )
  );

grant select, insert, update on public.project_shares to authenticated;
grant select, insert, update, delete on public.project_share_mappings to authenticated;
