-- Invites for people who do not have a Timvo account yet.
-- They sign up from the email link and join the organization as the chosen role.

create table if not exists public.organization_member_invites (
  id uuid primary key default gen_random_uuid(),
  token text not null unique,
  email text not null,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  role text not null check (role in ('admin', 'manager', 'viewer')),
  status text not null default 'pending'
    check (status in ('pending', 'accepted', 'revoked', 'expired')),
  invited_by uuid references auth.users(id) on delete set null,
  expires_at timestamptz not null,
  created_at timestamptz default now(),
  accepted_at timestamptz
);

create index if not exists organization_member_invites_org_idx
  on public.organization_member_invites (organization_id);

create unique index if not exists organization_member_invites_pending_email_idx
  on public.organization_member_invites (organization_id, lower(email))
  where status = 'pending';

alter table public.organization_member_invites enable row level security;

drop policy if exists "Org admins view member invites" on public.organization_member_invites;
create policy "Org admins view member invites"
  on public.organization_member_invites for select
  using (
    exists (
      select 1 from public.organization_members m
      where m.organization_id = organization_member_invites.organization_id
        and m.user_id = auth.uid()
        and m.role in ('owner', 'admin')
    )
  );

grant select on public.organization_member_invites to authenticated;
