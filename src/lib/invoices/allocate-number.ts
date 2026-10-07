import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Allocate the next invoice_number for a user.
 * Tolerates missing columns (pre-migration): returns null and skips increment.
 */
export async function allocateInvoiceNumber(
  supabase: SupabaseClient,
  userId: string
): Promise<number | null> {
  const { data: profile, error: profileErr } = await supabase
    .from("profiles")
    .select("next_invoice_number")
    .eq("id", userId)
    .maybeSingle();

  // Column missing or query failed — try max(invoice_number) + 1
  if (profileErr) {
    return allocateFromMax(supabase, userId);
  }

  const next =
    profile?.next_invoice_number != null && Number(profile.next_invoice_number) >= 1
      ? Math.floor(Number(profile.next_invoice_number))
      : null;

  if (next == null) {
    return allocateFromMax(supabase, userId);
  }

  // Best-effort increment; race is rare for a single freelancer account
  await supabase
    .from("profiles")
    .update({ next_invoice_number: next + 1 })
    .eq("id", userId);

  return next;
}

async function allocateFromMax(
  supabase: SupabaseClient,
  userId: string
): Promise<number | null> {
  const { data, error } = await supabase
    .from("invoices")
    .select("invoice_number")
    .eq("user_id", userId)
    .not("invoice_number", "is", null)
    .order("invoice_number", { ascending: false })
    .limit(1);

  if (error) return null;
  const max = data?.[0]?.invoice_number;
  if (max != null && Number.isFinite(Number(max))) {
    return Math.floor(Number(max)) + 1;
  }
  // No prior numbers — start at 1 if the column exists (insert will tell us)
  return 1;
}

/** Peek at the next number without consuming it (create-form preview). */
export async function peekNextInvoiceNumber(
  supabase: SupabaseClient,
  userId: string
): Promise<number | null> {
  const { data: profile, error: profileErr } = await supabase
    .from("profiles")
    .select("next_invoice_number")
    .eq("id", userId)
    .maybeSingle();

  if (!profileErr && profile?.next_invoice_number != null) {
    const n = Number(profile.next_invoice_number);
    if (Number.isFinite(n) && n >= 1) return Math.floor(n);
  }

  const { data, error } = await supabase
    .from("invoices")
    .select("invoice_number")
    .eq("user_id", userId)
    .not("invoice_number", "is", null)
    .order("invoice_number", { ascending: false })
    .limit(1);

  if (error) return null;
  const max = data?.[0]?.invoice_number;
  if (max != null && Number.isFinite(Number(max))) {
    return Math.floor(Number(max)) + 1;
  }
  return 1;
}
