"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function updateProfile(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const fullName = (formData.get("full_name") as string)?.trim() || null;
  const businessName = (formData.get("business_name") as string)?.trim() || null;
  const phoneNumber = (formData.get("phone_number") as string)?.trim() || null;
  const address = (formData.get("address") as string)?.trim() || null;
  const defaultCurrency = (formData.get("default_currency") as string)?.trim() || "USD";
  const invoicePrefix = (formData.get("invoice_prefix") as string)?.trim() || "INV-";
  const defaultInvoiceFooter = (formData.get("default_invoice_footer") as string)?.trim() || null;
  const defaultInvoiceTerms = (formData.get("default_invoice_terms") as string)?.trim() || null;
  const defaultDueDays = parseInt((formData.get("default_due_days") as string) || "30", 10) || 30;
  const taxRate = parseFloat((formData.get("tax_rate") as string) || "0") || 0;
  const taxId = (formData.get("tax_id") as string)?.trim() || null;
  const bankName = (formData.get("bank_name") as string)?.trim() || null;
  const bankAccount = (formData.get("bank_account") as string)?.trim() || null;
  const bankRouting = (formData.get("bank_routing") as string)?.trim() || null;
  const logoUrl = (formData.get("logo_url") as string)?.trim() || null;
  const locale = ((formData.get("locale") as string)?.trim() || "en") as "en" | "ko";
  const validLocale = locale === "ko" ? "ko" : "en";
  const timezone = (formData.get("timezone") as string)?.trim() || "America/New_York";
  const targetHourlyRateRaw = (formData.get("target_hourly_rate") as string)?.trim();
  const targetHourlyRate = targetHourlyRateRaw ? parseFloat(targetHourlyRateRaw) : null;
  const annualIncomeGoalRaw = (formData.get("annual_income_goal") as string)?.trim();
  const annualIncomeGoal = annualIncomeGoalRaw ? parseFloat(annualIncomeGoalRaw) : null;

  const { error } = await supabase
    .from("profiles")
    .upsert(
      {
        id: user.id,
        full_name: fullName,
        business_name: businessName,
        phone_number: phoneNumber,
        address,
        default_currency: defaultCurrency,
        invoice_prefix: invoicePrefix,
        tax_rate: taxRate,
        tax_id: taxId,
        bank_name: bankName,
        bank_account: bankAccount,
        bank_routing: bankRouting,
        logo_url: logoUrl,
        default_invoice_footer: defaultInvoiceFooter,
        default_invoice_terms: defaultInvoiceTerms,
        default_due_days: defaultDueDays,
        locale: validLocale,
        timezone,
        target_hourly_rate: targetHourlyRate,
        annual_income_goal: annualIncomeGoal,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "id" }
    );

  if (error) return { error: error.message };
  revalidatePath("/settings");
  return { success: true };
}
