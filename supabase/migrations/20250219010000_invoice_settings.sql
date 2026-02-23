-- Default invoice settings in profiles
-- Run in Supabase SQL editor

alter table public.profiles
  add column if not exists default_invoice_footer text,
  add column if not exists default_invoice_terms text,
  add column if not exists default_due_days integer default 30;
