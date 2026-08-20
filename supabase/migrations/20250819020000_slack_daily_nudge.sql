alter table public.slack_connections
  add column if not exists last_daily_nudge_date text;
