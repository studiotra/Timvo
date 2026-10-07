-- Human invoice numbers + lock flag for Create & Lock.
-- Safe to run multiple times. Do not apply from this worktree; Petra applies later.

alter table public.invoices
  add column if not exists invoice_number integer;

alter table public.invoices
  add column if not exists is_locked boolean default false;

-- Sequence counter on the freelancer's profile (Settings invoice_prefix pairs with this).
alter table public.profiles
  add column if not exists next_invoice_number integer default 1;

create unique index if not exists invoices_user_invoice_number_uidx
  on public.invoices (user_id, invoice_number)
  where invoice_number is not null;

comment on column public.invoices.invoice_number is
  'Per-user sequence shown as INV-0001 with profiles.invoice_prefix';
comment on column public.invoices.is_locked is
  'When true, line items that came from time logs are read-only in the edit form';
