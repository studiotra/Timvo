-- Add tax_rate to projects (per-project tax override)
alter table public.projects
  add column if not exists tax_rate decimal(5, 2);
