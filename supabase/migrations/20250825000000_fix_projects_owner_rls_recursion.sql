-- Remaining recursion: "Users can manage projects of own clients" SELECTs clients,
-- and clients policies can SELECT projects. Use the existing security definer helper.

drop policy if exists "Users can manage projects of own clients" on public.projects;

create policy "Users can manage projects of own clients"
  on public.projects for all
  using (public.user_owns_client(client_id))
  with check (public.user_owns_client(client_id));
