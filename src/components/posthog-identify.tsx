"use client";

import { useEffect } from "react";
import posthog from "posthog-js";

export function PostHogIdentify({
  userId,
  email,
  accountType,
}: {
  userId: string;
  email?: string | null;
  accountType: "contractor" | "organization" | "client";
}) {
  useEffect(() => {
    if (!process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN) return;
    posthog.identify(userId, {
      email: email ?? undefined,
      account_type: accountType,
    });
  }, [userId, email, accountType]);

  return null;
}

export function resetPostHog() {
  if (!process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN) return;
  posthog.reset();
}
