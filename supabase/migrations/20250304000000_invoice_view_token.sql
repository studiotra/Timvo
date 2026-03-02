-- Add view_token for public invoice links (client can view without logging in)
alter table public.invoices
  add column if not exists view_token text unique;

-- Index for fast lookup by token
create index if not exists invoices_view_token_idx on public.invoices(view_token) where view_token is not null;
