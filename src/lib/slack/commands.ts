import type { SupabaseClient } from "@supabase/supabase-js";
import { HELP_TEXT } from "./help";
import {
  postToChannel,
  runningBlocks,
  timerLabel,
  updateMessage,
} from "./post";
import {
  formatElapsed,
  formatMinutes,
  getActiveTimerForUser,
  listActiveProjectsForUser,
  listServicesForUser,
  listTasksForProjectService,
  matchByName,
  matchProjects,
  startTimerForUser,
  stopTimerForUser,
  type SlackProject,
  type SlackService,
  type SlackTask,
} from "./timer-ops";

export type SlackCtx = {
  userId: string;
  botToken: string;
  channelId?: string;
  slackUserId: string;
  userName?: string;
};

function projectLabel(p: SlackProject) {
  return p.clientName ? `${p.clientName} · ${p.name}` : p.name;
}

function chunkButtons(
  items: { id: string; text: string }[],
  actionId: string,
  valueFn: (id: string) => string
) {
  const chunks: { id: string; text: string }[][] = [];
  for (let i = 0; i < items.length; i += 5) chunks.push(items.slice(i, i + 5));
  return chunks.map((group) => ({
    type: "actions",
    elements: group.map((item) => ({
      type: "button",
      text: { type: "plain_text", text: item.text.slice(0, 75), emoji: true },
      action_id: `${actionId}_${item.id.slice(0, 8)}`,
      value: valueFn(item.id),
    })),
  }));
}

export function projectButtons(projects: SlackProject[]) {
  return {
    response_type: "ephemeral",
    text: "Which project?",
    blocks: [
      {
        type: "section",
        text: { type: "mrkdwn", text: "Pick a *client · project*:" },
      },
      ...chunkButtons(
        projects.slice(0, 20).map((p) => ({ id: p.id, text: projectLabel(p) })),
        "timvo_project",
        (id) => `project|${id}`
      ),
    ],
  };
}

export function serviceButtons(projectId: string, services: SlackService[]) {
  return {
    response_type: "ephemeral",
    replace_original: true,
    text: "Which service?",
    blocks: [
      {
        type: "section",
        text: { type: "mrkdwn", text: "Pick a *service*:" },
      },
      ...chunkButtons(
        services.slice(0, 20).map((s) => ({ id: s.id, text: s.name })),
        "timvo_service",
        (id) => `service|${projectId}|${id}`
      ),
    ],
  };
}

export function taskButtons(projectId: string, serviceId: string, tasks: SlackTask[]) {
  return {
    response_type: "ephemeral",
    replace_original: true,
    text: "Which task?",
    blocks: [
      {
        type: "section",
        text: { type: "mrkdwn", text: "Pick a *task* (optional):" },
      },
      {
        type: "actions",
        elements: [
          {
            type: "button",
            text: { type: "plain_text", text: "Skip task", emoji: true },
            action_id: "timvo_skip_task",
            value: `skip|${projectId}|${serviceId}`,
          },
        ],
      },
      ...chunkButtons(
        tasks.slice(0, 15).map((t) => ({ id: t.id, text: t.name })),
        "timvo_task",
        (id) => `task|${projectId}|${serviceId}|${id}`
      ),
    ],
  };
}

export async function promptAfterProject(
  supabase: SupabaseClient,
  ctx: SlackCtx,
  projectId: string
) {
  const services = await listServicesForUser(supabase, ctx.userId);
  if (services.length === 0) {
    return startResponse(supabase, ctx, projectId);
  }
  if (services.length === 1) {
    return promptAfterService(supabase, ctx, projectId, services[0].id);
  }
  return serviceButtons(projectId, services);
}

export async function promptAfterService(
  supabase: SupabaseClient,
  ctx: SlackCtx,
  projectId: string,
  serviceId: string
) {
  const tasks = await listTasksForProjectService(supabase, projectId, serviceId);
  if (tasks.length === 0) {
    return startResponse(supabase, ctx, projectId);
  }
  return taskButtons(projectId, serviceId, tasks);
}

