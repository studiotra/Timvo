alter table public.slack_connections
  add column if not exists last_channel_id text,
  add column if not exists live_channel_id text,
  add column if not exists live_message_ts text,
  add column if not exists live_log_id uuid;

create table if not exists public.slack_timer_alerts (
  id uuid primary key default uuid_generate_v4(),
  time_log_id uuid not null references public.time_logs(id) on delete cascade,
  kind text not null check (kind in ('1h', '2h')),
  sent_at timestamptz default now(),
  unique (time_log_id, kind)
);

alter table public.slack_timer_alerts enable row level security;
