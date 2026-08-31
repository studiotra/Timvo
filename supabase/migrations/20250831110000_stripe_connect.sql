-- Stripe Connect + subscription tier for Timvo billing phases

alter table public.profiles
  add column if not exists stripe_account_id text,
  add column if not exists stripe_connect_charges_enabled boolean default false,
  add column if not exists stripe_connect_onboarding_complete boolean default false,
  add column if not exists subscription_tier text default 'free'
    check (subscription_tier in ('free', 'solo', 'team'));

comment on column public.profiles.stripe_account_id is
  'Stripe Connect Express account ID for receiving client invoice payments.';
comment on column public.profiles.subscription_tier is
  'Timvo plan: free, solo, or team — gates online payments and invoice limits.';
