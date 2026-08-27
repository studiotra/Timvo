-- Track first-run onboarding completion per user.
alter table public.profiles
  add column if not exists onboarding_completed_at timestamptz;

comment on column public.profiles.onboarding_completed_at is
  'When the user finished the in-app onboarding wizard; null = show on next login.';