export async function handleTimvoCommand(
  supabase: SupabaseClient,
  ctx: SlackCtx,
  text: string
): Promise<Record<string, unknown>> {
  const raw = text.trim();
  const [cmd, ...rest] = raw.split(/\s+/);
  const arg = rest.join(" ").trim();
  const known = new Set(["help", "status", "stop", "start", "projects", "live"]);
  const verb = known.has((cmd || "help").toLowerCase())
    ? (cmd || "help").toLowerCase()
    : "start";
  const startQuery = verb === "start" && !known.has((cmd || "").toLowerCase()) ? raw : arg;

  if (ctx.channelId) {
    await supabase
      .from("slack_connections")
      .update({ last_channel_id: ctx.channelId, updated_at: new Date().toISOString() })
      .eq("user_id", ctx.userId);
  }

  if (!raw || verb === "help") {
    return { response_type: "ephemeral", text: HELP_TEXT };
  }

  if (verb === "status" || verb === "live") {
    const active = await getActiveTimerForUser(supabase, ctx.userId);
    if (!active) return { response_type: "ephemeral", text: "No timer is running." };
    const who = timerLabel(active);
    const elapsed = formatElapsed(active.startedAt);
    return {
      response_type: "ephemeral",
      text: `Live: ${who} — ${elapsed} elapsed.`,
      blocks: runningBlocks({ who, elapsed, userName: ctx.userName }),
    };
  }

  if (verb === "stop") {
    return stopResponse(supabase, ctx);
  }

  if (verb === "projects") {
    const projects = await listActiveProjectsForUser(supabase, ctx.userId);
    if (projects.length === 0) {
      return { response_type: "ephemeral", text: "No active projects. Add one in Timvo first." };
    }
    return projectButtons(projects);
  }

  if (verb === "start") {
    const query = startQuery || "";
    const projects = await listActiveProjectsForUser(supabase, ctx.userId);
    if (projects.length === 0) {
      return { response_type: "ephemeral", text: "No active projects. Add one in Timvo first." };
    }

    if (!query) {
      if (projects.length === 1) {
        return promptAfterProject(supabase, ctx, projects[0].id);
      }
      return projectButtons(projects);
    }

    const matches = matchProjects(projects, query);
    if (matches.length === 0) {
      return {
        response_type: "ephemeral",
        text: `No project matched "${query}". Try \`/timvo start\` and pick from the list.`,
      };
    }

    const project = matches[0];
    const remainder = query
      .toLowerCase()
      .replace(project.clientName.toLowerCase(), "")
      .replace(project.name.toLowerCase(), "")
      .trim();

    if (matches.length > 1 && !remainder) {
      return projectButtons(matches);
    }

    const services = await listServicesForUser(supabase, ctx.userId);
    if (services.length === 0) {
      return startResponse(supabase, ctx, project.id);
    }

    const serviceMatches = remainder ? matchByName(services, remainder) : [];
    if (serviceMatches.length === 1) {
      const service = serviceMatches[0];
      const restAfterService = remainder
        .toLowerCase()
        .replace(service.name.toLowerCase(), "")
        .trim();
      const tasks = await listTasksForProjectService(supabase, project.id, service.id);
      const taskMatches = restAfterService ? matchByName(tasks, restAfterService) : [];
      if (taskMatches.length === 1) {
        return startResponse(supabase, ctx, project.id, { taskId: taskMatches[0].id });
      }
      if (tasks.length === 0) {
        return startResponse(supabase, ctx, project.id);
      }
      return taskButtons(project.id, service.id, tasks);
    }

    if (services.length === 1) {
      return promptAfterService(supabase, ctx, project.id, services[0].id);
    }
    return serviceButtons(project.id, services);
  }

  return {
    response_type: "ephemeral",
    text: `Unknown command. ${HELP_TEXT}`,
  };
}

export async function startResponse(
  supabase: SupabaseClient,
  ctx: SlackCtx,
  projectId: string,
  options?: { taskId?: string; serviceId?: string }
): Promise<Record<string, unknown>> {
  const result = await startTimerForUser(supabase, ctx.userId, projectId, options);
  if (result.error) {
    return { response_type: "ephemeral", text: result.error, replace_original: true };
  }

  const who = timerLabel(result);
  const elapsed = "just started";

  if (ctx.botToken && ctx.channelId) {
    const posted = await postToChannel(
      ctx.botToken,
      ctx.channelId,
      `${ctx.userName ?? "Someone"} started a timer on ${who}`,
      runningBlocks({ who, elapsed, userName: ctx.userName })
    );
    if (posted.ok && posted.ts) {
      await supabase
        .from("slack_connections")
        .update({
          last_channel_id: ctx.channelId,
          live_channel_id:
            typeof posted.channel === "string"
              ? posted.channel
              : posted.channel?.id || ctx.channelId,
          live_message_ts: posted.ts,
          live_log_id: result.logId ?? null,
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", ctx.userId);
    }
  }

  return {
    response_type: "ephemeral",
    replace_original: true,
    text: `Started timer on *${who}*. The channel can see it — tap Refresh or \`/timvo status\` for live elapsed time.`,
  };
}

export async function stopResponse(
  supabase: SupabaseClient,
  ctx: SlackCtx
): Promise<Record<string, unknown>> {
  const result = await stopTimerForUser(supabase, ctx.userId);
  if (result.error) {
    return { response_type: "ephemeral", text: result.error, replace_original: true };
  }
  const who = timerLabel(result);
  const text = `Stopped *${who}* · logged ${formatMinutes(result.minutes ?? 0)}.`;

  const { data: conn } = await supabase
    .from("slack_connections")
    .select("bot_access_token, live_channel_id, live_message_ts")
    .eq("user_id", ctx.userId)
    .maybeSingle();

  if (conn?.live_channel_id && conn.live_message_ts) {
    await updateMessage(
      conn.bot_access_token,
      conn.live_channel_id,
      conn.live_message_ts,
      text,
      [
        {
          type: "section",
          text: { type: "mrkdwn", text: `✅ ${text}` },
        },
      ]
    );
    await supabase
      .from("slack_connections")
      .update({
        live_channel_id: null,
        live_message_ts: null,
        live_log_id: null,
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", ctx.userId);
  }

  return { response_type: "ephemeral", replace_original: true, text };
}

export async function refreshLive(
  supabase: SupabaseClient,
  ctx: SlackCtx
): Promise<Record<string, unknown>> {
  const active = await getActiveTimerForUser(supabase, ctx.userId);
  if (!active) {
    return { response_type: "ephemeral", text: "No timer is running.", replace_original: true };
  }
  const who = timerLabel(active);
  const elapsed = formatElapsed(active.startedAt);

  const { data: conn } = await supabase
    .from("slack_connections")
    .select("live_channel_id, live_message_ts, bot_access_token")
    .eq("user_id", ctx.userId)
    .maybeSingle();

  if (conn?.live_channel_id && conn.live_message_ts) {
    await updateMessage(
      conn.bot_access_token,
      conn.live_channel_id,
      conn.live_message_ts,
      `Timer running: ${who} (${elapsed})`,
      runningBlocks({ who, elapsed, userName: ctx.userName })
    );
  }

  return {
    response_type: "ephemeral",
    replace_original: true,
    text: `Live: ${who} — ${elapsed} elapsed.`,
    blocks: runningBlocks({ who, elapsed, userName: ctx.userName }),
  };
}
