"use client";

import {
  createContext,
  useContext,
  useMemo,
  type ReactNode,
} from "react";
import { resolveTimezone } from "@/lib/dates";

type TimezoneContextValue = {
  timezone: string;
};

const TimezoneContext = createContext<TimezoneContextValue | null>(null);

export function TimezoneProvider({
  timezone,
  children,
}: {
  timezone?: string | null;
  children: ReactNode;
}) {
  const value = useMemo(
    () => ({ timezone: resolveTimezone(timezone) }),
    [timezone]
  );
  return (
    <TimezoneContext.Provider value={value}>{children}</TimezoneContext.Provider>
  );
}

/** User Settings timezone, or browser/runtime fallback. */
export function useTimezone(): string {
  const ctx = useContext(TimezoneContext);
  return ctx?.timezone ?? resolveTimezone(null);
}
