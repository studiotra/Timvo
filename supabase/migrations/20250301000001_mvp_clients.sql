-- MVP: Client archive status
alter table public.clients
  add column if not exists status text check (status in ('active', 'archived')) default 'active';
