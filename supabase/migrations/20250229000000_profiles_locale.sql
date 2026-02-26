-- Add locale/language preference to profiles for bilingual support
alter table public.profiles
  add column if not exists locale text default 'en' check (locale in ('en', 'ko'));
