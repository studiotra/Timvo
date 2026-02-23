-- Invoice extras: footer, terms, overdue status
-- Run in Supabase SQL editor

-- Add footer and terms to invoices
alter table public.invoices
  add column if not exists footer text,
  add column if not exists terms_and_conditions text;

-- Update status check to include overdue
alter table public.invoices drop constraint if exists invoices_status_check;
alter table public.invoices add constraint invoices_status_check
  check (status in ('draft', 'sent', 'paid', 'overdue'));
