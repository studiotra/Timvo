-- Phase 2–4: viewer shares, project assignments, rates, retainer alerts

alter table public.projects
  add column if not exists bill_rate decimal(10, 2),
  add column if not exists alert_threshold_pct integer default 80
    check (alert_threshold_pct >= 0 and alert_threshold_pct <= 100);

alter table public.time_log_shares
  add column if not exists cost_rate decimal(10, 2),
  add column if not exists bill_rate decimal(10, 2),
  add column if not exists target_client_id uuid references public.clients(id) on delete set null;

create table if not exists public.project_contractors (
  id uuid primary key default uuid_generate_v4(),
  project_id uuid not null references public.projects(id) on delete cascade,
  contractor_user_id uuid not null references auth.users(id) on delete cascade,
  cost_rate decimal(10, 2),
  bill_rate decimal(10, 2),
  created_at timestamptz default now(),
  unique (project_id, contractor_user_id)
);

create table if not exists public.time_log_viewer_shares (
  id uuid primary key default uuid_generate_v4(),
  time_log_id uuid not null references public.time_logs(id) on delete cascade,
  client_id uuid not null references public.clients(id) on delete cascade,
  shared_by uuid not null references auth.users(id) on delete cascade,
  source text not null check (source in ('contractor', 'organization')),
  org_share_id uuid references public.time_log_shares(id) on delete set null,
  published_at timestamptz default now(),
  unique (time_log_id, client_id)
);

create table if not exists public.retainer_alerts (
  id uuid primary key default uuid_generate_v4(),
  project_id uuid not null references public.projects(id) on delete cascade,
  kind text not null check (kind in ('warning', 'exceeded')),
  sent_at timestamptz default now(),
  unique (project_id, kind)
);

alter table public.project_contractors enable row level security;
alter table public.time_log_viewer_shares enable row level security;
alter table public.retainer_alerts enable row level security;

-- Project contractors
create policy "Org managers manage project contractors"
  on public.project_contractors for all
  using (
    exists (
      select 1 from public.projects p
      join public.clients c on c.id = p.client_id
      where p.id = project_contractors.project_id
        and c.organization_id is not null
        and public.is_org_manager(c.organization_id)
    )
  )
  with check (
    exists (
      select 1 from public.projects p
      join public.clients c on c.id = p.client_id
      where p.id = project_contractors.project_id
        and c.organization_id is not null
        and public.is_org_manager(c.organization_id)
    )
  );

create policy "Contractors view own project assignments"
  on public.project_contractors for select
  using (contractor_user_id = auth.uid());

-- Viewer shares
create policy "Contractors can share own logs to viewers"
  on public.time_log_viewer_shares for insert
  with check (
    shared_by = auth.uid()
    and source = 'contractor'
    and exists (
      select 1 from public.time_logs tl
      where tl.id = time_log_id and tl.user_id = auth.uid()
    )
    and exists (
      select 1 from public.clients c
      where c.id = client_id and c.user_id = auth.uid() and c.organization_id is null
    )
  );

create policy "Org managers publish to viewers"
  on public.time_log_viewer_shares for insert
  with check (
    source = 'organization'
    and exists (
      select 1 from public.clients c
      where c.id = client_id
        and c.organization_id is not null
        and public.is_org_manager(c.organization_id)
    )
  );

create policy "Viewers see shares for linked clients"
  on public.time_log_viewer_shares for select
  using (
    exists (
      select 1 from public.client_portal_access cpa
      where cpa.client_id = time_log_viewer_shares.client_id
        and cpa.user_id = auth.uid()
    )
    or shared_by = auth.uid()
    or exists (
      select 1 from public.clients c
      where c.id = time_log_viewer_shares.client_id
        and c.organization_id is not null
        and public.is_org_manager(c.organization_id)
    )
  );

create policy "Owners and org managers view viewer shares"
  on public.time_log_viewer_shares for select
  using (
    exists (
      select 1 from public.clients c
      where c.id = client_id and c.user_id = auth.uid()
    )
  );

-- Portal: org clients require published shares; solo contractor clients keep legacy access
drop policy if exists "Client portal users can view time logs of linked clients" on public.time_logs;

create policy "Client portal users can view time logs of linked clients"
  on public.time_logs for select
  using (
    exists (
      select 1 from public.projects p
      join public.client_portal_access cpa on cpa.client_id = p.client_id
      join public.clients c on c.id = p.client_id
      where p.id = time_logs.project_id
        and cpa.user_id = auth.uid()
        and (
          c.organization_id is null
          or exists (
            select 1 from public.time_log_viewer_shares tvs
            where tvs.time_log_id = time_logs.id
              and tvs.client_id = c.id
          )
        )
    )
    or exists (
      select 1 from public.time_log_viewer_shares tvs
      join public.client_portal_access cpa on cpa.client_id = tvs.client_id
      where tvs.time_log_id = time_logs.id
        and cpa.user_id = auth.uid()
    )
  );

grant select on public.time_log_viewer_shares to authenticated;
grant select on public.project_contractors to authenticated;
