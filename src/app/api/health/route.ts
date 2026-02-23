import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { Resend } from "resend";
import OpenAI from "openai";

export async function GET() {
  type ServiceResult = { ok: boolean; message?: string; error?: string; hasSession?: boolean; userId?: string };
  const results: Record<string, ServiceResult> = {};

  // Supabase
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.getUser();
    if (error) throw new Error(error.message);
    results.supabase = {
      ok: true,
      message: "Connected",
      hasSession: !!data?.user,
      userId: data?.user?.id,
    };
  } catch (err) {
    results.supabase = {
      ok: false,
      error: err instanceof Error ? err.message : "Unknown error",
    };
  }

  // Resend (only if key is set)
  const resendKey = process.env.RESEND_API_KEY;
  if (resendKey?.trim()) {
    try {
      const resend = new Resend(resendKey);
      await resend.domains.list();
      results.resend = { ok: true, message: "API key valid" };
    } catch (err) {
      results.resend = {
        ok: false,
        error: err instanceof Error ? err.message : "Connection failed",
      };
    }
  } else {
    results.resend = { ok: false, error: "RESEND_API_KEY not set" };
  }

  // OpenAI (only if key is set)
  const openaiKey = process.env.OPENAI_API_KEY;
  if (openaiKey?.trim()) {
    try {
      const openai = new OpenAI({ apiKey: openaiKey });
      await openai.models.list();
      results.openai = { ok: true, message: "API key valid" };
    } catch (err) {
      results.openai = {
        ok: false,
        error: err instanceof Error ? err.message : "Connection failed",
      };
    }
  } else {
    results.openai = { ok: false, error: "OPENAI_API_KEY not set" };
  }

  const supabaseOk = results.supabase?.ok ?? false;
  return NextResponse.json(
    {
      ok: supabaseOk,
      services: results,
    },
    { status: supabaseOk ? 200 : 500 }
  );
}
