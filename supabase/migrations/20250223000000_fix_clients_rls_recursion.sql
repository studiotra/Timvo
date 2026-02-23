-- Fix: RLS infinite recursion between clients and client_portal_access
-- clients "portal users select" policy -> queries client_portal_access
-- client_portal_access "Owners can manage" policy -> queries clients
-- Use SECURITY DEFINER functions to break the cycle (functions bypass RLS)

-- 1. Function: check if current user owns a client (reads clients, bypasses RLS)
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

-- 2. Function: check if current user has portal access to a client (reads client_portal_access, bypasses RLS)
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

-- 3. Drop existing policies that cause recursion
drop policy if exists "Clients: owners select" on public.clients;
drop policy if exists "Clients: owners insert" on public.clients;
drop policy if exists "Clients: owners update" on public.clients;
drop policy if exists "Clients: owners delete" on public.clients;
drop policy if exists "Clients: portal users select" on public.clients;

drop policy if exists "Users can read own portal access" on public.client_portal_access;
drop policy if exists "Owners can manage portal access for their clients" on public.client_portal_access;

-- 4. Recreate clients policies (owners: simple; portal: use function, no recursion)
create policy "Clients: owners select"
  on public.clients for select
  using (auth.uid() = user_id);

create policy "Clients: owners insert"
  on public.clients for insert
  with check (auth.uid() = user_id);

create policy "Clients: owners update"
  on public.clients for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Clients: owners delete"
  on public.clients for delete
  using (auth.uid() = user_id);

create policy "Clients: portal users select"
  on public.clients for select
  using (public.user_has_portal_access(id));

-- 5. Recreate client_portal_access policies (use function for owner check, no recursion)
create policy "Users can read own portal access"
  on public.client_portal_access for select
  using (user_id = auth.uid());

create policy "Owners can manage portal access for their clients"
  on public.client_portal_access for all
  using (public.user_owns_client(client_id))
  with check (public.user_owns_client(client_id));

-- Grant execute to authenticated and anon (anon for pre-auth flows if needed)
grant execute on function public.user_owns_client(uuid) to authenticated;
grant execute on function public.user_owns_client(uuid) to anon;
grant execute on function public.user_has_portal_access(uuid) to authenticated;
grant execute on function public.user_has_portal_access(uuid) to anon;
