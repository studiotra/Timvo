-- Apex Billing: Initial schema
-- Run this migration in your Supabase SQL editor

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Users profile (extends Supabase auth.users)
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  avatar_url text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Clients
create table public.clients (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  email text,
  tax_id text,
  currency text default 'USD',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Projects (belong to clients)
create table public.projects (
  id uuid primary key default uuid_generate_v4(),
  client_id uuid not null references public.clients(id) on delete cascade,
  name text not null,
  hourly_rate decimal(10, 2),
  billing_type text check (billing_type in ('hourly', 'fixed')) default 'hourly',
  status text check (status in ('active', 'archived')) default 'active',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Services (reusable line-item templates for autocomplete)
create table public.services (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  default_rate decimal(10, 2),
  created_at timestamptz default now()
);

-- Time logs
create table public.time_logs (
  id uuid primary key default uuid_generate_v4(),
  project_id uuid not null references public.projects(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  started_at timestamptz not null,
  ended_at timestamptz,
  duration_minutes integer,
  description text,
  is_billable boolean default true,
  is_billed boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Invoices
create table public.invoices (
  id uuid primary key default uuid_generate_v4(),
  client_id uuid not null references public.clients(id) on delete restrict,
  project_id uuid references public.projects(id) on delete set null,
  user_id uuid not null references auth.users(id) on delete cascade,
  status text check (status in ('draft', 'sent', 'paid')) default 'draft',
  total_amount decimal(10, 2),
  currency text default 'USD',
  issued_at date,
  due_at date,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Invoice items (links to time_log OR manual entry)
create table public.invoice_items (
  id uuid primary key default uuid_generate_v4(),
  invoice_id uuid not null references public.invoices(id) on delete cascade,
  time_log_id uuid references public.time_logs(id) on delete set null,
  description text not null,
  quantity decimal(10, 2) not null default 1,
  unit_rate decimal(10, 2) not null,
  amount decimal(10, 2) not null,
  sort_order integer default 0,
  created_at timestamptz default now()
);

-- RLS policies: users can only access their own data
alter table public.profiles enable row level security;
alter table public.clients enable row level security;
alter table public.projects enable row level security;
alter table public.services enable row level security;
alter table public.time_logs enable row level security;
alter table public.invoices enable row level security;
alter table public.invoice_items enable row level security;

create policy "Users can manage own profile"
  on public.profiles for all
  using (auth.uid() = id)
  with check (auth.uid() = id);

create policy "Users can manage own clients"
  on public.clients for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can manage projects of own clients"
  on public.projects for all
  using (
    exists (
      select 1 from public.clients c
      where c.id = projects.client_id and c.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.clients c
      where c.id = projects.client_id and c.user_id = auth.uid()
    )
  );

create policy "Users can manage own services"
  on public.services for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can manage own time logs"
  on public.time_logs for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can manage own invoices"
  on public.invoices for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can manage invoice items of own invoices"
  on public.invoice_items for all
  using (
    exists (
      select 1 from public.invoices i
      where i.id = invoice_items.invoice_id and i.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.invoices i
      where i.id = invoice_items.invoice_id and i.user_id = auth.uid()
    )
  );

-- Trigger: create profile on user signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name, avatar_url)
  values (
    new.id,
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'avatar_url'
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
