-- Performance + security cleanup (Supabase Advisors, 2026-10-07)
-- 1) Realtime off for time_logs (app code does not subscribe to Realtime)
-- 2) RLS: evaluate auth.uid()/auth.jwt()/auth.role() once per query, not per row (same logic)
-- 3) Indexes for unindexed foreign keys in public
-- 4) Trigger/RPC function grants + fixed search_path on handle_new_user
-- Snapshot of policies before the change: backup_20261007.policies

begin;

-- 0) snapshot current policies
create schema if not exists backup_20261007;
create table if not exists backup_20261007.policies as
  select * from pg_policies where schemaname = 'public';

-- 1) Realtime
do $$
begin
  if exists (select 1 from pg_publication_tables
             where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'time_logs') then
    alter publication supabase_realtime drop table public.time_logs;
  end if;
end $$;

-- 2) RLS initplan: wrap auth.<fn>() in (select auth.<fn>())
do $$
declare
  r record;
  new_qual text;
  new_check text;
  stmt text;
begin
  for r in
    select schemaname, tablename, policyname, qual, with_check
    from pg_policies
    where schemaname = 'public'
      and (coalesce(qual, '') ~ 'auth\.(uid|jwt|role)\(\)' or coalesce(with_check, '') ~ 'auth\.(uid|jwt|role)\(\)')
  loop
    new_qual := r.qual;
    new_check := r.with_check;
    if new_qual is not null then
      -- protect already-wrapped calls, wrap the rest, restore
      new_qual := regexp_replace(new_qual, '\(\s*SELECT\s+auth\.(uid|jwt|role)\(\)\s+AS\s+\w+\)', '@@WRAPPED_\1@@', 'gi');
      new_qual := regexp_replace(new_qual, 'auth\.(uid|jwt|role)\(\)', '(select auth.\1())', 'g');
      new_qual := regexp_replace(new_qual, '@@WRAPPED_(uid|jwt|role)@@', '(select auth.\1())', 'g');
    end if;
    if new_check is not null then
      new_check := regexp_replace(new_check, '\(\s*SELECT\s+auth\.(uid|jwt|role)\(\)\s+AS\s+\w+\)', '@@WRAPPED_\1@@', 'gi');
      new_check := regexp_replace(new_check, 'auth\.(uid|jwt|role)\(\)', '(select auth.\1())', 'g');
      new_check := regexp_replace(new_check, '@@WRAPPED_(uid|jwt|role)@@', '(select auth.\1())', 'g');
    end if;
    stmt := format('alter policy %I on %I.%I', r.policyname, r.schemaname, r.tablename);
    if new_qual is not null then stmt := stmt || format(' using (%s)', new_qual); end if;
    if new_check is not null then stmt := stmt || format(' with check (%s)', new_check); end if;
    execute stmt;
  end loop;
end $$;

-- 3) Indexes for unindexed foreign keys (single and multi-column)
do $$
declare
  r record;
  idx_name text;
begin
  for r in
    select c.conrelid::regclass as tbl, cl.relname as tblname, c.conname,
           array_agg(a.attname order by k.ord) as cols
    from pg_constraint c
    join pg_class cl on cl.oid = c.conrelid
    join pg_namespace n on n.oid = cl.relnamespace
    cross join lateral unnest(c.conkey) with ordinality as k(attnum, ord)
    join pg_attribute a on a.attrelid = c.conrelid and a.attnum = k.attnum
    where c.contype = 'f' and n.nspname = 'public'
      and not exists (
        select 1 from pg_index i
        where i.indrelid = c.conrelid
          and (i.indkey::int2[])[0:array_length(c.conkey, 1) - 1] = c.conkey
      )
    group by c.conrelid, cl.relname, c.conname
  loop
    idx_name := left(r.tblname || '_' || array_to_string(r.cols, '_') || '_fk_idx', 63);
    execute format('create index if not exists %I on %s (%s)', idx_name, r.tbl,
                   (select string_agg(quote_ident(x), ', ') from unnest(r.cols) x));
  end loop;
end $$;

-- 4) Function grants: trigger functions never need EXECUTE for API roles;
--    invite RPCs are for signed-in users only. RLS helper functions are left as is
--    (they are called inside policies, so revoking them could break reads).
revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.clear_time_logs_billed_for_invoice() from public, anon, authenticated;
revoke execute on function public.accept_client_invite(text) from public, anon;
revoke execute on function public.get_my_pending_invite() from public, anon;
grant execute on function public.accept_client_invite(text) to authenticated;
grant execute on function public.get_my_pending_invite() to authenticated;
alter function public.handle_new_user() set search_path = public;

commit;

-- check
select
  (select count(*) from pg_policies where schemaname = 'public'
     and (coalesce(qual,'') || coalesce(with_check,'')) ~ 'auth\.(uid|jwt|role)\(\)'
     and (coalesce(qual,'') || coalesce(with_check,'')) !~* 'select auth\.(uid|jwt|role)\(\)') as policies_still_unwrapped,
  (select count(*) from backup_20261007.policies) as policies_snapshotted,
  (select count(*) from pg_publication_tables where pubname='supabase_realtime' and tablename='time_logs') as realtime_time_logs,
  (select count(*) from pg_indexes where schemaname='public' and indexname like '%\_fk\_idx') as new_fk_indexes;
