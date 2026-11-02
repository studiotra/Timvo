"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { createInvoiceViewToken } from "@/lib/invoices/client-link";

/**
 * Ensure the invoice has a shareable view_token.
 * Authorized for the invoice owner (same user_id check as other invoice actions).
 * Does not change status — drafts can receive a client link before Send.
 */
export async function ensureInvoiceViewToken(invoiceId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" as const };

  const { data: inv, error: fetchError } = await supabase
    .from("invoices")
    .select("id, view_token")
    .eq("id", invoiceId)
    .eq("user_id", user.id)
    .single();

  if (fetchError || !inv) return { error: "Invoice not found" as const };

  if (inv.view_token) {
    return { viewToken: inv.view_token as string };
  }

  const viewToken = createInvoiceViewToken();
  const { error: updateError } = await supabase
    .from("invoices")
    .update({
      view_token: viewToken,
      updated_at: new Date().toISOString(),
    })
    .eq("id", invoiceId)
    .eq("user_id", user.id)
    .is("view_token", null);

  if (updateError) {
    // Race: another request may have set the token — re-read
    const { data: again } = await supabase
      .from("invoices")
      .select("view_token")
      .eq("id", invoiceId)
      .eq("user_id", user.id)
      .single();
    if (again?.view_token) {
      return { viewToken: again.view_token as string };
    }
    return { error: updateError.message };
  }

  // Confirm row was updated (0 rows if concurrent writer won)
  const { data: confirmed } = await supabase
    .from("invoices")
    .select("view_token")
    .eq("id", invoiceId)
    .eq("user_id", user.id)
    .single();

  if (!confirmed?.view_token) {
    return { error: "Failed to create client link" as const };
  }

  revalidatePath(`/invoices/${invoiceId}`);
  return { viewToken: confirmed.view_token as string };
}
