-- RPC for invitees to get their pending invite token (used when redirecting after login)
create or replace function public.get_my_pending_invite()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  user_email text;
  inv_token text;
begin
  select email into user_email from auth.users where id = auth.uid();
  if user_email is null then
    return null;
  end if;

  select token into inv_token from client_invites
  where lower(trim(email)) = lower(trim(user_email))
    and status = 'pending'
    and expires_at > now()
  order by created_at desc
  limit 1;

  if inv_token is null then
    return null;
  end if;

  return jsonb_build_object('token', inv_token);
end;
$$;

grant execute on function public.get_my_pending_invite() to authenticated;
