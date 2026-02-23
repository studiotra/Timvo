-- Add phone and address to profiles for Bill From / business details
alter table public.profiles
  add column if not exists phone_number text,
  add column if not exists address text;
