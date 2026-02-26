-- MVP: Project description, retainer, agreed fee, estimated hours
alter table public.projects
  add column if not exists description text,
  add column if not exists retainer_amount decimal(10, 2),
  add column if not exists retainer_hours decimal(6, 2),
  add column if not exists agreed_fee decimal(10, 2),
  add column if not exists estimated_hours decimal(8, 2);
