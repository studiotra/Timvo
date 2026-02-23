-- Fix: Ensure owners can always INSERT into clients
-- The "Client portal users can view linked clients" SELECT policy may conflict in some edge cases.
-- We replace it with a consolidated SELECT policy that explicitly uses OR logic.

-- Drop the client portal SELECT policy
drop policy if exists "Client portal users can view linked clients" on public.clients;

-- Recreate: owners see their clients, portal users see linked clients (SELECT only)
create policy "Clients select: owner or portal user"
  on public.clients for select
  using (
    auth.uid() = user_id
    or exists (
      select 1 from public.client_portal_access cpa
      where cpa.client_id = clients.id and cpa.user_id = auth.uid()
    )
  );
