-- Per-client retainer invoice schedule.
-- Weekly, every 2 weeks, monthly, or every 2 months from a chosen day and time.
-- Timvo can create the draft, or leave a reminder for the user to create it.

alter table public.clients
  add column if not exists invoice_schedule_enabled boolean not null default false,
  add column if not exists invoice_cadence text,
  add column if not exists invoice_anchor_date date,
  add column if not exists invoice_time time not null default '09:00',
  add column if not exists invoice_schedule_mode text,
  add column if not exists invoice_reminder_days integer,
  add column if not exists invoice_schedule_updated_at timestamptz;

alter table public.clients drop constraint if exists clients_invoice_cadence_check;
alter table public.clients add constraint clients_invoice_cadence_check
  check (
    invoice_cadence is null
    or invoice_cadence in ('weekly', 'biweekly', 'monthly', 'bimonthly')
  );

alter table public.clients drop constraint if exists clients_invoice_schedule_mode_check;
alter table public.clients add constraint clients_invoice_schedule_mode_check
  check (
    invoice_schedule_mode is null
    or invoice_schedule_mode in ('auto', 'reminder')
  );

alter table public.clients drop constraint if exists clients_invoice_reminder_days_check;
alter table public.clients add constraint clients_invoice_reminder_days_check
  check (
    invoice_reminder_days is null
    or (invoice_reminder_days >= 0 and invoice_reminder_days <= 60)
  );

alter table public.clients drop constraint if exists clients_invoice_schedule_required_check;
alter table public.clients add constraint clients_invoice_schedule_required_check
  check (
    invoice_schedule_enabled = false
    or (
      invoice_cadence is not null
      and invoice_anchor_date is not null
      and invoice_schedule_mode is not null
      and (
        invoice_schedule_mode = 'auto'
        or invoice_reminder_days is not null
      )
    )
  );

create table if not exists public.client_invoice_schedule_runs (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  occurrence_on date not null,
  mode text not null check (mode in ('auto', 'reminder')),
  status text not null default 'open' check (status in ('open', 'dismissed')),
  invoice_ids uuid[] not null default '{}',
  period_label text,
  detail text,
  created_at timestamptz not null default now(),
  dismissed_at timestamptz,
  unique (client_id, occurrence_on)
);

create index if not exists client_invoice_schedule_runs_user_status_idx
  on public.client_invoice_schedule_runs (user_id, status);

alter table public.client_invoice_schedule_runs enable row level security;

drop policy if exists "Users manage own retainer invoice runs" on public.client_invoice_schedule_runs;
create policy "Users manage own retainer invoice runs"
  on public.client_invoice_schedule_runs
  for all
  to authenticated
  using (user_id = (select auth.uid()))
  with check (
    user_id = (select auth.uid())
    and exists (
      select 1 from public.clients c
      where c.id = client_invoice_schedule_runs.client_id
        and c.user_id = (select auth.uid())
    )
  );

grant select, insert, update, delete on public.client_invoice_schedule_runs to authenticated;
