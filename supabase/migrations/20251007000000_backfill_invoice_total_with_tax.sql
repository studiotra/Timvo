-- Backfill invoices.total_amount so it includes tax (line subtotal + tax).
-- Tax rate: project.tax_rate when > 0, else profile.tax_rate when > 0, else 0.
-- Does not add new columns. Safe to re-run (only updates rows that differ).
-- Do NOT apply automatically — Petra applies in Supabase when ready.

with line_sums as (
  select
    invoice_id,
    coalesce(sum(amount), 0)::numeric as subtotal
  from public.invoice_items
  group by invoice_id
),
computed as (
  select
    i.id,
    coalesce(ls.subtotal, 0)::numeric as subtotal,
    coalesce(
      case when p.tax_rate is not null and p.tax_rate > 0 then p.tax_rate end,
      case when pr.tax_rate is not null and pr.tax_rate > 0 then pr.tax_rate end,
      0
    )::numeric as tax_rate
  from public.invoices i
  left join line_sums ls on ls.invoice_id = i.id
  left join public.projects p on p.id = i.project_id
  left join public.profiles pr on pr.id = i.user_id
),
with_total as (
  select
    id,
    round(subtotal + round(subtotal * tax_rate / 100.0, 2), 2) as total_with_tax
  from computed
)
update public.invoices i
set
  total_amount = w.total_with_tax,
  updated_at = now()
from with_total w
where i.id = w.id
  and round(coalesce(i.total_amount, 0)::numeric, 2)
      is distinct from w.total_with_tax;
