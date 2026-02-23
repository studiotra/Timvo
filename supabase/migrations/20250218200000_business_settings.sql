-- Business settings for invoicing (logo, bank, tax)
-- Run in Supabase SQL editor

alter table public.profiles
  add column if not exists business_name text,
  add column if not exists logo_url text,
  add column if not exists bank_name text,
  add column if not exists bank_account text,
  add column if not exists bank_routing text,
  add column if not exists tax_rate decimal(5, 2) default 0,
  add column if not exists tax_id text,
  add column if not exists default_currency text default 'USD',
  add column if not exists invoice_prefix text default 'INV-';
