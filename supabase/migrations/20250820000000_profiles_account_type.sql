-- Distinguish contractor (business owner) vs client portal accounts
alter table public.profiles
  add column if not exists account_type text not null default 'contractor'
  check (account_type in ('contractor', 'client'));

-- Portal-only users are clients; dual-role users stay contractor
update public.profiles p
set account_type = 'client'
where exists (
  select 1 from public.client_portal_access cpa where cpa.user_id = p.id
)
and not exists (
  select 1 from public.clients c where c.user_id = p.id
);

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
  select email into user_email from auth.users where id = auth.uid();
  if user_email is null then
    return jsonb_build_object('error', 'Not authenticated');
  end if;

  select * into inv from client_invites
  where token = invite_token and status = 'pending' and expires_at > now()
  limit 1;

  if not found then
    return jsonb_build_object('error', 'Invalid or expired invite');
  end if;

  if lower(trim(inv.email)) != lower(trim(user_email)) then
    return jsonb_build_object('error', 'Invite was sent to a different email');
  end if;

  insert into client_portal_access (client_id, user_id, invited_by)
  values (inv.client_id, auth.uid(), inv.invited_by)
  on conflict (client_id, user_id) do nothing;

  update client_invites set status = 'accepted' where id = inv.id;

  update public.profiles
  set account_type = 'client', updated_at = now()
  where id = auth.uid()
    and not exists (select 1 from public.clients where user_id = auth.uid());

  return jsonb_build_object('success', true, 'client_id', inv.client_id);
end;
$$;
