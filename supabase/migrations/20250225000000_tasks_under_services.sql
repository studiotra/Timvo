-- Tasks belong to services (rate comes from service, not project)
-- Client > Project > Service > Task hierarchy

alter table public.tasks
  add column if not exists service_id uuid references public.services(id) on delete restrict;

create index if not exists tasks_service_id on public.tasks(service_id);

comment on column public.tasks.service_id is 'Service type for this task; rate for invoicing comes from service.default_rate';
