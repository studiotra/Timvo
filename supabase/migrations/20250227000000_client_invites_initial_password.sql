-- Add initial_password for invite flow: user gets temp pw, clicks link, auto-login
alter table public.client_invites
  add column if not exists initial_password text;

comment on column public.client_invites.initial_password is 'Temporary password for one-time auto-login. Cleared after use.';
