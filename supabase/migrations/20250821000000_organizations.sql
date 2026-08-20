-- Organizations, contractor links, and time log submissions (Phase 0)

-- Extend account_type for organizations
alter table public.profiles drop constraint if exists profiles_account_type_check;
alter table public.profiles
  add constraint profiles_account_type_check
  check (account_type in ('contractor', 'client', 'organization'));

create table if not exists public.organizations (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  slug text unique,
  created_by uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.organization_members (
  id uuid primary key default uuid_generate_v4(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('owner', 'admin', 'manager', 'viewer')),
  created_at timestamptz default now(),
  unique (organization_id, user_id)
);

create table if not exists public.contractor_org_links (
  id uuid primary key default uuid_generate_v4(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  contractor_user_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'active' check (status in ('pending', 'active', 'inactive')),
  default_cost_rate decimal(10, 2),
  invited_by uuid references auth.users(id) on delete set null,
  created_at timestamptz default now(),
  unique (organization_id, contractor_user_id)
);

create table if not exists public.time_log_shares (
  id uuid primary key default uuid_generate_v4(),
  time_log_id uuid not null references public.time_logs(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  status text not null default 'submitted'
    check (status in ('submitted', 'approved', 'rejected', 'published')),
  submitted_by uuid not null references auth.users(id) on delete cascade,
  reviewed_by uuid references auth.users(id) on delete set null,
  reviewed_at timestamptz,
  review_note text,
  created_at timestamptz default now(),
  unique (time_log_id, organization_id)
);

alter table public.clients
  add column if not exists organization_id uuid references public.organizations(id) on delete cascade;

create index if not exists clients_organization_id_idx on public.clients(organization_id);

alter table public.organizations enable row level security;
alter table public.organization_members enable row level security;
alter table public.contractor_org_links enable row level security;
alter table public.time_log_shares enable row level security;

create or replace function public.is_org_member(org_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.organization_members om
    where om.organization_id = org_id and om.user_id = auth.uid()
  );
$$;

create or replace function public.is_org_manager(org_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.organization_members om
    where om.organization_id = org_id
      and om.user_id = auth.uid()
      and om.role in ('owner', 'admin', 'manager')
  );
$$;

-- Organizations
create policy "Org members can view their org"
  on public.organizations for select
  using (public.is_org_member(id));

create policy "Org owners can update their org"
  on public.organizations for update
  using (public.is_org_manager(id))
  with check (public.is_org_manager(id));

-- Members
create policy "Org members can view membership"
  on public.organization_members for select
  using (public.is_org_member(organization_id));

-- Contractor links
create policy "Org managers can manage contractor links"
  on public.contractor_org_links for all
  using (public.is_org_manager(organization_id))
  with check (public.is_org_manager(organization_id));

create policy "Contractors can view their org links"
  on public.contractor_org_links for select
  using (contractor_user_id = auth.uid());

-- Time log shares
create policy "Contractors can submit own logs"
  on public.time_log_shares for insert
  with check (
    submitted_by = auth.uid()
    and exists (
      select 1 from public.time_logs tl
      where tl.id = time_log_id and tl.user_id = auth.uid()
    )
    and exists (
      select 1 from public.contractor_org_links col
      where col.organization_id = time_log_shares.organization_id
        and col.contractor_user_id = auth.uid()
        and col.status = 'active'
    )
  );

create policy "Contractors can view own submissions"
  on public.time_log_shares for select
  using (submitted_by = auth.uid());

create policy "Org managers can view org submissions"
  on public.time_log_shares for select
  using (public.is_org_manager(organization_id));

create policy "Org managers can review submissions"
  on public.time_log_shares for update
  using (public.is_org_manager(organization_id))
  with check (public.is_org_manager(organization_id));

-- Org-owned clients (extend existing RLS)
create policy "Clients: org members select"
  on public.clients for select
  using (
    organization_id is not null and public.is_org_member(organization_id)
  );

create policy "Clients: org managers insert"
  on public.clients for insert
  with check (
    organization_id is not null and public.is_org_manager(organization_id)
  );

create policy "Clients: org managers update"
  on public.clients for update
  using (organization_id is not null and public.is_org_manager(organization_id))
  with check (organization_id is not null and public.is_org_manager(organization_id));

create policy "Clients: org managers delete"
  on public.clients for delete
  using (organization_id is not null and public.is_org_manager(organization_id));

-- Projects under org clients
create policy "Projects: org members select"
  on public.projects for select
  using (
    exists (
      select 1 from public.clients c
      where c.id = projects.client_id
        and c.organization_id is not null
        and public.is_org_member(c.organization_id)
    )
  );

create policy "Projects: org managers insert"
  on public.projects for insert
  with check (
    exists (
      select 1 from public.clients c
      where c.id = projects.client_id
        and c.organization_id is not null
        and public.is_org_manager(c.organization_id)
    )
  );

create policy "Projects: org managers update"
  on public.projects for update
  using (
    exists (
      select 1 from public.clients c
      where c.id = projects.client_id
        and c.organization_id is not null
        and public.is_org_manager(c.organization_id)
    )
  )
  with check (
    exists (
      select 1 from public.clients c
      where c.id = projects.client_id
        and c.organization_id is not null
        and public.is_org_manager(c.organization_id)
    )
  );

create policy "Projects: org managers delete"
  on public.projects for delete
  using (
    exists (
      select 1 from public.clients c
      where c.id = projects.client_id
        and c.organization_id is not null
        and public.is_org_manager(c.organization_id)
    )
  );

-- Org managers can read contractor time logs submitted to them
create policy "Time logs: org managers view submitted"
  on public.time_logs for select
  using (
    exists (
      select 1 from public.time_log_shares tls
      where tls.time_log_id = time_logs.id
        and public.is_org_manager(tls.organization_id)
    )
  );

grant execute on function public.is_org_member(uuid) to authenticated;
grant execute on function public.is_org_manager(uuid) to authenticated;
