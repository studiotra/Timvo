"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  formatServiceInUseMessage,
  isMissingStatusColumnError,
  isServiceForeignKeyError,
  isServiceInUse,
  type ServiceUsage,
} from "@/lib/services/usage";

export type ServiceOpt = {
  id: string;
  name: string;
  default_rate?: number | null;
  billing_type?: string;
};

function revalidateServicePaths() {
  revalidatePath("/settings");
  revalidatePath("/services");
  revalidatePath("/org/services");
}

/** Active services for pickers. Falls back if status column is missing. */
export async function getServicesForSelect(): Promise<ServiceOpt[]> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const withStatus = await supabase
    .from("services")
    .select("id, name, default_rate, billing_type, status")
    .eq("user_id", user.id)
    .eq("status", "active")
    .order("name");

  if (!withStatus.error) {
    return (withStatus.data ?? []).map((s) => ({
      id: s.id,
      name: s.name,
      default_rate: s.default_rate ?? null,
      billing_type: (s.billing_type ?? "hourly") as string,
    }));
  }

  const { data } = await supabase
    .from("services")
    .select("id, name, default_rate, billing_type")
    .eq("user_id", user.id)
    .order("name");
  return (data ?? []).map((s) => ({
    id: s.id,
    name: s.name,
    default_rate: s.default_rate ?? null,
    billing_type: (s.billing_type ?? "hourly") as string,
  }));
}

export async function getServiceUsage(id: string): Promise<ServiceUsage> {
  const empty: ServiceUsage = { taskCount: 0, projectCount: 0, timeLogCount: 0 };
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !id) return empty;

  const { data: svc } = await supabase
    .from("services")
    .select("id")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!svc) return empty;

  const { data: tasks } = await supabase
    .from("tasks")
    .select("id, project_id")
    .eq("service_id", id);

  const taskRows = tasks ?? [];
  const taskIds = taskRows.map((t) => t.id);
  const projectCount = new Set(taskRows.map((t) => t.project_id).filter(Boolean))
    .size;

  let timeLogCount = 0;
  if (taskIds.length > 0) {
    const { count } = await supabase
      .from("time_logs")
      .select("id", { count: "exact", head: true })
      .in("task_id", taskIds)
      .eq("user_id", user.id);
    timeLogCount = count ?? 0;
  }

  return {
    taskCount: taskRows.length,
    projectCount,
    timeLogCount,
  };
}

export async function addService(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const name = formData.get("name") as string;
  const billing_type = (formData.get("billing_type") as "hourly" | "fixed") || "hourly";
  const default_rate = formData.get("default_rate")
    ? parseFloat(formData.get("default_rate") as string)
    : null;

  if (!name?.trim()) return { error: "Name is required" };

  const withStatus = await supabase.from("services").insert({
    user_id: user.id,
    name: name.trim(),
    default_rate,
    billing_type,
    status: "active",
  });

  if (withStatus.error && isMissingStatusColumnError(withStatus.error.message)) {
    const { error } = await supabase.from("services").insert({
      user_id: user.id,
      name: name.trim(),
      default_rate,
      billing_type,
    });
    if (error) return { error: error.message };
  } else if (withStatus.error) {
    return { error: withStatus.error.message };
  }

  revalidateServicePaths();
  return { success: true };
}

export async function updateService(id: string, formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const name = formData.get("name") as string;
  const billing_type = (formData.get("billing_type") as "hourly" | "fixed") || "hourly";
  const default_rate = formData.get("default_rate")
    ? parseFloat(formData.get("default_rate") as string)
    : null;

  if (!name?.trim()) return { error: "Name is required" };

  const { error } = await supabase
    .from("services")
    .update({ name: name.trim(), default_rate, billing_type })
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) return { error: error.message };
  revalidateServicePaths();
  return { success: true };
}

export type DeleteServiceResult =
  | { success: true }
  | {
      error: string;
      code?: "IN_USE";
      usage?: ServiceUsage;
      canArchive?: boolean;
    };

export async function deleteService(id: string): Promise<DeleteServiceResult> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const usage = await getServiceUsage(id);
  if (isServiceInUse(usage)) {
    const canArchive = await probeArchiveSupport(supabase, user.id);
    return {
      error: formatServiceInUseMessage(usage),
      code: "IN_USE",
      usage,
      canArchive,
    };
  }

  const { error } = await supabase
    .from("services")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) {
    if (isServiceForeignKeyError(error.message)) {
      const refreshed = await getServiceUsage(id);
      const canArchive = await probeArchiveSupport(supabase, user.id);
      return {
        error: formatServiceInUseMessage(refreshed),
        code: "IN_USE",
        usage: refreshed,
        canArchive,
      };
    }
    return { error: error.message };
  }

  revalidateServicePaths();
  return { success: true };
}

async function probeArchiveSupport(
  supabase: SupabaseClient,
  userId: string
): Promise<boolean> {
  const { error } = await supabase
    .from("services")
    .select("status")
    .eq("user_id", userId)
    .limit(1);
  return !error;
}

export async function archiveService(id: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const { error } = await supabase
    .from("services")
    .update({ status: "archived" })
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) {
    if (isMissingStatusColumnError(error.message)) {
      return {
        error:
          "Archive needs a database update. Ask an admin to apply the services status migration.",
      };
    }
    return { error: error.message };
  }

  revalidateServicePaths();
  return { success: true };
}

export async function unarchiveService(id: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const { error } = await supabase
    .from("services")
    .update({ status: "active" })
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) {
    if (isMissingStatusColumnError(error.message)) {
      return {
        error:
          "Unarchive needs a database update. Ask an admin to apply the services status migration.",
      };
    }
    return { error: error.message };
  }

  revalidateServicePaths();
  return { success: true };
}
