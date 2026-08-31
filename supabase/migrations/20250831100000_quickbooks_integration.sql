-- QuickBooks Online connection + Stripe payment sync mapping

create table public.quickbooks_connections (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  realm_id text not null,
  company_name text,
  access_token text not null,
  refresh_token text not null,
  access_token_expires_at timestamptz not null,
  refresh_token_expires_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (user_id)
);

alter table public.quickbooks_connections enable row level security;

create policy "Users can view own quickbooks connection"
  on public.quickbooks_connections for select
  using (auth.uid() = user_id);

create policy "Users can delete own quickbooks connection"
  on public.quickbooks_connections for delete
  using (auth.uid() = user_id);

alter table public.clients
  add column if not exists quickbooks_customer_id text;

alter table public.invoices
  add column if not exists quickbooks_invoice_id text,
  add column if not exists quickbooks_sync_token text,
  add column if not exists quickbooks_payment_id text,
  add column if not exists stripe_session_id text,
  add column if not exists paid_at timestamptz;

comment on table public.quickbooks_connections is
  'OAuth tokens for QuickBooks Online; used to sync invoices and Stripe payments.';
