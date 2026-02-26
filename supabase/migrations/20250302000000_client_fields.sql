-- Client address, phone, business phone, extension, and note
alter table public.clients
  add column if not exists address text,
  add column if not exists phone_number text,
  add column if not exists business_phone text,
  add column if not exists extension text,
  add column if not exists note text;
