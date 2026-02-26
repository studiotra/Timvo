-- MVP: Profile fields for timezone, target rate, and income goal
alter table public.profiles
  add column if not exists timezone text default 'America/New_York',
  add column if not exists target_hourly_rate decimal(10, 2),
  add column if not exists annual_income_goal decimal(12, 2);
