-- Link billed time logs to the invoice that billed them. Invoice line items
-- only store one time_log_id per row (grouped lines), so delete must not rely
-- on invoice_items to find every log to unbill.
alter table public.time_logs
  add column if not exists billed_invoice_id uuid references public.invoices (id) on delete set null;

create index if not exists time_logs_billed_invoice_id_idx
  on public.time_logs (billed_invoice_id)
  where billed_invoice_id is not null;

-- Best-effort: rows that are billed and still linked from invoice_items get the FK
-- (grouped lines only stored the first time_log_id on an item; others stay unlinked).
update public.time_logs tl
set billed_invoice_id = ii.invoice_id
from public.invoice_items ii
where ii.time_log_id = tl.id
  and tl.is_billed = true
  and tl.billed_invoice_id is null;

comment on column public.time_logs.billed_invoice_id is 'Invoice that currently bills this log; set with is_billed. Cleared when that invoice is deleted.';

-- When an invoice row is removed, unbill every time log tied to it (not only
-- those referenced in invoice_items.time_log_id).
create or replace function public.clear_time_logs_billed_for_invoice()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.time_logs
  set is_billed = false, billed_invoice_id = null
  where billed_invoice_id = old.id;
  return old;
end;
$$;

drop trigger if exists invoices_before_delete_clear_billed_logs on public.invoices;
create trigger invoices_before_delete_clear_billed_logs
  before delete on public.invoices
  for each row execute procedure public.clear_time_logs_billed_for_invoice();
