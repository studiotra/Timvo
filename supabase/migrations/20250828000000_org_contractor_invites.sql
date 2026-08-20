-- Contractor ↔ agency link UX: acknowledge banner + contractor-initiated org invites

alter table public.contractor_org_links
  add column if not exists contractor_acknowledged_at timestamptz;

create table if not exists public.org_invites (
  id uuid primary key default uuid_generate_v4(),
  token text not null unique,
  email text not null,
  contractor_user_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'pending'
    check (status in ('pending', 'accepted', 'revoked', 'expired')),
  organization_id uuid references public.organizations(id) on delete set null,
  invited_by uuid references auth.users(id) on delete set null,
  expires_at timestamptz not null,
  created_at timestamptz default now(),
  accepted_at timestamptz
);

create index if not exists org_invites_token_idx on public.org_invites (token);
create index if not exists org_invites_contractor_idx on public.org_invites (contractor_user_id);
create index if not exists org_invites_email_idx on public.org_invites (email);

alter table public.org_invites enable row level security;

drop policy if exists "Contractors manage own org invites" on public.org_invites;
drop policy if exists "Contractors view own org invites" on public.org_invites;

create policy "Contractors manage own org invites"
  on public.org_invites for all
  using (contractor_user_id = auth.uid())
  with check (contractor_user_id = auth.uid());

-- Allow contractors to update acknowledgment / leave on their links
drop policy if exists "Contractors update own org links" on public.contractor_org_links;
create policy "Contractors update own org links"
  on public.contractor_org_links for update
  using (contractor_user_id = auth.uid())
  with check (contractor_user_id = auth.uid());

-- Linked contractors can read org name (for banner / submit picker)
drop policy if exists "Linked contractors can view org" on public.organizations;
create policy "Linked contractors can view org"
  on public.organizations for select
  using (
    exists (
      select 1 from public.contractor_org_links col
      where col.organization_id = organizations.id
        and col.contractor_user_id = auth.uid()
        and col.status = 'active'
    )
  );

grant select, insert, update on public.org_invites to authenticated;
