import { appBaseUrl } from "./verify";
import { dmUser, timerLabel } from "./post";
import type { SlackActiveTimer } from "./timer-ops";

export function welcomeText(activeTimer?: SlackActiveTimer | null): string {
  if (activeTimer) {
    const who = timerLabel(activeTimer);
    return `Timvo is connected. You already have a timer on *${who}* — run \`/timvo status\` or \`/timvo stop\`.`;
  }
  return "Timvo is connected! Run `/timvo start` when you begin tracking time.";
}

export function welcomeBlocks(activeTimer?: SlackActiveTimer | null): unknown[] {
  const lines = [
    "*Timvo is connected to Slack*",
    "Track billable time without leaving your workspace.",
    "",
    "*Quick start*",
    "• `/timvo start` — pick client, project, service, task",
    "• `/timvo start Website · Design review` — one-line start",
    "• `/timvo status` — live elapsed time",
    "• `/timvo stop` — save the log",
  ];

  if (activeTimer) {
    const who = timerLabel(activeTimer);
    lines.push("", `⏱ *Timer already running:* ${who}`);
    lines.push("Run `/timvo status` or tap Stop when you're done.");
  } else {
    lines.push("", "Run `/timvo start` when you begin work today.");
  }

  lines.push("", "_Forgot to stop? Timvo DMs you at 1 hour and 2 hours._");

  return [
    {
      type: "section",
      text: { type: "mrkdwn", text: lines.join("\n") },
    },
    {
      type: "actions",
      elements: [
        {
          type: "button",
          text: { type: "plain_text", text: "Open Timvo", emoji: true },
          url: appBaseUrl(),
          action_id: "timvo_open_app",
        },
      ],
    },
  ];
}

export function dailyNudgeText(): string {
  return "Good morning! You haven't tracked time in Timvo today. Run `/timvo start` when you begin work.";
}

export function dailyNudgeBlocks(): unknown[] {
  return [
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: [
          "☀️ *Time to track?*",
          "You haven't logged time in Timvo today.",
          "",
          "Run `/timvo start` when you begin work — or `/timvo start Project · Task` in one line.",
        ].join("\n"),
      },
    },
    {
      type: "actions",
      elements: [
        {
          type: "button",
          text: { type: "plain_text", text: "Open Timvo", emoji: true },
          url: appBaseUrl(),
          action_id: "timvo_open_app_nudge",
        },
      ],
    },
  ];
}

export async function sendWelcomeDm(
  token: string,
  slackUserId: string,
  activeTimer?: SlackActiveTimer | null
) {
  return dmUser(token, slackUserId, welcomeText(activeTimer), welcomeBlocks(activeTimer));
}

export async function sendDailyNudgeDm(token: string, slackUserId: string) {
  return dmUser(token, slackUserId, dailyNudgeText(), dailyNudgeBlocks());
}

export function getLocalHour(timezone: string): number | null {
  try {
    const hour = new Intl.DateTimeFormat("en-US", {
      timeZone: timezone,
      hour: "numeric",
      hour12: false,
    }).format(new Date());
    return parseInt(hour, 10);
  } catch {
    return null;
  }
}

export function getLocalDateString(timezone: string, date = new Date()): string | null {
  try {
    return new Intl.DateTimeFormat("en-CA", { timeZone: timezone }).format(date);
  } catch {
    return null;
  }
}

export function logLocalDateString(iso: string, timezone: string): string | null {
  return getLocalDateString(timezone, new Date(iso));
}
