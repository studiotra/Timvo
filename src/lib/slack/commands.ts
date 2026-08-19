import type { SupabaseClient } from "@supabase/supabase-js";
import {
  formatElapsed,
  formatMinutes,
  getActiveTimerForUser,
  listActiveProjectsForUser,
  matchProjects,
  startTimerForUser,
  stopTimerForUser,
  type SlackProject,
} from "./timer-ops";

export const HELP_TEXT = `*Timvo commands*
\`/timvo start [client or project]\` — start a timer
\`/timvo stop\` — stop the running timer
\`/timvo status\` — what’s running
\`/timvo projects\` — list active projects
\`/timvo help\` — this message`;

function label(p: SlackProject) {
  return p.clientName ? `${p.clientName} · ${p.name}` : p.name;
}

export function projectButtons(projects: SlackProject[]) {
  return {
    response_type: "ephemeral",
    text: "Which project?",
    blocks: [
      {
        type: "section",
        text: { type: "mrkdwn", text: "Several matches — pick a project:" },
      },
      {
        type: "actions",
        elements: projects.slice(0, 5).map((p) => ({
          type: "button",
          text: { type: "plain_text", text: label(p).slice(0, 75), emoji: true },
          action_id: `timvo_start_${p.id.slice(0, 8)}`,
          value: p.id,
        })),
      },
    ],
  };
}

export async function handleTimvoCommand(
  supabase: SupabaseClient,
  userId: string,
  text: string
): Promise<Record<string, unknown>> {
  const raw = text.trim();
  const [cmd, ...rest] = raw.split(/\s+/);
  const arg = rest.join(" ").trim();
  const known = new Set(["help", "status", "stop", "start", "projects"]);
  const verb = known.has((cmd || "help").toLowerCase())
    ? (cmd || "help").toLowerCase()
    : "start";
  const startQuery = verb === "start" && !known.has((cmd || "").toLowerCase()) ? raw : arg;

  if (!raw || verb === "help") {
    return { response_type: "ephemeral", text: HELP_TEXT };
  }

  if (verb === "status") {
    const active = await getActiveTimerForUser(supabase, userId);
    if (!active) return { response_type: "ephemeral", text: "No timer is running." };
    const who = [active.clientName, active.projectName].filter(Boolean).join(" · ");
    return {
      response_type: "ephemeral",
      text: `Timer running on *${who}* — ${formatElapsed(active.startedAt)} elapsed.`,
    };
  }

  if (verb === "stop") {
    const result = await stopTimerForUser(supabase, userId);
    if (result.error) return { response_type: "ephemeral", text: result.error };
    const who = [result.clientName, result.projectName].filter(Boolean).join(" · ");
    return {
      response_type: "ephemeral",
      text: `Stopped *${who}* · logged ${formatMinutes(result.minutes ?? 0)}.`,
    };
  }

  if (verb === "projects") {
    const projects = await listActiveProjectsForUser(supabase, userId);
    if (projects.length === 0) {
      return { response_type: "ephemeral", text: "No active projects. Add one in Timvo first." };
    }
    const lines = projects.slice(0, 20).map((p) => `• ${label(p)}`);
    return {
      response_type: "ephemeral",
      text: `Active projects:\n${lines.join("\n")}\n\nStart with \`/timvo start ${projects[0].name}\``,
    };
  }

  if (verb === "start") {
    const query = startQuery || "";
    const projects = await listActiveProjectsForUser(supabase, userId);
    if (projects.length === 0) {
      return { response_type: "ephemeral", text: "No active projects. Add one in Timvo first." };
    }

    if (!query) {
      if (projects.length === 1) {
        return startResponse(supabase, userId, projects[0].id);
      }
      return projectButtons(projects);
    }

    const matches = matchProjects(projects, query);
    if (matches.length === 0) {
      return {
        response_type: "ephemeral",
        text: `No project matched “${query}”. Try \`/timvo projects\`.`,
      };
    }
    if (matches.length === 1) {
      return startResponse(supabase, userId, matches[0].id);
    }
    return projectButtons(matches);
  }

  return {
    response_type: "ephemeral",
    text: `Unknown command. ${HELP_TEXT}`,
  };
}

export async function startResponse(
  supabase: SupabaseClient,
  userId: string,
  projectId: string
): Promise<Record<string, unknown>> {
  const result = await startTimerForUser(supabase, userId, projectId);
  if (result.error) return { response_type: "ephemeral", text: result.error };
  const who = [result.clientName, result.projectName].filter(Boolean).join(" · ");
  return { response_type: "ephemeral", text: `Started timer on *${who}*.` };
}
