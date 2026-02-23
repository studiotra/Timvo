-- Simplify clients RLS: split "Users can manage own clients" (FOR ALL) into separate policies
-- to avoid any potential interaction with the portal SELECT policy.

-- Drop existing policies on clients
drop policy if exists "Users can manage own clients" on public.clients;
drop policy if exists "Client portal users can view linked clients" on public.clients;
drop policy if exists "Clients select: owner or portal user" on public.clients;

-- Owners: full access (INSERT, UPDATE, DELETE, SELECT)
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

-- Portal users: SELECT only for linked clients
create policy "Clients: portal users select"
  on public.clients for select
  using (
    exists (
      select 1 from public.client_portal_access cpa
      where cpa.client_id = clients.id and cpa.user_id = auth.uid()
    )
  );
