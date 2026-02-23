-- Add Stripe payment link URL to invoices
alter table public.invoices add column if not exists stripe_payment_url text;
