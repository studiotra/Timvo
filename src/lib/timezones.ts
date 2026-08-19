const FALLBACK_TIMEZONES = [
  "UTC",
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "America/Toronto",
  "America/Mexico_City",
  "America/Sao_Paulo",
  "Europe/London",
  "Europe/Paris",
  "Europe/Berlin",
  "Europe/Madrid",
  "Europe/Rome",
  "Asia/Tokyo",
  "Asia/Seoul",
  "Asia/Shanghai",
  "Asia/Hong_Kong",
  "Asia/Singapore",
  "Asia/Kolkata",
  "Australia/Sydney",
  "Pacific/Auckland",
];

export function getTimezones(): string[] {
  try {
    const supported = Intl.supportedValuesOf("timeZone");
    if (supported.length > 0) return supported;
  } catch {
    /* older runtimes */
  }
  return FALLBACK_TIMEZONES;
}

export function timezoneLabel(tz: string): string {
  return tz.replace(/_/g, " ");
}
