/** Date helpers that respect the user's configured timezone. */

/** Returns the local date string (YYYY-MM-DD) for an instant in a timezone. */
export function localDate(date: Date, timeZone: string): string {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return formatter.format(date);
}

function timezoneOffsetMs(date: Date, timeZone: string): number {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  const parts = formatter.formatToParts(date);
  const values: Record<string, string> = {};
  for (const part of parts) values[part.type] = part.value;
  const asUtc = Date.UTC(
    Number(values.year),
    Number(values.month) - 1,
    Number(values.day),
    Number(values.hour) % 24,
    Number(values.minute),
    Number(values.second),
  );
  return asUtc - date.getTime();
}

/** Returns the UTC instants that bound a local calendar day in a timezone. */
export function dayBounds(dateString: string, timeZone: string): { start: Date; end: Date } {
  const [year, month, day] = dateString.split("-").map((part) => Number(part));
  const guess = Date.UTC(year!, month! - 1, day!, 0, 0, 0);

  let offset = timezoneOffsetMs(new Date(guess), timeZone);
  let start = guess - offset;
  offset = timezoneOffsetMs(new Date(start), timeZone);
  start = guess - offset;

  const end = start + 24 * 60 * 60 * 1000;
  return { start: new Date(start), end: new Date(end) };
}

/** Next occurrence of a HH:mm wall-clock time in the given timezone. */
export function nextScheduledRun(time: string, timeZone: string, from = new Date()): Date {
  const [hour, minute] = time.split(":").map((part) => Number(part));
  const today = localDate(from, timeZone);
  const { start } = dayBounds(today, timeZone);

  const candidate = new Date(start.getTime() + (hour! * 60 + minute!) * 60 * 1000);
  if (candidate.getTime() > from.getTime()) return candidate;

  const tomorrow = new Date(start.getTime() + 24 * 60 * 60 * 1000);
  const { start: tomorrowStart } = dayBounds(localDate(tomorrow, timeZone), timeZone);
  return new Date(tomorrowStart.getTime() + (hour! * 60 + minute!) * 60 * 1000);
}

/** Human readable relative time, e.g. "3 hours ago". */
export function relativeTime(value: Date | string, now = new Date()): string {
  const date = typeof value === "string" ? new Date(value) : value;
  const diffMs = now.getTime() - date.getTime();
  const seconds = Math.round(diffMs / 1000);

  if (Math.abs(seconds) < 45) return "just now";

  const minutes = Math.floor(Math.abs(seconds) / 60);
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? "" : "s"} ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;

  const days = Math.floor(hours / 24);
  if (days < 30) return `${days} day${days === 1 ? "" : "s"} ago`;

  const months = Math.round(days / 30);
  return `${months} month${months === 1 ? "" : "s"} ago`;
}

/** Formats a time as HH:mm in the given timezone. */
export function formatTime(value: Date | string, timeZone: string): string {
  const date = typeof value === "string" ? new Date(value) : value;
  return new Intl.DateTimeFormat("en-GB", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
}
