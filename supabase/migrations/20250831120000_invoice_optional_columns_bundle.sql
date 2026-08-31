-- Run in Supabase SQL Editor if invoice detail or public links fail.
-- Safe to run multiple times (IF NOT EXISTS).

-- Public invoice link token
alter table public.invoices
  add column if not exists view_token text unique;

create index if not exists invoices_view_token_idx
  on public.invoices(view_token)
  where view_token is not null;

-- Overdue status + footer/terms (skip if already applied)
do $$
begin
  alter table public.invoices drop constraint if exists invoices_status_check;
  alter table public.invoices
    add constraint invoices_status_check
    check (status in ('draft', 'sent', 'paid', 'overdue'));
exception
  when others then null;
end $$;

alter table public.invoices
  add column if not exists footer text,
  add column if not exists terms_and_conditions text;

-- Stripe payment URL (platform checkout)
alter table public.invoices
  add column if not exists stripe_payment_url text;

-- Payment audit (Stripe webhook + QuickBooks sync)
alter table public.invoices
  add column if not exists stripe_session_id text,
  add column if not exists paid_at timestamptz,
  add column if not exists quickbooks_invoice_id text,
  add column if not exists quickbooks_sync_token text,
  add column if not exists quickbooks_payment_id text;
