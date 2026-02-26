-- Add billing_type to services (hourly vs fixed rate)
-- default_rate: for hourly = $/hr, for fixed = flat amount

alter table public.services
  add column if not exists billing_type text check (billing_type in ('hourly', 'fixed')) default 'hourly';

comment on column public.services.billing_type is 'hourly = rate per hour, fixed = flat amount for the service';
