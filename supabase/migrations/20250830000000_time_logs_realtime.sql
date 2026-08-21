-- Enable Realtime so desktop / web clients can sync active timers.
do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'time_logs'
  ) then
    alter publication supabase_realtime add table public.time_logs;
  end if;
end $$;
