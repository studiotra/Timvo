import type { SupabaseClient } from "@supabase/supabase-js";

export type RetainerAlertCandidate = {
  projectId: string;
  projectName: string;
  clientName: string;
  organizationId: string;
  organizationName: string;
  retainerHours: number;
  usedHours: number;
  pct: number;
  thresholdPct: number;
  kind: "warning" | "exceeded";
};

export async function findRetainerAlertsToSend(
  supabase: SupabaseClient
): Promise<RetainerAlertCandidate[]> {
  const { data: orgs } = await supabase.from("organizations").select("id, name");
  const candidates: RetainerAlertCandidate[] = [];

  for (const org of orgs ?? []) {
    const { data: clients } = await supabase
      .from("clients")
      .select("id, name, projects(id, name, retainer_hours, alert_threshold_pct, status)")
      .eq("organization_id", org.id);

    for (const client of clients ?? []) {
      const projects =
        (client.projects as {
          id: string;
          name: string;
          retainer_hours: number | null;
          alert_threshold_pct: number | null;
          status: string;
        }[]) ?? [];

      for (const project of projects) {
        if (!project.retainer_hours || project.status !== "active") continue;

        const { data: logs } = await supabase
          .from("time_logs")
          .select("duration_minutes")
          .eq("project_id", project.id);

        const usedMins = (logs ?? []).reduce((s, l) => s + (l.duration_minutes ?? 0), 0);
        const usedHours = usedMins / 60;
        const retainerHours = Number(project.retainer_hours);
        const pct = (usedHours / retainerHours) * 100;
        const threshold = project.alert_threshold_pct ?? 80;

        let kind: "warning" | "exceeded" | null = null;
        if (pct >= 100) kind = "exceeded";
        else if (pct >= threshold) kind = "warning";
        if (!kind) continue;

        const { data: existing } = await supabase
          .from("retainer_alerts")
          .select("id")
          .eq("project_id", project.id)
          .eq("kind", kind)
          .maybeSingle();

        if (existing) continue;

        candidates.push({
          projectId: project.id,
          projectName: project.name,
          clientName: client.name,
          organizationId: org.id,
          organizationName: org.name,
          retainerHours,
          usedHours: Math.round(usedHours * 10) / 10,
          pct: Math.round(pct),
          thresholdPct: threshold,
          kind,
        });
      }
    }
  }

  return candidates;
}

export function retainerAlertMessage(alert: RetainerAlertCandidate): {
  subject: string;
  text: string;
  slack: string;
} {
  const who = `${alert.clientName} · ${alert.projectName}`;
  if (alert.kind === "exceeded") {
    return {
      subject: `Retainer exceeded: ${who}`,
      text: `${who} has exceeded its retainer (${alert.usedHours}h of ${alert.retainerHours}h — ${alert.pct}%). Review in Timvo → Org → Reports.`,
      slack: `🚨 *Retainer exceeded*\n${who}\n${alert.usedHours}h / ${alert.retainerHours}h (${alert.pct}%)\nReview in Timvo → Org → Reports`,
    };
  }
  return {
    subject: `Retainer alert: ${who} at ${alert.pct}%`,
    text: `${who} is at ${alert.pct}% of retainer hours (${alert.usedHours}h of ${alert.retainerHours}h). Threshold: ${alert.thresholdPct}%. Review in Timvo → Org → Reports.`,
    slack: `⚠️ *Retainer alert*\n${who}\n${alert.usedHours}h / ${alert.retainerHours}h (${alert.pct}%)\nThreshold ${alert.thresholdPct}% · Timvo → Org → Reports`,
  };
}
