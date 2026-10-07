-- Soft-archive for services that are still referenced by tasks.
-- Safe to run multiple times. Do not apply from this worktree; Petra applies later.

alter table public.services
  add column if not exists status text default 'active';

-- Normalize nulls then enforce allowed values (idempotent).
update public.services set status = 'active' where status is null;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'services_status_check'
  ) then
    alter table public.services
      add constraint services_status_check
      check (status in ('active', 'archived'));
  end if;
end $$;

alter table public.services
  alter column status set default 'active';

alter table public.services
  alter column status set not null;

create index if not exists services_user_status on public.services(user_id, status);

comment on column public.services.status is
  'active | archived — archived stays for historical tasks but is hidden from new pickers';
