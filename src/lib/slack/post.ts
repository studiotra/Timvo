type SlackApiResult = {
  ok: boolean;
  ts?: string;
  channel?: string | { id?: string };
  error?: string;
};

async function slackApi(
  token: string,
  method: string,
  body: Record<string, unknown>
): Promise<SlackApiResult> {
  const res = await fetch(`https://slack.com/api/${method}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  const data = (await res.json()) as SlackApiResult & { error?: string };
  return data;
}

export function timerLabel(parts: {
  clientName?: string;
  projectName?: string;
  serviceName?: string;
  taskName?: string;
}): string {
  return [parts.clientName, parts.projectName, parts.serviceName, parts.taskName]
    .filter(Boolean)
    .join(" · ");
}

export function runningBlocks(opts: {
  who: string;
  elapsed: string;
  userName?: string;
}): unknown[] {
  const title = opts.userName
    ? `*${opts.userName}* is tracking time`
    : "*Timer running*";
  return [
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: `⏱ ${title}\n${opts.who}\n_${opts.elapsed} elapsed_`,
      },
    },
    {
      type: "actions",
      elements: [
        {
          type: "button",
          text: { type: "plain_text", text: "Stop timer", emoji: true },
          style: "danger",
          action_id: "timvo_stop",
          value: "stop",
        },
        {
          type: "button",
          text: { type: "plain_text", text: "Refresh", emoji: true },
          action_id: "timvo_refresh",
          value: "refresh",
        },
      ],
    },
  ];
}

export async function postToChannel(
  token: string,
  channel: string,
  text: string,
  blocks?: unknown[]
): Promise<SlackApiResult> {
  return slackApi(token, "chat.postMessage", {
    channel,
    text,
    blocks,
    unfurl_links: false,
  });
}

export async function updateMessage(
  token: string,
  channel: string,
  ts: string,
  text: string,
  blocks?: unknown[]
): Promise<SlackApiResult> {
  return slackApi(token, "chat.update", { channel, ts, text, blocks });
}

export async function dmUser(
  token: string,
  slackUserId: string,
  text: string,
  blocks?: unknown[]
): Promise<SlackApiResult> {
  const opened = await slackApi(token, "conversations.open", { users: slackUserId });
  const channel = opened.channel as string | { id?: string } | undefined;
  const id = typeof channel === "string" ? channel : channel?.id;
  if (!opened.ok || !id) {
    return { ok: false, error: opened.error ?? "could_not_open_dm" };
  }
  return postToChannel(token, id, text, blocks);
}
