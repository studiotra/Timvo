-- Slack workspace/user link for slash commands

create table public.slack_connections (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  slack_team_id text not null,
  slack_team_name text,
  slack_user_id text not null,
  bot_access_token text not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (user_id),
  unique (slack_team_id, slack_user_id)
);

alter table public.slack_connections enable row level security;

create policy "Users can view own slack connection"
  on public.slack_connections for select
  using (auth.uid() = user_id);

create policy "Users can delete own slack connection"
  on public.slack_connections for delete
  using (auth.uid() = user_id);
