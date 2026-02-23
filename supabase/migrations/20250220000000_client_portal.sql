-- Client Portal: invite clients via email to view time records
-- Phase 1: client_invites, client_portal_access + RLS

-- Client invites (pending, accepted, expired)
create table public.client_invites (
  id uuid primary key default uuid_generate_v4(),
  client_id uuid not null references public.clients(id) on delete cascade,
  email text not null,
  token text unique not null,
  status text not null check (status in ('pending', 'accepted', 'expired')) default 'pending',
  invited_by uuid not null references auth.users(id) on delete cascade,
  expires_at timestamptz not null,
  created_at timestamptz default now()
);

-- Links an auth user to a client they can view (read-only portal access)
create table public.client_portal_access (
  id uuid primary key default uuid_generate_v4(),
  client_id uuid not null references public.clients(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  invited_by uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz default now(),
  unique (client_id, user_id)
);

create index client_invites_client_id on public.client_invites(client_id);
create index client_invites_token on public.client_invites(token);
create index client_invites_status on public.client_invites(status);
create index client_portal_access_user_id on public.client_portal_access(user_id);
create index client_portal_access_client_id on public.client_portal_access(client_id);

-- RLS
alter table public.client_invites enable row level security;
alter table public.client_portal_access enable row level security;

-- Owners can manage invites for their clients
create policy "Owners can manage invites for their clients"
  on public.client_invites for all
  using (
    exists (
      select 1 from public.clients c
      where c.id = client_invites.client_id and c.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.clients c
      where c.id = client_invites.client_id and c.user_id = auth.uid()
    )
  );

-- Client portal users can read their own access (to know which clients they can view)
create policy "Users can read own portal access"
  on public.client_portal_access for select
  using (user_id = auth.uid());

-- Owners can manage portal access for their clients (when creating from accepted invite)
create policy "Owners can manage portal access for their clients"
  on public.client_portal_access for all
  using (
    exists (
      select 1 from public.clients c
      where c.id = client_portal_access.client_id and c.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.clients c
      where c.id = client_portal_access.client_id and c.user_id = auth.uid()
    )
  );

-- Client portal users: additional SELECT policies on existing tables
-- (Existing owner policies already allow owner access; these add client access)

create policy "Client portal users can view linked clients"
  on public.clients for select
  using (
    exists (
      select 1 from public.client_portal_access cpa
      where cpa.client_id = clients.id and cpa.user_id = auth.uid()
    )
  );

create policy "Client portal users can view projects of linked clients"
  on public.projects for select
  using (
    exists (
      select 1 from public.client_portal_access cpa
      where cpa.client_id = projects.client_id and cpa.user_id = auth.uid()
    )
  );

create policy "Client portal users can view time logs of linked clients"
  on public.time_logs for select
  using (
    exists (
      select 1 from public.projects p
      join public.client_portal_access cpa on cpa.client_id = p.client_id
      where p.id = time_logs.project_id and cpa.user_id = auth.uid()
    )
  );

-- Accept invite: client calls this after signup to link themselves to the client
-- Runs with definer rights so it can insert into client_portal_access
create or replace function public.accept_client_invite(invite_token text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  inv client_invites%rowtype;
  user_email text;
begin
  -- Get current user's email
  select email into user_email from auth.users where id = auth.uid();
  if user_email is null then
    return jsonb_build_object('error', 'Not authenticated');
  end if;

  -- Find valid invite
  select * into inv from client_invites
  where token = invite_token and status = 'pending' and expires_at > now()
  limit 1;

  if not found then
    return jsonb_build_object('error', 'Invalid or expired invite');
  end if;

  if lower(trim(inv.email)) != lower(trim(user_email)) then
    return jsonb_build_object('error', 'Invite was sent to a different email');
  end if;

  -- Create portal access (ignore if already exists)
  insert into client_portal_access (client_id, user_id, invited_by)
  values (inv.client_id, auth.uid(), inv.invited_by)
  on conflict (client_id, user_id) do nothing;

  -- Mark invite accepted
  update client_invites set status = 'accepted' where id = inv.id;

  return jsonb_build_object('success', true, 'client_id', inv.client_id);
end;
$$;

grant execute on function public.accept_client_invite(text) to authenticated;
